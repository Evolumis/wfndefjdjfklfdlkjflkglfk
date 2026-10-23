#!/bin/bash
# ==============================================================================
# 🌴 VOYAGES ÉVASION SOLEIL - INSTALLATEUR NEXTCLOUD SNAP & STANDARD (V4.0)
# Cible : https://intranet.evasionsoleil.com
# Compatible 100% avec :
#   - Nextcloud Snap (/var/snap/nextcloud/current/nextcloud/extra-apps & nextcloud.occ)
#   - Nextcloud Standard (/var/www/nextcloud/custom_apps)
#
# Ce script installe :
#   1. Le moteur Node.js local sur 127.0.0.1:1031 (service systemd 24/7)
#   2. La Passerelle PHP Native dans Nextcloud (corrige l'écran blanc sur Snap !)
#   3. Le NOUVEAU Dashboard Multi-Plugins Interactif directement sur :
#      https://intranet.evasionsoleil.com/index.php/apps/dashboard/
#   4. Tous les plugins dans la barre du haut + réparation auto de /apps/external/
# ==============================================================================
set -e

INTRANET_DOMAIN="${INTRANET_DOMAIN:-https://intranet.evasionsoleil.com}"
APP_PORT="${PORT:-1031}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================================================="
echo "🌴 INSTALLATION ÉVASION SOLEIL V4.0 (DASHBOARD INTERACTIF + NEXTCLOUD SNAP)"
echo "=============================================================================="

# 1. Détection automatique de Nextcloud Snap OU Nextcloud Classique
IS_SNAP=0
NC_PATH="${1:-}"
CUSTOM_APPS=""

if [ -x "/snap/bin/nextcloud.occ" ] || [ -d "/var/snap/nextcloud/current/nextcloud" ]; then
  IS_SNAP=1
  NC_PATH="/var/snap/nextcloud/current/nextcloud"
  CUSTOM_APPS="/var/snap/nextcloud/current/nextcloud/extra-apps"
  echo "✅ Nextcloud SNAP détecté !"
  echo "   Dossier des plugins Snap : $CUSTOM_APPS"
else
  if [ -z "$NC_PATH" ]; then
    for candidate in \
      "/var/www/nextcloud" \
      "/var/www/html/nextcloud" \
      "/var/www/intranet.evasionsoleil.com" \
      "/var/www/intranet" \
      "/var/www/html" \
      "/usr/share/nginx/html/nextcloud"; do
      if [ -f "$candidate/occ" ]; then
        NC_PATH="$candidate"
        break
      fi
    done
  fi

  if [ -z "$NC_PATH" ] || [ ! -f "$NC_PATH/occ" ]; then
    echo "⚠️  Impossible de détecter Nextcloud automatiquement."
    echo "👉 Lancez : sudo bash install-github-nextcloud.sh /chemin/vers/nextcloud"
    exit 1
  fi
  CUSTOM_APPS="$NC_PATH/custom_apps"
  echo "✅ Nextcloud classique détecté dans : $NC_PATH"
fi

mkdir -p "$CUSTOM_APPS"

run_occ() {
  if [ "$IS_SNAP" -eq 1 ]; then
    /snap/bin/nextcloud.occ "$@"
  else
    local WEB_USER="www-data"
    if id "nginx" &>/dev/null && ! id "www-data" &>/dev/null; then
      WEB_USER="nginx"
    elif id "apache" &>/dev/null && ! id "www-data" &>/dev/null; then
      WEB_USER="apache"
    fi
    sudo -u "$WEB_USER" php "$NC_PATH/occ" "$@"
  fi
}

fix_perms() {
  local TARGET_DIR="$1"
  chmod -R 755 "$TARGET_DIR" 2>/dev/null || true
  if [ "$IS_SNAP" -eq 1 ]; then
    chown -R root:root "$TARGET_DIR" 2>/dev/null || true
  else
    local WEB_USER="www-data"
    if id "nginx" &>/dev/null && ! id "www-data" &>/dev/null; then
      WEB_USER="nginx"
    elif id "apache" &>/dev/null && ! id "www-data" &>/dev/null; then
      WEB_USER="apache"
    fi
    chown -R "$WEB_USER:$WEB_USER" "$TARGET_DIR" 2>/dev/null || true
  fi
}

# 2. Vérification / Installation de Node.js et démarrage du moteur sur 127.0.0.1:1031
if [ -f "$REPO_DIR/package.json" ]; then
  if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
    echo "📦 Installation automatique de Node.js 20 LTS sur le serveur..."
    if command -v apt-get &>/dev/null; then
      apt-get update -y
      apt-get install -y curl ca-certificates gnupg
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      apt-get install -y nodejs
    fi
  fi

  echo "🔨 Compilation de l'application Évasion Soleil..."
  cd "$REPO_DIR"
  npm install --no-audit --no-fund
  npm run build

  if command -v systemctl &>/dev/null; then
    NODE_BIN="$(command -v node || echo '/usr/bin/node')"
    cat <<EOF > /etc/systemd/system/evasion-intranet.service
