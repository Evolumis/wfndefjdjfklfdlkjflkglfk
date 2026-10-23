import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  Phone,
  Mail,
  Check,
  ExternalLink,
  Sun,
  UserCheck,
  Clock,
  Ban,
  Globe,
  FileText,
  PhoneCall,
  Headphones
} from 'lucide-react';
import { ChatbotSettings, ChatMessage, ChatConversation } from '../types';
import { getSafeAvatar, getInitialsAvatarUrl } from '../utils/avatarUtils';

interface StandaloneChatWidgetProps {
  settings: ChatbotSettings;
}

// In-memory fallback in case localStorage / sessionStorage is blocked in cross-origin iframes
const memoryStore: Record<string, string> = {};
const safeStorage = {
  getSession(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return memoryStore[key] || null;
    }
  },
  setSession(key: string, val: string): void {
    try {
      sessionStorage.setItem(key, val);
    } catch {
      memoryStore[key] = val;
    }
  },
  getLocal(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStore[key] || null;
    }
  },
  setLocal(key: string, val: string): void {
    try {
      localStorage.setItem(key, val);
    } catch {
      memoryStore[key] = val;
    }
  },
};

export const StandaloneChatWidget: React.FC<StandaloneChatWidgetProps> = ({ settings }) => {
  // Session & Local-based persistent conversation ID to ensure zero chat history loss
  const [conversationId] = useState<string>(() => {
    let saved = safeStorage.getLocal('es_visitor_conv_id') || safeStorage.getSession('es_visitor_conv_id');
    if (!saved) {
      saved = `conv_vis_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      safeStorage.setLocal('es_visitor_conv_id', saved);
      safeStorage.setSession('es_visitor_conv_id', saved);
    }
    return saved;
  });

  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_init',
      conversationId,
      sender: 'bot',
      senderName: settings.botName,
      senderTag: settings.botTag,
      text: settings.welcomeMessage,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string>('');
  const [visitorIp, setVisitorIp] = useState('142.112.98.45');

  // Interactive contact transfer card
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState(() => safeStorage.getLocal('martine_visitor_name') || '');
  const [contactPhone, setContactPhone] = useState(() => safeStorage.getLocal('martine_visitor_phone') || '');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [callbackRequested, setCallbackRequested] = useState(false);

  // Live Agent Availability Status (Green when online, Blue when no agent available)
  const [agentsAvailability, setAgentsAvailability] = useState<{
    totalAgents: number;
    availableAgents: number;
    status: 'disponible' | 'indisponible';
    availableList: any[];
  }>({
    totalAgents: 0,
    availableAgents: 0,
    status: 'indisponible',
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

  const hasAgentsOnline = agentsAvailability.availableAgents > 0;

  // Default to closed in widget embed mode so it never blocks the host site on load
  const [isClosed, setIsClosed] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('start_open') === 'true') return false;
    } catch {}
    return true;
  });

  const chatCardRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(messages.length);

  // Dynamic adaptive resizing: communicate exact dimensions to parent iframe to eliminate empty white space
  const notifyDimensions = useCallback(() => {
    if (isClosed) {
      try {
        window.parent?.postMessage({
          type: 'MARTINE_RESIZE',
          isOpen: false,
          width: 260,
          height: 72,
        }, '*');
        window.parent?.postMessage({ type: 'CLOSE_MARTINE_WIDGET' }, '*');
      } catch {}
    } else {
      let computedHeight = 520;
      if (chatCardRef.current) {
        // Measure exact card height including borders & padding
        const rect = chatCardRef.current.getBoundingClientRect();
        computedHeight = Math.ceil(rect.height || chatCardRef.current.scrollHeight || 520);
      }
      // Clamped between comfortable min (300px) and max comfortable mobile/desktop height (640px)
      computedHeight = Math.min(Math.max(computedHeight, 300), 640);

      try {
        window.parent?.postMessage({
          type: 'MARTINE_RESIZE',
          isOpen: true,
          width: 420,
          height: computedHeight,
        }, '*');
        window.parent?.postMessage({
          type: 'OPEN_MARTINE_WIDGET',
          height: computedHeight,
        }, '*');
      } catch {}
    }
  }, [isClosed]);

  // Transparency enforcement on html & body: NEVER display a white box when closed
  useEffect(() => {
    // Only apply widget-chat-mode when in standalone chat embed mode (e.g., iframe on evasionsoleil.com)
    const isStandalone = typeof window !== 'undefined' && (
      window.location.search.includes('mode=widget_chat') ||
      window.location.search.includes('mode=chat') ||
      window.location.pathname === '/chat' ||
      window.location.pathname === '/embed/chat' ||
      window.location.hash === '#chat'
    );

    if (isStandalone) {
      try {
        document.documentElement.classList.add('widget-chat-mode');
        document.body.classList.add('widget-chat-mode');
        document.documentElement.style.setProperty('background', 'transparent', 'important');
        document.documentElement.style.setProperty('background-color', 'transparent', 'important');
        document.body.style.setProperty('background', 'transparent', 'important');
        document.body.style.setProperty('background-color', 'transparent', 'important');
        document.body.classList.remove('bg-slate-50');
      } catch {}
    } else {
      // Ensure widget-chat-mode is cleaned up if inside the dashboard
      try {
        document.documentElement.classList.remove('widget-chat-mode');
        document.body.classList.remove('widget-chat-mode');
        document.documentElement.style.removeProperty('background');
        document.documentElement.style.removeProperty('background-color');
        document.body.style.removeProperty('background');
        document.body.style.removeProperty('background-color');
      } catch {}
    }

    notifyDimensions();

    return () => {
      try {
        document.documentElement.classList.remove('widget-chat-mode');
        document.body.classList.remove('widget-chat-mode');
        document.documentElement.style.removeProperty('background');
        document.documentElement.style.removeProperty('background-color');
        document.body.style.removeProperty('background');
        document.body.style.removeProperty('background-color');
      } catch {}
    };
  }, [isClosed, notifyDimensions]);

  // Auto-adapt height whenever content, messages, contact form or bot status changes
  useEffect(() => {
    notifyDimensions();

    if (!isClosed && chatCardRef.current && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        notifyDimensions();
      });
      observer.observe(chatCardRef.current);
      return () => observer.disconnect();
    }
  }, [isClosed, notifyDimensions, messages.length, isBotTyping, showContactForm]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      // Smoothly scroll only the inside chat container
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length, isBotTyping, showContactForm]);

  // Poll conversation state every 3 seconds to catch agent join, timeout intervention, or agent replies
  const fetchConversationState = async () => {
    try {
      const res = await fetch(`/api/chatbot/conversations/${conversationId}`);
      if (res.ok) {
        const data: ChatConversation = await res.json();
        setConversation(data);
        if (data.visitorIp) {
          setVisitorIp(data.visitorIp);
        }
        if (data.visitorName && data.visitorName !== 'Visiteur') {
          setContactName((prev) => prev || data.visitorName);
        }
        if (data.visitorPhone) {
          setContactPhone((prev) => prev || data.visitorPhone || '');
        }
        if (data.isBlocked) {
          setIsBlocked(true);
          setBlockReason(data.blockReason || "Non-respect des conditions d'utilisation");
        } else {
          setIsBlocked(false);
          setBlockReason('');
        }
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      }
    } catch {
      // Ignore polling errors
    }
  };

  useEffect(() => {
    fetchConversationState();
    const interval = setInterval(fetchConversationState, 3000);
    return () => clearInterval(interval);
  }, [conversationId]);

  // Send message from visitor
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isBlocked) return;

    if (!customText) setInputText('');

    const isAgentConnected = Boolean(conversation?.agentJoined || conversation?.botEnabledForConv === false);

    const newMsg: ChatMessage = {
      id: `vis_${Date.now()}`,
      conversationId,
      sender: 'visitor',
      senderName: contactName || conversation?.visitorName || 'Vous',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);

    // Si un conseiller a rejoint la conversation, Martine est automatiquement désactivée (pas d'animation d'écriture)
    if (!isAgentConnected) {
      setIsBotTyping(true);
    }

    try {
      const res = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          text: textToSend,
          visitorName: contactName || undefined,
          visitorPhone: contactPhone || undefined,
        }),
      });

      const data = await res.json();

      if (res.status === 403 || data.isBlocked) {
        setIsBlocked(true);
        if (data.blockReason) {
          setBlockReason(data.blockReason);
        }
        return;
      }

      if (res.ok) {
        if (data.botMessage) {
          setMessages((prev) => [...prev, data.botMessage]);
        }
        if (data.conversation) {
          setConversation(data.conversation);
          if (data.conversation.visitorIp) setVisitorIp(data.conversation.visitorIp);
        }
        if (data.requiresContactInfo) {
          setShowContactForm(true);
        }
      }
    } catch {
      if (!isAgentConnected) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_err_${Date.now()}`,
            conversationId,
            sender: 'bot',
            senderName: settings.botName,
            senderTag: settings.botTag,
            text: settings.botEnabled
              ? "Je suis disponible pour vous aider avec vos vacances au soleil ou préparer votre devis !"
              : settings.offlineMessage,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setIsBotTyping(false);
    }
  };

  // Facilite grandement la mise en relation avec un conseiller humain
  const handleTriggerAgentTransfer = async () => {
    if (conversation?.agentJoined) return;

    const storedName = (contactName || safeStorage.getLocal('martine_visitor_name') || '').trim();
    const storedPhone = (contactPhone || safeStorage.getLocal('martine_visitor_phone') || '').trim();

    if (storedName && storedPhone) {
      // Transfert instantané direct en 1 clic
      setContactSubmitting(true);
      try {
        const res = await fetch('/api/chatbot/request-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            visitorName: storedName,
            visitorPhone: storedPhone,
          }),
        });
        const data = await res.json();
        if (data.success && data.conversation) {
          setConversation(data.conversation);
          if (data.conversation.messages) {
            setMessages(data.conversation.messages);
          }
          setShowContactForm(false);
        }
      } catch (err) {
        console.error('Error connecting to agent:', err);
      } finally {
        setContactSubmitting(false);
      }
    } else {
      setShowContactForm(true);
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  // Submit contact info to trigger transfer
  const handleSubmitContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;

    safeStorage.setLocal('martine_visitor_name', contactName.trim());
    safeStorage.setLocal('martine_visitor_phone', contactPhone.trim());

    setContactSubmitting(true);
    try {
      const res = await fetch('/api/chatbot/request-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          visitorName: contactName.trim(),
          visitorPhone: contactPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.conversation) {
        setConversation(data.conversation);
        if (data.conversation.messages) {
          setMessages(data.conversation.messages);
        }
        setShowContactForm(false);
      }
    } catch {
      const text = `Bonjour, je souhaite parler en direct avec un conseiller. Nom : ${contactName.trim()}, Téléphone : ${contactPhone.trim()}`;
      setShowContactForm(false);
      await handleSendMessage(undefined, text);
    } finally {
      setContactSubmitting(false);
    }
  };

  // Request a callback when timeout intervention occurs
  const handleRequestCallback = async () => {
    const phone = contactPhone || conversation?.visitorPhone || prompt('À quel numéro de téléphone souhaitez-vous être rappelé ?');
    if (!phone) return;

    try {
      const res = await fetch('/api/chatbot/request-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          phone,
        }),
      });
      if (res.ok) {
        setCallbackRequested(true);
        fetchConversationState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // If closed: render the circular Martine launcher with "Parlez avec nous" pill beside it
  // Container is transparent & pointer-events-none so it NEVER shows a white box or blocks host page clicks
  if (isClosed) {
    return (
      <div className="w-full h-full bg-transparent flex items-end justify-end p-1 select-none overflow-visible">
        <div className="flex items-center gap-2 pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Pill "Parlez avec nous" beside Martine circle */}
          <button
            id="open-martine-pill-btn"
            type="button"
            onClick={() => {
              setIsClosed(false);
            }}
            className="bg-white hover:bg-[#f0f8f7] text-slate-900 hover:text-[#338b84] font-extrabold text-xs px-3.5 py-2 rounded-full shadow-lg border border-[#338b84]/30 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap"
          >
            {hasAgentsOnline ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>En ligne &bull; Clavarder</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                <span>Aucun agent disponible</span>
              </>
            )}
          </button>

          {/* Cercle Martine */}
          <button
            id="open-martine-circle-btn"
            type="button"
            onClick={() => {
              setIsClosed(false);
            }}
            className="relative h-13 w-13 rounded-full bg-linear-to-br from-[#338b84] via-[#2d7d76] to-[#205753] shadow-xl flex items-center justify-center text-white cursor-pointer hover:scale-105 active:scale-95 transition-all ring-3 ring-[#338b84]/30 shrink-0"
            title={hasAgentsOnline ? 'En ligne - Conseillers disponibles' : 'Aucun agent disponible - Martine V. 24/7'}
          >
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
              alt="Martine V."
              className="h-full w-full rounded-full object-cover border-2 border-white"
              referrerPolicy="no-referrer"
            />
            {/* Pastille bleue si aucun agent disponible, verte si en ligne */}
            <span
              className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs ${
                hasAgentsOnline ? 'bg-emerald-500' : 'bg-sky-500'
              }`}
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-transparent flex items-end justify-end p-0 overflow-hidden">
      <div
        ref={chatCardRef}
        className="flex flex-col w-full max-w-[430px] sm:w-[430px] bg-white font-sans overflow-hidden rounded-2xl border border-slate-200/90 shadow-2xl transition-all duration-200"
        style={{ maxHeight: '640px', height: '580px' }}
      >
        {/* Header - Sleek & Spacious with #338b84 gradient */}
        <div className="bg-linear-to-r from-[#338b84] via-[#2d7d76] to-[#205753] text-white px-3.5 py-2.5 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold">
                <Bot className="h-5 w-5" />
              </div>
              {/* Pastille de statut : bleu si aucun agent disponible, vert si en ligne */}
              <span
                className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#205753] ${
                  hasAgentsOnline ? 'bg-emerald-400' : 'bg-sky-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                <span className="font-extrabold text-xs sm:text-sm">{settings.botName}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-white/20">
                  [{settings.botTag}]
                </span>
                {/* Pastille / Badge explicite */}
                {hasAgentsOnline ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-400/25 text-emerald-100 border border-emerald-300/30 flex items-center gap-1 shadow-2xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>En ligne</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-sky-400/25 text-sky-100 border border-sky-300/30 flex items-center gap-1 shadow-2xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                    <span>Aucun agent disponible</span>
                  </span>
                )}
                {conversation?.agentJoined && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-indigo-500 text-white flex items-center gap-1 shadow-2xs">
                    <UserCheck className="h-2 w-2" />
                    <span>En direct</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#daf0ed] leading-tight mt-0.5">
                {conversation?.agentJoined
                  ? `Assisté par ${conversation.agentJoined.name}`
                  : hasAgentsOnline
                  ? 'Conseillère Virtuelle & Conseillers en ligne'
                  : 'Martine V. 24/7 (Aucun agent disponible)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!conversation?.agentJoined && (
              <button
                type="button"
                id="header-request-agent-btn"
                onClick={handleTriggerAgentTransfer}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-extrabold text-[11px] transition-all cursor-pointer shadow-xs border border-white/30"
                title="Parler en direct avec un conseiller"
              >
                <Headphones className="h-3 w-3" />
                <span className="hidden sm:inline">Parler à un</span>
                <span>Agent</span>
              </button>
            )}

            <button
              type="button"
              id="close-martine-chat-btn"
              onClick={() => {
                setIsClosed(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all cursor-pointer shadow-xs border border-white/20"
              title="Fermer le clavardage"
            >
              <X className="h-3.5 w-3.5" />
              <span>Fermer</span>
            </button>
          </div>
        </div>

        {/* Fast Agent Connect Ribbon */}
        {!conversation?.agentJoined && conversation?.status !== 'waiting_agent' && (
          <div className="bg-[#eaf5f4] border-b border-[#338b84]/20 py-1.5 px-3 text-[11px] flex items-center justify-between text-[#1a4542] shrink-0">
            <div className="flex items-center gap-1.5">
              <Headphones className="h-3.5 w-3.5 text-[#338b84] shrink-0" />
              <span className="font-semibold text-slate-700">Besoin d'un humain ?</span>
            </div>
            <button
              type="button"
              onClick={handleTriggerAgentTransfer}
              className="px-2.5 py-0.5 rounded-full bg-[#338b84] hover:bg-[#286f6a] text-white font-extrabold text-[10px] shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Parler à un agent</span>
              <span>&rarr;</span>
            </button>
          </div>
        )}

        {/* Blocked IP Banner */}
        {isBlocked && (
          <div className="bg-rose-600 text-white p-3 text-xs space-y-1.5 shadow-md shrink-0 border-b border-rose-700">
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide">
              <Ban className="h-4 w-4 shrink-0" />
              <span>Accès suspendu (Adresse IP bannie)</span>
            </div>
            <div className="bg-rose-700/80 rounded-lg px-2.5 py-1.5 text-[11px] font-medium border border-rose-500/40">
              <span className="font-extrabold text-rose-100">Raison du bannissement : </span>
              <span className="text-white font-bold">{blockReason || "Non-respect des conditions d'utilisation"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold pt-0.5">
              <span>📧 Courriel : <a href="mailto:it@evasionsoleil.com" className="underline text-white">it@evasionsoleil.com</a></span>
              <span>📞 Tél : <a href="tel:4383737076" className="underline text-white">438-373-7076</a></span>
            </div>
          </div>
        )}

        {/* Active Agent Join Banner */}
        {conversation?.agentJoined && (
          <div className="bg-linear-to-r from-indigo-50 via-sky-50 to-[#f0f8f7] border-b border-indigo-200 py-1.5 px-3 text-xs flex items-center justify-between text-indigo-950 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <img
                  src={getSafeAvatar(conversation.agentJoined.avatar, conversation.agentJoined.name)}
                  alt={conversation.agentJoined.name}
                  className="h-7 w-7 rounded-full object-cover border border-indigo-400"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getInitialsAvatarUrl(conversation.agentJoined?.name);
                  }}
                />
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white animate-pulse" title="En direct" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-indigo-950 text-xs">{conversation.agentJoined.name}</span>
                  {conversation.agentJoined.tag && (
                    <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-indigo-600 text-white">
                      [{conversation.agentJoined.tag}]
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-indigo-800 flex items-center gap-1 mt-0.5 flex-wrap">
                  <span className="font-semibold text-slate-500">Rang:</span>
                  <span className="font-bold text-indigo-900">
                    {conversation.agentJoined.grade || 'Conseiller Voyages'}
                  </span>
                  <span className="text-emerald-700 font-bold">• En direct</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 border border-indigo-200 text-[10px] text-indigo-900 font-bold shadow-2xs">
              <Bot className="h-3 w-3 text-slate-400" />
              <span>Martine désactivée</span>
            </div>
          </div>
        )}

        {/* Waiting Status Banner */}
        {conversation?.status === 'waiting_agent' && !conversation.agentJoined && (
          <div className="bg-[#f0f8f7] border-b border-[#daf0ed] py-1 px-3 text-[10px] font-bold text-[#1a4542] flex items-center gap-1.5 shrink-0">
            <Clock className="h-3 w-3 text-[#286f6a] animate-spin" />
            <span>Transfert en cours vers un conseiller disponible...</span>
          </div>
        )}

        {/* Messages Stream - Adaptive spacious height */}
        <div
          ref={scrollContainerRef}
          className="p-3 overflow-y-auto space-y-2.5 bg-slate-50/60 flex-1"
          style={{ minHeight: '220px', maxHeight: '420px' }}
        >
          {messages.map((msg) => {
            const isVisitor = msg.sender === 'visitor';
            const isAgent = msg.sender === 'agent';
            const isBot = msg.sender === 'bot';

            // Join Notice Notification
            if (msg.isJoinNotice) {
              const joinAvatar = getSafeAvatar(
                msg.senderAvatar || conversation?.agentJoined?.avatar,
                msg.senderName || conversation?.agentJoined?.name
              );
              const joinGrade = msg.senderGrade || conversation?.agentJoined?.grade || 'Conseiller Voyages';
              return (
                <div
                  key={msg.id}
                  className="my-1.5 mx-auto max-w-md p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 shadow-2xs flex items-center gap-2 animate-in fade-in"
                >
                  <div className="relative shrink-0">
                    <img
                      src={joinAvatar}
                      alt={msg.senderName}
                      className="h-8 w-8 rounded-full object-cover border border-indigo-400"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getInitialsAvatarUrl(msg.senderName);
                      }}
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-extrabold text-indigo-950 text-xs">{msg.senderName}</span>
                      <span className="text-[10px] text-indigo-700">a rejoint le chat</span>
                    </div>
                    <div className="text-[10px] text-indigo-800 mt-0.5 flex items-center gap-1 flex-wrap">
                      <span className="font-bold text-slate-500">Rang:</span>
                      <span className="font-bold px-1.5 py-0.2 rounded bg-white border border-indigo-200 text-indigo-900">
                        {joinGrade}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            // Timeout Intervention (Offer quote form or callback)
            if (msg.isTimeoutIntervention) {
              return (
                <div
                  key={msg.id}
                  className="my-1.5 mx-auto max-w-md p-2.5 rounded-xl bg-[#f0f8f7] border border-[#b5e1dc] text-xs text-slate-800 shadow-xs space-y-1.5 animate-in fade-in"
                >
                  <div className="flex items-center gap-1 font-black text-[#143734] text-xs">
                    <Sparkles className="h-3 w-3 text-[#286f6a]" />
                    <span>{settings.botName} : Proposition d'aide immédiate</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-[11px]">{msg.text}</p>

                  {/* The 2 requested choices */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                    <a
                      href={settings.quoteRedirectUrl || 'https://evasionsoleil.com/devis'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1 p-2 bg-[#338b84] hover:bg-[#286f6a] text-white rounded-lg font-bold text-[11px] shadow-xs transition-colors text-center"
                    >
                      <FileText className="h-3 w-3" />
                      <span>Soumission rapide (4h)</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleRequestCallback}
                      disabled={callbackRequested}
                      className="flex items-center justify-center gap-1 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-emerald-600 text-white rounded-lg font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
                    >
                      {callbackRequested ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Rappel confirmé !</span>
                        </>
                      ) : (
                        <>
                          <PhoneCall className="h-3 w-3" />
                          <span>Demander un rappel</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            }

            const avatarUrl = isBot
              ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
              : isAgent
              ? getSafeAvatar(msg.senderAvatar || conversation?.agentJoined?.avatar, msg.senderName)
              : null;

            const displayGrade = isBot
              ? 'Conseillère Virtuelle IA'
              : isAgent
              ? msg.senderGrade || conversation?.agentJoined?.grade || 'Conseiller Voyages'
              : null;

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isVisitor ? 'justify-end' : 'justify-start'} group`}
              >
                {!isVisitor && avatarUrl && (
                  <div className="relative shrink-0 mt-0.5">
                    <img
                      src={avatarUrl}
                      alt={msg.senderName}
                      className={`h-7 w-7 rounded-full object-cover border ${
                        isBot ? 'border-[#55b0a7]' : 'border-indigo-400'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                    {isBot ? (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-[#338b84] text-white rounded-full p-0.5" title="IA">
                        <Sun className="h-2 w-2" />
                      </div>
                    ) : (
                      <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-white" title="En direct" />
                    )}
                  </div>
                )}

                <div className={`flex flex-col ${isVisitor ? 'items-end' : 'items-start'} max-w-[85%]`}>
                  {/* Sender Name, Rang / Grade et Tags */}
                  <div className="flex items-center gap-1 mb-0.5 px-1 text-[10px] text-slate-500 flex-wrap">
                    <span className="font-extrabold text-slate-800">{msg.senderName}</span>

                    {displayGrade && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-black border ${
                          isBot
                            ? 'bg-[#daf0ed] text-[#143734] border-[#b5e1dc]'
                            : 'bg-indigo-100 text-indigo-900 border-indigo-200'
                        }`}
                      >
                        {displayGrade}
                      </span>
                    )}

                    {msg.senderTags && msg.senderTags.length > 0 ? (
                      msg.senderTags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-1 py-0.2 rounded text-[8px] font-black uppercase text-white ${
                            isBot ? 'bg-[#338b84]' : 'bg-indigo-600'
                          }`}
                        >
                          [{tag}]
                        </span>
                      ))
                    ) : msg.senderTag ? (
                      <span
                        className={`px-1 py-0.2 rounded text-[8px] font-black uppercase text-white ${
                          isBot ? 'bg-[#338b84]' : 'bg-indigo-600'
                        }`}
                      >
                        [{msg.senderTag}]
                      </span>
                    ) : null}

                    <span className="text-[9px] text-slate-400">
                      &bull; {new Date(msg.timestamp).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-xl px-3 py-1.5 text-xs leading-relaxed shadow-2xs ${
                      isVisitor
                        ? 'bg-[#338b84] text-white rounded-br-none'
                        : isAgent
                        ? 'bg-indigo-600 text-white rounded-tl-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* Options de réponse interactives & tags suggérés par Martine V. */}
                  {isBot && msg.suggestedTags && msg.suggestedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {msg.suggestedTags.map((tag, tagIdx) => (
                        <button
                          key={`${tag}-${tagIdx}`}
                          type="button"
                          onClick={() => handleSendMessage(undefined, tag)}
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#eef7f6] hover:bg-[#338b84] text-[#1c5d57] hover:text-white border border-[#338b84]/30 shadow-2xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                          title={`Cliquer pour répondre : ${tag}`}
                        >
                          <span>💬</span>
                          <span>{tag}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Interactive Contact Prompt Card (Enforces Name + Phone before human handoff) */}
          {showContactForm && (
            <form
              onSubmit={handleSubmitContactInfo}
              className="my-2 p-2.5 bg-[#f0f8f7] border border-[#b5e1dc] rounded-xl shadow-xs space-y-2 max-w-sm animate-in fade-in"
            >
              <div className="flex items-center gap-1.5 text-[#143734] font-extrabold text-xs">
                <Phone className="h-3.5 w-3.5 text-[#286f6a]" />
                <span>Coordonnées requises pour le transfert</span>
              </div>
              <p className="text-[10px] text-slate-600 leading-tight">
                Indiquez votre nom et téléphone pour qu'un conseiller prenne en charge votre dossier :
              </p>

              <div className="space-y-1.5">
                <input
                  type="text"
                  required
                  placeholder="Votre nom complet *"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                />
                <input
                  type="tel"
                  required
                  placeholder="Votre numéro de téléphone *"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={contactSubmitting || !contactName.trim() || !contactPhone.trim()}
                  className="px-3 py-1.5 bg-[#338b84] hover:bg-[#286f6a] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer disabled:opacity-40"
                >
                  {contactSubmitting ? 'Transfert...' : 'Transférer à l\'équipe'}
                </button>
              </div>
            </form>
          )}

          {/* Bot Typing Indicator */}
          {isBotTyping && (
            <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-lg border border-slate-200 w-fit text-[11px] text-slate-400">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" />
                <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
              <span>{settings.botName} écrit...</span>
            </div>
          )}
        </div>

        {/* Quick Action Suggestion Chips & Tags de réponse IA */}
        {!isBlocked && (
          <div className="px-2.5 py-1.5 bg-slate-50/90 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {!conversation?.agentJoined && (
              <button
                type="button"
                onClick={handleTriggerAgentTransfer}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#eaf5f4] hover:bg-[#338b84] text-[#1e5d58] hover:text-white border border-[#338b84]/30 transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs active:scale-95"
              >
                <Headphones className="h-3 w-3 text-[#338b84]" />
                <span>Parler à un agent</span>
              </button>
            )}
            {(settings.quickReplyOptions && settings.quickReplyOptions.length > 0
              ? settings.quickReplyOptions
              : [
                  'Faire une soumission',
                  'Forfaits tout-inclus 5★',
                  'Croisières Caraïbes',
                  'Dernière minute',
                  'Vacances en famille',
                  'Demander un devis',
                ]
            ).map((quickText) => (
              <button
                key={quickText}
                type="button"
                onClick={() => handleSendMessage(undefined, quickText)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-white hover:bg-[#338b84] border border-slate-200 hover:border-[#338b84] text-slate-700 hover:text-white transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1"
                title={`Envoyer : ${quickText}`}
              >
                <span>🏷️</span>
                <span>{quickText}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={(e) => handleSendMessage(e)} className="p-2 border-t border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              disabled={isBlocked}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isBlocked
                  ? "Clavardage désactivé"
                  : conversation?.agentJoined
                  ? `Écrivez directement à ${conversation.agentJoined.name}...`
                  : conversation?.status === 'waiting_agent'
                  ? "Votre conseiller arrive, écrivez votre message..."
                  : "Posez votre question ou demandez un conseiller..."
              }
              className="flex-1 bg-slate-100 border border-slate-300/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#338b84] focus:outline-hidden disabled:bg-slate-200 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isBlocked}
              className="p-2 rounded-xl bg-[#338b84] hover:bg-[#286f6a] text-white transition-all disabled:opacity-40 cursor-pointer shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Visitor IP Display Footer */}
          <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 px-0.5">
            <div className="flex items-center gap-1 font-mono">
              <Globe className="h-2.5 w-2.5 text-slate-400" />
              <span>IP Session : {visitorIp}</span>
            </div>
            <span>Évasion Soleil &bull; evasionsoleil.com</span>
          </div>
        </form>
      </div>
    </div>
  );
};
