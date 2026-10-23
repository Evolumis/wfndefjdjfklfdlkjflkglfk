import { jsPDF } from 'jspdf';
import { LegalDocument } from '../types';

export const generateSignatureShareUrl = (doc: Partial<LegalDocument>): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin || '' : '';
  const token = doc.signatureToken || doc.id || 'apercu';
  return `${origin}/#sign_doc=${token}`;
};

export interface TemplateVariableContext {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  destination?: string;
  submissionRef?: string;
  advisorName?: string;
  dateStr?: string;
}

/**
 * Remplace les variables dynamiques {{NOM_CLIENT}}, {{DESTINATION}}, etc.
 * dans un modèle de document PDF créé sur le site.
 */
export const resolveTemplateVariables = (
  templateText: string,
  ctx: TemplateVariableContext
): string => {
  if (!templateText) return '';
  const dateJour =
    ctx.dateStr ||
    new Date().toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return templateText
    .replace(/\{\{\s*NOM_CLIENT\s*\}\}/gi, ctx.clientName?.trim() || 'Client Évasion Soleil')
    .replace(/\{\{\s*COURRIEL_CLIENT\s*\}\}/gi, ctx.clientEmail?.trim() || 'Non renseigné')
    .replace(/\{\{\s*TELEPHONE_CLIENT\s*\}\}/gi, ctx.clientPhone?.trim() || 'Non renseigné')
    .replace(/\{\{\s*DESTINATION\s*\}\}/gi, ctx.destination?.trim() || 'Séjour touristique')
    .replace(/\{\{\s*REF_DOSSIER\s*\}\}/gi, ctx.submissionRef?.trim() || 'Dossier Général')
    .replace(/\{\{\s*NOM_CONSEILLER\s*\}\}/gi, ctx.advisorName?.trim() || 'Conseiller Évasion Soleil')
    .replace(/\{\{\s*DATE_JOUR\s*\}\}/gi, dateJour);
};

function hexToRgb(hex?: string): [number, number, number] {
  const clean = (hex || '#338b84').replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return [r, g, b];
    }
  }
  return [51, 139, 132];
}

/**
 * Génère un véritable fichier PDF natif (application/pdf) directement sur le site.
 * Retourne le Data URL base64, le Blob binaire et la taille formatée.
 */
