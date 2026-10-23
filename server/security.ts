import crypto from 'crypto';
import express from 'express';

export interface SecurityAuditEvent {
  id: string;
  timestamp: string;
  type: 'sqli_blocked' | 'xss_blocked' | 'path_traversal' | 'proto_pollution' | 'scanner_blocked' | 'brute_force_lock' | 'rate_limit' | 'db_failover' | 'db_recovered';
  ip: string;
  path: string;
  details: string;
  severity: 'medium' | 'high' | 'critical';
}

const VAULT_SECRET = process.env.VAULT_ENCRYPTION_KEY || process.env.MYSQL_PASSWORD || 'EvasionSoleil_UltraSecure_AES256_VaultKey_2026!@#';
const DERIVED_KEY = crypto.scryptSync(VAULT_SECRET, 'evasion_soleil_salt_v2_2026', 32);

const securityEvents: SecurityAuditEvent[] = [];
let totalBlockedAttacks = 0;

// Brute-force login tracking
const failedLoginMap = new Map<string, { count: number; firstAttempt: number; lockedUntil: number }>();

// Global API DDoS rate limiting per IP
const globalRateMap = new Map<string, { count: number; windowStart: number }>();

export function recordSecurityEvent(
  type: SecurityAuditEvent['type'],
  ip: string,
  reqPath: string,
  details: string,
  severity: SecurityAuditEvent['severity'] = 'high'
) {
  if (type !== 'db_failover' && type !== 'db_recovered') {
    totalBlockedAttacks += 1;
  }
  const evt: SecurityAuditEvent = {
    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    type,
    ip: ip || 'Inconnue',
    path: reqPath || '/',
    details,
    severity,
  };
  securityEvents.unshift(evt);
  if (securityEvents.length > 100) {
    securityEvents.length = 100;
  }
  console.warn(`[BOUCLIER ANTI-HACK • ${severity.toUpperCase()}] (${type}) IP=${ip} Path=${reqPath} — ${details}`);
}

export function getSecurityTelemetry() {
  const activeLockouts: Array<{ ip: string; lockedUntil: string; attempts: number }> = [];
  const now = Date.now();
  for (const [ip, data] of failedLoginMap.entries()) {
    if (data.lockedUntil > now) {
      activeLockouts.push({
        ip,
        lockedUntil: new Date(data.lockedUntil).toISOString(),
        attempts: data.count,
      });
    }
  }

  return {
    wafActive: true,
    encryptionStandard: 'AES-256-GCM + HMAC-SHA256',
    antiBruteForceActive: true,
    antiSqlInjectionActive: true,
    antiXssActive: true,
    antiDdosActive: true,
    zeroDowntimeFailoverActive: true,
    totalBlockedAttacks,
    activeLockouts,
    recentEvents: securityEvents.slice(0, 25),
  };
}

/**
 * Chiffrement matériel AES-256-GCM avec vecteur d'initialisation aléatoire (IV)
 * et tag d'authentification cryptographique (AuthTag) anti-altération.
 */
export function encryptVaultPayload(plainObject: unknown): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', DERIVED_KEY, iv);
  const jsonStr = JSON.stringify(plainObject);
  const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `ESVAULT_V1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('base64')}`;
}

