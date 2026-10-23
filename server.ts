import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { dbManager } from './server/db.js';
import { generateMartineResponse, getOpenAIStatus, testOpenAIConnection } from './server/gemini.js';
import { generateBase32Secret, verifyTotpCode, generateTotpQrCode } from './server/totp.js';
import {
  sendSubmissionEmails,
  sendMartineConversationEmail,
  getEmailConfigStatus,
  testEmailConnection,
  sendNewsletterWelcomeEmail,
  sendNewsletterCampaignEmail,
  sendPasswordResetVerificationEmail,
  sendSubmissionProposalsEmail,
  sendInvoicePaymentEmail,
  sendLegalDocumentEmail,
} from './server/emailService.js';
import { CallStatus } from './src/types.js';
import {
  wafSecurityShield,
  checkLoginBruteForce,
  recordFailedLogin,
  clearFailedLogin,
  signSessionToken,
  getSecurityTelemetry,
} from './server/security.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.SERVER_PORT || process.env.PORT) || 1031;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Support optional /evasion path prefix when hosted alongside Nextcloud on https://intranet.evasionsoleil.com/evasion
app.use((req, _res, next) => {
  if (req.url === '/evasion' || req.url.startsWith('/evasion/') || req.url.startsWith('/evasion?')) {
    req.url = req.url.slice(8) || '/';
  }
  next();
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      error: 'Le fichier joint est volumineux. Veuillez utiliser un fichier PDF plus léger ou laisser le système le compresser.',
    });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Format de requête JSON invalide.' });
  }
  next(err);
});

// Security Headers, WAF Shield & Content Protection
app.use(wafSecurityShield);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Allow framing inside Nextcloud and embed modes
  const reqPath = (req.path || '').toLowerCase();
  const modeParam = typeof req.query.mode === 'string' ? req.query.mode.toLowerCase() : '';
  const pluginParam = typeof req.query.plugin === 'string' ? req.query.plugin.toLowerCase() : '';
  const isNextcloudOrEmbed =
    req.query.nextcloud === '1' ||
    req.query.nc === '1' ||
    Boolean(pluginParam) ||
    modeParam === 'nextcloud' ||
    modeParam === 'widget_devis' ||
    modeParam === 'widget_chat' ||
    modeParam === 'widget_newsletter' ||
    modeParam === 'newsletter' ||
    modeParam === 'devis' ||
    modeParam === 'soumission' ||
    modeParam === 'quote' ||
    reqPath.startsWith('/nextcloud') ||
    reqPath === '/devis' ||
    reqPath.startsWith('/devis/') ||
    reqPath === '/soumission' ||
    reqPath.startsWith('/soumission/') ||
    reqPath === '/embed/devis' ||
    reqPath === '/embed/soumission' ||
    reqPath === '/embed/chat' ||
    reqPath === '/embed/newsletter' ||
    reqPath === '/newsletter';

  // Always allow framing from Nextcloud or any parent domain via frame-ancestors *
  res.removeHeader('X-Frame-Options');
  if (isNextcloudOrEmbed) {
    res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  } else {
    res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  }
  next();
});

// Brute-force rate limiter for sensitive authentication & password reset endpoints
const authRateLimitMap = new Map<string, { count: number; firstAttempt: number }>();
const authRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxAttempts = 20;

  const record = authRateLimitMap.get(ip);
  if (!record || now - record.firstAttempt > windowMs) {
    authRateLimitMap.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  if (record.count >= maxAttempts) {
    return res.status(429).json({
      error: 'Trop de requêtes d\'authentification détectées. Veuillez patienter 1 minute pour la sécurité de vos données.',
    });
  }

  record.count += 1;
  next();
};

// CORS helper for embeds
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 1. Health & Security Telemetry check
app.get('/api/health', async (req, res) => {
  const dbStat = await dbManager.getStatus();
  res.json({
    status: 'ok',
    port: PORT,
    activePorts: [1031, 3000],
    timestamp: new Date().toISOString(),
    service: 'Évasion Soleil Dashboard API',
    highAvailability: {
      zeroDowntimeActive: true,
      mysqlConnected: dbStat.connected,
      encryptedLocalFailoverVault: true,
      hasPendingOutageWrites: (dbStat as any).hasPendingOutageWrites || false,
    },
    securityShield: getSecurityTelemetry(),
    pterodactylConfig: {
      activePort: 1031,
      readyForPort1031: true,
    },
  });
});

app.get('/api/security/status', async (req, res) => {
  const dbStat = await dbManager.getStatus();
  res.json({
    ...getSecurityTelemetry(),
    databaseFailover: {
      mysqlConnected: dbStat.connected,
      mode: dbStat.connected ? 'mysql_primary_with_encrypted_standby' : 'encrypted_local_failover_active',
      hasPendingOutageWrites: (dbStat as any).hasPendingOutageWrites || false,
      pendingOutageCount: (dbStat as any).pendingOutageCount || 0,
      lastSyncedAt: dbStat.lastSyncedAt,
    },
  });
});

// 2. Auth & Users Management
app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const clientIp = rawIp.split(',')[0].trim();

  const bfCheck = checkLoginBruteForce(clientIp);
  if (!bfCheck.allowed) {
    return res.status(429).json({
      error: `Protection Anti-Hack activée : Trop de tentatives échouées depuis votre adresse IP. Accès temporairement verrouillé pendant encore ${Math.ceil((bfCheck.remainingSeconds || 60) / 60)} minute(s).`,
    });
  }

  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Nom d\'utilisateur ou courriel requis' });
  }
  const result = dbManager.authenticate(username, password || '');
  if (result.error || !result.user) {
    const failInfo = recordFailedLogin(clientIp, String(username));
    if (failInfo.locked) {
      dbManager.createNotification({
        title: '🛡️ Alerte Sécurité Anti-Hack : Brute-Force Bloqué',
        message: `L'adresse IP ${clientIp} a été verrouillée pour 15 minutes après 6 tentatives de connexion échouées sur "${username}".`,
        type: 'system',
      });
    }
    return res.status(401).json({
      error: failInfo.locked
        ? 'Trop de tentatives échouées. Votre adresse IP est verrouillée temporairement pendant 15 minutes par le bouclier Anti-Hack.'
        : `${result.error || 'Identifiants invalides'} (${failInfo.attemptsLeft} essai(s) restant(s) avant verrouillage de sécurité)`,
    });
  }

  clearFailedLogin(clientIp);
  const user = result.user;
  if (user.twoFactorEnabled) {
    const challenge = dbManager.createTwoFactorChallenge(user);
    const method = user.twoFactorMethod || (user.twoFactorSecret ? 'both' : 'email');

    if (method === 'email' || method === 'both') {
      try {
        await sendPasswordResetVerificationEmail({
          recipientEmail: user.email,
          userName: user.name || 'Collaborateur',
          verificationCode: challenge.emailCode,
        });
      } catch (emailErr) {
        console.error('[2FA Email Send Error]:', emailErr);
      }
    }

    return res.json({
      success: true,
      requiresTwoFactor: true,
      challengeToken: challenge.challengeToken,
      method,
      emailHint: user.email,
      userName: user.name,
    });
  }

  const sessionToken = signSessionToken(user.id, user.username || user.email, user.role);
  res.json({ success: true, user, sessionToken });
});

// Vérification du code A2F lors de la connexion
app.post('/api/auth/verify-2fa', authRateLimiter, (req, res) => {
  const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const clientIp = rawIp.split(',')[0].trim();

  const bfCheck = checkLoginBruteForce(clientIp);
  if (!bfCheck.allowed) {
    return res.status(429).json({
      error: `Protection Anti-Hack activée : Trop de tentatives échouées. Réessayez dans ${Math.ceil((bfCheck.remainingSeconds || 60) / 60)} minute(s).`,
    });
  }

  const { challengeToken, code } = req.body;
  if (!challengeToken || !code) {
    return res.status(400).json({ error: 'Jeton de session et code A2F à 6 chiffres requis.' });
  }
  const result = dbManager.verifyTwoFactorChallenge(challengeToken, String(code), verifyTotpCode);
  if (!result.success || !result.user) {
    recordFailedLogin(clientIp, '2FA-Verification');
    return res.status(401).json({ error: result.error || 'Code A2F invalide.' });
  }
  clearFailedLogin(clientIp);
  const sessionToken = signSessionToken(result.user.id, result.user.username || result.user.email, result.user.role);
  res.json({ success: true, user: result.user, sessionToken });
});

// Renvoyer un code A2F par courriel
app.post('/api/auth/resend-2fa', authRateLimiter, async (req, res) => {
  const { challengeToken } = req.body;
  if (!challengeToken) {
    return res.status(400).json({ error: 'Session A2F manquante.' });
  }
  const result = dbManager.resendTwoFactorChallenge(challengeToken);
  if (!result.success || !result.user || !result.emailCode) {
    return res.status(400).json({ error: result.error || 'Impossible de renvoyer le code.' });
  }

  try {
    await sendPasswordResetVerificationEmail({
      recipientEmail: result.user.email,
      userName: result.user.name || 'Collaborateur',
      verificationCode: result.emailCode,
    });
  } catch (err) {
    console.error('[Resend 2FA Email Error]:', err);
  }

  res.json({
    success: true,
    message: `Un nouveau code de sécurité A2F à 6 chiffres a été envoyé à ${result.user.email}.`,
  });
});

// Générer une clé secrète TOTP et un QR Code pour configurer Google Authenticator / Authy
app.post('/api/auth/2fa/setup', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = dbManager.getUserById(userId) || dbManager.getUserByUsernameOrEmail(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }
    const secret = user.twoFactorSecret || generateBase32Secret(20);
    const { otpauthUrl, qrCodeDataUrl } = await generateTotpQrCode(user.email || user.username || user.name, secret);
    res.json({
      success: true,
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de la génération du QR Code A2F.' });
  }
});

// Activer l'A2F sur le compte utilisateur
app.post('/api/auth/2fa/enable', (req, res) => {
  const { userId, secret, code, method = 'both' } = req.body;
  const user = dbManager.getUserById(userId) || dbManager.getUserByUsernameOrEmail(userId);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  if (method === 'totp' || method === 'both') {
    const targetSecret = secret || user.twoFactorSecret;
    if (!targetSecret) {
      return res.status(400).json({ error: 'Clé secrète A2F manquante.' });
    }
    if (!code || !verifyTotpCode(targetSecret, String(code))) {
      return res.status(400).json({
        error: 'Code à 6 chiffres invalide. Ouvrez votre application Authenticator, scannez le QR code et saisissez le code actuel.',
      });
    }
    user.twoFactorSecret = targetSecret;
  }

  user.twoFactorEnabled = true;
  user.twoFactorMethod = method;
  const updated = dbManager.updateUser(user);
  res.json({
    success: true,
    user: updated,
    message: 'Authentification à deux facteurs (A2F) activée avec succès !',
  });
});

// Désactiver l'A2F sur le compte utilisateur
app.post('/api/auth/2fa/disable', (req, res) => {
  const { userId } = req.body;
  const user = dbManager.getUserById(userId) || dbManager.getUserByUsernameOrEmail(userId);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }
  user.twoFactorEnabled = false;
  const updated = dbManager.updateUser(user);
  res.json({
    success: true,
    user: updated,
    message: 'Authentification à deux facteurs (A2F) désactivée.',
  });
});

