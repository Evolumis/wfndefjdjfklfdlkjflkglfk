import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Copy,
  Check,
  ExternalLink,
  Download,
  Terminal,
  Sparkles,
  Inbox,
  Contact,
  Bot,
  FileText,
  Mail,
  BarChart3,
  MessageSquare,
  Users,
  Database,
  EyeOff,
  Layout,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Maximize2,
  HelpCircle,
  Palette,
  Image as ImageIcon,
  Type,
  Sliders,
  Save,
  Monitor,
  PhoneCall,
  CheckSquare,
  Calendar,
  DollarSign,
  FileCheck,
  Flame,
  Globe,
  Settings2,
  ArrowRight,
  RefreshCw,
  Power,
  Search,
} from 'lucide-react';
import { User, NextcloudCustomizationConfig } from '../types';

interface NextcloudPluginsSectionProps {
  currentUser: User;
  allUsers: User[];
  isNextcloudMode: boolean;
  nextcloudHeaderMode: 'compact' | 'hidden';
  onToggleNextcloudMode: (enabled: boolean, headerMode?: 'compact' | 'hidden', targetPlugin?: string) => void;
  onOpenPluginTab: (tabId: string) => void;
  customBranding: NextcloudCustomizationConfig;
  onUpdateCustomBranding: (newBranding: Partial<NextcloudCustomizationConfig>) => Promise<void>;
  submissions: any[];
  chatbotSettings: any;
  onToggleMartine: () => void;
  onUpdateCallStatus?: (id: string, status: any) => Promise<void>;
}

interface PluginDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  badge?: string;
  svgIconContent: string;
  moduleCode: string;
}

