import React, { useState, useMemo } from 'react';
import {
  Users,
  Phone,
  PhoneCall,
  CheckCircle,
  Clock,
  Send,
  Trash2,
  Filter,
  Search,
  FileText,
  Calendar,
  DollarSign,
  Palmtree,
  Ship,
  Plane,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  ShieldCheck,
  Tag,
  Sparkles,
  Plus,
  X,
  Mail,
  Lock,
  FileCode,
  Copy,
  Check,
  Crown,
  UserCheck,
  UserPlus,
  RotateCcw,
  LayoutGrid,
  List,
  FileCheck,
  Eye,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { QuoteSubmission, CallStatus, User, NewsletterSubscriber, ClientNote } from '../types';
import { getSafeAvatar } from '../utils/avatarUtils';
import { SubmissionProposalViewerModal } from './SubmissionProposalViewerModal';
import { SendSubmissionProposalModal, type SendSubmissionProposalModalProps } from './SendSubmissionProposalModal';

export { SendSubmissionProposalModal, type SendSubmissionProposalModalProps };

export interface SubmissionsPipelineProps {
  submissions: QuoteSubmission[];
  currentUser: User;
  allUsers: User[];
  newsletterSubscribers?: NewsletterSubscriber[];
  onUpdateStatus: (id: string, status: CallStatus, note?: { text: string; authorName: string; authorGrade: string }) => Promise<void>;
  onDeleteSubmission: (id: string) => Promise<void>;
  onAddNote: (id: string, text: string, authorName: string, authorGrade: string) => Promise<void>;
  onUpdateTags?: (id: string, tags: string[]) => Promise<void>;
  onAssignSubmission?: (id: string, assignedToUserId?: string, assignedToUserName?: string, note?: string) => Promise<void>;
  onViewClientInCRM?: (clientKey: string) => void;
  onMergeClients?: (params: {
    primaryClientKey: string;
    secondaryClientKey: string;
    targetInfo?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  }) => Promise<{ success: boolean; message: string }>;
  onSelectProposal?: (
    id: string,
    proposalId: string | null,
    notes?: string,
    autoSetReserved?: boolean
  ) => Promise<{ success: boolean; submission?: QuoteSubmission }>;
  onSubmissionUpdated?: (updatedSubmission: QuoteSubmission) => void;
}

export interface DerivedTag {
  key: string;
  label: string;
  bg: string;
  text: string;
  border: string;
  icon?: any;
}

// 7 Statuts d'appel officiels
export const statusDefinitions: { id: CallStatus; label: string; color: string; badgeBg: string; text: string; border: string; icon: any }[] = [
  { id: 'a_appeler', label: 'À appeler (Nouveau)', color: 'bg-amber-500', badgeBg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', icon: Clock },
  { id: 'appele_non_repondu', label: 'Appelé - Sans réponse', color: 'bg-orange-500', badgeBg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300', icon: Phone },
  { id: 'appele_contact_etabli', label: 'Contact établi', color: 'bg-teal-600', badgeBg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-300', icon: PhoneCall },
  { id: 'devis_en_cours', label: 'Devis en cours', color: 'bg-blue-500', badgeBg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', icon: FileText },
  { id: 'devis_envoye', label: 'Devis envoyé', color: 'bg-purple-600', badgeBg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300', icon: Send },
  { id: 'reserve', label: 'Voyage Réservé 🎉', color: 'bg-emerald-600', badgeBg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', icon: CheckCircle },
  { id: 'perdu', label: 'Sans suite / Perdu', color: 'bg-slate-400', badgeBg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: X },
];

export const SubmissionsPipeline: React.FC<SubmissionsPipelineProps> = ({
  submissions,
  currentUser,
  allUsers,
  newsletterSubscribers = [],
  onUpdateStatus,
  onDeleteSubmission,
  onAddNote,
  onUpdateTags,
  onAssignSubmission,
  onViewClientInCRM,
  onSelectProposal,
  onSubmissionUpdated,
}) => {
  // Navigation & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'new' | 'sent' | 'reserved' | 'vip' | 'blacklist'>('all');
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('cards');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedAdvisorFilter, setSelectedAdvisorFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Detail Modal / Drawer State
  const [selectedSubmission, setSelectedSubmission] = useState<QuoteSubmission | null>(null);
  const [detailTab, setDetailTab] = useState<'voyage' | 'appel' | 'propositions' | 'notes'>('voyage');
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [newClientNoteText, setNewClientNoteText] = useState('');
  const [isSavingClientNote, setIsSavingClientNote] = useState(false);
  const [clientNotesList, setClientNotesList] = useState<ClientNote[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  // Load permanent CRM client notes
  React.useEffect(() => {
    const fetchClientNotes = async () => {
      try {
        const res = await fetch('/api/crm/notes');
        if (res.ok) {
          const data: ClientNote[] = await res.json();
          if (Array.isArray(data)) {
            setClientNotesList(data);
          }
        }
      } catch (err) {
        console.warn('Could not load client notes in pipeline:', err);
      }
    };
    fetchClientNotes();
  }, []);

  // Modals for proposals
  const [sendProposalModalSubmission, setSendProposalModalSubmission] = useState<QuoteSubmission | null>(null);
  const [viewProposalModalSubmission, setViewProposalModalSubmission] = useState<QuoteSubmission | null>(null);

  // Transfer dossier state
  const [transferringSubId, setTransferringSubId] = useState<string | null>(null);
  const [selectedTransferUserId, setSelectedTransferUserId] = useState<string>('');

  const isSuperAdmin = currentUser.role === 'super_admin' || currentUser.username?.toLowerCase() === 'admin';
  const isAdmin = isSuperAdmin || currentUser.role === 'admin';

  // Vérifie si l'utilisateur connecté est le responsable assigné au dossier
  const isResponsibleAdvisor = (sub: QuoteSubmission): boolean => {
    if (!sub.assignedToUserId && !sub.assignedToUserName) return false;
    return (
      Boolean(sub.assignedToUserId && sub.assignedToUserId === currentUser.id) ||
      Boolean(
        sub.assignedToUserName &&
          sub.assignedToUserName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
      )
    );
  };

  // Safe traveler name and initials helpers
  const getTravelerName = (sub: QuoteSubmission): string => {
    const first = (sub.customerFirstName || '').trim();
    const last = (sub.customerLastName || '').trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
    if ((sub as any).fullName && String((sub as any).fullName).trim()) {
      return String((sub as any).fullName).trim();
    }
    return sub.customerEmail || 'Voyageur';
  };

  const getTravelerInitials = (sub: QuoteSubmission): string => {
    const name = getTravelerName(sub);
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return (name.charAt(0) || 'C').toUpperCase();
  };

  // Get canonical CRM client ID for a submission
  const getClientIdForSubmission = (sub: QuoteSubmission): string => {
    const cleanEmail = (sub.customerEmail || '').trim().toLowerCase();
    const cleanPhone = (sub.customerPhone || '').replace(/\D/g, '');
    const rawKey = cleanEmail ? `email:${cleanEmail}` : cleanPhone ? `phone:${cleanPhone}` : `sub:${sub.id}`;
    return `cli_${rawKey.replace(/[^a-z0-9]/g, '_')}`;
  };

  // Get permanent CRM client notes matching a submission
  const getClientNotesForSubmission = (sub: QuoteSubmission): ClientNote[] => {
    const cid = getClientIdForSubmission(sub);
    const cleanEmail = (sub.customerEmail || '').trim().toLowerCase();
    return clientNotesList.filter(
      (n) =>
        n.clientId === cid ||
        (cleanEmail && n.clientId.toLowerCase().includes(cleanEmail.replace(/[^a-z0-9]/g, '_')))
    );
  };

  // Fast subscriber check
  const subscriberEmailSet = useMemo(() => {
    const s = new Set<string>();
    newsletterSubscribers.forEach((sub) => {
      if (sub.email) s.add(sub.email.trim().toLowerCase());
    });
    return s;
  }, [newsletterSubscribers]);

  const isClientSubscribed = (email?: string) => {
    if (!email) return false;
    return subscriberEmailSet.has(email.trim().toLowerCase());
  };

  const isVipSubmission = (sub: QuoteSubmission) => {
    return Boolean((sub.tags || []).some((t) => String(t).toUpperCase().includes('VIP')));
  };

  const isBlacklistSubmission = (sub: QuoteSubmission) => {
    return Boolean(
      (sub.tags || []).some(
        (t) => String(t).toUpperCase().includes('BLACK') || String(t).toUpperCase().includes('NOIRE')
      )
    );
  };

  // Filter submissions cleanly
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tagsStr = (sub.tags || []).join(' ');
        const fullTxt = `${getTravelerName(sub)} ${sub.customerEmail || ''} ${sub.customerPhone || ''} ${sub.referenceNumber || ''} ${sub.destination || ''} ${sub.departureCity || ''} ${tagsStr}`.toLowerCase();
        if (!fullTxt.includes(q)) return false;
      }

      // 2. Quick Filter
      if (quickFilter === 'new') {
        const isNewOrToCall =
          sub.callStatus === 'a_appeler' ||
          sub.callStatus === 'devis_en_cours' ||
          (!sub.proposalsSentAt && !sub.selectedProposalTitle && sub.callStatus !== 'reserve');
        if (!isNewOrToCall) return false;
      } else if (quickFilter === 'sent') {
        const hasSent = Boolean(sub.proposalsSentAt || (sub.proposals && sub.proposals.length > 0) || sub.callStatus === 'devis_envoye');
        if (!hasSent) return false;
      } else if (quickFilter === 'reserved') {
        if (sub.callStatus !== 'reserve') return false;
      } else if (quickFilter === 'vip') {
        if (!isVipSubmission(sub)) return false;
      } else if (quickFilter === 'blacklist') {
        if (!isBlacklistSubmission(sub)) return false;
      }

      // 3. Advisor filter
      if (selectedAdvisorFilter === 'mine') {
        if (sub.assignedToUserId !== currentUser.id && sub.assignedToUserName !== currentUser.name) return false;
      } else if (selectedAdvisorFilter === 'unassigned') {
        if (sub.assignedToUserId || sub.assignedToUserName) return false;
      } else if (selectedAdvisorFilter !== 'all') {
        if (sub.assignedToUserId !== selectedAdvisorFilter && sub.assignedToUserName !== selectedAdvisorFilter) return false;
      }

      // 4. Status filter
      if (selectedStatusFilter !== 'all' && sub.callStatus !== selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }, [submissions, searchQuery, quickFilter, selectedAdvisorFilter, selectedStatusFilter, currentUser]);

  // Counts for pills
  const counts = useMemo(() => {
    const total = submissions.length;
    const countNew = submissions.filter(
      (s) => s.callStatus === 'a_appeler' || s.callStatus === 'devis_en_cours' || (!s.proposalsSentAt && !s.selectedProposalTitle && s.callStatus !== 'reserve')
    ).length;
    const countSent = submissions.filter(
      (s) => Boolean(s.proposalsSentAt || (s.proposals && s.proposals.length > 0) || s.callStatus === 'devis_envoye')
    ).length;
    const countReserved = submissions.filter((s) => s.callStatus === 'reserve').length;
    const countVip = submissions.filter((s) => isVipSubmission(s)).length;
    const countBlacklist = submissions.filter((s) => isBlacklistSubmission(s)).length;
    return { total, countNew, countSent, countReserved, countVip, countBlacklist };
  }, [submissions]);

  // Status definition helper
  const getStatusDef = (status?: CallStatus) => {
    return statusDefinitions.find((s) => s.id === status) || statusDefinitions[0];
  };

  // Handle Quick Status Change
  const handleUpdateStatusAction = async (sub: QuoteSubmission, nextStatus: CallStatus) => {
    try {
      const noteText = `Statut mis à jour : [${getStatusDef(nextStatus).label}] par ${currentUser.name}`;
      await onUpdateStatus(sub.id, nextStatus, {
        text: noteText,
        authorName: currentUser.name,
        authorGrade: currentUser.grade,
      });

      const updated = { ...sub, callStatus: nextStatus };
      if (selectedSubmission?.id === sub.id) {
        setSelectedSubmission(updated);
      }
      if (onSubmissionUpdated) {
        onSubmissionUpdated(updated);
      }
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
    }
  };

  // Add submission note
  const handleAddNoteAction = async () => {
    if (!selectedSubmission || !newNoteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      await onAddNote(selectedSubmission.id, newNoteText.trim(), currentUser.name, currentUser.grade);
      const newNote = {
        id: `note_${Date.now()}`,
        authorName: currentUser.name,
        authorGrade: currentUser.grade,
        text: newNoteText.trim(),
        createdAt: new Date().toISOString(),
      };
      setSelectedSubmission({
        ...selectedSubmission,
        notes: [...(selectedSubmission.notes || []), newNote],
      });
      setNewNoteText('');
    } catch (err) {
      console.error('Erreur ajout de note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Add permanent CRM client note
  const handleAddClientNoteInPipeline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSubmission || !newClientNoteText.trim()) return;
    setIsSavingClientNote(true);
    try {
      const clientId = getClientIdForSubmission(selectedSubmission);
      const resp = await fetch(`/api/crm/clients/${encodeURIComponent(clientId)}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: currentUser.name,
          authorGrade: currentUser.grade,
          text: newClientNoteText.trim(),
        }),
      });
      if (resp.ok) {
        const savedNote: ClientNote = await resp.json();
        setClientNotesList((prev) => [savedNote, ...prev]);
        setNewClientNoteText('');
      }
    } catch (err) {
      console.error('Erreur ajout note client CRM:', err);
    } finally {
      setIsSavingClientNote(false);
    }
  };

  const handleDeleteClientNoteInPipeline = async (noteId: string) => {
    try {
      await fetch(`/api/crm/notes/${encodeURIComponent(noteId)}`, { method: 'DELETE' });
      setClientNotesList((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error('Erreur suppression note client CRM:', err);
    }
  };

  // Helper to sync tags across all submissions of the same client
  const syncTagsAcrossClientSubmissions = (sub: QuoteSubmission, newTags: string[]) => {
    const hasVip = newTags.some((t) => t.toUpperCase().includes('VIP'));
    const hasBlacklist = newTags.some((t) => t.toUpperCase().includes('BLACK') || t.toUpperCase().includes('NOIRE'));
    const targetEmail = (sub.customerEmail || '').trim().toLowerCase();
    const targetPhone = (sub.customerPhone || '').replace(/\D/g, '');

    if (onSubmissionUpdated && (targetEmail || targetPhone)) {
      submissions.forEach((other) => {
        if (other.id === sub.id) return;
        const otherEmail = (other.customerEmail || '').trim().toLowerCase();
        const otherPhone = (other.customerPhone || '').replace(/\D/g, '');
        const sameClient =
          (targetEmail && otherEmail === targetEmail) ||
          (targetPhone && targetPhone.length >= 7 && otherPhone === targetPhone);
        if (sameClient) {
          let otherTags = (other.tags || []).filter(
            (t) => !t.toUpperCase().includes('VIP') && !t.toUpperCase().includes('BLACK') && !t.toUpperCase().includes('NOIRE')
          );
          if (hasBlacklist) otherTags = ['Blacklist', ...otherTags];
          if (hasVip) otherTags = ['VIP', ...otherTags];
          onSubmissionUpdated({ ...other, tags: otherTags });
        }
      });
    }
  };

  // Toggle VIP
  const handleToggleVip = async (sub: QuoteSubmission, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentTags = sub.tags || [];
    const isVip = isVipSubmission(sub);
    const newTags = isVip
      ? currentTags.filter((t) => !t.toUpperCase().includes('VIP'))
      : ['VIP', ...currentTags];

    if (onUpdateTags) {
      await onUpdateTags(sub.id, newTags);
    }
    const updated = { ...sub, tags: newTags };
    if (selectedSubmission?.id === sub.id) {
      setSelectedSubmission(updated);
    }
    if (onSubmissionUpdated) {
      onSubmissionUpdated(updated);
    }
    syncTagsAcrossClientSubmissions(sub, newTags);
  };

  // Toggle Blacklist
  const handleToggleBlacklist = async (sub: QuoteSubmission, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentTags = sub.tags || [];
    const isBlack = isBlacklistSubmission(sub);
    const newTags = isBlack
      ? currentTags.filter((t) => !t.toUpperCase().includes('BLACK') && !t.toUpperCase().includes('NOIRE'))
      : ['Blacklist', ...currentTags];

    if (onUpdateTags) {
      await onUpdateTags(sub.id, newTags);
    }
    const updated = { ...sub, tags: newTags };
    if (selectedSubmission?.id === sub.id) {
      setSelectedSubmission(updated);
    }
    if (onSubmissionUpdated) {
      onSubmissionUpdated(updated);
    }
    syncTagsAcrossClientSubmissions(sub, newTags);
  };

  // Claim or Assign to current user
  const handleClaimSubmission = async (sub: QuoteSubmission, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onAssignSubmission) {
      await onAssignSubmission(
        sub.id,
        currentUser.id,
        currentUser.name,
        `Dossier pris en charge par ${currentUser.name}`
      );
      const updated = { ...sub, assignedToUserId: currentUser.id, assignedToUserName: currentUser.name };
      if (selectedSubmission?.id === sub.id) {
        setSelectedSubmission(updated);
      }
      if (onSubmissionUpdated) {
        onSubmissionUpdated(updated);
      }
    }
  };

  // Abandonner le dossier (remettre en Non assigné)
  const handleAbandonSubmission = async (sub: QuoteSubmission, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onAssignSubmission) {
      await onAssignSubmission(
        sub.id,
        '',
        '',
        `Dossier abandonné et libéré par ${currentUser.name}`
      );
      const updated = { ...sub, assignedToUserId: '', assignedToUserName: '' };
      if (selectedSubmission?.id === sub.id) {
        setSelectedSubmission(updated);
      }
      if (onSubmissionUpdated) {
        onSubmissionUpdated(updated);
      }
      if (transferringSubId === sub.id) {
        setTransferringSubId(null);
      }
    }
  };

  // Transférer le dossier à un autre conseiller
  const handleTransferSubmission = async (sub: QuoteSubmission, targetUserId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!targetUserId) return;
    const targetUser = allUsers.find((u) => u.id === targetUserId);
    if (!targetUser || !onAssignSubmission) return;

    await onAssignSubmission(
      sub.id,
      targetUser.id,
      targetUser.name,
      `Dossier transféré à ${targetUser.name} par ${currentUser.name}`
    );
    const updated = { ...sub, assignedToUserId: targetUser.id, assignedToUserName: targetUser.name };
    if (selectedSubmission?.id === sub.id) {
      setSelectedSubmission(updated);
    }
    if (onSubmissionUpdated) {
      onSubmissionUpdated(updated);
    }
    setTransferringSubId(null);
    setSelectedTransferUserId('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & STREAMLINED TOOLBAR */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        {/* Title & View Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#1a4542] to-[#338b84] text-white flex items-center justify-center shadow-xs">
                <Palmtree className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Espace Soumissions & Demandes
                </h2>
                <p className="text-xs text-slate-500">
                  Vue claire et épurée pour traiter les demandes de voyages sans surcharge d'information
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switcher + Actions */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setDisplayMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  displayMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Affichage en cartes spacieuses"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cartes</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  displayMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Affichage en tableau synthétique"
              >
                <List className="h-3.5 w-3.5" />
                <span>Tableau</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. SEARCH & CLEAN SEGMENTED PILLS */}
        <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 lg:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par voyageur, destination, téléphone, référence..."
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#338b84] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Segments */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setQuickFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>Toutes</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${quickFilter === 'all' ? 'bg-white/20' : 'bg-slate-200 text-slate-800'}`}>
                {counts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('new')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'new'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              <span>🟡 À traiter</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${quickFilter === 'new' ? 'bg-slate-950/20' : 'bg-amber-200 text-amber-950'}`}>
                {counts.countNew}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('sent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'sent'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200'
              }`}
            >
              <Send className="h-3 w-3" />
              <span>Devis envoyés</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${quickFilter === 'sent' ? 'bg-white/20' : 'bg-purple-200 text-purple-900'}`}>
                {counts.countSent}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('reserved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'reserved'
                  ? 'bg-emerald-700 text-white font-black shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
              }`}
            >
              <CheckCircle className="h-3 w-3" />
              <span>Réservés 🎉</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${quickFilter === 'reserved' ? 'bg-white/20' : 'bg-emerald-200 text-emerald-950'}`}>
                {counts.countReserved}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('vip')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'vip'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              <Crown className="h-3 w-3 fill-amber-500 text-amber-600" />
              <span>VIP ({counts.countVip})</span>
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('blacklist')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'blacklist'
                  ? 'bg-rose-700 text-white font-black shadow-xs'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300'
              }`}
            >
              <span>⛔ Blacklist ({counts.countBlacklist})</span>
            </button>

            {/* Advanced Filters Button */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                showAdvancedFilters || selectedAdvisorFilter !== 'all' || selectedStatusFilter !== 'all'
                  ? 'bg-[#338b84] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <ChevronDown className={`h-3 w-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-3 rounded-xl animate-in fade-in">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Filtrer par Conseiller :</label>
              <select
                value={selectedAdvisorFilter}
                onChange={(e) => setSelectedAdvisorFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800 font-semibold"
              >
                <option value="all">Tous les conseillers</option>
                <option value="mine">Mes dossiers uniquement ({currentUser.name})</option>
                <option value="unassigned">Non assignés</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Filtrer par Statut d'appel précis :</label>
              <div className="flex gap-2">
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800 font-semibold"
                >
                  <option value="all">Tous les statuts d'appel</option>
                  {statusDefinitions.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
                {(selectedAdvisorFilter !== 'all' || selectedStatusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAdvisorFilter('all');
                      setSelectedStatusFilter('all');
                    }}
                    className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                    title="Réinitialiser"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. MAIN CONTENT: CLEAN CARDS OR STREAMLINED TABLE */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">Aucune soumission ne correspond à ces critères</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Essayez de réinitialiser la recherche ou de changer de filtre pour voir d'autres demandes.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setQuickFilter('all');
              setSelectedAdvisorFilter('all');
              setSelectedStatusFilter('all');
            }}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Afficher toutes les soumissions
          </button>
        </div>
      ) : displayMode === 'cards' ? (
        /* MODE CARTES ÉPURÉES (ANTI-SURCHARGE) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSubmissions.map((sub) => {
            const isVip = isVipSubmission(sub);
            const isBlacklist = isBlacklistSubmission(sub);
            const statusDef = getStatusDef(sub.callStatus);
            const StatusIcon = statusDef.icon;
            const hasSent = Boolean(sub.proposalsSentAt || (sub.proposals && sub.proposals.length > 0) || sub.callStatus === 'devis_envoye');
            const hasChosen = Boolean(sub.selectedProposalTitle);
            const clientPermanentNotes = getClientNotesForSubmission(sub);
            const latestNoteText =
              clientPermanentNotes[0]?.text ||
              (sub.notes && sub.notes.length > 0 ? sub.notes[sub.notes.length - 1].text : null);
            const totalNotesCount = clientPermanentNotes.length + (sub.notes?.length || 0);

            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSubmission(sub)}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between hover:shadow-md cursor-pointer group overflow-hidden ${
                  isBlacklist
                    ? 'border-rose-400 ring-2 ring-rose-200/70 bg-rose-50/10 shadow-2xs'
                    : isVip
                    ? 'border-amber-300 ring-2 ring-amber-200/60 shadow-2xs'
                    : 'border-slate-200/90 shadow-2xs hover:border-[#338b84]/50'
                }`}
              >
                {/* Card Top: Traveler info & Status */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                          isBlacklist
                            ? 'bg-rose-700 text-white font-black'
                            : isVip
                            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black'
                            : 'bg-slate-800 text-white'
                        }`}
                      >
                        {getTravelerInitials(sub)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-extrabold text-slate-900 truncate">
                            {getTravelerName(sub)}
                          </h4>
                          {isBlacklist && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white border border-rose-700">
                              ⛔ BLACKLIST
                            </span>
                          )}
                          {isVip && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              <Crown className="h-2.5 w-2.5 fill-amber-500" />
                              VIP
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                          <span className="text-[#338b84] font-bold">{sub.referenceNumber}</span>
                          <span>&bull;</span>
                          <span>{sub.customerPhone || 'Sans tél'}</span>
                        </div>
                      </div>
                    </div>

                    {/* VIP & Blacklist quick toggles */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleVip(sub, e)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition-colors cursor-pointer border ${
                          isVip
                            ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs'
                            : 'bg-slate-50 text-slate-500 hover:text-amber-800 hover:bg-amber-50 border-slate-200'
                        }`}
                        title={isVip ? 'Retirer le tag VIP (Client & Soumission)' : 'Tagger VIP (Client & Soumission)'}
                      >
                        👑 VIP
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleToggleBlacklist(sub, e)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition-colors cursor-pointer border ${
                          isBlacklist
                            ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                            : 'bg-slate-50 text-slate-500 hover:text-rose-800 hover:bg-rose-50 border-slate-200'
                        }`}
                        title={isBlacklist ? 'Retirer de la Blacklist' : 'Tagger Blacklist (Client & Soumission)'}
                      >
                        ⛔
                      </button>
                    </div>
                  </div>

                  {/* Destination Highlight */}
                  <div className="bg-gradient-to-r from-teal-50/60 to-emerald-50/40 p-3 rounded-xl border border-teal-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">Destination</span>
                      <span className="text-[10px] font-bold text-slate-500">
                        Départ : {sub.departureCity || 'YUL'}
                      </span>
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-0.5 truncate">
                      🌴 {sub.destination}
                    </div>
                  </div>

                  {/* 3 Key Metrics Pills: Dates, Budget, Passengers */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                      <div className="text-[10px] text-slate-500 font-semibold">Départ</div>
                      <div className="font-extrabold text-slate-800 truncate text-[11px] mt-0.5">
                        {sub.departureDate || 'Non fixé'}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                      <div className="text-[10px] text-slate-500 font-semibold">Budget</div>
                      <div className="font-black text-emerald-700 truncate text-[11px] mt-0.5">
                        {sub.budgetPerPerson ? `${sub.budgetPerPerson}` : 'Flexible'}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                      <div className="text-[10px] text-slate-500 font-semibold">Voyageurs</div>
                      <div className="font-bold text-slate-800 truncate text-[11px] mt-0.5">
                        {sub.adultsCount || 2} ad. {sub.childrenCount ? `+ ${sub.childrenCount} enf.` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Client Note Preview on Card */}
                  {latestNoteText && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSubmission(sub);
                        setDetailTab('notes');
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-950 hover:bg-amber-100 transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="truncate font-medium">
                        <strong>Note Client ({totalNotesCount}) :</strong> {latestNoteText}
                      </span>
                    </div>
                  )}

                  {/* Status Banner */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold border ${statusDef.badgeBg} ${statusDef.text} ${statusDef.border}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      <span>{statusDef.label}</span>
                    </span>

                    {/* Proposal Status Badge */}
                    {hasChosen ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <CheckCircle className="h-3 w-3 text-emerald-700" />
                        <span>Choix : {sub.selectedProposalTitle}</span>
                      </span>
                    ) : hasSent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                        <Send className="h-2.5 w-2.5 text-purple-600" />
                        <span>{sub.proposals?.length || 3} offres envoyées</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Card Bottom: Advisor & Actions */}
                <div
                  className="bg-slate-50 border-t border-slate-100 px-4 py-2.5 space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Advisor & Transfer / Abandon quick buttons */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      {sub.assignedToUserName ? (
                        <>
                          <img
                            src={getSafeAvatar(
                              allUsers.find((u) => u.id === sub.assignedToUserId)?.avatar,
                              sub.assignedToUserName
                            )}
                            alt={sub.assignedToUserName}
                            className="h-5 w-5 rounded-full border border-slate-200 object-cover shrink-0"
                          />
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[95px]">
                            {sub.assignedToUserName}
                          </span>
                          {(isResponsibleAdvisor(sub) || isAdmin) && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (transferringSubId === sub.id) {
                                    setTransferringSubId(null);
                                  } else {
                                    setTransferringSubId(sub.id);
                                    const firstOther = allUsers.find((u) => u.id !== sub.assignedToUserId);
                                    setSelectedTransferUserId(firstOther?.id || '');
                                  }
                                }}
                                className="px-1.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold cursor-pointer transition-colors"
                                title="Transférer ce dossier à un autre conseiller"
                              >
                                Transférer
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleAbandonSubmission(sub, e)}
                                className="px-1.5 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold cursor-pointer transition-colors"
                                title="Abandonner le dossier (remettre en non assigné)"
                              >
                                Abandonner
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleClaimSubmission(sub, e)}
                            className="text-[11px] font-bold text-[#338b84] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <UserPlus className="h-3 w-3" />
                            <span>Prendre en charge</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (transferringSubId === sub.id) {
                                setTransferringSubId(null);
                              } else {
                                setTransferringSubId(sub.id);
                                setSelectedTransferUserId(allUsers[0]?.id || '');
                              }
                            }}
                            className="px-1.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold cursor-pointer transition-colors"
                            title="Transférer ce dossier à un conseiller"
                          >
                            Transférer
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubmission(sub);
                          setDetailTab('notes');
                        }}
                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Voir ou ajouter une note client"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {totalNotesCount > 0 && <span className="text-[10px] font-black">{totalNotesCount}</span>}
                      </button>
                      <button
                        type="button"
                        disabled={!isResponsibleAdvisor(sub)}
                        onClick={() => {
                          if (isResponsibleAdvisor(sub)) {
                            setSendProposalModalSubmission(sub);
                          }
                        }}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-colors flex items-center gap-1 ${
                          isResponsibleAdvisor(sub)
                            ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200 cursor-pointer'
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                        }`}
                        title={
                          isResponsibleAdvisor(sub)
                            ? 'Envoyer une proposition de voyage'
                            : `Verrouillé : Seul le responsable du dossier (${sub.assignedToUserName || 'aucun responsable assigné'}) peut envoyer une soumission.`
                        }
                      >
                        {isResponsibleAdvisor(sub) ? (
                          <Send className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSubmission(sub)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>Consulter</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Transfer Selector on Card */}
                  {transferringSubId === sub.id && (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center gap-1.5 animate-in fade-in">
                      <select
                        value={selectedTransferUserId}
                        onChange={(e) => setSelectedTransferUserId(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800"
                      >
                        <option value="">Choisir un conseiller...</option>
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.grade || u.role})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={(e) => handleTransferSubmission(sub, selectedTransferUserId, e)}
                        disabled={!selectedTransferUserId}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-bold cursor-pointer"
                      >
                        Confirmer
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransferringSubId(null)}
                        className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MODE TABLEAU PROPRE (SANS SURCHARGE) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Voyageur / Réf</th>
                  <th className="py-3 px-4">Projet & Destination</th>
                  <th className="py-3 px-4">Dates & Budget</th>
                  <th className="py-3 px-4">Responsable</th>
                  <th className="py-3 px-4">Statut d'Appel</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((sub) => {
                  const isVip = isVipSubmission(sub);
                  const isBlacklist = isBlacklistSubmission(sub);
                  const statusDef = getStatusDef(sub.callStatus);
                  const StatusIcon = statusDef.icon;

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => setSelectedSubmission(sub)}
                      className={`cursor-pointer transition-colors ${
                        isBlacklist ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-7 w-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                              isBlacklist
                                ? 'bg-rose-700 text-white font-black'
                                : isVip
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : 'bg-slate-800 text-white'
                            }`}
                          >
                            {getTravelerInitials(sub)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span>{getTravelerName(sub)}</span>
                              {isBlacklist && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white">
                                  ⛔ BLACKLIST
                                </span>
                              )}
                              {isVip && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                                  <Crown className="h-2.5 w-2.5 text-amber-500 fill-amber-500" /> VIP
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              <span className="text-[#338b84] font-bold">{sub.referenceNumber}</span> &bull; {sub.customerPhone}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">🌴 {sub.destination}</div>
                        <div className="text-[11px] text-slate-500">Départ de {sub.departureCity || 'YUL'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{sub.departureDate || 'Date flexible'}</div>
                        <div className="text-[11px] font-black text-emerald-700">{sub.budgetPerPerson || 'Budget libre'}</div>
                      </td>

                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        {sub.assignedToUserName ? (
                          <div className="space-y-1">
                            <div className="font-bold text-slate-800 text-xs">{sub.assignedToUserName}</div>
                            {(isResponsibleAdvisor(sub) || isAdmin) && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSubmission(sub);
                                    setDetailTab('appel');
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold cursor-pointer"
                                >
                                  Transférer
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleAbandonSubmission(sub, e)}
                                  className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold cursor-pointer"
                                >
                                  Abandonner
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleClaimSubmission(sub, e)}
                            className="text-[11px] font-bold text-[#338b84] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <UserPlus className="h-3 w-3" />
                            <span>Prendre en charge</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${statusDef.badgeBg} ${statusDef.text} ${statusDef.border}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          <span>{statusDef.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleVip(sub, e)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black border cursor-pointer ${
                              isVip
                                ? 'bg-amber-400 text-slate-950 border-amber-500'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-amber-50'
                            }`}
                            title="Tagger VIP"
                          >
                            👑
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleToggleBlacklist(sub, e)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black border cursor-pointer ${
                              isBlacklist
                                ? 'bg-rose-600 text-white border-rose-700'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-rose-50'
                            }`}
                            title="Tagger Blacklist"
                          >
                            ⛔
                          </button>
                          <button
                            type="button"
                            disabled={!isResponsibleAdvisor(sub)}
                            onClick={() => {
                              if (isResponsibleAdvisor(sub)) {
                                setSendProposalModalSubmission(sub);
                              }
                            }}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isResponsibleAdvisor(sub)
                                ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200 cursor-pointer'
                                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                            }`}
                            title={
                              isResponsibleAdvisor(sub)
                                ? 'Envoyer soumission'
                                : `Verrouillé : Seul le responsable du dossier (${sub.assignedToUserName || 'aucun responsable'}) peut envoyer une soumission.`
                            }
                          >
                            {isResponsibleAdvisor(sub) ? (
                              <Send className="h-3.5 w-3.5" />
                            ) : (
                              <Lock className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSubmission(sub)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Détails
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MODALE / PANNEAU DE DÉTAILS D'UN DOSSIER (STRUCTURE CLAIRE & SÉPARÉE) */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1a4542] via-[#286f6a] to-[#338b84] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center font-black text-sm">
                  {getTravelerInitials(selectedSubmission)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black tracking-tight">
                      {getTravelerName(selectedSubmission)}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20 text-white">
                      {selectedSubmission.referenceNumber}
                    </span>
                    {isBlacklistSubmission(selectedSubmission) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white flex items-center gap-1 border border-rose-400">
                        ⛔ BLACKLIST
                      </span>
                    )}
                    {isVipSubmission(selectedSubmission) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 flex items-center gap-1">
                        <Crown className="h-3 w-3" /> CLIENT VIP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-teal-100 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>📞 {selectedSubmission.customerPhone}</span>
                    <span>&bull;</span>
                    <span>✉️ {selectedSubmission.customerEmail}</span>
                    <span>&bull;</span>
                    <span>🌴 {selectedSubmission.destination}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Separated Tabs Navigation */}
            <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 border-b border-slate-200 overflow-x-auto scrollbar-none shrink-0">
              <button
                type="button"
                onClick={() => setDetailTab('voyage')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  detailTab === 'voyage'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Palmtree className="h-3.5 w-3.5 text-teal-600" />
                <span>1. Le Projet Voyage</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('appel')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  detailTab === 'appel'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PhoneCall className="h-3.5 w-3.5 text-amber-600" />
                <span>2. Suivi d'Appel & Statut</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('propositions')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  detailTab === 'propositions'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Send className="h-3.5 w-3.5 text-purple-600" />
                <span>3. Propositions & Devis</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('notes')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  detailTab === 'notes'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                <span>
                  4. Notes Client & Suivi ({getClientNotesForSubmission(selectedSubmission).length + (selectedSubmission.notes?.length || 0)})
                </span>
              </button>
            </div>

            {/* Scrollable Tab Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
              {/* TAB 1: LE PROJET VOYAGE */}
              {detailTab === 'voyage' && (
                <div className="space-y-4">
                  {/* Tags VIP & Blacklist du Profil Client et de la Soumission */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                        Tags Client & Soumission (Synchronisés avec le Profil CRM)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Activez VIP ou Blacklist pour tagger simultanément la soumission et la fiche client.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleVip(selectedSubmission)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 ${
                          isVipSubmission(selectedSubmission)
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border-slate-200'
                        }`}
                      >
                        <span>👑</span>
                        <span>{isVipSubmission(selectedSubmission) ? 'VIP Actif' : 'Tagger VIP'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBlacklist(selectedSubmission)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 ${
                          isBlacklistSubmission(selectedSubmission)
                            ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                            : 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-800 border-slate-200'
                        }`}
                      >
                        <span>⛔</span>
                        <span>{isBlacklistSubmission(selectedSubmission) ? 'Blacklist Actif' : 'Tagger Blacklist'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Destination</span>
                      <span className="text-sm font-black text-slate-900 mt-1 block">🌴 {selectedSubmission.destination}</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Aéroport de Départ</span>
                      <span className="text-sm font-black text-slate-900 mt-1 block">🛫 {selectedSubmission.departureCity || 'Montréal (YUL)'}</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Dates Souhaitées</span>
                      <span className="text-sm font-black text-slate-900 mt-1 block">
                        📅 {selectedSubmission.departureDate || 'Flexible'} {selectedSubmission.endDate ? `au ${selectedSubmission.endDate}` : ''}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Budget par personne</span>
                      <span className="text-sm font-black text-emerald-700 mt-1 block">
                        💰 {selectedSubmission.budgetPerPerson || 'Non précisé'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Voyageurs</span>
                      <span className="text-sm font-black text-slate-900 mt-1 block">
                        👥 {selectedSubmission.adultsCount || 2} adulte(s) {selectedSubmission.childrenCount ? `, ${selectedSubmission.childrenCount} enfant(s)` : ''}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Formule / Service</span>
                      <span className="text-sm font-black text-slate-900 mt-1 block capitalize">
                        {selectedSubmission.serviceType || 'Tout-Inclus'}
                      </span>
                    </div>
                  </div>

                  {selectedSubmission.customNotes && (
                    <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-1">
                      <span className="text-xs font-bold text-amber-900 block">Commentaires & souhaits du voyageur :</span>
                      <p className="text-xs text-amber-950 leading-relaxed whitespace-pre-wrap">
                        {selectedSubmission.customNotes}
                      </p>
                    </div>
                  )}

                  {/* Quick Shortcut to Client Profile & Legal Documents */}
                  <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-[#1a4542] flex items-center gap-1.5">
                        <FileCheck className="h-4 w-4 text-[#338b84]" />
                        <span>Fiche Client & Documents Légaux (PDF)</span>
                      </div>
                      <p className="text-[11px] text-teal-800 mt-0.5">
                        Consultez le dossier complet du client, ses notes permanentes, ses voyages passés et ses contrats signés.
                      </p>
                    </div>
                    {onViewClientInCRM && (
                      <button
                        type="button"
                        onClick={() => {
                          const clientKey = selectedSubmission.customerEmail
                            ? `email:${selectedSubmission.customerEmail}`
                            : selectedSubmission.customerPhone
                            ? `phone:${selectedSubmission.customerPhone}`
                            : selectedSubmission.id;
                          setSelectedSubmission(null);
                          onViewClientInCRM(clientKey);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#338b84] hover:bg-[#205753] text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Ouvrir dans le CRM &rarr;</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: SUIVI D'APPEL & STATUT */}
              {detailTab === 'appel' && (
                <div className="space-y-5">
                  {/* Conseiller responsable + Transférer / Abandonner */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-500 block">Conseiller responsable du dossier :</span>
                        <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                          {selectedSubmission.assignedToUserName || 'Non assigné'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {!isResponsibleAdvisor(selectedSubmission) && (
                          <button
                            type="button"
                            onClick={() => handleClaimSubmission(selectedSubmission)}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Prendre en charge</span>
                          </button>
                        )}
                        {(selectedSubmission.assignedToUserName || selectedSubmission.assignedToUserId) &&
                          (isResponsibleAdvisor(selectedSubmission) || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => handleAbandonSubmission(selectedSubmission)}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Abandonner le dossier</span>
                            </button>
                          )}
                      </div>
                    </div>

                    {/* Transférer le dossier à un autre collaborateur */}
                    <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        Transférer ce dossier à un autre conseiller :
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedTransferUserId}
                          onChange={(e) => setSelectedTransferUserId(e.target.value)}
                          className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                        >
                          <option value="">Sélectionner un conseiller...</option>
                          {allUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.grade || u.role})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedTransferUserId}
                          onClick={() => handleTransferSubmission(selectedSubmission, selectedTransferUserId)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition-colors"
                        >
                          Transférer le dossier
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Changer de statut en 1 clic */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">Changer le statut d'appel :</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {statusDefinitions.map((s) => {
                        const Icon = s.icon;
                        const isCurrent = selectedSubmission.callStatus === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleUpdateStatusAction(selectedSubmission, s.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                              isCurrent
                                ? `${s.badgeBg} ${s.text} ${s.border} ring-2 ring-current font-black`
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-semibold'
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-[11px] truncate">{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Coordonnées téléphoniques */}
                  <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-900">Numéro de téléphone direct :</span>
                      <div className="text-base font-black text-amber-950 mt-0.5">
                        {selectedSubmission.customerPhone || 'Non renseigné'}
                      </div>
                    </div>
                    {selectedSubmission.customerPhone && (
                      <a
                        href={`tel:${selectedSubmission.customerPhone}`}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>Appeler le voyageur</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PROPOSITIONS & DEVIS */}
              {detailTab === 'propositions' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Offres & Devis Transmis</h4>
                      <p className="text-[11px] text-slate-500">
                        {selectedSubmission.proposals?.length || 0} proposition(s) enregistrée(s) &bull; Responsable :{' '}
                        <strong>{selectedSubmission.assignedToUserName || 'Non assigné'}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {!selectedSubmission.assignedToUserId && !selectedSubmission.assignedToUserName && (
                        <button
                          type="button"
                          onClick={() => handleClaimSubmission(selectedSubmission)}
                          className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Prendre en charge pour déverrouiller</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!isResponsibleAdvisor(selectedSubmission)}
                        onClick={() => {
                          if (isResponsibleAdvisor(selectedSubmission)) {
                            setSendProposalModalSubmission(selectedSubmission);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all ${
                          isResponsibleAdvisor(selectedSubmission)
                            ? 'bg-gradient-to-r from-[#286f6a] to-[#338b84] text-white cursor-pointer hover:opacity-95'
                            : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        }`}
                        title={
                          isResponsibleAdvisor(selectedSubmission)
                            ? 'Créer et envoyer une soumission au client'
                            : `Verrouillé : Seul le responsable du dossier (${selectedSubmission.assignedToUserName || 'aucun'}) peut envoyer une soumission.`
                        }
                      >
                        {isResponsibleAdvisor(selectedSubmission) ? (
                          <Send className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {isResponsibleAdvisor(selectedSubmission)
                            ? selectedSubmission.proposalsSentAt
                              ? 'Renvoyer une offre'
                              : 'Créer & Envoyer un Devis'
                            : `Verrouillé (Responsable : ${selectedSubmission.assignedToUserName || 'Non assigné'})`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {selectedSubmission.selectedProposalTitle ? (
                    <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                        <span>Option Retenue par le Client !</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-200">
                        <div className="text-sm font-extrabold text-slate-900">
                          {selectedSubmission.selectedProposalTitle}
                        </div>
                        {selectedSubmission.selectedProposalPrice && (
                          <div className="text-xs font-black text-emerald-700 mt-0.5">
                            Prix : {selectedSubmission.selectedProposalPrice}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {selectedSubmission.proposals && selectedSubmission.proposals.length > 0 ? (
                    <div className="space-y-2.5">
                      {selectedSubmission.proposals.map((prop, idx) => (
                        <div key={prop.id || idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-xs">{prop.title}</span>
                            <span className="font-black text-emerald-700 text-xs">{prop.pricePerPerson}</span>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Hôtel / Navire : <strong>{prop.hotelOrCruiseName}</strong> ({prop.supplier || 'Voyagiste'})
                          </div>
                          {prop.inclusions && (
                            <div className="text-[10px] text-slate-500 italic">
                              Inclusions : {prop.inclusions}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                      Aucune proposition n'a encore été envoyée pour cette demande.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: NOTES CLIENT & SUIVI D'ÉQUIPE */}
              {detailTab === 'notes' && (
                <div className="space-y-6">
                  {/* SECTION A: NOTES PERMANENTES DU PROFIL CLIENT (CRM) */}
                  <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-black text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                          <span>Notes Permanentes du Profil Client ({getClientNotesForSubmission(selectedSubmission).length})</span>
                        </h4>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Ces notes client sont rattachées au profil CRM du client et visibles sur toutes ses soumissions.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleAddClientNoteInPipeline} className="space-y-2">
                      <textarea
                        rows={2}
                        value={newClientNoteText}
                        onChange={(e) => setNewClientNoteText(e.target.value)}
                        placeholder="Ajouter une note permanente au profil de ce client (préférences, habitudes, allergies, historique)..."
                        className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isSavingClientNote || !newClientNoteText.trim()}
                          className="px-3.5 py-1.5 bg-[#338b84] hover:bg-[#256863] disabled:opacity-50 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{isSavingClientNote ? 'Enregistrement...' : 'Ajouter la note client'}</span>
                        </button>
                      </div>
                    </form>

                    {getClientNotesForSubmission(selectedSubmission).length > 0 ? (
                      <div className="space-y-2 pt-1">
                        {getClientNotesForSubmission(selectedSubmission).map((cn) => (
                          <div key={cn.id} className="bg-white p-3 rounded-xl border border-amber-200 space-y-1 shadow-2xs">
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span className="font-bold text-slate-800">
                                {cn.authorName} {cn.authorGrade ? `(${cn.authorGrade})` : ''}
                              </span>
                              <div className="flex items-center gap-2">
                                <span>{new Date(cn.createdAt).toLocaleString('fr-CA')}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClientNoteInPipeline(cn.id)}
                                  className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                                  title="Supprimer cette note client"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-800 whitespace-pre-wrap">{cn.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-800/80 italic">
                        Aucune note permanente sur la fiche de ce client pour le moment.
                      </p>
                    )}
                  </div>

                  {/* SECTION B: NOTES DE SUIVI DE CETTE SOUMISSION */}
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Notes de suivi de cette soumission ({selectedSubmission.referenceNumber}) :
                      </label>
                      <textarea
                        rows={2}
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Indiquez les détails de votre échange pour ce dossier précis..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#338b84]"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddNoteAction}
                          disabled={isSubmittingNote || !newNoteText.trim()}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
                        >
                          {isSubmittingNote ? 'Enregistrement...' : 'Enregistrer la note de soumission'}
                        </button>
                      </div>
                    </div>

                    {/* Notes history */}
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-slate-500 block">
                        Historique du dossier ({selectedSubmission.notes?.length || 0}) :
                      </span>
                      {selectedSubmission.notes && selectedSubmission.notes.length > 0 ? (
                        <div className="space-y-2">
                          {selectedSubmission.notes.map((n) => (
                            <div key={n.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span className="font-bold text-slate-700">{n.authorName}</span>
                                <span>{new Date(n.createdAt).toLocaleString('fr-CA')}</span>
                              </div>
                              <p className="text-xs text-slate-800 whitespace-pre-wrap">{n.text}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Aucune note enregistrée sur cette soumission.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-500">
                Demande reçue le {new Date(selectedSubmission.createdAt).toLocaleDateString('fr-CA')}
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROPOSAL SEND MODAL */}
      {sendProposalModalSubmission && (
        <SendSubmissionProposalModal
          isOpen={Boolean(sendProposalModalSubmission)}
          onClose={() => setSendProposalModalSubmission(null)}
          submission={sendProposalModalSubmission}
          currentUser={currentUser}
          onSuccess={(updated) => {
            if (selectedSubmission?.id === updated.id) {
              setSelectedSubmission(updated);
            }
            if (onSubmissionUpdated) {
              onSubmissionUpdated(updated);
            }
          }}
        />
      )}

      {/* PROPOSAL VIEWER MODAL */}
      {viewProposalModalSubmission && (
        <SubmissionProposalViewerModal
          isOpen={Boolean(viewProposalModalSubmission)}
          onClose={() => setViewProposalModalSubmission(null)}
          submission={viewProposalModalSubmission}
          currentUser={currentUser}
          onSelectOption={async (subId, propId, notes, autoSetReserved) => {
            if (onSelectProposal) {
              const res = await onSelectProposal(subId, propId, notes, autoSetReserved);
              if (res.success && res.submission) {
                if (selectedSubmission?.id === subId) {
                  setSelectedSubmission(res.submission);
                }
              }
            }
          }}
        />
      )}
    </div>
  );
};