// Mot de passe oublié - Demande de code de vérification à 6 chiffres
app.post('/api/auth/forgot-password', authRateLimiter, async (req, res) => {
  const { identifier } = req.body;
  if (!identifier || !identifier.trim()) {
    return res.status(400).json({ error: 'Veuillez saisir votre courriel ou nom d\'utilisateur' });
  }

  const result = dbManager.requestPasswordReset(identifier.trim());
  if (!result.success) {
    return res.status(404).json({ error: result.message });
  }

  // Envoi effectif du courriel avec le code de vérification
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : '');
  const resetLink = result.token ? `${origin}/?reset_token=${result.token}&email=${encodeURIComponent(result.email || '')}` : undefined;

  let emailDeliveredViaSmtp = false;
  try {
    const emailStatus = getEmailConfigStatus();
    const emailRes = await sendPasswordResetVerificationEmail({
      recipientEmail: result.email!,
      userName: result.userName || 'Collaborateur',
      verificationCode: result.code!,
      resetLink,
    });
    emailDeliveredViaSmtp = Boolean(emailStatus?.noreply?.smtpConfigured && emailRes?.success);
  } catch (emailErr) {
    console.error('[Forgot Password Email Error]:', emailErr);
  }

  res.json({
    success: true,
    message: emailDeliveredViaSmtp
      ? `Un code de vérification à 6 chiffres a été envoyé par courriel à ${result.email}.`
      : `Code de vérification généré pour ${result.email} : ${result.code} (Mode direct actif car serveur SMTP non configuré).`,
    email: result.email,
    userName: result.userName,
    emailDeliveredViaSmtp,
    fallbackCode: !emailDeliveredViaSmtp ? result.code : undefined,
    resetToken: result.token,
  });
});

// Vérification du code à 6 chiffres saisi par l'utilisateur
app.post('/api/auth/verify-reset-code', authRateLimiter, (req, res) => {
  const { identifier, code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Code de vérification à 6 chiffres requis' });
  }
  const result = dbManager.verifyPasswordResetCode(identifier || '', code);
  if (!result.success || !result.valid) {
    return res.status(400).json({ error: result.message });
  }
  res.json(result);
});

// Validation d'un jeton direct reçu par courriel ou généré par l'admin
app.get('/api/auth/verify-reset-token', (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    return res.status(400).json({ valid: false, error: 'Jeton de réinitialisation requis' });
  }
  const result = dbManager.verifyPasswordResetToken(token);
  if (!result.valid) {
    return res.status(400).json({ valid: false, error: 'Ce lien de réinitialisation est expiré ou invalide.' });
  }
  res.json({ valid: true, email: result.email, user: result.user });
});

// Réinitialisation finale du mot de passe avec le code ou jeton
app.post('/api/auth/reset-password', authRateLimiter, (req, res) => {
  const { identifier, newPassword, code, token } = req.body;
  if ((!identifier && !code && !token) || !newPassword) {
    return res.status(400).json({ error: 'Identifiant/jeton et nouveau mot de passe requis' });
  }
  const verificationParam = token || code;
  const result = dbManager.resetPassword(identifier || '', newPassword, verificationParam);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json(result);
});

// Endpoint Admin: Envoyer manuellement un lien de réinitialisation de mot de passe à un utilisateur
app.post('/api/admin/users/:id/send-reset-link', async (req, res) => {
  const { id } = req.params;
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : '');
  const result = dbManager.generateAdminResetLink(id, origin);
  if (!result.success || !result.user) {
    return res.status(404).json({ error: result.message || 'Utilisateur introuvable.' });
  }

  const shouldSendEmail = req.body.sendEmail !== false;
  let emailSent = false;

  if (shouldSendEmail && result.user.email && result.code) {
    try {
      await sendPasswordResetVerificationEmail({
        recipientEmail: result.user.email,
        userName: result.user.name,
        verificationCode: result.code,
        resetLink: result.resetUrl,
      });
      emailSent = true;
    } catch (err) {
      console.error('[Admin Manual Reset Email Error]:', err);
    }
  }

  res.json({
    success: true,
    message: emailSent
      ? `Lien et code de réinitialisation envoyés par courriel avec succès à ${result.user.name} (${result.user.email}).`
      : `Lien de réinitialisation généré pour ${result.user.name}.`,
    resetUrl: result.resetUrl,
    code: result.code,
    token: result.token,
    user: result.user,
    emailSent,
  });
});

app.get('/api/users', (req, res) => {
  res.json(dbManager.getUsers());
});

app.put('/api/users/:id', (req, res) => {
  const existing = dbManager.getUserById(req.params.id) || dbManager.getUserByUsernameOrEmail(req.params.id);
  const updatedUser = dbManager.updateUser({
    ...(existing || {}),
    ...req.body,
    id: existing?.id || req.params.id,
    permissions: {
      ...(existing?.permissions || {}),
      ...(req.body.permissions || {}),
    },
  });
  res.json(updatedUser);
});

app.patch('/api/users/:id', (req, res) => {
  const existing = dbManager.getUserById(req.params.id) || dbManager.getUserByUsernameOrEmail(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }
  const updated = dbManager.updateUser({
    ...existing,
    ...req.body,
    id: existing.id,
    permissions: req.body.permissions ? {
      ...existing.permissions,
      ...req.body.permissions,
    } : existing.permissions,
  });
  res.json(updated);
});

// Update specific agent status (disponible / indisponible)
app.patch('/api/users/:id/status', (req, res) => {
  const { status } = req.body;
  if (status !== 'disponible' && status !== 'indisponible') {
    return res.status(400).json({ error: 'Statut invalide. Utilisez "disponible" ou "indisponible".' });
  }
  const updated = dbManager.updateUserStatus(req.params.id, status);
  if (!updated) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }
  res.json({ success: true, user: updated, availability: dbManager.getAgentsAvailability() });
});

// Global Agent Availability Status
app.get('/api/agents/status', (req, res) => {
  res.json(dbManager.getAgentsAvailability());
});

// Batch update all agents status
app.post('/api/agents/batch-status', (req, res) => {
  const { status } = req.body;
  if (status !== 'disponible' && status !== 'indisponible') {
    return res.status(400).json({ error: 'Statut invalide. Utilisez "disponible" ou "indisponible".' });
  }
  const users = dbManager.getUsers();
  users.forEach((u) => {
    dbManager.updateUserStatus(u.id, status);
  });
  res.json({
    success: true,
    status,
    availability: dbManager.getAgentsAvailability(),
    users: dbManager.getUsers(),
  });
});

app.delete('/api/users/:id', (req, res) => {
  const ok = dbManager.deleteUser(req.params.id);
  res.json({ success: ok });
});

app.post('/api/users', (req, res) => {
  const created = dbManager.addUser(req.body);
  res.status(201).json(created);
});

// 2.1 System Roles Management (Rôles & Permissions Système)
app.get('/api/system-roles', (req, res) => {
  res.json(dbManager.getSystemRoles());
});

app.post('/api/system-roles', (req, res) => {
  const role = dbManager.addSystemRole(req.body);
  res.status(201).json(role);
});

app.put('/api/system-roles/:id', (req, res) => {
  const updatedData = { ...req.body, id: req.params.id };
  const role = dbManager.updateSystemRole(updatedData);

  // If syncUsers flag is provided, also synchronize existing users with this role
  let syncedUsersCount = 0;
  if (req.body.syncUsers && role.permissions) {
    const users = dbManager.getUsers();
    users.forEach((u) => {
      if (u.role === role.roleKey) {
        dbManager.updateUser({
          ...u,
          permissions: { ...role.permissions },
        });
        syncedUsersCount++;
      }
    });
  }

  res.json({ role, syncedUsersCount });
});

app.post('/api/system-roles/:id/sync-users', (req, res) => {
  const roles = dbManager.getSystemRoles();
  const role = roles.find((r) => r.id === req.params.id);
  if (!role) {
    return res.status(404).json({ error: 'Rôle introuvable' });
  }
  let count = 0;
  const users = dbManager.getUsers();
  users.forEach((u) => {
    if (u.role === role.roleKey) {
      dbManager.updateUser({
        ...u,
        permissions: { ...role.permissions },
      });
      count++;
    }
  });
  res.json({ success: true, count });
});

app.delete('/api/system-roles/:id', (req, res) => {
  const ok = dbManager.deleteSystemRole(req.params.id);
  res.json({ success: ok });
});

// Configure or change default admin account credentials
app.post('/api/admin/default-credentials', (req, res) => {
  const { username, email, password, name } = req.body;
  const users = dbManager.getUsers();
  let admin = users.find((u) => u.id === 'usr_sysadmin') || users.find((u) => u.role === 'super_admin');
  if (!admin) {
    admin = users[0];
  }
  if (!admin) {
    return res.status(404).json({ error: 'Aucun compte administrateur trouvé.' });
  }

  const updatedAdmin = dbManager.updateUser({
    ...admin,
    username: username && username.trim() ? username.trim() : admin.username,
    email: email && email.trim() ? email.trim() : admin.email,
    name: name && name.trim() ? name.trim() : admin.name,
    password: password && password.trim() ? password.trim() : admin.password,
  });

  console.log(`[Admin Security] Identifiants admin mis à jour : username=${updatedAdmin?.username}, email=${updatedAdmin?.email}`);

  res.json({
    success: true,
    message: 'Identifiants du compte administrateur mis à jour avec succès.',
    user: updatedAdmin,
  });
});

// 3. Chatbot Settings (Martine V.)
app.get('/api/chatbot/settings', (req, res) => {
  res.json(dbManager.getChatbotSettings());
});

app.post('/api/chatbot/settings', (req, res) => {
  const updated = dbManager.updateChatbotSettings(req.body);
  res.json(updated);
});

// 3.1 Chatbot AI Engine Status (Martine V. powered by Google Gemini)
app.get('/api/chatbot/ai-status', (req, res) => {
  const status = getOpenAIStatus();
  res.json({
    provider: 'gemini',
    ...status,
  });
});

app.post('/api/chatbot/test-openai', async (req, res) => {
  try {
    const result = await testOpenAIConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      status: 'error',
      message: err.message || 'Erreur lors du test Gemini',
    });
  }
});

// 4. Chatbot Conversations & Messages
app.get('/api/chatbot/conversations', (req, res) => {
  res.json(dbManager.getConversations());
});

app.get('/api/chatbot/conversations/:id', (req, res) => {
  let conv = dbManager.getConversationById(req.params.id);
  if (!conv) {
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '142.112.98.45';
    const cleanIp = String(rawIp).replace('::ffff:', '').trim();
    conv = dbManager.createOrGetConversation(req.params.id, undefined, undefined, undefined, cleanIp);
  }
  res.json(conv);
});

app.post('/api/chatbot/conversations', (req, res) => {
  const { id, visitorName, visitorEmail, visitorPhone, visitorIp } = req.body;
  const rawIp = visitorIp || (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '142.112.98.45';
  const cleanIp = String(rawIp).replace('::ffff:', '').trim();
  const conv = dbManager.createOrGetConversation(id, visitorName, visitorEmail, visitorPhone, cleanIp);
  res.json(conv);
});

// Admin blocks / unblocks an IP
app.post('/api/chatbot/block-ip', (req, res) => {
  const { ip, blocked, reason } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'Adresse IP requise' });
  }
  const result = dbManager.blockIp(ip, Boolean(blocked), reason);
  res.json(result);
});

// Get all blocked IPs
app.get('/api/chatbot/blocked-ips', (req, res) => {
  const settings = dbManager.getChatbotSettings();
  res.json({
    blockedIps: settings.blockedIps || [],
    blockedIpReasons: settings.blockedIpReasons || {},
  });
});

// Update conversation status or flags (archived, botEnabledForConv, status)
app.patch('/api/chatbot/conversations/:id/status', (req, res) => {
  const { status, botEnabledForConv, archived } = req.body;
  const updates: any = {};
  if (status !== undefined) updates.status = status;
  if (botEnabledForConv !== undefined) updates.botEnabledForConv = botEnabledForConv;
  if (archived !== undefined) updates.archived = archived;
  const updated = dbManager.updateConversation(req.params.id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Conversation non trouvée' });
  }
  res.json(updated);
});

app.patch('/api/chatbot/conversations/:id', (req, res) => {
  const updated = dbManager.updateConversation(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Conversation non trouvée' });
  }
  res.json(updated);
});

// Delete conversation
app.delete('/api/chatbot/conversations/:id', (req, res) => {
  const success = dbManager.deleteConversation(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Conversation non trouvée' });
  }
  res.json({ success: true, id: req.params.id });
});

