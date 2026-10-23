import React, { useState } from 'react';
import {
  Cloud,
  Inbox,
  Contact,
  Bot,
  FileText,
  Mail,
  BarChart3,
  MessageSquare,
  Users,
  Database,
  Bell,
  Power,
  Layout,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { User, ChatbotSettings, NextcloudCustomizationConfig } from '../types';

interface NextcloudCompactBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  chatbotSettings: ChatbotSettings;
  onToggleBot: () => void;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  onUpdateUserStatus: (userId: string, newStatus: 'disponible' | 'indisponible') => Promise<any>;
  headerMode: 'compact' | 'hidden';
  onChangeHeaderMode: (mode: 'compact' | 'hidden') => void;
  onExitNextcloudMode: () => void;
  customBranding?: NextcloudCustomizationConfig;
}

export const NextcloudCompactBar: React.FC<NextcloudCompactBarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  chatbotSettings,
  onToggleBot,
  unreadNotifsCount,
  onOpenNotifications,
  onUpdateUserStatus,
  headerMode,
  onChangeHeaderMode,
  onExitNextcloudMode,
  customBranding,
}) => {
  const [floatingExpanded, setFloatingExpanded] = useState(false);

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

  const myStatus = currentUser?.status || 'disponible';

  const pluginTabs = [
    { id: 'submissions', label: 'Soumissions', icon: Inbox },
    { id: 'crm', label: 'CRM & Factures', icon: Contact },
    { id: 'chatbot', label: 'Martine V.', icon: Bot },
    { id: 'devis_form', label: 'Devis', icon: FileText },
    { id: 'newsletter', label: 'Infolettre', icon: Mail },
    ...(canAccessStats ? [{ id: 'stats', label: 'Stats', icon: BarChart3 }] : []),
    { id: 'team_chat', label: 'Chat Équipe', icon: MessageSquare },
    ...(isUserAdmin ? [{ id: 'users_grades', label: 'Grades', icon: Users }] : []),
    ...(isSystemAdmin ? [{ id: 'mysql_server', label: 'MySQL', icon: Database }] : []),
    { id: 'nextcloud_plugins', label: 'Plugins Nextcloud', icon: Cloud },
  ];

  // MODE 1: PURE ISOLATED NEXTCLOUD PLUGIN (header=0) -> Zero top bar, ultra-discreet floating pill in bottom-right
  if (headerMode === 'hidden') {
    return (
      <div className="fixed bottom-3 right-3 z-50 flex flex-col items-end gap-2">
        {floatingExpanded && (
          <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 rounded-2xl p-3 shadow-2xl w-72 space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-400">
                <Cloud className="h-4 w-4" />
                <span>Plugin Nextcloud Actif</span>
              </div>
              <button
                type="button"
                onClick={() => onChangeHeaderMode('compact')}
                className="text-[11px] font-bold text-slate-300 hover:text-white underline cursor-pointer"
              >
                Afficher la barre
              </button>
            </div>

            {/* Quick switcher between plugins if needed */}
            <div className="grid grid-cols-2 gap-1">
              {pluginTabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(t.id);
                      setFloatingExpanded(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-[#0082c9] text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Agent status & Martine toggle */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdateUserStatus(
                    currentUser.id,
                    myStatus === 'disponible' ? 'indisponible' : 'disponible'
                  )
                }
                className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold cursor-pointer ${
                  myStatus === 'disponible'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    myStatus === 'disponible' ? 'bg-emerald-200 animate-pulse' : 'bg-amber-300'
                  }`}
                />
                <span>{myStatus === 'disponible' ? 'Disponible' : 'Indisponible'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleBot}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold cursor-pointer ${
                  chatbotSettings?.botEnabled
                    ? 'bg-teal-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                Martine: {chatbotSettings?.botEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <button
              type="button"
              onClick={onExitNextcloudMode}
              className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
            >
              Revenir au Dashboard Classique
            </button>
          </div>
        )}

        {/* Tiny Floating Pill */}
        <div className="flex items-center gap-1 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-xs text-white border border-slate-700/80 rounded-full px-2.5 py-1 shadow-lg text-[11px] font-bold">
          <button
            type="button"
            onClick={() =>
              onUpdateUserStatus(
                currentUser.id,
                myStatus === 'disponible' ? 'indisponible' : 'disponible'
              )
            }
            className="flex items-center gap-1.5 pr-2 border-r border-slate-700 cursor-pointer"
            title="Cliquer pour changer votre statut Disponible / Indisponible"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                myStatus === 'disponible' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline">{currentUser.name.split(' ')[0]}</span>
          </button>

          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative px-1.5 py-0.5 text-slate-300 hover:text-white cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-0.5 h-3.5 w-3.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFloatingExpanded(!floatingExpanded)}
            className="flex items-center gap-1 pl-1.5 border-l border-slate-700 text-sky-400 hover:text-sky-300 cursor-pointer"
            title="Menu rapide des plugins Nextcloud"
          >
            <Cloud className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Plugins</span>
            {floatingExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // MODE 2: COMPACT NEXTCLOUD BAR (44px sleek bar replacing the big dashboard header)
  return (
    <header
      className="sticky top-0 z-40 text-white shadow-xs border-b border-black/10 transition-colors duration-200"
      style={{ backgroundColor: customBranding?.primaryColor || '#0082c9' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-11 flex items-center justify-between gap-2">
        {/* Left: Compact Plugin Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          <div className="flex items-center gap-1.5 pr-2 mr-1 border-r border-white/20 shrink-0">
            {customBranding?.logoUrl && customBranding?.logoMode !== 'text_only' ? (
              <img
                src={customBranding.logoUrl}
                alt="Logo"
                style={{ height: '24px' }}
                className="object-contain rounded"
              />
            ) : (
              <Cloud className="h-4 w-4 text-sky-200" />
            )}
            <span className="text-xs font-black tracking-tight hidden sm:inline">
              {customBranding?.brandTitle || 'Évasion Nextcloud'}
            </span>
          </div>

          {pluginTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#0082c9] shadow-2xs'
                    : 'text-white/90 hover:bg-white/15 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Agent status toggle */}
          <button
            type="button"
            onClick={() =>
              onUpdateUserStatus(
                currentUser.id,
                myStatus === 'disponible' ? 'indisponible' : 'disponible'
              )
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer ${
              myStatus === 'disponible'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-200'
            }`}
            title="Basculer mon statut Disponible / Indisponible"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                myStatus === 'disponible' ? 'bg-white animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden md:inline">
              {myStatus === 'disponible' ? 'Disponible' : 'Indisponible'}
            </span>
          </button>

          {/* Martine V. quick switch */}
          <button
            type="button"
            onClick={onToggleBot}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer ${
              chatbotSettings?.botEnabled
                ? 'bg-emerald-700/90 text-white hover:bg-emerald-800'
                : 'bg-rose-600 text-white hover:bg-rose-700'
            }`}
            title="Activer / Désactiver Martine V."
          >
            <Power className="h-3 w-3" />
            <span className="hidden lg:inline">
              Martine {chatbotSettings?.botEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Hide bar completely (Pure Plugin Mode) */}
          <button
            type="button"
            onClick={() => onChangeHeaderMode('hidden')}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold transition-colors cursor-pointer"
            title="Masquer cette barre (Mode Plugin Pur sans barre)"
          >
            <Maximize2 className="h-3 w-3" />
            <span className="hidden xl:inline">Sans barre</span>
          </button>

          {/* Return to classic dashboard */}
          <button
            type="button"
            onClick={onExitNextcloudMode}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/40 hover:bg-slate-900/70 text-[11px] font-bold transition-colors cursor-pointer"
            title="Réafficher le Dashboard complet classique"
          >
            <Layout className="h-3 w-3" />
            <span className="hidden xl:inline">Dashboard</span>
          </button>
        </div>
      </div>
    </header>
  );
};