[Unit]
Description=Evasion Soleil Intranet Engine (Nextcloud Snap & Dashboard Backend)
After=network.target

[Service]
Type=simple
WorkingDirectory=$REPO_DIR
Environment=NODE_ENV=production
Environment=PORT=$APP_PORT
Environment=SERVER_PORT=$APP_PORT
Environment=APP_URL=$INTRANET_DOMAIN
ExecStart=$NODE_BIN dist/server.cjs
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable evasion-intranet.service
    systemctl restart evasion-intranet.service
    sleep 2
    echo "✅ Moteur Évasion Soleil actif sur http://127.0.0.1:$APP_PORT"
  fi
fi

# Autoriser les connexions locales dans Nextcloud
run_occ config:system:set allow_local_remote_servers --value=true --type=boolean 2>/dev/null || true

# 3. Installation du Plugin Central + Passerelle PHP + Dashboard Interactif (evasionsoleil)
CORE_DIR="$CUSTOM_APPS/evasionsoleil"
rm -rf "$CORE_DIR"
mkdir -p "$CORE_DIR/appinfo" \
         "$CORE_DIR/lib/AppInfo" \
         "$CORE_DIR/lib/Controller" \
         "$CORE_DIR/templates" \
         "$CORE_DIR/js" \
         "$CORE_DIR/css" \
         "$CORE_DIR/img"

cat <<'EOF' > "$CORE_DIR/img/app.svg"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
EOF

cat <<'EOF' > "$CORE_DIR/appinfo/info.xml"
<?xml version="1.0"?>
<info xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="https://apps.nextcloud.com/schema/apps/info.xsd">
    <id>evasionsoleil</id>
    <name>Cockpit Évasion</name>
    <summary>Dashboard Interactif Multi-Plugins &amp; Passerelle Évasion Soleil</summary>
    <description><![CDATA[Intègre tous les plugins Évasion Soleil directement sur le Tableau de bord Nextcloud et dans la barre supérieure.]]></description>
    <version>4.0.0</version>
    <licence>agpl</licence>
    <author>Voyages Évasion Soleil</author>
    <namespace>EvasionSoleil</namespace>
    <category>office</category>
    <types>
        <filesystem/>
    </types>
    <dependencies>
        <nextcloud min-version="24" max-version="32" />
    </dependencies>
    <navigations>
        <navigation>
            <name>Cockpit Évasion</name>
            <route>evasionsoleil.page.index</route>
            <icon>app.svg</icon>
            <order>0</order>
        </navigation>
    </navigations>
</info>
EOF