export function decryptVaultPayload<T>(payload: string): T | null {
  try {
    if (!payload || !payload.startsWith('ESVAULT_V1:')) {
      return null;
    }
    const parts = payload.split(':');
    if (parts.length !== 4) return null;
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encryptedData = Buffer.from(parts[3], 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', DERIVED_KEY, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as T;
  } catch (err: any) {
    console.error('[Vault Decrypt Error]: Intégrité du coffre local invalide ou corrompue:', err.message);
    return null;
  }
}

/**
 * Signature HMAC-SHA256 pour jetons de session administrateur/collaborateur
 */
export function signSessionToken(userId: string, username: string, role: string): string {
  const issuedAt = Date.now();
  const payload = Buffer.from(JSON.stringify({ userId, username, role, issuedAt })).toString('base64url');
  const sig = crypto.createHmac('sha256', DERIVED_KEY).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): { valid: boolean; userId?: string; username?: string; role?: string } {
  try {
    if (!token || !token.includes('.')) return { valid: false };
    const [payload, sig] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', DERIVED_KEY).update(payload).digest('base64url');
    if (sig !== expectedSig) return { valid: false };
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return { valid: true, userId: decoded.userId, username: decoded.username, role: decoded.role };
  } catch {
    return { valid: false };
  }
}

/**
 * Protection Anti-Brute-Force sur la connexion et l'A2F
 */
export function checkLoginBruteForce(ip: string): { allowed: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const entry = failedLoginMap.get(ip);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  // Réinitialiser la fenêtre si plus de 10 minutes se sont écoulées
  if (now - entry.firstAttempt > 10 * 60 * 1000) {
    failedLoginMap.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip: string, usernameAttempt: string): { locked: boolean; attemptsLeft: number } {
  const now = Date.now();
  const maxAttempts = 6;
  const lockDurationMs = 15 * 60 * 1000; // 15 minutes de blocage

  const existing = failedLoginMap.get(ip);
  if (!existing || now - existing.firstAttempt > 10 * 60 * 1000) {
    failedLoginMap.set(ip, { count: 1, firstAttempt: now, lockedUntil: 0 });
    return { locked: false, attemptsLeft: maxAttempts - 1 };
  }

  existing.count += 1;
  if (existing.count >= maxAttempts) {
    existing.lockedUntil = now + lockDurationMs;
    failedLoginMap.set(ip, existing);
    recordSecurityEvent(
      'brute_force_lock',
      ip,
      '/api/auth/login',
      `Verrouillage automatique anti-brute-force (15 min) après ${existing.count} échecs de connexion sur le compte "${usernameAttempt}".`,
      'critical'
    );
    return { locked: true, attemptsLeft: 0 };
  }

  failedLoginMap.set(ip, existing);
  return { locked: false, attemptsLeft: Math.max(0, maxAttempts - existing.count) };
}

export function clearFailedLogin(ip: string) {
  failedLoginMap.delete(ip);
}

/**
 * Nettoyage récursif anti-Prototype Pollution & neutralisation des vecteurs XSS dangereux
 */
function sanitizeObjectInPlace(obj: any, allowHtmlContent = false): boolean {
  if (!obj || typeof obj !== 'object') return false;
  let polluted = false;

  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  for (const key of Object.keys(obj)) {
    if (dangerousKeys.includes(key)) {
      delete obj[key];
      polluted = true;
      continue;
    }
    const val = obj[key];
    if (typeof val === 'string') {
      // Remove null bytes
      if (val.includes('\0')) {
        obj[key] = val.replace(/\0/g, '');
      }
      // Neutralize <script> tags and javascript: URIs even in rich fields
      if (/<script\b[^>]*>([\s\S]*?)<\/script>/gi.test(obj[key]) || /javascript\s*:/gi.test(obj[key])) {
        obj[key] = obj[key]
          .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '')
          .replace(/javascript\s*:/gi, 'blocked:');
      }
    } else if (typeof val === 'object' && val !== null) {
      if (sanitizeObjectInPlace(val, allowHtmlContent)) {
        polluted = true;
      }
    }
  }
  return polluted;
}

const SCANNER_USER_AGENTS = /(sqlmap|nikto|acunetix|nmap|nessus|dirbuster|gobuster|masscan|zgrab|havij|w3af|metasploit)/i;
const PATH_TRAVERSAL_REGEX = /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|\/etc\/passwd|\/proc\/self|\.env\b|\.git\b)/i;
const SQLI_URL_REGEX = /(\bUNION\s+ALL\s+SELECT\b|\bUNION\s+SELECT\b|\bDROP\s+TABLE\b|\bALTER\s+TABLE\b|\bINFORMATION_SCHEMA\b|\bSLEEP\s*\(\s*\d+\s*\)|\bBENCHMARK\s*\(|;\s*SHUTDOWN\b)/i;

/**
 * Middleware Bouclier WAF (Web Application Firewall) exécuté sur chaque requête
 */
export function wafSecurityShield(req: express.Request, res: express.Response, next: express.NextFunction) {
  const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const ip = rawIp.split(',')[0].trim();
  const ua = String(req.headers['user-agent'] || '');
  const fullUrl = req.originalUrl || req.url || '';

  // 1. Masquer la signature serveur
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Security-Shield', 'EvasionSoleil-WAF-Active');

  // 2. Bloquer les scanners de vulnérabilités et outils de piratage automatisés
  if (SCANNER_USER_AGENTS.test(ua)) {
    recordSecurityEvent('scanner_blocked', ip, req.path, `Outil de scan détecté (User-Agent: ${ua.slice(0, 80)})`, 'critical');
    return res.status(403).json({ error: 'Accès refusé par le bouclier de sécurité.' });
  }

  // 3. Bloquer toute tentative de Path Traversal ou lecture de fichiers sensibles (.env, .git, /etc/passwd)
  let decodedUrl = fullUrl;
  try {
    decodedUrl = decodeURIComponent(fullUrl);
  } catch {}
  if (PATH_TRAVERSAL_REGEX.test(fullUrl) || PATH_TRAVERSAL_REGEX.test(decodedUrl)) {
    recordSecurityEvent('path_traversal', ip, req.path, `Tentative d'accès fichier système bloquée: ${decodedUrl.slice(0, 120)}`, 'critical');
    return res.status(403).json({ error: 'Requête bloquée par le pare-feu applicatif (WAF).' });
  }

  // 4. Bloquer les injections SQL dans l'URL ou les paramètres GET
  if (SQLI_URL_REGEX.test(decodedUrl)) {
    recordSecurityEvent('sqli_blocked', ip, req.path, `Tentative d'injection SQL bloquée dans l'URL: ${decodedUrl.slice(0, 120)}`, 'critical');
    return res.status(403).json({ error: 'Requête malveillante bloquée par le pare-feu SQL.' });
  }

  // 5. Anti-DDoS / Flood Limiter sur les routes /api/* (max 450 req / minute par IP)
  if (req.path.startsWith('/api/')) {
    const now = Date.now();
    const rate = globalRateMap.get(ip);
    if (!rate || now - rate.windowStart > 60 * 1000) {
      globalRateMap.set(ip, { count: 1, windowStart: now });
    } else {
      rate.count += 1;
      if (rate.count > 450) {
        if (rate.count === 451) {
          recordSecurityEvent('rate_limit', ip, req.path, `Dépassement de limite de requêtes API (${rate.count}/min) — Protection Anti-DDoS activée`, 'high');
        }
        return res.status(429).json({
          error: 'Trop de requêtes envoyées simultanément. Protection Anti-DDoS active, veuillez patienter quelques secondes.',
        });
      }
    }
  }

  // 6. Nettoyage Anti-Prototype Pollution & Anti-XSS sur req.body et req.query
  if (req.body && typeof req.body === 'object') {
    const wasPolluted = sanitizeObjectInPlace(req.body);
    if (wasPolluted) {
      recordSecurityEvent('proto_pollution', ip, req.path, 'Tentative de Prototype Pollution neutralisée dans le corps JSON', 'critical');
      return res.status(400).json({ error: 'Payload JSON rejeté par le bouclier de sécurité.' });
    }
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObjectInPlace(req.query);
  }

  next();
}