// Agent joins a conversation (notifies the visitor)
app.post('/api/chatbot/agent-join', (req, res) => {
  const { conversationId, agentId } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'Identifiant de conversation requis' });
  }
  const user = agentId ? dbManager.getUserById(agentId) : null;
  const agentInfo = {
    id: user?.id,
    name: user ? user.name : 'Conseiller Évasion Soleil',
    grade: user ? user.grade : 'Conseiller Voyages',
    tag: user?.specialTagEnabled ? (user?.specialTags?.[0] || user?.specialTag) : undefined,
    avatar: user?.avatar,
  };
  const result = dbManager.agentJoinConversation(conversationId, agentInfo);
  res.json(result);
});

// Agent leaves a conversation (reactivates Martine V. automatically)
app.post('/api/chatbot/agent-leave', (req, res) => {
  const { conversationId, agentName } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'Identifiant de conversation requis' });
  }
  const result = dbManager.agentLeaveConversation(conversationId, agentName);
  res.json(result);
});

// Direct visitor request to speak with a human agent
app.post('/api/chatbot/request-agent', async (req, res) => {
  try {
    const { conversationId, visitorName, visitorPhone, visitorEmail, note } = req.body;
    if (!conversationId) {
      return res.status(400).json({ error: 'Identifiant de conversation requis' });
    }
    const conv = dbManager.createOrGetConversation(conversationId, visitorName, visitorEmail, visitorPhone);

    if (visitorName && visitorName.trim()) conv.visitorName = visitorName.trim();
    if (visitorPhone && visitorPhone.trim()) conv.visitorPhone = visitorPhone.trim();
    if (visitorEmail && visitorEmail.trim()) conv.visitorEmail = visitorEmail.trim();

    conv.status = 'waiting_agent';
    conv.waitingSince = new Date().toISOString();
    conv.unreadAgent = true;

    const userText = note?.trim() || `Bonjour, je souhaite parler en direct avec un conseiller de l'équipe Évasion Soleil.`;

    // Add visitor's request message
    const visitorMsg = dbManager.addChatMessage(conv.id, {
      sender: 'visitor',
      senderName: conv.visitorName || 'Visiteur',
      text: userText,
    });

    const settings = dbManager.getChatbotSettings();
    const confirmText = `Parfait ${conv.visitorName || ''} ! Vos coordonnées (téléphone : ${conv.visitorPhone || 'N/A'}) ont bien été transmises à notre équipe. Un conseiller va vous assister dans un instant...`;
    
    const botMsg = dbManager.addChatMessage(conv.id, {
      sender: 'bot',
      senderName: settings.botName,
      senderTag: settings.botTag,
      text: confirmText,
      isAgentHandoff: true,
      visitorInfo: {
        name: conv.visitorName,
        phone: conv.visitorPhone,
        email: conv.visitorEmail,
      },
    });

    sendMartineConversationEmail({
      visitorName: conv.visitorName || 'Visiteur Évasion Soleil',
      visitorPhone: conv.visitorPhone,
      visitorEmail: conv.visitorEmail,
      conversationId: conv.id,
      messages: conv.messages,
    }).catch((err) => console.error('[Erreur Envoi Email Martine Transfert Direct]:', err));

    res.json({
      success: true,
      conversation: conv,
      visitorMessage: visitorMsg,
      botMessage: botMsg,
    });
  } catch (err) {
    console.error('Error in request-agent:', err);
    res.status(500).json({ error: 'Erreur lors de la demande d\'agent' });
  }
});

// Timeout intervention: Martine intervenes if visitor waits too long
app.post('/api/chatbot/timeout-help', (req, res) => {
  const { conversationId } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'Identifiant de conversation requis' });
  }
  const msg = dbManager.triggerTimeoutIntervention(conversationId);
  res.json({ success: true, message: msg });
});

// Visitor requests a callback
app.post('/api/chatbot/request-callback', (req, res) => {
  const { conversationId, phone } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'Identifiant de conversation requis' });
  }
  const updated = dbManager.requestCallback(conversationId, phone);
  res.json(updated);
});

// Visitor sends message to Chatbot
app.post('/api/chatbot/message', async (req, res) => {
  try {
    const { conversationId, text, visitorName, visitorEmail, visitorPhone, clientIp } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Texte requis' });
    }

    const rawIp = clientIp || (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '142.112.98.45';
    const visitorIp = String(rawIp).replace('::ffff:', '').trim();

    // Check if IP is blocked by admin
    if (dbManager.isIpBlocked(visitorIp)) {
      const banReason = dbManager.getIpBlockReason(visitorIp);
      return res.status(403).json({
        error: `Accès restreint (Bannissement IP). Raison : ${banReason}. Pour toute demande, veuillez contacter le service TI à it@evasionsoleil.com ou par téléphone au 438-373-7076.`,
        isBlocked: true,
        blockReason: banReason,
      });
    }

    const conv = dbManager.createOrGetConversation(conversationId, visitorName, visitorEmail, visitorPhone, visitorIp);

    if (conv.isBlocked) {
      const banReason = conv.blockReason || dbManager.getIpBlockReason(conv.visitorIp);
      return res.status(403).json({
        error: `Accès restreint (Bannissement IP). Raison : ${banReason}. Pour toute demande, veuillez contacter le service TI à it@evasionsoleil.com ou par téléphone au 438-373-7076.`,
        isBlocked: true,
        blockReason: banReason,
      });
    }

    // Save visitor message
    const visitorMsg = dbManager.addChatMessage(
      conv.id,
      {
        sender: 'visitor',
        senderName: conv.visitorName || 'Visiteur',
        text: text.trim(),
      },
      visitorIp
    );

    // CRITICAL: Quand un conseiller a rejoint la conversation OU que Martine est désactivée pour cette conversation :
    // Martine se désactive automatiquement et ne génère AUCUNE réponse !
    if (conv.agentJoined || conv.botEnabledForConv === false) {
      conv.unreadAgent = true;
      conv.updatedAt = new Date().toISOString();
      dbManager.saveToJson();

      return res.json({
        visitorMessage: visitorMsg,
        botMessage: null,
        agentActive: true,
        isAgentHandoff: false,
        requiresContactInfo: false,
        isReservationRedirect: false,
        conversation: conv,
      });
    }

    // Generate Martine V. response
    const botResult = await generateMartineResponse(
      text,
      conv.messages.map((m) => ({ sender: m.sender, text: m.text }))
    );

    const settings = dbManager.getChatbotSettings();

    // STRICT USER REQUIREMENT:
    // "Dans la page de chat bot je veux que au MINIMUM avent de le voir la personne a donner sont nom et numero de téléphone avent que martine dit que elle transfert vers un membre de l'équipe"
    const phonePattern = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const phoneMatch = text.match(phonePattern);
    const extractedPhone = phoneMatch ? phoneMatch[0] : undefined;

    const lastBotMsg = conv.messages.slice().reverse().find((m) => m.sender === 'bot');
    const wasWaitingForContact = Boolean(
      lastBotMsg && (lastBotMsg.text.includes('Nom complet') || lastBotMsg.text.includes('coordonnées') || lastBotMsg.text.includes('numéro de téléphone'))
    );

    let effectiveName = visitorName || (conv.visitorName && conv.visitorName !== 'Visiteur' ? conv.visitorName : undefined) || botResult.visitorInfoDetected?.name;
    let effectivePhone = visitorPhone || conv.visitorPhone || extractedPhone || botResult.visitorInfoDetected?.phone;

    if (!effectiveName && wasWaitingForContact) {
      const cleanName = text.replace(phonePattern, '').replace(/[\r\n,;]/g, ' ').replace(/mon nom est|je m'appelle|moi c'est|nom\s*:/gi, '').trim();
      if (cleanName.length >= 2 && cleanName.length <= 40) {
        effectiveName = cleanName;
      }
    }

    let finalIsAgentHandoff = botResult.isAgentHandoff || (wasWaitingForContact && Boolean(effectiveName && effectivePhone));
    let finalReplyText = botResult.replyText;
    let requiresContactInfo = false;

    if (finalIsAgentHandoff) {
      const hasName = Boolean(effectiveName && effectiveName.trim() !== '' && effectiveName !== 'Visiteur');
      const hasPhone = Boolean(effectivePhone && effectivePhone.trim() !== '');

      if (!hasName || !hasPhone) {
        // CANNOT handoff yet: Martine asks strictly for both Name and Phone
        finalIsAgentHandoff = false;
        requiresContactInfo = true;
        conv.status = 'active';
        finalReplyText = "Avec grand plaisir ! Pour que je puisse vous transférer en direct à un conseiller de notre équipe, veuillez m'indiquer au minimum votre **Nom complet** et votre **Numéro de téléphone** :";
      } else {
        // Name & Phone confirmed!
        conv.visitorName = effectiveName!;
        conv.visitorPhone = effectivePhone!;
        conv.status = 'waiting_agent';
        conv.waitingSince = new Date().toISOString();
        finalReplyText = `Parfait ${effectiveName} ! Vos coordonnées (téléphone : ${effectivePhone}) ont bien été enregistrées. Je transfère votre discussion immédiatement à un membre de l'équipe Évasion Soleil. Veuillez patienter un court instant...`;
      }
    }

    const activeQuickOptions = (settings.quickReplyOptions && settings.quickReplyOptions.length > 0)
      ? settings.quickReplyOptions
      : ['Faire une soumission', 'Forfaits tout-inclus 5★', 'Croisières Caraïbes', 'Parler à un conseiller'];

    const mergedSuggestedTags = Array.from(
      new Set([...(botResult.suggestedTags || []), ...activeQuickOptions])
    ).slice(0, 5);

    // Save Bot response
    const botMsg = dbManager.addChatMessage(conv.id, {
      sender: 'bot',
      senderName: settings.botName,
      senderTag: settings.botTag,
      text: finalReplyText,
      isAgentHandoff: finalIsAgentHandoff,
      suggestedTags: mergedSuggestedTags,
      visitorInfo: {
        name: effectiveName,
        email: visitorEmail || conv.visitorEmail || botResult.visitorInfoDetected?.email,
        phone: effectivePhone,
      },
    });

    if (finalIsAgentHandoff) {
      console.log(`[Email Dispatch Martine] Envoi automatique de courriel depuis martine@evasionsoleil.com pour ${conv.visitorName || 'Visiteur'} (Tél: ${conv.visitorPhone || 'N/A'})`);
      sendMartineConversationEmail({
        visitorName: effectiveName || conv.visitorName || 'Visiteur Évasion Soleil',
        visitorPhone: effectivePhone || conv.visitorPhone,
        visitorEmail: visitorEmail || conv.visitorEmail || botResult.visitorInfoDetected?.email,
        conversationId: conv.id,
        messages: conv.messages,
      }).catch((err) => console.error('[Erreur Envoi Email Martine]:', err));
    }

    res.json({
      visitorMessage: visitorMsg,
      botMessage: botMsg,
      isAgentHandoff: finalIsAgentHandoff,
      requiresContactInfo,
      isReservationRedirect: botResult.isReservationRedirect,
      suggestedTags: botResult.suggestedTags || [],
      conversation: conv,
    });
  } catch (err: any) {
    console.error('Error handling chat message:', err);
    res.status(500).json({ error: 'Erreur lors du traitement du message' });
  }
});

