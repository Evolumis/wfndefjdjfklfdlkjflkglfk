import React, { useState } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  Check,
  Save,
  Copy,
  Eye,
  FileCode,
  ShieldCheck,
  Image,
  Building,
  Ship,
  Utensils,
  AlertTriangle,
  CreditCard,
  Phone,
  Mail,
  Compass,
  MapPin,
  Clock,
  Sparkles,
  DollarSign,
  Layers,
  Sun,
  Smile,
  Plane,
  Car,
  Star,
  Flame,
  Palmtree,
  PlaneTakeoff,
  ExternalLink,
} from 'lucide-react';
import { FormConfig, User, ServiceType } from '../types';

interface QuoteFormEditorProps {
  formConfig: FormConfig;
  onSaveConfig: (newConfig: Partial<FormConfig>) => Promise<void>;
  onOpenPreview: () => void;
  currentUser?: User;
  initialSubTab?: 'branding' | 'options' | 'tabs_content' | 'insurance' | 'embed_code';
}

export const QuoteFormEditor: React.FC<QuoteFormEditorProps> = ({
  formConfig,
  onSaveConfig,
  onOpenPreview,
  currentUser,
  initialSubTab = 'branding',
}) => {
  const [localConfig, setLocalConfig] = useState<FormConfig>(formConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'branding' | 'options' | 'tabs_content' | 'insurance' | 'embed_code'>(initialSubTab);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [embedVariant, setEmbedVariant] = useState<'fullpage' | 'homepage'>('fullpage');

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Security check: HTML embed integration is accessible to Admins & Form Editors
  const isSuperAdmin = Boolean(
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'directeur' ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    currentUser?.permissions?.canEditForm
  );

  // New item input states
  const [newCity, setNewCity] = useState('');
  const [newDest, setNewDest] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newHotelCat, setNewHotelCat] = useState('');
  const [newMealPlan, setNewMealPlan] = useState('');
  const [newCabin, setNewCabin] = useState('');
  const [newLine, setNewLine] = useState('');
  const [newAllInclusiveFlightClass, setNewAllInclusiveFlightClass] = useState('');
  const [newVolHotelFlightClass, setNewVolHotelFlightClass] = useState('');
  const [newVolHotelHotelCat, setNewVolHotelHotelCat] = useState('');
  const [newInsuranceType, setNewInsuranceType] = useState('');
  const [newBudget, setNewBudget] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveConfig(localConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Generic helpers for array field management
  const addToArray = <K extends keyof FormConfig>(
    key: K,
    value: string,
    clearInput: () => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = (localConfig[key] as unknown as string[]) || [];
    if (!current.includes(trimmed)) {
      setLocalConfig({
        ...localConfig,
        [key]: [...current, trimmed],
      });
      clearInput();
    }
  };

  const removeFromArray = <K extends keyof FormConfig>(key: K, value: string) => {
    const current = (localConfig[key] as unknown as string[]) || [];
    setLocalConfig({
      ...localConfig,
      [key]: current.filter((item) => item !== value),
    });
  };

  // Helper to update one of the 5 services (title, subtitle, badge, header description)
  const updateServiceDetail = (
    id: ServiceType,
    updates: { title?: string; subtitle?: string; badge?: string; description?: string }
  ) => {
    const currentServices = [...(localConfig.services || [])];
    const index = currentServices.findIndex((s) => s.id === id);
    if (index >= 0) {
      currentServices[index] = {
        ...currentServices[index],
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.subtitle !== undefined ? { subtitle: updates.subtitle } : {}),
        ...(updates.badge !== undefined ? { badge: updates.badge } : {}),
      };
    } else {
      currentServices.push({
        id,
        title: updates.title || '',
        subtitle: updates.subtitle || '',
        icon: '',
        enabled: true,
        badge: updates.badge,
      });
    }

    setLocalConfig({
      ...localConfig,
      services: currentServices,
      tabTitles: {
        ...localConfig.tabTitles,
        ...(updates.title !== undefined ? { [id]: updates.title } : {}),
      },
      tabDescriptions: {
        ...localConfig.tabDescriptions,
        ...(updates.description !== undefined ? { [id]: updates.description } : {}),
      },
    });
  };

  const getServiceConfigValues = (
    id: ServiceType,
    defaultTitle: string,
    defaultSubtitle: string,
    defaultBadge: string,
    defaultDesc: string
  ) => {
    const srv = localConfig.services?.find((s) => s.id === id);
    return {
      title: localConfig.tabTitles?.[id] || srv?.title || defaultTitle,
      subtitle: srv?.subtitle || defaultSubtitle,
      badge: srv?.badge !== undefined ? srv.badge : defaultBadge,
      description: localConfig.tabDescriptions?.[id] || defaultDesc,
    };
  };

  const detectedOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://evasionsoleil.com';
  const effectiveBaseUrl = customDomain.trim() ? customDomain.trim().replace(/\/$/, '') : detectedOrigin;
  const targetEmbedUrl = `${effectiveBaseUrl}/soumission?layout=home`;

  const currentEmbedCode = `<!-- ========================================================================= -->
<!-- INTÉGRATION DEVIS PAGE D'ACCUEIL - VOYAGES ÉVASION SOLEIL                 -->
<!-- Largeur étendue (1440px max), 100% adaptatif tout appareil (Mobile/PC)    -->
<!-- Fond 100% invisible (transparent) et hauteur auto-ajustée sans ascenseur  -->
<!-- ========================================================================= -->
<div id="evasion-soumission-home-widget" style="width:100%;max-width:1440px;margin:0 auto;padding:0;position:relative;background:transparent;">
  <iframe
    id="evasion-soumission-home-frame"
    src="${targetEmbedUrl}"
    allowtransparency="true"
    scrolling="no"
    style="width:100%;min-height:580px;border:none;background:transparent;display:block;overflow:hidden;"
    title="Demande de Devis Voyage - Voyages Évasion Soleil"
    loading="lazy"
    allow="clipboard-write">
  </iframe>
</div>
<script>
  window.addEventListener('message', function(e) {
    if (e.data && (e.data.type === 'EVASION_SOUMISSION_RESIZE' || e.data.type === 'EVASION_RESIZE_IFRAME') && e.data.height) {
      var frame = document.getElementById('evasion-soumission-home-frame') || document.getElementById('evasion-soumission-frame') || document.querySelector('iframe[src*="/soumission"], iframe[src*="/devis"]');
      if (frame) frame.style.height = (e.data.height + 8) + 'px';
    }
  });
</script>`;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-500" />
            <span>Gestion Intégrale du Formulaire de Devis</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Personnalisez absolument tous les éléments : logo, coordonnées, destinations, cabines, assurances et textes légaux.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenPreview}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            <Eye className="h-4 w-4 text-amber-600" />
            <span>Tester le formulaire</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white text-xs shadow-sm transition-colors cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Enregistrement...' : 'Sauvegarder tout'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 shadow-2xs">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>Formulaire mis à jour et synchronisé avec succès ! Toutes les modifications sont en direct.</span>
        </div>
      )}

      {/* Sub Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-2 pt-2 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('branding')}
          className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            activeSubTab === 'branding'
              ? 'border-amber-500 text-amber-700 bg-amber-50/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Image className="h-4 w-4 text-amber-600" />
          <span>Logo & Identité Visuelle</span>
        </button>

        <button
          onClick={() => setActiveSubTab('options')}
          className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            activeSubTab === 'options'
              ? 'border-amber-500 text-amber-700 bg-amber-50/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Compass className="h-4 w-4 text-sky-600" />
          <span>Destinations, Hôtels & Croisières</span>
        </button>

        <button
          onClick={() => setActiveSubTab('tabs_content')}
          className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            activeSubTab === 'tabs_content'
              ? 'border-amber-500 text-amber-700 bg-amber-50/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="h-4 w-4 text-[#0e7068]" />
          <span>Services & Textes (5 Choix)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('insurance')}
          className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            activeSubTab === 'insurance'
              ? 'border-amber-500 text-amber-700 bg-amber-50/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Assurances, Avis 48h & Financement</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveSubTab('embed_code')}
            className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'embed_code'
                ? 'border-amber-500 text-amber-700 bg-amber-50/40 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="h-4 w-4 text-indigo-600" />
            <span>Code d'Intégration HTML</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">
              SUPER ADMIN
            </span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BRANDING & LOGO */}
      {/* ========================================================================= */}
      {activeSubTab === 'branding' && (
        <div className="bg-white rounded-b-2xl p-6 border border-t-0 border-slate-200 shadow-sm space-y-6 max-w-4xl">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Logo de l'Agence & En-tête du Formulaire</h3>
            <p className="text-xs text-slate-500">
              Personnalisez l'apparence de l'en-tête officiel visible par vos clients lors de leur demande.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Image className="h-4 w-4 text-amber-600" />
                  <span>URL du Logo de l'Agence</span>
                </label>
                <input
                  type="url"
                  placeholder="https://evasionsoleil.com/images/logo.png"
                  value={localConfig.agencyLogoUrl || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, agencyLogoUrl: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Indiquez le lien direct vers votre image (PNG, JPG, SVG). L'image s'affiche automatiquement en haut du formulaire.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nom de l'agence
                  </label>
                  <input
                    type="text"
                    value={localConfig.agencyName || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, agencyName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-amber-600" />
                    <span>Numéro de téléphone officiel</span>
                  </label>
                  <input
                    type="text"
                    placeholder="1-800-555-SOLEIL"
                    value={localConfig.agencyPhone || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, agencyPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-amber-600" />
                    <span>Courriel de réception (Centrale)</span>
                  </label>
                  <input
                    type="email"
                    value={localConfig.notificationEmail || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, notificationEmail: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Slogan ou sous-titre
                  </label>
                  <input
                    type="text"
                    value={localConfig.agencyTagline || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, agencyTagline: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Aperçu de l'En-Tête
              </span>
              {localConfig.agencyLogoUrl ? (
                <img
                  src={localConfig.agencyLogoUrl}
                  alt={localConfig.agencyName}
                  className="h-16 w-16 rounded-2xl object-cover border border-amber-300 shadow-xs mb-3"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 font-black text-xl">
                  ES
                </div>
              )}
              <h4 className="font-black text-slate-900 text-sm">
                {localConfig.agencyName || 'Évasion Soleil'}
              </h4>
              <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                {localConfig.agencyTagline || 'Voyages & Croisières de rêve'}
              </p>
              {localConfig.agencyPhone && (
                <span className="text-xs text-slate-500 mt-2 font-bold">
                  {localConfig.agencyPhone}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DESTINATIONS, HÔTELS & CROISIÈRES */}
      {/* ========================================================================= */}
      {activeSubTab === 'options' && (
        <div className="bg-white rounded-b-2xl p-6 border border-t-0 border-slate-200 shadow-sm space-y-6 max-w-4xl">
          {/* Villes / Aéroports de départ */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-amber-600" />
                Villes & Aéroports de départ (Boutons rapides)
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                {localConfig.departureCities.length} villes
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {localConfig.departureCities.map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs"
                >
                  <span>{city}</span>
                  <button
                    type="button"
                    onClick={() => removeFromArray('departureCities', city)}
                    className="text-slate-400 hover:text-rose-600 ml-1 font-bold"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-md pt-1">
              <input
                type="text"
                placeholder="Nouvelle ville (ex: Halifax (YHZ))..."
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToArray('departureCities', newCity, () => setNewCity(''));
                  }
                }}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
              />
              <button
                type="button"
                onClick={() => addToArray('departureCities', newCity, () => setNewCity(''))}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Destinations populaires en vedette */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-sky-600" />
                Destinations populaires suggérées (Boutons rapides)
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                {localConfig.destinations.length} destinations
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {localConfig.destinations.map((dest) => (
                <span
                  key={dest}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs"
                >
                  <span>{dest}</span>
                  <button
                    type="button"
                    onClick={() => removeFromArray('destinations', dest)}
                    className="text-slate-400 hover:text-rose-600 ml-1 font-bold"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-md pt-1">
              <input
                type="text"
                placeholder="Nouvelle destination (ex: Riviera Maya)..."
                value={newDest}
                onChange={(e) => setNewDest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToArray('destinations', newDest, () => setNewDest(''));
                  }
                }}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
              />
              <button
                type="button"
                onClick={() => addToArray('destinations', newDest, () => setNewDest(''))}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* 1. OPTIONS FORFAIT TOUT-INCLUS */}
          <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-amber-200/80 pb-2">
              <Palmtree className="h-5 w-5 text-amber-600" />
              <h4 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                Options Forfait Tout-Inclus
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Classe de cabine (Vol Tout-Inclus) */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <PlaneTakeoff className="h-4 w-4 text-amber-600" />
                    Classe de cabine (Forfait Tout-Inclus)
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {(localConfig.allInclusiveFlightClasses || ['Classe Économique standard', 'Sièges Sélection Plus (Espace jambes)', 'Classe Premium / Club', 'Classe Affaires']).length} options
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(localConfig.allInclusiveFlightClasses || ['Classe Économique standard', 'Sièges Sélection Plus (Espace jambes)', 'Classe Premium / Club', 'Classe Affaires']).map((cls) => (
                    <span
                      key={cls}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs"
                    >
                      <span>{cls}</span>
                      <button
                        type="button"
                        onClick={() => removeFromArray('allInclusiveFlightClasses', cls)}
                        className="text-slate-400 hover:text-rose-600 ml-1 font-bold"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Ex: Première Classe..."
                    value={newAllInclusiveFlightClass}
                    onChange={(e) => setNewAllInclusiveFlightClass(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('allInclusiveFlightClasses', newAllInclusiveFlightClass, () => setNewAllInclusiveFlightClass(''));
                      }
                    }}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => addToArray('allInclusiveFlightClasses', newAllInclusiveFlightClass, () => setNewAllInclusiveFlightClass(''))}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Catégories d'établissement proposées */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building className="h-4 w-4 text-amber-600" />
                    Catégories d'établissement
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {(localConfig.hotelCategories || []).length} options
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(localConfig.hotelCategories || []).map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs"
                    >
                      <span>{cat}</span>
                      <button
                        type="button"
                        onClick={() => removeFromArray('hotelCategories', cat)}
                        className="text-slate-400 hover:text-rose-600 ml-1 font-bold"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Ex: 5 Étoiles Diamant..."
                    value={newHotelCat}
                    onChange={(e) => setNewHotelCat(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('hotelCategories', newHotelCat, () => setNewHotelCat(''));
                      }
                    }}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => addToArray('hotelCategories', newHotelCat, () => setNewHotelCat(''))}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. OPTIONS CROISIÈRE */}
          <div className="p-5 rounded-2xl bg-sky-50/50 border border-sky-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-sky-200/80 pb-2">
              <Ship className="h-5 w-5 text-sky-600" />
              <h4 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                Options Croisière
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Types de cabine */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Ship className="h-4 w-4 text-sky-600" />
                    Types de Cabines Croisière
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {localConfig.cruiseCabins.length} options
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {localConfig.cruiseCabins.map((cab) => (
                    <span
                      key={cab}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs"
                    >
                      <span>{cab}</span>
                      <button
                        type="button"
                        onClick={() => removeFromArray('cruiseCabins', cab)}
                        className="text-slate-400 hover:text-rose-600 ml-1 font-bold"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Ex: Suite avec Balcon Privé..."
                    value={newCabin}
                    onChange={(e) => setNewCabin(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('cruiseCabins', newCabin, () => setNewCabin(''));
                      }
                    }}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => addToArray('cruiseCabins', newCabin, () => setNewCabin(''))}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Compagnies de croisière préférées */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-sky-600" />
                    Compagnie de Croisière Préférée
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {localConfig.cruiseLines.length} compagnies
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {localConfig.cruiseLines.map((line) => (
                    <span
                      key={line}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs"
                    >
                      <span>{line}</span>
                      <button
                        type="button"
                        onClick={() => removeFromArray('cruiseLines', line)}
                        className="text-slate-400 hover:text-rose-600 ml-1 font-bold"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Ex: Virgin Voyages, MSC, Royal Caribbean..."
                    value={newLine}
                    onChange={(e) => setNewLine(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('cruiseLines', newLine, () => setNewLine(''));
                      }
                    }}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => addToArray('cruiseLines', newLine, () => setNewLine(''))}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. OPTIONS VOL + HÔTEL */}
          <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-teal-200/80 pb-2">
              <Plane className="h-5 w-5 text-[#0e7068]" />
              <h4 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                Options VOL + Hôtel
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Classe de cabine (Vol + Hôtel) */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <PlaneTakeoff className="h-4 w-4 text-[#0e7068]" />
                    Classe de cabine (Vol + Hôtel)
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {(localConfig.volHotelFlightClasses || ['Classe Économique standard', 'Classe Premium Économie', 'Classe Affaires', 'Première Classe']).length} options
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(localConfig.volHotelFlightClasses || ['Classe Économique standard', 'Classe Premium Économie', 'Classe Affaires', 'Première Classe']).map((cls) => (
                    <span
                      key={cls}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs"
                    >
                      <span>{cls}</span>
                      <button
                        type="button"
                        onClick={() => removeFromArray('volHotelFlightClasses', cls)}
                        className="text-slate-400 hover:text-rose-600 ml-1 font-bold"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Ex: Première Classe..."
                    value={newVolHotelFlightClass}
                    onChange={(e) => setNewVolHotelFlightClass(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('volHotelFlightClasses', newVolHotelFlightClass, () => setNewVolHotelFlightClass(''));
                      }
                    }}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => addToArray('volHotelFlightClasses', newVolHotelFlightClass, () => setNewVolHotelFlightClass(''))}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0e7068] hover:bg-[#0b5953] text-white text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Catégories & Options d'Hôtel (Vol + Hôtel) */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building className="h-4 w-4 text-[#0e7068]" />
                    Options & Catégories d'Hôtel
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {(localConfig.volHotelHotelCategories || ['3 étoiles (Économique)', '4 étoiles (Confort)', '5 étoiles (Luxe / Diamant)', 'Boutique Hôtel', 'Complexe All-Inclusive']).length} options
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(localConfig.volHotelHotelCategories || ['3 étoiles (Économique)', '4 étoiles (Confort)', '5 étoiles (Luxe / Diamant)', 'Boutique Hôtel', 'Complexe All-Inclusive']).map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs"
                    >
                      <span>{cat}</span>
                      <button
                        type="button"
                        onClick={() => removeFromArray('volHotelHotelCategories', cat)}
                        className="text-slate-400 hover:text-rose-600 ml-1 font-bold"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Ex: Villa privée, 5 étoiles Luxe..."
                    value={newVolHotelHotelCat}
                    onChange={(e) => setNewVolHotelHotelCat(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray('volHotelHotelCategories', newVolHotelHotelCat, () => setNewVolHotelHotelCat(''));
                      }
                    }}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => addToArray('volHotelHotelCategories', newVolHotelHotelCat, () => setNewVolHotelHotelCat(''))}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0e7068] hover:bg-[#0b5953] text-white text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ASSURANCES, AVIS 48H & FINANCEMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'insurance' && (
        <div className="bg-white rounded-b-2xl p-6 border border-t-0 border-slate-200 shadow-sm space-y-6 max-w-4xl">
          {/* Texte officiel de l'avis 48h */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
            <label className="block text-xs font-black text-amber-950 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Texte de l'Avis Légal des 48 Heures (Affiché si le client choisit "NON")</span>
            </label>
            <p className="text-[11px] text-amber-800">
              Ce texte informe le client qu'il dispose de 48 heures pour rajouter une assurance. Il doit obligatoirement cocher une case confirmant la prise de connaissance.
            </p>
            <textarea
              rows={3}
              value={localConfig.disclaimerInsuranceText || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, disclaimerInsuranceText: e.target.value })}
              className="w-full bg-white border border-amber-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Types d'assurances proposées */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-3">
            <label className="block text-xs font-bold text-emerald-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Types d'Assurances Voyage Disponibles (Si le client choisit "OUI")
              </span>
              <span className="text-[11px] text-emerald-800 font-normal">
                {localConfig.insuranceTypes?.length || 0} options
              </span>
            </label>
            <div className="space-y-2">
              {(localConfig.insuranceTypes || []).map((ins) => (
                <div
                  key={ins}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 shadow-2xs"
                >
                  <span className="font-semibold">{ins}</span>
                  <button
                    type="button"
                    onClick={() => removeFromArray('insuranceTypes', ins)}
                    className="text-slate-400 hover:text-rose-600 font-bold p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 max-w-md pt-1">
              <input
                type="text"
                placeholder="Ex: Assurance Annulation Toutes Causes..."
                value={newInsuranceType}
                onChange={(e) => setNewInsuranceType(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
              />
              <button
                type="button"
                onClick={() => addToArray('insuranceTypes', newInsuranceType, () => setNewInsuranceType(''))}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Financement Vacances */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black text-indigo-950 block flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-indigo-600" />
                Activer l'option de Financement Vacances
              </span>
              <p className="text-[11px] text-indigo-800 mt-0.5">
                Affiche la question "Intéressé(e) par le financement vacances ?" à l'étape 2 du formulaire.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.financingAvailable ?? true}
                onChange={(e) => setLocalConfig({ ...localConfig, financingAvailable: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: SERVICES & TEXTES DES 5 CHOIX */}
      {/* ========================================================================= */}
      {activeSubTab === 'tabs_content' && (
        <div className="bg-white rounded-b-2xl p-6 border border-t-0 border-slate-200 shadow-sm space-y-6 max-w-4xl">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#0e7068]" />
              <span>Personnalisation des 5 Choix de Voyage & Textes de Présentation</span>
            </h3>
            <p className="text-xs text-slate-500">
              Personnalisez les titres, sous-titres, badges (ex: Garantie Meilleur Prix, Aucun hôtel) et descriptions d'en-tête pour chacune des 5 formules sélectionnables à gauche.
            </p>
          </div>

          <div className="space-y-6">
            {/* 1. FORFAIT / TOUT-INCLUS */}
            {(() => {
              const cfg = getServiceConfigValues(
                'forfait_tout_inclus',
                'Forfait / Tout-inclus',
                'Vol + Transferts + Complexe hôtelier avec repas & boissons',
                '',
                'Vol + Transferts + Complexe hôtelier avec repas & boissons. Que ce soit au Mexique, en République dominicaine, à Cuba ou en Jamaïque, profitez d\'un séjour tout-inclus sans tracas.'
              );
              return (
                <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-xs text-[#0e7068] uppercase">
                      <Palmtree className="h-4 w-4 text-teal-600" />
                      <span>1. Forfait / Tout-inclus</span>
                    </div>
                    <span className="text-[11px] font-semibold text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full">
                      Formule #1
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Titre principal</label>
                      <input
                        type="text"
                        value={cfg.title}
                        onChange={(e) => updateServiceDetail('forfait_tout_inclus', { title: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Badge facultatif (ex: Coup de cœur)</label>
                      <input
                        type="text"
                        placeholder="Laisser vide si aucun badge"
                        value={cfg.badge}
                        onChange={(e) => updateServiceDetail('forfait_tout_inclus', { badge: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Sous-titre (visible dans la boîte de sélection à gauche)</label>
                      <input
                        type="text"
                        value={cfg.subtitle}
                        onChange={(e) => updateServiceDetail('forfait_tout_inclus', { subtitle: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Description d'en-tête (affichée en haut du formulaire de droite)</label>
                      <textarea
                        rows={2}
                        value={cfg.description}
                        onChange={(e) => updateServiceDetail('forfait_tout_inclus', { description: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2. CROISIÈRE */}
            {(() => {
              const cfg = getServiceConfigValues(
                'croisiere',
                'Croisière',
                'Caraïbes, Méditerranée, Alaska avec cabine vue mer ou balcon',
                '',
                'Caraïbes, Méditerranée, Alaska avec cabine vue mer ou balcon. Voguez à bord des plus prestigieux navires de croisière avec cabine balcon privé ou vue mer dégagée.'
              );
              return (
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-xs text-indigo-900 uppercase">
                      <Ship className="h-4 w-4 text-indigo-600" />
                      <span>2. Croisière</span>
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                      Formule #2
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Titre principal</label>
                      <input
                        type="text"
                        value={cfg.title}
                        onChange={(e) => updateServiceDetail('croisiere', { title: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Badge facultatif</label>
                      <input
                        type="text"
                        placeholder="Laisser vide si aucun badge"
                        value={cfg.badge}
                        onChange={(e) => updateServiceDetail('croisiere', { badge: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Sous-titre (visible dans la boîte de sélection à gauche)</label>
                      <input
                        type="text"
                        value={cfg.subtitle}
                        onChange={(e) => updateServiceDetail('croisiere', { subtitle: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Description d'en-tête (affichée en haut du formulaire de droite)</label>
                      <textarea
                        rows={2}
                        value={cfg.description}
                        onChange={(e) => updateServiceDetail('croisiere', { description: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. BATTRE UN PRIX (GARANTIE MEILLEUR PRIX) */}
            {(() => {
              const cfg = getServiceConfigValues(
                'battre_prix',
                'Battre un prix',
                'Vous avez vu moins cher ailleurs ? Collez le lien, on fait mieux !',
                'Garantie Meilleur Prix',
                'Vous avez vu moins cher ailleurs ? Collez le lien, on fait mieux ! Nous égalons ou battons le tarif avec la tranquillité d\'un conseiller certifié.'
              );
              return (
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-xs text-rose-900 uppercase">
                      <Flame className="h-4 w-4 text-rose-600" />
                      <span>3. Garantie Meilleur Prix / Battre un prix</span>
                    </div>
                    <span className="text-[11px] font-semibold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                      Formule #3
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Titre principal</label>
                      <input
                        type="text"
                        value={cfg.title}
                        onChange={(e) => updateServiceDetail('battre_prix', { title: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Badge (ex: Garantie Meilleur Prix)</label>
                      <input
                        type="text"
                        value={cfg.badge}
                        onChange={(e) => updateServiceDetail('battre_prix', { badge: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-rose-700"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Sous-titre (visible dans la boîte de sélection à gauche)</label>
                      <input
                        type="text"
                        value={cfg.subtitle}
                        onChange={(e) => updateServiceDetail('battre_prix', { subtitle: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Description d'en-tête (affichée en haut du formulaire de droite)</label>
                      <textarea
                        rows={2}
                        value={cfg.description}
                        onChange={(e) => updateServiceDetail('battre_prix', { description: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 4. VOL + HÔTEL */}
            {(() => {
              const cfg = getServiceConfigValues(
                'vol_hotel',
                'Vol + Hôtel',
                'Flexibilité totale pour escapade urbaine ou circuit personnalisé',
                '',
                'Flexibilité totale pour escapade urbaine ou circuit personnalisé. Combinez vos vols et vos hébergements à la carte aux meilleurs tarifs négociés.'
              );
              return (
                <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-xs text-sky-900 uppercase">
                      <Plane className="h-4 w-4 text-sky-600" />
                      <span>4. Vol + Hôtel</span>
                    </div>
                    <span className="text-[11px] font-semibold text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full">
                      Formule #4
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Titre principal</label>
                      <input
                        type="text"
                        value={cfg.title}
                        onChange={(e) => updateServiceDetail('vol_hotel', { title: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Badge facultatif</label>
                      <input
                        type="text"
                        placeholder="Laisser vide si aucun badge"
                        value={cfg.badge}
                        onChange={(e) => updateServiceDetail('vol_hotel', { badge: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Sous-titre (visible dans la boîte de sélection à gauche)</label>
                      <input
                        type="text"
                        value={cfg.subtitle}
                        onChange={(e) => updateServiceDetail('vol_hotel', { subtitle: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Description d'en-tête (affichée en haut du formulaire de droite)</label>
                      <textarea
                        rows={2}
                        value={cfg.description}
                        onChange={(e) => updateServiceDetail('vol_hotel', { description: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 5. VOL SEUL (SANS HÔTEL) */}
            {(() => {
              const cfg = getServiceConfigValues(
                'vol_seul',
                'Vol seul (sans hôtel)',
                'Billet d\'avion seul aller-retour ou aller simple, aucun complexe ni hébergement',
                'Aucun hôtel',
                'Billet d\'avion seul aller-retour ou aller simple, aucun complexe ni hébergement. Tarifs négociés sur toutes les compagnies régulières et nolisées.'
              );
              return (
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-xs text-amber-900 uppercase">
                      <PlaneTakeoff className="h-4 w-4 text-amber-600" />
                      <span>5. Vol seul (sans hôtel)</span>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      Formule #5
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Titre principal</label>
                      <input
                        type="text"
                        value={cfg.title}
                        onChange={(e) => updateServiceDetail('vol_seul', { title: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Badge (ex: Aucun hôtel)</label>
                      <input
                        type="text"
                        value={cfg.badge}
                        onChange={(e) => updateServiceDetail('vol_seul', { badge: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-amber-800"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Sous-titre (visible dans la boîte de sélection à gauche)</label>
                      <input
                        type="text"
                        value={cfg.subtitle}
                        onChange={(e) => updateServiceDetail('vol_seul', { subtitle: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Description d'en-tête (affichée en haut du formulaire de droite)</label>
                      <textarea
                        rows={2}
                        value={cfg.description}
                        onChange={(e) => updateServiceDetail('vol_seul', { description: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: EMBED CODE HTML (Intégration Page d'Accueil - Fond Invisible)      */}
      {/* ========================================================================= */}
      {isSuperAdmin && activeSubTab === 'embed_code' && (
        <div className="bg-white rounded-b-2xl p-6 border border-t-0 border-slate-200 shadow-sm max-w-4xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-0.5 flex items-center gap-2">
                <FileCode className="h-5 w-5 text-amber-500" />
                <span>Code HTML d'Intégration du Devis (Page d'Accueil)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Intégration grand format (jusqu'à 1440px), 100% responsive sur mobile, tablette et ordinateur, avec <strong>arrière-plan totalement invisible (transparent)</strong>.
              </p>
            </div>

            <a
              href={targetEmbedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0e7068] text-xs font-bold transition-all border border-teal-200 shrink-0 cursor-pointer shadow-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Tester le rendu direct</span>
            </a>
          </div>

          {/* Configuration du domaine / URL cible */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-amber-600" />
                <span>Domaine de l'application ou URL d'origine :</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                Détecté : {detectedOrigin}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder={`Laisser vide pour utiliser ${detectedOrigin} ou entrer https://intranet.evasionsoleil.com`}
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
              {customDomain && (
                <button
                  type="button"
                  onClick={() => setCustomDomain('')}
                  className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  Rétablir l'URL courante
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              URL cible du formulaire : <strong className="text-slate-800 font-mono">{targetEmbedUrl}</strong>
            </p>
          </div>

          {/* Bloc de Code avec bouton Copier */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Code HTML pour la Page d'Accueil (Large, Responsive & Fond Invisible)
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentEmbedCode);
                  setCopiedEmbed(true);
                  setTimeout(() => setCopiedEmbed(false), 2000);
                }}
                className="px-4 py-2 rounded-xl bg-[#338b84] hover:bg-[#256863] text-white text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {copiedEmbed ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedEmbed ? 'Copié dans le presse-papier !' : 'Copier le code HTML'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-emerald-400 rounded-2xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800 max-h-[360px]">
              {currentEmbedCode}
            </pre>
          </div>

          {/* Checklist de Compatibilité */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Fond 100% Invisible</strong>
                <span className="text-[11px] text-emerald-700">S'intègre directement sur le fond de votre page d'accueil sans contour blanc.</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Large & Tout Appareil</strong>
                <span className="text-[11px] text-sky-700">Jusqu'à 1440px sur grand écran et 100% fluide sur téléphone/tablette.</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Hauteur Sans Ascenseur</strong>
                <span className="text-[11px] text-indigo-700">Redimensionnement automatique à chaque étape sans barre de défilement.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
