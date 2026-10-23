import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Send,
  CheckCircle2,
  Clock,
  Plus,
  Download,
  Eye,
  Trash2,
  Upload,
  PenTool,
  ShieldCheck,
  Search,
  X,
  Paperclip,
  User,
  RotateCcw,
  Check,
  Link2,
  FileCheck,
  Lock,
  Unlock,
  Sparkles,
  Settings2,
  Copy,
  Edit3,
} from 'lucide-react';
import {
  LegalDocument,
  LegalDocumentCategory,
  LegalDocumentStatus,
  LegalDocumentTemplate,
  QuoteSubmission,
  User as UserType,
} from '../types';
import {
  downloadLegalDocumentPdf,
  generateOfficialPdfFile,
  generateSignatureShareUrl,
  resolveTemplateVariables,
} from '../utils/pdfGenerator';

interface ClientProfileSummary {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  submissionsCount: number;
  submissions?: QuoteSubmission[];
}

interface CRMLegalDocumentsSectionProps {
  client?: ClientProfileSummary | null;
  currentUser?: UserType | null;
  submissions?: QuoteSubmission[];
  allClients?: ClientProfileSummary[];
  onSelectClient?: (clientId: string) => void;
  mode?: 'client_drawer' | 'all_documents' | 'pdf_studio';
}

const DYNAMIC_VARIABLES = [
  { token: '{{NOM_CLIENT}}', label: 'Nom du client' },
  { token: '{{COURRIEL_CLIENT}}', label: 'Courriel client' },
  { token: '{{TELEPHONE_CLIENT}}', label: 'Téléphone client' },
  { token: '{{DESTINATION}}', label: 'Destination' },
  { token: '{{REF_DOSSIER}}', label: 'Réf. Dossier' },
  { token: '{{NOM_CONSEILLER}}', label: 'Nom conseiller' },
  { token: '{{DATE_JOUR}}', label: 'Date du jour' },
];

const ACCENT_COLORS = [
  { hex: '#338b84', label: 'Turquoise Évasion Soleil' },
  { hex: '#0284c7', label: 'Bleu Océan' },
  { hex: '#059669', label: 'Émeraude Certifié' },
  { hex: '#d97706', label: 'Ambre Officiel' },
  { hex: '#4f46e5', label: 'Indigo Exécutif' },
  { hex: '#0f172a', label: 'Ardoise Prestige' },
];