// Agent sends reply to visitor
app.post('/api/chatbot/agent-reply', (req, res) => {
  const { conversationId, text, agentId, showAdminTags, activeTags } = req.body;
  const user = agentId ? dbManager.getUserById(agentId) : null;
  const settings = dbManager.getChatbotSettings();

  const senderName = user ? user.name : 'Conseiller Évasion Soleil';
  const senderGrade = user ? user.grade : 'Conseiller Voyages';
  
  let userTags: string[] = [];
  if (Array.isArray(activeTags)) {
    userTags = activeTags;
  } else if (showAdminTags !== false && settings.showAgentTags && user?.specialTagEnabled) {
    userTags = user?.specialTags && user.specialTags.length > 0
      ? user.specialTags
      : ([user?.specialTag].filter(Boolean) as string[]);
  }

  const msg = dbManager.addChatMessage(conversationId, {
    sender: 'agent',
    senderName,
    senderGrade,
    senderAvatar: user?.avatar,
    senderTag: userTags[0],
    senderTags: userTags,
    text: text.trim(),
  });

  // Also mark conversation as resolved from waiting_agent
  const conv = dbManager.getConversationById(conversationId);
  if (conv && conv.status === 'waiting_agent') {
    conv.status = 'active';
  }

  res.json(msg);
});

// Explicitly send or re-send Martine discussion transcript to visitor and info@evasionsoleil.com
app.post('/api/chatbot/send-transcript', async (req, res) => {
  const { conversationId, visitorEmail, visitorPhone, visitorName } = req.body;
  const conv = dbManager.getConversationById(conversationId);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation non trouvée' });
  }

  try {
    const result = await sendMartineConversationEmail({
      visitorName: visitorName || conv.visitorName || 'Visiteur Évasion Soleil',
      visitorPhone: visitorPhone || conv.visitorPhone,
      visitorEmail: visitorEmail || conv.visitorEmail,
      conversationId: conv.id,
      messages: conv.messages,
    });
    res.json({
      success: true,
      message: 'Transcription envoyée avec succès à info@evasionsoleil.com et au client.',
      result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de l\'envoi du courriel' });
  }
});

// 5. Form Config (Interactive Quote Form)
app.get('/api/form/config', (req, res) => {
  res.json(dbManager.getFormConfig());
});

app.post('/api/form/config', (req, res) => {
  const updated = dbManager.updateFormConfig(req.body);
  res.json(updated);
});

// 6. Submissions & Quotes
app.get('/api/submissions', (req, res) => {
  const { callStatus } = req.query;
  const submissions = dbManager.getSubmissions(callStatus as string);
  res.json(submissions);
});

app.post('/api/submissions', async (req, res) => {
  try {
    const data = { ...req.body };

    // Strip HTML tags for sensitive data safety
    const sanitize = (val: any) => (typeof val === 'string' ? val.replace(/<[^>]*>?/gm, '').trim() : val);
    if (data.customerFirstName) data.customerFirstName = sanitize(data.customerFirstName);
    if (data.customerLastName) data.customerLastName = sanitize(data.customerLastName);
    if (data.customerEmail) data.customerEmail = sanitize(data.customerEmail);
    if (data.customerNotes) data.customerNotes = sanitize(data.customerNotes);

    // Validate phone number: strictly 10 digits
    if (data.customerPhone) {
      const phoneDigits = String(data.customerPhone).replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        return res.status(400).json({ error: 'Le numéro de téléphone doit comporter exactement 10 chiffres (ex: 514 555-0123).' });
      }
    }

    // Validate adults count: maximum 20
    if (data.adultsCount !== undefined) {
      const numAdults = Number(data.adultsCount);
      if (numAdults > 20) {
        data.adultsCount = 20;
      }
    }

    const submission = dbManager.createSubmission(data);
    const formConfig = dbManager.getFormConfig();

    // Send automatic email confirmation to customer (from no-reply) and notification to agency
    console.log(`[Email Notification] Traitement accusé de réception pour : ${submission.customerEmail}`);
    sendSubmissionEmails(submission).catch((err) => {
      console.error('[Email Notification Error]:', err);
    });

    res.status(201).json(submission);
  } catch (err: any) {
    console.error('Error creating submission:', err);
    res.status(500).json({ error: 'Erreur lors de la création de la soumission' });
  }
});

app.patch('/api/submissions/:id/assign', (req, res) => {
  const { id } = req.params;
  const { assignedToUserId, assignedToUserName, note, callerRole, callerPermissions } = req.body;

  const existingSub = dbManager.getSubmissionById(id);
  if (!existingSub) {
    return res.status(404).json({ error: 'Soumission non trouvée' });
  }

  // Règle de verrouillage : Quand un voyage est mis "reserve", le conseiller ne peut plus se retirer
  // sauf si l'administrateur système le fait (ou utilisateur avec canUnassignBooked)
  if (existingSub.callStatus === 'reserve' && existingSub.assignedToUserId) {
    const isChangingOrUnassigning = !assignedToUserId || assignedToUserId !== existingSub.assignedToUserId;
    if (isChangingOrUnassigning) {
      const isSysAdmin = callerRole === 'super_admin' || Boolean(callerPermissions?.canUnassignBooked);
      if (!isSysAdmin) {
        return res.status(403).json({
          error: 'Action bloquée : Ce dossier voyage est au statut "Réservé". Le conseiller assigné est verrouillé et ne peut plus se retirer sans l\'intervention du System Administrateur.',
        });
      }
    }
  }

  const updated = dbManager.assignSubmission(id, assignedToUserId, assignedToUserName, note);
  if (!updated) {
    return res.status(404).json({ error: 'Soumission non trouvée' });
  }
  res.json(updated);
});

app.patch('/api/submissions/:id/status', (req, res) => {
  const { id } = req.params;
  const targetStatus = req.body.status || req.body.callStatus;
  const targetNote = req.body.note || req.body.agentNote;
  const callerUserId = req.body.userId;
  const callerUserName = req.body.userName;

  if (!targetStatus) {
    return res.status(400).json({ error: 'Statut manquant' });
  }

  const existingSub = dbManager.getSubmissionById(id);
  if (!existingSub) {
    return res.status(404).json({ error: 'Soumission non trouvée' });
  }

  // Restreindre la modification du statut d'appel uniquement au Responsable du dossier
  if (callerUserId || callerUserName) {
    const isOwner =
      (callerUserId && existingSub.assignedToUserId && callerUserId === existingSub.assignedToUserId) ||
      (callerUserName &&
        existingSub.assignedToUserName &&
        callerUserName.trim().toLowerCase() === existingSub.assignedToUserName.trim().toLowerCase());

    if (!isOwner) {
      return res.status(403).json({
        error: `Action non autorisée : Seul le Responsable du dossier (${existingSub.assignedToUserName || 'assigné'}) peut modifier le statut d'appel.`,
      });
    }
  }

  const updated = dbManager.updateSubmissionStatus(id, targetStatus as CallStatus, targetNote);
  if (!updated) {
    return res.status(404).json({ error: 'Soumission non trouvée' });
  }
  res.json(updated);
});

app.patch('/api/submissions/:id/tags', (req, res) => {
  const { id } = req.params;
  const { tags } = req.body;
  const updated = dbManager.updateSubmissionTags(id, Array.isArray(tags) ? tags : []);
  if (!updated) {
    return res.status(404).json({ error: 'Soumission non trouvée' });
  }
  res.json(updated);
});

app.post('/api/submissions/:id/notes', (req, res) => {
  const { id } = req.params;
  const { authorName, authorGrade, text } = req.body;
  const updated = dbManager.addSubmissionNote(id, authorName, authorGrade, text);
  if (!updated) {
    return res.status(404).json({ error: 'Soumission non trouvée' });
  }
  res.json(updated);
});

// Envoi officiel de propositions de soumission au client et archivage obligatoire à info@evasionsoleil.com
app.post('/api/submissions/:id/send-proposals', async (req, res) => {
  const { id } = req.params;
  const {
    advisorUserId,
    advisorName,
    advisorRole,
    advisorEmail,
    advisorPhone,
    advisorMessage,
    proposals,
    callerRole,
    callerUsername,
  } = req.body;

  const sub = dbManager.getSubmissions().find((s) => s.id === id);
  if (!sub) {
    return res.status(404).json({ error: 'Soumission non trouvée' });
  }

  const effectiveCallerUserId = (req.headers['x-user-id'] as string) || advisorUserId;

  // RÈGLE STRICTE: Seul le responsable du dossier peut envoyer une soumission à ce client
  if (!sub.assignedToUserId && !sub.assignedToUserName) {
    return res.status(403).json({
      error: "Action verrouillée : Ce dossier n'a pas encore de responsable. Veuillez d'abord prendre en charge le dossier avant d'envoyer une soumission.",
    });
  }

  const isResponsibleAdvisor =
    (sub.assignedToUserId && effectiveCallerUserId && sub.assignedToUserId === effectiveCallerUserId) ||
    (sub.assignedToUserName &&
      advisorName &&
      sub.assignedToUserName.trim().toLowerCase() === String(advisorName).trim().toLowerCase());

  if (!isResponsibleAdvisor) {
    return res.status(403).json({
      error: `Action verrouillée : Ce dossier appartient à ${sub.assignedToUserName || 'un autre conseiller'}. Seul le responsable du dossier peut envoyer une soumission.`,
    });
  }

  // Archivage obligatoire à info@evasionsoleil.com
  const agencyEmail = 'info@evasionsoleil.com';
  const immutablePriceDisclaimer =
    "Les prix et disponibilités indiqués dans cette soumission sont valables uniquement au moment précis de l'envoi. Sans réservation confirmée et paiement effectué auprès des voyagistes ou transporteurs, les tarifs demeurent assujettis aux variations du marché en temps réel et peuvent augmenter ou réduire sans préavis.";

  const payload = {
    submissionId: id,
    customerEmail: sub.customerEmail,
    agencyEmail,
    advisorMessage: advisorMessage || '',
    advisorName: advisorName || 'Conseiller Voyages Évasion Soleil',
    advisorRole: advisorRole || 'Conseiller(ère) en voyages certifié(e)',
    advisorEmail: advisorEmail || 'info@evasionsoleil.com',
    advisorPhone: advisorPhone || '438-373-7076',
    priceDisclaimer: immutablePriceDisclaimer,
    proposals: Array.isArray(proposals) ? proposals : [],
  };

  try {
    const emailResult = await sendSubmissionProposalsEmail(sub, payload);
    const updated = dbManager.recordSubmissionProposals(
      id,
      payload.proposals,
      payload.advisorName,
      sub.customerEmail
    );

    res.json({
      success: true,
      submission: updated,
      emailResult,
      sentTo: {
        customer: sub.customerEmail,
        agencyArchive: agencyEmail,
        advisorCc: advisorEmail,
      },
    });
  } catch (err: any) {
    console.error('Erreur lors de l\'envoi des propositions:', err);
    res.status(500).json({ error: 'Erreur lors de l\'envoi des propositions : ' + err.message });
  }
});

// Enregistrer ou modifier le choix de l'option de soumission retenue par le client
app.post('/api/submissions/:id/select-proposal', (req, res) => {
  const { id } = req.params;
  const { proposalId, chosenBy, notes, autoSetReserved } = req.body;

  const sub = dbManager.getSubmissions().find((s) => s.id === id);
  if (!sub) {
    return res.status(404).json({ error: 'Soumission non trouvée' });
  }

  const updated = dbManager.selectSubmissionProposal(
    id,
    proposalId || null,
    chosenBy || 'Conseiller Voyages',
    notes,
    Boolean(autoSetReserved)
  );

  if (!updated) {
    return res.status(400).json({ error: 'Impossible de consigner le choix d\'option' });
  }

  res.json({
    success: true,
    submission: updated,
  });
});

app.delete('/api/submissions/:id', (req, res) => {
  const { id } = req.params;
  const callerRole = (req.headers['x-user-role'] as string) || (req.query.role as string) || (req.body?.role as string);
  const callerUsername = (req.headers['x-user-username'] as string) || (req.query.username as string);

  const isSysAdmin = callerRole === 'super_admin' || (typeof callerUsername === 'string' && callerUsername.toLowerCase() === 'admin');

  if (callerRole && !isSysAdmin) {
    return res.status(403).json({
      error: 'Action non autorisée : Seul le System Administrateur (super_admin) est autorisé à supprimer définitivement une soumission.',
    });
  }

  const ok = dbManager.deleteSubmission(id);
  res.json({ success: ok });
});

