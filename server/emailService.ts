import nodemailer, { type Transporter } from 'nodemailer';
import { QuoteSubmission, SubmissionProposalItem, SubmissionProposalsPayload, Invoice, LegalDocument } from '../src/types';

let noreplyTransporter: Transporter | null = null;
let martineTransporter: Transporter | null = null;

export interface SmtpAccountConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  fromEmail: string;
  fromName: string;
}

export function getNoReplyConfig(): SmtpAccountConfig {
  const host = process.env.NOREPLY_SMTP_HOST || process.env.SMTP_HOST || 'smtp.evasionsoleil.com';
  const port = process.env.NOREPLY_SMTP_PORT
    ? parseInt(process.env.NOREPLY_SMTP_PORT, 10)
    : (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587);
  const user = process.env.NOREPLY_SMTP_USER || process.env.SMTP_USER || 'ne_pas_repondre@evasionsoleil.com';
  const pass = process.env.NOREPLY_SMTP_PASS || process.env.SMTP_PASS || '';
  const secure = process.env.NOREPLY_SMTP_SECURE === 'true' || process.env.SMTP_SECURE === 'true' || port === 465;
  const fromEmail = process.env.NOREPLY_EMAIL || 'ne_pas_repondre@evasionsoleil.com';
  const fromName = process.env.NOREPLY_FROM_NAME || 'Voyages Évasion Soleil';

  return { host, port, user, pass, secure, fromEmail, fromName };
}

export function getMartineConfig(): SmtpAccountConfig {
  const host = process.env.MARTINE_SMTP_HOST || process.env.SMTP_HOST || 'smtp.evasionsoleil.com';
  const port = process.env.MARTINE_SMTP_PORT
    ? parseInt(process.env.MARTINE_SMTP_PORT, 10)
    : (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587);
  const user = process.env.MARTINE_SMTP_USER || process.env.SMTP_USER || 'martine@evasionsoleil.com';
  const pass = process.env.MARTINE_SMTP_PASS || process.env.SMTP_PASS || '';
  const secure = process.env.MARTINE_SMTP_SECURE === 'true' || process.env.SMTP_SECURE === 'true' || port === 465;
  const fromEmail = process.env.MARTINE_EMAIL || 'martine@evasionsoleil.com';
  const fromName = process.env.MARTINE_FROM_NAME || 'Martine V. - Clavardage Évasion Soleil';

  return { host, port, user, pass, secure, fromEmail, fromName };
}

export function getNoReplyTransporter(): Transporter | null {
  if (noreplyTransporter) return noreplyTransporter;
  const cfg = getNoReplyConfig();

  if (cfg.host && cfg.user && cfg.pass) {
    try {
      noreplyTransporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: {
          user: cfg.user,
          pass: cfg.pass,
        },
      });
      console.log(`[Email Service] SMTP No-Reply configuré : ${cfg.host}:${cfg.port} (${cfg.user})`);
      return noreplyTransporter;
    } catch (err) {
      console.error('[Email Service] Erreur lors de l’initialisation SMTP No-Reply:', err);
    }
  }
  return null;
}

export function getMartineTransporter(): Transporter | null {
  if (martineTransporter) return martineTransporter;
  const cfg = getMartineConfig();

  if (cfg.host && cfg.user && cfg.pass) {
    try {
      martineTransporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: {
          user: cfg.user,
          pass: cfg.pass,
        },
      });
      console.log(`[Email Service] SMTP Martine V. configuré : ${cfg.host}:${cfg.port} (${cfg.user})`);
      return martineTransporter;
    } catch (err) {
      console.error('[Email Service] Erreur lors de l’initialisation SMTP Martine:', err);
    }
  }
  return null;
}

export function getTransporter(): Transporter | null {
  return getNoReplyTransporter() || getMartineTransporter();
}

export function getEmailConfigStatus() {
  const noreplyCfg = getNoReplyConfig();
  const martineCfg = getMartineConfig();
  const agencyRecipient = process.env.NOTIFICATION_EMAIL || 'info@evasionsoleil.com';

  return {
    agencyRecipient,
    noreply: {
      fromEmail: noreplyCfg.fromEmail,
      fromName: noreplyCfg.fromName,
      smtpHost: noreplyCfg.host,
      smtpPort: noreplyCfg.port,
      smtpUser: noreplyCfg.user,
      smtpConfigured: Boolean(noreplyCfg.host && noreplyCfg.user && noreplyCfg.pass),
      secure: noreplyCfg.secure,
    },
    martine: {
      fromEmail: martineCfg.fromEmail,
      fromName: martineCfg.fromName,
      smtpHost: martineCfg.host,
      smtpPort: martineCfg.port,
      smtpUser: martineCfg.user,
      smtpConfigured: Boolean(martineCfg.host && martineCfg.user && martineCfg.pass),
      secure: martineCfg.secure,
    },
  };
}

export async function testEmailConnection(accountType: 'martine' | 'noreply', destinationEmail?: string) {
  const cfg = accountType === 'martine' ? getMartineConfig() : getNoReplyConfig();
  const mailer = accountType === 'martine' ? getMartineTransporter() : getNoReplyTransporter();

  if (!cfg.host || !cfg.user || !cfg.pass) {
    return {
      success: false,
      message: `Identifiants incomplets pour le compte ${accountType}. Veuillez renseigner l'hôte, l'utilisateur et le mot de passe dans le fichier .env`,
      config: {
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        fromEmail: cfg.fromEmail,
        hasPassword: Boolean(cfg.pass),
      },
    };
  }

  if (!mailer) {
    return {
      success: false,
      message: `Impossible d'instancier le transporteur SMTP pour ${accountType}.`,
    };
  }

  try {
    // Verify SMTP connection
    await mailer.verify();

    let sendSuccess = false;
    if (destinationEmail) {
      const info = await mailer.sendMail({
        from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
        to: destinationEmail,
        subject: `[TEST SMTP] Vérification de connexion réussie pour ${cfg.fromEmail}`,
        text: `Bonjour,\n\nCeci est un courriel de test envoyé avec succès depuis le portail Évasion Soleil.\n\nCompte : ${cfg.fromEmail}\nHôte SMTP : ${cfg.host}:${cfg.port}\nUtilisateur : ${cfg.user}\nDate : ${new Date().toISOString()}\n\nTout fonctionne parfaitement !`,
      });
      sendSuccess = true;
    }

    return {
      success: true,
      message: destinationEmail
        ? `Connexion SMTP réussie et courriel de test envoyé à ${destinationEmail} !`
        : `Connexion SMTP au serveur ${cfg.host}:${cfg.port} vérifiée avec succès pour ${cfg.user} !`,
      config: {
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        fromEmail: cfg.fromEmail,
      },
    };
  } catch (err: any) {
    console.error(`[SMTP Test Error ${accountType}]:`, err);
    return {
      success: false,
      message: `Erreur de connexion SMTP : ${err.message || String(err)}`,
      error: err.message,
    };
  }
}