export const CRMLegalDocumentsSection: React.FC<CRMLegalDocumentsSectionProps> = ({
  client,
  currentUser,
  submissions = [],
  allClients = [],
  onSelectClient,
  mode = client ? 'client_drawer' : 'all_documents',
}) => {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [templates, setTemplates] = useState<LegalDocumentTemplate[]>([]);
  const [lockPdfForAdvisors, setLockPdfForAdvisors] = useState<boolean>(true);
  const [simulateAdvisorMode, setSimulateAdvisorMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LegalDocumentStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | LegalDocumentCategory>('all');

  // Role check: Only Super Admin / Admin / Directeur can create or modify PDF templates
  const isRealAdmin = useMemo(() => {
    if (!currentUser) return true;
    return (
      currentUser.role === 'super_admin' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'directeur' ||
      currentUser.username?.toLowerCase() === 'admin' ||
      Boolean(currentUser.permissions?.canManagePdfTemplates) ||
      Boolean(currentUser.permissions?.canEditForm) ||
      Boolean(currentUser.permissions?.canManagePermissions)
    );
  }, [currentUser]);

  // Effective admin status (false when simulating advisor view)
  const canEditPdfs = isRealAdmin && !simulateAdvisorMode;

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPdfStudioOpen, setIsPdfStudioOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<LegalDocument | null>(null);
  const [signDoc, setSignDoc] = useState<LegalDocument | null>(null);
  const [sendEmailDoc, setSendEmailDoc] = useState<LegalDocument | null>(null);

  // Create/Send Document Form State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<LegalDocumentCategory>('contrat_voyage');
  const [docClientKey, setDocClientKey] = useState(client?.id || '');
  const [docClientName, setDocClientName] = useState(client?.fullName || '');
  const [docClientEmail, setDocClientEmail] = useState(client?.email || '');
  const [docClientPhone, setDocClientPhone] = useState(client?.phone || '');
  const [docSubmissionRef, setDocSubmissionRef] = useState('');
  const [docDestination, setDocDestination] = useState('');
  const [docSummary, setDocSummary] = useState('');
  const [docRawTemplateBody, setDocRawTemplateBody] = useState('');
  const [docBodyText, setDocBodyText] = useState('');
  const [docFileName, setDocFileName] = useState('Contrat_de_Voyage_Evasion_Soleil.pdf');
  const [docHeaderSubtitle, setDocHeaderSubtitle] = useState(
    'DOCUMENT OFFICIEL • PERMIS DU QUÉBEC (OPC #703492)'
  );
  const [docFooterLegalNote, setDocFooterLegalNote] = useState(
    "Évasion Soleil • Titulaire d'un permis d'agence de voyages du Québec #703492 • Fonds d'indemnisation des clients des agents de voyages (FICAV)."
  );
  const [docAccentColor, setDocAccentColor] = useState('#338b84');
  const [docLockedForAdvisors, setDocLockedForAdvisors] = useState(true);
  const [uploadedBase64, setUploadedBase64] = useState<string | undefined>(undefined);
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('Généré automatiquement en PDF');
  const [autoSendEmailImmediately, setAutoSendEmailImmediately] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PDF Studio (On-Site Template Builder) State
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [studioTitle, setStudioTitle] = useState('');
  const [studioCategory, setStudioCategory] = useState<LegalDocumentCategory>('contrat_voyage');
  const [studioDescription, setStudioDescription] = useState('');
  const [studioFileName, setStudioFileName] = useState('');
  const [studioHeaderSubtitle, setStudioHeaderSubtitle] = useState(
    'CONTRAT OFFICIEL DE VOYAGE • PERMIS DU QUÉBEC (OPC #703492)'
  );
  const [studioFooterNote, setStudioFooterNote] = useState(
    "Évasion Soleil • Titulaire d'un permis d'agence de voyages du Québec #703492 • Fonds d'indemnisation des clients des agents de voyages (FICAV)."
  );
  const [studioAccentColor, setStudioAccentColor] = useState('#338b84');
  const [studioLocked, setStudioLocked] = useState(true);
  const [studioBody, setStudioBody] = useState('');
  const [isSavingStudio, setIsSavingStudio] = useState(false);
  const studioTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Email Modal State
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailPersonalMessage, setEmailPersonalMessage] = useState(
    'Veuillez trouver ci-joint votre document officiel de voyage en pièce jointe PDF, ainsi que le bouton sécurisé pour le signer électroniquement en un clic.'
  );

  // Signature Pad State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [typedSignerName, setTypedSignerName] = useState('');
  const [legalConsentChecked, setLegalConsentChecked] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5500);
  };

  // Safe JSON helper so proxy HTML responses never cause "Unexpected token '<'" errors
  const safeParseJson = async (res: Response): Promise<any> => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        res.status === 413
          ? 'Le fichier joint est trop volumineux pour un envoi direct.'
          : `Erreur de communication avec le serveur (Code ${res.status}).`
      );
    }
  };

  const applyTemplateToDocumentForm = (
    tmpl: LegalDocumentTemplate,
    overrideCtx?: {
      clientName?: string;
      clientEmail?: string;
      clientPhone?: string;
      destination?: string;
      submissionRef?: string;
    }
  ) => {
    setSelectedTemplateId(tmpl.id);
    setDocTitle(tmpl.title);
    setDocCategory(tmpl.category);
    setDocSummary(tmpl.description);
    setDocRawTemplateBody(tmpl.bodyTemplate);
    const resolvedBody = resolveTemplateVariables(tmpl.bodyTemplate, {
      clientName: overrideCtx?.clientName ?? docClientName,
      clientEmail: overrideCtx?.clientEmail ?? docClientEmail,
      clientPhone: overrideCtx?.clientPhone ?? docClientPhone,
      destination: overrideCtx?.destination ?? docDestination,
      submissionRef: overrideCtx?.submissionRef ?? docSubmissionRef,
      advisorName: currentUser?.name || 'Conseiller Évasion Soleil',
    });
    setDocBodyText(resolvedBody);
    setDocFileName(tmpl.defaultFileName || 'Document_Officiel_Evasion_Soleil.pdf');
    setDocHeaderSubtitle(
      tmpl.headerSubtitle || 'DOCUMENT OFFICIEL • PERMIS DU QUÉBEC (OPC #703492)'
    );
    setDocFooterLegalNote(
      tmpl.footerLegalNote ||
        "Évasion Soleil • Titulaire d'un permis d'agence de voyages du Québec #703492 • Fonds d'indemnisation des clients des agents de voyages (FICAV)."
    );
    setDocAccentColor(tmpl.accentColor || '#338b84');
    setDocLockedForAdvisors(tmpl.lockedForAdvisors !== false);
    setUploadedBase64(undefined);
    setUploadedFileSize('Généré automatiquement en PDF');
  };

  // Fetch documents, templates, and lock setting
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [docsRes, tmplRes, lockRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/documents/templates'),
        fetch('/api/documents/settings/lock'),
      ]);

      if (docsRes.ok) {
        const allDocs: LegalDocument[] = await docsRes.json();
        if (client) {
          const emailLower = (client.email || '').toLowerCase();
          const phoneDigits = (client.phone || '').replace(/\D/g, '');
          const filtered = allDocs.filter((d) => {
            if (d.clientKey === client.id) return true;
            if (emailLower && d.clientEmail.toLowerCase() === emailLower) return true;
            if (phoneDigits && d.clientPhone && d.clientPhone.replace(/\D/g, '') === phoneDigits)
              return true;
            if (d.clientName.toLowerCase() === client.fullName.toLowerCase()) return true;
            return false;
          });
          setDocuments(filtered);
        } else {
          setDocuments(allDocs);
        }
      }

      if (tmplRes.ok) {
        const tmpls: LegalDocumentTemplate[] = await tmplRes.json();
        setTemplates(tmpls);
        if (tmpls.length > 0 && !selectedTemplateId) {
          applyTemplateToDocumentForm(tmpls[0]);
        }
      }

      if (lockRes.ok) {
        const lockData = await lockRes.json();
        if (lockData && typeof lockData.lockPdfForAdvisors === 'boolean') {
          setLockPdfForAdvisors(lockData.lockPdfForAdvisors);
        }
      }
    } catch (error) {
      console.error('Failed to load legal documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [client?.id, client?.email]);

  // Sync client props when drawer changes
  useEffect(() => {
    if (client) {
      const cKey = client.email
        ? `email:${client.email.toLowerCase()}`
        : client.phone
          ? `phone:${client.phone.replace(/\D/g, '')}`
          : client.id;
      const subRef =
        client.submissions && client.submissions.length > 0
          ? client.submissions[0].referenceNumber || ''
          : '';
      const dest =
        client.submissions && client.submissions.length > 0
          ? client.submissions[0].destination || ''
          : '';

      setDocClientKey(cKey);
      setDocClientName(client.fullName);
      setDocClientEmail(client.email);
      setDocClientPhone(client.phone);
      setDocSubmissionRef(subRef);
      setDocDestination(dest);

      if (docRawTemplateBody) {
        setDocBodyText(
          resolveTemplateVariables(docRawTemplateBody, {
            clientName: client.fullName,
            clientEmail: client.email,
            clientPhone: client.phone,
            destination: dest,
            submissionRef: subRef,
            advisorName: currentUser?.name || 'Conseiller Évasion Soleil',
          })
        );
      }
    }
  }, [client]);

  // Automatically re-resolve dynamic variables when an advisor changes the client or dossier
  const isCurrentDocumentLockedForUser = useMemo(() => {
    if (canEditPdfs) return false;
    return lockPdfForAdvisors || docLockedForAdvisors;
  }, [canEditPdfs, lockPdfForAdvisors, docLockedForAdvisors]);

  useEffect(() => {
    if (docRawTemplateBody && (isCurrentDocumentLockedForUser || selectedTemplateId)) {
      const updated = resolveTemplateVariables(docRawTemplateBody, {
        clientName: docClientName,
        clientEmail: docClientEmail,
        clientPhone: docClientPhone,
        destination: docDestination,
        submissionRef: docSubmissionRef,
        advisorName: currentUser?.name || 'Conseiller Évasion Soleil',
      });
      setDocBodyText(updated);
    }
  }, [
    docClientName,
    docClientEmail,
    docClientPhone,
    docDestination,
    docSubmissionRef,
    docRawTemplateBody,
    isCurrentDocumentLockedForUser,
  ]);

  // Handle template change in Create/Send modal
  const handleTemplateChange = (tmplId: string) => {
    const found = templates.find((t) => t.id === tmplId);
    if (found) {
      applyTemplateToDocumentForm(found);
    }
  };

  // Handle client selection in global mode
  const handleSelectClientProfile = (clientId: string) => {
    const found = allClients.find((c) => c.id === clientId);
    if (found) {
      const subRef =
        found.submissions && found.submissions.length > 0
          ? found.submissions[0].referenceNumber || ''
          : '';
      const dest =
        found.submissions && found.submissions.length > 0
          ? found.submissions[0].destination || ''
          : '';
      setDocClientKey(found.id);
      setDocClientName(found.fullName);
      setDocClientEmail(found.email);
      setDocClientPhone(found.phone);
      setDocSubmissionRef(subRef);
      setDocDestination(dest);
    }
  };

  // Handle file upload from disk (Admin only when unlocked)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isCurrentDocumentLockedForUser) {
      showToast('error', 'Modification bloquée : seuls les modèles PDF officiels sont autorisés.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFileName(file.name);
    const sizeKb = Math.round(file.size / 1024);
    setUploadedFileSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} Mo` : `${sizeKb} Ko`);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Toggle global advisor lock setting (Admin only)
  const handleToggleGlobalAdvisorLock = async () => {
    if (!isRealAdmin) return;
    const nextVal = !lockPdfForAdvisors;
    setLockPdfForAdvisors(nextVal);
    try {
      await fetch('/api/documents/settings/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockPdfForAdvisors: nextVal }),
      });
      showToast(
        'success',
        nextVal
          ? '🔒 Verrouillage activé : les autres conseillers ne peuvent plus modifier les PDF, ils peuvent uniquement les envoyer.'
          : '🔓 Verrouillage désactivé : les conseillers peuvent personnaliser le texte avant envoi.'
      );
    } catch {
      showToast('error', 'Erreur lors de la mise à jour du verrouillage.');
    }
  };

  // Open PDF Studio for creating or editing a template
  const openPdfStudioForNew = () => {
    setEditingTemplateId(null);
    setStudioTitle('Nouveau Contrat / Document PDF Officiel');
    setStudioCategory('contrat_voyage');
    setStudioDescription('Modèle PDF officiel créé sur le site Évasion Soleil.');
    setStudioFileName('Document_Officiel_Evasion_Soleil.pdf');
    setStudioHeaderSubtitle('DOCUMENT CONTRACTUEL OFFICIEL • PERMIS DU QUÉBEC (OPC #703492)');
    setStudioFooterNote(
      "Évasion Soleil • Titulaire d'un permis d'agence de voyages du Québec #703492 • Fonds d'indemnisation des clients des agents de voyages (FICAV)."
    );
    setStudioAccentColor('#338b84');
    setStudioLocked(true);
    setStudioBody(`DOCUMENT OFFICIEL - VOYAGES ÉVASION SOLEIL INC.
Permis d'agent de voyages du Québec : #703492

CLIENT : {{NOM_CLIENT}} ({{COURRIEL_CLIENT}})
TÉLÉPHONE : {{TELEPHONE_CLIENT}}
DOSSIER : {{REF_DOSSIER}} — DESTINATION : {{DESTINATION}}
CONSEILLER ATTITRÉ : {{NOM_CONSEILLER}} — DATE : {{DATE_JOUR}}

1. OBJET DU DOCUMENT :
Inscrivez ici les clauses, conditions particulières ou autorisations de votre document PDF officiel.

2. ENGAGEMENT DU VOYAGEUR :
En apposant ma signature électronique ci-dessous, je soussigné(e) {{NOM_CLIENT}} confirme avoir lu, compris et accepté sans réserve l'intégralité du présent document.`);
    setIsPdfStudioOpen(true);
  };

  const openPdfStudioForTemplate = (tmpl: LegalDocumentTemplate) => {
    setEditingTemplateId(tmpl.id);
    setStudioTitle(tmpl.title);
    setStudioCategory(tmpl.category);
    setStudioDescription(tmpl.description || '');
    setStudioFileName(tmpl.defaultFileName || 'Document_Officiel.pdf');
    setStudioHeaderSubtitle(
      tmpl.headerSubtitle || 'DOCUMENT OFFICIEL • PERMIS DU QUÉBEC (OPC #703492)'
    );
    setStudioFooterNote(
      tmpl.footerLegalNote ||
        "Évasion Soleil • Titulaire d'un permis d'agence de voyages du Québec #703492 • Fonds d'indemnisation des clients des agents de voyages (FICAV)."
    );
    setStudioAccentColor(tmpl.accentColor || '#338b84');
    setStudioLocked(tmpl.lockedForAdvisors !== false);
    setStudioBody(tmpl.bodyTemplate);
    setIsPdfStudioOpen(true);
  };

  const insertTokenIntoStudio = (token: string) => {
    const el = studioTextareaRef.current;
    if (!el) {
      setStudioBody((prev) => `${prev} ${token}`);
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const next = studioBody.substring(0, start) + token + studioBody.substring(end);
    setStudioBody(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 20);
  };

  const handleSaveStudioTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioTitle.trim() || !studioBody.trim()) {
      showToast('error', 'Le titre et le contenu du PDF sont obligatoires.');
      return;
    }

    setIsSavingStudio(true);
    try {
      const url = editingTemplateId
        ? `/api/documents/templates/${encodeURIComponent(editingTemplateId)}`
        : '/api/documents/templates';
      const method = editingTemplateId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplateId || undefined,
          title: studioTitle.trim(),
          category: studioCategory,
          description: studioDescription.trim(),
          defaultFileName: studioFileName.trim() || 'Document_Evasion_Soleil.pdf',
          headerSubtitle: studioHeaderSubtitle.trim(),
          footerLegalNote: studioFooterNote.trim(),
          accentColor: studioAccentColor,
          lockedForAdvisors: studioLocked,
          bodyTemplate: studioBody,
          createdByUserName: currentUser?.name || 'Direction Évasion Soleil',
        }),
      });

      const data = await safeParseJson(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Erreur lors de la sauvegarde du modèle PDF');
      }

      if (Array.isArray(data.templates)) {
        setTemplates(data.templates);
      }
      if (data.template) {
        setEditingTemplateId(data.template.id);
        applyTemplateToDocumentForm(data.template);
      }

      showToast(
        'success',
        `Modèle PDF "${studioTitle.trim()}" enregistré sur le site ${
          studioLocked ? '(🔒 Verrouillé pour les autres conseillers)' : ''
        } !`
      );
    } catch (err: any) {
      showToast('error', err.message || 'Erreur lors de la sauvegarde du modèle PDF');
    } finally {
      setIsSavingStudio(false);
    }
  };

  const handleDeleteTemplate = async (tmpl: LegalDocumentTemplate) => {
    if (templates.length <= 1) {
      showToast('error', 'Vous devez conserver au moins un modèle PDF actif.');
      return;
    }
    try {
      const res = await fetch(`/api/documents/templates/${encodeURIComponent(tmpl.id)}`, {
        method: 'DELETE',
      });
      const data = await safeParseJson(res);
      if (res.ok && Array.isArray(data.templates)) {
        setTemplates(data.templates);
        if (editingTemplateId === tmpl.id) {
          openPdfStudioForTemplate(data.templates[0]);
        }
        if (selectedTemplateId === tmpl.id) {
          applyTemplateToDocumentForm(data.templates[0]);
        }
        showToast('success', `Modèle PDF "${tmpl.title}" supprimé.`);
      }
    } catch {
      showToast('error', 'Erreur lors de la suppression du modèle.');
    }
  };

  // Upload large base64 attachments in safe 240KB chunks so reverse proxies (Nginx/Cloud Run) never return HTML 413
  const uploadAttachmentInChunks = async (docId: string, base64Data: string) => {
    const CHUNK_SIZE = 240000;
    const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const chunkData = base64Data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const res = await fetch(`/api/documents/${encodeURIComponent(docId)}/upload-chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunkData,
          chunkIndex: i,
          isLastChunk: i === totalChunks - 1,
        }),
      });
      if (!res.ok) {
        const errData = await safeParseJson(res);
        throw new Error(errData?.error || 'Échec du transfert du fichier PDF joint.');
      }
    }
  };

  // Submit Create & Send Document
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docClientEmail.trim()) {
      showToast('error', 'Le titre et le courriel du client sont obligatoires.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Si aucun PDF externe n'a été téléversé, on génère automatiquement le vrai fichier .PDF officiel sur le site !
      let finalBase64 = uploadedBase64;
      let finalFileSize = uploadedFileSize;
      let finalFileName = docFileName.trim() || 'Document_Officiel_Evasion_Soleil.pdf';

      if (!finalBase64) {
        const generated = generateOfficialPdfFile({
          title: docTitle.trim(),
          category: docCategory,
          clientName: docClientName.trim() || 'Client Évasion Soleil',
          clientEmail: docClientEmail.trim(),
          clientPhone: docClientPhone.trim(),
          submissionRef: docSubmissionRef.trim(),
          destination: docDestination.trim(),
          contentSummary: docSummary.trim(),
          documentBodyHtml: docBodyText,
          fileAttachmentName: finalFileName,
          headerSubtitle: docHeaderSubtitle,
          footerLegalNote: docFooterLegalNote,
          accentColor: docAccentColor,
          sentByAdvisorName: currentUser?.name || 'Conseiller Évasion Soleil',
          status: 'brouillon',
        });
        finalBase64 = generated.dataUrl;
        finalFileSize = generated.sizeLabel;
        finalFileName = generated.fileName;
      }

      const hasLargeAttachment = Boolean(finalBase64 && finalBase64.length > 200000);

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle.trim(),
          category: docCategory,
          clientKey:
            docClientKey || `email:${docClientEmail.trim().toLowerCase()}`,
          clientName: docClientName.trim() || 'Client Évasion Soleil',
          clientEmail: docClientEmail.trim(),
          clientPhone: docClientPhone.trim(),
          submissionRef: docSubmissionRef.trim(),
          destination: docDestination.trim(),
          contentSummary: docSummary.trim(),
          documentBodyHtml: docBodyText,
          fileAttachmentName: finalFileName,
          fileAttachmentBase64: hasLargeAttachment ? undefined : finalBase64,
          fileAttachmentSize: finalFileSize,
          sentByAdvisorName: currentUser?.name || 'Conseiller Évasion Soleil',
          templateId: selectedTemplateId || undefined,
          lockedForAdvisors: docLockedForAdvisors,
          headerSubtitle: docHeaderSubtitle,
          footerLegalNote: docFooterLegalNote,
          accentColor: docAccentColor,
          status: 'brouillon',
        }),
      });

      if (!res.ok) {
        const errData = await safeParseJson(res);
        throw new Error(errData?.error || 'Erreur lors de la création du document');
      }

      const createdDoc: LegalDocument = await safeParseJson(res);

      if (hasLargeAttachment && finalBase64) {
        await uploadAttachmentInChunks(createdDoc.id, finalBase64);
        createdDoc.fileAttachmentBase64 = finalBase64;
      }

      if (autoSendEmailImmediately) {
        const sendRes = await fetch(
          `/api/documents/${encodeURIComponent(createdDoc.id)}/send-email`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              advisorName: currentUser?.name || 'Conseiller Évasion Soleil',
              advisorEmail: currentUser?.email || 'info@evasionsoleil.com',
              customMessage: emailPersonalMessage,
              appOrigin: window.location.origin,
            }),
          }
        );

        const sendData = await safeParseJson(sendRes);
        if (sendRes.ok && sendData?.document) {
          setDocuments((prev) => [sendData.document, ...prev]);
          showToast(
            'success',
            `PDF officiel "${createdDoc.title}" généré et envoyé avec succès à ${createdDoc.clientEmail} !`
          );
        } else {
          setDocuments((prev) => [createdDoc, ...prev]);
          showToast(
            'error',
            sendData?.error || 'PDF enregistré, mais erreur lors de l’envoi du courriel.'
          );
        }
      } else {
        setDocuments((prev) => [createdDoc, ...prev]);
        showToast('success', `PDF officiel "${createdDoc.title}" généré et ajouté au dossier client.`);
      }

      setIsCreateModalOpen(false);
    } catch (err: any) {
      showToast('error', err.message || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Email for Existing Document
  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendEmailDoc) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(sendEmailDoc.id)}/send-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            advisorName: currentUser?.name || 'Conseiller Évasion Soleil',
            advisorEmail: currentUser?.email || 'info@evasionsoleil.com',
            customMessage: emailPersonalMessage,
            appOrigin: window.location.origin,
          }),
        }
      );

      const data = await safeParseJson(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Erreur lors de l’envoi du courriel');
      }

      setDocuments((prev) =>
        prev.map((d) => (d.id === sendEmailDoc.id ? data.document : d))
      );
      setSendEmailDoc(null);
      showToast('success', data.message || `Courriel avec PDF envoyé à ${sendEmailDoc.clientEmail} !`);
    } catch (err: any) {
      showToast('error', err.message || 'Échec de l’envoi du courriel');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Signature Canvas Drawing Logic
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawnSignature(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  const handleSignSubmit = async () => {
    if (!signDoc) return;
    if (!legalConsentChecked) {
      showToast(
        'error',
        "Vous devez cocher la case d'acceptation légale pour certifier votre signature."
      );
      return;
    }

    const canvas = canvasRef.current;
    let signatureUrl = '';
    if (canvas && hasDrawnSignature) {
      signatureUrl = canvas.toDataURL('image/png');
    } else if (typedSignerName.trim()) {
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 120;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.font = 'italic 28px "Brush Script MT", cursive, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(typedSignerName.trim(), 20, 70);
        signatureUrl = offscreen.toDataURL('image/png');
      }
    } else {
      showToast('error', 'Veuillez dessiner votre signature ou saisir votre nom complet.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(signDoc.id)}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureDataUrl: signatureUrl,
          signerName: typedSignerName.trim() || signDoc.clientName,
        }),
      });

      const data = await safeParseJson(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Erreur lors de la signature');
      }

      setDocuments((prev) =>
        prev.map((d) => (d.id === signDoc.id ? data.document : d))
      );
      setSignDoc(null);
      showToast(
        'success',
        `Document "${signDoc.title}" signé électroniquement avec succès ! Horodatage et IP consignés.`
      );
    } catch (err: any) {
      showToast('error', err.message || "Échec de l'enregistrement de la signature");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async (docId: string, docTitleText: string) => {
    if (!canEditPdfs) {
      showToast('error', 'Action réservée à la direction : les conseillers ne peuvent pas supprimer de documents.');
      return;
    }

    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        showToast('success', `Document "${docTitleText}" supprimé.`);
      }
    } catch {
      showToast('error', 'Erreur lors de la suppression');
    }
  };

  // Quick 1-click send or in-office sign for advisors in client drawer
  const handleQuickSendToClient = async (action: 'email' | 'bureau' | 'preview') => {
    const tmpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (!tmpl) {
      showToast('error', 'Veuillez sélectionner un modèle PDF.');
      return;
    }

    const effectiveClientName = client?.fullName || docClientName || 'Client Évasion Soleil';
    const effectiveClientEmail = client?.email || docClientEmail || '';
    const effectiveClientPhone = client?.phone || docClientPhone || '';
    const effectiveSubRef = client?.submissions?.[0]?.referenceNumber || docSubmissionRef || '';
    const effectiveDest = client?.submissions?.[0]?.destination || docDestination || '';

    if (action === 'email' && !effectiveClientEmail) {
      showToast('error', 'Le client doit avoir une adresse courriel valide pour envoyer le document.');
      return;
    }

    const resolvedBody = resolveTemplateVariables(tmpl.bodyTemplate || docRawTemplateBody || '', {
      clientName: effectiveClientName,
      clientEmail: effectiveClientEmail,
      clientPhone: effectiveClientPhone,
      destination: effectiveDest,
      submissionRef: effectiveSubRef,
      advisorName: currentUser?.name || 'Conseiller Évasion Soleil',
    });

    const generated = generateOfficialPdfFile({
      title: tmpl.title,
      category: tmpl.category,
      clientName: effectiveClientName,
      clientEmail: effectiveClientEmail,
      clientPhone: effectiveClientPhone,
      submissionRef: effectiveSubRef,
      destination: effectiveDest,
      contentSummary: tmpl.description || '',
      documentBodyHtml: resolvedBody,
      fileAttachmentName: tmpl.defaultFileName || `${tmpl.title.replace(/\s+/g, '_')}.pdf`,
      headerSubtitle: tmpl.headerSubtitle,
      footerLegalNote: tmpl.footerLegalNote,
      accentColor: tmpl.accentColor || '#338b84',
      sentByAdvisorName: currentUser?.name || 'Conseiller Évasion Soleil',
      status: 'brouillon',
    });

    if (action === 'preview') {
      downloadLegalDocumentPdf({
        id: 'quick_preview',
        title: tmpl.title,
        category: tmpl.category,
        clientKey: client?.id || 'preview',
        clientName: effectiveClientName,
        clientEmail: effectiveClientEmail,
        clientPhone: effectiveClientPhone,
        submissionRef: effectiveSubRef,
        destination: effectiveDest,
        status: 'brouillon',
        documentBodyHtml: resolvedBody,
        fileAttachmentName: generated.fileName,
        fileAttachmentSize: generated.sizeLabel,
        fileAttachmentBase64: generated.dataUrl,
        headerSubtitle: tmpl.headerSubtitle,
        footerLegalNote: tmpl.footerLegalNote,
        accentColor: tmpl.accentColor,
        sentByAdvisorName: currentUser?.name || 'Conseiller Évasion Soleil',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      showToast('success', `Aperçu du PDF "${tmpl.title}" généré et téléchargé avec succès !`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: tmpl.title,
          category: tmpl.category,
          clientKey: client ? (client.email ? `email:${client.email.toLowerCase()}` : client.id) : docClientKey,
          clientName: effectiveClientName,
          clientEmail: effectiveClientEmail,
          clientPhone: effectiveClientPhone,
          submissionRef: effectiveSubRef,
          destination: effectiveDest,
          contentSummary: tmpl.description || '',
          documentBodyHtml: resolvedBody,
          fileAttachmentName: generated.fileName,
          fileAttachmentSize: generated.sizeLabel,
          fileAttachmentBase64: generated.dataUrl.length <= 200000 ? generated.dataUrl : undefined,
          headerSubtitle: tmpl.headerSubtitle,
          footerLegalNote: tmpl.footerLegalNote,
          accentColor: tmpl.accentColor,
          lockedForAdvisors: tmpl.lockedForAdvisors !== false,
          sentByAdvisorName: currentUser?.name || 'Conseiller Évasion Soleil',
          sentByAdvisorEmail: currentUser?.email || 'info@evasionsoleil.com',
        }),
      });

      const data = await safeParseJson(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Erreur lors de la création du document');
      }

      const createdDoc: LegalDocument = data.document;

      if (generated.dataUrl.length > 200000) {
        await uploadAttachmentInChunks(createdDoc.id, generated.dataUrl);
      }

      if (action === 'email') {
        const sendRes = await fetch(`/api/documents/${encodeURIComponent(createdDoc.id)}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            advisorName: currentUser?.name || 'Conseiller Évasion Soleil',
            advisorEmail: currentUser?.email || 'info@evasionsoleil.com',
            customMessage: `Bonjour ${effectiveClientName}, veuillez trouver ci-joint votre document officiel (${tmpl.title}) prêt à être signé électroniquement.`,
            appOrigin: window.location.origin,
          }),
        });
        const sendData = await safeParseJson(sendRes);
        if (sendRes.ok && sendData?.success) {
          setDocuments((prev) => [sendData.document, ...prev.filter((d) => d.id !== createdDoc.id)]);
          showToast('success', `Document "${tmpl.title}" envoyé par courriel à ${effectiveClientEmail} avec lien de signature !`);
        } else {
          setDocuments((prev) => [createdDoc, ...prev]);
          showToast('success', `Document créé ! (Envoi de courriel en attente)`);
        }
      } else if (action === 'bureau') {
        setDocuments((prev) => [createdDoc, ...prev]);
        setSignDoc(createdDoc);
        setTypedSignerName(effectiveClientName);
        setLegalConsentChecked(false);
        setTimeout(clearCanvas, 100);
        showToast('success', `Document créé ! Vous pouvez maintenant faire signer le client au bureau.`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erreur lors de l’opération.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchClient = doc.clientName.toLowerCase().includes(q);
      const matchEmail = doc.clientEmail.toLowerCase().includes(q);
      const matchRef = (doc.submissionRef || '').toLowerCase().includes(q);
      return matchTitle || matchClient || matchEmail || matchRef;
    }
    return true;
  });

  const signedCount = documents.filter((d) => d.status === 'signe').length;
  const pendingCount = documents.filter((d) => d.status === 'envoye').length;
  const draftCount = documents.filter((d) => d.status === 'brouillon').length;

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-md transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 1: DEDICATED PDF STUDIO VIEW                              */}
      {/* ============================================================== */}
      {mode === 'pdf_studio' ? (
        <div className="space-y-6">
          {!canEditPdfs ? (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center mx-auto">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-amber-950">Accès Restreint au Studio Modèles PDF</h3>
              <p className="text-xs text-amber-800 max-w-lg mx-auto leading-relaxed">
                La configuration des modèles officiels PDF est réservée aux administrateurs et à la direction de l'agence.
                En tant que conseiller, vous pouvez sélectionner et envoyer les modèles prêts à l'emploi directement depuis la fiche de vos clients.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Studio Admin Control Bar */}
              <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-teal-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="p-3 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300 shrink-0">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-white">
                        Studio Modèles PDF Propriétaire & Contrôle des Conseillers
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          lockPdfForAdvisors
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {lockPdfForAdvisors ? (
                          <>
                            <Lock className="h-3 w-3" />
                            <span>Verrouillé Conseillers</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3 w-3" />
                            <span>Modifiable</span>
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-teal-100/80 mt-1">
                      Créez et personnalisez vos contrats et décharges officielles. Les conseillers ont simplement à sélectionner le client et envoyer.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleGlobalAdvisorLock}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                      lockPdfForAdvisors
                        ? 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border-amber-400/50'
                        : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/20'
                    }`}
                  >
                    {lockPdfForAdvisors ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    <span>{lockPdfForAdvisors ? 'Conseillers verrouillés' : 'Verrouiller conseillers'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={openPdfStudioForNew}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-500 hover:to-teal-400 text-slate-950 shadow-md cursor-pointer flex items-center gap-1.5 transition-transform active:scale-98"
                  >
                    <Plus className="h-4 w-4 text-slate-950" />
                    <span>+ Créer un nouveau Modèle PDF</span>
                  </button>
                </div>
              </div>

              {/* Grid of Templates */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#338b84]" />
                    <span>Modèles PDF Officiels Enregistrés ({templates.length})</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: tmpl.accentColor || '#338b84' }}
                            />
                            <h4 className="font-black text-slate-900 text-sm">{tmpl.title}</h4>
                          </div>
                          {(lockPdfForAdvisors || tmpl.lockedForAdvisors !== false) && (
                            <span
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black shrink-0"
                              title="Protégé contre les modifications par les conseillers"
                            >
                              <Lock className="h-2.5 w-2.5" />
                              <span>Verrouillé</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase">
                            {tmpl.category.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {tmpl.defaultFileName || 'Document.pdf'}
                          </span>
                        </div>

                        {tmpl.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {tmpl.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 flex-wrap">
                        <button
                          type="button"
                          onClick={() => openPdfStudioForTemplate(tmpl)}
                          className="flex-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 cursor-pointer flex items-center justify-center gap-1 transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-[#338b84]" />
                          <span>Modifier dans le Studio</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const previewBody = resolveTemplateVariables(tmpl.bodyTemplate || '', {
                              clientName: 'Marc-André Bouchard (Exemple)',
                              clientEmail: 'client@exemple.ca',
                              clientPhone: '514-555-0199',
                              destination: 'Cancún, Mexique',
                              submissionRef: 'ES-2026-DEMO',
                              advisorName: currentUser?.name || 'Direction Évasion Soleil',
                            });
                            downloadLegalDocumentPdf({
                              id: 'preview_pdf',
                              title: tmpl.title,
                              category: tmpl.category,
                              clientKey: 'preview',
                              clientName: 'Marc-André Bouchard',
                              clientEmail: 'client@exemple.ca',
                              clientPhone: '514-555-0199',
                              submissionRef: 'ES-2026-DEMO',
                              destination: 'Cancún, Mexique',
                              status: 'brouillon',
                              documentBodyHtml: previewBody,
                              fileAttachmentName: tmpl.defaultFileName || `${tmpl.title}.pdf`,
                              headerSubtitle: tmpl.headerSubtitle,
                              footerLegalNote: tmpl.footerLegalNote,
                              accentColor: tmpl.accentColor,
                              sentByAdvisorName: currentUser?.name || 'Direction Évasion Soleil',
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            });
                            showToast('success', `Téléchargement de l'exemple PDF "${tmpl.title}" !`);
                          }}
                          className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                          title="Télécharger un exemple PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>

                        {templates.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(tmpl)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 cursor-pointer"
                            title="Supprimer ce modèle"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : mode === 'client_drawer' ? (
        /* ============================================================== */
        /* MODE 2: CLIENT DRAWER (FAST SELECTION & 1-CLICK SEND/SIGN)      */
        /* ============================================================== */
        <div className="space-y-4">
          {/* Quick Send Card for Agent */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-teal-800/40 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  <Send className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-white">
                    Envoyer un document officiel à {client?.fullName || 'ce client'}
                  </h4>
                  <p className="text-[11px] text-teal-100/80">
                    Sélectionnez le modèle et choisissez l'action souhaitée en 1 clic.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-400/20 text-teal-300 border border-teal-400/30 shrink-0">
                Prêt à l'envoi
              </span>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Choisir le modèle de document PDF :
              </label>
              <select
                value={selectedTemplateId || (templates[0]?.id || '')}
                onChange={(e) => {
                  const tmpl = templates.find((t) => t.id === e.target.value);
                  if (tmpl) {
                    applyTemplateToDocumentForm(tmpl, {
                      clientName: client?.fullName,
                      clientEmail: client?.email,
                      clientPhone: client?.phone,
                      destination: client?.submissions?.[0]?.destination,
                      submissionRef: client?.submissions?.[0]?.referenceNumber,
                    });
                  }
                }}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-teal-400 cursor-pointer"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {t.title} — {t.category.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Pre-filled info summary */}
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 text-xs text-slate-300 space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Destinataire :</span>
                <span className="font-bold text-white">
                  {client?.fullName} ({client?.email || 'Aucun courriel'})
                </span>
              </div>
              {client?.submissions && client.submissions.length > 0 && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Dossier rattaché :</span>
                  <span className="font-mono text-teal-300 font-bold">
                    {client.submissions[0].referenceNumber || 'N/A'} {client.submissions[0].destination ? `(${client.submissions[0].destination})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* 3 Direct Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickSendToClient('email')}
                className="px-3.5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                title="Générer le PDF et envoyer immédiatement par courriel au client avec le lien de signature sécurisé"
              >
                <Send className="h-4 w-4" />
                <span>Envoyer par courriel</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickSendToClient('bureau')}
                className="px-3.5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                title="Générer le document et ouvrir le pad de signature pour faire signer le client immédiatement en agence"
              >
                <PenTool className="h-4 w-4" />
                <span>Faire signer au bureau</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickSendToClient('preview')}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                title="Télécharger et afficher immédiatement l'aperçu du PDF avec les coordonnées de ce client"
              >
                <Eye className="h-4 w-4" />
                <span>Aperçu PDF</span>
              </button>
            </div>
          </div>

          {/* Documents of this client */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-[#338b84]" />
                <span>Documents de ce client ({filteredDocuments.length})</span>
              </span>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Aucun document n'a encore été envoyé à ce client. Choisissez un modèle ci-dessus et cliquez sur <strong>Envoyer par courriel</strong> ou <strong>Faire signer au bureau</strong>.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => {
                  const isSigned = doc.status === 'signe';
                  const isSent = doc.status === 'envoye';

                  return (
                    <div key={doc.id} className="py-3 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {doc.title}
                            </span>
                            {isSigned ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>SIGNÉ</span>
                              </span>
                            ) : isSent ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock className="h-3 w-3 text-amber-600" />
                                <span>EN ATTENTE</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                BROUILLON
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{doc.fileAttachmentName}</span>
                            {doc.sentAt && <span>&bull; Envoyé le {new Date(doc.sentAt).toLocaleDateString('fr-CA')}</span>}
                            {isSigned && doc.signedAt && (
                              <span className="text-emerald-700 font-bold">
                                &bull; Signé le {new Date(doc.signedAt).toLocaleDateString('fr-CA')}
                              </span>
                            )}
                          </div>
                        </div>

                        {canEditPdfs && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id, doc.title)}
                            className="p-1 text-slate-300 hover:text-rose-600 cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <button
                          type="button"
                          onClick={() => setViewDoc(doc)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3 text-slate-500" />
                          <span>Voir</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadLegalDocumentPdf(doc)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-pointer flex items-center gap-1"
                        >
                          <Download className="h-3 w-3 text-emerald-600" />
                          <span>PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const url = generateSignatureShareUrl(doc);
                            navigator.clipboard.writeText(url);
                            showToast('success', 'Lien de signature copié !');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 cursor-pointer flex items-center gap-1"
                        >
                          <Link2 className="h-3 w-3 text-[#338b84]" />
                          <span>Lien</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEmailRecipient(doc.clientEmail);
                            setSendEmailDoc(doc);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#338b84] hover:bg-[#256863] text-white cursor-pointer flex items-center gap-1"
                        >
                          <Send className="h-3 w-3" />
                          <span>{isSent || isSigned ? 'Renvoyer' : 'Envoyer'}</span>
                        </button>

                        {!isSigned && (
                          <button
                            type="button"
                            onClick={() => {
                              setSignDoc(doc);
                              setTypedSignerName(doc.clientName);
                              setLegalConsentChecked(false);
                              setTimeout(clearCanvas, 100);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer flex items-center gap-1"
                          >
                            <PenTool className="h-3 w-3" />
                            <span>Faire signer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* MODE 3: ALL DOCUMENTS (FULL AGENCY TABLE & KPIS)               */
        /* ============================================================== */
        <div className="space-y-5">
          {/* Admin PDF Control Bar vs Advisor Locked Banner */}
          {isRealAdmin ? (
            <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-teal-800/60 flex flex-col gap-3.5">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300 shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-white">
                      Studio PDF Propriétaire & Contrôle des Conseillers
                    </h4>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        lockPdfForAdvisors
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {lockPdfForAdvisors ? (
                        <>
                          <Lock className="h-3 w-3" />
                          <span>Modèles verrouillés</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3 w-3" />
                          <span>Modifiable</span>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-teal-100/80 mt-1 leading-relaxed">
                    Créez et personnalisez vos modèles PDF officiels sur le site. Les autres conseillers ont simplement à choisir le client et envoyer.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-teal-900/60">
                <button
                  type="button"
                  onClick={handleToggleGlobalAdvisorLock}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                    lockPdfForAdvisors
                      ? 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border-amber-400/50'
                      : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/20'
                  }`}
                  title="Activer ou désactiver le blocage des modifications pour les autres conseillers"
                >
                  {lockPdfForAdvisors ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  <span>{lockPdfForAdvisors ? 'Conseillers verrouillés' : 'Verrouiller conseillers'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSimulateAdvisorMode((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                    simulateAdvisorMode
                      ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  }`}
                  title="Tester l'interface telle que la voient les autres conseillers"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{simulateAdvisorMode ? 'Quitter vue Conseiller' : 'Tester vue Conseiller'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (templates.length > 0) {
                      openPdfStudioForTemplate(templates[0]);
                    } else {
                      openPdfStudioForNew();
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-500 hover:to-teal-400 text-slate-950 shadow-md cursor-pointer flex items-center gap-1.5 transition-transform active:scale-98"
                >
                  <Settings2 className="h-3.5 w-3.5 text-slate-950" />
                  <span>Gérer mes modèles PDF ({templates.length})</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Advisor Lock Notice Banner */}
          {!canEditPdfs && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-amber-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-black block">
                    Mode Conseiller — Modèles PDF Officiels Verrouillés
                  </span>
                  <span className="text-[11px] text-amber-800">
                    Les documents PDF sont créés et protégés par la direction. Vous avez simplement à sélectionner le modèle PDF, choisir votre client et cliquer sur <strong>Envoyer</strong>.
                  </span>
                </div>
              </div>
              {isRealAdmin && simulateAdvisorMode && (
                <button
                  type="button"
                  onClick={() => setSimulateAdvisorMode(false)}
                  className="px-3 py-1.5 rounded-xl bg-amber-900 text-white font-bold text-[11px] hover:bg-amber-950 shrink-0 cursor-pointer"
                >
                  Revenir en mode Administrateur
                </button>
              )}
            </div>
          )}

          {/* Header and KPI Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-teal-50 text-[#338b84] border border-teal-200">
                    <FileCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {client
                        ? `Documents Légaux & Signatures : ${client.fullName}`
                        : 'Documents Légaux & Signatures Électroniques Clients'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Contrats de voyage, autorisations de carte de crédit et décharges générés en PDF sur le site et envoyés pour signature électronique.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                {canEditPdfs && (
                  <button
                    type="button"
                    onClick={openPdfStudioForNew}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 cursor-pointer transition-all"
                  >
                    <Plus className="h-4 w-4 text-[#338b84]" />
                    <span>Créer un Modèle PDF</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (templates.length > 0) {
                      const currentTmpl =
                        templates.find((t) => t.id === selectedTemplateId) || templates[0];
                      applyTemplateToDocumentForm(currentTmpl);
                    }
                    setAutoSendEmailImmediately(true);
                    setIsCreateModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-teal-700 to-[#338b84] hover:from-teal-800 hover:to-[#256863] text-white shadow-sm cursor-pointer transition-all shrink-0"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {canEditPdfs
                      ? '+ Préparer / Envoyer un PDF'
                      : 'Envoyer un PDF Officiel au Client'}
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Templates Bar */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-[#338b84]" />
                  <span>Modèles PDF Officiels disponibles sur le site ({templates.length}) :</span>
                </span>
                {canEditPdfs && (
                  <button
                    type="button"
                    onClick={() =>
                      templates.length > 0
                        ? openPdfStudioForTemplate(templates[0])
                        : openPdfStudioForNew()
                    }
                    className="text-[11px] font-bold text-[#338b84] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Modifier mes modèles PDF</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs shrink-0"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tmpl.accentColor || '#338b84' }}
                    />
                    <span className="font-bold text-slate-800">{tmpl.title}</span>
                    {(lockPdfForAdvisors || tmpl.lockedForAdvisors !== false) && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold"
                        title="Verrouillé pour les autres conseillers (Envoi uniquement)"
                      >
                        <Lock className="h-2.5 w-2.5" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        applyTemplateToDocumentForm(tmpl);
                        setAutoSendEmailImmediately(true);
                        setIsCreateModalOpen(true);
                      }}
                      className="ml-1 px-2 py-0.5 rounded-lg bg-[#338b84] hover:bg-[#256863] text-white font-bold text-[10px] cursor-pointer"
                    >
                      Envoyer
                    </button>
                    {canEditPdfs && (
                      <button
                        type="button"
                        onClick={() => openPdfStudioForTemplate(tmpl)}
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer"
                        title="Modifier ce modèle PDF"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Documents
                </span>
                <span className="text-lg font-black text-slate-900">{documents.length}</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Signés & Certifiés
                </span>
                <span className="text-lg font-black text-emerald-800">{signedCount}</span>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                  En attente signature
                </span>
                <span className="text-lg font-black text-amber-800">{pendingCount}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Brouillons
                </span>
                <span className="text-lg font-black text-slate-700">{draftCount}</span>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par titre, client, courriel ou référence dossier..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#338b84] focus:bg-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
              >
                <option value="all">Tous les statuts</option>
                <option value="signe">✓ Signés électroniquement</option>
                <option value="envoye">⏳ Envoyés (En attente)</option>
                <option value="brouillon">📝 Brouillons</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
              >
                <option value="all">Toutes les catégories</option>
                <option value="contrat_voyage">Contrats de voyage</option>
                <option value="autorisation_paiement">Autorisations de paiement</option>
                <option value="decharge_assurance">Décharges d'assurance</option>
                <option value="decharge_responsabilite">Décharges de responsabilité</option>
              </select>
            </div>
          </div>

          {/* Documents List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Chargement des documents légaux...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">Aucun document légal trouvé</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Envoyez un contrat de voyage, une autorisation de débit ou une décharge d'assurance en PDF avec signature électronique.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => {
                  const isSigned = doc.status === 'signe';
                  const isSent = doc.status === 'envoye';

                  return (
                    <div
                      key={doc.id}
                      className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col gap-3.5"
                    >
                      {/* Top Row: Title, Badges & Category */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-sm sm:text-base">
                              {doc.title}
                            </span>

                            {isSigned ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>SIGNÉ ÉLECTRONIQUEMENT</span>
                              </span>
                            ) : isSent ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock className="h-3 w-3 text-amber-600" />
                                <span>EN ATTENTE DE SIGNATURE</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                PRÊT À ENVOYER
                              </span>
                            )}

                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase">
                              {doc.category.replace('_', ' ')}
                            </span>

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                              <FileCheck className="h-2.5 w-2.5 text-[#338b84]" />
                              <span>PDF Officiel</span>
                            </span>
                          </div>

                          {/* Client metadata */}
                          <div className="text-xs text-slate-600 flex items-center gap-2.5 flex-wrap">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-400" />
                              {doc.clientName}
                            </span>
                            <span>&bull; {doc.clientEmail}</span>
                            {doc.submissionRef && (
                              <span className="font-mono text-[11px] text-[#338b84] font-bold">
                                &bull; Dossier : {doc.submissionRef}
                              </span>
                            )}
                            {doc.destination && <span>&bull; {doc.destination}</span>}
                          </div>

                          {/* File attachment & audit trail */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap pt-0.5">
                            <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono">
                              <Paperclip className="h-3 w-3 text-slate-400" />
                              {doc.fileAttachmentName} ({doc.fileAttachmentSize})
                            </span>
                            {doc.sentAt && (
                              <span>
                                &bull; Envoyé le {new Date(doc.sentAt).toLocaleDateString('fr-CA')} par{' '}
                                <strong>{doc.sentByAdvisorName || 'Conseiller'}</strong>
                              </span>
                            )}
                            {isSigned && doc.signedAt && (
                              <span className="text-emerald-700 font-bold">
                                &bull; Signé le {new Date(doc.signedAt).toLocaleDateString('fr-CA')} à{' '}
                                {new Date(doc.signedAt).toLocaleTimeString('fr-CA', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                ({doc.signedByIp})
                              </span>
                            )}
                          </div>
                        </div>

                        {canEditPdfs && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id, doc.title)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title="Supprimer ce document (Admin uniquement)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Actions Toolbar */}
                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setViewDoc(doc)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Consulter le document PDF"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          <span>Consulter</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadLegalDocumentPdf(doc)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Télécharger le fichier .PDF officiel"
                        >
                          <Download className="h-3.5 w-3.5 text-emerald-700" />
                          <span>Télécharger PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const url = generateSignatureShareUrl(doc);
                            navigator.clipboard.writeText(url);
                            showToast(
                              'success',
                              'Lien de signature sécurisé copié dans le presse-papier !'
                            );
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Copier le lien sécurisé pour faire signer le client"
                        >
                          <Link2 className="h-3.5 w-3.5 text-[#338b84]" />
                          <span>Lien signature</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEmailRecipient(doc.clientEmail);
                            setSendEmailDoc(doc);
                          }}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#338b84] hover:bg-[#256863] text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          title="Envoyer par courriel au client avec le PDF en pièce jointe"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{isSent || isSigned ? 'Renvoyer PDF' : 'Envoyer PDF'}</span>
                        </button>

                        {!isSigned && (
                          <button
                            type="button"
                            onClick={() => {
                              setSignDoc(doc);
                              setTypedSignerName(doc.clientName);
                              setLegalConsentChecked(false);
                              setTimeout(clearCanvas, 100);
                            }}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                            title="Faire signer électroniquement ce document"
                          >
                            <PenTool className="h-3.5 w-3.5" />
                            <span>Faire signer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL STUDIO : CRÉER / GÉRER MES MODÈLES PDF SUR LE SITE      */}
      {/* ------------------------------------------------------------- */}
      {isPdfStudioOpen && canEditPdfs && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
            {/* Studio Header */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Créateur & Gestionnaire de Modèles PDF sur le site
                  </h3>
                  <p className="text-xs text-teal-100/90">
                    Créez vos PDF officiels vous-même ici. Une fois verrouillés, vos autres conseillers ne pourront rien modifier et auront uniquement à les envoyer aux clients.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPdfStudioOpen(false)}
                className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Studio Content: Left = Templates + Builder, Right = Live A4 PDF Preview */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {/* Left 7 columns: Template selector + Editor */}
              <form
                onSubmit={handleSaveStudioTemplate}
                className="lg:col-span-7 p-4 sm:p-6 space-y-4 text-xs overflow-y-auto"
              >
                {/* Existing templates bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-800 uppercase tracking-wider text-[11px]">
                      Vos Modèles PDF enregistrés ({templates.length})
                    </span>
                    <button
                      type="button"
                      onClick={openPdfStudioForNew}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Créer un nouveau PDF</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
                    {templates.map((t) => {
                      const active = editingTemplateId === t.id;
                      return (
                        <div
                          key={t.id}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs transition-all shrink-0 ${
                            active
                              ? 'bg-teal-50 border-[#338b84] text-teal-950 font-black shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => openPdfStudioForTemplate(t)}
                            className="flex items-center gap-1.5 cursor-pointer text-left"
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: t.accentColor || '#338b84' }}
                            />
                            <span className="truncate max-w-[180px]">{t.title}</span>
                            {t.lockedForAdvisors !== false && (
                              <Lock className="h-3 w-3 text-amber-600 shrink-0" />
                            )}
                          </button>
                          {templates.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(t)}
                              className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                              title="Supprimer ce modèle PDF"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lock Toggle Box */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    studioLocked
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl ${
                        studioLocked
                          ? 'bg-amber-200/70 text-amber-900'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {studioLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <span className="font-black block text-xs">
                        {studioLocked
                          ? '🔒 Modification bloquée pour les autres conseillers (Recommandé)'
                          : '🔓 Modification autorisée pour les conseillers'}
                      </span>
                      <span className="text-[11px] opacity-85">
                        {studioLocked
                          ? 'Les autres conseillers pourront uniquement sélectionner un client et envoyer ce PDF sans pouvoir toucher au texte ni au titre.'
                          : 'Les conseillers pourront modifier le texte de ce modèle avant envoi.'}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={studioLocked}
                    onChange={(e) => setStudioLocked(e.target.checked)}
                    className="h-5 w-5 rounded border-amber-400 text-[#338b84] focus:ring-[#338b84] cursor-pointer shrink-0"
                  />
                </div>

                {/* Title, Category & FileName */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Titre officiel du document PDF * :
                    </label>
                    <input
                      type="text"
                      required
                      value={studioTitle}
                      onChange={(e) => setStudioTitle(e.target.value)}
                      placeholder="Ex: Contrat de Réservation Forfait Sud"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-[#338b84]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Catégorie :</label>
                    <select
                      value={studioCategory}
                      onChange={(e) => setStudioCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white cursor-pointer"
                    >
                      <option value="contrat_voyage">Contrat de voyage</option>
                      <option value="autorisation_paiement">Autorisation de paiement</option>
                      <option value="decharge_assurance">Décharge assurance</option>
                      <option value="decharge_responsabilite">Décharge responsabilité</option>
                      <option value="declaration_medicale">Déclaration médicale</option>
                      <option value="autre">Autre document officiel</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Sous-titre d'en-tête du PDF :
                    </label>
                    <input
                      type="text"
                      value={studioHeaderSubtitle}
                      onChange={(e) => setStudioHeaderSubtitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nom du fichier .PDF généré :
                    </label>
                    <input
                      type="text"
                      value={studioFileName}
                      onChange={(e) => setStudioFileName(e.target.value)}
                      placeholder="Contrat_Voyage_Evasion_Soleil.pdf"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                    />
                  </div>
                </div>

                {/* Accent Color Picker */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Couleur officielle du bandeau PDF :
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setStudioAccentColor(c.hex)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border cursor-pointer transition-all ${
                          studioAccentColor === c.hex
                            ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full border border-white/50"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Variable Insertion Bar */}
                <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-teal-950 text-[11px]">
                      Variables intelligentes (remplies automatiquement quand le conseiller choisit un client) :
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {DYNAMIC_VARIABLES.map((v) => (
                      <button
                        key={v.token}
                        type="button"
                        onClick={() => insertTokenIntoStudio(v.token)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-600 hover:text-white text-teal-900 border border-teal-300 font-mono text-[11px] font-bold transition-colors cursor-pointer"
                        title={`Insérer ${v.label}`}
                      >
                        + {v.token}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body Content Textarea */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Contenu intégral & Clauses de votre PDF * :
                  </label>
                  <textarea
                    ref={studioTextareaRef}
                    rows={12}
                    required
                    value={studioBody}
                    onChange={(e) => setStudioBody(e.target.value)}
                    placeholder="Rédigez ici les clauses officielles de votre PDF..."
                    className="w-full p-3.5 rounded-2xl border border-slate-300 font-mono text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#338b84] leading-relaxed"
                  />
                </div>

                {/* Footer Legal Note */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mention légale de pied de page PDF :
                  </label>
                  <input
                    type="text"
                    value={studioFooterNote}
                    onChange={(e) => setStudioFooterNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-[11px]"
                  />
                </div>

                {/* Studio Save Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const previewBody = resolveTemplateVariables(studioBody, {
                        clientName: client?.fullName || 'Marc-André Bouchard (Exemple)',
                        clientEmail: client?.email || 'client@exemple.ca',
                        clientPhone: client?.phone || '514-555-0199',
                        destination: 'Cancún, Mexique',
                        submissionRef: 'ES-2026-DEMO',
                        advisorName: currentUser?.name || 'Conseiller Évasion Soleil',
                      });
                      downloadLegalDocumentPdf({
                        id: 'preview_pdf',
                        title: studioTitle || 'Apercu_PDF',
                        category: studioCategory,
                        clientKey: 'preview',
                        clientName: client?.fullName || 'Marc-André Bouchard',
                        clientEmail: client?.email || 'client@exemple.ca',
                        clientPhone: client?.phone || '514-555-0199',
                        submissionRef: 'ES-2026-DEMO',
                        destination: 'Cancún, Mexique',
                        status: 'brouillon',
                        documentBodyHtml: previewBody,
                        fileAttachmentName: studioFileName || 'Apercu_Evasion_Soleil.pdf',
                        headerSubtitle: studioHeaderSubtitle,
                        footerLegalNote: studioFooterNote,
                        accentColor: studioAccentColor,
                        sentByAdvisorName: currentUser?.name || 'Direction Évasion Soleil',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-[#338b84]" />
                    <span>Télécharger un PDF de test (.pdf)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPdfStudioOpen(false)}
                      className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Fermer
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingStudio}
                      className="px-5 py-2.5 rounded-xl font-black bg-gradient-to-r from-teal-700 to-[#338b84] hover:from-teal-800 hover:to-[#256863] text-white shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>
                        {isSavingStudio
                          ? 'Enregistrement...'
                          : editingTemplateId
                            ? 'Enregistrer les modifications du PDF'
                            : 'Enregistrer ce nouveau Modèle PDF'}
                      </span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Right 5 columns: Live A4 Sheet Preview */}
              <div className="lg:col-span-5 bg-slate-100 p-4 sm:p-6 overflow-y-auto flex flex-col items-center">
                <div className="w-full max-w-md space-y-2 mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Aperçu en direct de la feuille PDF A4
                  </span>
                  {studioLocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <Lock className="h-2.5 w-2.5" />
                      <span>Verrouillé Conseillers</span>
                    </span>
                  )}
                </div>

                {/* Simulated A4 Paper */}
                <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden text-[10px] text-slate-800 flex flex-col">
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: studioAccentColor || '#338b84' }}
                  />
                  <div className="p-5 space-y-3.5">
                    <div className="flex items-start justify-between gap-2 border-b-2 pb-3" style={{ borderColor: studioAccentColor || '#338b84' }}>
                      <div>
                        <div className="text-sm font-black text-slate-900 tracking-tight">
                          ÉVASION SOLEIL VOYAGES
                        </div>
                        <div
                          className="text-[9px] font-extrabold uppercase"
                          style={{ color: studioAccentColor || '#338b84' }}
                        >
                          {studioHeaderSubtitle}
                        </div>
                        <div className="text-[8px] text-slate-400 mt-0.5">
                          3250 Boul. des Forges, Trois-Rivières, QC &bull; 1-800-555-SOLEIL
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                        MODÈLE PDF OFFICIEL
                      </span>
                    </div>

                    <div
                      className="p-2 rounded bg-slate-50 font-black text-xs text-slate-900 border-l-4"
                      style={{ borderColor: studioAccentColor || '#338b84' }}
                    >
                      {studioTitle || 'Titre du document PDF'}
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-100/80 p-2.5 rounded-lg text-[9px] border border-slate-200">
                      <div>
                        <span className="text-[7px] uppercase font-bold text-slate-400 block">
                          Voyageur / Client
                        </span>
                        <span className="font-bold text-slate-900">
                          {client?.fullName || 'Marc-André Bouchard'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[7px] uppercase font-bold text-slate-400 block">
                          Courriel Certifié
                        </span>
                        <span className="font-bold text-slate-900">
                          {client?.email || 'client@exemple.ca'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-white font-mono text-[9.5px] leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                      {resolveTemplateVariables(studioBody, {
                        clientName: client?.fullName || 'Marc-André Bouchard',
                        clientEmail: client?.email || 'client@exemple.ca',
                        clientPhone: client?.phone || '514-555-0199',
                        destination: 'Cancún, Mexique',
                        submissionRef: 'ES-2026-DEMO',
                        advisorName: currentUser?.name || 'Conseiller Évasion Soleil',
                      })}
                    </div>

                    <div className="p-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 space-y-1">
                      <div className="font-black text-[9px] text-slate-700">
                        ✍️ ENGAGEMENT & SIGNATURE ÉLECTRONIQUE DU CLIENT
                      </div>
                      <div className="text-[8px] text-slate-500">
                        Certificat électronique horodaté avec signature manuscrite et adresse IP.
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[8px] text-slate-400 text-center">
                      {studioFooterNote}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1 : ENVOYER / PRÉPARER UN DOCUMENT PDF AU CLIENT        */}
      {/* ------------------------------------------------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-[#286f6a] p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 text-emerald-300">
                  {isCurrentDocumentLockedForUser ? (
                    <Lock className="h-5 w-5 text-amber-300" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {isCurrentDocumentLockedForUser
                        ? 'Envoyer un PDF Officiel à faire signer'
                        : 'Préparer & Envoyer un Document PDF Client'}
                    </h3>
                    {isCurrentDocumentLockedForUser && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-200 border border-amber-300/40">
                        🔒 Modification bloquée (Envoi uniquement)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-teal-100">
                    {isCurrentDocumentLockedForUser
                      ? 'Sélectionnez le modèle PDF officiel et le client destinataire : le PDF sera généré et envoyé automatiquement.'
                      : 'Sélectionnez un modèle PDF créé sur le site ou personnalisez le document avant envoi.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleCreateDocument}
              className="p-5 overflow-y-auto space-y-4 text-xs flex-1 scrollbar-thin"
            >
              {/* Step 1: Template Selector */}
              <div className="bg-teal-50/60 p-3.5 rounded-2xl border border-teal-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-black text-teal-950 flex items-center gap-1.5">
                    <span>1. Choisir le Modèle PDF Officiel à envoyer :</span>
                  </label>
                  {canEditPdfs && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateModalOpen(false);
                        const found = templates.find((t) => t.id === selectedTemplateId);
                        if (found) openPdfStudioForTemplate(found);
                        else openPdfStudioForNew();
                      }}
                      className="text-[11px] font-extrabold text-[#338b84] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      <span>Modifier / Créer un modèle PDF</span>
                    </button>
                  )}
                </div>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-teal-300 font-bold bg-white focus:ring-2 focus:ring-[#338b84] cursor-pointer text-slate-900"
                >
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      📄 {tmpl.title} ({tmpl.defaultFileName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Client & Dossier Details */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="font-black text-slate-800">
                  2. Destinataire du PDF & Dossier Voyage :
                </div>

                {!client && allClients.length > 0 && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Sélectionner un client du répertoire CRM :
                    </label>
                    <select
                      onChange={(e) => handleSelectClientProfile(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white focus:ring-2 focus:ring-[#338b84] cursor-pointer"
                    >
                      <option value="">Choisir un client existant...</option>
                      {allClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.email || c.phone}) &bull; {c.submissionsCount} demande(s)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nom complet du client * :
                    </label>
                    <input
                      type="text"
                      required
                      value={docClientName}
                      onChange={(e) => setDocClientName(e.target.value)}
                      placeholder="Prénom et Nom"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Courriel destinataire * :
                    </label>
                    <input
                      type="email"
                      required
                      value={docClientEmail}
                      onChange={(e) => setDocClientEmail(e.target.value)}
                      placeholder="client@domaine.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Destination du voyage :
                    </label>
                    <input
                      type="text"
                      value={docDestination}
                      onChange={(e) => setDocDestination(e.target.value)}
                      placeholder="Ex: Punta Cana, Cancún..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Référence dossier / Soumission :
                    </label>
                    <input
                      type="text"
                      value={docSubmissionRef}
                      onChange={(e) => setDocSubmissionRef(e.target.value)}
                      placeholder="ES-2026-XXXX"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Document Content (LOCKED for Advisors, Editable for Admin) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-black text-slate-800 flex items-center gap-1.5">
                    <span>3. Contenu du PDF officiel :</span>
                    {isCurrentDocumentLockedForUser && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                        <Lock className="h-3 w-3" />
                        <span>Verrouillé par l'administrateur — Non modifiable</span>
                      </span>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      downloadLegalDocumentPdf({
                        id: 'apercu_direct',
                        title: docTitle || 'Document_Officiel',
                        category: docCategory,
                        clientKey: docClientKey || 'apercu',
                        clientName: docClientName || 'Client Évasion Soleil',
                        clientEmail: docClientEmail || 'client@exemple.ca',
                        clientPhone: docClientPhone,
                        submissionRef: docSubmissionRef,
                        destination: docDestination,
                        status: 'brouillon',
                        documentBodyHtml: docBodyText,
                        fileAttachmentName: docFileName,
                        headerSubtitle: docHeaderSubtitle,
                        footerLegalNote: docFooterLegalNote,
                        accentColor: docAccentColor,
                        sentByAdvisorName: currentUser?.name || 'Conseiller Évasion Soleil',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3 w-3" />
                    <span>Prévisualiser le vrai fichier .PDF</span>
                  </button>
                </div>

                {/* Title & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Titre officiel du PDF :
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={isCurrentDocumentLockedForUser}
                      value={docTitle}
                      onChange={(e) => {
                        if (!isCurrentDocumentLockedForUser) setDocTitle(e.target.value);
                      }}
                      className={`w-full px-3 py-2 rounded-xl border font-semibold ${
                        isCurrentDocumentLockedForUser
                          ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                          : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-[#338b84]'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Catégorie légale :
                    </label>
                    <select
                      disabled={isCurrentDocumentLockedForUser}
                      value={docCategory}
                      onChange={(e) => {
                        if (!isCurrentDocumentLockedForUser)
                          setDocCategory(e.target.value as any);
                      }}
                      className={`w-full px-3 py-2 rounded-xl border font-semibold ${
                        isCurrentDocumentLockedForUser
                          ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                          : 'bg-white border-slate-300 text-slate-900 cursor-pointer'
                      }`}
                    >
                      <option value="contrat_voyage">Contrat de voyage</option>
                      <option value="autorisation_paiement">Autorisation de débit</option>
                      <option value="decharge_assurance">Décharge assurance</option>
                      <option value="decharge_responsabilite">Décharge responsabilité</option>
                      <option value="declaration_medicale">Déclaration médicale</option>
                      <option value="autre">Autre document</option>
                    </select>
                  </div>
                </div>

                {/* Clauses / Body */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Clauses contractuelles & Texte du PDF :
                  </label>
                  <textarea
                    rows={6}
                    readOnly={isCurrentDocumentLockedForUser}
                    value={docBodyText}
                    onChange={(e) => {
                      if (!isCurrentDocumentLockedForUser) setDocBodyText(e.target.value);
                    }}
                    className={`w-full p-3 rounded-xl border font-mono text-[11px] leading-relaxed ${
                      isCurrentDocumentLockedForUser
                        ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                        : 'bg-slate-50/50 border-slate-300 text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#338b84]'
                    }`}
                  />
                </div>

                {/* File Attachment Info (Upload only visible to Admin when unlocked) */}
                <div className="bg-teal-50/50 p-3.5 rounded-2xl border border-teal-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-teal-950 flex items-center gap-1.5">
                      <Paperclip className="h-4 w-4 text-[#338b84]" />
                      <span>Fichier PDF joint automatiquement au courriel :</span>
                    </span>
                    <span className="text-[10px] text-teal-700 font-bold">
                      {uploadedFileSize}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      readOnly={isCurrentDocumentLockedForUser}
                      value={docFileName}
                      onChange={(e) => {
                        if (!isCurrentDocumentLockedForUser) setDocFileName(e.target.value);
                      }}
                      className={`flex-1 px-3 py-1.5 rounded-lg border font-mono text-xs ${
                        isCurrentDocumentLockedForUser
                          ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                    {!isCurrentDocumentLockedForUser && (
                      <label className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#338b84] hover:bg-[#256863] text-white cursor-pointer transition-colors flex items-center gap-1 shrink-0">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Importer un autre PDF</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[11px] text-teal-800">
                    {isCurrentDocumentLockedForUser
                      ? '🔒 Ce fichier PDF officiel est généré automatiquement à partir du modèle certifié de l’agence.'
                      : 'Le fichier PDF officiel est généré automatiquement sur le site (ou vous pouvez téléverser un PDF externe).'}
                  </p>
                </div>
              </div>

              {/* Auto send toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="auto_send_doc_checkbox"
                  checked={autoSendEmailImmediately}
                  onChange={(e) => setAutoSendEmailImmediately(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#338b84] focus:ring-[#338b84] cursor-pointer"
                />
                <label
                  htmlFor="auto_send_doc_checkbox"
                  className="font-semibold text-slate-800 cursor-pointer"
                >
                  <strong>Envoyer immédiatement par courriel</strong> avec le PDF en pièce jointe à{' '}
                  <strong>{docClientEmail || 'ce client'}</strong>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl font-black bg-gradient-to-r from-teal-700 to-[#338b84] hover:from-teal-800 hover:to-[#256863] text-white shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? 'Génération & Envoi du PDF...'
                      : autoSendEmailImmediately
                        ? 'Envoyer le PDF au client pour signature'
                        : 'Générer et enregistrer le PDF'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2 : ENVOYER LE COURRIEL AVEC PIÈCE JOINTE               */}
      {/* ------------------------------------------------------------- */}
      {sendEmailDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-900 to-[#286f6a] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-300" />
                <h4 className="font-black text-sm">Envoyer le Document PDF par Courriel</h4>
              </div>
              <button
                onClick={() => setSendEmailDoc(null)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{sendEmailDoc.title}</div>
                <div className="text-slate-500 flex items-center gap-1">
                  <Paperclip className="h-3 w-3 text-slate-400" />
                  <span>
                    Pièce jointe PDF : <strong>{sendEmailDoc.fileAttachmentName}</strong> (
                    {sendEmailDoc.fileAttachmentSize})
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Courriel destinataire :
                </label>
                <input
                  type="email"
                  required
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Message d'accompagnement de votre conseiller :
                </label>
                <textarea
                  rows={4}
                  value={emailPersonalMessage}
                  onChange={(e) => setEmailPersonalMessage(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs"
                />
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Prêt pour l'envoi sécurisé</span>
                </div>
                <p>
                  Le courriel inclura le lien direct de signature électronique certifiée ainsi que le fichier PDF{' '}
                  <strong>{sendEmailDoc.fileAttachmentName}</strong> en pièce jointe directe.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSendEmailDoc(null)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl font-black bg-gradient-to-r from-teal-700 to-[#338b84] hover:from-teal-800 text-white shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? 'Envoi en cours...' : 'Envoyer le PDF au client'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3 : SIGNATURE ÉLECTRONIQUE (Pad de signature client)    */}
      {/* ------------------------------------------------------------- */}
      {signDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-r from-slate-900 to-emerald-900 p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <PenTool className="h-5 w-5 text-emerald-300" />
                <div>
                  <h4 className="font-black text-sm">Signature Électronique Certifiée</h4>
                  <p className="text-[11px] text-emerald-200">{signDoc.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSignDoc(null)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1 scrollbar-thin">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="font-black text-slate-900 text-sm">{signDoc.title}</div>
                <div className="text-[11px] text-slate-600 max-h-32 overflow-y-auto font-mono bg-white p-2.5 rounded-xl border border-slate-200 whitespace-pre-wrap">
                  {signDoc.documentBodyHtml || signDoc.contentSummary}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nom officiel du signataire :
                </label>
                <input
                  type="text"
                  value={typedSignerName}
                  onChange={(e) => setTypedSignerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  placeholder="Ex: Marc-André Bouchard"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <span>Apposez votre signature manuelle ci-dessous :</span>
                  </label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Effacer</span>
                  </button>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50/50">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-32 cursor-crosshair touch-none bg-white"
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Signez avec votre souris ou au doigt sur écran tactile.</span>
                  <span>Certifié SSL &bull; Horodatage 2026</span>
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="consent_checkbox_legal"
                  checked={legalConsentChecked}
                  onChange={(e) => setLegalConsentChecked(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer mt-0.5"
                />
                <label
                  htmlFor="consent_checkbox_legal"
                  className="text-[11px] text-amber-950 leading-relaxed cursor-pointer font-medium"
                >
                  Je certifie être le signataire autorisé, avoir pris connaissance de l'ensemble des clauses du document, et consens à ce que ma signature électronique ait la même valeur juridique qu'une signature manuscrite.
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSignDoc(null)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSignSubmit}
                  disabled={isSubmitting || !legalConsentChecked}
                  className="px-6 py-2.5 rounded-xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSubmitting ? 'Validation...' : 'Valider & Certifier la Signature'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4 : VISUALISER LE DOCUMENT COMPLET                      */}
      {/* ------------------------------------------------------------- */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-400" />
                <div>
                  <h4 className="font-black text-sm">{viewDoc.title}</h4>
                  <span className="text-[10px] text-slate-400">
                    {viewDoc.fileAttachmentName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewDoc(null)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1 scrollbar-thin">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Client
                  </span>
                  <span className="font-extrabold text-slate-900">{viewDoc.clientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Courriel
                  </span>
                  <span className="font-semibold text-slate-800">{viewDoc.clientEmail}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Statut
                  </span>
                  <span className="font-bold text-emerald-700 uppercase">
                    {viewDoc.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Dossier
                  </span>
                  <span className="font-mono text-slate-800">
                    {viewDoc.submissionRef || 'Général'}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">
                  Texte intégral du PDF officiel :
                </span>
                <div className="p-4 rounded-2xl border border-slate-200 font-mono text-xs bg-slate-50 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {viewDoc.documentBodyHtml || viewDoc.contentSummary}
                </div>
              </div>

              {viewDoc.status === 'signe' && (
                <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <span className="font-black text-emerald-950 text-sm">
                      Certificat de Signature Électronique
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                    <div>
                      <span className="text-slate-400 block">Signé par :</span>
                      <strong>{viewDoc.signatureSignerName || viewDoc.clientName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Horodatage officiel :</span>
                      <strong>
                        {viewDoc.signedAt
                          ? new Date(viewDoc.signedAt).toLocaleString('fr-CA')
                          : 'Récemment'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Adresse IP :</span>
                      <strong className="font-mono">
                        {viewDoc.signedByIp || '142.112.98.45'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Jeton sécurisé :</span>
                      <strong className="font-mono text-[10px]">
                        {viewDoc.signatureToken}
                      </strong>
                    </div>
                  </div>

                  {viewDoc.signatureDataUrl && (
                    <div className="pt-2 border-t border-emerald-200">
                      <span className="text-[10px] text-slate-400 block mb-1">
                        Empreinte graphique :
                      </span>
                      <div className="bg-white p-2 rounded-xl border border-emerald-200 inline-block">
                        <img
                          src={viewDoc.signatureDataUrl}
                          alt="Signature Client"
                          className="h-12 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadLegalDocumentPdf(viewDoc)}
                    className="px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Télécharger le .PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = generateSignatureShareUrl(viewDoc);
                      navigator.clipboard.writeText(url);
                      showToast('success', 'Lien de signature copié dans le presse-papier !');
                    }}
                    className="px-3 py-1.5 rounded-xl font-bold text-xs bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Link2 className="h-3.5 w-3.5 text-[#338b84]" />
                    <span>Copier le lien</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewDoc(null)}
                    className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewDoc(null);
                      setEmailRecipient(viewDoc.clientEmail);
                      setSendEmailDoc(viewDoc);
                    }}
                    className="px-4 py-2 rounded-xl font-bold bg-[#338b84] hover:bg-[#256863] text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Envoyer par courriel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
