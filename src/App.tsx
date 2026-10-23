import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { ChatbotSection } from './components/ChatbotSection';
import { QuoteFormInteractive } from './components/QuoteFormInteractive';
import { QuoteFormEditor } from './components/QuoteFormEditor';
import { SubmissionsPipeline } from './components/SubmissionsPipeline';
import { CRMClientDirectory } from './components/CRMClientDirectory';
import { AnalyticsSection } from './components/AnalyticsSection';
import { TeamChatSection } from './components/TeamChatSection';
import { UserManagementSection } from './components/UserManagementSection';
import { NewsletterAdminSection } from './components/NewsletterAdminSection';
import { SubscriberPreferencesPage } from './components/SubscriberPreferencesPage';
import { MySQLPterodactylSection } from './components/MySQLPterodactylSection';
import { NotificationsModal } from './components/NotificationsModal';
import { StandaloneChatWidget } from './components/StandaloneChatWidget';
import { EmployeePortalLogin } from './components/EmployeePortalLogin';
import { ProfileModal } from './components/ProfileModal';
import { MobileAppNavbar } from './components/MobileAppNavbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MobileNotifier } from './utils/notificationSound';
import { PublicNewsletterFooter } from './components/PublicNewsletterFooter';
import { PublicDocumentSigningPage } from './components/PublicDocumentSigningPage';
import { NextcloudPluginsSection } from './components/NextcloudPluginsSection';
import { NextcloudCompactBar } from './components/NextcloudCompactBar';
import {
  ChatbotSettings,
  FormConfig,
  QuoteSubmission,
  TeamMessage,
  User,
  DashboardStats,
  PushNotificationItem,
  CallStatus,
  FileAttachment,
  SystemRole,
  NewsletterSubscriber,
  NextcloudCustomizationConfig,
} from './types';
import { Eye, Edit3, Sparkles, ShieldAlert, Code, Lock } from 'lucide-react';

