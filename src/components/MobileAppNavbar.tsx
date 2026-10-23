import React from 'react';
import {
  Bot,
  FileText,
  Users,
  MessageSquare,
  BarChart3,
  Shield,
  Bell,
  Sparkles,
  Database,
  Contact
} from 'lucide-react';
import { User, ChatbotSettings } from '../types';

interface MobileAppNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: User;
  chatbotSettings?: ChatbotSettings;
  submissionsCount?: number;
  unreadNotifsCount?: number;
  waitingChatCount?: number;
  onOpenNotifications?: () => void;
}

export const MobileAppNavbar: React.FC<MobileAppNavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  chatbotSettings,
  submissionsCount = 0,
  unreadNotifsCount = 0,
  waitingChatCount = 0,
}) => {
  const isUserAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canAccessStats = isUserAdmin || Boolean(currentUser?.permissions?.canViewStats);
  const canAccessDevisForm = isUserAdmin || Boolean((currentUser?.permissions as any)?.canEditFormConfig) || Boolean((currentUser?.permissions as any)?.canManageForms);

  const items = [
    {
      id: 'chatbot',
      label: 'Martine V.',
      icon: Bot,
      badge: waitingChatCount > 0 ? waitingChatCount : (chatbotSettings?.botEnabled ? 'ON' : null),
      badgeColor: waitingChatCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-500 text-white',
    },
    {
      id: 'submissions',
      label: 'Soumissions',
      icon: Users,
      badge: submissionsCount > 0 ? submissionsCount : null,
      badgeColor: 'bg-[#338b84] text-white font-black',
    },
    {
      id: 'crm',
      label: 'CRM',
      icon: Contact,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'team_chat',
      label: 'Équipe',
      icon: MessageSquare,
      badge: null,
      badgeColor: 'bg-sky-500 text-white',
    },
    ...(canAccessStats
      ? [
          {
            id: 'stats',
            label: 'Stats',
            icon: BarChart3,
            badge: isUserAdmin ? 'AD' : null,
            badgeColor: 'bg-indigo-600 text-white',
          },
        ]
      : (canAccessDevisForm
        ? [
            {
              id: 'devis_form',
              label: 'Devis',
              icon: FileText,
              badge: null,
              badgeColor: '',
            },
          ]
        : [])),
    {
      id: isUserAdmin ? 'users_grades' : (canAccessDevisForm ? 'devis_form' : 'submissions'),
      label: isUserAdmin ? 'Admin' : (canAccessDevisForm ? 'Devis' : 'Soumissions'),
      icon: isUserAdmin ? Shield : (canAccessDevisForm ? FileText : Users),
      badge: isUserAdmin ? 'IT' : null,
      badgeColor: 'bg-indigo-600 text-white',
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl safe-area-pb">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-90 ${
                isActive ? 'text-[#338b84]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {item.badge !== null && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 px-1 min-w-[16px] h-4 rounded-full text-[9px] flex items-center justify-center font-bold shadow-xs ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight truncate max-w-[58px] ${isActive ? 'font-black' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-8 h-1 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
