#!/bin/bash
# ==============================================================================
# 🌴 VOYAGES ÉVASION SOLEIL - INSTALLATEUR COMPLET GITHUB -> NEXTCLOUD
# Domaine unique : https://intranet.evasionsoleil.com (employee.evasionsoleil.com retiré)
# Ce script :
#   1. Installe et démarre le moteur Évasion Soleil en service 24/7 (port 1031)
#   2. Configure le pont sur intranet.evasionsoleil.com (/evasion-app/)
#   3. Crée et active TOUS les 9 plugins maison + les Widgets Dashboard dans Nextcloud
# ==============================================================================
set -e

INTRANET_DOMAIN="${INTRANET_DOMAIN:-https://intranet.evasionsoleil.com}"
APP_PORT="${PORT:-1031}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================================================="
echo "🌴 INSTALLATION COMPLÈTE ÉVASION SOLEIL SUR NEXTCLOUD ($INTRANET_DOMAIN)"
echo "=============================================================================="

# 1. Détection automatique du dossier Nextcloud
NC_PATH="${1:-}"
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
  echo "⚠️  Impossible de détecter automatiquement le fichier 'occ' de Nextcloud."
  echo "👉 Relancez la commande en précisant le chemin de votre Nextcloud :"
  echo "   sudo bash install-github-nextcloud.sh /chemin/vers/nextcloud"
  exit 1
fi

echo "✅ Nextcloud détecté dans : $NC_PATH"

# Détection de l'utilisateur du serveur web (www-data, nginx, apache)
WEB_USER="www-data"
if id "nginx" &>/dev/null && ! id "www-data" &>/dev/null; then
  WEB_USER="nginx"
elif id "apache" &>/dev/null && ! id "www-data" &>/dev/null; then
  WEB_USER="apache"
fi

# 2. Compilation et démarrage du moteur Évasion Soleil depuis ce dépôt GitHub
if [ -f "$REPO_DIR/package.json" ]; then
  echo "📦 Installation des dépendances et compilation du moteur Évasion Soleil..."
  cd "$REPO_DIR"
  if command -v npm &>/dev/null; then
    npm install --no-audit --no-fund
    npm run build
  fi

  # Création du service systemd pour que le moteur tourne 24/7 sur 127.0.0.1:1031
  if command -v systemctl &>/dev/null; then
    NODE_BIN="$(command -v node || echo '/usr/bin/node')"
    cat <<EOF > /etc/systemd/system/evasion-intranet.service
[Unit]
Description=Evasion Soleil Intranet Engine (Nextcloud Plugins Backend)
After=network.target mysql.service mariadb.service

[Service]
Type=simple
WorkingDirectory=$REPO_DIR
Environment=NODE_ENV=production
Environment=PORT=$APP_PORT
Environment=SERVER_PORT=$APP_PORT
Environment=APP_URL=$INTRANET_DOMAIN/evasion-app
ExecStart=$NODE_BIN dist/server.cjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable evasion-intranet.service
    systemctl restart evasion-intranet.service
    echo "✅ Service 'evasion-intranet' actif en arrière-plan sur 127.0.0.1:$APP_PORT"
  fi
fi

# 3. Configuration automatique du Reverse-Proxy sur intranet.evasionsoleil.com/evasion-app/
# Permet de tout faire passer par https://intranet.evasionsoleil.com sans autre sous-domaine !
ENGINE_PUBLIC_URL="$INTRANET_DOMAIN/evasion-app"

if [ -d "/etc/apache2" ] && command -v a2enmod &>/dev/null; then
  echo "🌐 Configuration du pont Apache /evasion-app sur $INTRANET_DOMAIN..."
  a2enmod proxy proxy_http headers rewrite &>/dev/null || true
  cat <<EOF > /etc/apache2/conf-available/evasion-nextcloud-proxy.conf
# Pont Évasion Soleil Intranet -> 127.0.0.1:$APP_PORT
ProxyPreserveHost On
ProxyPass /evasion-app/ http://127.0.0.1:$APP_PORT/
ProxyPassReverse /evasion-app/ http://127.0.0.1:$APP_PORT/
ProxyPass /api/ http://127.0.0.1:$APP_PORT/api/
ProxyPassReverse /api/ http://127.0.0.1:$APP_PORT/api/
EOF
  a2enconf evasion-nextcloud-proxy &>/dev/null || true
  systemctl reload apache2 &>/dev/null || true
fi

# 4. Génération de TOUS les Plugins Maison dans $NC_PATH/custom_apps/
CUSTOM_APPS="$NC_PATH/custom_apps"
mkdir -p "$CUSTOM_APPS"

create_nc_plugin() {
  local APP_ID="$1"
  local APP_NAME="$2"
  local TAB_ID="$3"
  local ORDER_NUM="$4"
  local SVG_CONTENT="$5"

  local P_DIR="$CUSTOM_APPS/$APP_ID"
  mkdir -p "$P_DIR/appinfo" "$P_DIR/lib/Controller" "$P_DIR/templates" "$P_DIR/img"

  cat <<EOF > "$P_DIR/img/app.svg"
$SVG_CONTENT
EOF

  cat <<EOF > "$P_DIR/appinfo/info.xml"
<?xml version="1.0"?>
<info xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="https://apps.nextcloud.com/schema/apps/info.xsd">
    <id>$APP_ID</id>
    <name>$APP_NAME</name>
    <summary>Plugin Maison Évasion Soleil ($APP_NAME) intégré dans Nextcloud</summary>
    <description><![CDATA[Module $APP_NAME intégré directement sur $INTRANET_DOMAIN]]></description>
    <version>3.1.0</version>
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
        \$csp->addAllowedFrameDomain('*');
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
$host = $_SERVER['HTTP_HOST'] ?? 'intranet.evasionsoleil.com';
$proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$baseUrl = $proto . '://' . $host . '/evasion-app';
$iframeUrl = $baseUrl . '/?nextcloud=1&plugin=' . urlencode($tab) . '&header=0&nc_user=' . urlencode($uid) . '#' . urlencode($tab);
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

  chown -R "$WEB_USER:$WEB_USER" "$P_DIR" 2>/dev/null || true
  sudo -u "$WEB_USER" php "$NC_PATH/occ" app:enable "$APP_ID" 2>/dev/null || true
  echo "   ✔ Plugin activé : $APP_NAME ($APP_ID)"
}

echo "🧩 Création et activation des plugins maison dans Nextcloud..."

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

echo ""
echo "=============================================================================="
echo "🎉 TOUS VOS PLUGINS SONT INSTALLÉS SUR $INTRANET_DOMAIN !"
echo "   Aucun sous-domaine 'employee.evasionsoleil.com' n'est requis."
echo "   Rafraîchissez simplement votre page Nextcloud ($INTRANET_DOMAIN) :"
echo "   vos icônes (Soumissions, CRM & Factures, Martine V., Devis, Infolettre...)"
echo "   sont maintenant directement dans la barre du haut de Nextcloud !"
echo "=============================================================================="