// 6.1 Facturation & Liens de Paiement Stripe (Espace CRM)
app.get('/api/invoices', (req, res) => {
  const { clientKey } = req.query;
  res.json(dbManager.getInvoices(clientKey as string));
});

app.get('/api/invoices/catalog', (req, res) => {
  res.json(dbManager.getInvoiceCatalog());
});

app.get('/api/invoices/:id', (req, res) => {
  const inv = dbManager.getInvoiceById(req.params.id);
  if (!inv) {
    return res.status(404).json({ error: 'Facture non trouvée' });
  }
  res.json(inv);
});

app.post('/api/invoices', (req, res) => {
  try {
    const inv = dbManager.saveInvoice(req.body);
    res.status(201).json(inv);
  } catch (err: any) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ error: err.message || 'Erreur lors de la création de la facture' });
  }
});

app.patch('/api/invoices/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, paidAt, paymentMethod } = req.body;
  const updated = dbManager.updateInvoiceStatus(id, status, { paidAt, paymentMethod });
  if (!updated) {
    return res.status(404).json({ error: 'Facture non trouvée' });
  }
  res.json(updated);
});

app.post('/api/invoices/:id/send-stripe-link', async (req, res) => {
  try {
    const { id } = req.params;
    const inv = dbManager.getInvoiceById(id);
    if (!inv) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const { advisorName, advisorEmail } = req.body;
    const result = await sendInvoicePaymentEmail(inv, advisorName, advisorEmail);

    if (result.success) {
      inv.lastEmailSentAt = new Date().toISOString();
      dbManager.saveToJson();
      res.json({
        success: true,
        message: `Facture ${inv.invoiceNumber} et lien Stripe transmis avec succès à ${inv.clientEmail} !`,
        simulated: result.simulated,
        invoice: inv,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Erreur lors de l\'envoi du courriel de facture',
      });
    }
  } catch (err: any) {
    console.error('Error sending invoice email:', err);
    res.status(500).json({ error: err.message || 'Erreur interne' });
  }
});

app.delete('/api/invoices/:id', (req, res) => {
  const { id } = req.params;
  const ok = dbManager.deleteInvoice(id);
  res.json({ success: ok });
});

app.patch('/api/invoices/:id/verify-identity', (req, res) => {
  const { id } = req.params;
  const { status, documentUrl } = req.body;
  const updated = dbManager.updateInvoiceIdentityVerification(id, status, documentUrl);
  if (!updated) {
    return res.status(404).json({ error: 'Facture non trouvée' });
  }
  res.json({ success: true, invoice: updated });
});

// 6.2 Documents Légaux & Signatures Électroniques (CRM)
app.get('/api/documents', (req, res) => {
  const { clientKey } = req.query;
  res.json(dbManager.getLegalDocuments(clientKey as string));
});

app.get('/api/documents/templates', (req, res) => {
  res.json(dbManager.getLegalDocumentTemplates());
});

app.post('/api/documents/templates', (req, res) => {
  try {
    const { title, bodyTemplate } = req.body || {};
    if (!title || !bodyTemplate) {
      return res.status(400).json({ error: 'Le titre et le contenu du modèle PDF sont requis.' });
    }
    const saved = dbManager.saveLegalDocumentTemplate(req.body);
    res.status(201).json({ success: true, template: saved, templates: dbManager.getLegalDocumentTemplates() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de la sauvegarde du modèle PDF' });
  }
});

app.put('/api/documents/templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const saved = dbManager.saveLegalDocumentTemplate({ ...req.body, id });
    res.json({ success: true, template: saved, templates: dbManager.getLegalDocumentTemplates() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de la mise à jour du modèle PDF' });
  }
});

app.delete('/api/documents/templates/:id', (req, res) => {
  try {
    const ok = dbManager.deleteLegalDocumentTemplate(req.params.id);
    res.json({ success: ok, templates: dbManager.getLegalDocumentTemplates() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de la suppression du modèle PDF' });
  }
});

app.get('/api/documents/settings/lock', (req, res) => {
  res.json({ lockPdfForAdvisors: dbManager.getLockPdfForAdvisors() });
});

app.post('/api/documents/settings/lock', (req, res) => {
  const { lockPdfForAdvisors } = req.body || {};
  const updated = dbManager.setLockPdfForAdvisors(Boolean(lockPdfForAdvisors));
  res.json({ success: true, lockPdfForAdvisors: updated });
});

app.get('/api/documents/:id', (req, res) => {
  const doc = dbManager.getLegalDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document légal non trouvé' });
  }
  res.json(doc);
});

app.post('/api/documents', (req, res) => {
  try {
    const doc = dbManager.saveLegalDocument(req.body);
    res.status(201).json(doc);
  } catch (err: any) {
    console.error('Error creating legal document:', err);
    res.status(500).json({ error: err.message || 'Erreur lors de la création du document' });
  }
});

app.post('/api/documents/:id/upload-chunk', (req, res) => {
  try {
    const { id } = req.params;
    const { chunkData, chunkIndex, isLastChunk } = req.body;
    const doc = dbManager.appendLegalDocumentChunk(
      id,
      String(chunkData || ''),
      Number(chunkIndex || 0),
      Boolean(isLastChunk)
    );
    if (!doc) {
      return res.status(404).json({ error: 'Document non trouvé pour le téléversement du fichier' });
    }
    res.json({ success: true, id: doc.id });
  } catch (err: any) {
    console.error('Error uploading document chunk:', err);
    res.status(500).json({ error: err.message || 'Erreur lors du transfert du fichier' });
  }
});

app.post('/api/documents/:id/send-email', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = dbManager.getLegalDocumentById(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    const { advisorName, advisorEmail, customMessage, appOrigin } = req.body;
    const origin = appOrigin || req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const result = await sendLegalDocumentEmail(doc, advisorName, advisorEmail, customMessage, origin);

    if (result.success) {
      doc.status = 'envoye';
      doc.sentAt = new Date().toISOString();
      if (advisorName) doc.sentByAdvisorName = advisorName;
      dbManager.saveToJson();

      res.json({
        success: true,
        message: `Le document "${doc.title}" avec sa pièce jointe a été envoyé avec succès à ${doc.clientEmail} !`,
        simulated: result.simulated,
        document: doc,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Erreur lors de l\'envoi du courriel avec le document joint',
      });
    }
  } catch (err: any) {
    console.error('Error sending document email:', err);
    res.status(500).json({ error: err.message || 'Erreur interne' });
  }
});

app.post('/api/documents/:id/sign', (req, res) => {
  try {
    const { id } = req.params;
    const { signatureDataUrl, signerName } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '142.112.98.45';

    if (!signatureDataUrl) {
      return res.status(400).json({ error: 'Signature électronique requise' });
    }

    const signedDoc = dbManager.signLegalDocument(id, signatureDataUrl, clientIp, signerName);
    if (!signedDoc) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    res.json({
      success: true,
      message: 'Document signé avec succès !',
      document: signedDoc,
    });
  } catch (err: any) {
    console.error('Error signing document:', err);
    res.status(500).json({ error: err.message || 'Erreur lors de la signature' });
  }
});

app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const ok = dbManager.deleteLegalDocument(id);
  res.json({ success: ok });
});

// 7. Team Chat
app.get(['/api/team-chat', '/api/team-chat/messages'], (req, res) => {
  const { channelId } = req.query;
  res.json(dbManager.getTeamMessages((channelId as string) || 'general'));
});

app.post(['/api/team-chat', '/api/team-chat/messages'], (req, res) => {
  const { channelId, userId, text, attachments } = req.body;
  const user = dbManager.getUserById(userId);

  const userTags = user?.specialTagEnabled
    ? (user?.specialTags && user.specialTags.length > 0 ? user.specialTags : [user?.specialTag].filter(Boolean) as string[])
    : [];

  const newMsg = dbManager.addTeamMessage({
    channelId: channelId || 'general',
    userId: user?.id || 'anonymous',
    userName: user?.name || 'Membre Équipe',
    userGrade: user?.grade || 'Conseiller Voyages',
    userTag: userTags[0],
    userTags: userTags,
    userTagEnabled: user?.specialTagEnabled ?? true,
    text: text ? text.trim() : '',
    attachments: attachments || [],
  });

  res.status(201).json(newMsg);
});

app.delete(['/api/team-chat', '/api/team-chat/messages'], (req, res) => {
  dbManager.clearTeamMessages();
  res.json({ success: true, message: 'Le chat d\'équipe a été réinitialisé à vide avec succès.' });
});

// 7b. CRM Clients Directory
app.get('/api/crm/clients', (req, res) => {
  const { q } = req.query;
  const clients = dbManager.getCrmClients(typeof q === 'string' ? q : '');
  res.json(clients);
});

// Create new client card manually in CRM
app.post('/api/crm/clients', (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ error: 'Prénom, nom, courriel et numéro de téléphone sont requis pour créer une fiche client.' });
    }
    const created = dbManager.addCrmClient(req.body);
    res.status(201).json({ success: true, client: created, message: `Fiche client créée avec succès pour ${created.fullName} !` });
  } catch (err: any) {
    console.error('Error creating CRM client:', err);
    res.status(500).json({ error: err.message || 'Erreur lors de la création de la fiche client.' });
  }
});

// Update client card in CRM
app.put('/api/crm/clients/:id', (req, res) => {
  try {
    const updated = dbManager.updateCrmClient(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Fiche client introuvable.' });
    }
    res.json({ success: true, client: updated, message: 'Fiche client mise à jour avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de la mise à jour.' });
  }
});

// Delete client card in CRM
app.delete('/api/crm/clients/:id', (req, res) => {
  try {
    const ok = dbManager.deleteCrmClient(req.params.id);
    res.json({ success: ok, message: ok ? 'Fiche client supprimée de la base de données.' : 'Fiche client introuvable.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de la suppression.' });
  }
});

app.get('/api/crm/notes', (req, res) => {
  res.json(dbManager.getAllClientNotes());
});

app.post('/api/crm/clients/:clientId/notes', (req, res) => {
  const { clientId } = req.params;
  const { authorName, authorGrade, text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Le texte de la note est requis.' });
  }
  const note = dbManager.addClientNote(
    clientId,
    authorName || 'Conseiller Voyages',
    authorGrade || 'Équipe CRM',
    text
  );
  res.status(201).json(note);
});

app.delete('/api/crm/notes/:noteId', (req, res) => {
  const { noteId } = req.params;
  const ok = dbManager.deleteClientNote(noteId);
  if (!ok) {
    return res.status(404).json({ error: 'Note non trouvée.' });
  }
  res.json({ success: true });
});

app.patch('/api/crm/clients/:clientId/tags', (req, res) => {
  const { clientId } = req.params;
  const { tags } = req.body;
  if (!Array.isArray(tags)) {
    return res.status(400).json({ error: 'Format de tags invalide (tableau requis).' });
  }
  const result = dbManager.updateClientTags(clientId, tags);
  res.json(result);
});

// Endpoint pour jumeler deux dossiers clients en 1 seul
app.post('/api/crm/merge-clients', (req, res) => {
  const {
    primaryClientKey,
    secondaryClientKey,
    targetInfo,
    callerRole,
    callerPermissions,
    callerName,
    callerGrade,
  } = req.body;

  const isAllowed = callerRole === 'super_admin' || Boolean(callerPermissions?.canMergeClients);
  if (!isAllowed) {
    return res.status(403).json({
      error: 'Action refusée : Seuls les utilisateurs avec la permission "Jumeler les dossiers clients" ou l\'Administrateur Système peuvent fusionner des fiches clients.',
    });
  }

  if (!primaryClientKey || !secondaryClientKey) {
    return res.status(400).json({ error: 'Identifiants des dossiers clients primaire et secondaire requis.' });
  }

  const result = dbManager.mergeClientDossiers(
    primaryClientKey,
    secondaryClientKey,
    targetInfo,
    { name: callerName, grade: callerGrade }
  );

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json(result);
});

