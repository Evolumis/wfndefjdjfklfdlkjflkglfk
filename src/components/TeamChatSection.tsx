import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  Users,
  Smile,
  X,
  CheckCheck
} from 'lucide-react';
import { TeamMessage, User, FileAttachment } from '../types';
import { getSafeAvatar, getInitialsAvatarUrl } from '../utils/avatarUtils';

interface TeamChatSectionProps {
  currentUser: User;
  allUsers: User[];
  messages: TeamMessage[];
  onSendMessage: (text: string, attachments?: FileAttachment[]) => Promise<void>;
  onClearChat?: () => Promise<void>;
}

export const TeamChatSection: React.FC<TeamChatSectionProps> = ({
  currentUser,
  allUsers,
  messages,
  onSendMessage,
  onClearChat,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevCountRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        const newAttachment: FileAttachment = {
          id: `att_${Date.now()}_${i}`,
          name: file.name,
          size: `${Math.round(file.size / 1024)} KB`,
          type: file.type.includes('image') ? 'image' : file.type.includes('pdf') ? 'pdf' : 'doc',
          url: base64Url,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };

      reader.readAsDataURL(file);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;

    setIsSending(true);
    try {
      await onSendMessage(inputText.trim(), attachments);
      setInputText('');
      setAttachments([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span>Canal Général &bull; Équipe Évasion Soleil</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                En direct
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Discussions internes, partage de devis, grilles tarifaires et suivi des dossiers
            </p>
          </div>
        </div>

        {/* Online team members avatars */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2 overflow-hidden">
            {allUsers.map((u) => (
              <img
                key={u.id}
                src={getSafeAvatar(u.avatar, u.name)}
                alt={u.name}
                title={`${u.name} (${u.grade})`}
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getInitialsAvatarUrl(u.name);
                }}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
            {allUsers.length} conseillers
          </span>
          {onClearChat && messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Voulez-vous vraiment vider l\'historique du chat d\'équipe ?')) {
                  onClearChat();
                }
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Vider le chat d'équipe"
            >
              Vider le chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollContainerRef} className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 my-auto">
            <div className="h-16 w-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#338b84] mb-3 shadow-xs">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Le canal d'équipe est vide</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Aucun message pour l'instant. Démarrez la conversation, partagez des devis ou posez une question à vos collègues ci-dessous.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
          const isMe = msg.userId === currentUser.id;
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <img
                src={getSafeAvatar(msg.userAvatar, msg.userName)}
                alt={msg.userName}
                className="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-200 mt-1 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getInitialsAvatarUrl(msg.userName);
                }}
              />

              {/* Message Content Container */}
              <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Name, Tag & Grade */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-xs flex-wrap">
                  <span className="font-bold text-slate-900">{msg.userName}</span>
                  {msg.userTags && msg.userTags.length > 0 ? (
                    msg.userTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-indigo-600 text-white"
                      >
                        [{tag}]
                      </span>
                    ))
                  ) : msg.userTag ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500 text-white">
                      [{msg.userTag}]
                    </span>
                  ) : null}
                  <span className="text-slate-400 text-[11px]">&bull; {msg.userGrade}</span>
                  <span className="text-slate-400 text-[10px] ml-1">
                    {new Date(msg.timestamp).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-amber-500 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                  {/* Render Attachments if any */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className={`mt-2.5 space-y-2 ${msg.text ? 'pt-2 border-t border-white/20' : ''}`}>
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className={`flex items-center gap-2 p-2 rounded-xl text-xs ${
                            isMe ? 'bg-amber-600/60 text-white' : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {att.type === 'image' ? (
                            <ImageIcon className="h-4 w-4 shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{att.name}</p>
                            <span className="text-[10px] opacity-75">{att.size}</span>
                          </div>
                          {att.url && (
                            <a
                              href={att.url}
                              download={att.name}
                              target="_blank"
                              rel="noreferrer"
                              className={`p-1 rounded-lg ${
                                isMe ? 'hover:bg-amber-700' : 'hover:bg-slate-200'
                              }`}
                              title="Télécharger la pièce jointe"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Attachments Preview Pill */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs text-slate-700 shadow-2xs"
            >
              <Paperclip className="h-3 w-3 text-slate-400" />
              <span className="max-w-[150px] truncate font-medium">{att.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(att.id)}
                className="text-slate-400 hover:text-rose-600 ml-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          {/* File attachment hidden input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Joindre un fichier ou devis (PDF, Image, Doc)"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Écrire à l'équipe en tant que ${currentUser.name} (${currentUser.grade})...`}
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />

          <button
            type="submit"
            disabled={isSending || (!inputText.trim() && attachments.length === 0)}
            className="px-5 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Envoyer</span>
          </button>
        </div>
      </form>
    </div>
  );
};
