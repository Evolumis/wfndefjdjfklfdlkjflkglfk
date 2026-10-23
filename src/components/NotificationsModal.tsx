import React, { useState } from 'react';
import {
  Bell,
  CheckCircle,
  X,
  FileText,
  MessageSquare,
  AlertTriangle,
  Info,
  Clock,
  Trash2,
  Send,
  Users,
  Megaphone,
  Sparkles,
  CheckCheck,
  Radio
} from 'lucide-react';
import { PushNotificationItem, User } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: PushNotificationItem[];
  currentUser?: User;
  allUsers?: User[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onDeleteNotification: (id: string) => void;
  onSendNotification?: (notifData: {
    title: string;
    message: string;
    type: string;
    targetUserId: string;
    targetUserName: string;
  }) => Promise<void>;
  onSelectNotification?: (notif: PushNotificationItem) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  currentUser,
  allUsers = [],
  onMarkAllAsRead,
  onClearAll,
  onDeleteNotification,
  onSendNotification,
  onSelectNotification,
}) => {
  const [showAdminCompose, setShowAdminCompose] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string>('all');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('admin_broadcast');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Filter visible notifications for non-admins (they see broadcasts or notifications addressed to them)
  const visibleNotifications = notifications.filter((n) => {
    if (isAdmin) return true;
    if (!n.targetUserId || n.targetUserId === 'all') return true;
    return n.targetUserId === currentUser?.id;
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    setIsSending(true);
    try {
      let targetUserName = 'Tout le monde';
      if (targetUserId !== 'all') {
        const found = allUsers.find((u) => u.id === targetUserId);
        if (found) targetUserName = found.name;
      }

      if (onSendNotification) {
        await onSendNotification({
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          type: notifType,
          targetUserId,
          targetUserName,
        });
      }

      setSendSuccess(true);
      setNotifTitle('');
      setNotifMessage('');
      setTimeout(() => {
        setSendSuccess(false);
        setShowAdminCompose(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to send notification', err);
    } finally {
      setIsSending(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_submission':
      case 'new_quote':
        return <FileText className="h-4 w-4 text-[#338b84]" />;
      case 'chat_alert':
        return <MessageSquare className="h-4 w-4 text-indigo-500" />;
      case 'team_chat':
        return <MessageSquare className="h-4 w-4 text-sky-500" />;
      case 'urgent':
      case 'admin_alert':
        return <AlertTriangle className="h-4 w-4 text-rose-500" />;
      case 'admin_broadcast':
        return <Megaphone className="h-4 w-4 text-[#338b84]" />;
      default:
        return <Info className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-end p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] mt-12 animate-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[#daf0ed] text-[#143734] flex items-center justify-center font-bold">
              <Bell className="h-4 w-4 text-[#338b84]" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Centre de Notifications Push</h3>
              <p className="text-[11px] text-slate-500">
                {visibleNotifications.length} notification{visibleNotifications.length > 1 ? 's' : ''} au total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Action toolbar */}
        <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllAsRead}
              disabled={visibleNotifications.length === 0}
              className="inline-flex items-center gap-1 font-semibold text-[#286f6a] hover:text-[#143734] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Tout marquer lu</span>
            </button>

            <span className="text-slate-300">&bull;</span>

            <button
              onClick={() => {
                if (window.confirm('Voulez-vous vraiment effacer / vider toutes les notifications ?')) {
                  onClearAll();
                }
              }}
              disabled={visibleNotifications.length === 0}
              className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Vider tout</span>
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAdminCompose(!showAdminCompose)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                showAdminCompose
                  ? 'bg-slate-800 text-white'
                  : 'bg-[#338b84] text-white hover:bg-[#286f6a]'
              }`}
            >
              <Megaphone className="h-3.5 w-3.5" />
              <span>{showAdminCompose ? 'Fermer diffusion' : 'Envoyer notification'}</span>
            </button>
          )}
        </div>

        {/* Admin Compose Section */}
        {isAdmin && showAdminCompose && (
          <form onSubmit={handleSend} className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-[#338b84] animate-pulse" />
                Diffuser une notification push (Admin)
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Temps réel & mobile PWA</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Target */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Destinataire :
                </label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                >
                  <option value="all">📢 Tout le monde (Tous les agents)</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      👤 {user.name} ({user.grade || user.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Type d'alerte :
                </label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                >
                  <option value="admin_broadcast">📢 Message général / Direction</option>
                  <option value="urgent">🚨 Alerte urgente / Priorité haute</option>
                  <option value="chat_alert">💬 Rappel clavardage / Client</option>
                  <option value="new_quote">✈️ Devis / Opportunité</option>
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <input
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="Titre de la notification (ex: Réunion d'équipe à 14h, Alerte promo Sud...)"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-[#338b84] focus:outline-hidden font-semibold"
                required
              />
            </div>

            {/* Message */}
            <div>
              <textarea
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                rows={2}
                placeholder="Contenu du message envoyé aux agents..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              {sendSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Notification envoyée avec succès !
                </span>
              )}
              <button
                type="submit"
                disabled={isSending || !notifTitle.trim() || !notifMessage.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#338b84] hover:bg-[#286f6a] text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSending ? 'Envoi...' : 'Envoyer la notification'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {visibleNotifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Bell className="h-6 w-6 opacity-60" />
              </div>
              <p className="text-xs font-semibold text-slate-600">Aucune notification pour le moment.</p>
              <p className="text-[11px] text-slate-400">Toutes les notifications ont été traitées ou vidées.</p>
            </div>
          ) : (
            visibleNotifications.map((notif) => {
              const isTargetSpecific = notif.targetUserId && notif.targetUserId !== 'all';
              const isRead = notif.read || notif.isRead;

              return (
                <div
                  key={notif.id}
                  className={`group relative p-3 rounded-xl border transition-all flex items-start gap-3 ${
                    isRead
                      ? 'bg-white border-slate-200 opacity-80'
                      : 'bg-[#f0f8f7] border-[#b5e1dc] shadow-2xs'
                  }`}
                >
                  <div
                    onClick={() => onSelectNotification && onSelectNotification(notif)}
                    className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0 mt-0.5 cursor-pointer"
                  >
                    {getIcon(notif.type)}
                  </div>

                  <div
                    onClick={() => onSelectNotification && onSelectNotification(notif)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-bold text-slate-900 text-xs truncate">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {notif.timestamp || notif.createdAt
                          ? new Date(notif.timestamp || notif.createdAt).toLocaleTimeString('fr-CA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>

                    {/* Target and Sender Badges */}
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {isTargetSpecific ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          🎯 Pour : {notif.targetUserName || 'Collaborateur'}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          📢 Pour tout le monde
                        </span>
                      )}
                      {notif.senderName && (
                        <span className="text-[10px] text-slate-400">
                          De : {notif.senderName}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* Delete individual notification button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNotification(notif.id);
                    }}
                    title="Supprimer cette notification"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Notifications push en temps réel</span>
          <span className="text-slate-400">Évasion Soleil Pro</span>
        </div>
      </div>
    </div>
  );
};