// 8. Notifications
app.get('/api/notifications', (req, res) => {
  res.json(dbManager.getNotifications());
});

app.post('/api/notifications/read', (req, res) => {
  const { id } = req.body;
  if (id) {
    dbManager.markNotificationAsRead(id);
  } else {
    dbManager.markAllNotificationsAsRead();
  }
  res.json({ success: true });
});

app.post('/api/notifications/read-all', (req, res) => {
  dbManager.markAllNotificationsAsRead();
  res.json({ success: true });
});

app.post('/api/notifications/clear', (req, res) => {
  dbManager.clearNotifications();
  res.json({ success: true });
});

app.delete('/api/notifications', (req, res) => {
  dbManager.clearNotifications();
  res.json({ success: true });
});

app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  if (id) {
    dbManager.deleteNotification(id);
  }
  res.json({ success: true });
});

app.post('/api/notifications/send', (req, res) => {
  const { title, message, type, targetUserId, targetUserName, senderName } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Titre et message requis' });
  }
  const notif = dbManager.createNotification({
    title: String(title).trim(),
    message: String(message).trim(),
    type: type || 'admin_broadcast',
    targetUserId: targetUserId || 'all',
    targetUserName: targetUserName || 'Tout le monde',
    senderName: senderName || 'Direction / Admin',
    read: false,
    timestamp: new Date().toISOString(),
  });
  res.status(201).json(notif);
});

// 9. Statistics
app.get('/api/stats', (req, res) => {
  res.json(dbManager.getStats());
});

// 10. Database Status & MySQL
app.get('/api/db/status', async (req, res) => {
  const status = await dbManager.getStatus();
  res.json(status);
});

app.post('/api/db/test-connection', async (req, res) => {
  const result = await dbManager.testMySQLConnection(req.body);
  res.json(result);
});

// Auto-create all MySQL tables (users, settings, forms, submissions, chats, notes, notifications)
app.post(['/api/db/init-tables', '/api/db/create-tables'], async (req, res) => {
  const result = await dbManager.autoCreateTables(req.body);
  res.json(result);
});

// Save MySQL Configuration and connect/sync
app.post('/api/db/save-config', async (req, res) => {
  const result = await dbManager.saveAndConnectMySQL(req.body);
  res.json(result);
});

// Force synchronisation of all data to MySQL
app.post('/api/db/sync-all', async (req, res) => {
  const result = await dbManager.syncAllToMySQL();
  res.json(result);
});

app.get('/api/db/schema-sql', (req, res) => {
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(sql);
  } else {
    res.status(404).send('Script SQL non trouvé');
  }
});

// 11. Email Status & Diagnostics
app.get('/api/admin/email-status', (req, res) => {
  const status = getEmailConfigStatus();
  res.json(status);
});

app.post('/api/admin/test-email', async (req, res) => {
  const { account, destinationEmail } = req.body;
  const targetAccount = account === 'martine' ? 'martine' : 'noreply';
  const result = await testEmailConnection(targetAccount, destinationEmail);
  res.json(result);
});

// 12. Embed Snippet Helper Endpoints
app.get('/embed/code', (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${host}`;

  const chatbotHtmlSnippet = `<!-- ============================================ -->
<!-- WIDGET CHATBOT MARTINE V. - ÉVASION SOLEIL -->
<!-- ============================================ -->
<div id="evasion-soleil-chatbot-container"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${baseUrl}/?mode=widget_chat';
    iframe.style.position = 'fixed';
    iframe.style.bottom = '24px';
    iframe.style.right = '24px';
    iframe.style.width = '420px';
    iframe.style.height = '620px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '16px';
    iframe.style.boxShadow = '0 12px 35px rgba(0,0,0,0.18)';
    iframe.style.zIndex = '999999';
    iframe.style.maxHeight = '90vh';
    iframe.style.maxWidth = '92vw';
    document.body.appendChild(iframe);
  })();
</script>`;

  const formHomePageSnippet = `<!-- ==================================================================== -->
<!-- INTÉGRATION DEVIS PAGE D'ACCUEIL - VOYAGES ÉVASION SOLEIL            -->
<!-- Largeur étendue (1440px max), 100% adaptatif tout appareil (Mobile/PC)-->
<!-- Fond 100% invisible (transparent) et hauteur auto-ajustée            -->
<!-- ==================================================================== -->
<div id="evasion-soumission-home-widget" style="width:100%;max-width:1440px;margin:0 auto;padding:0;position:relative;background:transparent;">
  <iframe 
    id="evasion-soumission-home-frame"
    src="${baseUrl}/soumission?layout=home" 
    allowtransparency="true"
    scrolling="no"
    style="width:100%;min-height:660px;border:none;background:transparent;display:block;overflow:hidden;"
    title="Demande de Devis Voyage - Voyages Évasion Soleil"
    loading="lazy"
    allow="clipboard-write">
  </iframe>
</div>
<script>
  window.addEventListener('message', function(e) {
    if (e.data && (e.data.type === 'EVASION_SOUMISSION_RESIZE' || e.data.type === 'EVASION_RESIZE_IFRAME') && e.data.height) {
      var frame = document.getElementById('evasion-soumission-home-frame');
      if (frame) {
        frame.style.height = (e.data.height + 16) + 'px';
      }
    }
  });
</script>`;

  const formFullPageSnippet = formHomePageSnippet;
  const formHtmlSnippet = formHomePageSnippet;

  const directLinkSnippet = `<a href="${baseUrl}/soumission" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #338b84, #236560); color: #ffffff; font-family: sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 15px rgba(51, 139, 132, 0.35);">
  ☀️ Demander une soumission de voyage en ligne
