import React, { useState, useEffect, useCallback } from 'react';
import {
  Sun,
  Moon,
  Bot,
  FileText,
  Users,
  MessageSquare,
  BarChart3,
  Database,
  Bell,
  CheckCircle2,
  Power,
  ChevronDown,
  Globe,
  Camera,
  LogOut,
  Shield,
  Contact,
  Inbox,
  Mail,
  Check,
  ExternalLink,
  Cloud
} from 'lucide-react';
import { User, ChatbotSettings, PushNotificationItem, NextcloudCustomizationConfig } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { getSafeAvatar, getInitialsAvatarUrl } from '../utils/avatarUtils';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  allUsers: User[];
  chatbotSettings: ChatbotSettings;
  onToggleBot: () => void;
  notifications: PushNotificationItem[];
  onOpenNotifications: () => void;
  unreadNotifsCount: number;
  onOpenProfileModal: () => void;
  onLogout: () => void;
  onUpdateUserStatus?: (userId: string, newStatus: 'disponible' | 'indisponible') => Promise<any>;
  onEnableNextcloudMode?: () => void;
  customBranding?: NextcloudCustomizationConfig;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  setCurrentUser,
  allUsers,
  chatbotSettings,
  onToggleBot,
  notifications,
  onOpenNotifications,
  unreadNotifsCount,
  onOpenProfileModal,
  onLogout,
  onUpdateUserStatus,
  onEnableNextcloudMode,
  customBranding,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Agent Availability & Live Status (Green when online, Blue when no agent available)
  const [agentsAvailability, setAgentsAvailability] = useState<{
    totalAgents: number;
    availableAgents: number;
    status: 'disponible' | 'indisponible';
    availableList: any[];
  }>({
    totalAgents: allUsers?.length || 0,
    availableAgents: allUsers?.filter((u) => u.status !== 'indisponible').length || 0,
    status: (allUsers?.filter((u) => u.status !== 'indisponible').length || 0) > 0 ? 'disponible' : 'indisponible',
    availableList: [],
  });

  const fetchAgentsStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/status');
      if (res.ok) {
        const data = await res.json();
        setAgentsAvailability(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAgentsStatus();
    const interval = setInterval(fetchAgentsStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchAgentsStatus]);

  // Synchronize when allUsers prop changes
  useEffect(() => {
    if (allUsers && allUsers.length > 0) {
      const available = allUsers.filter((u) => u.status !== 'indisponible');
      setAgentsAvailability({
        totalAgents: allUsers.length,
        availableAgents: available.length,
        status: available.length > 0 ? 'disponible' : 'indisponible',
        availableList: allUsers.map((u) => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar || '',
          grade: u.grade || '',
          status: (u.status === 'indisponible' ? 'indisponible' : 'disponible') as 'disponible' | 'indisponible',
        })),
      });
    }
  }, [allUsers]);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const handleUpdateMyStatus = async (newStatus: 'disponible' | 'indisponible') => {
    if (isUpdatingStatus || !currentUser?.id) return;
    setIsUpdatingStatus(true);

    // Immediate optimistic update so the UI reacts with zero latency
    const updatedUser: User = { ...currentUser, status: newStatus };
    setCurrentUser(updatedUser);
    try {
      sessionStorage.setItem('evasion_employee_session', JSON.stringify(updatedUser));
      localStorage.setItem('evasion_employee_session', JSON.stringify(updatedUser));
    } catch {}

    setStatusToast(
      newStatus === 'disponible'
        ? '✅ Vous êtes maintenant Disponible (En ligne)'
        : '💤 Vous êtes maintenant Indisponible'
    );
    setTimeout(() => setStatusToast(null), 3000);

    setAgentsAvailability((prev) => {
      const updatedList = prev.availableList && prev.availableList.length > 0
        ? prev.availableList.map((a) => (a.id === currentUser.id ? { ...a, status: newStatus } : a))
        : [{ id: currentUser.id, name: currentUser.name, status: newStatus }];
      const available = updatedList.filter((a) => a.status !== 'indisponible');
      return {
        totalAgents: prev.totalAgents || 1,
        availableAgents: available.length,
        status: available.length > 0 ? 'disponible' : 'indisponible',
        availableList: updatedList,
      };
    });

    try {
      let data: any = null;
      if (onUpdateUserStatus) {
        data = await onUpdateUserStatus(currentUser.id, newStatus);
      } else {
        const res = await fetch(`/api/users/${currentUser.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        data = await res.json();
      }
      if (data?.user) {
        setCurrentUser(data.user);
        try {
          sessionStorage.setItem('evasion_employee_session', JSON.stringify(data.user));
          localStorage.setItem('evasion_employee_session', JSON.stringify(data.user));
        } catch {}
      }
      if (data?.availability) {
        setAgentsAvailability(data.availability);
      }
      fetchAgentsStatus();
    } catch (err) {
      console.error('Erreur mise à jour statut agent:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const myStatus = currentUser?.status || 'disponible';
  const hasAgentsOnline = agentsAvailability.availableAgents > 0;

  // Security check: Only System Admin has access to Database Integration
  const isSystemAdmin =
    currentUser?.role === 'super_admin' ||
    currentUser?.username?.toLowerCase() === 'admin';

  // Security check: Only admins have access to "Grades & Équipe"
  const isUserAdmin =
    isSystemAdmin ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin';

  // Security check: Statistics restricted strictly to Admin or canViewStats permission
  const canAccessStats =
    isUserAdmin ||
    Boolean(currentUser?.permissions?.canViewStats);

  // Formulaire Devis accessible pour tous les employés (avec badge ADMIN pour les administrateurs)
  const canAccessDevisForm = true;

  // Infolettre & Offres accessible à toute l'équipe
  const canAccessNewsletter = true;

  const navItems = [
    { id: 'chatbot', label: 'Chatbot Martine V.', icon: Bot, badge: chatbotSettings?.botEnabled ? 'ON' : 'OFF' },
    ...(canAccessDevisForm
      ? [{ id: 'devis_form', label: 'Formulaire Devis', icon: FileText, badge: isUserAdmin ? 'ADMIN' : undefined }]
      : []),
    { id: 'submissions', label: 'Soumissions', icon: Inbox },
    { id: 'crm', label: 'CRM Clients', icon: Contact },
    ...(canAccessNewsletter
      ? [{ id: 'newsletter', label: 'Infolettre & Offres', icon: Mail }]
      : []),
    ...(canAccessStats
      ? [{ id: 'stats', label: 'Statistiques', icon: BarChart3, badge: isUserAdmin ? 'ADMIN' : undefined }]
      : []),
    { id: 'team_chat', label: 'Chat d\'Équipe', icon: MessageSquare },
    ...(isUserAdmin
      ? [{ id: 'users_grades', label: 'Grades & Équipe', icon: Users, badge: 'ADMIN' }]
      : []),
    ...(isSystemAdmin
      ? [{ id: 'mysql_server', label: 'Base de données MySQL', icon: Database }]
      : []),
    { id: 'nextcloud_plugins', label: 'Plugins Nextcloud', icon: Cloud, badge: 'PLUGIN' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner with Brand, Active User, Bot Status, and Pterodactyl Badge */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            {customBranding?.logoUrl && customBranding?.logoMode !== 'text_only' ? (
              <img
                src={customBranding.logoUrl}
                alt={customBranding?.brandTitle || 'Logo'}
                style={{ height: `${customBranding?.logoHeightPx || 40}px` }}
                className="object-contain max-w-[160px] rounded-lg"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm overflow-hidden p-1 shrink-0"
                style={{
                  background: customBranding?.primaryColor
                    ? `linear-gradient(135deg, ${customBranding.primaryColor}, #0f2b38)`
                    : 'linear-gradient(135deg, #338b84, #205753)',
                }}
              >
                <img
                  src="/icon.svg"
                  alt="Logo Évasion Soleil"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget.style.display = 'none');
                  }}
                />
              </div>
            )}
            {customBranding?.logoMode !== 'logo_only' && (
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900">
                    {customBranding?.brandTitle || 'Évasion Soleil'}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-[#338b84] border border-slate-700">
                    <Globe className="h-3 w-3 text-[#338b84]" />
                    <span>{customBranding?.intranetDomain ? customBranding.intranetDomain.replace(/^https?:\/\//, '') : 'intranet.evasionsoleil.com'}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">
                  {customBranding?.brandSubtitle || 'Espace Collaborateurs • Chatbot • CRM • Devis'}
                </p>
              </div>
            )}
          </div>

          {/* Center/Right Action Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Nextcloud Plugin Mode Button */}
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'nextcloud_plugins' && onEnableNextcloudMode) {
                  onEnableNextcloudMode();
                } else {
                  setActiveTab('nextcloud_plugins');
                }
              }}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0082c9] hover:bg-[#006aa3] text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer"
              title="Configurer ou basculer en Mode Plugin Nextcloud (Sans le gros dashboard)"
            >
              <Cloud className="h-3.5 w-3.5" />
              <span>Plugins Nextcloud</span>
            </button>

            {/* Install Mobile PWA Button */}
            <PWAInstallButton compact={true} />

            {/* Statut Global de l'Équipe : Pastille Verte (En ligne) ou Bleue (Aucun agent disponible) */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors shadow-2xs ${
                hasAgentsOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}
              title={
                hasAgentsOnline
                  ? `Conseillers en ligne (${agentsAvailability.availableAgents} disponible${agentsAvailability.availableAgents > 1 ? 's' : ''})`
                  : 'Aucun agent disponible - Martine V. prend le relais 24/7'
              }
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  hasAgentsOnline
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-sky-500'
                }`}
              />
              <span className="hidden sm:inline text-[11px] font-extrabold">
                {hasAgentsOnline ? 'En ligne' : 'Aucun agent disponible'}
              </span>
              {hasAgentsOnline && (
                <span className="hidden md:inline text-[10px] text-emerald-600 font-semibold">
                  ({agentsAvailability.availableAgents})
                </span>
              )}
            </div>

            {/* Statut Individuel de l'Agent Connecté (Segmented Control Explicite) */}
            <div className="relative flex items-center bg-slate-100/90 border border-slate-200 rounded-full p-0.5 text-xs">
              <button
                type="button"
                id="agent-status-disponible-btn"
                onClick={() => handleUpdateMyStatus('disponible')}
                disabled={isUpdatingStatus}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] transition-all cursor-pointer ${
                  myStatus === 'disponible'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Définir mon statut comme Disponible (En ligne)"
              >
                <span className={`h-2 w-2 rounded-full ${myStatus === 'disponible' ? 'bg-emerald-200 animate-pulse' : 'bg-slate-400'}`} />
                <span>Disponible</span>
              </button>

              <button
                type="button"
                id="agent-status-indisponible-btn"
                onClick={() => handleUpdateMyStatus('indisponible')}
                disabled={isUpdatingStatus}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] transition-all cursor-pointer ${
                  myStatus === 'indisponible'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Définir mon statut comme Indisponible (Ne pas recevoir d'appels directs)"
              >
                <span className={`h-2 w-2 rounded-full ${myStatus === 'indisponible' ? 'bg-amber-300' : 'bg-slate-400'}`} />
                <span>Indisponible</span>
              </button>

              {statusToast && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg border border-slate-700 animate-in fade-in slide-in-from-top-1">
                  {statusToast}
                </div>
              )}
            </div>

            {/* Quick Martine Status Switch */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 text-xs">
              <span className="text-slate-600 mr-2 font-medium hidden md:inline">Martine V. :</span>
              <button
                id="toggle-martine-nav-btn"
                onClick={onToggleBot}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold transition-all shadow-xs ${
                  chatbotSettings?.botEnabled
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
                title="Cliquer pour basculer Martine en ON ou OFF"
              >
                <Power className="h-3.5 w-3.5" />
                <span>{chatbotSettings?.botEnabled ? 'EN SERVICE (ON)' : 'ARRÊTÉE (OFF)'}</span>
              </button>
            </div>

            {/* Push Notifications Bell */}
            <button
              id="open-notifications-btn"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Current User & Grade Switcher Dropdown */}
            <div className="relative">
              <button
                id="user-profile-menu-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all text-left"
              >
                <img
                  src={getSafeAvatar(currentUser?.avatar, currentUser?.name)}
                  alt={currentUser?.name || 'Utilisateur'}
                  className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getInitialsAvatarUrl(currentUser?.name);
                  }}
                />
                <div className="hidden md:block">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                    {currentUser?.name || 'Administrateur'}
                    {currentUser?.specialTagEnabled && (
                      (currentUser?.specialTags && currentUser.specialTags.length > 0
                        ? currentUser.specialTags
                        : [currentUser?.specialTag].filter(Boolean)
                      ).map((tag) => (
                        <span key={String(tag)} className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-indigo-600 text-white uppercase">
                          [{tag}]
                        </span>
                      ))
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                    {currentUser?.grade || 'Conseiller Voyages'}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {/* User Switcher Dropdown */}
              {showUserDropdown && (
                <div
                  className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setShowUserDropdown(false)}
                >
                  {/* Current user header summary */}
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={getSafeAvatar(currentUser?.avatar, currentUser?.name)}
                        alt={currentUser?.name || 'Utilisateur'}
                        className="h-10 w-10 rounded-xl object-cover ring-2 ring-[#338b84] shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getInitialsAvatarUrl(currentUser?.name);
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-slate-900 truncate">
                          {currentUser?.name || 'Utilisateur'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {currentUser?.grade || 'Conseiller Voyages'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {currentUser?.email || ''}
                        </div>
                      </div>
                    </div>

                    {/* Button to modify profile picture */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUserDropdown(false);
                        onOpenProfileModal();
                      }}
                      className="mt-2.5 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5 text-amber-600" />
                      <span>Modifier ma photo de profil</span>
                    </button>

                    {/* Choix du statut de l'agent dans le menu utilisateur */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                        Mon statut de conseiller :
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateMyStatus('disponible');
                          }}
                          className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            myStatus === 'disponible'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span>Disponible</span>
                          {myStatus === 'disponible' && <Check className="h-3 w-3 ml-0.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateMyStatus('indisponible');
                          }}
                          className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            myStatus === 'indisponible'
                              ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full bg-sky-400" />
                          <span>Indisponible</span>
                          {myStatus === 'indisponible' && <Check className="h-3 w-3 ml-0.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Logout Action */}
                  <div className="pt-1 border-t border-slate-100 px-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Se déconnecter de l'Espace Employé</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#338b84] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badge === 'ON'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.badge === 'OFF'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}


        </nav>
      </div>
    </header>
  );
};