export function App() {
  // Check standalone embed modes, newsletter view, Nextcloud plugin mode, and signature portal
  const urlParams = new URLSearchParams(window.location.search);
  const embedMode = urlParams.get('mode');
  const pluginParam = urlParams.get('plugin');
  const nextcloudParam = urlParams.get('nextcloud') || urlParams.get('nc');
  const headerParam = urlParams.get('header');
  const ncSsoUserParam = urlParams.get('nc_user') || urlParams.get('sso_user');
  const newsletterToken = urlParams.get('newsletter_token');
  const newsletterView = urlParams.get('view');
  const pathname = (typeof window !== 'undefined' ? window.location.pathname : '').toLowerCase();
  const hash = (typeof window !== 'undefined' ? window.location.hash : '').toLowerCase();
  const rawHash = typeof window !== 'undefined' ? window.location.hash : '';
  const signingToken = (() => {
    const fromQuery =
      urlParams.get('sign_doc') ||
      urlParams.get('doc_token') ||
      urlParams.get('token') ||
      urlParams.get('sign') ||
      urlParams.get('doc');
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();

    if (rawHash) {
      if (rawHash.includes('sign_doc=')) {
        return rawHash.split('sign_doc=')[1]?.split('&')[0]?.trim() || '';
      }
      if (rawHash.includes('doc_token=')) {
        return rawHash.split('doc_token=')[1]?.split('&')[0]?.trim() || '';
      }
      if (rawHash.includes('sign=')) {
        return rawHash.split('sign=')[1]?.split('&')[0]?.trim() || '';
      }
      if (rawHash.includes('doc=')) {
        return rawHash.split('doc=')[1]?.split('&')[0]?.trim() || '';
      }
      if (rawHash.startsWith('#/sign/')) {
        return rawHash.substring(7).trim();
      }
    }
    return '';
  })();

  const isNewsletterSubscriberView = Boolean(newsletterToken);

  // Helper to map aliases and hashes to internal tab IDs
  const validTabs = ['chatbot', 'devis_form', 'submissions', 'crm', 'newsletter', 'stats', 'team_chat', 'users_grades', 'mysql_server', 'nextcloud_plugins'];
  const resolveTab = (raw: string): string => {
    if (!raw) return 'submissions';
    const clean = raw.toLowerCase().replace(/^[#/]+/, '').trim();
    if (['devis', 'form', 'formulaire', 'quote', 'soumission'].includes(clean)) return 'devis_form';
    if (['martine', 'chat', 'chatbot', 'clavardage', 'assistant'].includes(clean)) return 'chatbot';
    if (['info', 'infolettre', 'newsletter', 'bulletin'].includes(clean)) return 'newsletter';
    if (['crm', 'client', 'clients', 'directory', 'repertoire', 'facturation', 'factures', 'invoices'].includes(clean)) return 'crm';
    if (['pipeline', 'demandes', 'submissions'].includes(clean)) return 'submissions';
    if (['stats', 'statistiques', 'analytics'].includes(clean)) return 'stats';
    if (['team_chat', 'team', 'equipe'].includes(clean)) return 'team_chat';
    if (['users_grades', 'grades', 'utilisateurs'].includes(clean)) return 'users_grades';
    if (['mysql_server', 'mysql', 'bdd'].includes(clean)) return 'mysql_server';
    if (['nextcloud', 'nextcloud_plugins', 'plugins', 'plugin', 'nc'].includes(clean)) return 'nextcloud_plugins';
    if (validTabs.includes(clean)) return clean;
    return 'submissions';
  };

  // Nextcloud Plugin Display Mode (hides the big dashboard header & footer)
  const [isNextcloudMode, setIsNextcloudMode] = useState<boolean>(() => {
    if (
      nextcloudParam === '1' ||
      nextcloudParam === 'true' ||
      embedMode === 'nextcloud' ||
      Boolean(pluginParam)
    ) {
      return true;
    }
    try {
      return sessionStorage.getItem('evasion_nextcloud_mode') === '1';
    } catch {
      return false;
    }
  });

  const [nextcloudHeaderMode, setNextcloudHeaderMode] = useState<'compact' | 'hidden'>(() => {
    if (headerParam === '0' || headerParam === 'none' || headerParam === 'hidden') {
      return 'hidden';
    }
    if (headerParam === 'compact') {
      return 'compact';
    }
    try {
      const saved = sessionStorage.getItem('evasion_nextcloud_header');
      if (saved === 'hidden' || saved === 'compact') return saved;
    } catch {}
    return headerParam === '0' ? 'hidden' : 'compact';
  });

  const handleToggleNextcloudMode = useCallback(
    (enabled: boolean, headerMode: 'compact' | 'hidden' = 'compact', targetPlugin?: string) => {
      setIsNextcloudMode(enabled);
      setNextcloudHeaderMode(headerMode);
      try {
        if (enabled) {
          sessionStorage.setItem('evasion_nextcloud_mode', '1');
          sessionStorage.setItem('evasion_nextcloud_header', headerMode);
        } else {
          sessionStorage.removeItem('evasion_nextcloud_mode');
          sessionStorage.removeItem('evasion_nextcloud_header');
        }
      } catch {}
      if (targetPlugin) {
        setActiveTab(resolveTab(targetPlugin));
      }
    },
    []
  );

  // Nextcloud Custom Branding & Theme Configuration (100% customizable)
  const [customBranding, setCustomBranding] = useState<NextcloudCustomizationConfig>(() => {
    try {
      const saved = localStorage.getItem('evasion_nextcloud_branding');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
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
  });

  const handleUpdateCustomBranding = async (newBranding: Partial<NextcloudCustomizationConfig>) => {
    const merged = { ...customBranding, ...newBranding };
    setCustomBranding(merged);
    try {
      localStorage.setItem('evasion_nextcloud_branding', JSON.stringify(merged));
      await fetch('/api/nextcloud/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
    } catch (err) {
      console.error('Erreur mise à jour branding Nextcloud:', err);
    }
  };

  // Authentication State for employee.evasionsoleil.com (with Nextcloud SSO auto-auth support)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (ncSsoUserParam || nextcloudParam === '1' || Boolean(pluginParam)) {
      return true;
    }
    try {
      const saved = sessionStorage.getItem('evasion_employee_session') || localStorage.getItem('evasion_employee_session');
      return Boolean(saved);
    } catch {
      return false;
    }
  });

  // Public embed or direct standalone modes:
  // Active if explicitly requested via query parameter ?mode=..., pathname (/devis, /chat, /newsletter...), or widget hash (#widget_...)
  const isNewsletterMode =
    embedMode === 'newsletter' ||
    embedMode === 'infolettre' ||
    embedMode === 'widget_newsletter' ||
    pathname === '/newsletter' ||
    pathname === '/infolettre' ||
    pathname === '/embed/newsletter' ||
    hash === '#widget_newsletter' ||
    hash === '#embed_newsletter' ||
    (!isAuthenticated && (hash === '#infolettre' || hash === '#newsletter' || hash === '#/infolettre' || hash === '#/newsletter'));

  const isDevisMode =
    embedMode === 'widget_devis' ||
    embedMode === 'devis' ||
    embedMode === 'soumission' ||
    embedMode === 'quote' ||
    pathname === '/soumission' ||
    pathname.startsWith('/soumission/') ||
    pathname === '/devis' ||
    pathname.startsWith('/devis/') ||
    pathname === '/embed/devis' ||
    pathname === '/embed/soumission' ||
    pathname === '/form' ||
    hash === '#soumission' ||
    hash === '#/soumission' ||
    hash === '#widget_devis' ||
    hash === '#embed_devis' ||
    (!isAuthenticated && (hash === '#devis' || hash === '#soumission' || hash === '#form' || hash === '#/devis' || hash === '#/soumission' || hash === '#/form'));

  const isChatMode =
    embedMode === 'widget_chat' ||
    embedMode === 'chat' ||
    pathname === '/chat' ||
    pathname === '/embed/chat' ||
    hash === '#widget_chat' ||
    hash === '#embed_chat' ||
    (!isAuthenticated && (hash === '#chat' || hash === '#martine' || hash === '#/chat' || hash === '#/martine'));

  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Core Application State
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (pluginParam) {
      return resolveTab(pluginParam);
    }
    try {
      const currentHash = window.location.hash;
      if (currentHash) {
        return resolveTab(currentHash);
      }
      const saved = sessionStorage.getItem('evasion_active_tab');
      if (saved) {
        return resolveTab(saved);
      }
    } catch {}
    return 'submissions'; // Default directly to Soumissions CRM for staff
  });
  const [formSubTab, setFormSubTab] = useState<'preview' | 'editor' | 'html_code'>('preview');
  const [selectedClientInCRM, setSelectedClientInCRM] = useState<string | null>(null);

  // Handle tab navigation with persistence and URL hash sync for browser back/forward buttons
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    try {
      sessionStorage.setItem('evasion_active_tab', tab);
      if (window.location.hash !== `#${tab}`) {
        window.history.pushState(null, '', `#${tab}`);
      }
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Listen to hash changes (e.g. browser back/forward buttons or links)
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash;
      if (currentHash) {
        setActiveTab(resolveTab(currentHash));
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = sessionStorage.getItem('evasion_employee_session') || localStorage.getItem('evasion_employee_session');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      id: 'usr_sysadmin',
      username: 'admin',
      name: 'System Administrateur',
      email: 'admin@evasionsoleil.com',
      role: 'super_admin',
      grade: 'Administrateur Système & IT',
      specialTag: 'ADMIN',
      specialTags: ['ADMIN'],
      specialTagEnabled: true,
      avatar: '',
      permissions: {
        canEditForm: true,
        canToggleBot: true,
        canExportData: true,
        canManageUsers: true,
        canManageBot: true,
        canViewSubmissions: true,
        canManageSubmissions: true,
        canViewStats: true,
        canManageTeam: true,
        canAccessTeamChat: true,
        canConfigureMySQL: true,
        canAssignAdminTags: true,
      },
    };
  });

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chatbotSettings, setChatbotSettings] = useState<ChatbotSettings>({
    botName: 'Martine V.',
    botTag: 'BOT',
    botEnabled: true,
    offlineMessage:
      "Bonjour ! Martine V. est actuellement hors ligne. Nous avons bien reçu votre message et un conseiller voyages de l'équipe Évasion Soleil vous recontactera très rapidement !",
    welcomeMessage:
      "Bonjour ! Je suis Martine V., votre conseillère virtuelle Évasion Soleil 🌴. Comment puis-je vous aider aujourd'hui ? Si vous souhaitez une estimation immédiate, dites simplement 'Devis' ou posez-moi vos questions !",
    showAgentTags: true,
    agentNotificationEmail: 'info@evasionsoleil.com',
    quoteRedirectUrl: 'https://evasionsoleil.com/devis',
    systemPrompt: 'Conseillère experte en voyages tout-inclus et croisières pour Évasion Soleil.',
  });

  const [formConfig, setFormConfig] = useState<FormConfig>({
    title: 'Demande de Devis Voyage & Croisière',
    subtitle: 'Obtenez votre soumission personnalisée au meilleur tarif garanti sous 4 heures',
    notificationEmail: 'info@evasionsoleil.com',
    departureCities: ['Montréal (YUL)', 'Québec (YQB)', 'Ottawa (YOW)', 'Toronto (YYZ)'],
    destinations: ['Cancún / Riviera Maya', 'Punta Cana', 'Varadero / Cayo Coco', 'Montego Bay', 'Bahamas', 'Europe & Méditerranée'],
    durations: [
      '7 jours / 7 nuits (Standard classique)',
      '10 jours / 10 nuits',
      '14 jours / 14 nuits',
      'Séjour court (4 à 5 jours)',
      'Plus de 14 jours (Circuit prolongé)',
    ],
    budgetRanges: [
      'Moins de 1 200 $ / personne',
      '1 200 $ - 1 600 $ / personne',
      '1 600 $ - 2 200 $ / personne',
      '2 200 $ - 3 000 $ / personne',
      '3 000 $ et plus (Luxe / VIP)',
    ],
    cruiseCabins: [
      'Balcon Privé (Vue mer dégagée - Recommandé)',
      'Cabine Extérieure (Vue mer avec sabord/fenêtre)',
      'Cabine Intérieure (Économique)',
      'Suite Deluxe avec Majordome',
    ],
    cruiseLines: [
      'Royal Caribbean (Familial & Spectaculaire)',
      'Norwegian Cruise Line (Freestyle & Décontracté)',
      'Celebrity Cruises (Haut de Gamme Moderne)',
      'MSC Croisières (Style Européen & Élégant)',
      'Carnival (Ambiance Festive)',
      'Princess Cruises (Classique & Raffiné)',
    ],
    services: [],
  });

  const [submissions, setSubmissions] = useState<QuoteSubmission[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [notifications, setNotifications] = useState<PushNotificationItem[]>([]);
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalSubmissions: 0,
    pendingCalls: 0,
    completedReservations: 0,
    conversionRate: 0,
    activeChatConversations: 0,
    topDestinations: [],
  });

  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);

  // Helper to re-fetch newsletter subscribers on demand (e.g. from CRM or footer)
  const refreshNewsletterSubscribers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/newsletter/subscribers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNewsletterSubscribers(data);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Play subtle audio chime when a push notification is received
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // Ignore if audio not allowed by browser autoplay policy
    }
  };

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [
        resStats,
        resSettings,
        resForm,
        resSubmissions,
        resTeamMessages,
        resUsers,
        resNotifs,
        resRoles,
        resSubscribers,
        resNcConfig,
      ] = await Promise.all([
        fetch('/api/stats').then((r) => r.json()).catch(() => null),
        fetch('/api/chatbot/settings').then((r) => r.json()).catch(() => null),
        fetch('/api/form/config').then((r) => r.json()).catch(() => null),
        fetch('/api/submissions').then((r) => r.json()).catch(() => null),
        fetch('/api/team-chat/messages').then((r) => r.json()).catch(() => null),
        fetch('/api/users').then((r) => r.json()).catch(() => null),
        fetch('/api/notifications').then((r) => r.json()).catch(() => null),
        fetch('/api/system-roles').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/newsletter/subscribers').then((r) => r.json()).catch(() => null),
        fetch('/api/nextcloud/config').then((r) => r.json()).catch(() => null),
      ]);

      if (resStats) setStats(resStats);
      if (resSettings) setChatbotSettings(resSettings);
      if (resForm) setFormConfig(resForm);
      if (resSubmissions) setSubmissions(resSubmissions);
      if (resTeamMessages) setTeamMessages(resTeamMessages);
      if (resNcConfig && resNcConfig.brandTitle) {
        setCustomBranding((prev) => ({ ...prev, ...resNcConfig }));
      }
      if (resUsers && resUsers.length > 0) {
        setAllUsers(resUsers);
        // keep current user synced (or match nc_user parameter if opened inside Nextcloud SSO)
        const ssoTarget = ncSsoUserParam ? ncSsoUserParam.trim().toLowerCase() : null;
        const ssoMatch = ssoTarget
          ? resUsers.find(
              (u: User) =>
                u.id.toLowerCase() === ssoTarget ||
                (u.username && u.username.toLowerCase() === ssoTarget) ||
                (u.email && u.email.toLowerCase() === ssoTarget)
            )
          : null;
        const match =
          ssoMatch ||
          resUsers.find((u: User) => u.id === currentUser.id || u.username === currentUser.username);
        if (match) {
          setCurrentUser(match);
          try {
            sessionStorage.setItem('evasion_employee_session', JSON.stringify(match));
            localStorage.setItem('evasion_employee_session', JSON.stringify(match));
          } catch {}
        } else {
          setCurrentUser(resUsers[0]);
          try {
            sessionStorage.setItem('evasion_employee_session', JSON.stringify(resUsers[0]));
            localStorage.setItem('evasion_employee_session', JSON.stringify(resUsers[0]));
          } catch {}
        }
      }
      if (resNotifs) setNotifications(resNotifs);
      if (resRoles && Array.isArray(resRoles)) setSystemRoles(resRoles);
      if (resSubscribers && Array.isArray(resSubscribers)) setNewsletterSubscribers(resSubscribers);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setIsLoadingInitial(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchData();

    // Real-time synchronization: poll notifications, team chat & submissions every 6 seconds
    const interval = setInterval(() => {
      // 1. Check notifications
      fetch('/api/notifications')
        .then((r) => r.json())
        .then((latestNotifs: PushNotificationItem[]) => {
          if (latestNotifs && Array.isArray(latestNotifs)) {
            setNotifications((prev) => {
              if (latestNotifs.length > prev.length) {
                playNotificationSound();
                MobileNotifier.playChime();
                const newest = latestNotifs[0];
                if (newest) {
                  MobileNotifier.sendNotification(newest.title || 'Évasion Soleil Alerte', {
                    body: newest.message,
                    icon: '/pwa-192x192.png',
                    tag: newest.id
                  });
                }
              }
              return latestNotifs;
            });
          }
        })
        .catch(() => {});

      // 2. Check team messages
      fetch('/api/team-chat?channelId=general')
        .then((r) => r.json())
        .then((messages: TeamMessage[]) => {
          if (messages && Array.isArray(messages)) {
            setTeamMessages(messages);
          }
        })
        .catch(() => {});

      // 3. Check submissions and update stats
      fetch('/api/submissions')
        .then((r) => r.json())
        .then((subs: QuoteSubmission[]) => {
          if (subs && Array.isArray(subs)) {
            setSubmissions(subs);
          }
        })
        .catch(() => {});
    }, 6000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Handler: Update Chatbot Settings
  const handleUpdateChatbotSettings = async (newSettings: Partial<ChatbotSettings>) => {
    const res = await fetch('/api/chatbot/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    if (res.ok) {
      const updated = await res.json();
      setChatbotSettings(updated);
    }
  };

  // Handler: Toggle Martine ON/OFF
  const handleToggleMartine = async () => {
    const nextVal = !chatbotSettings.botEnabled;
    await handleUpdateChatbotSettings({ botEnabled: nextVal });
  };

  // Handler: Update Form Config
  const handleUpdateFormConfig = async (newConfig: Partial<FormConfig>) => {
    const res = await fetch('/api/form/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    });
    if (res.ok) {
      const updated = await res.json();
      setFormConfig(updated);
    }
  };

  // Handler: Submission created in preview
  const handleSubmissionSuccess = (newSub: QuoteSubmission) => {
    setSubmissions((prev) => [newSub, ...prev]);
    playNotificationSound();
    fetchData(); // Refresh stats and notifications
  };

  // Handler: Update call status
  const handleUpdateCallStatus = async (
    id: string,
    status: CallStatus,
    note?: { text: string; authorName: string; authorGrade: string }
  ) => {
    const res = await fetch(`/api/submissions/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        note,
        userId: currentUser.id,
        userName: currentUser.name,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSubmissions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      if (err.error) {
        alert(err.error);
      }
    }
  };

  // Handler: Delete submission (Seul le System Admin peut supprimer)
  const handleDeleteSubmission = async (id: string) => {
    const isSysAdmin = currentUser?.role === 'super_admin' || currentUser?.username?.toLowerCase() === 'admin';
    if (!isSysAdmin) {
      alert("Action refusée : Seul le System Administrateur a l'autorisation de supprimer définitivement une soumission.");
      return;
    }

    const res = await fetch(`/api/submissions/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-role': currentUser.role || '',
        'x-user-username': currentUser.username || '',
      },
    });
    if (res.ok) {
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Erreur lors de la suppression');
    }
  };

  // Handler: Add note to submission
  const handleAddSubmissionNote = async (
    id: string,
    text: string,
    authorName: string,
    authorGrade: string
  ) => {
    const res = await fetch(`/api/submissions/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, authorName, authorGrade }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSubmissions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    }
  };

  // Handler: Update submission custom tags
  const handleUpdateSubmissionTags = async (id: string, tags: string[]) => {
    const res = await fetch(`/api/submissions/${id}/tags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSubmissions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    }
  };

  // Handler: Assign submission to an advisor (avec verrouillage si Réservé)
  const handleAssignSubmission = async (
    id: string,
    assignedToUserId?: string,
    assignedToUserName?: string,
    note?: string
  ) => {
    const res = await fetch(`/api/submissions/${id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignedToUserId,
        assignedToUserName,
        note,
        callerRole: currentUser.role,
        callerPermissions: currentUser.permissions,
        callerUserId: currentUser.id,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSubmissions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } else {
      const err = await res.json().catch(() => ({}));
      if (err.error) {
        alert(err.error);
      }
    }
  };

  // Handler: Merge two client dossiers
  const handleMergeClients = async (params: {
    primaryClientKey: string;
    secondaryClientKey: string;
    targetInfo?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/crm/merge-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          callerRole: currentUser.role,
          callerPermissions: currentUser.permissions,
          callerName: currentUser.name,
          callerGrade: currentUser.grade,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (Array.isArray(data.updatedSubmissions)) {
          setSubmissions(data.updatedSubmissions);
        }
        await fetchData();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.error || 'Erreur lors du jumelage des dossiers.' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Erreur réseau lors du jumelage.' };
    }
  };

  // Handler: Send Team Chat Message
  const handleSendTeamMessage = async (text: string, attachments?: FileAttachment[]) => {
    const res = await fetch('/api/team-chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        userGrade: currentUser.grade,
        userTag: currentUser.specialTagEnabled ? currentUser.specialTag : undefined,
        text,
        attachments,
      }),
    });
    if (res.ok) {
      const newMsg = await res.json();
      setTeamMessages((prev) => [...prev, newMsg]);
    }
  };

  // Handler: Clear Team Chat History
  const handleClearTeamMessages = async () => {
    try {
      const res = await fetch('/api/team-chat', { method: 'DELETE' });
      if (res.ok) {
        setTeamMessages([]);
      }
    } catch (err) {
      console.error('Erreur réinitialisation du chat d\'équipe:', err);
    }
  };

  // Handler: View Client in CRM Tab
  const handleViewClientInCRM = (clientKey: string) => {
    setSelectedClientInCRM(clientKey);
    handleTabChange('crm');
  };

  // Handler: Update User Profile / Grade / Tag / Permissions / Password
  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setAllUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      if (currentUser.id === userId) {
        setCurrentUser(updated);
        try {
          sessionStorage.setItem('evasion_employee_session', JSON.stringify(updated));
          localStorage.setItem('evasion_employee_session', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    } else {
      const err = await res.json().catch(() => ({ error: 'Erreur lors de la mise à jour du compte' }));
      throw new Error(err.error || 'Erreur lors de la mise à jour du compte');
    }
  };

  // Handler: Update Agent Availability Status (disponible / indisponible)
  const handleUpdateUserStatus = async (userId: string, newStatus: 'disponible' | 'indisponible') => {
    const targetId = userId || currentUser.id;
    // 1. Optimistic update
    setAllUsers((prev) => prev.map((u) => (u.id === targetId ? { ...u, status: newStatus } : u)));
    if (currentUser.id === targetId || currentUser.username === 'admin') {
      const updatedCur = { ...currentUser, status: newStatus };
      setCurrentUser(updatedCur);
      try {
        sessionStorage.setItem('evasion_employee_session', JSON.stringify(updatedCur));
        localStorage.setItem('evasion_employee_session', JSON.stringify(updatedCur));
      } catch {}
    }

    try {
      const res = await fetch(`/api/users/${targetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setAllUsers((prev) => prev.map((u) => (u.id === targetId ? { ...u, ...data.user } : u)));
        if (currentUser.id === targetId || data.user.id === currentUser.id) {
          const updatedCur = { ...currentUser, ...data.user, status: newStatus };
          setCurrentUser(updatedCur);
          try {
            sessionStorage.setItem('evasion_employee_session', JSON.stringify(updatedCur));
            localStorage.setItem('evasion_employee_session', JSON.stringify(updatedCur));
          } catch {}
        }
        return data;
      }
    } catch (err) {
      console.error('Failed to update agent status:', err);
    }
  };

  // Handler: Add New User
  const handleAddUser = async (newUser: Omit<User, 'id'>) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      const created = await res.json();
      setAllUsers((prev) => [...prev, created]);
    } else {
      const err = await res.json().catch(() => ({ error: 'Erreur lors de la création du compte' }));
      throw new Error(err.error || 'Erreur lors de la création du compte');
    }
  };

  // Handler: Delete User
  const handleDeleteUser = async (userId: string) => {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setAllUsers((prev) => prev.filter((u) => u.id !== userId));
      return true;
    } else {
      const err = await res.json().catch(() => ({ error: 'Erreur lors de la suppression' }));
      throw new Error(err.error || 'Erreur lors de la suppression');
    }
  };

  // Handler: Mark all notifications read
  const handleMarkAllNotifsRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
  };

  // Handler: Clear all notifications
  const handleClearAllNotifs = async () => {
    try {
      await fetch('/api/notifications/clear', { method: 'POST' });
      setNotifications([]);
    } catch (err) {
      console.error('Error clearing notifications', err);
    }
  };

  // Handler: Delete single notification
  const handleDeleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification', err);
    }
  };

  // Handler: Send notification by admin
  const handleSendNotification = async (notifData: {
    title: string;
    message: string;
    type: string;
    targetUserId: string;
    targetUserName: string;
  }) => {
    const res = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...notifData,
        senderName: currentUser ? `${currentUser.name} (${currentUser.grade || currentUser.role})` : 'Direction',
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setNotifications((prev) => [created, ...prev]);
    }
  };

  // Handler: Update System Role
  const handleUpdateSystemRole = async (role: SystemRole, syncUsers = false) => {
    try {
      const res = await fetch(`/api/system-roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...role, syncUsers }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.role || data;
        setSystemRoles((prev) => prev.map((r) => (r.id === role.id ? updated : r)));
        if (syncUsers) {
          fetchData(); // Refresh user permissions across the app
        }
        return updated;
      }
    } catch (err) {
      console.error('Error updating system role:', err);
    }
  };

  // Handler: Add System Role
  const handleAddSystemRole = async (newRole: Omit<SystemRole, 'id'>) => {
    try {
      const res = await fetch('/api/system-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole),
      });
      if (res.ok) {
        const created = await res.json();
        setSystemRoles((prev) => [...prev, created]);
        return created;
      }
    } catch (err) {
      console.error('Error creating system role:', err);
    }
  };

  // Handler: Delete System Role
  const handleDeleteSystemRole = async (roleId: string) => {
    try {
      const res = await fetch(`/api/system-roles/${roleId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSystemRoles((prev) => prev.filter((r) => r.id !== roleId));
        return true;
      }
    } catch (err) {
      console.error('Error deleting system role:', err);
    }
    return false;
  };

  // Handler: Login Success on employee.evasionsoleil.com
  const handleLoginSuccess = (user: User) => {
    try {
      sessionStorage.setItem('evasion_employee_session', JSON.stringify(user));
      localStorage.setItem('evasion_employee_session', JSON.stringify(user));
      sessionStorage.setItem('evasion_active_tab', 'submissions');
    } catch {}
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActiveTab('submissions');
    // Rafraîchissement automatique et propre pour éviter tout problème d'état ou blocage :
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('reset_token')) {
        window.history.replaceState({}, '', window.location.pathname + '#submissions');
      } else {
        window.location.hash = '#submissions';
      }
      window.location.reload();
    }
  };

  // Handler: Logout
  const handleLogout = () => {
    try {
      sessionStorage.removeItem('evasion_employee_session');
      localStorage.removeItem('evasion_employee_session');
      sessionStorage.removeItem('evasion_active_tab');
    } catch {}
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      window.location.hash = '';
      window.location.reload();
    }
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  // 0. PUBLIC CLIENT SIGNATURE PORTAL FOR LEGAL DOCUMENTS
  if (signingToken) {
    return (
      <ErrorBoundary>
        <PublicDocumentSigningPage
          token={signingToken}
          onBackToApp={() => {
            window.location.hash = '';
            window.location.search = '';
          }}
        />
      </ErrorBoundary>
    );
  }

  // 1. EMBED MODE: WIDGET CHAT (Martine V.)
  if (isChatMode) {
    return (
      <ErrorBoundary>
        <div className="w-full min-h-screen flex flex-col bg-transparent">
          <div className="flex-1">
            <StandaloneChatWidget settings={chatbotSettings} />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // 2. EMBED MODE: INFOLETTRE (Privilège Évasion Soleil)
  if (isNewsletterMode) {
    return (
      <ErrorBoundary>
        <div className="w-full bg-transparent p-0 m-0 overflow-hidden">
          <PublicNewsletterFooter isEmbed={true} />
        </div>
      </ErrorBoundary>
    );
  }

  // 3. NEWSLETTER PREFERENCES & UNSUBSCRIBE VIEW (PUBLIC FOR SUBSCRIBERS)
  if (isNewsletterSubscriberView && newsletterToken) {
    return (
      <ErrorBoundary>
        <SubscriberPreferencesPage
          token={newsletterToken}
          defaultAction={newsletterView === 'newsletter_unsubscribe' ? 'unsubscribe' : 'preferences'}
          onGoBack={() => {
            window.location.href = '/';
          }}
        />
      </ErrorBoundary>
    );
  }

  // 4. STANDALONE & EMBED MODE: INTÉGRATION DEVIS PAGE D'ACCUEIL (FOND 100% INVISIBLE & LARGEUR ADAPTATIVE)
  if (isDevisMode) {
    return (
      <ErrorBoundary>
        <div className="w-full bg-transparent p-0 m-0 font-sans selection:bg-[#338b84] selection:text-white">
          <QuoteFormInteractive
            formConfig={formConfig}
            onSubmissionSuccess={handleSubmissionSuccess}
            isStandaloneEmbed={true}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // 5. EMPLOYEE PORTAL AUTHENTICATION (employee.evasionsoleil.com)
  const hasResetTokenInUrl =
    typeof window !== 'undefined' && Boolean(new URLSearchParams(window.location.search).get('reset_token'));

  if (!isAuthenticated || hasResetTokenInUrl) {
    return (
      <ErrorBoundary>
        <EmployeePortalLogin
          onLoginSuccess={handleLoginSuccess}
          allUsers={allUsers}
        />
      </ErrorBoundary>
    );
  }

  // 4. MAIN DASHBOARD VIEW
  const isSystemAdmin =
    currentUser?.role === 'super_admin' ||
    currentUser?.username?.toLowerCase() === 'admin';

  const isUserAdmin =
    isSystemAdmin ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin';

  const canAccessStats =
    isUserAdmin ||
    Boolean(currentUser?.permissions?.canViewStats);

  const canAccessNewsletter = true; // Accessible à tous les conseillers et administrateurs

  // Handler pour enregistrer ou modifier le choix de l'option de soumission retenue par le client
  const handleSelectSubmissionProposal = async (
    id: string,
    proposalId: string | null,
    notes?: string,
    autoSetReserved?: boolean
  ): Promise<{ success: boolean; submission?: QuoteSubmission }> => {
    try {
      const res = await fetch(`/api/submissions/${id}/select-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-username': currentUser.username || currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          proposalId,
          chosenBy: currentUser.name,
          notes,
          autoSetReserved,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erreur lors de la sélection de l'option");
      }
      if (data.submission) {
        setSubmissions((prev) =>
          prev.map((s) => (s.id === id ? data.submission : s))
        );
        return { success: true, submission: data.submission };
      }
      return { success: true };
    } catch (err: any) {
      console.error('Erreur select proposal:', err);
      return { success: false };
    }
  };

  // Handler pour synchroniser l'état local après envoi ou mise à jour de soumission
  const handleSubmissionUpdated = (updatedSub: QuoteSubmission) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === updatedSub.id ? updatedSub : s))
    );
  };

  return (
    <ErrorBoundary>
      <div
        className={`min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col selection:bg-[#338b84] selection:text-white ${
          isNextcloudMode ? 'pb-4' : 'pb-20 md:pb-12'
        }`}
      >
        <OfflineIndicator />
        {/* Navigation Bar : Either Nextcloud Compact/Zero-Header Mode OR Classic Dashboard Navbar */}
        {isNextcloudMode ? (
          <NextcloudCompactBar
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            currentUser={currentUser}
            chatbotSettings={chatbotSettings}
            onToggleBot={handleToggleMartine}
            unreadNotifsCount={unreadNotifsCount}
            onOpenNotifications={() => setIsNotifOpen(true)}
            onUpdateUserStatus={handleUpdateUserStatus}
            headerMode={nextcloudHeaderMode}
            onChangeHeaderMode={(mode) => handleToggleNextcloudMode(true, mode)}
            onExitNextcloudMode={() => handleToggleNextcloudMode(false)}
            customBranding={customBranding}
          />
        ) : (
          <Navbar
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            allUsers={allUsers}
            chatbotSettings={chatbotSettings}
            onToggleBot={handleToggleMartine}
            notifications={notifications}
            onOpenNotifications={() => setIsNotifOpen(true)}
            unreadNotifsCount={unreadNotifsCount}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            onLogout={handleLogout}
            onUpdateUserStatus={handleUpdateUserStatus}
            onEnableNextcloudMode={() => handleToggleNextcloudMode(true, 'compact')}
            customBranding={customBranding}
          />
        )}

        {/* Main Content Area */}
      <main
        className={`flex-1 w-full mx-auto ${
          isNextcloudMode
            ? 'max-w-[1600px] px-2 sm:px-4 py-3'
            : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-6'
        }`}
      >
        {/* Tab 1: Chatbot Martine V. */}
        {activeTab === 'chatbot' && (
          <ChatbotSection
            settings={chatbotSettings}
            onUpdateSettings={handleUpdateChatbotSettings}
            currentUser={currentUser}
            allUsers={allUsers}
            onUpdateUserStatus={handleUpdateUserStatus}
          />
        )}

        {/* Tab 2: Formulaire Devis (Preview, Builder & HTML Integration Code) */}
        {activeTab === 'devis_form' && (
          <div className="space-y-6">
            {/* Sub-navigation between interactive simulator, configuration & HTML embed code */}
            {(isUserAdmin || Boolean(currentUser?.permissions?.canEditForm)) && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Formulaire Devis Interactif & Codes d'Intégration HTML
                  </h2>
                  <p className="text-xs text-slate-500">
                    Testez le formulaire de soumission, personnalisez les champs ou copiez le code HTML pour votre site (Pleine Page ou Page d'Accueil).
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 flex-wrap">
                  <button
                    onClick={() => setFormSubTab('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formSubTab === 'preview'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Aperçu Interactif</span>
                  </button>
                  <button
                    onClick={() => setFormSubTab('editor')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formSubTab === 'editor'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Modifier le Formulaire</span>
                  </button>
                  <button
                    onClick={() => setFormSubTab('html_code')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formSubTab === 'html_code'
                        ? 'bg-[#338b84] text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900 bg-teal-50/70'
                    }`}
                  >
                    <Code className="h-3.5 w-3.5" />
                    <span>Code HTML d'Intégration</span>
                  </button>
                </div>
              </div>
            )}

            {(formSubTab === 'editor' || formSubTab === 'html_code') && (isUserAdmin || Boolean(currentUser?.permissions?.canEditForm)) ? (
              <QuoteFormEditor
                formConfig={formConfig}
                onSaveConfig={handleUpdateFormConfig}
                onOpenPreview={() => setFormSubTab('preview')}
                currentUser={currentUser}
                initialSubTab={formSubTab === 'html_code' ? 'embed_code' : 'branding'}
              />
            ) : (
              <QuoteFormInteractive
                formConfig={formConfig}
                onSubmissionSuccess={handleSubmissionSuccess}
              />
            )}
          </div>
        )}

        {/* Tab 3: Submissions Pipeline */}
        {activeTab === 'submissions' && (
          <SubmissionsPipeline
            submissions={submissions}
            currentUser={currentUser}
            allUsers={allUsers}
            newsletterSubscribers={newsletterSubscribers}
            onUpdateStatus={handleUpdateCallStatus}
            onDeleteSubmission={handleDeleteSubmission}
            onAddNote={handleAddSubmissionNote}
            onUpdateTags={handleUpdateSubmissionTags}
            onAssignSubmission={handleAssignSubmission}
            onViewClientInCRM={handleViewClientInCRM}
            onMergeClients={handleMergeClients}
            onSelectProposal={handleSelectSubmissionProposal}
            onSubmissionUpdated={handleSubmissionUpdated}
          />
        )}

        {/* Tab CRM: Client Directory & Loyalty Tracking (User Requested) */}
        {activeTab === 'crm' && (
          <CRMClientDirectory
            submissions={submissions}
            currentUser={currentUser}
            newsletterSubscribers={newsletterSubscribers}
            onRefreshSubscribers={refreshNewsletterSubscribers}
            onUpdateSubmissionStatus={handleUpdateCallStatus}
            onNavigateToSubmission={(_subId) => {
              handleTabChange('submissions');
            }}
            initialSelectedClientKey={selectedClientInCRM}
            onMergeClients={handleMergeClients}
            onSelectProposal={handleSelectSubmissionProposal}
            onSubmissionUpdated={handleSubmissionUpdated}
          />
        )}

        {/* Tab Newsletter: Diffusion Infolettres & Offres aux clients */}
        {activeTab === 'newsletter' && (
          canAccessNewsletter ? (
            <NewsletterAdminSection
              currentUser={currentUser}
              allSubmissions={submissions}
            />
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-sm">
              <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Accès Restreint à l'Infolettre</h3>
              <p className="text-sm text-slate-600 mb-6">
                La rédaction et l'envoi d'offres massives par infolettre sont strictement réservés aux <strong>Administrateurs</strong> ou aux collaborateurs autorisés avec la permission <code>canSendNewsletter</code>.
              </p>
              <button
                onClick={() => setActiveTab('submissions')}
                className="px-4 py-2 bg-[#338b84] hover:bg-[#286f6a] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Retourner aux Soumissions
              </button>
            </div>
          )
        )}

        {/* Tab 4: Analytics (Restricted strictly to Admin & canViewStats permission) */}
        {activeTab === 'stats' && (
          canAccessStats ? (
            <AnalyticsSection stats={stats} submissions={submissions} />
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-sm">
              <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Accès Restreint aux Statistiques</h3>
              <p className="text-sm text-slate-600 mb-6">
                La consultation des statistiques d'affaires et métriques de vente est strictement réservée aux <strong>Administrateurs</strong> ou aux collaborateurs disposant de la permission spécifique <code>canViewStats</code>.
              </p>
              <button
                onClick={() => setActiveTab('submissions')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Retourner au pipeline des soumissions
              </button>
            </div>
          )
        )}

        {/* Tab 5: Team Chat with Attachments */}
        {activeTab === 'team_chat' && (
          <TeamChatSection
            currentUser={currentUser}
            allUsers={allUsers}
            messages={teamMessages}
            onSendMessage={handleSendTeamMessage}
            onClearChat={handleClearTeamMessages}
          />
        )}

        {/* Tab 6: User Management & Access Control (Admin Only) */}
        {activeTab === 'users_grades' && (
          (currentUser.role === 'admin' || currentUser.role === 'super_admin') ? (
            <UserManagementSection
              currentUser={currentUser}
              allUsers={allUsers}
              systemRoles={systemRoles}
              onUpdateUser={handleUpdateUser}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              onUpdateSystemRole={handleUpdateSystemRole}
              onAddSystemRole={handleAddSystemRole}
              onDeleteSystemRole={handleDeleteSystemRole}
              onUpdateUserStatus={handleUpdateUserStatus}
            />
          ) : (
            <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center max-w-lg mx-auto shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Accès Restreint aux Administrateurs</h3>
              <p className="text-xs text-slate-500 mb-4">
                La page « Grades & Équipe » est masquée et réservée exclusivement aux administrateurs IT de l'agence Évasion Soleil.
              </p>
              <button
                onClick={() => setActiveTab('submissions')}
                className="px-4 py-2 bg-[#338b84] hover:bg-[#286f6a] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Retourner aux Soumissions
              </button>
            </div>
          )
        )}

        {/* Tab 7: Base de données MySQL (Strictement réservé au System Admin) */}
        {activeTab === 'mysql_server' && (
          isSystemAdmin ? (
            <MySQLPterodactylSection />
          ) : (
            <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center max-w-lg mx-auto shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Accès Réservé au System Admin</h3>
              <p className="text-xs text-slate-500 mb-4">
                Les informations d'intégration et de configuration de la base de données MySQL sont strictement masquées et réservées à l'administrateur système.
              </p>
              <button
                onClick={() => setActiveTab('submissions')}
                className="px-4 py-2 bg-[#338b84] hover:bg-[#286f6a] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Retourner aux Soumissions
              </button>
            </div>
          )
        )}
        {/* Tab 8: Nextcloud Plugins Hub & Mode Modulaire Sans Dashboard */}
        {activeTab === 'nextcloud_plugins' && (
          <NextcloudPluginsSection
            currentUser={currentUser}
            allUsers={allUsers}
            isNextcloudMode={isNextcloudMode}
            nextcloudHeaderMode={nextcloudHeaderMode}
            onToggleNextcloudMode={handleToggleNextcloudMode}
            onOpenPluginTab={handleTabChange}
            customBranding={customBranding}
            onUpdateCustomBranding={handleUpdateCustomBranding}
            submissions={submissions}
            chatbotSettings={chatbotSettings}
            onToggleMartine={handleToggleMartine}
            onUpdateCallStatus={handleUpdateCallStatus}
          />
        )}
      </main>

      {/* Footer Global (Masqué en Mode Plugin Nextcloud pour un affichage 100% natif) */}
      {!isNextcloudMode && (
        <footer className="w-full bg-slate-900 border-t border-slate-800 text-slate-300 py-10 px-4 sm:px-6 lg:px-8 mt-12 mb-16 md:mb-0">
          <div className="max-w-7xl mx-auto space-y-8">
            <PublicNewsletterFooter />
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <div>
                © {new Date().getFullYear()} Voyages Évasion Soleil Inc. Tous droits réservés. Titulaire d'un permis du Québec.
              </div>
              <div className="flex items-center gap-4">
                <a href="#devis" onClick={() => handleTabChange('devis_form')} className="hover:text-amber-400 transition-colors">
                  Demande de Devis
                </a>
                <span>•</span>
                <a href="#newsletter" onClick={() => handleTabChange('newsletter')} className="hover:text-amber-400 transition-colors">
                  Infolettre Privilège
                </a>
                <span>•</span>
                <a href="#chatbot" onClick={() => handleTabChange('chatbot')} className="hover:text-amber-400 transition-colors">
                  Conseillère Martine V.
                </a>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        currentUser={currentUser || undefined}
        allUsers={allUsers}
        onMarkAllAsRead={handleMarkAllNotifsRead}
        onClearAll={handleClearAllNotifs}
        onDeleteNotification={handleDeleteNotification}
        onSendNotification={handleSendNotification}
        onSelectNotification={(notif) => {
          if (notif.type === 'new_submission') {
            handleTabChange('submissions');
          } else if (notif.type === 'chat_alert') {
            handleTabChange('chatbot');
          } else if (notif.type === 'team_chat') {
            handleTabChange('team_chat');
          }
          setIsNotifOpen(false);
        }}
      />

      {/* Profile Modification Modal (Modifiable by staff) */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
      />

      {/* Mobile Bottom Navigation for Smartphone & PWA (Masqué en Mode Plugin Nextcloud Pur) */}
      {!isNextcloudMode && (
        <MobileAppNavbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          currentUser={currentUser}
          chatbotSettings={chatbotSettings}
          submissionsCount={submissions.length}
          unreadNotifsCount={unreadNotifsCount}
          waitingChatCount={0}
          onOpenNotifications={() => setIsNotifOpen(true)}
        />
      )}
    </div>
  </ErrorBoundary>
  );
}

export default App;