</a>`;

  res.json({
    chatbotSnippet: chatbotHtmlSnippet,
    formSnippet: formHtmlSnippet,
    formFullPageSnippet,
    formHomePageSnippet,
    directLinkSnippet,
    baseUrl,
  });
});

// 13. Newsletter API Endpoints
// Public Subscribe
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email, firstName, lastName, source, preferences } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Une adresse courriel valide est requise.' });
    }

    const { subscriber, isNew } = dbManager.subscribeToNewsletter({
      email,
      firstName,
      lastName,
      source: source || 'website_footer',
      preferences,
    });

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;
    const preferencesUrl = `${baseUrl}/?newsletter_token=${subscriber.token}&view=newsletter_preferences`;
    const unsubscribeUrl = `${baseUrl}/?newsletter_token=${subscriber.token}&view=newsletter_unsubscribe`;

    // Send confirmation/welcome email with the preferences & unsubscribe link
    sendNewsletterWelcomeEmail({
      email: subscriber.email,
      firstName: subscriber.firstName,
      preferencesUrl,
      unsubscribeUrl,
    }).catch((err) => console.error('[Newsletter Welcome Email Error]:', err));

    res.json({
      success: true,
      message: isNew
        ? 'Merci de votre inscription ! Un courriel de bienvenue avec votre lien de personnalisation vous a été envoyé.'
        : 'Votre abonnement a été réactivé avec succès !',
      subscriber,
      preferencesUrl,
      unsubscribeUrl,
    });
  } catch (err: any) {
    console.error('Error subscribing to newsletter:', err);
    res.status(500).json({ error: 'Erreur lors de l\'inscription à la newsletter.' });
  }
});

// Get subscriber by token (for preference or unsubscribe page)
app.get('/api/newsletter/subscriber/:token', (req, res) => {
  const { token } = req.params;
  const subscriber = dbManager.getSubscriberByToken(token);
  if (!subscriber) {
    return res.status(404).json({ error: 'Abonné non trouvé ou lien invalide.' });
  }
  res.json(subscriber);
});

// Update subscriber preferences
app.post('/api/newsletter/preferences', (req, res) => {
  try {
    const { token, firstName, lastName, preferences, status } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Jeton d\'authentification manquant.' });
    }
    const updated = dbManager.updateSubscriberPreferences(token, {
      firstName,
      lastName,
      preferences,
      status,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Abonné introuvable.' });
    }
    res.json({
      success: true,
      message: 'Vos préférences de communication ont été mises à jour avec succès.',
      subscriber: updated,
    });
  } catch (err: any) {
    console.error('Error updating newsletter preferences:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
  }
});

// Unsubscribe by token or direct email
app.post('/api/newsletter/unsubscribe', (req, res) => {
  try {
    const { token, email } = req.body;
    let ok = false;
    if (token) {
      ok = dbManager.unsubscribeByToken(token);
    } else if (email) {
      ok = dbManager.unsubscribeByEmail(email);
    } else {
      return res.status(400).json({ error: 'Jeton ou courriel requis pour le désabonnement.' });
    }

    if (!ok) {
      return res.status(404).json({ error: 'Abonné introuvable ou déjà désabonné.' });
    }
    res.json({
      success: true,
      message: 'Vous avez été désabonné(e) de notre infolettre avec succès. Vous ne recevrez plus nos offres par courriel.',
    });
  } catch (err: any) {
    console.error('Error unsubscribing:', err);
    res.status(500).json({ error: 'Erreur lors du désabonnement.' });
  }
});

// Admin: Get all subscribers
app.get('/api/admin/newsletter/subscribers', (req, res) => {
  const subscribers = dbManager.getNewsletterSubscribers();
  res.json(subscribers);
});

app.get('/api/newsletter/subscribers', (req, res) => {
  res.json(dbManager.getNewsletterSubscribers());
});

// Admin: Get all sent campaigns
app.get('/api/admin/newsletter/campaigns', (req, res) => {
  const campaigns = dbManager.getNewsletterCampaigns();
  res.json(campaigns);
});

// Admin: Delete a subscriber
app.delete('/api/admin/newsletter/subscribers/:id', (req, res) => {
  const success = dbManager.deleteNewsletterSubscriber(req.params.id);
  res.json({ success });
});

// Admin: Toggle newsletter subscription for a client
app.post('/api/admin/newsletter/toggle-subscription', (req, res) => {
  try {
    const { email, firstName, lastName, subscribe } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Adresse courriel valide requise.' });
    }

    if (subscribe) {
      const { subscriber } = dbManager.subscribeToNewsletter({
        email,
        firstName,
        lastName,
        source: 'manual',
      });
      return res.json({ success: true, status: 'active', subscriber });
    } else {
      const unsubscribed = dbManager.unsubscribeByEmail(email);
      return res.json({ success: true, status: 'unsubscribed', unsubscribed });
    }
  } catch (err: any) {
    console.error('Error toggling subscription:', err);
    res.status(500).json({ error: 'Erreur lors de la modification de l\'abonnement.' });
  }
});

// Admin: Broadcast campaign to all clients / subscribers
app.post('/api/admin/newsletter/send', async (req, res) => {
  try {
    const { subject, previewText, content, category, sentByUserId, sentByUserName, targetAudience } = req.body;
    if (!subject || !content) {
      return res.status(400).json({ error: 'Le sujet et le contenu du message sont requis.' });
    }

    const allSubscribers = dbManager.getNewsletterSubscribers();
    const activeSubscribers = allSubscribers.filter((s) => s.status === 'active');

    // Filter based on audience or preferences if applicable
    let recipients = activeSubscribers;
    if (category && category !== 'all') {
      if (category === 'croisiere') {
        recipients = activeSubscribers.filter((s) => s.preferences.cruisesSpecials);
      } else if (category === 'last_minute') {
        recipients = activeSubscribers.filter((s) => s.preferences.lastMinuteAlerts);
      } else if (category === 'forfait_sud') {
        recipients = activeSubscribers.filter((s) => s.preferences.sunDestinations);
      } else if (category === 'vip_exclusive') {
        recipients = activeSubscribers.filter((s) => s.preferences.offersExclusive);
      }
    }

    // Also include quote submission customers who have not unsubscribed if requested
    if (targetAudience === 'all_clients_and_subscribers') {
      const submissions = (dbManager as any).db.submissions || [];
      const unsubscribedEmails = new Set(
        allSubscribers.filter((s) => s.status === 'unsubscribed').map((s) => s.email.toLowerCase())
      );
      const existingEmails = new Set(recipients.map((r) => r.email.toLowerCase()));

      for (const sub of submissions) {
        const email = sub.customerEmail?.trim().toLowerCase();
        if (email && !unsubscribedEmails.has(email) && !existingEmails.has(email)) {
          // Auto create or match subscriber
          const { subscriber } = dbManager.subscribeToNewsletter({
            email,
            firstName: sub.customerFirstName,
            lastName: sub.customerLastName,
            source: 'quote_form',
          });
          recipients.push(subscriber);
          existingEmails.add(email);
        }
      }
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    // Record campaign in database
    const campaign = dbManager.addNewsletterCampaign({
      subject,
      previewText: previewText || '',
      content,
      category: category || 'all',
      sentByUserId: sentByUserId || 'admin',
      sentByUserName: sentByUserName || 'Évasion Soleil',
      recipientsCount: recipients.length,
      status: 'sent',
    });

    // Send emails asynchronously
    let sentCount = 0;
    const errors: string[] = [];

    // Dispatch in batches or background
    for (const recipient of recipients) {
      const preferencesUrl = `${baseUrl}/?newsletter_token=${recipient.token}&view=newsletter_preferences`;
      const unsubscribeUrl = `${baseUrl}/?newsletter_token=${recipient.token}&view=newsletter_unsubscribe`;

      try {
        await sendNewsletterCampaignEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.firstName,
          subject,
          contentHtml: content,
          preferencesUrl,
          unsubscribeUrl,
        });
        sentCount++;
      } catch (e: any) {
        errors.push(`Erreur pour ${recipient.email}: ${e.message}`);
      }
    }

    res.json({
      success: true,
      message: `Offre envoyée avec succès à ${sentCount} destinataire(s).`,
      campaign,
      sentCount,
      totalTargeted: recipients.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    });
  } catch (err: any) {
    console.error('Error sending newsletter campaign:', err);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de la campagne.' });
  }
});

// ==============================================================================
// NEXTCLOUD NATIVE PLUGINS & SSO AUTO-AUTH ENDPOINTS
// ==============================================================================
app.get('/api/nextcloud/sso-auth', (req, res) => {
  try {
    const userParam = String(req.query.user || req.query.nc_user || 'admin').trim().toLowerCase();
    const users = dbManager.getUsers();
    const matched =
      users.find(
        (u) =>
          u.id.toLowerCase() === userParam ||
          (u.username && u.username.toLowerCase() === userParam) ||
          (u.email && u.email.toLowerCase() === userParam)
      ) || users[0];

    if (!matched) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    const { password: _pwd, twoFactorSecret: _sec, ...safeUser } = matched as any;
    res.json({ success: true, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur SSO Nextcloud' });
  }
});

const NEXTCLOUD_CONFIG_FILE = path.join(process.cwd(), 'server', 'nextcloud-config.json');

const DEFAULT_NEXTCLOUD_CONFIG = {
  logoUrl: '',
  logoMode: 'logo_and_text',
  logoHeightPx: 40,
  logoFit: 'contain',
  brandTitle: 'Voyages Évasion Soleil',
  brandSubtitle: 'Espace Intranet & CRM Collaborateurs',
  primaryColor: '#0082c9',
  accentColor: '#338b84',
  intranetDomain: 'https://intranet.evasionsoleil.com',
  appBaseUrl: '',
  headerMode: 'compact',
  defaultTab: 'submissions',
  enableDashboardWidgets: true,
  widgetSoumissionsEnabled: true,
  widgetMartineEnabled: true,
  widgetCrmEnabled: true,
  widgetChatEnabled: true,
  widgetHeightPx: 450,
  ssoAutoLoginUser: 'admin',
  allowPublicIframe: true,
};

function getNextcloudConfig() {
  try {
    if (fs.existsSync(NEXTCLOUD_CONFIG_FILE)) {
      const raw = fs.readFileSync(NEXTCLOUD_CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_NEXTCLOUD_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Error loading nextcloud config:', err);
  }
  return { ...DEFAULT_NEXTCLOUD_CONFIG };
}

function saveNextcloudConfig(cfg: any) {
  try {
    const merged = { ...getNextcloudConfig(), ...cfg };
    fs.writeFileSync(NEXTCLOUD_CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  } catch (err) {
    console.error('Error saving nextcloud config:', err);
    return cfg;
  }
}

app.get('/api/nextcloud/config', (req, res) => {
  res.json(getNextcloudConfig());
});

app.post('/api/nextcloud/config', (req, res) => {
  const updated = saveNextcloudConfig(req.body);
  res.json({ success: true, config: updated });
});

// Live Widget Data endpoint specifically structured for Nextcloud Dashboard Widgets
app.get('/api/nextcloud/widgets/data', (req, res) => {
  try {
    const submissions = (dbManager as any).db?.submissions || [];
    const stats = (dbManager as any).db?.stats || {};
    const chatbotSettings = (dbManager as any).db?.chatbotSettings || {};
    const conversations = (dbManager as any).db?.conversations || [];
    const teamMessages = (dbManager as any).db?.teamMessages || [];
    const invoices = (dbManager as any).db?.invoices || [];
    const legalDocs = (dbManager as any).db?.legalDocuments || [];
    const users = dbManager.getUsers();

    const pendingCalls = submissions.filter((s: any) => s.callStatus === 'non_appele' || !s.callStatus);
    const inProgressCalls = submissions.filter((s: any) => s.callStatus === 'appele_en_attente');
    const booked = submissions.filter((s: any) => s.callStatus === 'reserve');
    const availableUsers = users.filter((u: any) => u.status !== 'indisponible');

    const totalInvoicePending = invoices
      .filter((i: any) => i.status === 'sent' || i.status === 'partially_paid')
      .reduce((acc: number, curr: any) => acc + (Number(curr.balanceDue) || 0), 0);

    const pendingDocs = legalDocs.filter((d: any) => d.status === 'pending_signature');

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      branding: getNextcloudConfig(),
      submissions: {
        total: submissions.length,
        pendingCallsCount: pendingCalls.length,
        inProgressCount: inProgressCalls.length,
        bookedCount: booked.length,
        recentPending: pendingCalls.slice(0, 8).map((s: any) => ({
          id: s.id,
          customerName: `${s.customerFirstName || ''} ${s.customerLastName || ''}`.trim() || 'Client',
          destination: s.destination || 'Non spécifié',
          departureDate: s.departureDate || '',
          budget: s.budgetRange || '',
          passengers: (s.adultsCount || 0) + (s.childrenCount || 0),
          createdAt: s.createdAt,
          callStatus: s.callStatus || 'non_appele',
          assignedTo: s.assignedToUserName || 'Non assigné',
        })),
      },
      martine: {
        name: chatbotSettings.botName || 'Martine V.',
        enabled: Boolean(chatbotSettings.botEnabled),
        welcomeMessage: chatbotSettings.welcomeMessage || '',
        activeConversationsCount: conversations.length,
        recentConversations: conversations.slice(-5).map((c: any) => ({
          id: c.id,
          customerName: c.customerName || 'Visiteur web',
          lastMessage: c.messages?.[c.messages?.length - 1]?.text || '',
          startedAt: c.startedAt,
        })),
      },
      crm: {
        totalInvoices: invoices.length,
        pendingBalanceCad: totalInvoicePending,
        pendingContractsCount: pendingDocs.length,
        recentPendingContracts: pendingDocs.slice(0, 5).map((d: any) => ({
          id: d.id,
          title: d.title,
          clientName: d.clientName,
          sentAt: d.sentAt || d.createdAt,
        })),
      },
      team: {
        availableAgentsCount: availableUsers.length,
        totalAgentsCount: users.length,
        recentMessages: teamMessages.slice(-5).map((m: any) => ({
          id: m.id,
          senderName: m.userName,
          text: m.text,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (err: any) {
    console.error('Error fetching widget data:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des données de widget Nextcloud' });
  }
});

app.get('/api/nextcloud/install-script.sh', (req, res) => {
  try {
    const scriptPath = path.join(process.cwd(), 'install-github-nextcloud.sh');
    if (fs.existsSync(scriptPath)) {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      res.setHeader('Content-Type', 'application/x-sh; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="install-github-nextcloud.sh"');
      return res.send(content);
    }
  } catch {}
  const host = req.get('host') || 'intranet.evasionsoleil.com';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const appBaseUrl = String(req.query.base_url || `https://intranet.evasionsoleil.com:1031` || `${protocol}://${host}`).replace(/\/+$/, '');
  const ncPath = String(req.query.nc_path || '/var/www/nextcloud').replace(/\/+$/, '');
  const intranetDomain = String(req.query.intranet_domain || 'https://intranet.evasionsoleil.com').replace(/\/+$/, '');
  const cfg = getNextcloudConfig();

  const script = `#!/bin/bash
# ==============================================================================
# VOYAGES ÉVASION SOLEIL - INSTALLATEUR DES PLUGINS MAISON NEXTCLOUD INTRANET
# Cible : ${intranetDomain} (${ncPath})
# ==============================================================================
set -e

NC_PATH="\${1:-${ncPath}}"
APP_URL="${appBaseUrl}"
INTRANET="${intranetDomain}"

echo "🌴 Début de l'installation de la suite complète Évasion Soleil dans Nextcloud..."
echo "📂 Dossier Nextcloud cible : \$NC_PATH"
echo "🌐 URL Hôte Dashboard       : \$APP_URL"
echo "🏢 Domaine Intranet         : \$INTRANET"

if [ ! -f "\$NC_PATH/occ" ]; then
  echo "⚠️  Fichier 'occ' non trouvé dans \$NC_PATH."
  echo "Usage: sudo bash install-nextcloud-evasion.sh /chemin/vers/nextcloud"
  exit 1
fi

WEB_USER="www-data"
if id "nginx" &>/dev/null; then WEB_USER="nginx"; elif id "apache" &>/dev/null; then WEB_USER="apache"; fi

CUSTOM_APPS="\$NC_PATH/custom_apps"
mkdir -p "\$CUSTOM_APPS"

APP_DIR="\$CUSTOM_APPS/evasionsoleil"
echo "📦 Génération de l'Application Maison 'evasionsoleil' dans \$APP_DIR..."
mkdir -p "\$APP_DIR/appinfo" "\$APP_DIR/lib/AppInfo" "\$APP_DIR/lib/Dashboard" "\$APP_DIR/lib/Controller" "\$APP_DIR/templates" "\$APP_DIR/img" "\$APP_DIR/js" "\$APP_DIR/css"

# 1. info.xml avec Dashboard Widget declaration
cat << 'EOF' > "\$APP_DIR/appinfo/info.xml"
<?xml version="1.0"?>
<info xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="https://apps.nextcloud.com/schema/apps/info.xsd">
    <id>evasionsoleil</id>
    <name>${cfg.brandTitle || 'Évasion Soleil'}</name>
    <summary>${cfg.brandSubtitle || 'Dashboard CRM & Soumissions'}</summary>
    <description><![CDATA[Intranet complet Évasion Soleil : Soumissions, CRM Clients, Facturation, Martine V. IA, Formulaires de devis et widgets officiels pour le Tableau de Bord Nextcloud.]]></description>
    <version>3.0.0</version>
    <licence>agpl</licence>
    <author>Voyages Évasion Soleil</author>
    <namespace>EvasionSoleil</namespace>
    <category>office</category>
    <dependencies>
        <nextcloud min-version="24" max-version="32" />
    </dependencies>
    <navigations>
        <navigation>
            <name>Soumissions &amp; CRM</name>
            <route>evasionsoleil.page.index</route>
            <icon>app.svg</icon>
            <order>1</order>
        </navigation>
    </navigations>
</info>
EOF

# 2. routes.php
cat << 'EOF' > "\$APP_DIR/appinfo/routes.php"
<?php
return [
    'routes' => [
        ['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],
        ['name' => 'page#submissions', 'url' => '/submissions', 'verb' => 'GET'],
        ['name' => 'page#crm', 'url' => '/crm', 'verb' => 'GET'],
        ['name' => 'page#martine', 'url' => '/martine', 'verb' => 'GET'],
        ['name' => 'widget#data', 'url' => '/api/widget', 'verb' => 'GET'],
    ]
];
EOF

# 3. Application.php avec enregistrement du Dashboard Widget
cat << 'EOF' > "\$APP_DIR/lib/AppInfo/Application.php"
<?php
namespace OCA\\EvasionSoleil\\AppInfo;

use OCP\\AppFramework\\App;
use OCP\\Dashboard\\IManager;
use OCP\\IContainer;
use OCA\\EvasionSoleil\\Dashboard\\SoumissionsWidget;

class Application extends App {
    public const APP_ID = 'evasionsoleil';

    public function __construct(array \$params = []) {
        parent::__construct(self::APP_ID, \$params);
        \$container = \$this->getContainer();
        
        // Enregistre les widgets sur le Dashboard Nextcloud si supporté
        if (interface_exists('\\\\OCP\\\\Dashboard\\\\IManager')) {
            try {
                \$dashboardManager = \$container->query(IManager::class);
                \$dashboardManager->registerWidget(SoumissionsWidget::class);
            } catch (\\\\Throwable \$e) {
                // version fallback
            }
        }
    }
}
EOF

# 4. SoumissionsWidget.php (Nextcloud Dashboard Widget)
cat << 'EOF' > "\$APP_DIR/lib/Dashboard/SoumissionsWidget.php"
<?php
namespace OCA\\EvasionSoleil\\Dashboard;

use OCP\\Dashboard\\IWidget;
use OCP\\IL10N;
use OCP\\IURLGenerator;

class SoumissionsWidget implements IWidget {
    private IL10N \$l10n;
    private IURLGenerator \$urlGenerator;

    public function __construct(IL10N \$l10n, IURLGenerator \$urlGenerator) {
        \$this->l10n = \$l10n;
        \$this->urlGenerator = \$urlGenerator;
    }

    public function getId(): string {
        return 'evasion_soumissions_widget';
    }

    public function getTitle(): string {
        return '☀️ Évasion Soleil - Soumissions & Rappels Urgents';
    }

    public function getOrder(): int {
        return 10;
    }

    public function getIconUrl(): string {
        return \$this->urlGenerator->imagePath('evasionsoleil', 'app.svg');
    }

    public function getUrl(): ?string {
        return \$this->urlGenerator->linkToRoute('evasionsoleil.page.index');
    }

    public function load(): void {
        \\OCP\\Util::addScript('evasionsoleil', 'dashboard_widget');
        \\OCP\\Util::addStyle('evasionsoleil', 'dashboard_widget');
    }

    public function getWidgetTemplate(): string {
        return 'dashboard_widget';
    }
}
EOF

# 5. PageController.php
cat << 'EOF' > "\$APP_DIR/lib/Controller/PageController.php"
<?php
namespace OCA\\EvasionSoleil\\Controller;

use OCP\\AppFramework\\Controller;
use OCP\\AppFramework\\Http\\TemplateResponse;
use OCP\\AppFramework\\Http\\ContentSecurityPolicy;
use OCP\\IRequest;

class PageController extends Controller {
    public function __construct(string \$AppName, IRequest \$request) {
        parent::__construct(\$AppName, \$request);
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function index(): TemplateResponse {
        \$response = new TemplateResponse('evasionsoleil', 'main', ['tab' => 'submissions']);
        \$csp = new ContentSecurityPolicy();
        \$csp->addAllowedFrameDomain('*');
        \$csp->addAllowedConnectDomain('*');
        \$response->setContentSecurityPolicy(\$csp);
        return \$response;
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function submissions(): TemplateResponse {
        return \$this->renderIframeTab('submissions');
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function crm(): TemplateResponse {
        return \$this->renderIframeTab('crm');
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function martine(): TemplateResponse {
        return \$this->renderIframeTab('chatbot');
    }

    private function renderIframeTab(string \$tab): TemplateResponse {
        \$response = new TemplateResponse('evasionsoleil', 'main', ['tab' => \$tab]);
        \$csp = new ContentSecurityPolicy();
        \$csp->addAllowedFrameDomain('*');
        \$csp->addAllowedConnectDomain('*');
        \$response->setContentSecurityPolicy(\$csp);
        return \$response;
    }
}
EOF

# 6. Template principal (templates/main.php)
cat << EOF > "\$APP_DIR/templates/main.php"
<?php
\$tab = isset(\$_['tab']) ? \$_['tab'] : 'submissions';
\$targetUrl = "${appBaseUrl}/?nextcloud=1&plugin=" . \$tab . "&header=compact&nc_user=admin";
?>
<div id="app-content" style="width:100%;height:calc(100vh - 50px);margin:0;padding:0;overflow:hidden;background:#f8fafc;">
    <iframe
        id="evasion-main-frame"
        src="<?php echo p(\$targetUrl); ?>"
        style="width:100%;height:100%;border:0;margin:0;padding:0;display:block;"
        allow="clipboard-write; notifications; microphone"
        allowfullscreen>
    </iframe>
</div>
EOF

# 7. Template de widget Dashboard (templates/dashboard_widget.php)
cat << EOF > "\$APP_DIR/templates/dashboard_widget.php"
<div id="evasion-dashboard-widget" style="padding:12px;font-family:sans-serif;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:800;color:#0f172a;font-size:14px;">${cfg.brandTitle || 'Évasion Soleil'}</span>
            <span style="background:#0082c9;color:#fff;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:bold;">Intranet Direct</span>
        </div>
        <a href="<?php echo \\OCP\\Util::linkToRoute('evasionsoleil.page.index'); ?>" style="color:#0082c9;font-size:12px;font-weight:bold;text-decoration:none;">Ouvrir l'application &rarr;</a>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px;margin-bottom:12px;">
        <div style="background:#f0f9ff;border:1px solid #bae6fd;padding:10px;border-radius:10px;text-align:center;">
            <div id="nc-widget-pending-count" style="font-size:20px;font-weight:900;color:#0284c7;">...</div>
            <div style="font-size:11px;color:#0369a1;font-weight:bold;">À Rappeler</div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:10px;border-radius:10px;text-align:center;">
            <div id="nc-widget-martine-status" style="font-size:13px;font-weight:900;color:#16a34a;margin-top:4px;">EN LIGNE</div>
            <div style="font-size:11px;color:#15803d;font-weight:bold;">Martine V. (IA)</div>
        </div>
        <div style="background:#faf5ff;border:1px solid #e9d5ff;padding:10px;border-radius:10px;text-align:center;">
            <div id="nc-widget-agents-count" style="font-size:20px;font-weight:900;color:#9333ea;">...</div>
            <div style="font-size:11px;color:#7e22ce;font-weight:bold;">Conseillers Actifs</div>
        </div>
    </div>
    <div id="nc-widget-recent-list" style="font-size:12px;color:#334155;">
        Chargement des dernières soumissions...
    </div>
</div>
EOF

# 8. js/dashboard_widget.js
cat << 'EOF' > "\$APP_DIR/js/dashboard_widget.js"
document.addEventListener('DOMContentLoaded', function() {
    function refreshEvasionWidget() {
        fetch('${appBaseUrl}/api/nextcloud/widgets/data')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data || !data.submissions) return;
                var countEl = document.getElementById('nc-widget-pending-count');
                if (countEl) countEl.innerText = data.submissions.pendingCallsCount || 0;
                
                var martineEl = document.getElementById('nc-widget-martine-status');
                if (martineEl) {
                    martineEl.innerText = data.martine.enabled ? '🟢 ACTIVE' : '🔴 ARRÊTÉE';
                    martineEl.style.color = data.martine.enabled ? '#16a34a' : '#dc2626';
                }

                var agentsEl = document.getElementById('nc-widget-agents-count');
                if (agentsEl) agentsEl.innerText = data.team.availableAgentsCount || 0;

                var listEl = document.getElementById('nc-widget-recent-list');
                if (listEl && data.submissions.recentPending) {
                    if (data.submissions.recentPending.length === 0) {
                        listEl.innerHTML = '<div style="color:#64748b;padding:8px;text-align:center;">✨ Aucun rappel en attente ! Toutes les demandes sont traitées.</div>';
                    } else {
                        var html = '<div style="font-weight:bold;margin-bottom:6px;color:#475569;">Dernières demandes au soleil :</div>';
                        data.submissions.recentPending.slice(0, 4).forEach(function(s) {
                            html += '<div style="display:flex;justify-content:space-between;padding:6px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:4px;">' +
                                '<div><strong>' + s.customerName + '</strong> (' + s.destination + ')</div>' +
                                '<span style="color:#d97706;font-weight:bold;font-size:11px;">À rappeler</span>' +
                            '</div>';
                        });
                        listEl.innerHTML = html;
                    }
                }
            })
            .catch(function(e) { console.error('Evasion Soleil Widget err:', e); });
    }
    refreshEvasionWidget();
    setInterval(refreshEvasionWidget, 15000);
});
EOF

# 9. css/dashboard_widget.css
cat << 'EOF' > "\$APP_DIR/css/dashboard_widget.css"
#evasion-dashboard-widget {
    background: #ffffff;
    border-radius: 12px;
}
EOF

# 10. Icône app.svg
cat << 'EOF' > "\$APP_DIR/img/app.svg"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
EOF

chown -R \$WEB_USER:\$WEB_USER "\$APP_DIR" 2>/dev/null || true

echo "⚡ Activation de l'application 'evasionsoleil' via occ..."
sudo -u \$WEB_USER php "\$NC_PATH/occ" app:enable evasionsoleil 2>/dev/null || true

echo "✅ Activation de l'application 'external' pour liens directs..."
sudo -u \$WEB_USER php "\$NC_PATH/occ" app:install external 2>/dev/null || true
sudo -u \$WEB_USER php "\$NC_PATH/occ" app:enable external 2>/dev/null || true

echo ""
echo "=============================================================================="
echo "🎉 INSTALLATION TERMINÉE AVEC SUCCÈS SUR \${INTRANET} !"
echo "1. Le plugin et widget apparaissent maintenant directement sur :"
echo "   \${INTRANET}/apps/dashboard/ (Widgets Dashboard)"
echo "   \${INTRANET}/apps/evasionsoleil/ (Application Complète)"
echo "=============================================================================="
`;

  res.setHeader('Content-Type', 'application/x-sh; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="install-nextcloud-intranet.sh"');
  res.send(script);
});

// Start server with Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html') || filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js') || filePath.endsWith('manifest.json')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const portsToBind = Array.from(new Set([3000, PORT, 1031]));
  portsToBind.forEach((listenPort) => {
    const serverInstance = app.listen(listenPort, '0.0.0.0', () => {
      console.log(`[Évasion Soleil Server] Démarré et actif sur http://0.0.0.0:${listenPort}`);
    });
    serverInstance.on('error', (err: any) => {
      if (listenPort !== 3000 && listenPort !== PORT) {
        console.warn(`[Évasion Soleil Server] Port secondaire ${listenPort} non disponible (${err.code || err.message}), le port principal reste actif.`);
      } else {
        console.error(`[Évasion Soleil Server] Erreur sur le port ${listenPort}:`, err);
      }
    });
  });
}

// Protection Globale Anti-Crash (0% Interruption de service)
process.on('uncaughtException', (err) => {
  console.error('[Haute Disponibilité • Anti-Crash] Exception interceptée sans interruption de service:', err?.message || err);
  try {
    dbManager.saveToJson();
  } catch {}
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[Haute Disponibilité • Anti-Crash] Promesse rejetée interceptée sans interruption de service:', reason?.message || reason);
});

startServer();

