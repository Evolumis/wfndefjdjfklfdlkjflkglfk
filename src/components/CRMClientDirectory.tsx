import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  Calendar,
  Palmtree,
  Plane,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ChevronRight,
  X,
  ExternalLink,
  Download,
  Star,
  Award,
  Filter,
  MessageSquare,
  Building,
  UserCheck,
  Compass,
  Ship,
  Sparkles,
  Link2,
  GitMerge,
  Check,
  Crown,
  Send,
  Lock,
  CheckCircle,
  Receipt,
  CreditCard,
  Printer,
  Eye,
  Trash2,
  Copy,
  DollarSign,
  UserPlus,
  FileCheck,
  UserCircle,
} from 'lucide-react';
import type { User, ClientRecord } from '../types';
import { QuoteSubmission, CallStatus, ServiceType, ClientNote, NewsletterSubscriber, Invoice, InvoiceItem, InvoiceArticleCatalog } from '../types';
import { SubmissionProposalViewerModal } from './SubmissionProposalViewerModal';
import { SendSubmissionProposalModal } from './SubmissionsPipeline';
import { CRMLegalDocumentsSection } from './CRMLegalDocumentsSection';

export interface ClientProfile {
  id: string;
  rawKey?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  postalCode?: string;
  birthDate?: string;
  passportNumber?: string;
  passportExpiry?: string;
  preferredDepartureCity?: string;
  budgetRange?: string;
  vipLevel?: string;
  submissionsCount: number;
  traveledCount: number; // Submissions where callStatus === 'reserve'
  callStatusCounts: Record<string, number>;
  firstSubmissionDate: string;
  lastSubmissionDate: string;
  destinations: string[];
  departureCities: string[];
  serviceTypes: ServiceType[];
  assignedAdvisors: string[];
  preferredCallTime?: string;
  notes: ClientNote[];
  tags: string[];
  submissions: QuoteSubmission[];
  isNewsletterSubscribed: boolean;
  newsletterSubscriber?: NewsletterSubscriber | null;
}

interface CRMClientDirectoryProps {
  submissions: QuoteSubmission[];
  currentUser: User;
  onUpdateSubmissionStatus: (submissionId: string, status: CallStatus, note?: string) => Promise<void>;
  onNavigateToSubmission?: (submissionId: string) => void;
  initialSelectedClientKey?: string | null;
  onMergeClients?: (params: {
    primaryClientKey: string;
    secondaryClientKey: string;
    targetInfo?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  }) => Promise<{ success: boolean; message: string }>;
  newsletterSubscribers?: NewsletterSubscriber[];
  onRefreshSubscribers?: () => void;
  onSelectProposal?: (
    submissionId: string,
    proposalId: string | null,
    notes?: string,
    autoSetReserved?: boolean
  ) => Promise<{ success: boolean; submission?: QuoteSubmission }>;
  onSubmissionUpdated?: (updatedSub: QuoteSubmission) => void;
}