export const NextcloudPluginsSection: React.FC<NextcloudPluginsSectionProps> = ({
  currentUser,
  allUsers,
  isNextcloudMode,
  nextcloudHeaderMode,
  onToggleNextcloudMode,
  onOpenPluginTab,
  customBranding,
  onUpdateCustomBranding,
  submissions,
  chatbotSettings,
  onToggleMartine,
  onUpdateCallStatus,
}) => {
  const [activeMainSubTab, setActiveMainSubTab] = useState<'branding' | 'simulator' | 'plugins' | 'html_code'>('branding');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [selectedSimulatorView, setSelectedSimulatorView] = useState<'dashboard_widgets' | 'full_app'>('dashboard_widgets');

  // Local state for branding customization
  const [brandingForm, setBrandingForm] = useState<NextcloudCustomizationConfig>({ ...customBranding });

  useEffect(() => {
    setBrandingForm({ ...customBranding });
  }, [customBranding]);

  const baseUrl =
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    'https://intranet.evasionsoleil.com/evasion-app';

  const plugins: PluginDefinition[] = [
    {
      id: 'submissions',
      name: 'Plugin Soumissions & Pipeline d\'Appels',
      shortName: 'Soumissions',
      description:
        'Gestion complète des demandes de devis au soleil, tri d\'appels (Non appelé, Appelé, Réservé), assignation aux conseillers, notes d\'équipe et devis PDF.',
      icon: Inbox,
      color: 'from-[#338b84] to-[#205753]',
      badge: 'POPULAIRE',
      moduleCode: 'evasion_soumissions',
      svgIconContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
    },
    {
      id: 'crm',
      name: 'Plugin CRM Clients, Factures & Contrats',
      shortName: 'CRM & Facturation',
      description:
        'Répertoire fidélité clients, création de factures PDF, suivi des paiements avec cartes de crédit et contrats légaux avec signature électronique.',
      icon: Contact,
      color: 'from-indigo-600 to-indigo-800',
      badge: 'COMPLET',
      moduleCode: 'evasion_crm',
      svgIconContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"/><rect width="18" height="18" x="3" y="4" rx="2"/><circle cx="12" cy="10" r="2"/><line x1="8" x2="8" y1="2" y2="4"/><line x1="16" x2="16" y1="2" y2="4"/></svg>`,
    },
    {
      id: 'chatbot',
      name: 'Plugin Chatbot Martine V. (IA)',
      shortName: 'Martine V.',
      description:
        'Contrôle en direct (ON/OFF) de la conseillère virtuelle Martine V., historique des conversations clients, transcriptions courriel et demandes de rappel.',
      icon: Bot,
      color: 'from-emerald-600 to-teal-800',
      badge: 'IA 24/7',
      moduleCode: 'evasion_martine',
      svgIconContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`,
    },
    {
      id: 'devis_form',
      name: 'Plugin Formulaire Devis & Éditeur',
      shortName: 'Formulaire Devis',
      description:
        'Simulateur interactif pour prise d\'appel téléphonique client en 1 minute chrono + éditeur des forfaits, destinations et codes d\'intégration HTML.',
      icon: FileText,
      color: 'from-amber-500 to-amber-700',
      moduleCode: 'evasion_devis',
      svgIconContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`,
    },
    {
      id: 'newsletter',
      name: 'Plugin Infolettre & Offres Privilège',
      shortName: 'Infolettre',
      description:
        'Diffusion massive d\'offres voyages au soleil, gestion des abonnés, désabonnements RGPD/Loi 25 et suivi des campagnes de rabais.',
      icon: Mail,
      color: 'from-sky-600 to-blue-800',
      moduleCode: 'evasion_newsletter',
      svgIconContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    },
    {
      id: 'stats',
      name: 'Plugin Statistiques & Performance',
      shortName: 'Statistiques',
      description:
        'Métriques de vente en temps réel : taux de conversion, volume de soumissions, top destinations et analyses d\'affaires.',
      icon: BarChart3,
      color: 'from-violet-600 to-purple-800',
      moduleCode: 'evasion_stats',
      svgIconContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,
    },
    {
      id: 'team_chat',
      name: 'Plugin Chat d\'Équipe & Alertes',
      shortName: 'Chat Équipe',
      description:
        'Clavardage instantané sécurisé entre collègues et conseillers avec partage de pièces jointes PDF, captures et alertes push.',
      icon: MessageSquare,
      color: 'from-rose-500 to-pink-700',
      moduleCode: 'evasion_chat',
      svgIconContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    },
    {
      id: 'users_grades',
      name: 'Plugin Grades, Rôles & Sécurité',
      shortName: 'Grades & Équipe',
      description:
        'Gestion des accès conseillers, disponibilité en ligne (Disponible / Indisponible), rôles RBAC et double facteur 2FA.',
      icon: Users,
      color: 'from-slate-700 to-slate-900',
      badge: 'ADMIN',
      moduleCode: 'evasion_users',
      svgIconContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    },
    {
      id: 'mysql_server',
      name: 'Plugin Base MySQL & Pterodactyl',
      shortName: 'Serveur MySQL',
      description:
        'Statut de connexion MySQL / MariaDB, réplication haute disponibilité, protection WAF Anti-Hack et télémétrie système.',
      icon: Database,
      color: 'from-cyan-700 to-slate-900',
      badge: 'SYSADMIN',
      moduleCode: 'evasion_mysql',
      svgIconContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>`,
    },
  ];

  const [dashLayoutMode, setDashLayoutMode] = useState<'grid4' | 'grid2' | 'focus'>('grid4');
  const [dashFocusPlugin, setDashFocusPlugin] = useState<string>('submissions');
  const [dashSlots, setDashSlots] = useState<string[]>(['submissions', 'crm', 'chatbot', 'newsletter']);

  const buildPluginUrl = (pluginId: string, headerType: '0' | 'compact' = brandingForm.headerMode === '0' ? '0' : 'compact') => {
    const cleanDomain = (brandingForm.intranetDomain || 'https://intranet.evasionsoleil.com').trim().replace(/\/+$/, '');
    const cleanBase = brandingForm.appBaseUrl
      ? brandingForm.appBaseUrl.trim().replace(/\/+$/, '')
      : `${cleanDomain}/index.php/apps/evasionsoleil/app`;
    const params = new URLSearchParams();
    params.set('nextcloud', '1');
    params.set('plugin', pluginId);
    params.set('header', headerType);
    if (brandingForm.ssoAutoLoginUser && brandingForm.ssoAutoLoginUser !== 'none') {
      params.set('nc_user', brandingForm.ssoAutoLoginUser);
    }
    return `${cleanBase}?${params.toString()}#${pluginId}`;
  };

  const buildLocalPreviewUrl = (pluginId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/?nextcloud=1&plugin=${encodeURIComponent(pluginId)}&header=0#${encodeURIComponent(pluginId)}`;
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    try {
      await onUpdateCustomBranding(brandingForm);
      setSaveToast('✅ Personnalisation enregistrée et appliquée à 100% !');
      setTimeout(() => setSaveToast(null), 3500);
    } catch (err: any) {
      alert('Erreur lors de la sauvegarde : ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Le logo ne doit pas dépasser 2 Mo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBrandingForm((prev) => ({
        ...prev,
        logoUrl: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadSvgIcon = (plugin: PluginDefinition) => {
    const blob = new Blob([plugin.svgIconContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nextcloud-icon-${plugin.id}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const pendingSubmissions = submissions.filter((s: any) => s.callStatus === 'non_appele' || !s.callStatus);
  const inProgressSubmissions = submissions.filter((s: any) => s.callStatus === 'appele_en_attente');
  const bookedSubmissions = submissions.filter((s: any) => s.callStatus === 'reserve');

  // Widget HTML adapted code
  const widgetHtmlCode = `<!-- ============================================================================== -->
<!-- WIDGET TABLEAU DE BORD NEXTCLOUD - ÉVASION SOLEIL (${brandingForm.intranetDomain}) -->
<!-- À coller dans Nextcloud Dashboard Cards, External Sites Widget ou HTML Widget -->
<!-- ============================================================================== -->
<div style="width:100%;min-height:${brandingForm.widgetHeightPx}px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);font-family:system-ui,-apple-system,sans-serif;">
  <div style="background:${brandingForm.primaryColor};color:#ffffff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:10px;">
      ${brandingForm.logoUrl ? `<img src="${brandingForm.logoUrl}" style="height:28px;object-fit:contain;" alt="Logo" />` : `<span style="font-size:18px;">☀️</span>`}
      <div>
        <div style="font-weight:900;font-size:14px;letter-spacing:-0.2px;">${brandingForm.brandTitle}</div>
        <div style="font-size:10px;opacity:0.85;">Intranet Collaborateurs &bull; ${brandingForm.intranetDomain.replace('https://', '')}</div>
      </div>
    </div>
    <a href="${buildPluginUrl('submissions', 'compact')}" target="_blank" style="background:rgba(255,255,255,0.2);color:#ffffff;text-decoration:none;font-size:11px;font-weight:bold;padding:5px 10px;border-radius:20px;">
      Ouvrir en plein écran &rarr;
    </a>
  </div>
  <iframe
    src="${buildPluginUrl('submissions', '0')}"
    style="width:100%;height:${brandingForm.widgetHeightPx}px;border:0;display:block;"
    allow="clipboard-write; notifications; microphone"
    loading="lazy">
  </iframe>
</div>`;

  return (
    <div className="space-y-6">
      {/* Top Banner with Intranet Header & Navigation */}
      <div
        className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, ${brandingForm.primaryColor} 0%, #0f2b38 100%)`,
        }}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-black uppercase tracking-wider">
              <Globe className="h-4 w-4 text-sky-300" />
              <span>Intranet Nextcloud Dédié : {brandingForm.intranetDomain}</span>
            </div>

            <div className="flex items-center gap-3">
              {brandingForm.logoUrl && brandingForm.logoMode !== 'text_only' ? (
                <img
                  src={brandingForm.logoUrl}
                  alt="Logo Personnalisé"
                  className="rounded-xl object-contain bg-white/10 p-1 backdrop-blur-xs"
                  style={{ height: `${brandingForm.logoHeightPx || 40}px` }}
                />
              ) : (
                <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl shadow-xs">
                  ☀️
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {brandingForm.brandTitle || 'Voyages Évasion Soleil'}
                </h1>
                <p className="text-xs sm:text-sm text-sky-100/90 font-medium">
                  {brandingForm.brandSubtitle || 'Dashboard Intranet & CRM Collaborateurs'}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-sky-100/80 leading-relaxed pt-1">
              Tous vos outils sont maintenant convertis en <strong>plugins maison</strong> adaptés spécialement pour le <strong>Dashboard de Nextcloud</strong> sur <code>{brandingForm.intranetDomain}</code>. Vous pouvez personnaliser le logo et l'affichage à 100 % !
            </p>
          </div>

          {/* Quick Actions & Live Mode Toggle */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 shrink-0 lg:w-96 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-sky-200">
                État d'Intégration Nextcloud
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                  isNextcloudMode ? 'bg-emerald-400 text-slate-950' : 'bg-white/20 text-white'
                }`}
              >
                {isNextcloudMode ? 'MODE INTRANET ACTIF' : 'MODE CLASSIQUE'}
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onToggleNextcloudMode(true, 'hidden', 'submissions')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-sky-50 font-black text-xs shadow-md transition-all cursor-pointer"
              >
                <Maximize2 className="h-4 w-4 text-[#0082c9]" />
                <span>Tester en Mode Dashboard Nextcloud (0% Barre)</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleNextcloudMode(true, 'compact', 'submissions')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-sky-500/30 hover:bg-sky-500/50 text-white border border-white/20 font-bold text-xs transition-all cursor-pointer"
              >
                <Layers className="h-4 w-4" />
                <span>Tester avec Barre Intranet Compacte</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Subtabs : Personnalisation 100%, Simulateur, Plugins Maison, Codes HTML */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveMainSubTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
            activeMainSubTab === 'branding'
              ? 'bg-[#0082c9] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>1. Personnalisation 100% Logo & Thème</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainSubTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
            activeMainSubTab === 'simulator'
              ? 'bg-[#0082c9] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Monitor className="h-4 w-4" />
          <span>2. Simulateur Live Nextcloud (intranet.evasionsoleil.com)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainSubTab('plugins')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
            activeMainSubTab === 'plugins'
              ? 'bg-[#0082c9] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Cloud className="h-4 w-4" />
          <span>3. Mes Plugins Maison (Catalogue & Liens)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainSubTab('html_code')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
            activeMainSubTab === 'html_code'
              ? 'bg-[#0082c9] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>4. Codes HTML & PHP Adaptés pour Nextcloud</span>
        </button>
      </div>

      {/* SUBTAB 1: PERSONNALISATION 100% LOGO, AFFICHAGE & THÈMES */}
      {activeMainSubTab === 'branding' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Palette className="h-5 w-5 text-[#0082c9]" />
                  <span>Personnalisez le Logo, les Titres & les Couleurs pour Nextcloud</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Modifiez votre logo, la hauteur d'affichage, le nom de l'agence et les couleurs pour que le résultat dans Nextcloud soit 100 % à votre image.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveBranding}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer shrink-0"
              >
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les personnalisations'}</span>
              </button>
            </div>

            {saveToast && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{saveToast}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Form Controls */}
              <div className="space-y-5">
                {/* 1. Logo Configuration */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-[#0082c9]" />
                    <span>Logo de l'Intranet Évasion Soleil</span>
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      URL directe de votre logo :
                    </label>
                    <input
                      type="text"
                      value={brandingForm.logoUrl || ''}
                      onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                      placeholder="https://evasionsoleil.com/logo.png ou /icon.svg"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0082c9]"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-semibold">Ou téléverser un fichier :</span>
                    <label className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs">
                      <span>Choisir un fichier image</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {brandingForm.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setBrandingForm({ ...brandingForm, logoUrl: '' })}
                        className="text-xs text-rose-600 hover:underline font-bold"
                      >
                        Réinitialiser au logo soleil
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Mode d'affichage du logo :
                      </label>
                      <select
                        value={brandingForm.logoMode}
                        onChange={(e) => setBrandingForm({ ...brandingForm, logoMode: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                      >
                        <option value="logo_and_text">Logo + Titre de l'agence</option>
                        <option value="logo_only">Logo uniquement</option>
                        <option value="text_only">Titre texte uniquement</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Hauteur du logo ({brandingForm.logoHeightPx}px) :
                      </label>
                      <input
                        type="range"
                        min="24"
                        max="80"
                        step="2"
                        value={brandingForm.logoHeightPx || 40}
                        onChange={(e) => setBrandingForm({ ...brandingForm, logoHeightPx: Number(e.target.value) })}
                        className="w-full accent-[#0082c9] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Brand Titles & Domains */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Type className="h-4 w-4 text-[#0082c9]" />
                    <span>Identité & Domaines</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nom de marque affiché :
                      </label>
                      <input
                        type="text"
                        value={brandingForm.brandTitle}
                        onChange={(e) => setBrandingForm({ ...brandingForm, brandTitle: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                        placeholder="Voyages Évasion Soleil"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Sous-titre / Slogan :
                      </label>
                      <input
                        type="text"
                        value={brandingForm.brandSubtitle}
                        onChange={(e) => setBrandingForm({ ...brandingForm, brandSubtitle: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                        placeholder="Dashboard Intranet & CRM Collaborateurs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Domaine Intranet Nextcloud :
                    </label>
                    <input
                      type="text"
                      value={brandingForm.intranetDomain}
                      onChange={(e) => setBrandingForm({ ...brandingForm, intranetDomain: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold font-mono text-[#0082c9] bg-white"
                      placeholder="https://intranet.evasionsoleil.com"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Votre serveur Nextcloud cible (ex: <code>https://intranet.evasionsoleil.com</code>).
                    </p>
                  </div>
                </div>

                {/* 3. Theme Colors */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-[#0082c9]" />
                    <span>Couleur de Thème Principale</span>
                  </h3>

                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandingForm.primaryColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      className="h-10 w-12 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={brandingForm.primaryColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      className="w-32 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white"
                    />

                    {/* Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { label: 'Nextcloud', color: '#0082c9' },
                        { label: 'Évasion Teal', color: '#338b84' },
                        { label: 'Indigo', color: '#4338ca' },
                        { label: 'Dark Navy', color: '#0f172a' },
                      ].map((preset) => (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => setBrandingForm({ ...brandingForm, primaryColor: preset.color })}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold text-white cursor-pointer shadow-2xs"
                          style={{ backgroundColor: preset.color }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Mockup Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Aperçu Live de Votre En-tête Nextcloud
                  </h3>
                  <span className="text-[11px] text-emerald-600 font-bold">● Réactif en direct</span>
                </div>

                {/* Simulated Nextcloud Top Bar */}
                <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-lg bg-slate-100">
                  <div
                    className="h-12 px-4 flex items-center justify-between text-white transition-colors duration-300"
                    style={{ backgroundColor: brandingForm.primaryColor }}
                  >
                    <div className="flex items-center gap-3">
                      {brandingForm.logoUrl && brandingForm.logoMode !== 'text_only' ? (
                        <img
                          src={brandingForm.logoUrl}
                          alt="Logo Preview"
                          style={{ height: `${Math.min(brandingForm.logoHeightPx, 32)}px` }}
                          className="object-contain"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                          ☀️
                        </div>
                      )}

                      {brandingForm.logoMode !== 'logo_only' && (
                        <div>
                          <div className="font-extrabold text-xs tracking-tight leading-none">
                            {brandingForm.brandTitle}
                          </div>
                          <div className="text-[9px] opacity-80 leading-tight">
                            {brandingForm.brandSubtitle}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 text-[11px] font-bold">
                        <Inbox className="h-3.5 w-3.5" />
                        <span>Soumissions</span>
                      </div>
                      <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 text-[11px] font-bold">
                        <Contact className="h-3.5 w-3.5" />
                        <span>CRM</span>
                      </div>
                      <div className="h-7 w-7 rounded-full bg-white/30 flex items-center justify-center font-bold text-[11px]">
                        AD
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white space-y-3">
                    <div className="text-xs font-bold text-slate-700">
                      Rendu de vos composants avec le thème choisi :
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Bouton d'Action</div>
                        <button
                          type="button"
                          className="w-full py-1.5 rounded-lg text-white font-bold text-xs"
                          style={{ backgroundColor: brandingForm.primaryColor }}
                        >
                          Nouvelle Soumission
                        </button>
                      </div>

                      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Pastille de Statut</div>
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold text-white"
                          style={{ backgroundColor: brandingForm.primaryColor }}
                        >
                          100% Personnalisé
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-xs text-sky-900 leading-relaxed">
                  <strong>💡 Remarque Importante :</strong> Dès que vous cliquez sur <em>« Enregistrer les personnalisations »</em>, vos modifications s'appliquent immédiatement à tous les plugins, au formulaire de devis, à la barre Nextcloud et aux widgets !
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: SIMULATEUR LIVE NEXTCLOUD INTRANET (DASHBOARD & WIDGETS) */}
      {activeMainSubTab === 'simulator' && (
        <div className="space-y-4">
          {/* Controls Bar for Simulator */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Vue du simulateur :</span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedSimulatorView('dashboard_widgets')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    selectedSimulatorView === 'dashboard_widgets'
                      ? 'bg-[#0082c9] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tableau de Bord Nextcloud (Widgets)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSimulatorView('full_app')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    selectedSimulatorView === 'full_app'
                      ? 'bg-[#0082c9] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Application Complète dans Nextcloud
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              {brandingForm.intranetDomain}
              {selectedSimulatorView === 'dashboard_widgets' ? '/apps/dashboard/' : '/apps/evasionsoleil/'}
            </div>
          </div>

          {/* Browser Frame Window */}
          <div className="border border-slate-300 rounded-3xl overflow-hidden shadow-2xl bg-slate-100">
            {/* Browser Header Bar */}
            <div className="bg-slate-800 text-slate-300 px-4 py-2 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
                <span className="h-3 w-3 rounded-full bg-amber-500 inline-block" />
                <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
              </div>

              <div className="flex items-center gap-2 bg-slate-900 px-4 py-1 rounded-lg text-xs font-mono text-slate-200 border border-slate-700 max-w-md w-full justify-center truncate">
                <Globe className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>
                  {brandingForm.intranetDomain}
                  {selectedSimulatorView === 'dashboard_widgets' ? '/apps/dashboard/' : '/apps/evasionsoleil/'}
                </span>
              </div>

              <div className="text-[11px] font-bold text-slate-400 hidden sm:block">Nextcloud 30 Intranet</div>
            </div>

            {/* Simulated Nextcloud Top Navbar */}
            <div
              className="h-12 px-4 flex items-center justify-between text-white"
              style={{ backgroundColor: brandingForm.primaryColor }}
            >
              <div className="flex items-center gap-4">
                {brandingForm.logoUrl && brandingForm.logoMode !== 'text_only' ? (
                  <img
                    src={brandingForm.logoUrl}
                    alt="Logo"
                    style={{ height: `${Math.min(brandingForm.logoHeightPx, 32)}px` }}
                    className="object-contain"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                    ☀️
                  </div>
                )}

                {/* Nextcloud Native Apps Menu */}
                <div className="flex items-center gap-1 overflow-x-auto">
                  <span className="px-2.5 py-1 rounded-lg bg-white/20 text-xs font-bold flex items-center gap-1">
                    <Cloud className="h-3.5 w-3.5" />
                    <span>Fichiers</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-white/80 hover:bg-white/10 text-xs font-medium cursor-pointer">
                    Photos
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-white/80 hover:bg-white/10 text-xs font-medium cursor-pointer">
                    Activité
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white text-slate-900 text-xs font-black shadow-xs flex items-center gap-1">
                    <Inbox className="h-3.5 w-3.5 text-[#0082c9]" />
                    <span>Soumissions & CRM</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white/90 hidden md:inline">
                  {currentUser?.name || 'Administrateur'}
                </span>
                <div className="h-8 w-8 rounded-xl bg-white/25 flex items-center justify-center font-bold text-xs ring-1 ring-white/40">
                  {currentUser?.name?.charAt(0) || 'A'}
                </div>
              </div>
            </div>

            {/* Simulated Body: Nextcloud Dashboard with Widgets */}
            {selectedSimulatorView === 'dashboard_widgets' ? (
              <div className="p-4 sm:p-6 space-y-6 bg-slate-100 min-h-[500px]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Tableau de bord Nextcloud &bull; Widgets Évasion Soleil
                    </h3>
                    <p className="text-xs text-slate-500">
                      Voici exactement comment vos conseillers voient et gèrent les demandes directement depuis la page d'accueil de Nextcloud.
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🟢 Données en direct synchronisées
                  </span>
                </div>

                {/* Grid of Interactive Nextcloud Dashboard Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* WIDGET 1: SOUMISSIONS & RAPPELS URGENTS */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                            <PhoneCall className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">Soumissions & Rappels</h4>
                            <span className="text-[10px] text-slate-400 font-semibold">Priorité clientèle</span>
                          </div>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 animate-pulse">
                          {pendingSubmissions.length} à rappeler
                        </span>
                      </div>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2">
                          <div className="text-lg font-black text-amber-700">{pendingSubmissions.length}</div>
                          <div className="text-[10px] font-bold text-amber-800">Non appelé</div>
                        </div>
                        <div className="bg-sky-50 border border-sky-200 rounded-xl p-2">
                          <div className="text-lg font-black text-sky-700">{inProgressSubmissions.length}</div>
                          <div className="text-[10px] font-bold text-sky-800">En attente</div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2">
                          <div className="text-lg font-black text-emerald-700">{bookedSubmissions.length}</div>
                          <div className="text-[10px] font-bold text-emerald-800">Réservé</div>
                        </div>
                      </div>

                      {/* Recent client list */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-bold text-slate-500">Demandes récentes :</div>
                        {submissions.slice(0, 3).map((sub: any) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                          >
                            <div>
                              <div className="font-extrabold text-slate-800">
                                {sub.customerFirstName} {sub.customerLastName}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">{sub.destination}</div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                sub.callStatus === 'reserve'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : sub.callStatus === 'appele_en_attente'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {sub.callStatus === 'reserve'
                                ? 'Réservé'
                                : sub.callStatus === 'appele_en_attente'
                                ? 'Appelé'
                                : 'À rappeler'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenPluginTab('submissions')}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0082c9] text-white text-xs font-black hover:bg-[#006aa3] transition-all cursor-pointer"
                    >
                      <span>Ouvrir tout le pipeline des soumissions</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* WIDGET 2: CONSEILLÈRE VIRTUELLE MARTINE V. IA */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black">
                            <Bot className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">Martine V. (IA)</h4>
                            <span className="text-[10px] text-slate-400 font-semibold">Conseillère virtuelle</span>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                            chatbotSettings?.botEnabled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {chatbotSettings?.botEnabled ? '🟢 EN SERVICE' : '🔴 ARRÊTÉE'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed bg-teal-50/60 p-2.5 rounded-xl border border-teal-100">
                        {chatbotSettings?.botEnabled
                          ? 'Martine répond 24/7 aux voyageurs, qualifie leurs forfaits et vous envoie les rappels par courriel.'
                          : 'Martine est actuellement éteinte. Vos conseillers humains prennent tous les messages.'}
                      </p>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-xs font-bold text-slate-700">Interrupteur direct :</span>
                        <button
                          type="button"
                          onClick={onToggleMartine}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black text-white cursor-pointer transition-all shadow-xs ${
                            chatbotSettings?.botEnabled ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          <span>{chatbotSettings?.botEnabled ? 'Arrêter Martine' : 'Activer Martine'}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenPluginTab('chatbot')}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <span>Historique & Réglages de Martine</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* WIDGET 3: CRM FACTURES & CONTRATS LÉGAUX */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">CRM & Facturation</h4>
                            <span className="text-[10px] text-slate-400 font-semibold">Contrats & Paiements</span>
                          </div>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800">
                          Actif
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5">
                          <div className="text-sm font-black text-indigo-900">PDF & Paiements</div>
                          <div className="text-[10px] text-indigo-700 font-bold">Factures Proforma</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                          <div className="text-sm font-black text-slate-900">Signatures eID</div>
                          <div className="text-[10px] text-slate-500 font-bold">Contrats Voyages</div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">
                        Générez vos factures certifiées avec carte de crédit et envoyez des contrats de voyage à faire signer électroniquement par vos clients.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenPluginTab('crm')}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-all cursor-pointer"
                    >
                      <span>Accéder au CRM & Factures</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* COCKPIT MULTI-PLUGINS INTERACTIF EN DIRECT SUR LE DASHBOARD NEXTCLOUD */}
                <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#338b84] to-[#0082c9] flex items-center justify-center text-lg shadow-md">
                        ☀️
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">
                          Cockpit Multi-Plugins Interactif — Directement sur /index.php/apps/dashboard/
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Interagissez avec vos plugins directement sur le Tableau de bord Nextcloud (Grille 4 plugins, Côte-à-côte ou Plein-Dashboard)
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDashLayoutMode('grid4')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          dashLayoutMode === 'grid4'
                            ? 'bg-gradient-to-r from-[#0082c9] to-[#338b84] text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        🧩 Grille 4 Plugins (2x2)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDashLayoutMode('grid2')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          dashLayoutMode === 'grid2'
                            ? 'bg-gradient-to-r from-[#0082c9] to-[#338b84] text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        ⚡ Côte-à-côte (2 Plugins)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDashLayoutMode('focus')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          dashLayoutMode === 'focus'
                            ? 'bg-gradient-to-r from-[#0082c9] to-[#338b84] text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        🖥️ Mode Plein-Dashboard (1 Plugin)
                      </button>
                    </div>
                  </div>

                  {dashLayoutMode === 'focus' ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {plugins.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setDashFocusPlugin(p.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              dashFocusPlugin === p.id
                                ? 'bg-[#0082c9] text-white shadow-xs'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {p.shortName}
                          </button>
                        ))}
                      </div>
                      <div className="bg-white rounded-xl overflow-hidden border border-slate-700">
                        <iframe
                          src={buildLocalPreviewUrl(dashFocusPlugin)}
                          className="w-full h-[640px] border-0 block bg-slate-50"
                          title={`Dashboard Nextcloud - ${dashFocusPlugin}`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {dashSlots.slice(0, dashLayoutMode === 'grid2' ? 2 : 4).map((slotPluginId, idx) => (
                        <div key={idx} className="bg-white rounded-xl overflow-hidden border border-slate-700 flex flex-col">
                          <div className="bg-slate-950 text-white px-3 py-2 flex items-center justify-between gap-2">
                            <select
                              value={slotPluginId}
                              onChange={(e) => {
                                const next = [...dashSlots];
                                next[idx] = e.target.value;
                                setDashSlots(next);
                              }}
                              className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 cursor-pointer"
                            >
                              {plugins.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.shortName}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setDashFocusPlugin(slotPluginId);
                                  setDashLayoutMode('focus');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-[#0082c9] text-[11px] font-bold text-slate-200 cursor-pointer"
                              >
                                Agrandir ici
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenPluginTab(slotPluginId)}
                                className="px-2.5 py-1 rounded-lg bg-[#0082c9] hover:bg-[#006aa3] text-[11px] font-bold text-white cursor-pointer"
                              >
                                Pleine page ↗
                              </button>
                            </div>
                          </div>
                          <iframe
                            src={buildLocalPreviewUrl(slotPluginId)}
                            className="w-full h-[460px] border-0 block bg-slate-50"
                            title={`Slot ${idx + 1} - ${slotPluginId}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Simulated Full App Embed */
              <div className="bg-white min-h-[600px] flex flex-col">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-extrabold text-slate-800">
                      Application Complète Évasion Soleil intégrée à 100% dans Nextcloud
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleNextcloudMode(true, 'compact')}
                    className="text-xs text-[#0082c9] font-bold hover:underline"
                  >
                    Ouvrir maintenant sur votre écran &rarr;
                  </button>
                </div>
                <div className="p-6 text-center space-y-4 my-auto">
                  <div className="h-16 w-16 rounded-3xl bg-sky-100 text-[#0082c9] flex items-center justify-center mx-auto">
                    <Cloud className="h-8 w-8" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">
                    L'ensemble de votre Dashboard fonctionne sans restriction
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Toutes les fenêtres (Soumissions, CRM, Devis, Infolettre, Stats, Chat d'équipe) s'affichent directement à l'intérieur de Nextcloud sans quitter votre portail.
                  </p>
                  <button
                    type="button"
                    onClick={() => onToggleNextcloudMode(true, 'hidden', 'submissions')}
                    className="px-6 py-2.5 rounded-xl bg-[#0082c9] hover:bg-[#006aa3] text-white font-black text-xs shadow-md transition-all cursor-pointer"
                  >
                    Basculer tout de suite en mode Nextcloud
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: CATALOGUE DES PLUGINS MAISON */}
      {activeMainSubTab === 'plugins' && (
        <div className="space-y-6">
          {/* GitHub 1-Command Auto-Deploy Card for Nextcloud Snap & Standard on intranet.evasionsoleil.com */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-lg space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black uppercase tracking-wider border border-emerald-500/30">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Compatible 100% Nextcloud Snap (/var/snap/nextcloud/...) + Dashboard Interactif</span>
                </div>
                <h3 className="text-lg font-black text-white">
                  Activez le Dashboard Multi-Plugins Interactif + Corrigez l'écran blanc sur Nextcloud Snap
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  Le script <strong><code>install-github-nextcloud.sh</code></strong> détecte automatiquement votre <strong>Nextcloud Snap</strong> (<code>/var/snap/nextcloud/current/nextcloud/extra-apps</code> &amp; <code>nextcloud.occ</code>), installe la <strong>Passerelle PHP Native</strong>, répare vos liens <code>/apps/external/</code>, et injecte le <strong>Dashboard Multi-Plugins Interactif (Grille 4 plugins 2x2)</strong> directement sur <code>https://intranet.evasionsoleil.com/index.php/apps/dashboard/</code> !
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    'cd /opt/evasion-intranet && sudo git pull && sudo bash install-github-nextcloud.sh',
                    'github_cmd'
                  )
                }
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-all cursor-pointer shrink-0"
              >
                {copiedId === 'github_cmd' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedId === 'github_cmd' ? 'Commande copiée !' : 'Copier la commande SSH Snap'}</span>
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 font-mono text-xs text-emerald-400 overflow-x-auto select-all">
              cd /opt/evasion-intranet &amp;&amp; sudo git pull &amp;&amp; sudo bash install-github-nextcloud.sh
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-[#0082c9]" />
                  <span>Vos 9 Plugins Maison Dédiés pour Nextcloud</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Chaque module possède son propre plugin indépendant. Vous pouvez ajouter un bouton dédié dans la barre supérieure de Nextcloud pour chaque outil ou pour l'application globale.
                </p>
              </div>

              <a
                href={`/api/nextcloud/install-script.sh?base_url=${encodeURIComponent(baseUrl)}&intranet_domain=${encodeURIComponent(brandingForm.intranetDomain)}`}
                download="install-nextcloud-intranet.sh"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-all cursor-pointer shrink-0"
              >
                <Download className="h-4 w-4" />
                <span>Télécharger le script d'installation SSH (.sh)</span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {plugins.map((plugin) => {
                const Icon = plugin.icon;
                const pluginUrl = buildPluginUrl(plugin.id);
                const isCopied = copiedId === plugin.id;

                return (
                  <div
                    key={plugin.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${plugin.color} text-white flex items-center justify-center shadow-sm shrink-0`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-sm font-black text-slate-900">{plugin.shortName}</h3>
                              {plugin.badge && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-[#0082c9]">
                                  {plugin.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                              Plugin: <code>{plugin.moduleCode}</code>
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{plugin.description}</p>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Lien direct pour Nextcloud :
                        </div>
                        <div className="text-[11px] font-mono text-slate-700 truncate select-all">{pluginUrl}</div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(pluginUrl, plugin.id)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            isCopied ? 'bg-emerald-600 text-white' : 'bg-[#0082c9] hover:bg-[#006aa3] text-white shadow-2xs'
                          }`}
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{isCopied ? 'Copié !' : 'Copier le lien'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onToggleNextcloudMode(true, brandingForm.headerMode === '0' ? 'hidden' : 'compact', plugin.id);
                            onOpenPluginTab(plugin.id);
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Tester seul</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadSvgIcon(plugin)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-slate-500" />
                        <span>Télécharger l'icône SVG pour Nextcloud</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: CODES HTML & PHP ADAPTÉS POUR NEXTCLOUD */}
      {activeMainSubTab === 'html_code' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-[#0082c9]" />
                  <span>Codes HTML & Fichiers PHP Prêts pour le Dashboard Nextcloud</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Voici le code HTML adapté pour être collé directement dans le dashboard de Nextcloud ({brandingForm.intranetDomain}) ainsi que les fichiers PHP du plugin maison.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(widgetHtmlCode, 'widget_html')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0082c9] hover:bg-[#006aa3] text-white font-black text-xs shadow-md transition-all cursor-pointer shrink-0"
              >
                {copiedId === 'widget_html' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedId === 'widget_html' ? 'Code HTML Copié !' : 'Copier le Code HTML du Widget'}</span>
              </button>
            </div>

            {/* Code Block 1: HTML Embed Widget */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  1. Code HTML du Widget pour le Dashboard Nextcloud
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Compatible iframe &amp; Dashboard Cards</span>
              </div>
              <div className="bg-slate-950 text-slate-100 rounded-2xl p-4 font-mono text-xs overflow-x-auto max-h-72 border border-slate-800">
                <pre>{widgetHtmlCode}</pre>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Comment installer les widgets et plugins sur {brandingForm.intranetDomain} :
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="h-6 w-6 rounded-full bg-[#0082c9] text-white font-black text-xs flex items-center justify-center">
                    1
                  </div>
                  <div className="font-black text-xs text-slate-900">Activer les Applications</div>
                  <p className="text-[11px] text-slate-500">
                    Dans votre Nextcloud (avatar en haut à droite &rarr; <em>Applications</em>), assurez-vous que <strong>External sites</strong> et <strong>Dashboard</strong> sont activés.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="h-6 w-6 rounded-full bg-[#0082c9] text-white font-black text-xs flex items-center justify-center">
                    2
                  </div>
                  <div className="font-black text-xs text-slate-900">Ajouter les Sites Externes</div>
                  <p className="text-[11px] text-slate-500">
                    Allez dans <em>Paramètres d'administration &rarr; Sites externes</em>, collez les liens de chaque plugin et cochez <em>« Dans un cadre (iframe) »</em>.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="h-6 w-6 rounded-full bg-[#0082c9] text-white font-black text-xs flex items-center justify-center">
                    3
                  </div>
                  <div className="font-black text-xs text-slate-900">Ou Script Automatique SSH</div>
                  <p className="text-[11px] text-slate-500">
                    Exécutez <code>sudo bash install-nextcloud-intranet.sh /var/www/nextcloud</code> pour que Nextcloud crée automatiquement l'app native dans <code>custom_apps/evasionsoleil</code> !
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