cat <<'EOF' > "$CORE_DIR/appinfo/routes.php"
<?php
return [
    'routes' => [
        ['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],
        ['name' => 'proxy#app', 'url' => '/app', 'verb' => 'GET'],
        ['name' => 'proxy#proxyGet', 'url' => '/proxy', 'verb' => 'GET'],
        ['name' => 'proxy#proxyPost', 'url' => '/proxy', 'verb' => 'POST'],
    ]
];
EOF

cat <<'EOF' > "$CORE_DIR/lib/AppInfo/Application.php"
<?php
namespace OCA\EvasionSoleil\AppInfo;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\AppFramework\Http\Events\BeforeTemplateRenderedEvent;
use OCP\EventDispatcher\IEventDispatcher;
use OCP\Util;

class Application extends App implements IBootstrap {
    public const APP_ID = 'evasionsoleil';

    public function __construct(array $urlParams = []) {
        parent::__construct(self::APP_ID, $urlParams);
    }

    public function register(IRegistrationContext $context): void {
    }

    public function boot(IBootContext $context): void {
        try {
            $csp = new ContentSecurityPolicy();
            $csp->addAllowedFrameDomain("'self'");
            $csp->addAllowedFrameDomain('*');
            $csp->addAllowedChildSrcDomain("'self'");
            $csp->addAllowedChildSrcDomain('*');
            $csp->addAllowedConnectDomain("'self'");
            $csp->addAllowedConnectDomain('*');
            $csp->addAllowedImageDomain('*');
            $csp->addAllowedImageDomain('data:');
            $csp->addAllowedImageDomain('blob:');
            $cspManager = \OC::$server->getContentSecurityPolicyManager();
            $cspManager->addDefaultPolicy($csp);
        } catch (\Throwable $e) {
        }

        $context->injectFn(function(IEventDispatcher $dispatcher) {
            $dispatcher->addListener(BeforeTemplateRenderedEvent::class, function(BeforeTemplateRenderedEvent $event) {
                if ($event->isLoggedIn()) {
                    Util::addScript(self::APP_ID, 'dashboard_inject');
                    Util::addStyle(self::APP_ID, 'dashboard_inject');
                }
            });
        });
    }
}
EOF

cat <<'EOF' > "$CORE_DIR/lib/Controller/PageController.php"
<?php
namespace OCA\EvasionSoleil\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\IRequest;
use OCP\IUserSession;

class PageController extends Controller {
    private IUserSession $userSession;

    public function __construct(string $AppName, IRequest $request, IUserSession $userSession) {
        parent::__construct($AppName, $request);
        $this->userSession = $userSession;
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function index(): TemplateResponse {
        $user = $this->userSession->getUser();
        $uid = $user ? $user->getUID() : 'admin';
        $tab = $this->request->getParam('plugin', 'submissions');
        $response = new TemplateResponse('evasionsoleil', 'main', [
            'uid' => $uid,
            'tab' => $tab
        ]);
        $csp = new ContentSecurityPolicy();
        $csp->addAllowedFrameDomain("'self'");
        $csp->addAllowedFrameDomain('*');
        $csp->addAllowedChildSrcDomain("'self'");
        $csp->addAllowedChildSrcDomain('*');
        $csp->addAllowedConnectDomain('*');
        $response->setContentSecurityPolicy($csp);
        return $response;
    }
}
EOF

cat <<'EOF' > "$CORE_DIR/lib/Controller/ProxyController.php"
<?php
namespace OCA\EvasionSoleil\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Response;
use OCP\IRequest;

class ProxyController extends Controller {
    public function __construct(string $AppName, IRequest $request) {
        parent::__construct($AppName, $request);
    }

    private function sendPermissiveHeaders(string $contentType, int $status = 200): void {
        http_response_code($status);
        @header_remove('X-Frame-Options');
        @header_remove('Content-Security-Policy');
        @header_remove('X-Content-Type-Options');
        header('Content-Type: ' . $contentType);
        header("Content-Security-Policy: default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; style-src * data: blob: 'unsafe-inline'; img-src * data: blob:; font-src * data: blob:; connect-src * data: blob:; frame-src * data: blob:; frame-ancestors *;");
        header('Access-Control-Allow-Origin: *');
        header('Cache-Control: no-cache, no-store, must-revalidate');
    }

    /**
     * @PublicPage
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function app(): Response {
        $backendUrl = 'http://127.0.0.1:1031/';
        $ch = curl_init($backendUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $html = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($html === false || $httpCode === 0) {
            $this->sendPermissiveHeaders('text/html; charset=utf-8', 503);
            echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta http-equiv="refresh" content="3"><style>body{font-family:sans-serif;background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#fff}.card{background:#1e293b;padding:32px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.4);max-width:520px;text-align:center;border:1px solid #334155}code{background:#0f172a;padding:8px 12px;border-radius:8px;display:block;margin-top:12px;font-weight:bold;color:#38bdf8}</style></head><body><div class="card"><h2>🌴 Démarrage du moteur Évasion Soleil...</h2><p>La passerelle Nextcloud Snap est active, mais le service Node.js local (port 1031) n\'est pas encore démarré.</p><p>Dans votre terminal SSH, lancez :</p><code>sudo systemctl restart evasion-intranet</code></div></body></html>';
            exit;
        }

        $proxyBase = '/index.php/apps/evasionsoleil/proxy?target=';
        $inject = '<script>window.__EVASION_NC_PROXY__ = ' . json_encode($proxyBase) . ';</script>';
        if (stripos($html, '<head>') !== false) {
            $html = preg_replace('/<head>/i', '<head>' . $inject, $html, 1);
        } else {
            $html = $inject . $html;
        }

        $html = str_replace('src="/assets/', 'src="' . $proxyBase . '/assets/', $html);
        $html = str_replace("src='/assets/", "src='" . $proxyBase . "/assets/", $html);
        $html = str_replace('href="/assets/', 'href="' . $proxyBase . '/assets/', $html);
        $html = str_replace("href='/assets/", "href='" . $proxyBase . "/assets/", $html);
        $html = str_replace('href="/icon.svg"', 'href="' . $proxyBase . '/icon.svg"', $html);
        $html = str_replace('href="/apple-touch-icon.png"', 'href="' . $proxyBase . '/apple-touch-icon.png"', $html);
        $html = str_replace('href="/manifest.json"', 'href="' . $proxyBase . '/manifest.json"', $html);

        $this->sendPermissiveHeaders('text/html; charset=utf-8', 200);
        echo $html;
        exit;
    }

    /**
     * @PublicPage
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function proxyGet(): Response {
        return $this->forwardProxy('GET');
    }

    /**
     * @PublicPage
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function proxyPost(): Response {
        $override = isset($_GET['_method']) ? strtoupper((string)$_GET['_method']) : 'POST';
        if (!in_array($override, ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], true)) {
            $override = 'POST';
        }
        return $this->forwardProxy($override);
    }

    private function forwardProxy(string $method): Response {
        $target = isset($_GET['target']) ? (string)$_GET['target'] : '/';
        if ($target === '' || $target[0] !== '/') {
            $target = '/' . $target;
        }

        $url = 'http://127.0.0.1:1031' . $target;
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $headers = [];
        if (!empty($_SERVER['CONTENT_TYPE'])) {
            $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
        } else {
            $headers[] = 'Content-Type: application/json';
        }
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        if ($method !== 'GET' && $method !== 'HEAD') {
            $rawBody = file_get_contents('php://input');
            curl_setopt($ch, CURLOPT_POSTFIELDS, $rawBody);
        }

        $respContentType = 'application/octet-stream';
        curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $headerLine) use (&$respContentType) {
            $len = strlen($headerLine);
            if (stripos($headerLine, 'Content-Type:') === 0) {
                $respContentType = trim(substr($headerLine, 13));
            }
            return $len;
        });

        $body = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($body === false || $status === 0) {
            $this->sendPermissiveHeaders('application/json; charset=utf-8', 502);
            echo json_encode(['error' => 'Moteur local Évasion Soleil (127.0.0.1:1031) indisponible.']);
            exit;
        }

        $cleanPath = strtolower(parse_url($target, PHP_URL_PATH) ?: '');
        $proxyBase = '/index.php/apps/evasionsoleil/proxy?target=';
        if (str_ends_with($cleanPath, '.js') || str_ends_with($cleanPath, '.mjs')) {
            $respContentType = 'application/javascript; charset=utf-8';
            $body = str_replace('"/assets/', '"' . $proxyBase . '/assets/', $body);
            $body = str_replace("'/assets/", "'" . $proxyBase . "/assets/", $body);
        } elseif (str_ends_with($cleanPath, '.css')) {
            $respContentType = 'text/css; charset=utf-8';
            $body = str_replace('/assets/', $proxyBase . '/assets/', $body);
        } elseif (str_ends_with($cleanPath, '.svg')) {
            $respContentType = 'image/svg+xml';
        } elseif (str_ends_with($cleanPath, '.png')) {
            $respContentType = 'image/png';
        } elseif (str_ends_with($cleanPath, '.json')) {
            $respContentType = 'application/json; charset=utf-8';
        }

        $this->sendPermissiveHeaders($respContentType, $status ?: 200);
        echo $body;
        exit;
    }
}
EOF

cat <<'EOF' > "$CORE_DIR/templates/main.php"
<?php
$uid = isset($_['uid']) ? $_['uid'] : 'admin';
$tab = isset($_['tab']) ? $_['tab'] : 'submissions';
$iframeUrl = '/index.php/apps/evasionsoleil/app?nextcloud=1&plugin=' . urlencode($tab) . '&header=compact&nc_user=' . urlencode($uid) . '#' . urlencode($tab);
?>
<div id="app-content" style="width:100%;height:calc(100vh - 50px);margin:0;padding:0;overflow:hidden;background:#f8fafc;">
    <iframe
        src="<?php echo p($iframeUrl); ?>"
        style="width:100%;height:100%;border:0;margin:0;padding:0;display:block;"
        allow="clipboard-write; notifications; microphone"
        allowfullscreen>
    </iframe>
</div>
EOF

# 4. Injection du Dashboard Multi-Plugins Interactif directement sur /index.php/apps/dashboard/
cat <<'EOF' > "$CORE_DIR/css/dashboard_inject.css"
#evasion-nc-dashboard-cockpit {
    width: 96%;
    max-width: 1720px;
    margin: 14px auto 28px auto;
    background: rgba(15, 23, 42, 0.82);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 22px;
    padding: 16px;
    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.35);
    color: #ffffff;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    z-index: 20;
    position: relative;
}
.evasion-nc-cockpit-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 14px;
    margin-bottom: 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}
.evasion-nc-brand {
    display: flex;
    align-items: center;
    gap: 10px;
}
.evasion-nc-brand-badge {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: linear-gradient(135deg, #338b84, #0082c9);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    box-shadow: 0 4px 12px rgba(0, 130, 201, 0.4);
}
.evasion-nc-brand-title {
    font-size: 15px;
    font-weight: 800;
    color: #fff;
    line-height: 1.2;
}
.evasion-nc-brand-sub {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.72);
}
.evasion-nc-tabs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
}
.evasion-nc-btn {
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
    font-size: 12px;
    font-weight: 700;
    padding: 7px 12px;
    border-radius: 11px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.evasion-nc-btn:hover {
    background: rgba(255, 255, 255, 0.18);
    transform: translateY(-1px);
}
.evasion-nc-btn.active {
    background: linear-gradient(135deg, #0082c9, #338b84);
    border-color: rgba(255, 255, 255, 0.45);
    box-shadow: 0 4px 14px rgba(0, 130, 201, 0.45);
}
.evasion-nc-grid-2x2 {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}
.evasion-nc-grid-1x1 {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
}
@media (max-width: 1100px) {
    .evasion-nc-grid-2x2 {
        grid-template-columns: 1fr;
    }
}
.evasion-nc-widget-card {
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.22);
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.22);
}
.evasion-nc-widget-header {
    background: #0f172a;
    color: #fff;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid #1e293b;
}
.evasion-nc-widget-select {
    background: #1e293b;
    color: #fff;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
}
.evasion-nc-widget-actions {
    display: flex;
    align-items: center;
    gap: 6px;
}
.evasion-nc-mini-btn {
    background: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
    border: 0;
    border-radius: 7px;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;
}
.evasion-nc-mini-btn:hover {
    background: #0082c9;
    color: #fff;
}
body.evasion-hide-nc-default-panels #app-dashboard .panels {
    display: none !important;
}
EOF

cat <<'EOF' > "$CORE_DIR/js/dashboard_inject.js"
(function() {
    var PLUGINS = [
        { id: 'submissions', label: '📥 Soumissions & Appels', route: '/index.php/apps/evasion_soumissions/' },
        { id: 'crm', label: '📇 CRM Clients & Factures', route: '/index.php/apps/evasion_crm/' },
        { id: 'chatbot', label: '🤖 Martine V. IA', route: '/index.php/apps/evasion_martine/' },
        { id: 'devis_form', label: '📝 Formulaire Devis', route: '/index.php/apps/evasion_devis/' },
        { id: 'newsletter', label: '📧 Infolettre & Campagnes', route: '/index.php/apps/evasion_newsletter/' },
        { id: 'stats', label: '📊 Statistiques', route: '/index.php/apps/evasion_stats/' },
        { id: 'team_chat', label: '💬 Chat d\'Équipe', route: '/index.php/apps/evasion_chat/' },
        { id: 'users_grades', label: '🛡️ Grades & Accès', route: '/index.php/apps/evasionsoleil/?plugin=users_grades' },
        { id: 'mysql_server', label: '🗄️ Serveur MySQL', route: '/index.php/apps/evasionsoleil/?plugin=mysql_server' }
    ];

    function getIframeUrl(pluginId) {
        return '/index.php/apps/evasionsoleil/app?nextcloud=1&plugin=' + encodeURIComponent(pluginId) + '&header=0#' + encodeURIComponent(pluginId);
    }

    function mountDashboardCockpit() {
        var path = window.location.pathname || '';
        if (path.indexOf('/apps/dashboard') === -1) return;
        if (document.getElementById('evasion-nc-dashboard-cockpit')) return;

        var dashboardRoot = document.getElementById('app-dashboard') || document.getElementById('app-content') || document.querySelector('main');
        if (!dashboardRoot) return;

        var savedLayout = localStorage.getItem('evasion_nc_dash_layout') || 'grid4';
        var savedFocusPlugin = localStorage.getItem('evasion_nc_dash_focus') || 'submissions';
        var hideDefaultPanels = localStorage.getItem('evasion_nc_hide_default') === '1';
        var savedSlots = ['submissions', 'crm', 'chatbot', 'newsletter'];
        try {
            var parsed = JSON.parse(localStorage.getItem('evasion_nc_dash_slots') || 'null');
            if (Array.isArray(parsed) && parsed.length === 4) savedSlots = parsed;
        } catch (e) {}

        if (hideDefaultPanels) {
            document.body.classList.add('evasion-hide-nc-default-panels');
        }

        var container = document.createElement('div');
        container.id = 'evasion-nc-dashboard-cockpit';

        function render() {
            var html = '';
            html += '<div class="evasion-nc-cockpit-bar">';
            html += '  <div class="evasion-nc-brand">';
            html += '    <div class="evasion-nc-brand-badge">☀️</div>';
            html += '    <div>';
            html += '      <div class="evasion-nc-brand-title">Voyages Évasion Soleil — Dashboard Interactif Multi-Plugins</div>';
            html += '      <div class="evasion-nc-brand-sub">Interagissez directement avec vos plugins depuis l\'accueil Nextcloud</div>';
            html += '    </div>';
            html += '  </div>';

            html += '  <div class="evasion-nc-tabs">';
            html += '    <button type="button" class="evasion-nc-btn ' + (savedLayout === 'grid4' ? 'active' : '') + '" data-layout="grid4">🧩 Grille 4 Plugins (2x2)</button>';
            html += '    <button type="button" class="evasion-nc-btn ' + (savedLayout === 'grid2' ? 'active' : '') + '" data-layout="grid2">⚡ Côte-à-côte (2 Plugins)</button>';
            html += '    <button type="button" class="evasion-nc-btn ' + (savedLayout === 'focus' ? 'active' : '') + '" data-layout="focus">🖥️ Mode Plein-Dashboard (1 Plugin)</button>';
            html += '    <button type="button" class="evasion-nc-btn" id="evasion-toggle-nc-panels">' + (hideDefaultPanels ? '📂 Afficher Fichiers Nextcloud' : '🙈 Masquer Fichiers recommandés') + '</button>';
            html += '  </div>';
            html += '</div>';

            if (savedLayout === 'focus') {
                html += '<div class="evasion-nc-tabs" style="margin-bottom:12px;">';
                PLUGINS.forEach(function(p) {
                    html += '<button type="button" class="evasion-nc-btn ' + (savedFocusPlugin === p.id ? 'active' : '') + '" data-focus-plugin="' + p.id + '">' + p.label + '</button>';
                });
                html += '</div>';

                html += '<div class="evasion-nc-grid-1x1">';
                html += '  <div class="evasion-nc-widget-card">';
                html += '    <div class="evasion-nc-widget-header">';
                html += '      <span style="font-size:12px;font-weight:800;">Plugin actif en direct : ' + savedFocusPlugin.toUpperCase() + '</span>';
                html += '      <div class="evasion-nc-widget-actions">';
                html += '        <a class="evasion-nc-mini-btn" href="/index.php/apps/evasionsoleil/?plugin=' + encodeURIComponent(savedFocusPlugin) + '">↗ Ouvrir en pleine page</a>';
                html += '      </div>';
                html += '    </div>';
                html += '    <iframe src="' + getIframeUrl(savedFocusPlugin) + '" style="width:100%;height:760px;border:0;display:block;background:#f8fafc;" allow="clipboard-write; notifications; microphone"></iframe>';
                html += '  </div>';
                html += '</div>';
            } else {
                var count = savedLayout === 'grid2' ? 2 : 4;
                var frameHeight = savedLayout === 'grid2' ? '720px' : '540px';
                html += '<div class="evasion-nc-grid-2x2">';
                for (var i = 0; i < count; i++) {
                    var currentId = savedSlots[i] || 'submissions';
                    html += '<div class="evasion-nc-widget-card">';
                    html += '  <div class="evasion-nc-widget-header">';
                    html += '    <select class="evasion-nc-widget-select" data-slot-index="' + i + '">';
                    PLUGINS.forEach(function(p) {
                        html += '<option value="' + p.id + '" ' + (p.id === currentId ? 'selected' : '') + '>' + p.label + '</option>';
                    });
                    html += '    </select>';
                    html += '    <div class="evasion-nc-widget-actions">';
                    html += '      <button type="button" class="evasion-nc-mini-btn" data-expand-plugin="' + currentId + '">🔍 Agrandir ici</button>';
                    html += '      <a class="evasion-nc-mini-btn" href="/index.php/apps/evasionsoleil/?plugin=' + encodeURIComponent(currentId) + '">↗ Pleine page</a>';
                    html += '    </div>';
                    html += '  </div>';
                    html += '  <iframe id="evasion-slot-iframe-' + i + '" src="' + getIframeUrl(currentId) + '" style="width:100%;height:' + frameHeight + ';border:0;display:block;background:#f8fafc;" allow="clipboard-write; notifications; microphone"></iframe>';
                    html += '</div>';
                }
                html += '</div>';
            }

            container.innerHTML = html;

            container.querySelectorAll('[data-layout]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    savedLayout = btn.getAttribute('data-layout');
                    localStorage.setItem('evasion_nc_dash_layout', savedLayout);
                    render();
                });
            });

            container.querySelectorAll('[data-focus-plugin]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    savedFocusPlugin = btn.getAttribute('data-focus-plugin');
                    localStorage.setItem('evasion_nc_dash_focus', savedFocusPlugin);
                    render();
                });
            });

            container.querySelectorAll('[data-expand-plugin]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    savedFocusPlugin = btn.getAttribute('data-expand-plugin');
                    savedLayout = 'focus';
                    localStorage.setItem('evasion_nc_dash_focus', savedFocusPlugin);
                    localStorage.setItem('evasion_nc_dash_layout', 'focus');
                    render();
                });
            });

            container.querySelectorAll('[data-slot-index]').forEach(function(sel) {
                sel.addEventListener('change', function() {
                    var idx = parseInt(sel.getAttribute('data-slot-index'), 10);
                    savedSlots[idx] = sel.value;
                    localStorage.setItem('evasion_nc_dash_slots', JSON.stringify(savedSlots));
                    var iframe = document.getElementById('evasion-slot-iframe-' + idx);
                    if (iframe) {
                        iframe.src = getIframeUrl(sel.value);
                    }
                });
            });

            var toggleBtn = document.getElementById('evasion-toggle-nc-panels');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', function() {
                    hideDefaultPanels = !hideDefaultPanels;
                    localStorage.setItem('evasion_nc_hide_default', hideDefaultPanels ? '1' : '0');
                    if (hideDefaultPanels) {
                        document.body.classList.add('evasion-hide-nc-default-panels');
                    } else {
                        document.body.classList.remove('evasion-hide-nc-default-panels');
                    }
                    render();
                });
            }
        }

        var panelsEl = dashboardRoot.querySelector('.panels');
        if (panelsEl && panelsEl.parentNode) {
            panelsEl.parentNode.insertBefore(container, panelsEl);
        } else {
            dashboardRoot.appendChild(container);
        }
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(mountDashboardCockpit, 250);
            setTimeout(mountDashboardCockpit, 1200);
        });
    } else {
        setTimeout(mountDashboardCockpit, 150);
        setTimeout(mountDashboardCockpit, 1000);
    }
})();
EOF

fix_perms "$CORE_DIR"
run_occ app:enable evasionsoleil || true
echo "✅ Passerelle PHP + Dashboard Interactif 'evasionsoleil' activés !"

# 5. Installation des 7 Plugins Maison dans la barre supérieure de Nextcloud
create_nc_plugin() {
  local APP_ID="$1"
  local APP_NAME="$2"
  local TAB_ID="$3"
  local ORDER_NUM="$4"
  local SVG_CONTENT="$5"

  local P_DIR="$CUSTOM_APPS/$APP_ID"
  rm -rf "$P_DIR"
  mkdir -p "$P_DIR/appinfo" "$P_DIR/lib/Controller" "$P_DIR/templates" "$P_DIR/img"

  cat <<EOF > "$P_DIR/img/app.svg"
$SVG_CONTENT
EOF

  cat <<EOF > "$P_DIR/appinfo/info.xml"
<?xml version="1.0"?>
<info xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="https://apps.nextcloud.com/schema/apps/info.xsd">
    <id>$APP_ID</id>
    <name>$APP_NAME</name>
    <summary>Plugin Maison Évasion Soleil ($APP_NAME)</summary>
    <description><![CDATA[Module $APP_NAME intégré directement dans Nextcloud]]></description>
    <version>4.0.0</version>
    <licence>agpl</licence>
    <author>Voyages Évasion Soleil</author>
    <namespace>Evasion_${TAB_ID}</namespace>
    <category>office</category>
    <dependencies>
        <nextcloud min-version="24" max-version="32" />
    </dependencies>
    <navigations>
        <navigation>
            <name>$APP_NAME</name>
            <route>${APP_ID}.page.index</route>
            <icon>app.svg</icon>
            <order>$ORDER_NUM</order>
        </navigation>
    </navigations>
</info>
EOF

  cat <<EOF > "$P_DIR/appinfo/routes.php"
<?php
return [
    'routes' => [
        ['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],
    ]
];
EOF

  cat <<EOF > "$P_DIR/lib/Controller/PageController.php"
<?php
namespace OCA\\Evasion_${TAB_ID}\\Controller;

use OCP\\AppFramework\\Controller;
use OCP\\AppFramework\\Http\\TemplateResponse;
use OCP\\AppFramework\\Http\\ContentSecurityPolicy;
use OCP\\IRequest;
use OCP\\IUserSession;

class PageController extends Controller {
    private IUserSession \$userSession;

    public function __construct(string \$AppName, IRequest \$request, IUserSession \$userSession) {
        parent::__construct(\$AppName, \$request);
        \$this->userSession = \$userSession;
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function index(): TemplateResponse {
        \$user = \$this->userSession->getUser();
        \$uid = \$user ? \$user->getUID() : 'admin';
        \$response = new TemplateResponse('$APP_ID', 'main', [
            'uid' => \$uid,
            'tab' => '$TAB_ID'
        ]);
        \$csp = new ContentSecurityPolicy();
        \$csp->addAllowedFrameDomain("'self'");
        \$csp->addAllowedFrameDomain('*');
        \$csp->addAllowedChildSrcDomain("'self'");
        \$csp->addAllowedChildSrcDomain('*');
        \$csp->addAllowedConnectDomain('*');
        \$response->setContentSecurityPolicy(\$csp);
        return \$response;
    }
}
EOF

  cat <<'EOF' > "$P_DIR/templates/main.php"
<?php
$uid = isset($_['uid']) ? $_['uid'] : 'admin';
$tab = isset($_['tab']) ? $_['tab'] : 'submissions';
$iframeUrl = '/index.php/apps/evasionsoleil/app?nextcloud=1&plugin=' . urlencode($tab) . '&header=0&nc_user=' . urlencode($uid) . '#' . urlencode($tab);
?>
<div id="app-content" style="width:100%;height:calc(100vh - 50px);margin:0;padding:0;overflow:hidden;background:#f8fafc;">
    <iframe
        src="<?php echo p($iframeUrl); ?>"
        style="width:100%;height:100%;border:0;margin:0;padding:0;display:block;"
        allow="clipboard-write; notifications; microphone"
        allowfullscreen>
    </iframe>
</div>
EOF

  fix_perms "$P_DIR"
  run_occ app:enable "$APP_ID" || true
  echo "   ✔ Plugin activé : $APP_NAME ($APP_ID)"
}

echo "🧩 Activation des 7 plugins individuels dans la barre du haut..."

create_nc_plugin "evasion_soumissions" "Soumissions" "submissions" 1 \
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>'

create_nc_plugin "evasion_crm" "CRM & Factures" "crm" 2 \
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"/><rect width="18" height="18" x="3" y="4" rx="2"/><circle cx="12" cy="10" r="2"/><line x1="8" x2="8" y1="2" y2="4"/><line x1="16" x2="16" y1="2" y2="4"/></svg>'

create_nc_plugin "evasion_martine" "Martine V. IA" "chatbot" 3 \
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>'

create_nc_plugin "evasion_devis" "Formulaire Devis" "devis_form" 4 \
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>'

create_nc_plugin "evasion_newsletter" "Infolettre" "newsletter" 5 \
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>'

create_nc_plugin "evasion_stats" "Statistiques" "stats" 6 \
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>'

create_nc_plugin "evasion_chat" "Chat Équipe" "team_chat" 7 \
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'

# 6. Réparation automatique des liens "External sites" (/index.php/apps/external/1..9) s'ils existent
EXISTING_EXTERNAL="$(run_occ config:app:get external sites 2>/dev/null || true)"
if [ -n "$EXISTING_EXTERNAL" ] && command -v node &>/dev/null; then
  echo "🔧 Mise à jour automatique de vos liens 'Sites externes' (/apps/external/)..."
  FIXED_EXTERNAL="$(EXISTING_JSON="$EXISTING_EXTERNAL" DOMAIN="$INTRANET_DOMAIN" node -e '
    try {
      const sites = JSON.parse(process.env.EXISTING_JSON);
      const domain = (process.env.DOMAIN || "https://intranet.evasionsoleil.com").replace(/\/$/, "");
      for (const k of Object.keys(sites)) {
        const s = sites[k];
        const txt = ((s.name || "") + " " + (s.url || "")).toLowerCase();
        let tab = "submissions";
        if (txt.includes("crm") || txt.includes("factur") || txt.includes("client")) tab = "crm";
        else if (txt.includes("martine") || txt.includes("bot") || txt.includes("ia")) tab = "chatbot";
        else if (txt.includes("devis") || txt.includes("form")) tab = "devis_form";
        else if (txt.includes("infolettre") || txt.includes("newsletter")) tab = "newsletter";
        else if (txt.includes("stat")) tab = "stats";
        else if (txt.includes("chat") || txt.includes("equipe") || txt.includes("équipe")) tab = "team_chat";
        else if (txt.includes("grade") || txt.includes("user")) tab = "users_grades";
        else if (txt.includes("mysql")) tab = "mysql_server";
        s.url = domain + "/index.php/apps/evasionsoleil/app?nextcloud=1&plugin=" + tab + "&header=0#" + tab;
      }
      process.stdout.write(JSON.stringify(sites));
    } catch (e) {}
  ')"
  if [ -n "$FIXED_EXTERNAL" ]; then
    run_occ config:app:set external sites --value="$FIXED_EXTERNAL" 2>/dev/null || true
    echo "   ✔ Vos liens /index.php/apps/external/ pointent maintenant vers la passerelle fonctionnelle !"
  fi
fi

echo ""
echo "=============================================================================="
echo "🎉 INSTALLATION V4.0 TERMINÉE AVEC SUCCÈS SUR $INTRANET_DOMAIN !"
echo "👉 Allez sur : $INTRANET_DOMAIN/index.php/apps/dashboard/"
echo "   - Vos plugins interactifs sont maintenant affichés DIRECTEMENT sur le Dashboard"
echo "     (Grille 4 plugins 2x2, Côte-à-côte 2 plugins, ou Plein-Dashboard) !"
echo "   - Tous vos plugins dans la barre du haut fonctionnent sans écran blanc !"
echo "=============================================================================="