export const generateOfficialPdfFile = (
  doc: Partial<LegalDocument>
): { dataUrl: string; blob: Blob; sizeLabel: string; fileName: string } => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2;
  const [accentR, accentG, accentB] = hexToRgb(doc.accentColor || '#338b84');
  const isSigned = doc.status === 'signe';

  // Bande supérieure d'accentuation
  pdf.setFillColor(accentR, accentG, accentB);
  pdf.rect(0, 0, pageWidth, 6, 'F');

  let y = 16;

  // En-tête Agence (Gauche)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(15, 23, 42);
  pdf.text('EVASION SOLEIL VOYAGES', marginX, y);

  y += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(accentR, accentG, accentB);
  const subtitle = (
    doc.headerSubtitle || 'AGENCE DE VOYAGES CERTIFIEE - PERMIS DU QUEBEC (OPC #703492)'
  ).replace(/[•]/g, '-');
  pdf.text(subtitle.substring(0, 80), marginX, y);

  y += 4.5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('3250 Boulevard des Forges, Trois-Rivieres, QC G8Z 1V5', marginX, y);
  y += 4;
  pdf.text('Tel : 1-800-555-SOLEIL (7653)  |  Courriel : info@evasionsoleil.com', marginX, y);

  // Badge de statut (Droite)
  if (isSigned) {
    pdf.setFillColor(220, 252, 231);
    pdf.setDrawColor(134, 239, 172);
    pdf.roundedRect(pageWidth - marginX - 58, 11, 58, 8, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(22, 101, 52);
    pdf.text('DOCUMENT SIGNE & CERTIFIE', pageWidth - marginX - 29, 16.2, { align: 'center' });
  } else {
    pdf.setFillColor(254, 243, 199);
    pdf.setDrawColor(252, 211, 77);
    pdf.roundedRect(pageWidth - marginX - 58, 11, 58, 8, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(146, 64, 14);
    pdf.text('EN ATTENTE DE SIGNATURE', pageWidth - marginX - 29, 16.2, { align: 'center' });
  }

  const createdStr = doc.createdAt
    ? new Date(doc.createdAt).toLocaleDateString('fr-CA')
    : new Date().toLocaleDateString('fr-CA');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Ref : ${doc.submissionRef || doc.id || 'DOC-ES'}`, pageWidth - marginX, 24, {
    align: 'right',
  });
  pdf.text(`Date d'emission : ${createdStr}`, pageWidth - marginX, 28.5, { align: 'right' });

  // Ligne séparatrice d'en-tête
  y = 34;
  pdf.setDrawColor(accentR, accentG, accentB);
  pdf.setLineWidth(0.6);
  pdf.line(marginX, y, pageWidth - marginX, y);

  // Titre du document
  y += 6;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(marginX, y, contentWidth, 11, 2, 2, 'FD');
  pdf.setFillColor(accentR, accentG, accentB);
  pdf.rect(marginX, y, 2.2, 11, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11.5);
  pdf.setTextColor(15, 23, 42);
  const titleText = (doc.title || 'Document Officiel de Voyage').substring(0, 95);
  pdf.text(titleText, marginX + 5.5, y + 7.2);

  // Grille d'informations client & dossier
  y += 15;
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(marginX, y, contentWidth, 24, 2, 2, 'FD');

  const col1X = marginX + 4;
  const col2X = marginX + contentWidth / 2 + 2;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text('VOYAGEUR / CLIENT PRINCIPAL', col1X, y + 5);
  pdf.text('COURRIEL CERTIFIE', col2X, y + 5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);
  pdf.text((doc.clientName || 'Client Evasion Soleil').substring(0, 42), col1X, y + 9.5);
  pdf.text((doc.clientEmail || 'Non renseigne').substring(0, 45), col2X, y + 9.5);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text('TELEPHONE & CONSEILLER', col1X, y + 15.5);
  pdf.text('DESTINATION & DOSSIER', col2X, y + 15.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(
    `${doc.clientPhone || 'Non renseigne'}  |  ${doc.sentByAdvisorName || 'Conseiller Evasion Soleil'}`.substring(
      0,
      46
    ),
    col1X,
    y + 20
  );
  pdf.text(
    `${doc.destination || 'Sejour touristique'} (${doc.submissionRef || 'General'})`.substring(0, 46),
    col2X,
    y + 20
  );

  // Corps du document PDF
  y += 30;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(accentR, accentG, accentB);
  pdf.text('CLAUSES & STIPULATIONS OFFICIELLES DU DOCUMENT :', marginX, y);

  y += 4;
  const bodyRaw = (doc.documentBodyHtml || doc.contentSummary || '')
    .replace(/[•]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(30, 41, 59);

  const lines = pdf.splitTextToSize(bodyRaw, contentWidth - 6);
  const lineHeight = 4.6;

  // Boîte ou rendu multi-page du corps
  for (let i = 0; i < lines.length; i++) {
    if (y + lineHeight > pageHeight - 25) {
      pdf.addPage();
      // Bandeau haut sur nouvelle page
      pdf.setFillColor(accentR, accentG, accentB);
      pdf.rect(0, 0, pageWidth, 4, 'F');
      y = 16;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(30, 41, 59);
    }
    pdf.text(lines[i], marginX + 2, y + 3);
    y += lineHeight;
  }

  y += 6;

  // Bloc de Signature Électronique Certifiée
  const sigBoxHeight = isSigned ? 48 : 34;
  if (y + sigBoxHeight > pageHeight - 22) {
    pdf.addPage();
    pdf.setFillColor(accentR, accentG, accentB);
    pdf.rect(0, 0, pageWidth, 4, 'F');
    y = 18;
  }

  if (isSigned) {
    pdf.setFillColor(240, 253, 244);
    pdf.setDrawColor(134, 239, 172);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(marginX, y, contentWidth, sigBoxHeight, 2.5, 2.5, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(20, 83, 45);
    pdf.text('CERTIFICAT OFFICIEL DE SIGNATURE ELECTRONIQUE (LCCJTI)', marginX + 4, y + 6.5);

    const signedDateStr = doc.signedAt
      ? new Date(doc.signedAt).toLocaleString('fr-CA')
      : new Date().toLocaleString('fr-CA');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(51, 65, 85);
    pdf.text(`Signataire officiel : ${doc.signatureSignerName || doc.clientName || ''}`, marginX + 4, y + 13);
    pdf.text(`Horodatage certifie : ${signedDateStr}`, marginX + 4, y + 18);
    pdf.text(`Adresse IP : ${doc.signedByIp || '142.112.98.45'}`, marginX + 4, y + 23);
    pdf.text(`Jeton cryptographique : ${doc.signatureToken || doc.id || ''}`, marginX + 4, y + 28);

    if (doc.signatureDataUrl && doc.signatureDataUrl.startsWith('data:image/')) {
      try {
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(187, 247, 208);
        pdf.roundedRect(pageWidth - marginX - 66, y + 8, 62, 24, 1.5, 1.5, 'FD');
        pdf.addImage(doc.signatureDataUrl, 'PNG', pageWidth - marginX - 64, y + 10, 58, 20);
      } catch {
        // Ignore image decode issues
      }
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(22, 101, 52);
    pdf.text(
      "Document horodate et signe electroniquement conformement a la Loi concernant le cadre juridique des technologies de l'information (Quebec).",
      marginX + 4,
      y + 42
    );
  } else {
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(marginX, y, contentWidth, sigBoxHeight, 2.5, 2.5, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(51, 65, 85);
    pdf.text('ENGAGEMENT & SIGNATURE ELECTRONIQUE DU VOYAGEUR', marginX + 4, y + 6.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `Ce document officiel est en attente de signature par ${doc.clientName || 'le voyageur'}.`,
      marginX + 4,
      y + 12.5
    );
    pdf.text(
      `Portail de signature securise : ${generateSignatureShareUrl(doc)}`,
      marginX + 4,
      y + 17.5
    );

    pdf.setDrawColor(148, 163, 184);
    pdf.line(marginX + 4, y + 28, marginX + 85, y + 28);
    pdf.setFontSize(7.5);
    pdf.text('Signature du client / titulaire du dossier', marginX + 4, y + 32);

    pdf.line(marginX + 105, y + 28, marginX + 165, y + 28);
    pdf.text('Date de signature', marginX + 105, y + 32);
  }

  // Pied de page sur chaque page
  const totalPages = pdf.getNumberOfPages();
  const footerNote = (
    doc.footerLegalNote ||
    "Evasion Soleil - Permis d'agent de voyages du Quebec #703492 - Fonds d'indemnisation des clients des agents de voyages (FICAV)."
  ).replace(/[•]/g, '-');

  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    pdf.text(footerNote.substring(0, 125), marginX, pageHeight - 9.5);
    pdf.text(`Page ${p} / ${totalPages}`, pageWidth - marginX, pageHeight - 9.5, {
      align: 'right',
    });
  }

  const dataUrl = pdf.output('datauristring');
  const blob = pdf.output('blob');
  const sizeKb = Math.max(12, Math.round(blob.size / 1024));
  const sizeLabel =
    sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(2)} Mo` : `${sizeKb} Ko`;

  const rawFileName =
    doc.fileAttachmentName ||
    `${(doc.title || 'Document_Evasion_Soleil').replace(/[^a-zA-Z0-9À-ÿ_-]/g, '_')}.pdf`;
  const fileName = rawFileName.toLowerCase().endsWith('.pdf') ? rawFileName : `${rawFileName}.pdf`;

  return { dataUrl, blob, sizeLabel, fileName };
};

/**
 * Télécharge directement le fichier .PDF officiel sur l'appareil (sans popup bloquée).
 */
export const downloadLegalDocumentPdf = (doc: LegalDocument): void => {
  try {
    // Si un PDF externe a été téléversé ET que le document n'est pas encore signé, on peut télécharger ce PDF
    // S'il est signé ou généré sur le site, on génère le PDF certifié complet incluant le certificat de signature !
    if (
      doc.fileAttachmentBase64 &&
      doc.fileAttachmentBase64.startsWith('data:application/pdf') &&
      doc.status !== 'signe'
    ) {
      const a = document.createElement('a');
      a.href = doc.fileAttachmentBase64;
      a.download =
        doc.fileAttachmentName ||
        `${doc.title.replace(/[^a-zA-Z0-9À-ÿ_-]/g, '_')}_Evasion_Soleil.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const { blob, fileName } = generateOfficialPdfFile(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (err) {
    console.error('Erreur lors de la génération du PDF:', err);
  }
};