export const CRMClientDirectory: React.FC<CRMClientDirectoryProps> = ({
  submissions,
  currentUser,
  onUpdateSubmissionStatus,
  onNavigateToSubmission,
  initialSelectedClientKey,
  onMergeClients,
  newsletterSubscribers = [],
  onRefreshSubscribers,
  onSelectProposal,
  onSubmissionUpdated,
}) => {
  const [activeCrmView, setActiveCrmView] = useState<'clients' | 'documents' | 'pdf_studio'>('clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vip' | 'blacklist' | 'newsletter' | 'traveled' | 'multi' | 'in_progress' | 'proposals'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'traveled' | 'submissions' | 'name'>('recent');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialSelectedClientKey || null);
  const [drawerTab, setDrawerTab] = useState<'dossier' | 'documents' | 'contact' | 'notes' | 'infolettre'>('dossier');
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [clientNotesMap, setClientNotesMap] = useState<Record<string, ClientNote[]>>({});
  const [clientCustomTagsMap, setClientCustomTagsMap] = useState<Record<string, string[]>>({});
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);

  // Permission check for Studio Modèles PDF
  const canAccessPdfStudio = Boolean(
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'directeur' ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    currentUser?.permissions?.canManagePdfTemplates
  );

  // Persistent CRM Clients List from database
  const [crmClientsList, setCrmClientsList] = useState<ClientRecord[]>([]);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [clientFormFeedback, setClientFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);

  const [clientFormData, setClientFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    birthDate: '',
    passportNumber: '',
    passportExpiry: '',
    preferredDepartureCity: 'Montréal (YUL)',
    budgetRange: '1 600 $ - 2 200 $ / personne',
    preferredDestinations: '',
    vipLevel: 'standard',
    notes: '',
  });

  const fetchCrmClients = async () => {
    try {
      const res = await fetch('/api/crm/clients');
      if (res.ok) {
        const data: ClientRecord[] = await res.json();
        setCrmClientsList(data);
      }
    } catch (err) {
      console.warn('Could not load CRM clients:', err);
    }
  };

  // Load saved client notes and persistent CRM clients on mount
  React.useEffect(() => {
    const loadSavedClientNotes = async () => {
      try {
        const res = await fetch('/api/crm/notes');
        if (res.ok) {
          const notes: ClientNote[] = await res.json();
          const grouped: Record<string, ClientNote[]> = {};
          notes.forEach((n) => {
            if (!grouped[n.clientId]) grouped[n.clientId] = [];
            grouped[n.clientId].push(n);
          });
          setClientNotesMap((prev) => ({ ...grouped, ...prev }));
        }
      } catch (err) {
        console.warn('Could not load CRM notes:', err);
      }
    };
    loadSavedClientNotes();
    fetchCrmClients();
  }, []);

  // Modal to add a person to Infolettre Privilège Évasion Soleil
  const [isAddSubscriberModalOpen, setIsAddSubscriberModalOpen] = useState(false);
  const [newSubFirstName, setNewSubFirstName] = useState('');
  const [newSubLastName, setNewSubLastName] = useState('');
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubPhone, setNewSubPhone] = useState('');
  const [newSubPreferences, setNewSubPreferences] = useState({
    offersExclusive: true,
    lastMinuteAlerts: true,
    cruisesSpecials: true,
    sunDestinations: true,
  });
  const [newSubConsent, setNewSubConsent] = useState(true);
  const [isSubmittingSubscriber, setIsSubmittingSubscriber] = useState(false);
  const [subscriberFeedback, setSubscriberFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubscribePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubEmail.trim()) {
      setSubscriberFeedback({ type: 'error', text: 'Veuillez saisir une adresse courriel valide.' });
      return;
    }
    if (!newSubConsent) {
      setSubscriberFeedback({ type: 'error', text: "Le consentement du client à recevoir l'infolettre est obligatoire." });
      return;
    }

    setIsSubmittingSubscriber(true);
    setSubscriberFeedback(null);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newSubFirstName.trim(),
          lastName: newSubLastName.trim(),
          email: newSubEmail.trim().toLowerCase(),
          phone: newSubPhone.trim() || undefined,
          preferences: newSubPreferences,
          source: 'crm_manual_enroll',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de l'inscription à l'infolettre.");
      }

      setSubscriberFeedback({
        type: 'success',
        text: `✓ ${newSubFirstName ? newSubFirstName : 'La personne'} a été inscrite avec succès à l'Infolettre Privilège Évasion Soleil ! Un courriel de confirmation avec ses accès lui a été envoyé.`,
      });
      if (onRefreshSubscribers) {
        onRefreshSubscribers();
      }

      setTimeout(() => {
        setNewSubFirstName('');
        setNewSubLastName('');
        setNewSubEmail('');
        setNewSubPhone('');
        setIsAddSubscriberModalOpen(false);
        setSubscriberFeedback(null);
      }, 2000);
    } catch (err: any) {
      setSubscriberFeedback({ type: 'error', text: err.message || "Erreur lors de l'enregistrement" });
    } finally {
      setIsSubmittingSubscriber(false);
    }
  };

  // Proposal Modals States in CRM
  const [proposalViewerSubmission, setProposalViewerSubmission] = useState<QuoteSubmission | null>(null);
  const [proposalModalSubmission, setProposalModalSubmission] = useState<QuoteSubmission | null>(null);

  const handleSelectProposalAction = async (
    subId: string,
    proposalId: string | null,
    notes?: string,
    autoSetReserved?: boolean
  ) => {
    if (onSelectProposal) {
      const res = await onSelectProposal(subId, proposalId, notes, autoSetReserved);
      if (res.success && res.submission) {
        if (proposalViewerSubmission?.id === subId) {
          setProposalViewerSubmission(res.submission);
        }
        if (onSubmissionUpdated) {
          onSubmissionUpdated(res.submission);
        }
      }
      return res;
    }
    return { success: false };
  };

  // Merge Dossiers Modal States
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergePrimaryId, setMergePrimaryId] = useState<string>('');
  const [mergeSecondaryId, setMergeSecondaryId] = useState<string>('');
  const [mergeSearchPrimary, setMergeSearchPrimary] = useState('');
  const [mergeSearchSecondary, setMergeSearchSecondary] = useState('');
  const [mergeFirstName, setMergeFirstName] = useState('');
  const [mergeLastName, setMergeLastName] = useState('');
  const [mergeEmail, setMergeEmail] = useState('');
  const [mergePhone, setMergePhone] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [mergeFeedback, setMergeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const canMerge =
    currentUser.role === 'super_admin' ||
    currentUser.username?.toLowerCase() === 'admin' ||
    Boolean(currentUser.permissions?.canMergeClients);

  // Group submissions dynamically by client identity (email, phone, or name)
  const clientProfiles = useMemo<ClientProfile[]>(() => {
    // Map of subscribers by lowercase email for fast lookup
    const subscriberMap = new Map<string, NewsletterSubscriber>();
    (newsletterSubscribers || []).forEach((sub) => {
      const em = (sub.email || '').trim().toLowerCase();
      if (em) {
        subscriberMap.set(em, sub);
      }
    });

    const map = new Map<string, {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      submissions: QuoteSubmission[];
      isProspectOnly?: boolean;
    }>();

    submissions.forEach((sub) => {
      const email = (sub.customerEmail || '').trim().toLowerCase();
      const rawPhone = (sub.customerPhone || '').replace(/\D/g, '');
      const fName = sub.customerFirstName || (sub as any).fullName?.split(' ')[0] || (sub as any).customerName?.split(' ')[0] || '';
      const lName = sub.customerLastName || (sub as any).fullName?.split(' ').slice(1).join(' ') || (sub as any).customerName?.split(' ').slice(1).join(' ') || '';
      const fullName = `${fName.trim()} ${lName.trim()}`.trim();

      const key = email ? `email:${email}` : rawPhone ? `phone:${rawPhone}` : `name:${fullName.toLowerCase()}`;
      if (!key || key === 'name:') return;

      if (!map.has(key)) {
        map.set(key, {
          firstName: fName,
          lastName: lName,
          email: sub.customerEmail || '',
          phone: sub.customerPhone || '',
          submissions: [],
        });
      }

      const entry = map.get(key)!;
      if (!entry.firstName && fName) entry.firstName = fName;
      if (!entry.lastName && lName) entry.lastName = lName;
      if (!entry.email && sub.customerEmail) entry.email = sub.customerEmail;
      if (!entry.phone && sub.customerPhone) entry.phone = sub.customerPhone;
      entry.submissions.push(sub);
    });

    // Also include persistent CRM clients from database
    crmClientsList.forEach((c) => {
      const email = (c.email || '').trim().toLowerCase();
      const rawPhone = (c.phone || '').replace(/\D/g, '');
      const fName = c.firstName || '';
      const lName = c.lastName || '';
      const fullName = (c.fullName || `${fName} ${lName}`).trim();
      const key = email ? `email:${email}` : rawPhone ? `phone:${rawPhone}` : `name:${fullName.toLowerCase()}`;
      if (!key || key === 'name:') return;

      if (!map.has(key)) {
        map.set(key, {
          firstName: fName,
          lastName: lName,
          email: c.email || '',
          phone: c.phone || '',
          submissions: [],
          isProspectOnly: true,
          address: c.address,
          city: c.city,
          postalCode: c.postalCode,
          birthDate: c.birthDate,
          passportNumber: c.passportNumber,
          passportExpiry: c.passportExpiry,
          preferredDepartureCity: c.preferredDepartureCity,
          budgetRange: c.budgetRange,
          vipLevel: c.vipLevel,
          customTags: c.tags || [],
        } as any);
      } else {
        const entry: any = map.get(key)!;
        if (!entry.firstName && fName) entry.firstName = fName;
        if (!entry.lastName && lName) entry.lastName = lName;
        if (c.address) entry.address = c.address;
        if (c.city) entry.city = c.city;
        if (c.postalCode) entry.postalCode = c.postalCode;
        if (c.birthDate) entry.birthDate = c.birthDate;
        if (c.passportNumber) entry.passportNumber = c.passportNumber;
        if (c.passportExpiry) entry.passportExpiry = c.passportExpiry;
        if (c.budgetRange) entry.budgetRange = c.budgetRange;
        if (c.preferredDepartureCity) entry.preferredDepartureCity = c.preferredDepartureCity;
        if (c.vipLevel) entry.vipLevel = c.vipLevel;
        if (c.tags && c.tags.length > 0) {
          entry.customTags = Array.from(new Set([...(entry.customTags || []), ...c.tags]));
        }
      }
    });

    // Also include newsletter subscribers who signed up via footer or website but haven't submitted a quote yet
    (newsletterSubscribers || []).forEach((sub) => {
      const em = (sub.email || '').trim().toLowerCase();
      if (!em) return;
      const key = `email:${em}`;
      if (!map.has(key)) {
        map.set(key, {
          firstName: sub.firstName || '',
          lastName: sub.lastName || '',
          email: sub.email,
          phone: '',
          submissions: [],
          isProspectOnly: true,
        });
      }
    });

    const profiles: ClientProfile[] = Array.from(map.entries()).map(([key, data]) => {
      const sortedSubs = [...data.submissions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const statusCounts: Record<string, number> = {};
      let traveledCount = 0;

      sortedSubs.forEach((s) => {
        const st = s.callStatus || 'a_appeler';
        statusCounts[st] = (statusCounts[st] || 0) + 1;
        if (st === 'reserve') {
          traveledCount += 1;
        }
      });

      const destinations = Array.from(new Set(sortedSubs.map((s) => s.destination).filter(Boolean)));
      const departureCities = Array.from(new Set(sortedSubs.map((s) => s.departureCity).filter(Boolean)));
      const serviceTypes = Array.from(new Set(sortedSubs.map((s) => s.serviceType).filter(Boolean)));
      const assignedAdvisors = Array.from(
        new Set(sortedSubs.map((s) => s.assignedToUserName).filter(Boolean) as string[])
      );

      const clientId = key.replace(/[^a-zA-Z0-9_-]/g, '_');
      const customNotes = clientNotesMap[clientId] || [];

      // Check newsletter status
      const cleanEmail = (data.email || '').trim().toLowerCase();
      const subscriberMatch = cleanEmail ? subscriberMap.get(cleanEmail) || null : null;
      const isNewsletterSubscribed = subscriberMatch?.status === 'active';

      const tags: string[] = [];
      const customClientTags = clientCustomTagsMap[clientId] || [];

      const hasBlacklistTag =
        customClientTags.some((t) => t.toUpperCase().includes('BLACK') || t.toUpperCase().includes('NOIRE')) ||
        sortedSubs.some((s) =>
          (s.tags || []).some((t) => String(t).trim().toUpperCase().includes('BLACK') || String(t).trim().toUpperCase().includes('NOIRE'))
        );
      if (hasBlacklistTag) {
        tags.push('Blacklist');
      }

      const hasVipTag =
        (data as any).vipLevel === 'vip' ||
        ((data as any).customTags || []).some((t: string) => t.toUpperCase().includes('VIP')) ||
        customClientTags.some((t) => t.toUpperCase().includes('VIP')) ||
        sortedSubs.some((s) =>
          (s.tags || []).some((t) => String(t).trim().toUpperCase().includes('VIP'))
        );
      if (hasVipTag) {
        tags.push('Client VIP');
      }
      if (traveledCount >= 2) {
        tags.push('Voyageur VIP');
      } else if (traveledCount === 1) {
        tags.push('Voyageur Confirmé');
      }
      if (sortedSubs.length >= 3) {
        tags.push('Grand Habitué');
      } else if (sortedSubs.length === 1 && traveledCount === 0) {
        tags.push('Nouveau Prospect');
      } else if (sortedSubs.length === 0 && data.isProspectOnly) {
        tags.push('Prospect Enregistré');
      }

      if (isNewsletterSubscribed) {
        tags.push('Abonné(e) Infolettre');
      }

      // Propagate any custom submission tags to client tags
      sortedSubs.forEach((s) => {
        (s.tags || []).forEach((t) => {
          const upper = String(t).trim().toUpperCase();
          if (upper !== 'VIP' && !upper.includes('VIP') && !upper.includes('BLACK') && !tags.includes(t)) {
            tags.push(t);
          }
        });
      });

      const fullName = `${data.firstName} ${data.lastName}`.trim() || data.email || 'Client sans nom';

      const firstDate = sortedSubs.length > 0
        ? sortedSubs[sortedSubs.length - 1]?.createdAt
        : subscriberMatch?.subscribedAt || new Date().toISOString();
      const lastDate = sortedSubs.length > 0
        ? sortedSubs[0]?.createdAt
        : subscriberMatch?.subscribedAt || new Date().toISOString();

      return {
        id: clientId,
        rawKey: key,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName,
        email: data.email,
        phone: data.phone,
        address: (data as any).address,
        city: (data as any).city,
        postalCode: (data as any).postalCode,
        birthDate: (data as any).birthDate,
        passportNumber: (data as any).passportNumber,
        passportExpiry: (data as any).passportExpiry,
        budgetRange: (data as any).budgetRange,
        preferredDepartureCity: (data as any).preferredDepartureCity,
        vipLevel: (data as any).vipLevel,
        submissionsCount: sortedSubs.length,
        traveledCount,
        callStatusCounts: statusCounts,
        firstSubmissionDate: firstDate,
        lastSubmissionDate: lastDate,
        destinations,
        departureCities,
        serviceTypes,
        assignedAdvisors,
        preferredCallTime: sortedSubs[0]?.preferredCallTime,
        notes: customNotes,
        tags,
        submissions: sortedSubs,
        isNewsletterSubscribed,
        newsletterSubscriber: subscriberMatch,
      };
    });

    return profiles;
  }, [submissions, clientNotesMap, clientCustomTagsMap, newsletterSubscribers, crmClientsList]);

  // If initialSelectedClientKey matches a client, ensure it's selected
  React.useEffect(() => {
    if (initialSelectedClientKey) {
      const match = clientProfiles.find(
        (c) =>
          c.id === initialSelectedClientKey ||
          c.email.toLowerCase() === initialSelectedClientKey.toLowerCase() ||
          c.phone.replace(/\D/g, '') === initialSelectedClientKey.replace(/\D/g, '')
      );
      if (match) {
        setSelectedClientId(match.id);
      }
    }
  }, [initialSelectedClientKey, clientProfiles]);

  // KPIs
  const totalUniqueClients = clientProfiles.length;
  const totalSubmissionsCount = submissions.length;
  const totalTraveledReservations = submissions.filter((s) => s.callStatus === 'reserve').length;
  const totalRepeatClients = clientProfiles.filter((c) => c.submissionsCount >= 2 || c.traveledCount >= 1).length;
  const totalNewsletterSubscribers = clientProfiles.filter((c) => c.isNewsletterSubscribed).length;

  const [isTogglingNewsletter, setIsTogglingNewsletter] = useState(false);
  const [newsletterActionMessage, setNewsletterActionMessage] = useState<string | null>(null);

  const handleToggleNewsletter = async (client: ClientProfile) => {
    if (!client.email) return;
    setIsTogglingNewsletter(true);
    setNewsletterActionMessage(null);
    try {
      const nextSubscribeState = !client.isNewsletterSubscribed;
      const res = await fetch('/api/admin/newsletter/toggle-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: client.email,
          firstName: client.firstName,
          lastName: client.lastName,
          subscribe: nextSubscribeState,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewsletterActionMessage(
          nextSubscribeState
            ? 'Client inscrit avec succès à l\'Infolettre Privilège !'
            : 'Client désabonné de l\'Infolettre.'
        );
        if (onRefreshSubscribers) {
          onRefreshSubscribers();
        }
      } else {
        setNewsletterActionMessage(data.error || 'Erreur lors de la modification de l\'abonnement.');
      }
    } catch (err) {
      setNewsletterActionMessage('Erreur de communication avec le serveur.');
    } finally {
      setIsTogglingNewsletter(false);
      setTimeout(() => setNewsletterActionMessage(null), 4000);
    }
  };

  // Filter & Search
  const filteredClients = useMemo(() => {
    let result = clientProfiles;

    // Filter pill
    if (filterType === 'vip') {
      result = result.filter((c) => c.tags.some((t) => t.toUpperCase().includes('VIP')));
    } else if (filterType === 'blacklist') {
      result = result.filter((c) => c.tags.some((t) => t.toUpperCase().includes('BLACK') || t.toUpperCase().includes('NOIRE')));
    } else if (filterType === 'newsletter') {
      result = result.filter((c) => c.isNewsletterSubscribed);
    } else if (filterType === 'traveled') {
      result = result.filter((c) => c.traveledCount > 0);
    } else if (filterType === 'multi') {
      result = result.filter((c) => c.submissionsCount >= 2);
    } else if (filterType === 'in_progress') {
      result = result.filter(
        (c) => (c.callStatusCounts['a_appeler'] || 0) > 0 || (c.callStatusCounts['devis_en_cours'] || 0) > 0
      );
    } else if (filterType === 'proposals') {
      result = result.filter((c) =>
        c.submissions.some(
          (s) =>
            Boolean(s.proposalsSentAt) ||
            (s.proposals && s.proposals.length > 0) ||
            s.callStatus === 'devis_envoye'
        )
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const matchName = c.fullName.toLowerCase().includes(q);
        const matchEmail = c.email.toLowerCase().includes(q);
        const matchPhone = c.phone.includes(q);
        const matchDest = c.destinations.some((d) => d.toLowerCase().includes(q));
        const matchRef = c.submissions.some((s) => s.referenceNumber.toLowerCase().includes(q));
        const matchVip = (q === 'vip') && c.tags.some((t) => t.toUpperCase().includes('VIP'));
        const matchBlacklist = (q === 'blacklist' || q === 'liste noire') && c.tags.some((t) => t.toUpperCase().includes('BLACK') || t.toUpperCase().includes('NOIRE'));
        const matchNewsletter =
          (q === 'infolettre' || q === 'newsletter' || q === 'abonné' || q === 'abonne') &&
          c.isNewsletterSubscribed;

        // Proposal details matching
        const matchProposal = c.submissions.some((s) => {
          const matchChosen =
            (s.selectedProposalTitle || '').toLowerCase().includes(q) ||
            (s.selectedProposalHotel || '').toLowerCase().includes(q) ||
            (s.selectedProposalSupplier || '').toLowerCase().includes(q) ||
            (s.selectedProposalNotes || '').toLowerCase().includes(q);

          const matchOptions = (s.proposals || []).some((p) =>
            (p.hotelOrCruiseName || '').toLowerCase().includes(q) ||
            (p.title || '').toLowerCase().includes(q) ||
            (p.supplier || '').toLowerCase().includes(q) ||
            (p.arrivalAirportOrPort || '').toLowerCase().includes(q)
          );

          return matchChosen || matchOptions;
        });

        return matchName || matchEmail || matchPhone || matchDest || matchRef || matchVip || matchBlacklist || matchNewsletter || matchProposal;
      });
    }

    // Sorting
    return [...result].sort((a, b) => {
      // VIPs on top in default recent view
      if (sortBy === 'recent') {
        const aVip = a.tags.some((t) => t.toUpperCase().includes('VIP'));
        const bVip = b.tags.some((t) => t.toUpperCase().includes('VIP'));
        if (aVip && !bVip) return -1;
        if (!aVip && bVip) return 1;
        return new Date(b.lastSubmissionDate).getTime() - new Date(a.lastSubmissionDate).getTime();
      }
      if (sortBy === 'traveled') {
        return b.traveledCount - a.traveledCount || b.submissionsCount - a.submissionsCount;
      }
      if (sortBy === 'submissions') {
        return b.submissionsCount - a.submissionsCount;
      }
      if (sortBy === 'name') {
        return a.fullName.localeCompare(b.fullName);
      }
      return new Date(b.lastSubmissionDate).getTime() - new Date(a.lastSubmissionDate).getTime();
    });
  }, [clientProfiles, filterType, searchQuery, sortBy]);

  // Selected client profile
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clientProfiles.find((c) => c.id === selectedClientId) || null;
  }, [clientProfiles, selectedClientId]);

  // Quick handle call status change directly in CRM
  const handleStatusChangeInCRM = async (submissionId: string, nextStatus: CallStatus) => {
    setIsUpdatingStatusId(submissionId);
    try {
      await onUpdateSubmissionStatus(submissionId, nextStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  // Toggle VIP tag for a client and all their submissions
  const handleToggleClientVip = async (client: ClientProfile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isVip = client.tags.some((t) => t.toUpperCase().includes('VIP'));
    const currentCustom = clientCustomTagsMap[client.id] || client.tags.filter((t) => t === 'VIP' || t === 'Blacklist');
    const filteredCustom = currentCustom.filter((t) => !t.toUpperCase().includes('VIP'));
    const nextCustom = isVip ? filteredCustom : ['VIP', ...filteredCustom];

    setClientCustomTagsMap((prev) => ({
      ...prev,
      [client.id]: nextCustom,
    }));

    try {
      await fetch(`/api/crm/clients/${encodeURIComponent(client.email || client.id)}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: nextCustom }),
      });

      client.submissions.forEach((sub) => {
        const subTags = (sub.tags || []).filter((t) => !t.toUpperCase().includes('VIP'));
        const updatedTags = isVip ? subTags : ['VIP', ...subTags];
        if (onSubmissionUpdated) {
          onSubmissionUpdated({ ...sub, tags: updatedTags });
        }
      });
    } catch (err) {
      console.error('Erreur bascule VIP client:', err);
    }
  };

  // Toggle Blacklist tag for a client and all their submissions
  const handleToggleClientBlacklist = async (client: ClientProfile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isBlack = client.tags.some((t) => t.toUpperCase().includes('BLACK') || t.toUpperCase().includes('NOIRE'));
    const currentCustom = clientCustomTagsMap[client.id] || client.tags.filter((t) => t === 'VIP' || t === 'Blacklist');
    const filteredCustom = currentCustom.filter((t) => !t.toUpperCase().includes('BLACK') && !t.toUpperCase().includes('NOIRE'));
    const nextCustom = isBlack ? filteredCustom : ['Blacklist', ...filteredCustom];

    setClientCustomTagsMap((prev) => ({
      ...prev,
      [client.id]: nextCustom,
    }));

    try {
      await fetch(`/api/crm/clients/${encodeURIComponent(client.email || client.id)}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: nextCustom }),
      });

      client.submissions.forEach((sub) => {
        const subTags = (sub.tags || []).filter((t) => !t.toUpperCase().includes('BLACK') && !t.toUpperCase().includes('NOIRE'));
        const updatedTags = isBlack ? subTags : ['Blacklist', ...subTags];
        if (onSubmissionUpdated) {
          onSubmissionUpdated({ ...sub, tags: updatedTags });
        }
      });
    } catch (err) {
      console.error('Erreur bascule Blacklist client:', err);
    }
  };

  // Delete a client note
  const handleDeleteClientNote = async (clientId: string, noteId: string) => {
    try {
      await fetch(`/api/crm/notes/${encodeURIComponent(noteId)}`, { method: 'DELETE' });
      setClientNotesMap((prev) => ({
        ...prev,
        [clientId]: (prev[clientId] || []).filter((n) => n.id !== noteId),
      }));
    } catch (err) {
      console.error('Erreur suppression note CRM:', err);
    }
  };

  // Add permanent CRM note for client
  const handleAddClientNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !newNoteText.trim()) return;

    setIsSavingNote(true);
    try {
      const resp = await fetch(`/api/crm/clients/${selectedClient.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: currentUser.name,
          authorGrade: currentUser.grade,
          text: newNoteText.trim(),
        }),
      });

      if (resp.ok) {
        const savedNote: ClientNote = await resp.json();
        setClientNotesMap((prev) => ({
          ...prev,
          [selectedClient.id]: [savedNote, ...(prev[selectedClient.id] || [])],
        }));
        setNewNoteText('');
      }
    } catch (err) {
      console.error('Erreur sauvegarde note CRM:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Open Merge Modal
  const handleOpenMergeModal = (defaultPrimaryId?: string) => {
    setMergeFeedback(null);
    if (defaultPrimaryId) {
      setMergePrimaryId(defaultPrimaryId);
      const target = clientProfiles.find((c) => c.id === defaultPrimaryId);
      if (target) {
        setMergeFirstName(target.firstName);
        setMergeLastName(target.lastName);
        setMergeEmail(target.email);
        setMergePhone(target.phone);
      }
      const other = clientProfiles.find((c) => c.id !== defaultPrimaryId);
      if (other) {
        setMergeSecondaryId(other.id);
      }
    } else if (clientProfiles.length >= 2) {
      setMergePrimaryId(clientProfiles[0].id);
      setMergeFirstName(clientProfiles[0].firstName);
      setMergeLastName(clientProfiles[0].lastName);
      setMergeEmail(clientProfiles[0].email);
      setMergePhone(clientProfiles[0].phone);
      setMergeSecondaryId(clientProfiles[1].id);
    }
    setShowMergeModal(true);
  };

  const handleExecuteMerge = async () => {
    if (!onMergeClients) return;
    if (!mergePrimaryId || !mergeSecondaryId) {
      setMergeFeedback({ type: 'error', message: 'Veuillez sélectionner les deux dossiers clients à jumeler.' });
      return;
    }
    if (mergePrimaryId === mergeSecondaryId) {
      setMergeFeedback({ type: 'error', message: 'Le dossier principal et le dossier secondaire doivent être deux clients distincts.' });
      return;
    }

    const primaryClient = clientProfiles.find((c) => c.id === mergePrimaryId);
    const secondaryClient = clientProfiles.find((c) => c.id === mergeSecondaryId);

    if (!primaryClient || !secondaryClient) {
      setMergeFeedback({ type: 'error', message: 'Profil client introuvable.' });
      return;
    }

    setIsMerging(true);
    setMergeFeedback(null);

    const result = await onMergeClients({
      primaryClientKey: primaryClient.rawKey || primaryClient.id,
      secondaryClientKey: secondaryClient.rawKey || secondaryClient.id,
      targetInfo: {
        firstName: mergeFirstName.trim() || primaryClient.firstName,
        lastName: mergeLastName.trim() || primaryClient.lastName,
        email: mergeEmail.trim() || primaryClient.email,
        phone: mergePhone.trim() || primaryClient.phone,
      },
    });

    setIsMerging(false);
    if (result.success) {
      setMergeFeedback({ type: 'success', message: result.message });
      setSelectedClientId(primaryClient.id);
      setTimeout(() => {
        setShowMergeModal(false);
        setMergeFeedback(null);
      }, 2500);
    } else {
      setMergeFeedback({ type: 'error', message: result.message });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Nom Client',
      'Courriel',
      'Telephone',
      'Nombre de Soumissions',
      'Nombre de Voyages Confirmes',
      'Destinations',
      'Derniere Demande',
    ];
    const rows = clientProfiles.map((c) => [
      `"${c.fullName.replace(/"/g, '""')}"`,
      `"${c.email}"`,
      `"${c.phone}"`,
      c.submissionsCount,
      c.traveledCount,
      `"${c.destinations.join('; ').replace(/"/g, '""')}"`,
      new Date(c.lastSubmissionDate).toLocaleDateString('fr-CA'),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `evasion_soleil_clients_crm_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format call status badge
  const getCallStatusBadge = (status: string) => {
    switch (status) {
      case 'reserve':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Voyage Réservé
          </span>
        );
      case 'devis_envoye':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <Mail className="h-3 w-3" />
            Devis envoyé
          </span>
        );
      case 'devis_en_cours':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Clock className="h-3 w-3" />
            Devis en cours
          </span>
        );
      case 'appele_contact_etabli':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
            <Phone className="h-3 w-3" />
            Contact établi
          </span>
        );
      case 'appele_non_repondu':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertCircle className="h-3 w-3" />
            Non répondu
          </span>
        );
      case 'perdu':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Perdu / Sans suite
          </span>
        );
      case 'a_appeler':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="h-3 w-3" />
            À appeler
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-[#338b84] text-white flex items-center justify-center shadow-sm shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 tracking-tight whitespace-nowrap">
                  CRM & Répertoire Clients
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 whitespace-nowrap shrink-0">
                  {totalUniqueClients} fiche{totalUniqueClients > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Recherche de clients, suivi du nombre de soumissions et décompte des voyages confirmés avec nous
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap xl:justify-end">
            {/* View Switcher: Clients vs Documents & Signatures (PDF) vs Studio Modèles PDF */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveCrmView('clients')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeCrmView === 'clients'
                    ? 'bg-[#338b84] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Clients ({totalUniqueClients})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCrmView('documents')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeCrmView === 'documents'
                    ? 'bg-gradient-to-r from-teal-700 to-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span>Documents Envoyés</span>
              </button>
              {canAccessPdfStudio && (
                <button
                  type="button"
                  onClick={() => setActiveCrmView('pdf_studio')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeCrmView === 'pdf_studio'
                      ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Studio de conception et personnalisation des modèles PDF (Accès restreint par permission)"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>Studio Modèles PDF</span>
                  <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-md bg-white/20 text-[9px] font-black uppercase">
                    Admin
                  </span>
                </button>
              )}
            </div>

            {/* Créer une Nouvelle Fiche Client */}
            <button
              type="button"
              onClick={() => {
                setClientFormFeedback(null);
                setClientFormData({
                  firstName: '',
                  lastName: '',
                  email: '',
                  phone: '',
                  address: '',
                  city: '',
                  postalCode: '',
                  birthDate: '',
                  passportNumber: '',
                  passportExpiry: '',
                  preferredDepartureCity: 'Montréal (YUL)',
                  budgetRange: '1 600 $ - 2 200 $ / personne',
                  preferredDestinations: '',
                  vipLevel: 'standard',
                  notes: '',
                });
                setIsCreateClientModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-[#338b84] hover:bg-[#256863] text-white transition-all shadow-xs cursor-pointer whitespace-nowrap"
              title="Créer une nouvelle fiche client permanente dans le CRM"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ Nouvelle Fiche Client</span>
            </button>

            {/* Inscrire une personne à l'Infolettre Privilège */}
            <button
              type="button"
              onClick={() => setIsAddSubscriberModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white transition-all shadow-xs cursor-pointer whitespace-nowrap"
              title="Inscrire une personne à l'Infolettre Privilège Évasion Soleil"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ Inscrire une personne</span>
            </button>

            {canMerge && (
              <button
                type="button"
                id="crm-open-merge-btn"
                onClick={() => handleOpenMergeModal()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title="Fusionner deux fiches clients avec toutes leurs soumissions et notes"
              >
                <GitMerge className="h-3.5 w-3.5" />
                <span>Jumeler</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        {/* 5 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Clients Enregistrés</span>
              <Users className="h-4 w-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalUniqueClients}</div>
            <span className="text-[11px] text-slate-500">Profils uniques dans la base</span>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Total Soumissions</span>
              <FileText className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalSubmissionsCount}</div>
            <span className="text-[11px] text-slate-500">Demandes de devis créées</span>
          </div>

          <div className="bg-emerald-50/70 rounded-xl p-3.5 border border-emerald-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">Voyages Réalisés</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{totalTraveledReservations}</div>
            <span className="text-[11px] text-emerald-800">Statut Appel : Réservé 🎉</span>
          </div>

          <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Clients Fidèles</span>
              <Award className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 mt-1">{totalRepeatClients}</div>
            <span className="text-[11px] text-amber-800">2+ devis ou 1+ séjour réservé</span>
          </div>

          <div
            onClick={() => setFilterType('newsletter')}
            className={`rounded-xl p-3.5 border transition-all cursor-pointer ${
              filterType === 'newsletter'
                ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                : 'bg-teal-50/80 hover:bg-teal-100/80 border-teal-200/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${filterType === 'newsletter' ? 'text-teal-100' : 'text-teal-900'}`}>
                Abonnés Infolettre
              </span>
              <Mail className={`h-4 w-4 ${filterType === 'newsletter' ? 'text-teal-200' : 'text-[#338b84]'}`} />
            </div>
            <div className={`text-2xl font-black mt-1 ${filterType === 'newsletter' ? 'text-white' : 'text-teal-950'}`}>
              {totalNewsletterSubscribers}
            </div>
            <span className={`text-[11px] ${filterType === 'newsletter' ? 'text-teal-100' : 'text-teal-700'}`}>
              Infolettre Privilège active
            </span>
          </div>
        </div>

        {/* Search & Filters Controls - Two Dedicated Rows so Search Bar is Wide & Clear */}
        <div className="mt-5 space-y-3">
          {/* Row 1: Wide Search Input + Sort Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un client par nom, courriel, téléphone, destination ou référence..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#338b84] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Trier par :</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#338b84] cursor-pointer"
              >
                <option value="recent">Plus récent</option>
                <option value="traveled">Nombre de voyages</option>
                <option value="submissions">Nombre de soumissions</option>
                <option value="name">Nom (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Quick Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({clientProfiles.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('newsletter')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'newsletter'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Abonnés Infolettre ({totalNewsletterSubscribers})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('proposals')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'proposals'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <Send className="h-3.5 w-3.5 text-purple-600" />
              <span>✉️ Devis Envoyés ({clientProfiles.filter((c) => c.submissions.some((s) => Boolean(s.proposalsSentAt || (s.proposals && s.proposals.length > 0) || s.callStatus === 'devis_envoye'))).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('vip')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filterType === 'vip'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-xs'
                  : 'bg-amber-100/90 text-amber-950 hover:bg-amber-200 border border-amber-300'
              }`}
            >
              👑 VIP ({clientProfiles.filter((c) => c.tags.some((t) => t.toUpperCase().includes('VIP'))).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('blacklist')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filterType === 'blacklist'
                  ? 'bg-rose-700 text-white font-black shadow-xs'
                  : 'bg-rose-100/90 text-rose-950 hover:bg-rose-200 border border-rose-300'
              }`}
            >
              ⛔ Blacklist ({clientProfiles.filter((c) => c.tags.some((t) => t.toUpperCase().includes('BLACK') || t.toUpperCase().includes('NOIRE'))).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('traveled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filterType === 'traveled'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              ✈️ A voyagé ({clientProfiles.filter((c) => c.traveledCount > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('multi')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filterType === 'multi'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              📋 Multi-devis (2+) ({clientProfiles.filter((c) => c.submissionsCount >= 2).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('in_progress')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filterType === 'in_progress'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              ⏳ En traitement ({clientProfiles.filter((c) => (c.callStatusCounts['a_appeler'] || 0) > 0).length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Studio Modèles PDF OR Espace Documents Envoyés OR Répertoire Clients Grid */}
      {activeCrmView === 'pdf_studio' ? (
        <div className="bg-white rounded-3xl border border-purple-200/80 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-700 text-white flex items-center justify-center font-black shadow-xs">
                <Sparkles className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">Studio Modèles PDF & Formulaires Officiels</h2>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase">
                    Accès Privilégié
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Créez, personnalisez et sécurisez les modèles officiels PDF que vos agents sélectionnent pour faire signer les clients.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveCrmView('clients')}
              className="text-xs font-bold text-[#338b84] hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-center"
            >
              <span>&larr; Revenir au répertoire clients</span>
            </button>
          </div>

          <CRMLegalDocumentsSection
            currentUser={currentUser}
            submissions={submissions}
            allClients={clientProfiles}
            mode="pdf_studio"
          />
        </div>
      ) : activeCrmView === 'documents' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-700 text-white flex items-center justify-center font-black shadow-xs">
                <FileCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Documents Légaux & Signatures Électroniques (PDF)</h2>
                <p className="text-xs text-slate-500">
                  Envoi de documents officiels avec lien de signature sécurisé pour le client, et dépôt automatique en PDF dans son profil.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveCrmView('clients')}
              className="text-xs font-bold text-[#338b84] hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-center"
            >
              <span>&larr; Revenir au répertoire clients</span>
            </button>
          </div>

          <CRMLegalDocumentsSection
            currentUser={currentUser}
            submissions={submissions}
            allClients={clientProfiles}
            mode="all_documents"
            onSelectClient={(cId) => {
              setSelectedClientId(cId);
              setActiveCrmView('clients');
              setDrawerTab('documents');
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Clients Table / Cards (7 cols on lg if detail open, 12 cols if closed) */}
        <div className={`${selectedClient ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Répertoire ({filteredClients.length} client{filteredClients.length > 1 ? 's' : ''})
              </span>
              <span className="text-xs text-slate-500">Cliquez sur un client pour afficher sa fiche complète</span>
            </div>

            {filteredClients.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">Aucun client trouvé</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Aucun dossier client ne correspond à votre filtre ou recherche actuelle.
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-xs font-bold text-[#338b84] hover:underline cursor-pointer"
                  >
                    Effacer la recherche
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {filteredClients.map((client) => {
                  const isSelected = selectedClientId === client.id;
                  const latestSub = client.submissions[0];
                  const isVip = client.tags.some((t) => t.toUpperCase().includes('VIP'));
                  const isBlacklist = client.tags.some((t) => t.toUpperCase().includes('BLACK') || t.toUpperCase().includes('NOIRE'));

                  return (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-teal-50/70 border-l-4 border-l-[#338b84]'
                          : isBlacklist
                          ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-l-rose-600'
                          : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                      }`}
                    >
                      {/* Left: Avatar + Client Info */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`h-11 w-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                            isBlacklist
                              ? 'bg-rose-700 text-white ring-2 ring-rose-300'
                              : isVip
                              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 ring-2 ring-amber-300'
                              : client.traveledCount >= 1
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                              : 'bg-slate-800 text-white'
                          }`}
                        >
                          {(client.firstName || client.fullName || client.email || 'C')?.charAt?.(0)?.toUpperCase?.() || 'C'}
                          {(client.lastName || '')?.charAt?.(0)?.toUpperCase?.() || ''}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-slate-900 truncate">{client.fullName}</h4>

                            {/* Blacklist Badge */}
                            {isBlacklist && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-rose-600 to-red-700 text-white border border-rose-800 shadow-2xs">
                                <span>⛔ BLACKLIST</span>
                              </span>
                            )}

                            {/* VIP Status Badge */}
                            {isVip && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border border-amber-500 shadow-2xs">
                                <Crown className="h-3 w-3 fill-slate-950" />
                                <span>CLIENT VIP</span>
                              </span>
                            )}

                            {/* Loyalty Badge */}
                            {client.traveledCount >= 2 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                <Award className="h-3 w-3 text-amber-600" />
                                VIP ({client.traveledCount} voyages)
                              </span>
                            ) : client.traveledCount === 1 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Palmtree className="h-3 w-3 text-emerald-600" />1 voyage confirmé
                              </span>
                            ) : client.submissionsCount >= 2 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                {client.submissionsCount} demandes
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-500">1ère demande</span>
                            )}

                            {/* Newsletter Subscription Status Badge */}
                            {client.isNewsletterSubscribed ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"
                                title="Abonné(e) actif à l'Infolettre Privilège Évasion Soleil"
                              >
                                <Mail className="h-3 w-3 text-emerald-600" />
                                <span>Abonné(e) Infolettre</span>
                              </span>
                            ) : client.newsletterSubscriber?.status === 'unsubscribed' ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200"
                                title="Désabonné(e) de l'Infolettre"
                              >
                                <Mail className="h-3 w-3 text-slate-400" />
                                <span>Désabonné(e)</span>
                              </span>
                            ) : null}
                          </div>

                          {/* Contact */}
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                            {client.phone && (
                              <span className="inline-flex items-center gap-1 hover:text-slate-700">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {client.phone}
                              </span>
                            )}
                            {client.email && (
                              <span className="inline-flex items-center gap-1 hover:text-slate-700 truncate max-w-[200px]">
                                <Mail className="h-3 w-3 text-slate-400" />
                                {client.email}
                              </span>
                            )}
                          </div>

                          {/* Destination request */}
                          <div className="text-[11px] text-slate-500 mt-1">
                            Dernier projet :{' '}
                            <strong className="text-slate-700">{latestSub?.destination || 'Non spécifié'}</strong>{' '}
                            ({new Date(client.lastSubmissionDate).toLocaleDateString('fr-CA')})
                          </div>

                          {/* Latest Client Note Preview */}
                          {client.notes && client.notes.length > 0 && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                              <MessageSquare className="h-3 w-3 text-amber-600 shrink-0" />
                              <span className="truncate max-w-xs font-medium">
                                <strong>Note ({client.notes.length}) :</strong> {client.notes[0].text}
                              </span>
                            </div>
                          )}

                          {/* Devis envoyé indicator */}
                          {(() => {
                            const subWithSent = client.submissions.find(
                              (s) => Boolean(s.proposalsSentAt || (s.proposals && s.proposals.length > 0))
                            );

                            if (subWithSent) {
                              return (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                                    <Send className="h-3 w-3 text-purple-600" />
                                    <span>Devis transmis ({subWithSent.proposals?.length || 3} options)</span>
                                  </span>
                                </div>
                              );
                            }

                            return null;
                          })()}
                        </div>
                      </div>

                      {/* Right: Quick Tag Toggles, Signature button, and Counters */}
                      <div className="flex items-center gap-2 shrink-0 sm:self-center flex-wrap sm:flex-nowrap">
                        {/* Quick Toggle VIP */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleClientVip(client, e)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer border ${
                            isVip
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-500 shadow-xs'
                              : 'bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-900 border-slate-200 hover:border-amber-300'
                          }`}
                          title={isVip ? 'Retirer le tag VIP de ce client' : 'Marquer ce client VIP'}
                        >
                          <span>👑 VIP</span>
                        </button>

                        {/* Quick Toggle Blacklist */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleClientBlacklist(client, e)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer border ${
                            isBlacklist
                              ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                              : 'bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-800 border-slate-200 hover:border-rose-300'
                          }`}
                          title={isBlacklist ? 'Retirer ce client de la Blacklist' : 'Tagger ce client Blacklist'}
                        >
                          <span>⛔ Blacklist</span>
                        </button>

                        {/* Direct Button: Envoyer document pour signature */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClientId(client.id);
                            setDrawerTab('documents');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-teal-50 hover:bg-teal-100 text-[#1a4542] border border-teal-200 transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                          title="Envoyer un contrat ou document avec lien pour signature électronique"
                        >
                          <FileCheck className="h-3.5 w-3.5 text-[#338b84]" />
                          <span>Envoyer document (Signature)</span>
                        </button>

                        {/* Box 1: Nombre de soumissions */}
                        <div className="text-center bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
                          <div className="text-[10px] text-slate-500 font-semibold">Soumissions</div>
                          <div className="text-xs font-black text-slate-900">{client.submissionsCount}</div>
                        </div>

                        {/* Box 2: Nombre de fois qui a voyagé avec nous (Statut: reserve) */}
                        <div
                          className={`text-center px-2.5 py-1.5 rounded-lg border ${
                            client.traveledCount >= 1
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <div className="text-[10px] font-semibold">Voyages</div>
                          <div className="text-xs font-black flex items-center justify-center gap-0.5">
                            {client.traveledCount >= 1 && <span>✈️</span>}
                            <span>{client.traveledCount}</span>
                          </div>
                        </div>

                        <ChevronRight
                          className={`h-5 w-5 text-slate-400 transition-transform ${
                            isSelected ? 'translate-x-1 text-[#338b84]' : ''
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Client Detail Drawer (5 cols on lg) */}
        {selectedClient && (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5 lg:sticky lg:top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-base shadow-xs ${
                    selectedClient.tags.some((t) => t.toUpperCase().includes('BLACK') || t.toUpperCase().includes('NOIRE'))
                      ? 'bg-rose-700 text-white'
                      : selectedClient.tags.some((t) => t.toUpperCase().includes('VIP'))
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950'
                      : selectedClient.traveledCount >= 1
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-white'
                  }`}
                >
                  {(selectedClient.firstName || selectedClient.fullName || selectedClient.email || 'C')?.charAt?.(0)?.toUpperCase?.() || 'C'}
                  {(selectedClient.lastName || '')?.charAt?.(0)?.toUpperCase?.() || ''}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-900">{selectedClient.fullName}</h3>
                    {selectedClient.tags.some((t) => t.toUpperCase().includes('BLACK') || t.toUpperCase().includes('NOIRE')) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white border border-rose-700">
                        <span>⛔ BLACKLIST</span>
                      </span>
                    )}
                    {selectedClient.tags.some((t) => t.toUpperCase().includes('VIP')) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border border-amber-500">
                        <Crown className="h-3 w-3 fill-slate-950" />
                        <span>CLIENT VIP</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedClient.traveledCount >= 1 ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Voyageur Régulier ({selectedClient.traveledCount} séjours confirmés)
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        Prospect Voyageur
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClientId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                title="Fermer la fiche"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* VIP & Blacklist Toggles in Profile */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Tags du Profil Client & Soumissions
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleClientVip(selectedClient)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    selectedClient.tags.some((t) => t.toUpperCase().includes('VIP'))
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-500 shadow-xs'
                      : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-950 border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <span>👑</span>
                  <span>
                    {selectedClient.tags.some((t) => t.toUpperCase().includes('VIP'))
                      ? 'Client VIP (Actif)'
                      : 'Tagger Client VIP'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleClientBlacklist(selectedClient)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    selectedClient.tags.some((t) => t.toUpperCase().includes('BLACK') || t.toUpperCase().includes('NOIRE'))
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-800 border-slate-200 hover:border-rose-300'
                  }`}
                >
                  <span>⛔</span>
                  <span>
                    {selectedClient.tags.some((t) => t.toUpperCase().includes('BLACK') || t.toUpperCase().includes('NOIRE'))
                      ? 'Blacklist (Actif)'
                      : 'Tagger Blacklist'}
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Actions (Call, Email) */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${selectedClient.phone}`}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Appeler</span>
              </a>
              <a
                href={`mailto:${selectedClient.email}`}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#338b84] text-white hover:bg-[#2a736d] transition-colors shadow-xs"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Envoyer courriel</span>
              </a>
            </div>

            {/* Action Jumeler ce client avec un autre dossier */}
            {canMerge && (
              <button
                type="button"
                id="crm-detail-merge-btn"
                onClick={() => handleOpenMergeModal(selectedClient.id)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors shadow-xs cursor-pointer"
              >
                <GitMerge className="h-3.5 w-3.5" />
                <span>Jumeler ce dossier avec un autre client</span>
              </button>
            )}

            {/* Crucial Metrics Requested by User */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Bilan d'activité du client
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-xl font-black text-slate-900">{selectedClient.submissionsCount}</div>
                  <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                    Soumission{selectedClient.submissionsCount > 1 ? 's' : ''} faites
                  </div>
                </div>

                <div
                  className={`p-2.5 rounded-lg border ${
                    selectedClient.traveledCount > 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="text-xl font-black">{selectedClient.traveledCount}</div>
                  <div className="text-[11px] font-semibold mt-0.5">
                    Fois voyagé avec nous
                  </div>
                </div>
              </div>

              {selectedClient.traveledCount > 0 ? (
                <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-900 text-xs font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>
                    Ce client a déjà confirmé <strong>{selectedClient.traveledCount} voyage(s)</strong> avec notre agence (statut appel: Réservé) !
                  </span>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600 text-xs flex items-center gap-2">
                  <Compass className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Aucun voyage réservé pour l'instant (demandes en cours d'exploration).</span>
                </div>
              )}
            </div>

            {/* Drawer Navigation Tabs: Voyages, Documents & Signatures (PDF), Profil & Contact, Notes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setDrawerTab('dossier')}
                className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  drawerTab === 'dossier'
                    ? 'bg-white text-[#338b84] shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Palmtree className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Voyages ({selectedClient.submissions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('documents')}
                className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  drawerTab === 'documents'
                    ? 'bg-white text-teal-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck className="h-3.5 w-3.5 text-[#338b84] shrink-0" />
                <span className="truncate">Documents (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('contact')}
                className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  drawerTab === 'contact'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Profil & Contact</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('notes')}
                className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  drawerTab === 'notes'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Notes ({selectedClient.notes.length})</span>
              </button>
            </div>

            {/* TAB DOCUMENTS & SIGNATURES (PDF) */}
            {drawerTab === 'documents' && (
              <div className="space-y-4 pt-1">
                <CRMLegalDocumentsSection
                  client={selectedClient}
                  currentUser={currentUser}
                  submissions={submissions}
                  allClients={clientProfiles}
                  mode="client_drawer"
                />
              </div>
            )}

            {/* TAB PROFIL & CONTACT */}
            {drawerTab === 'contact' && (
              <div className="space-y-4">
                {/* Header with edit button */}
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Fiche d'identité & Coordonnées
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setClientFormData({
                        firstName: selectedClient.firstName,
                        lastName: selectedClient.lastName,
                        email: selectedClient.email,
                        phone: selectedClient.phone,
                        address: selectedClient.address || '',
                        city: selectedClient.city || '',
                        postalCode: selectedClient.postalCode || '',
                        birthDate: selectedClient.birthDate || '',
                        passportNumber: selectedClient.passportNumber || '',
                        passportExpiry: selectedClient.passportExpiry || '',
                        preferredDepartureCity: selectedClient.preferredDepartureCity || selectedClient.departureCities[0] || 'Montréal (YUL)',
                        budgetRange: selectedClient.budgetRange || '1 600 $ - 2 200 $ / personne',
                        preferredDestinations: selectedClient.destinations.join(', '),
                        vipLevel: selectedClient.vipLevel || (selectedClient.tags.some(t => t.toUpperCase().includes('VIP')) ? 'vip' : 'standard'),
                        notes: '',
                      });
                      setIsEditClientModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 cursor-pointer transition-colors"
                  >
                    <span>✏️ Modifier la Fiche</span>
                  </button>
                </div>

                {/* Coordonnées détaillées */}
                <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-200/70 text-xs">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
                    <span className="text-slate-500">Nom complet :</span>
                    <span className="font-bold text-slate-800">{selectedClient.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
                    <span className="text-slate-500">Téléphone :</span>
                    <span className="font-bold text-slate-800">{selectedClient.phone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
                    <span className="text-slate-500">Courriel :</span>
                    <span className="font-bold text-slate-800">{selectedClient.email || 'Non renseigné'}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
                    <span className="text-slate-500">Adresse postale :</span>
                    <span className="font-bold text-slate-800">{selectedClient.address || 'Non renseignée'}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
                    <span className="text-slate-500">Ville & Code postal :</span>
                    <span className="font-bold text-slate-800">
                      {[selectedClient.city, selectedClient.postalCode].filter(Boolean).join(', ') || 'Non renseigné'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
                    <span className="text-slate-500">Date de naissance :</span>
                    <span className="font-bold text-slate-800">{selectedClient.birthDate || 'Non renseignée'}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
                    <span className="text-slate-500">Numéro de passeport :</span>
                    <span className="font-mono font-bold text-slate-800">{selectedClient.passportNumber || 'Non renseigné'}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
                    <span className="text-slate-500">Expiration du passeport :</span>
                    <span className="font-bold text-slate-800">{selectedClient.passportExpiry || 'Non renseignée'}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
                    <span className="text-slate-500">Horaire d'appel préféré :</span>
                    <span className="font-bold text-slate-800 capitalize">
                      {selectedClient.preferredCallTime || 'Tout temps'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500">Villes de départ :</span>
                    <span className="font-bold text-slate-800">
                      {selectedClient.preferredDepartureCity || selectedClient.departureCities.join(', ') || 'YUL'}
                    </span>
                  </div>
                </div>

            {/* SECTION INFOLETTRE PRIVILÈGE ÉVASION SOLEIL */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#338b84]" />
                  <span>Infolettre Privilège Évasion Soleil</span>
                </div>
                {selectedClient.isNewsletterSubscribed ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Abonné(e) Actif(ve)</span>
                  </span>
                ) : selectedClient.newsletterSubscriber?.status === 'unsubscribed' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-300">
                    <X className="h-3 w-3 text-slate-400" />
                    <span>Désabonné(e)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    <span>Non abonné(e)</span>
                  </span>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2.5">
                {selectedClient.isNewsletterSubscribed ? (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Courriel abonné :</span>
                        <span className="font-bold text-slate-800">{selectedClient.email}</span>
                      </div>
                      {selectedClient.newsletterSubscriber?.subscribedAt && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Date d'inscription :</span>
                          <span className="font-semibold text-slate-700">
                            {new Date(selectedClient.newsletterSubscriber.subscribedAt).toLocaleDateString('fr-CA', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Origine inscription :</span>
                        <span className="font-semibold text-slate-700">
                          {selectedClient.newsletterSubscriber?.source === 'website_footer'
                            ? 'Pied de page web (Footer)'
                            : selectedClient.newsletterSubscriber?.source === 'quote_form'
                            ? 'Formulaire de devis'
                            : selectedClient.newsletterSubscriber?.source === 'manual'
                            ? 'Ajout direct CRM'
                            : 'Site web'}
                        </span>
                      </div>
                    </div>

                    {/* Préférences sélectionnées */}
                    {selectedClient.newsletterSubscriber?.preferences && (
                      <div className="pt-2 border-t border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Préférences voyages sélectionnées
                        </span>
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          <span className={`flex items-center gap-1 ${selectedClient.newsletterSubscriber.preferences.sunDestinations ? 'text-teal-700 font-semibold' : 'text-slate-400'}`}>
                            {selectedClient.newsletterSubscriber.preferences.sunDestinations ? '✓' : '✗'} Forfaits Sud & Plages
                          </span>
                          <span className={`flex items-center gap-1 ${selectedClient.newsletterSubscriber.preferences.cruisesSpecials ? 'text-sky-700 font-semibold' : 'text-slate-400'}`}>
                            {selectedClient.newsletterSubscriber.preferences.cruisesSpecials ? '✓' : '✗'} Croisières
                          </span>
                          <span className={`flex items-center gap-1 ${selectedClient.newsletterSubscriber.preferences.lastMinuteAlerts ? 'text-amber-700 font-semibold' : 'text-slate-400'}`}>
                            {selectedClient.newsletterSubscriber.preferences.lastMinuteAlerts ? '✓' : '✗'} Ventes Flash & Dernière Minute
                          </span>
                          <span className={`flex items-center gap-1 ${selectedClient.newsletterSubscriber.preferences.offersExclusive ? 'text-indigo-700 font-semibold' : 'text-slate-400'}`}>
                            {selectedClient.newsletterSubscriber.preferences.offersExclusive ? '✓' : '✗'} Offres Privilèges VIP
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                      {selectedClient.newsletterSubscriber?.token && (
                        <a
                          href={`/?newsletter_token=${selectedClient.newsletterSubscriber.token}&view=newsletter_preferences`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-[#338b84] hover:underline flex items-center gap-1"
                          title="Ouvrir la page de préférences du client"
                        >
                          <span>Préférences client</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleNewsletter(selectedClient)}
                        disabled={isTogglingNewsletter}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer disabled:opacity-50 ml-auto"
                      >
                        {isTogglingNewsletter ? 'Modification...' : 'Désabonner ce client'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500">
                      {selectedClient.newsletterSubscriber?.status === 'unsubscribed'
                        ? 'Ce client s\'est désabonné de l\'Infolettre. Vous pouvez le réinscrire avec son accord.'
                        : 'Ce client n\'est pas encore inscrit à l\'Infolettre Privilège Évasion Soleil.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleToggleNewsletter(selectedClient)}
                      disabled={isTogglingNewsletter || !selectedClient.email}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#338b84] hover:bg-[#256863] text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>{isTogglingNewsletter ? 'Inscription en cours...' : 'Inscrire à l\'Infolettre Privilège'}</span>
                    </button>
                  </div>
                )}

                {newsletterActionMessage && (
                  <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-medium animate-in fade-in">
                    {newsletterActionMessage}
                  </div>
                )}
              </div>
            </div>
            </div>
            )}

            {/* TAB VOYAGES & DOSSIERS */}
            {drawerTab === 'dossier' && (
              <div className="space-y-4 pt-1">
                {/* Chronological Submissions List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Projets de Voyages & Soumissions ({selectedClient.submissions.length})
                    </div>
                  </div>

              <div className="space-y-2.5">
                {selectedClient.submissions.map((sub, idx) => {
                  const isBooking = sub.callStatus === 'reserve';

                  return (
                    <div
                      key={sub.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                        isBooking
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900">{sub.referenceNumber}</span>
                            <span className="text-[10px] text-slate-500">
                              &bull; {new Date(sub.createdAt).toLocaleDateString('fr-CA')}
                            </span>
                          </div>
                          <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                            {sub.serviceType === 'croisiere' ? (
                              <Ship className="h-3.5 w-3.5 text-sky-600" />
                            ) : sub.serviceType === 'vol_hotel' ? (
                              <Plane className="h-3.5 w-3.5 text-indigo-600" />
                            ) : (
                              <Palmtree className="h-3.5 w-3.5 text-teal-600" />
                            )}
                            <span>{sub.destination}</span>
                          </div>
                        </div>

                        {onNavigateToSubmission && (
                          <button
                            type="button"
                            onClick={() => onNavigateToSubmission(sub.id)}
                            className="text-[11px] font-bold text-[#338b84] hover:underline cursor-pointer flex items-center gap-1"
                            title="Voir la soumission dans le pipeline"
                          >
                            <span>Voir dossier</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Details row */}
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 bg-slate-50/60 p-2 rounded-lg">
                        <div>
                          <span className="text-slate-400">Départ :</span> {sub.departureDate || 'À définir'}
                        </div>
                        <div>
                          <span className="text-slate-400">Durée :</span> {sub.duration || 'Standard'}
                        </div>
                        <div>
                          <span className="text-slate-400">Passagers :</span> {sub.adultsCount} adulte(s)
                          {sub.childrenCount > 0 ? `, ${sub.childrenCount} enf.` : ''}
                        </div>
                        <div>
                          <span className="text-slate-400">Budget :</span> {sub.budgetPerPerson || 'Standard'}
                        </div>
                      </div>

                      {/* BLOC OFFRES & SOUMISSIONS DANS LA FICHE DU CLIENT */}
                      <div className="bg-gradient-to-br from-teal-50/60 to-slate-50 p-2.5 rounded-xl border border-teal-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-slate-900 flex items-center gap-1.5">
                            <Send className="h-3.5 w-3.5 text-[#338b84]" />
                            <span>Soumissions & Options du Client</span>
                          </span>

                          {sub.selectedProposalTitle ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white border border-emerald-700">
                              🎯 Option Retenue
                            </span>
                          ) : sub.proposalsSentAt ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                              ✉️ Devis Transmis
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              À Préparer
                            </span>
                          )}
                        </div>

                        {/* BANDEAU OPTION CHOISIE SI EXISTANTE */}
                        {sub.selectedProposalTitle && (
                          <div className="bg-emerald-50 border border-emerald-400 rounded-lg p-2 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-extrabold text-emerald-950 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-emerald-600 shrink-0" />
                                <span>{sub.selectedProposalTitle}</span>
                              </span>
                              {sub.selectedProposalPrice && (
                                <span className="font-black text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-[10px]">
                                  {sub.selectedProposalPrice}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-800 font-bold">
                              {sub.selectedProposalHotel}
                            </div>
                            {sub.selectedProposalSupplier && (
                              <div className="text-[10px] text-slate-600">
                                Fournisseur : <strong>{sub.selectedProposalSupplier}</strong>
                              </div>
                            )}
                            {sub.selectedProposalNotes && (
                              <div className="text-[10px] text-emerald-900 italic bg-white/80 p-1.5 rounded border border-emerald-200">
                                &laquo; {sub.selectedProposalNotes} &raquo;
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-emerald-200/60">
                              <span>
                                Validé le : {sub.selectedProposalChosenAt ? new Date(sub.selectedProposalChosenAt).toLocaleDateString('fr-CA') : 'Récemment'}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setProposalViewerSubmission(sub)}
                                  className="font-bold text-teal-800 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 cursor-pointer flex items-center gap-1 text-[10px]"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>Consulter l'option (Lecture Seule)</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* LISTE DES OPTIONS TRANSMISES SI EXISTANTES */}
                        {sub.proposals && sub.proposals.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                              <span>Options préparées ({sub.proposals.length}) :</span>
                              <button
                                type="button"
                                onClick={() => setProposalViewerSubmission(sub)}
                                className="text-[10px] font-bold text-[#338b84] hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Consulter en plein écran (Lecture Seule)</span>
                              </button>
                            </div>

                            <div className="space-y-1">
                              {sub.proposals.map((prop, pIdx) => {
                                const isChosen =
                                  sub.selectedProposalId === prop.id ||
                                  sub.selectedProposalTitle === prop.title;

                                return (
                                  <div
                                    key={prop.id || pIdx}
                                    className={`p-1.5 rounded-lg border text-[10px] flex items-center justify-between gap-2 ${
                                      isChosen
                                        ? 'bg-emerald-50 border-emerald-400 font-bold'
                                        : 'bg-white border-slate-200'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1 truncate">
                                        <span className="font-extrabold text-slate-900">{prop.title} :</span>
                                        <span className="truncate text-slate-700">{prop.hotelOrCruiseName}</span>
                                      </div>
                                      <div className="text-slate-500 text-[9px] truncate">
                                        {prop.supplier && <span>{prop.supplier} &bull; </span>}
                                        {prop.arrivalAirportOrPort && <span>Arr: {prop.arrivalAirportOrPort}</span>}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="font-extrabold text-emerald-700">
                                        {prop.pricePerPerson}
                                      </span>
                                      {isChosen ? (
                                        <span className="text-[9px] font-black text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-300">
                                          ✓ Retenue
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-slate-400 font-medium px-1">
                                          Option proposée
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* BANDEAU DE CONSULTATION SÉCURISÉE (LECTURE SEULE) */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setProposalViewerSubmission(sub)}
                            className="w-full py-1.5 px-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-teal-700" />
                            <span>Consulter les options transmises (Mode Consultation Sécurisée)</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive Call Status Changer */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-600">Statut Appel :</span>
                        <select
                          value={sub.callStatus}
                          disabled={isUpdatingStatusId === sub.id}
                          onChange={(e) => handleStatusChangeInCRM(sub.id, e.target.value as CallStatus)}
                          className={`text-xs font-bold rounded-lg px-2 py-1 border cursor-pointer focus:outline-none ${
                            sub.callStatus === 'reserve'
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                              : sub.callStatus === 'a_appeler'
                              ? 'bg-rose-100 border-rose-300 text-rose-800'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="a_appeler">⚠️ À appeler</option>
                          <option value="appele_contact_etabli">📞 Contact établi</option>
                          <option value="appele_non_repondu">📵 Non répondu</option>
                          <option value="devis_en_cours">⏳ Devis en cours</option>
                          <option value="devis_envoye">✉️ Devis envoyé</option>
                          <option value="reserve">🎉 Réservé (A voyagé)</option>
                          <option value="perdu">Perdu</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </div>
            )}

            {/* TAB NOTES & PREFERENCES (Visible in Dossier & Notes tabs) */}
            {(drawerTab === 'notes' || drawerTab === 'dossier') && (
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-[#338b84]" />
                  <span>Notes & Préférences Client ({selectedClient.notes?.length || 0})</span>
                </div>
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddClientNote} className="space-y-2">
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Ajouter une note client ou préférence permanente (ex: aime les hôtels 5*, allergies, anniversaires)..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#338b84] focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingNote || !newNoteText.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#338b84] text-white hover:bg-[#2a736d] disabled:opacity-50 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{isSavingNote ? 'Enregistrement...' : 'Ajouter la note client'}</span>
                  </button>
                </div>
              </form>

              {/* Notes List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedClient.notes && selectedClient.notes.length > 0 ? (
                  selectedClient.notes.map((note) => (
                    <div key={note.id} className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span className="font-bold text-slate-800">{note.authorName} {note.authorGrade ? `(${note.authorGrade})` : ''}</span>
                        <div className="flex items-center gap-2">
                          <span>{new Date(note.createdAt).toLocaleDateString('fr-CA')}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteClientNote(selectedClient.id, note.id)}
                            className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                            title="Supprimer cette note"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-800 leading-relaxed whitespace-pre-line">{note.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Aucune note permanente enregistrée pour ce client.
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Modal de Jumelage de 2 Dossiers Clients */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full border border-slate-200 shadow-2xl space-y-6 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[#338b84] text-white flex items-center justify-center font-bold shadow-xs">
                  <GitMerge className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      Jumeler deux dossiers clients en un seul
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                      CRM Fusion
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consolidez les soumissions, voyages réservés et notes de deux fiches distinctes sous un dossier unique.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notification Feedback */}
            {mergeFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  mergeFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-50 text-rose-900 border border-rose-300'
                }`}
              >
                {mergeFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <span>{mergeFeedback.message}</span>
              </div>
            )}

            {/* Comparison / Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dossier Principal */}
              <div className="bg-teal-50/50 rounded-2xl p-4 border-2 border-[#338b84] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-extrabold text-xs text-[#205753]">
                    <Check className="h-4 w-4 text-[#338b84]" />
                    <span>Dossier Principal (Conservé)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#338b84] text-white">
                    RÉFÉRENCE
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Choisir le dossier principal :
                  </label>
                  <select
                    value={mergePrimaryId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setMergePrimaryId(id);
                      const target = clientProfiles.find((c) => c.id === id);
                      if (target) {
                        setMergeFirstName(target.firstName);
                        setMergeLastName(target.lastName);
                        setMergeEmail(target.email);
                        setMergePhone(target.phone);
                      }
                    }}
                    className="w-full text-xs p-2 rounded-xl bg-white border border-teal-300 font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#338b84]"
                  >
                    <option value="">-- Sélectionner le client principal --</option>
                    {clientProfiles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.email || c.phone || 'Sans coordonnées'} - {c.submissionsCount} soumissions)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Primary Card Preview */}
                {(() => {
                  const p = clientProfiles.find((c) => c.id === mergePrimaryId);
                  if (!p) return null;
                  return (
                    <div className="bg-white rounded-xl p-3 border border-teal-200 text-xs space-y-1.5 shadow-2xs">
                      <div className="font-extrabold text-slate-900">{p.fullName}</div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-1">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span>{p.email || 'Aucun courriel'}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{p.phone || 'Aucun téléphone'}</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">{p.submissionsCount} soumission(s)</span>
                        <span className="font-black text-emerald-700">✈️ {p.traveledCount} voyage(s) réservé(s)</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Dossier Secondaire à fusionner */}
              <div className="bg-amber-50/50 rounded-2xl p-4 border-2 border-amber-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-extrabold text-xs text-amber-950">
                    <GitMerge className="h-4 w-4 text-amber-600" />
                    <span>Dossier Secondaire (À fusionner)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900">
                    TRANSFÉRÉ
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Choisir le dossier à transférer :
                  </label>
                  <select
                    value={mergeSecondaryId}
                    onChange={(e) => setMergeSecondaryId(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl bg-white border border-amber-300 font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Sélectionner le dossier à transférer --</option>
                    {clientProfiles
                      .filter((c) => c.id !== mergePrimaryId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.email || c.phone || 'Sans coordonnées'} - {c.submissionsCount} soumissions)
                        </option>
                      ))}
                  </select>
                </div>

                {/* Secondary Card Preview */}
                {(() => {
                  const s = clientProfiles.find((c) => c.id === mergeSecondaryId);
                  if (!s) return null;
                  return (
                    <div className="bg-white rounded-xl p-3 border border-amber-200 text-xs space-y-1.5 shadow-2xs">
                      <div className="font-extrabold text-slate-900">{s.fullName}</div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-1">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span>{s.email || 'Aucun courriel'}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{s.phone || 'Aucun téléphone'}</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">{s.submissionsCount} soumission(s) transférée(s)</span>
                        <span className="font-black text-emerald-700">✈️ {s.traveledCount} voyage(s)</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Final Unified Contact Info Form */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span>Coordonnées unifiées finales du dossier consolidé :</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Prénom</label>
                  <input
                    type="text"
                    value={mergeFirstName}
                    onChange={(e) => setMergeFirstName(e.target.value)}
                    className="w-full text-xs p-2 bg-white rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Nom de famille</label>
                  <input
                    type="text"
                    value={mergeLastName}
                    onChange={(e) => setMergeLastName(e.target.value)}
                    className="w-full text-xs p-2 bg-white rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Courriel officiel</label>
                  <input
                    type="email"
                    value={mergeEmail}
                    onChange={(e) => setMergeEmail(e.target.value)}
                    className="w-full text-xs p-2 bg-white rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Téléphone officiel</label>
                  <input
                    type="tel"
                    value={mergePhone}
                    onChange={(e) => setMergePhone(e.target.value)}
                    className="w-full text-xs p-2 bg-white rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Action sécurisée • Journalisée avec auteur et date
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleExecuteMerge}
                  disabled={isMerging || !mergePrimaryId || !mergeSecondaryId || mergePrimaryId === mergeSecondaryId}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#338b84] hover:bg-[#225c57] text-white disabled:opacity-50 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <GitMerge className="h-4 w-4" />
                  <span>{isMerging ? 'Jumelage en cours...' : 'Confirmer et jumeler les 2 dossiers'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OFFICIEL DE VISUALISATION D'OPTION CLIENT DANS LE CRM (STRICTEMENT LECTURE SEULE) */}
      {proposalViewerSubmission && (
        <SubmissionProposalViewerModal
          isOpen={Boolean(proposalViewerSubmission)}
          onClose={() => setProposalViewerSubmission(null)}
          submission={proposalViewerSubmission}
          currentUser={currentUser}
          readOnly={true}
          onSelectProposal={async (proposalId, notes, autoSetReserved) => {
            const res = await handleSelectProposalAction(
              proposalViewerSubmission.id,
              proposalId,
              notes,
              autoSetReserved
            );
            return res;
          }}
        />
      )}

      {/* MODAL OFFICIEL D'ENVOI DE SOUMISSION DEPUIS LE CRM */}
      {proposalModalSubmission && (
        <SendSubmissionProposalModal
          isOpen={Boolean(proposalModalSubmission)}
          onClose={() => setProposalModalSubmission(null)}
          submission={proposalModalSubmission}
          currentUser={currentUser}
          onSuccess={(updatedSub) => {
            if (onSubmissionUpdated) {
              onSubmissionUpdated(updatedSub);
            }
            if (onUpdateSubmissionStatus) {
              onUpdateSubmissionStatus(updatedSub.id, 'devis_envoye');
            }
          }}
        />
      )}

      {/* MODAL INSCRIRE UNE PERSONNE À L'INFOLETTRE PRIVILÈGE ÉVASION SOLEIL */}
      {isAddSubscriberModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#338b84] to-emerald-700 text-white flex items-center justify-center font-bold shadow-xs">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Inscrire une personne à l'Infolettre Privilège
                  </h3>
                  <p className="text-xs text-slate-500">
                    Infolettre Privilège Évasion Soleil ☀️
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddSubscriberModalOpen(false);
                  setSubscriberFeedback(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {subscriberFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  subscriberFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-50 text-rose-900 border border-rose-300'
                }`}
              >
                {subscriberFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <span>{subscriberFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSubscribePerson} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Prénom :</label>
                  <input
                    type="text"
                    value={newSubFirstName}
                    onChange={(e) => setNewSubFirstName(e.target.value)}
                    placeholder="Ex: Sophie"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#338b84]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nom :</label>
                  <input
                    type="text"
                    value={newSubLastName}
                    onChange={(e) => setNewSubLastName(e.target.value)}
                    placeholder="Ex: Tremblay"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#338b84]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Courriel <span className="text-rose-500">*</span> :
                </label>
                <input
                  type="email"
                  required
                  value={newSubEmail}
                  onChange={(e) => setNewSubEmail(e.target.value)}
                  placeholder="sophie.tremblay@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#338b84]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Téléphone (Optionnel) :</label>
                <input
                  type="tel"
                  value={newSubPhone}
                  onChange={(e) => setNewSubPhone(e.target.value)}
                  placeholder="514-555-1234"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#338b84]"
                />
              </div>

              {/* Preferences */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-800 block">Centres d'intérêt du voyageur :</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSubPreferences.offersExclusive}
                      onChange={(e) => setNewSubPreferences((p) => ({ ...p, offersExclusive: e.target.checked }))}
                      className="rounded text-[#338b84]"
                    />
                    <span>Offres exclusives VIP</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSubPreferences.lastMinuteAlerts}
                      onChange={(e) => setNewSubPreferences((p) => ({ ...p, lastMinuteAlerts: e.target.checked }))}
                      className="rounded text-[#338b84]"
                    />
                    <span>Alertes dernière minute</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSubPreferences.sunDestinations}
                      onChange={(e) => setNewSubPreferences((p) => ({ ...p, sunDestinations: e.target.checked }))}
                      className="rounded text-[#338b84]"
                    />
                    <span>Destinations Soleil</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSubPreferences.cruisesSpecials}
                      onChange={(e) => setNewSubPreferences((p) => ({ ...p, cruisesSpecials: e.target.checked }))}
                      className="rounded text-[#338b84]"
                    />
                    <span>Croisières maritimes</span>
                  </label>
                </div>
              </div>

              {/* Consent check */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="crm_sub_consent"
                  checked={newSubConsent}
                  onChange={(e) => setNewSubConsent(e.target.checked)}
                  className="rounded text-[#338b84] mt-0.5"
                />
                <label htmlFor="crm_sub_consent" className="text-[11px] text-slate-600 leading-tight cursor-pointer">
                  Le client a donné son accord pour recevoir l'Infolettre Privilège Évasion Soleil (désinscription possible en 1 clic à tout moment).
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSubscriberModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSubscriber || !newSubEmail.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#286f6a] to-[#338b84] hover:from-[#205753] hover:to-[#286f6a] text-white shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{isSubmittingSubscriber ? 'Inscription...' : 'Inscrire à l\'Infolettre'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL : CRÉER OU MODIFIER UNE FICHE CLIENT DANS LE CRM        */}
      {/* ------------------------------------------------------------- */}
      {(isCreateClientModalOpen || isEditClientModalOpen) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    {isEditClientModalOpen ? 'Modifier la Fiche Client' : 'Nouvelle Fiche Client CRM'}
                  </h3>
                  <p className="text-xs text-teal-100/70">
                    Enregistrement sécurisé et permanent dans la base de données
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateClientModalOpen(false);
                  setIsEditClientModalOpen(false);
                  setClientFormFeedback(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!clientFormData.firstName.trim() || !clientFormData.lastName.trim() || !clientFormData.email.trim() || !clientFormData.phone.trim()) {
                  setClientFormFeedback({ type: 'error', message: 'Le prénom, le nom, le courriel et le téléphone sont obligatoires.' });
                  return;
                }

                setIsSubmittingClient(true);
                setClientFormFeedback(null);
                try {
                  const destList = clientFormData.preferredDestinations
                    ? clientFormData.preferredDestinations.split(',').map((s) => s.trim()).filter(Boolean)
                    : [];

                  if (isEditClientModalOpen && selectedClient) {
                    const clientKey = selectedClient.email || selectedClient.id;
                    const res = await fetch(`/api/crm/clients/${encodeURIComponent(clientKey)}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        firstName: clientFormData.firstName.trim(),
                        lastName: clientFormData.lastName.trim(),
                        email: clientFormData.email.trim().toLowerCase(),
                        phone: clientFormData.phone.trim(),
                        address: clientFormData.address.trim() || undefined,
                        city: clientFormData.city.trim() || undefined,
                        postalCode: clientFormData.postalCode.trim() || undefined,
                        birthDate: clientFormData.birthDate || undefined,
                        passportNumber: clientFormData.passportNumber.trim() || undefined,
                        passportExpiry: clientFormData.passportExpiry || undefined,
                        preferredDepartureCity: clientFormData.preferredDepartureCity || undefined,
                        budgetRange: clientFormData.budgetRange || undefined,
                        preferredDestinations: destList.length > 0 ? destList : undefined,
                        vipLevel: clientFormData.vipLevel || 'standard',
                        tags: clientFormData.vipLevel === 'vip' ? ['VIP'] : [],
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Erreur lors de la mise à jour.');
                    await fetchCrmClients();
                    setClientFormFeedback({ type: 'success', message: 'Fiche client mise à jour avec succès dans la base de données !' });
                  } else {
                    const res = await fetch('/api/crm/clients', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        firstName: clientFormData.firstName.trim(),
                        lastName: clientFormData.lastName.trim(),
                        email: clientFormData.email.trim().toLowerCase(),
                        phone: clientFormData.phone.trim(),
                        address: clientFormData.address.trim() || undefined,
                        city: clientFormData.city.trim() || undefined,
                        postalCode: clientFormData.postalCode.trim() || undefined,
                        birthDate: clientFormData.birthDate || undefined,
                        passportNumber: clientFormData.passportNumber.trim() || undefined,
                        passportExpiry: clientFormData.passportExpiry || undefined,
                        preferredDepartureCity: clientFormData.preferredDepartureCity || undefined,
                        budgetRange: clientFormData.budgetRange || undefined,
                        preferredDestinations: destList.length > 0 ? destList : undefined,
                        vipLevel: clientFormData.vipLevel || 'standard',
                        tags: clientFormData.vipLevel === 'vip' ? ['VIP'] : [],
                        notes: clientFormData.notes.trim() ? [{
                          id: `note_${Date.now()}`,
                          clientId: '',
                          authorName: currentUser.name,
                          authorGrade: currentUser.grade,
                          text: clientFormData.notes.trim(),
                          createdAt: new Date().toISOString(),
                        }] : [],
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Erreur lors de la création de la fiche client.');
                    await fetchCrmClients();
                    setClientFormFeedback({ type: 'success', message: `Fiche créée avec succès pour ${data.client?.fullName || 'le voyageur'} !` });
                  }

                  setTimeout(() => {
                    setIsCreateClientModalOpen(false);
                    setIsEditClientModalOpen(false);
                    setClientFormFeedback(null);
                  }, 1200);
                } catch (err: any) {
                  setClientFormFeedback({ type: 'error', message: err.message || 'Erreur de connexion.' });
                } finally {
                  setIsSubmittingClient(false);
                }
              }}
              className="p-5 overflow-y-auto space-y-4"
            >
              {clientFormFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    clientFormFeedback.type === 'success'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{clientFormFeedback.message}</span>
                </div>
              )}

              {/* Identité principale */}
              <div className="space-y-3">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Identité du Client
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Prénom <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientFormData.firstName}
                      onChange={(e) => setClientFormData({ ...clientFormData, firstName: e.target.value })}
                      placeholder="Ex: Jean"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#338b84]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nom de famille <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={clientFormData.lastName}
                      onChange={(e) => setClientFormData({ ...clientFormData, lastName: e.target.value })}
                      placeholder="Ex: Tremblay"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#338b84]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Courriel <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={clientFormData.email}
                      onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
                      placeholder="jean.tremblay@gmail.com"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#338b84]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Téléphone <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={clientFormData.phone}
                      onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
                      placeholder="514-555-1234"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#338b84]"
                    />
                  </div>
                </div>
              </div>

              {/* Adresse postale */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Adresse & Localisation
                </span>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Adresse civique</label>
                  <input
                    type="text"
                    value={clientFormData.address}
                    onChange={(e) => setClientFormData({ ...clientFormData, address: e.target.value })}
                    placeholder="1234, rue Sainte-Catherine Ouest"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#338b84]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ville</label>
                    <input
                      type="text"
                      value={clientFormData.city}
                      onChange={(e) => setClientFormData({ ...clientFormData, city: e.target.value })}
                      placeholder="Montréal"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#338b84]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Code postal</label>
                    <input
                      type="text"
                      value={clientFormData.postalCode}
                      onChange={(e) => setClientFormData({ ...clientFormData, postalCode: e.target.value })}
                      placeholder="H3B 1A2"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#338b84]"
                    />
                  </div>
                </div>
              </div>

              {/* Passeport & Identité officielle */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Documents de Voyage & Identité
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Numéro de passeport</label>
                    <input
                      type="text"
                      value={clientFormData.passportNumber}
                      onChange={(e) => setClientFormData({ ...clientFormData, passportNumber: e.target.value.toUpperCase() })}
                      placeholder="Ex: AB123456"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#338b84]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Expiration du passeport</label>
                    <input
                      type="date"
                      value={clientFormData.passportExpiry}
                      onChange={(e) => setClientFormData({ ...clientFormData, passportExpiry: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#338b84]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date de naissance</label>
                    <input
                      type="date"
                      value={clientFormData.birthDate}
                      onChange={(e) => setClientFormData({ ...clientFormData, birthDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#338b84]"
                    />
                  </div>
                </div>
              </div>

              {/* Préférences & Catégorie */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Préférences & Statut
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ville de départ habituelle</label>
                    <select
                      value={clientFormData.preferredDepartureCity}
                      onChange={(e) => setClientFormData({ ...clientFormData, preferredDepartureCity: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#338b84]"
                    >
                      <option value="Montréal (YUL)">Montréal (YUL)</option>
                      <option value="Québec (YQB)">Québec (YQB)</option>
                      <option value="Ottawa (YOW)">Ottawa (YOW)</option>
                      <option value="Toronto (YYZ)">Toronto (YYZ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Statut Client</label>
                    <select
                      value={clientFormData.vipLevel}
                      onChange={(e) => setClientFormData({ ...clientFormData, vipLevel: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#338b84]"
                    >
                      <option value="standard">Standard (Voyageur)</option>
                      <option value="vip">Client VIP 👑</option>
                    </select>
                  </div>
                </div>

                {!isEditClientModalOpen && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Notes internes pour ce client</label>
                    <textarea
                      rows={2}
                      value={clientFormData.notes}
                      onChange={(e) => setClientFormData({ ...clientFormData, notes: e.target.value })}
                      placeholder="Commentaires du conseiller, préférences d'hôtels, etc..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#338b84]"
                    />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateClientModalOpen(false);
                    setIsEditClientModalOpen(false);
                    setClientFormFeedback(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClient}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#338b84] hover:bg-[#256863] text-white shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {isSubmittingClient
                      ? 'Sauvegarde...'
                      : isEditClientModalOpen
                      ? 'Mettre à jour la Fiche'
                      : 'Créer la Fiche Client'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