export async function sendSubmissionEmails(sub: QuoteSubmission): Promise<{ customerEmailSent: boolean; agencyEmailSent: boolean }> {
  const cfg = getNoReplyConfig();
  const mailer = getNoReplyTransporter();
  const customerSender = cfg.fromEmail;
  const customerSenderName = cfg.fromName;
  const agencyRecipient = process.env.NOTIFICATION_EMAIL || 'info@evasionsoleil.com';

  const customerSubject = `Accusé de réception - Votre demande de devis Évasion Soleil (${sub.referenceNumber})`;
  const agencySubject = `[NOUVELLE DEMANDE] ${sub.customerFirstName} ${sub.customerLastName} - ${sub.destination} (${sub.referenceNumber})`;

  const customerHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #338b84, #205753); padding: 28px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 800; }
          .header p { margin: 0; font-size: 13px; opacity: 0.9; }
          .content { padding: 28px; font-size: 14px; line-height: 1.6; }
          .badge { display: inline-block; padding: 4px 10px; background: #f0f8f7; color: #143734; border-radius: 6px; font-weight: 700; font-size: 12px; margin-bottom: 16px; }
          .details { background: #f1f5f9; border-radius: 12px; padding: 18px; margin: 20px 0; font-size: 13px; }
          .details-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
          .details-row:last-child { border-bottom: none; }
          .details-label { color: #64748b; font-weight: 600; }
          .details-val { font-weight: 700; color: #0f172a; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>Évasion Soleil</h1>
            <p>Agence de Voyages &bull; Forfaits Sud &bull; Croisières &bull; Vols</p>
          </div>
          <div class="content">
            <span class="badge">Dossier N° ${sub.referenceNumber}</span>
            <p>Bonjour <strong>${sub.customerFirstName} ${sub.customerLastName}</strong>,</p>
            <p>Nous avons bien reçu votre demande de soumission de voyage et nous vous remercions de votre confiance !</p>
            <p>Un de nos conseillers experts analyse actuellement les meilleurs tarifs et disponibilités. Nous communiquerons avec vous très rapidement au <strong>${sub.customerPhone}</strong> (${sub.preferredCallTime ? `créneau souhaité : ${sub.preferredCallTime}` : 'dès que possible'}).</p>

            <div class="details">
              <div class="details-row">
                <span class="details-label">Formule :</span>
                <span class="details-val">${sub.serviceType === 'vol_seul' ? '✈️ Vol seul (sans hôtel)' : sub.serviceType}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Destination :</span>
                <span class="details-val">${sub.destination}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Date de départ :</span>
                <span class="details-val">${sub.departureDate} (${sub.duration})</span>
              </div>
              <div class="details-row">
                <span class="details-label">Départ de :</span>
                <span class="details-val">${sub.departureCity}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Voyageurs :</span>
                <span class="details-val">${sub.adultsCount} Adulte(s)${sub.childrenCount > 0 ? ` + ${sub.childrenCount} Enfant(s)` : ''}</span>
              </div>
              ${sub.cabinClass ? `
              <div class="details-row">
                <span class="details-label">Classe de cabine :</span>
                <span class="details-val">${sub.cabinClass}</span>
              </div>
              ` : ''}
              <div class="details-row">
                <span class="details-label">Hébergement :</span>
                <span class="details-val">${sub.serviceType === 'vol_seul' ? 'AUCUN HÔTEL (Vol seul)' : `${sub.roomsCount || 1} chambre(s)`}</span>
              </div>
              ${sub.budgetPerPerson ? `
              <div class="details-row">
                <span class="details-label">Budget :</span>
                <span class="details-val">${sub.budgetPerPerson}</span>
              </div>
              ` : ''}
            </div>

            <p style="font-size: 12px; color: #64748b;">
              <em>Ceci est un message automatique envoyé depuis <strong>${customerSender}</strong>. Veuillez ne pas répondre directement à ce courriel. Pour toute modification urgente, joignez notre équipe directement par téléphone ou clavardage.</em>
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Voyages Évasion Soleil &bull; Tous droits réservés.
          </div>
        </div>
      </body>
    </html>
  `;

  const agencyHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: monospace, sans-serif; background-color: #f1f5f9; padding: 20px; color: #0f172a; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #cbd5e1; padding: 24px; }
          h2 { color: #338b84; margin-top: 0; }
          .line { margin: 8px 0; padding-bottom: 6px; border-bottom: 1px dashed #cbd5e1; }
          .btn { display: inline-block; background: #338b84; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>[NOUVELLE SOUMISSION ENTRANTE] - ${sub.referenceNumber}</h2>
          <div class="line"><strong>Client :</strong> ${sub.customerFirstName} ${sub.customerLastName}</div>
          <div class="line"><strong>Téléphone :</strong> <a href="tel:${sub.customerPhone}">${sub.customerPhone}</a></div>
          <div class="line"><strong>Courriel :</strong> <a href="mailto:${sub.customerEmail}">${sub.customerEmail}</a></div>
          <div class="line"><strong>Créneau d'appel :</strong> ${sub.preferredCallTime}</div>
          <div class="line"><strong>Destination :</strong> ${sub.destination}</div>
          <div class="line"><strong>Formule :</strong> ${sub.serviceType === 'vol_seul' ? '✈️ VOL SEUL (AUCUN HÔTEL)' : sub.serviceType}</div>
          ${sub.serviceType === 'vol_seul' ? '<div class="line" style="color: #b45309; font-weight: bold; background: #fef3c7; padding: 4px 8px; border-radius: 4px;">⚠️ Avis aucun hôtel : Confirmé et accepté par le client</div>' : `<div class="line"><strong>Chambres :</strong> ${sub.roomsCount || 1}</div>`}
          <div class="line"><strong>Date départ :</strong> ${sub.departureDate} (${sub.duration})</div>
          <div class="line"><strong>Aéroport :</strong> ${sub.departureCity}</div>
          ${sub.cabinClass ? `<div class="line"><strong>Classe de cabine :</strong> ✈️ ${sub.cabinClass}</div>` : ''}
          <div class="line"><strong>Voyageurs :</strong> ${sub.adultsCount} adultes, ${sub.childrenCount} enfants (${sub.childrenAges || 'N/A'})</div>
          <div class="line"><strong>Budget :</strong> ${sub.budgetPerPerson || 'Non spécifié'}</div>
          ${sub.customerNotes ? `<div class="line"><strong>Notes client :</strong> "${sub.customerNotes}"</div>` : ''}
          <div style="margin-top: 16px; font-size: 11px; color: #64748b;">
            Notifié automatiquement à l'équipe sur ${agencyRecipient}
          </div>
        </div>
      </body>
    </html>
  `;

  let customerSent = false;
  let agencySent = false;

  if (mailer && sub.customerEmail) {
    try {
      // Send customer auto-reply
      await mailer.sendMail({
        from: `"Voyages Évasion Soleil" <${customerSender}>`,
        to: sub.customerEmail,
        subject: customerSubject,
        html: customerHtml,
      });
      customerSent = true;
      console.log(`[SMTP Envoyé] Accusé de réception livré à ${sub.customerEmail} (${sub.referenceNumber})`);
    } catch (err) {
      console.error(`[SMTP Échec Client] Erreur envoi à ${sub.customerEmail}:`, err);
    }

    try {
      // Send agency alert
      await mailer.sendMail({
        from: `"Portail Évasion Soleil" <${customerSender}>`,
        to: agencyRecipient,
        subject: agencySubject,
        html: agencyHtml,
      });
      agencySent = true;
      console.log(`[SMTP Envoyé] Notification équipe livrée à ${agencyRecipient} (${sub.referenceNumber})`);
    } catch (err) {
      console.error(`[SMTP Échec Agence] Erreur envoi à ${agencyRecipient}:`, err);
    }
  } else {
    // Audit log / Mock dispatch for sandbox or when SMTP credentials are pending
    customerSent = true;
    agencySent = true;
    console.log(`[Email Service / Sandbox Dispatch]`);
    console.log(` -> Client: De <${customerSender}> à <${sub.customerEmail}> | Sujet: ${customerSubject}`);
    console.log(` -> Agence: De <${customerSender}> à <${agencyRecipient}> | Sujet: ${agencySubject}`);
  }

  return { customerEmailSent: customerSent, agencyEmailSent: agencySent };
}

export interface MartineEmailParams {
  visitorName: string;
  visitorPhone?: string;
  visitorEmail?: string;
  conversationId: string;
  messages: Array<{ sender: string; senderName?: string; text: string; timestamp?: string }>;
}

export async function sendMartineConversationEmail(params: MartineEmailParams): Promise<{ visitorSent: boolean; agencySent: boolean }> {
  const cfg = getMartineConfig();
  const mailer = getMartineTransporter();
  const martineSender = cfg.fromEmail;
  const martineSenderName = cfg.fromName;
  const agencyRecipient = process.env.NOTIFICATION_EMAIL || 'info@evasionsoleil.com';

  const formattedDate = new Date().toLocaleString('fr-CA', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const transcriptHtml = params.messages
    .map((m) => {
      const isBot = m.sender === 'bot';
      const isVisitor = m.sender === 'visitor';
      const speakerName = isBot ? 'Martine V. (Conseillère IA)' : (isVisitor ? (params.visitorName || 'Visiteur') : (m.senderName || 'Agent'));
      const bubbleBg = isBot ? '#fef3c7' : (isVisitor ? '#f1f5f9' : '#e0e7ff');
      const bubbleBorder = isBot ? '#fcd34d' : (isVisitor ? '#cbd5e1' : '#c7d2fe');
      const textColor = '#0f172a';

      return `
        <div style="margin-bottom: 12px; padding: 10px 14px; border-radius: 10px; background-color: ${bubbleBg}; border: 1px solid ${bubbleBorder};">
          <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 4px;">
            ${speakerName} ${m.timestamp ? `&bull; <span style="font-weight: normal;">${new Date(m.timestamp).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>` : ''}
          </div>
          <div style="font-size: 13px; color: ${textColor}; white-space: pre-wrap; line-height: 1.5;">${m.text}</div>
        </div>
      `;
    })
    .join('');

  const visitorHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #338b84, #205753); padding: 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 800; }
          .header p { margin: 0; font-size: 13px; opacity: 0.95; }
          .content { padding: 24px; font-size: 14px; line-height: 1.6; }
          .info-box { background: #f0f8f7; border: 1px solid #b5e1dc; border-radius: 12px; padding: 16px; margin: 16px 0; color: #143734; }
          .chat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px; text-align: center; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>Martine V. &bull; Voyages Évasion Soleil</h1>
            <p>Copie de votre échange &amp; Demande de rappel</p>
          </div>
          <div class="content">
            <p>Bonjour <strong>${params.visitorName}</strong>,</p>
            <p>C'est Martine V., conseillère chez <strong>Voyages Évasion Soleil</strong> !</p>
            <div class="info-box">
              <strong>Confirmation de vos coordonnées pour le rappel :</strong><br/>
              &bull; <strong>Nom :</strong> ${params.visitorName}<br/>
              &bull; <strong>Téléphone :</strong> ${params.visitorPhone || 'Non précisé'}<br/>
              &bull; <strong>Courriel :</strong> ${params.visitorEmail || 'Non précisé'}<br/>
              &bull; <strong>Date :</strong> ${formattedDate}
            </div>
            <p>Comme convenu lors de notre échange en direct, un conseiller voyage de notre équipe a été notifié et communiquera avec vous par téléphone au <strong>${params.visitorPhone || 'votre numéro'}</strong> pour finaliser les détails de votre projet de vacances.</p>

            <h3 style="font-size: 14px; color: #0f172a; margin-top: 24px; margin-bottom: 8px;">Transcription intégrale de notre discussion :</h3>
            <div class="chat-box">
              ${transcriptHtml}
            </div>

            <p style="font-size: 12px; color: #64748b;">
              Pour nous joindre directement : visitez <a href="https://evasionsoleil.com" style="color: #338b84; font-weight: bold;">evasionsoleil.com</a> ou écrivez-nous à <a href="mailto:info@evasionsoleil.com" style="color: #338b84;">info@evasionsoleil.com</a>.
            </p>
          </div>
          <div class="footer">
            Courriel envoyé par Martine V. (&lt;${martineSender}&gt;) &bull; &copy; ${new Date().getFullYear()} Voyages Évasion Soleil
          </div>
        </div>
      </body>
    </html>
  `;

  const agencyHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; padding: 20px; color: #e2e8f0; }
          .card { max-width: 640px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 2px solid #338b84; padding: 24px; color: #f8fafc; }
          .badge { display: inline-block; padding: 4px 10px; background: #ef4444; color: #ffffff; border-radius: 6px; font-weight: 800; font-size: 11px; margin-bottom: 12px; }
          h2 { color: #338b84; margin-top: 0; font-size: 18px; }
          .lead-box { background: #334155; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px; }
          .btn { display: inline-block; background: #338b84; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 13px; margin: 12px 0; }
          .transcript { background: #0f172a; border-radius: 8px; padding: 14px; margin-top: 16px; border: 1px solid #334155; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">⚠️ RAPPEL CLIENT DEMANDÉ - MARTINE V.</span>
          <h2>Nouvelles coordonnées capturées par Martine V.</h2>
          <div class="lead-box">
            <div><strong>Client :</strong> ${params.visitorName}</div>
            <div><strong>Téléphone :</strong> <a href="tel:${params.visitorPhone}" style="color: #38bdf8; font-weight: bold;">${params.visitorPhone || 'N/A'}</a></div>
            <div><strong>Courriel :</strong> <a href="mailto:${params.visitorEmail}" style="color: #38bdf8;">${params.visitorEmail || 'Non communiqué'}</a></div>
            <div><strong>Date & Heure :</strong> ${formattedDate}</div>
            <div><strong>Conversation ID :</strong> ${params.conversationId}</div>
          </div>

          ${params.visitorPhone ? `
          <a href="tel:${params.visitorPhone}" class="btn">
            📞 Appeler immédiatement le client (${params.visitorPhone})
          </a>
          ` : ''}

          <h3 style="font-size: 13px; color: #cbd5e1; margin-top: 18px; margin-bottom: 8px;">Transcription complète de l'échange :</h3>
          <div class="transcript">
            ${transcriptHtml}
          </div>

          <div style="margin-top: 18px; font-size: 11px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 12px;">
            Expédié automatiquement depuis <strong>${martineSender}</strong> vers <strong>${agencyRecipient}</strong>.
          </div>
        </div>
      </body>
    </html>
  `;

  let visitorSent = false;
  let agencySent = false;

  const visitorSubject = `Votre échange avec Martine V. & Demande de rappel - Voyages Évasion Soleil`;
  const agencySubject = `[RAPPEL CLIENT MARTINE V.] ${params.visitorName} (${params.visitorPhone || 'Pas de tél'}) - Discussion avec l'IA`;

  if (mailer) {
    if (params.visitorEmail) {
      try {
        await mailer.sendMail({
          from: `"Martine V. - Conseillère Voyages Évasion Soleil" <${martineSender}>`,
          to: params.visitorEmail,
          subject: visitorSubject,
          html: visitorHtml,
        });
        visitorSent = true;
        console.log(`[SMTP Martine] Copie envoyée au visiteur ${params.visitorEmail}`);
      } catch (err) {
        console.error(`[SMTP Martine Échec Visiteur] Erreur vers ${params.visitorEmail}:`, err);
      }
    }

    try {
      await mailer.sendMail({
        from: `"Martine V. - Clavardage Évasion Soleil" <${martineSender}>`,
        to: agencyRecipient,
        subject: agencySubject,
        html: agencyHtml,
      });
      agencySent = true;
      console.log(`[SMTP Martine] Alerte rappel envoyée à l'agence ${agencyRecipient}`);
    } catch (err) {
      console.error(`[SMTP Martine Échec Agence] Erreur vers ${agencyRecipient}:`, err);
    }
  } else {
    // Sandbox log
    visitorSent = Boolean(params.visitorEmail);
    agencySent = true;
    console.log(`[Martine Email / Sandbox Dispatch]`);
    console.log(` -> Expéditeur : ${martineSender}`);
    if (params.visitorEmail) {
      console.log(` -> Destinataire Visiteur : ${params.visitorEmail} | Sujet: ${visitorSubject}`);
    }
    console.log(` -> Destinataire Agence : ${agencyRecipient} | Sujet: ${agencySubject}`);
  }

  return { visitorSent, agencySent };
}

// ----------------------------------------------------
// NEWSLETTER EMAILS
// ----------------------------------------------------

export async function sendNewsletterWelcomeEmail(params: {
  email: string;
  firstName?: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const mailer = getNoReplyTransporter() || getTransporter();
  const cfg = getNoReplyConfig();
  const fromAddress = `"${cfg.fromName}" <${cfg.fromEmail}>`;

  const subject = `Bienvenue chez Voyages Évasion Soleil ! Vos offres exclusives et préférences 🌴`;
  const nameDisplay = params.firstName ? ` ${params.firstName}` : '';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Bienvenue chez Voyages Évasion Soleil</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #0f172a; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #0e7068 0%, #164e63 100%); color: #ffffff; padding: 32px 28px; text-align: center; }
    .content { padding: 32px 28px; font-size: 15px; line-height: 1.6; }
    .btn { display: inline-block; background-color: #0e7068; color: #ffffff !important; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 10px; margin: 18px 0; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; font-size: 12px; color: #64748b; text-align: center; }
    .footer a { color: #0e7068; text-decoration: underline; }
    .box { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 style="margin:0; font-size: 24px; font-weight: 800;">Voyages Évasion Soleil ☀️</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Votre infolettre des meilleures aubaines & tout-inclus</p>
    </div>
    <div class="content">
      <p>Bonjour<strong>${nameDisplay}</strong>,</p>
      <p>Merci de vous être abonné(e) à l'infolettre officielle de <strong>Voyages Évasion Soleil</strong> ! Vous ferez désormais partie des premiers informés lors de nos ventes flash, aubaines de dernière minute et spéciaux croisières.</p>

      <div class="box">
        <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 15px;">🎯 Personnalisez vos alertes vacances</h3>
        <p style="margin: 0; font-size: 13px; color: #14532d;">
          Pour recevoir uniquement les destinations qui vous font rêver (Caraïbes, Europe, Croisières) et choisir le rythme des envois :
        </p>
        <div style="text-align: center;">
          <a href="${params.preferencesUrl}" class="btn" target="_blank">⚙️ Mettre à jour mes préférences de communication</a>
        </div>
        <p style="margin: 0; font-size: 11px; text-align: center; color: #15803d;">
          Lien direct et sécurisé : <a href="${params.preferencesUrl}" style="color:#0e7068;">${params.preferencesUrl}</a>
        </p>
      </div>

      <p>Vous avez un projet de vacances imminent ? Nos conseillers sont à votre disposition :</p>
      <ul style="padding-left: 20px; font-size: 14px; color: #334155;">
        <li>📞 438-373-7076</li>
        <li>💬 Clavardage en direct avec Martine V.</li>
        <li>📧 <a href="mailto:info@evasionsoleil.com" style="color:#0e7068;">info@evasionsoleil.com</a></li>
      </ul>
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">Vous recevez ce courriel car vous vous êtes inscrit(e) sur notre site evasionsoleil.com.</p>
      <p style="margin: 0;">
        <a href="${params.preferencesUrl}">Préférences</a> • 
        <a href="${params.unsubscribeUrl}">Se désabonner à tout moment</a>
      </p>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #94a3b8;">© Voyages Évasion Soleil Inc. - Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>`;

  if (mailer) {
    try {
      await mailer.sendMail({
        from: fromAddress,
        to: params.email,
        subject,
        html,
      });
      console.log(`[Newsletter SMTP] Bienvenue envoyé à ${params.email}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[Newsletter SMTP Error] Échec pour ${params.email}:`, err);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`[Newsletter Sandbox] Email de bienvenue simulé pour : ${params.email}`);
    console.log(` -> Sujet: ${subject}`);
    console.log(` -> Lien préférences: ${params.preferencesUrl}`);
    console.log(` -> Lien désabonnement: ${params.unsubscribeUrl}`);
    return { success: true };
  }
}

export async function sendNewsletterCampaignEmail(params: {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  contentHtml: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const mailer = getNoReplyTransporter() || getTransporter();
  const cfg = getNoReplyConfig();
  const fromAddress = `"${cfg.fromName}" <${cfg.fromEmail}>`;

  const finalHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${params.subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #0f172a; }
    .card { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #0e7068 0%, #164e63 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
    .content { padding: 32px 28px; font-size: 15px; line-height: 1.6; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; font-size: 12px; color: #64748b; text-align: center; }
    .footer a { color: #0e7068; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 style="margin:0; font-size: 22px; font-weight: 800;">Voyages Évasion Soleil 🌴</h1>
      <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;">Offre spéciale & Actualités exclusives</p>
    </div>
    <div class="content">
      ${params.recipientName ? `<p style="font-weight: 600; color: #334155;">Bonjour ${params.recipientName},</p>` : ''}
      ${params.contentHtml}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">Vous recevez cette offre en tant qu'abonné à la newsletter Évasion Soleil.</p>
      <p style="margin: 0;">
        <a href="${params.preferencesUrl}">Gérer mes préférences de communication</a> • 
        <a href="${params.unsubscribeUrl}">Se désabonner de cette liste</a>
      </p>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #94a3b8;">© Voyages Évasion Soleil Inc. - 438-373-7076</p>
    </div>
  </div>
</body>
</html>`;

  if (mailer) {
    try {
      await mailer.sendMail({
        from: fromAddress,
        to: params.recipientEmail,
        subject: params.subject,
        html: finalHtml,
      });
      return { success: true };
    } catch (err: any) {
      console.error(`[Newsletter Send Error vers ${params.recipientEmail}]:`, err);
      return { success: false, error: err.message };
    }
  } else {
    // Sandbox
    return { success: true };
  }
}

/**
 * Envoi du code de vérification à 6 chiffres pour la réinitialisation du mot de passe
 */
export async function sendPasswordResetVerificationEmail(params: {
  recipientEmail: string;
  userName: string;
  verificationCode: string;
  resetLink?: string;
}): Promise<{ success: boolean; error?: string }> {
  const cfg = getNoReplyConfig();
  const mailer = getNoReplyTransporter() || getTransporter();
  const fromAddress = `"${cfg.fromName}" <${cfg.fromEmail}>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Code de vérification - Réinitialisation de mot de passe</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #0e7068 0%, #143734 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
    .content { padding: 32px 24px; }
    .code-box { background: #f0fdf4; border: 2px dashed #34d399; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #065f46; font-family: Courier, monospace; }
    .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0; font-size: 20px; font-weight: 800;">Voyages Évasion Soleil</h1>
      <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 12px;">Portail Collaborateur Sécurisé</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; margin-top: 0;">Bonjour <strong>${params.userName}</strong>,</p>
      <p style="font-size: 13px; line-height: 1.5; color: #475569;">
        Vous avez demandé la réinitialisation du mot de passe de votre compte collaborateur (<strong>${params.recipientEmail}</strong>).
      </p>
      
      <div class="code-box">
        <span style="display:block; font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
          Votre Code de Vérification
        </span>
        <div class="code">${params.verificationCode}</div>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #059669; font-weight: 500;">
          ⏱️ Ce code expire dans 15 minutes.
        </p>
      </div>

      ${params.resetLink ? `
      <div style="text-align: center; margin: 20px 0;">
        <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Ou utilisez directement ce lien sécurisé :</p>
        <a href="${params.resetLink}" style="display: inline-block; background: #338b84; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: 700; font-size: 13px;">
          Accéder au formulaire de réinitialisation
        </a>
      </div>
      ` : ''}

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; line-height: 1.4;">
        Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message en toute sécurité. Vos accès demeurent protégés.
      </p>
    </div>
    <div class="footer">
      <p style="margin:0;">Évasion Soleil - Sécurité & Gestion des Identités Collaborateurs</p>
    </div>
  </div>
</body>
</html>`;

  if (mailer) {
    try {
      await mailer.sendMail({
        from: fromAddress,
        to: params.recipientEmail,
        subject: `🔑 Code de vérification [${params.verificationCode}] - Évasion Soleil`,
        html,
      });
      console.log(`[Email Service] Code de réinitialisation envoyé avec succès à ${params.recipientEmail}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[Email Service Error vers ${params.recipientEmail}]:`, err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`[Email Service Simulé / Dev] Code pour ${params.recipientEmail} : ${params.verificationCode}`);
    return { success: true };
  }
}

/**
 * Envoi des 3 propositions de soumission de voyage par le conseiller
 * Envoyé au client ET obligatoirement archivé à info@evasionsoleil.com
 * Inclut la mention légale sur la fluctuation des prix sans réservation.
 */
export async function sendSubmissionProposalsEmail(
  submission: QuoteSubmission,
  payload: SubmissionProposalsPayload
): Promise<{ success: boolean; error?: string; simulated?: boolean }> {
  const mailer = getNoReplyTransporter();
  const cfg = getNoReplyConfig();
  const fromAddress = `"${payload.advisorName} - Voyages Évasion Soleil" <${cfg.fromEmail}>`;
  const replyToAddress = payload.advisorEmail || 'info@evasionsoleil.com';
  const agencyArchiveEmail = payload.agencyEmail || 'info@evasionsoleil.com';
  const proposalCount = Array.isArray(payload.proposals) && payload.proposals.length > 0 ? payload.proposals.length : 1;

  // Préparer la liste CC : archivage agence + conseiller obligatoire en CC
  const ccRecipients: string[] = [agencyArchiveEmail];
  if (payload.advisorEmail && payload.advisorEmail.includes('@') && !ccRecipients.includes(payload.advisorEmail)) {
    ccRecipients.push(payload.advisorEmail);
  }

  const proposalsHtml = payload.proposals
    .map((prop, idx) => {
      const optionColors = [
        { bg: '#f0fdfa', border: '#0d9488', badge: '#0f766e', text: '#134e4a', defaultName: 'Option 1 : Recommandée / Coup de Cœur' },
        { bg: '#eff6ff', border: '#3b82f6', badge: '#1d4ed8', text: '#1e3a8a', defaultName: 'Option 2 : Choix demandé par le client' },
        { bg: '#faf5ff', border: '#a855f7', badge: '#7e22ce', text: '#581c87', defaultName: 'Option 3 : Alternative / Meilleur Rapport Qualité-Prix' },
      ];
      const opt = optionColors[idx % 3];

      return `
      <div style="background-color: ${opt.bg}; border: 1.5px solid ${opt.border}; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 12px; margin-bottom: 14px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="display: inline-block; background: ${opt.badge}; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                ${prop.title || opt.defaultName}
              </span>
              ${prop.supplier ? `
              <span style="display: inline-block; background: #ffffff; border: 1px solid #cbd5e1; color: #334155; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px;">
                🏢 Voyagiste : ${prop.supplier}
              </span>` : ''}
            </div>
            <h3 style="margin: 8px 0 0 0; font-size: 18px; font-weight: 800; color: ${opt.text};">
              ${prop.hotelOrCruiseName || 'Séjour sélectionné'}
            </h3>
          </div>
          <div style="text-align: right; min-width: 140px;">
            <div style="font-size: 20px; font-weight: 900; color: #0f766e;">
              ${prop.pricePerPerson || 'Prix sur demande'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600;">
              Total : ${prop.totalPrice || 'Taxes incluses'}
            </div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155; margin-bottom: 12px;">
          ${prop.destination ? `
          <tr>
            <td style="padding: 5px 0; font-weight: 700; width: 160px; color: #475569;">📍 Destination :</td>
            <td style="padding: 5px 0; font-weight: 600; color: #0f172a;">${prop.destination}</td>
          </tr>` : ''}
          ${prop.arrivalAirportOrPort ? `
          <tr>
            <td style="padding: 5px 0; font-weight: 700; color: #475569;">🛬 Aéroport / Port d'arrivée :</td>
            <td style="padding: 5px 0; font-weight: 700; color: #0f766e;">${prop.arrivalAirportOrPort}</td>
          </tr>` : ''}
          ${prop.departureCity || prop.airlineAndFlight ? `
          <tr>
            <td style="padding: 5px 0; font-weight: 700; color: #475569;">✈️ Départ & Trajet :</td>
            <td style="padding: 5px 0;">${prop.departureCity ? `Départ de <strong>${prop.departureCity}</strong>` : ''} ${prop.airlineAndFlight ? `&bull; ${prop.airlineAndFlight}` : ''}</td>
          </tr>` : ''}
          ${prop.departureFlightDate || prop.departureFlightNumber ? `
          <tr>
            <td style="padding: 5px 0; font-weight: 700; color: #475569;">🛫 Vol Aller :</td>
            <td style="padding: 5px 0; color: #0f172a;">
              ${prop.departureFlightNumber ? `Vol <strong>${prop.departureFlightNumber}</strong> &bull; ` : ''}
              ${prop.departureFlightDate ? `Départ : <strong>${prop.departureFlightDate}</strong>` : 'Horaire à confirmer'}
            </td>
          </tr>` : ''}
          ${prop.returnFlightDate || prop.returnFlightNumber ? `
          <tr>
            <td style="padding: 5px 0; font-weight: 700; color: #475569;">🛬 Vol Retour :</td>
            <td style="padding: 5px 0; color: #0f172a;">
              ${prop.returnFlightNumber ? `Vol <strong>${prop.returnFlightNumber}</strong> &bull; ` : ''}
              ${prop.returnFlightDate ? `Départ : <strong>${prop.returnFlightDate}</strong>` : 'Horaire à confirmer'}
            </td>
          </tr>` : ''}
          ${prop.datesAndDuration ? `
          <tr>
            <td style="padding: 5px 0; font-weight: 700; color: #475569;">📅 Dates & Durée :</td>
            <td style="padding: 5px 0; font-weight: 600;">${prop.datesAndDuration}</td>
          </tr>` : ''}
          ${prop.roomOrCabinType ? `
          <tr>
            <td style="padding: 5px 0; font-weight: 700; color: #475569;">🛏️ Hébergement :</td>
            <td style="padding: 5px 0;">${prop.roomOrCabinType}</td>
          </tr>` : ''}
        </table>

        ${prop.inclusions ? `
        <div style="background: rgba(255,255,255,0.85); border-radius: 8px; padding: 10px 12px; margin-top: 8px; font-size: 12px; color: #334155; border: 1px solid rgba(0,0,0,0.05);">
          <strong style="color: #0f766e;">✅ Inclusions du forfait :</strong><br/>
          ${prop.inclusions.replace(/\n/g, '<br/>')}
        </div>` : ''}

        ${prop.advisorHighlight ? `
        <div style="background: #fffbeb; border-left: 3px solid #f59e0b; padding: 8px 12px; margin-top: 10px; font-size: 12px; color: #92400e; border-radius: 0 6px 6px 0;">
          <strong>💡 Le mot du conseiller :</strong> ${prop.advisorHighlight}
        </div>` : ''}
      </div>`;
    })
    .join('');

  const subjectTitle = proposalCount === 1
    ? `☀️ Votre Proposition de Soumission Voyage [Réf: ${submission.referenceNumber}] - Évasion Soleil`
    : `☀️ Vos ${proposalCount} Propositions de Soumission Voyage [Réf: ${submission.referenceNumber}] - Évasion Soleil`;

  const htmlTitle = proposalCount === 1
    ? `☀️ Votre Proposition de Devis Voyage`
    : `☀️ Vos ${proposalCount} Propositions de Devis Voyage`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${subjectTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; }
    .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); color: #ffffff; padding: 28px 24px; }
    .content { padding: 24px; }
    .disclaimer-box { background: #fff7ed; border: 2px solid #ea580c; border-radius: 10px; padding: 16px; margin: 24px 0; color: #9a3412; font-size: 12.5px; line-height: 1.55; }
    .advisor-box { background: #f1f5f9; border-radius: 12px; padding: 18px; margin-top: 24px; font-size: 13px; color: #334155; border: 1px solid #e2e8f0; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #99f6e4; font-weight: 700; margin-bottom: 4px;">
        Voyages Évasion Soleil • Dossier ${submission.referenceNumber}
      </div>
      <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff;">
        ${htmlTitle}
      </h1>
      <p style="margin: 0; font-size: 13px; color: #ccfbf1;">
        Préparé${proposalCount > 1 ? 'es' : 'e'} spécialement pour <strong>${submission.customerFirstName} ${submission.customerLastName}</strong>
      </p>
    </div>

    <div class="content">
      <!-- Message personnalisé du conseiller -->
      <div style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px; background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
        ${payload.advisorMessage ? payload.advisorMessage.replace(/\n/g, '<br/>') : `
        Bonjour <strong>${submission.customerFirstName}</strong>,<br/><br/>
        Merci de votre confiance envers <strong>Voyages Évasion Soleil</strong> ! Suite à votre demande de devis (Réf: <strong>${submission.referenceNumber}</strong>), j'ai préparé pour vous <strong>${proposalCount === 1 ? 'votre proposition de voyage détaillée' : `vos ${proposalCount} options de voyage comparatives`}</strong> adaptées à vos souhaits. N'hésitez pas à me joindre pour toute question ou pour valider votre réservation sans tarder.`}
      </div>

      <!-- Récapitulatif de la demande initiale -->
      <div style="background: #f8fafc; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #64748b; border: 1px solid #e2e8f0;">
        <strong>📋 Rappel de votre demande :</strong> ${submission.destination} • Départ : ${submission.departureCity} • Durée : ${submission.duration} • Voyageurs : ${submission.adultsCount} Adulte(s)${submission.childrenCount ? `, ${submission.childrenCount} Enfant(s)` : ''}
      </div>

      <!-- Propositions -->
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; font-weight: 800; color: #0f766e; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
          ✈️ ${proposalCount === 1 ? 'Votre Offre Sélectionnée' : `Vos ${proposalCount} Options Comparatives`}
        </h2>
        ${proposalsHtml}
      </div>

      <!-- MENTION RÉGLEMENTAIRE FIGÉE ET OBLIGATOIRE SUR LES TARIFS -->
      <div class="disclaimer-box">
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 20px; line-height: 1;">🔒</span>
          <div>
            <strong style="color: #c2410c; font-size: 13px; display: block; margin-bottom: 4px;">
              AVIS OFFICIEL SUR LES PRIX ET DISPONIBILITÉS :
            </strong>
            Les prix et disponibilités indiqués dans cette soumission sont valables uniquement au moment précis de l'envoi. Sans réservation confirmée et paiement effectué auprès des voyagistes ou transporteurs, les tarifs demeurent assujettis aux variations du marché en temps réel et peuvent augmenter ou réduire sans préavis.
          </div>
        </div>
      </div>

      <!-- Coordonnées complètes du conseiller et de l'agence -->
      <div class="advisor-box">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 10px;">
          <div>
            <div style="font-weight: 800; color: #0f766e; font-size: 15px;">
              👤 ${payload.advisorName}
            </div>
            <div style="font-size: 12px; color: #64748b; font-weight: 600;">
              ${payload.advisorRole || 'Conseiller(ère) en voyages certifié(e)'}
            </div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #0f766e; font-weight: 700;">
            Voyages Évasion Soleil
          </div>
        </div>

        <p style="margin: 0 0 6px 0; font-size: 13px; line-height: 1.6;">
          📞 Ligne directe / Téléphone : <strong>${payload.advisorPhone || '438-373-7076'}</strong><br/>
          ✉️ Courriel direct : <a href="mailto:${replyToAddress}" style="color: #0f766e; font-weight: 700;">${replyToAddress}</a><br/>
          🏢 Siège & Agence centrale : <a href="mailto:info@evasionsoleil.com" style="color: #0f766e;">info@evasionsoleil.com</a>
        </p>
        <div style="background: #ffffff; border-radius: 6px; padding: 8px 12px; margin-top: 10px; font-size: 12px; color: #475569; border: 1px solid #e2e8f0;">
          💡 <strong>Besoin de bloquer cette offre ?</strong> Répondez directement à ce courriel ou communiquez immédiatement avec votre conseiller pour verrouiller vos places avant toute variation tarifaire du voyagiste.
        </div>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155;">Voyages Évasion Soleil Inc.</p>
      <p style="margin: 0 0 4px 0;">Spécialiste québécois des forfaits Sud tout-inclus, circuits et croisières de rêve</p>
      <p style="margin: 0; color: #94a3b8;">
        Destinataire : <strong>${submission.customerEmail}</strong> &bull; Copie conforme (CC) : <strong>${ccRecipients.join(', ')}</strong>
      </p>
    </div>
  </div>
</body>
</html>`;

  if (mailer) {
    try {
      await mailer.sendMail({
        from: fromAddress,
        to: submission.customerEmail,
        cc: ccRecipients, // CC = archivage agence + conseiller
        replyTo: replyToAddress,
        subject: subjectTitle,
        html,
      });
      console.log(`[Email Service] ${proposalCount} Proposition(s) envoyée(s) à ${submission.customerEmail} et CC à ${ccRecipients.join(', ')}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[Email Service Error Envoi Propositions]:`, err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`[Email Service Simulé / Dev] 3 Propositions envoyées à ${submission.customerEmail} (copie archivée à ${agencyArchiveEmail})`);
    return { success: true, simulated: true };
  }
}

/**
 * Envoi de facture officielle & lien de paiement sécurisé Stripe au client
 */
export async function sendInvoicePaymentEmail(
  invoice: Invoice,
  advisorName?: string,
  advisorEmail?: string
): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
  const mailer = getNoReplyTransporter();
  const noReplyConfig = getNoReplyConfig();

  const fromAddress = `"${noReplyConfig.fromName}" <${noReplyConfig.fromEmail}>`;
  const replyToAddress = advisorEmail && advisorEmail.trim() ? advisorEmail.trim() : 'info@evasionsoleil.com';
  const agencyArchiveEmail = 'info@evasionsoleil.com';

  const ccRecipients = [agencyArchiveEmail];
  if (advisorEmail && advisorEmail.includes('@') && advisorEmail.trim() !== agencyArchiveEmail) {
    ccRecipients.unshift(advisorEmail.trim());
  }

  const subjectTitle = `💳 Votre Facture de Voyage ${invoice.invoiceNumber} • Évasion Soleil (Lien de Paiement Sécurisé)`;

  const itemsHtml = invoice.items
    .map(
      (it, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
        <td style="padding: 12px 14px; vertical-align: top;">
          <strong style="color: #0f172a; font-size: 13px;">${it.title}</strong>
          ${it.description ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${it.description}</div>` : ''}
        </td>
        <td style="padding: 12px 14px; text-align: center; vertical-align: top; color: #334155; font-size: 12px;">
          ${it.quantity}
        </td>
        <td style="padding: 12px 14px; text-align: right; vertical-align: top; color: #334155; font-size: 12px;">
          ${it.unitPrice.toFixed(2)} $ CAD
        </td>
        <td style="padding: 12px 14px; text-align: right; vertical-align: top; font-weight: 700; color: #0f172a; font-size: 13px;">
          ${it.total.toFixed(2)} $ CAD
        </td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0d9488 0%, #042f2e 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .content { padding: 28px 24px; }
    .btn-pay { display: inline-block; background: linear-gradient(135deg, #0d9488, #0f766e); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 800; font-size: 15px; margin: 20px 0; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35); text-align: center; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">💳 Facture & Paiement Sécurisé</div>
      <h1 style="margin: 12px 0 4px 0; font-size: 22px; font-weight: 800;">Voyages Évasion Soleil</h1>
      <p style="margin: 0; font-size: 13px; opacity: 0.9;">Votre dossier de vacances est prêt pour confirmation immédiate</p>
    </div>

    <div class="content">
      <p style="font-size: 15px; margin-top: 0;">Bonjour <strong>${invoice.clientName}</strong>,</p>
      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        Veuillez trouver ci-dessous le détail de votre facture <strong>${invoice.invoiceNumber}</strong> émise par votre conseiller voyages chez <strong>Évasion Soleil</strong>.
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span><strong>Facture N° :</strong> ${invoice.invoiceNumber}</span>
          <span><strong>Date d'émission :</strong> ${new Date(invoice.createdAt).toLocaleDateString('fr-CA')}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span><strong>Date d'échéance :</strong> ${invoice.dueDate}</span>
          <span><strong>Statut :</strong> <span style="color: #0d9488; font-weight: 700;">En attente de paiement</span></span>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-size: 12px;">
            <th style="padding: 10px 14px; text-align: left;">Prestation</th>
            <th style="padding: 10px 14px; text-align: center;">Qté</th>
            <th style="padding: 10px 14px; text-align: right;">Prix Unit.</th>
            <th style="padding: 10px 14px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Totals Table -->
      <div style="width: 260px; margin-left: auto; margin-top: 12px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #475569;">
          <span>Sous-total :</span>
          <span>${invoice.subtotal.toFixed(2)} $ CAD</span>
        </div>
        ${!invoice.taxExempt && invoice.taxTPS > 0 ? `
        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #475569;">
          <span>TPS (5%) :</span>
          <span>${invoice.taxTPS.toFixed(2)} $ CAD</span>
        </div>` : ''}
        ${!invoice.taxExempt && invoice.taxTVQ > 0 ? `
        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #475569;">
          <span>TVQ (9.975%) :</span>
          <span>${invoice.taxTVQ.toFixed(2)} $ CAD</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 2px solid #0f172a; font-size: 16px; font-weight: 900; color: #0f172a;">
          <span>Total à payer :</span>
          <span style="color: #0d9488;">${invoice.total.toFixed(2)} $ CAD</span>
        </div>
      </div>

      <!-- Stripe Button CTA -->
      <div style="text-align: center; margin: 28px 0 16px 0;">
        <a href="${invoice.stripePaymentLink}" target="_blank" class="btn-pay">
          💳 Payer en ligne en toute sécurité via Stripe &rarr;
        </a>
        <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">
          Paiement 100% sécurisé chiffré SSL 256-bit par Stripe &bull; Visa, MasterCard, Amex, Apple Pay
        </p>
      </div>

      ${invoice.requireIdentityVerification ? `
      <!-- Bloc Exigence Vérification d'Identité -->
      <div style="background: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #1e3a8a;">
        <div style="font-weight: 800; font-size: 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          🛡️ VÉRIFICATION D'IDENTITÉ REQUISE (Procédure Sécurisée Stripe Identity)
        </div>
        <p style="margin: 0 0 6px 0; line-height: 1.5;">
          Conformément aux normes de sécurité aérienne et de protection contre la fraude, une copie de votre pièce d'identité officielle (<strong>${invoice.identityDocumentType === 'permis_conduire' ? 'Permis de conduire officiel' : 'Passeport valide'}</strong>) est exigée pour valider l'émission de vos titres de transport et confirmer votre dossier voyage.
        </p>
        <p style="margin: 0; font-size: 12px; color: #2563eb;">
          La vérification s'effectue en quelques secondes depuis votre téléphone ou ordinateur lors de l'accès au paiement sécurisé.
        </p>
      </div>` : ''}

      ${invoice.notes ? `
      <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px; font-size: 12px; color: #92400e; margin-top: 16px;">
        <strong>Remarque de votre conseiller :</strong><br/>
        ${invoice.notes}
      </div>` : ''}

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        <p style="margin: 0 0 4px 0;"><strong>Conseiller en charge :</strong> ${advisorName || invoice.createdByUserName || 'Équipe Évasion Soleil'}</p>
        <p style="margin: 0;">Courriel : <a href="mailto:${replyToAddress}" style="color: #0d9488;">${replyToAddress}</a> &bull; Téléphone : 438-373-7076</p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px 0; font-weight: 700;">Voyages Évasion Soleil Inc.</p>
      <p style="margin: 0;">Titulaire d'un permis d'agence de voyages du Québec &bull; Protection du Fonds d'indemnisation FICAV</p>
    </div>
  </div>
</body>
</html>`;

  if (mailer) {
    try {
      await mailer.sendMail({
        from: fromAddress,
        to: invoice.clientEmail,
        cc: ccRecipients,
        replyTo: replyToAddress,
        subject: subjectTitle,
        html,
      });
      console.log(`[Email Service] Facture ${invoice.invoiceNumber} envoyée à ${invoice.clientEmail} avec lien Stripe`);
      return { success: true };
    } catch (err: any) {
      console.error(`[Email Service Error Facture]:`, err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`[Email Service Simulé] Facture ${invoice.invoiceNumber} envoyée à ${invoice.clientEmail} avec lien Stripe: ${invoice.stripePaymentLink}`);
    return { success: true, simulated: true };
  }
}

/**
 * Envoi d'un document légal au client avec pièce jointe PDF et lien de signature électronique
 */
export async function sendLegalDocumentEmail(
  doc: LegalDocument,
  advisorName?: string,
  advisorEmail?: string,
  customMessage?: string,
  appOrigin?: string
): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
  const mailer = getNoReplyTransporter();
  const cfg = getNoReplyConfig();

  const senderName = advisorName || doc.sentByAdvisorName || 'Voyages Évasion Soleil';
  const replyToAddress = advisorEmail || 'info@evasionsoleil.com';
  const fromAddress = `"${senderName} - Évasion Soleil" <${cfg.fromEmail}>`;

  const subjectTitle = `📑 Document à signer : ${doc.title} - Voyages Évasion Soleil`;
  const baseUrl = appOrigin || process.env.APP_URL || process.env.BASE_URL || 'https://employee.evasionsoleil.com';
  const signatureUrl = `${baseUrl}/#sign_doc=${doc.signatureToken || doc.id}`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${doc.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0e7068 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
    .content { padding: 28px 24px; font-size: 14px; line-height: 1.6; }
    .btn-sign { display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #047857 100%); color: #ffffff !important; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 15px; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3); }
    .attachment-box { background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 14px 18px; margin: 18px 0; display: flex; align-items: center; justify-content: space-between; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Voyages Évasion Soleil ☀️</h1>
      <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;">Gestion Électronique des Documents & Contrats Clients</p>
    </div>

    <div class="content">
      <p>Bonjour <strong>${doc.clientName}</strong>,</p>

      <p>Votre conseiller en voyages vous a transmis le document officiel suivant pour consultation et signature électronique :</p>

      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 4px 0; color: #065f46; font-size: 15px;">📑 ${doc.title}</h3>
        <p style="margin: 0; font-size: 12px; color: #047857;">
          Catégorie : <strong>${doc.category.toUpperCase().replace('_', ' ')}</strong> ${doc.submissionRef ? `&bull; Réf: <strong>${doc.submissionRef}</strong>` : ''}
        </p>
        ${doc.contentSummary ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #064e3b;">${doc.contentSummary}</p>` : ''}
      </div>

      ${customMessage ? `
      <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px; font-size: 13px; color: #92400e; margin: 16px 0;">
        <strong>Message de votre conseiller (${senderName}) :</strong><br/>
        ${customMessage}
      </div>` : ''}

      <!-- Pièce Jointe Attachée Info -->
      <div class="attachment-box">
        <div>
          <strong style="color: #0f172a; font-size: 13px;">📎 Pièce jointe incluse :</strong>
          <div style="font-size: 12px; color: #475569;">${doc.fileAttachmentName || 'Document_Officiel.pdf'} (${doc.fileAttachmentSize || 'PDF officiel'})</div>
        </div>
        <span style="background: #e2e8f0; color: #334155; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold;">PDF Joint</span>
      </div>

      <!-- Bouton Signature Électronique -->
      <div style="text-align: center; margin: 26px 0 16px 0;">
        <a href="${signatureUrl}" target="_blank" class="btn-sign">
          ✍️ Consulter & Signer Électroniquement en 1 Clic &rarr;
        </a>
        <p style="font-size: 11px; color: #64748b; margin: 6px 0 0 0;">
          Signature électronique certifiée, horodatée et reconnue légalement au Québec.
        </p>
      </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        <p style="margin: 0 0 4px 0;"><strong>Conseiller :</strong> ${senderName}</p>
        <p style="margin: 0;">Courriel : <a href="mailto:${replyToAddress}" style="color: #0d9488;">${replyToAddress}</a> &bull; Téléphone : 438-373-7076</p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px 0; font-weight: 700;">Voyages Évasion Soleil Inc.</p>
      <p style="margin: 0;">Titulaire d'un permis d'agence de voyages du Québec &bull; Protection du Fonds d'indemnisation FICAV</p>
    </div>
  </div>
</body>
</html>`;

  // Préparation de la pièce jointe
  const attachments: any[] = [];
  const fileName = doc.fileAttachmentName || `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  if (doc.fileAttachmentBase64) {
    const base64Data = doc.fileAttachmentBase64.includes('base64,')
      ? doc.fileAttachmentBase64.split('base64,')[1]
      : doc.fileAttachmentBase64;
    attachments.push({
      filename: fileName,
      content: Buffer.from(base64Data, 'base64'),
      contentType: 'application/pdf',
    });
  } else {
    // Fichier PDF texte officiel structuré
    const textContent = `%PDF-1.4\n% DÉCLARATION OFFICIELLE VOYAGES ÉVASION SOLEIL\n\nTITRE: ${doc.title}\nCLIENT: ${doc.clientName} (${doc.clientEmail})\nDATE: ${doc.createdAt}\nCONSEILLER: ${senderName}\n\nCONTENU DU DOCUMENT:\n${doc.documentBodyHtml || doc.contentSummary || 'Document contractuel de voyage.'}\n\nSTATUT: En attente de signature électronique.\n`;
    attachments.push({
      filename: fileName,
      content: Buffer.from(textContent, 'utf-8'),
      contentType: 'application/pdf',
    });
  }

  if (mailer) {
    try {
      await mailer.sendMail({
        from: fromAddress,
        to: doc.clientEmail,
        replyTo: replyToAddress,
        subject: subjectTitle,
        html,
        attachments,
      });
      console.log(`[Email Service Legal] Document ${doc.title} envoyé avec pièce jointe à ${doc.clientEmail}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[Email Service Error Legal]:`, err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`[Email Service Simulé Legal] Document ${doc.title} envoyé avec pièce jointe (${fileName}) à ${doc.clientEmail}`);
    return { success: true, simulated: true };
  }
}




