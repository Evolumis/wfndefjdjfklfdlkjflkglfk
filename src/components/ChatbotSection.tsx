import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bot,
  Power,
  Send,
  Sparkles,
  Settings2,
  Copy,
  Check,
  User as UserIcon,
  HelpCircle,
  ExternalLink,
  Mail,
  ShieldCheck,
  RefreshCw,
  MessageSquare,
  Globe,
  Shield,
  Ban,
  Lock,
  Phone,
  Clock,
  AlertTriangle,
  Search,
  CheckCircle2,
  UserCheck,
  UserX,
  Headphones,
  X,
  Code,
  Archive,
  Trash2,
  Sun,
  RotateCw,
  CornerDownLeft
} from 'lucide-react';
import { ChatbotSettings, ChatMessage, ChatConversation, User } from '../types';
import { getSafeAvatar, getInitialsAvatarUrl } from '../utils/avatarUtils';

interface ChatbotSectionProps {
  settings: ChatbotSettings;
  onUpdateSettings: (newSettings: Partial<ChatbotSettings>) => Promise<void>;
  currentUser: User;
  allUsers?: User[];
  onUpdateUserStatus?: (userId: string, newStatus: 'disponible' | 'indisponible') => Promise<any>;
}

export const ChatbotSection: React.FC<ChatbotSectionProps> = ({
  settings,
  onUpdateSettings,
  currentUser,
  allUsers = [],
  onUpdateUserStatus,
}) => {
  // Security check: HTML Integration strictly reserved for Super Admin
  const isSuperAdmin =
    currentUser?.role === 'super_admin' ||
    currentUser?.username?.toLowerCase() === 'admin';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'conversations' | 'agents' | 'ip_security' | 'config' | 'embed'>('conversations');
  const [localSettings, setLocalSettings] = useState<ChatbotSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Live Agents Availability (Green when online, Blue when no agent available)
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

  const [managedUsers, setManagedUsers] = useState<User[]>(allUsers || []);

  const fetchAgentsStatus = async () => {
    try {
      const res = await fetch('/api/agents/status');
      if (res.ok) {
        const data = await res.json();
        setAgentsAvailability(data);
        if (data.allAgents) {
          setManagedUsers(data.allAgents);
        }
      }
    } catch (err) {
      console.warn('Failed to load agents status:', err);
    }
  };

  useEffect(() => {
    fetchAgentsStatus();
    const interval = setInterval(fetchAgentsStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize when allUsers prop changes
  useEffect(() => {
    if (allUsers && allUsers.length > 0) {
      setManagedUsers(allUsers);
    }
  }, [allUsers]);

  // Mode de filtrage pour voir les conseillers Disponibles ou Indisponibles
  const [agentViewMode, setAgentViewMode] = useState<'all' | 'disponible' | 'indisponible'>('all');

  // Update a specific agent's status (disponible / indisponible)
  const handleToggleAgentStatus = async (userId: string, newStatus: 'disponible' | 'indisponible') => {
    // 1. Optimistic update immediately
    setManagedUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );
    setAgentsAvailability((prev) => {
      const updatedList = (prev.availableList || []).map((a) =>
        a.id === userId ? { ...a, status: newStatus } : a
      );
      const available = updatedList.filter((a) => a.status !== 'indisponible');
      return {
        ...prev,
        availableAgents: available.length,
        status: available.length > 0 ? 'disponible' : 'indisponible',
        availableList: updatedList,
      };
    });

    try {
      if (onUpdateUserStatus) {
        await onUpdateUserStatus(userId, newStatus);
      } else {
        await fetch(`/api/users/${userId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
      }
      fetchAgentsStatus();
    } catch (err) {
      console.error('Failed to update agent status:', err);
    }
  };

  // Batch toggle all agents status
  const handleBatchToggleStatus = async (newStatus: 'disponible' | 'indisponible') => {
    // 1. Optimistic update immediately
    setManagedUsers((prev) => prev.map((u) => ({ ...u, status: newStatus })));
    setAgentsAvailability((prev) => ({
      ...prev,
      availableAgents: newStatus === 'disponible' ? prev.totalAgents : 0,
      status: newStatus,
      availableList: (prev.availableList || []).map((a) => ({ ...a, status: newStatus })),
    }));

    try {
      const res = await fetch('/api/agents/batch-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success && data.users) {
        setManagedUsers(data.users);
        if (data.availability) setAgentsAvailability(data.availability);
      }
      fetchAgentsStatus();
    } catch (err) {
      console.error('Failed to batch update agents status:', err);
    }
  };

  // OpenAI Test Connection & Fallback verification
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [testAiResult, setTestAiResult] = useState<{
    success: boolean;
    message: string;
    error?: string;
    fallbackActive?: boolean;
    previewResponse?: string;
  } | null>(null);

  const handleTestOpenAi = async () => {
    setIsTestingAi(true);
    setTestAiResult(null);
    try {
      const res = await fetch('/api/chatbot/test-openai', { method: 'POST' });
      const data = await res.json();
      setTestAiResult(data);
      fetchAiStatus();
    } catch (err: any) {
      setTestAiResult({
        success: false,
        message: 'Erreur réseau lors du test de l\'API OpenAI',
        error: err.message,
        fallbackActive: true,
      });
    } finally {
      setIsTestingAi(false);
    }
  };

  // Live conversations state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [isLoadingConvs, setIsLoadingConvs] = useState(false);
  const [convSearch, setConvSearch] = useState('');
  const [convStatusFilter, setConvStatusFilter] = useState<'all' | 'active' | 'resolved' | 'archived'>('all');
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  
  // AI Engine Status (Martine V. operates on OpenAI exclusively)
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string; maskedKey: string | null } | null>(null);

  const fetchAiStatus = async () => {
    try {
      const res = await fetch('/api/chatbot/ai-status');
      const data = await res.json();
      setAiStatus(data);
    } catch (err) {
      console.warn('Failed to load AI status:', err);
    }
  };

  useEffect(() => {
    fetchAiStatus();
  }, []);
  
  // Special Tags toggle button in chat: ON / OFF for ADMIN, IT, etc. (user requested)
  const userAvailableTags = useMemo(() => {
    const list: string[] = [];
    if (
      currentUser?.role === 'admin' ||
      currentUser?.role === 'super_admin' ||
      currentUser?.specialTags?.includes('ADMIN') ||
      currentUser?.specialTag === 'ADMIN'
    ) {
      list.push('ADMIN');
    }
    if (currentUser?.specialTags && currentUser.specialTags.length > 0) {
      currentUser.specialTags.forEach((t) => {
        if (!list.includes(t)) list.push(t);
      });
    } else if (currentUser?.specialTag && !list.includes(currentUser.specialTag)) {
      list.push(currentUser.specialTag);
    }
    return list;
  }, [currentUser]);

  const [tagToggles, setTagToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setTagToggles((prev) => {
      const next = { ...prev };
      userAvailableTags.forEach((tag) => {
        if (next[tag] === undefined) {
          // Conformément à la demande, les tags admin et spéciaux sont automatiquement à OFF par défaut
          next[tag] = false;
        }
      });
      return next;
    });
  }, [userAvailableTags]);

  const toggleSingleTag = (tag: string) => {
    setTagToggles((prev) => ({
      ...prev,
      [tag]: !prev[tag],
    }));
  };

  const getActiveTags = () => {
    return userAvailableTags.filter((tag) => Boolean(tagToggles[tag]));
  };

  // IP management state
  const [manualIpToBlock, setManualIpToBlock] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [ipActionLoading, setIpActionLoading] = useState(false);

  // Chat simulator state
  const [simMessages, setSimMessages] = useState<ChatMessage[]>([
    {
      id: 'demo_init',
      conversationId: 'sim_1',
      sender: 'bot',
      senderName: settings.botName,
      senderTag: settings.botTag,
      text: settings.welcomeMessage,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputVisitorText, setInputVisitorText] = useState('');
  const [inputAgentText, setInputAgentText] = useState('');
  const [isSimBotTyping, setIsSimBotTyping] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [newQuickTagInput, setNewQuickTagInput] = useState('');

  const defaultDomain = typeof window !== 'undefined' && window.location.hostname.includes('evasionsoleil.com')
    ? 'https://employe.evasionsoleil.com'
    : (typeof window !== 'undefined' ? window.location.origin : 'https://employe.evasionsoleil.com');
  const [customDomain, setCustomDomain] = useState(defaultDomain);

  // Container refs for scroll confinement (No scrollIntoView to avoid jumping entire page!)
  const liveChatContainerRef = useRef<HTMLDivElement>(null);
  const simChatContainerRef = useRef<HTMLDivElement>(null);
  const prevLiveMsgCountRef = useRef<number>(0);

  // Security check: Only IT or Admins can block/unblock IPs or edit bot config
  const isCurrentUserAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    Boolean(currentUser?.specialTags?.includes('IT')) ||
    Boolean(currentUser?.specialTags?.includes('ADMIN')) ||
    Boolean(currentUser?.permissions?.canAssignAdminTags) ||
    Boolean(currentUser?.permissions?.canManageBot);

  // Security guard: bounce non-admins from config or embed tab to conversations
  useEffect(() => {
    if (activeTab === 'config' && !isCurrentUserAdmin) {
      setActiveTab('conversations');
    }
    if (activeTab === 'embed' && !isSuperAdmin) {
      setActiveTab('conversations');
    }
  }, [activeTab, isCurrentUserAdmin, isSuperAdmin]);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Fetch live conversations from server
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/chatbot/conversations');
      if (res.ok) {
        const data: ChatConversation[] = await res.json();
        setConversations(data);
        if (!selectedConvId && data.length > 0) {
          // Auto select the first conversation or the one waiting
          const waiting = data.find((c) => c.status === 'waiting_agent' && !c.archived);
          setSelectedConvId(waiting ? waiting.id : data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
    // Poll every 3 seconds for live conversations & visitor replies
    const timer = setInterval(() => {
      fetchConversations();
    }, 3000);
    return () => clearInterval(timer);
  }, [selectedConvId]);

  // Selected conversation memo
  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId);
  }, [conversations, selectedConvId]);

  // Keep live chat scroll at bottom INSIDE container only - never scroll whole window!
  useEffect(() => {
    if (liveChatContainerRef.current) {
      liveChatContainerRef.current.scrollTop = liveChatContainerRef.current.scrollHeight;
    }
  }, [selectedConvId]);

  useEffect(() => {
    if (selectedConversation && selectedConversation.messages.length > prevLiveMsgCountRef.current) {
      if (liveChatContainerRef.current) {
        liveChatContainerRef.current.scrollTop = liveChatContainerRef.current.scrollHeight;
      }
      prevLiveMsgCountRef.current = selectedConversation.messages.length;
    }
  }, [selectedConversation?.messages.length]);

  useEffect(() => {
    if (simChatContainerRef.current) {
      simChatContainerRef.current.scrollTop = simChatContainerRef.current.scrollHeight;
    }
  }, [simMessages.length, isSimBotTyping]);

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Toggle Martine ON/OFF
  const handleToggleBot = async () => {
    const nextVal = !settings.botEnabled;
    await onUpdateSettings({ botEnabled: nextVal });
    setLocalSettings((prev) => ({ ...prev, botEnabled: nextVal }));
    showNotification(`Martine V. est maintenant ${nextVal ? 'ACTIVÉE (ON)' : 'ARRÊTÉE (OFF)'}`);
  };

  // Save Settings Form
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateSettings(localSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      showNotification('Paramètres de Martine V. enregistrés avec succès !');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Intervene in live chat (Agent joins conversation - automatically deactivates Martine)
  const handleAgentJoin = async (convId: string) => {
    try {
      const res = await fetch('/api/chatbot/agent-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          agentId: currentUser.id,
        }),
      });
      if (res.ok) {
        showNotification(`Vous avez rejoint la conversation. Martine V. a été désactivée automatiquement.`);
        fetchConversations();
      }
    } catch (err) {
      console.error('Error joining chat:', err);
    }
  };

  // Agent leaves conversation - reactivates Martine V.
  const handleAgentLeave = async (convId: string) => {
    try {
      const res = await fetch('/api/chatbot/agent-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          agentName: currentUser.name,
        }),
      });
      if (res.ok) {
        showNotification(`Vous avez quitté la discussion. Martine V. a été réactivée.`);
        fetchConversations();
      }
    } catch (err) {
      console.error('Error leaving chat:', err);
    }
  };

  // Agent sends live reply to visitor
  const handleSendLiveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvId) return;

    const activeTags = getActiveTags();
    setIsSendingReply(true);
    try {
      const res = await fetch('/api/chatbot/agent-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConvId,
          agentId: currentUser.id,
          text: replyText.trim(),
          showAdminTags: activeTags.length > 0,
          activeTags,
        }),
      });
      if (res.ok) {
        setReplyText('');
        fetchConversations();
        setTimeout(() => {
          if (liveChatContainerRef.current) {
            liveChatContainerRef.current.scrollTop = liveChatContainerRef.current.scrollHeight;
          }
        }, 80);
      }
    } catch (err) {
      console.error('Error sending agent reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Toggle Bot Martine V. for this specific conversation
  const handleToggleBotForConv = async (convId: string, currentStatus?: boolean) => {
    try {
      const newStatus = currentStatus === false ? true : false;
      const res = await fetch(`/api/chatbot/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botEnabledForConv: newStatus }),
      });
      if (res.ok) {
        showNotification(newStatus ? 'Bot Martine V. activé sur cette discussion' : 'Bot Martine V. désactivé sur cette discussion');
        fetchConversations();
      }
    } catch (err) {
      console.error('Error toggling bot for conv:', err);
    }
  };

  // Archive / Unarchive conversation
  const handleArchiveConv = async (convId: string, currentArchived?: boolean) => {
    try {
      const newArchived = !currentArchived;
      const res = await fetch(`/api/chatbot/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: newArchived }),
      });
      if (res.ok) {
        showNotification(newArchived ? 'Conversation archivée' : 'Conversation désarchivée');
        fetchConversations();
      }
    } catch (err) {
      console.error('Error archiving conv:', err);
    }
  };

  // Delete conversation
  const handleDeleteConv = async (convId: string) => {
    if (!window.confirm('Voulez-vous supprimer définitivement cette conversation ?')) return;
    try {
      const res = await fetch(`/api/chatbot/conversations/${convId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showNotification('Conversation supprimée');
        if (selectedConvId === convId) {
          setSelectedConvId(null);
        }
        fetchConversations();
      }
    } catch (err) {
      console.error('Error deleting conv:', err);
    }
  };

  // Trigger timeout help message manually
  const handleTriggerTimeoutIntervention = async (convId: string) => {
    try {
      const res = await fetch('/api/chatbot/timeout-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId }),
      });
      if (res.ok) {
        showNotification('Martine est intervenue avec les options de devis et rappel téléphonique.');
        fetchConversations();
      }
    } catch (err) {
      console.error('Error triggering timeout help:', err);
    }
  };

  // Block / Unblock IP address
  const handleToggleBlockIp = async (ipToBlock?: string, blockStatus = true, customReason?: string) => {
    if (!isCurrentUserAdmin) {
      alert("Action refusée : Seuls les Administrateurs IT ont l'autorisation de bloquer ou débloquer des adresses IP.");
      return;
    }
    const targetIp = ipToBlock || manualIpToBlock.trim();
    if (!targetIp) return;

    const effectiveReason = (customReason !== undefined ? customReason : blockReason).trim() || "Non-respect des conditions d'utilisation";

    setIpActionLoading(true);
    try {
      const res = await fetch('/api/chatbot/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: targetIp,
          blocked: blockStatus,
          reason: effectiveReason,
        }),
      });
      if (res.ok) {
        showNotification(`Adresse IP ${targetIp} ${blockStatus ? `bannie (Raison : ${effectiveReason})` : 'débloquée'}.`);
        setManualIpToBlock('');
        setBlockReason('');
        // Refresh settings and conversations
        const updatedSettingsRes = await fetch('/api/chatbot/settings');
        if (updatedSettingsRes.ok) {
          const updatedSettings = await updatedSettingsRes.json();
          setLocalSettings(updatedSettings);
          onUpdateSettings(updatedSettings);
        }
        fetchConversations();
      }
    } catch (err) {
      console.error('Error blocking/unblocking IP:', err);
    } finally {
      setIpActionLoading(false);
    }
  };

  // Mark conversation resolved
  const handleMarkResolved = async (convId: string) => {
    try {
      const res = await fetch(`/api/chatbot/conversations/${convId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });
      if (res.ok) {
        showNotification('Conversation marquée comme terminée.');
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Search filter
      const q = convSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.visitorName?.toLowerCase().includes(q) ||
        c.visitorPhone?.toLowerCase().includes(q) ||
        c.visitorEmail?.toLowerCase().includes(q) ||
        c.visitorIp?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q) ||
        c.messages.some((m) => m.text.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // Status filter matching screenshot tabs
      if (convStatusFilter === 'active') return c.status !== 'resolved' && !c.archived;
      if (convStatusFilter === 'resolved') return c.status === 'resolved' && !c.archived;
      if (convStatusFilter === 'archived') return Boolean(c.archived);
      return !c.archived;
    });
  }, [conversations, convSearch, convStatusFilter]);

  const waitingCount = conversations.filter((c) => c.status === 'waiting_agent').length;
  const blockedIpsList = localSettings.blockedIps || [];

  // Visitor simulator sends message
  const handleSendVisitorSimulatorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVisitorText.trim()) return;

    const userText = inputVisitorText.trim();
    setInputVisitorText('');

    const newMsg: ChatMessage = {
      id: `vis_${Date.now()}`,
      conversationId: 'sim_1',
      sender: 'visitor',
      senderName: 'Visiteur (Client)',
      text: userText,
      timestamp: new Date().toISOString(),
    };

    setSimMessages((prev) => [...prev, newMsg]);
    setIsSimBotTyping(true);

    try {
      const res = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: 'sim_1',
          text: userText,
          visitorName: 'Visiteur Simulateur',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimMessages((prev) => [...prev, data.botMessage]);
      } else {
        throw new Error();
      }
    } catch {
      setSimMessages((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          conversationId: 'sim_1',
          sender: 'bot',
          senderName: settings.botName,
          senderTag: settings.botTag,
          text: settings.botEnabled
            ? "Je suis à votre disposition pour planifier votre voyage ou préparer votre soumission !"
            : settings.offlineMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSimBotTyping(false);
    }
  };

  // Agent intervenes in simulator
  const handleSendAgentSimulatorMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAgentText.trim()) return;

    const activeTags = getActiveTags();

    const agentMsg: ChatMessage = {
      id: `agent_${Date.now()}`,
      conversationId: 'sim_1',
      sender: 'agent',
      senderName: currentUser.name,
      senderGrade: currentUser.grade,
      senderTag: activeTags[0],
      senderTags: activeTags,
      text: inputAgentText.trim(),
      timestamp: new Date().toISOString(),
    };

    setSimMessages((prev) => [...prev, agentMsg]);
    setInputAgentText('');
  };

  const targetOrigin = customDomain.trim().replace(/\/+$/, '') || defaultDomain;

  const embedCode = `<!-- Intégration Clavardage Martine V. - Évasion Soleil -->
<div id="evasion-soleil-chatbot"></div>
<script>
(function() {
  function initMartineChat() {
    if (document.getElementById('evasion-martine-iframe')) return;
    var origin = '${targetOrigin}';
    var iframe = document.createElement('iframe');
    iframe.id = 'evasion-martine-iframe';
    iframe.src = origin + '/?mode=widget_chat';
    iframe.style.position = 'fixed';
    iframe.style.bottom = '16px';
    iframe.style.right = '16px';
    iframe.style.width = '260px';
    iframe.style.height = '72px';
    iframe.style.border = 'none';
    iframe.style.outline = 'none';
    iframe.style.background = 'transparent';
    iframe.style.boxShadow = 'none';
    iframe.style.zIndex = '2147483647';
    iframe.style.maxWidth = '94vw';
    iframe.style.maxHeight = '90vh';
    iframe.style.transition = 'width 0.25s ease, height 0.25s ease, box-shadow 0.25s ease';
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('title', 'Clavardage Martine V. - Évasion Soleil');

    var target = document.body || document.documentElement;
    target.appendChild(iframe);

    // Écoute des redimensionnements adaptatifs et fermetures/ouvertures
    window.addEventListener('message', function(event) {
      if (!event.data) return;
      if (event.data.type === 'MARTINE_RESIZE') {
        if (!event.data.isOpen) {
          iframe.style.width = (event.data.width || 260) + 'px';
          iframe.style.height = (event.data.height || 72) + 'px';
          iframe.style.boxShadow = 'none';
          iframe.style.borderRadius = '0';
        } else {
          iframe.style.width = (event.data.width || 420) + 'px';
          iframe.style.height = (event.data.height || 580) + 'px';
          iframe.style.boxShadow = '0 16px 40px rgba(0,0,0,0.2)';
          iframe.style.borderRadius = '16px';
        }
      } else if (event.data.type === 'CLOSE_MARTINE_WIDGET') {
        iframe.style.width = '260px';
        iframe.style.height = '72px';
        iframe.style.boxShadow = 'none';
        iframe.style.borderRadius = '0';
      } else if (event.data.type === 'OPEN_MARTINE_WIDGET') {
        iframe.style.width = '420px';
        iframe.style.height = (event.data.height || 580) + 'px';
        iframe.style.boxShadow = '0 16px 40px rgba(0,0,0,0.2)';
        iframe.style.borderRadius = '16px';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMartineChat);
  } else {
    initMartineChat();
  }
})();
</script>`;

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top-4 border border-slate-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Top Banner Control: Martine ON/OFF & Real-Time Counters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div
            className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 transition-all ${
              settings.botEnabled ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          >
            <Bot className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-slate-900">{settings.botName}</h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-white uppercase">
                [{settings.botTag}]
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  settings.botEnabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${settings.botEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {settings.botEnabled ? 'EN SERVICE (ON)' : 'ARRÊTÉE (OFF)'}
              </span>

              {/* Pastille bleue si aucun agent disponible, verte si en ligne */}
              <button
                type="button"
                onClick={() => setActiveTab('agents')}
                className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border ${
                  agentsAvailability.availableAgents > 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100'
                }`}
                title="Cliquer pour gérer la disponibilité des conseillers"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    agentsAvailability.availableAgents > 0
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-sky-500'
                  }`}
                />
                <span>
                  {agentsAvailability.availableAgents > 0
                    ? `En ligne (${agentsAvailability.availableAgents} conseiller${agentsAvailability.availableAgents > 1 ? 's' : ''})`
                    : 'Aucun agent disponible'}
                </span>
              </button>

              {waitingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white animate-bounce flex items-center gap-1 shadow-xs">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{waitingCount} en attente d'un conseiller</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Consultez en temps réel toutes les discussions de Martine V. avec les voyageurs, intervenez à tout moment pour prendre la relève, visualisez l'adresse IP et gérez le blocage sécurité.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchConversations()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            title="Rafraîchir les conversations"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Actualiser</span>
          </button>

          <button
            onClick={handleToggleBot}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all cursor-pointer ${
              settings.botEnabled
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            <span>{settings.botEnabled ? 'Basculer Martine à OFF' : 'Basculer Martine à ON'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none gap-1">
        <button
          onClick={() => setActiveTab('conversations')}
          className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'conversations'
              ? 'border-amber-500 text-amber-600 bg-amber-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Discussions Visiteurs en Direct & Interventions</span>
          {waitingCount > 0 ? (
            <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
              {waitingCount}
            </span>
          ) : (
            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              {conversations.length}
            </span>
          )}
        </button>

        {/* Tab 2: Disponibilité des Agents & Statuts */}
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'agents'
              ? 'border-amber-500 text-amber-600 bg-amber-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Disponibilité des Conseillers</span>
          <span
            className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
              agentsAvailability.availableAgents > 0
                ? 'bg-emerald-600 text-white'
                : 'bg-sky-600 text-white'
            }`}
          >
            {agentsAvailability.availableAgents > 0
              ? `${agentsAvailability.availableAgents} en ligne`
              : 'Aucun dispo'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ip_security')}
          className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'ip_security'
              ? 'border-amber-500 text-amber-600 bg-amber-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Adresses IP & Modération Sécurité</span>
          {blockedIpsList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white">
              {blockedIpsList.length}
            </span>
          )}
        </button>

        {isCurrentUserAdmin && (
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'config'
                ? 'border-amber-500 text-amber-600 bg-amber-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings2 className="h-4 w-4" />
            <span>Configuration des Réponses & Absence</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-slate-900 text-white">
              ADMIN
            </span>
          </button>
        )}

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('embed')}
            className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'embed'
                ? 'border-amber-500 text-amber-600 bg-amber-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="h-4 w-4" />
            <span>Code HTML d'Intégration</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">
              SUPER ADMIN
            </span>
          </button>
        )}
      </div>

      {/* TAB 1: LIVE CONVERSATIONS & AGENT INTERVENTIONS */}
      {activeTab === 'conversations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Conversations List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            {/* Search & Filter Bar matching requested design */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, courriel..."
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
                {convSearch && (
                  <button
                    onClick={() => setConvSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Badges matching screenshot */}
              <div className="flex items-center justify-between gap-1 text-[11px]">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                  <button
                    onClick={() => setConvStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                      convStatusFilter === 'all'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Toutes ({conversations.filter(c => !c.archived).length})
                  </button>
                  <button
                    onClick={() => setConvStatusFilter('active')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                      convStatusFilter === 'active'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    En cours ({conversations.filter(c => c.status !== 'resolved' && !c.archived).length})
                  </button>
                  <button
                    onClick={() => setConvStatusFilter('resolved')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                      convStatusFilter === 'resolved'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Résolues ({conversations.filter(c => c.status === 'resolved' && !c.archived).length})
                  </button>
                  <button
                    onClick={() => setConvStatusFilter('archived')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                      convStatusFilter === 'archived'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Archivées ({conversations.filter(c => c.archived).length})
                  </button>
                </div>
                <button
                  onClick={fetchConversations}
                  title="Actualiser la liste"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors shrink-0 cursor-pointer"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Conversation List Cards matching requested style */}
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredConversations.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40 text-sky-500" />
                  <p className="font-bold text-slate-700">Aucune conversation</p>
                  <p className="text-[11px] mt-1">Les discussions apparaîtront dès qu'un visiteur écrira à Martine.</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === selectedConvId;
                  const isWaiting = conv.status === 'waiting_agent';
                  const isJoined = Boolean(conv.agentJoined);
                  const isBotActive = conv.botEnabledForConv !== false && !isJoined;
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  const displayId = conv.id.replace('conv_', '').slice(0, 6);
                  const displayName = conv.visitorName || 'Visiteur';
                  const initials = displayName.slice(0, 2).toUpperCase();

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative flex items-start gap-3 ${
                        isSelected
                          ? 'bg-sky-50/70 border-sky-400 ring-2 ring-sky-100 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                      }`}
                    >
                      {/* Avatar Circle with initials (e.g. VI) */}
                      <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xs shrink-0 border border-slate-300">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Line 1: Visiteur #5-zda0 • 🕒 13:47 */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-extrabold text-xs text-slate-900 truncate">
                              {displayName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              #{displayId}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5 shrink-0">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(conv.updatedAt || conv.createdAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Line 2: Message preview */}
                        <p className="text-[11px] text-slate-600 truncate mt-0.5 leading-snug">
                          {lastMsg ? lastMsg.text : 'Début de discussion...'}
                        </p>

                        {/* Line 3: Status Badge Pill */}
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          {conv.isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                              <Ban className="h-2.5 w-2.5" />
                              <span>IP Bloquée</span>
                            </span>
                          ) : isWaiting ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-rose-300 text-rose-800 bg-rose-50 animate-pulse">
                              <Clock className="h-2.5 w-2.5 text-rose-600" />
                              <span>En attente</span>
                            </span>
                          ) : isJoined ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-sky-300 text-sky-800 bg-sky-50">
                              <UserCheck className="h-2.5 w-2.5 text-sky-600" />
                              <span>Conseiller en direct : {conv.agentJoined?.name || 'Staff'}</span>
                            </span>
                          ) : isBotActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-300 text-amber-800 bg-amber-50">
                              <Bot className="h-2.5 w-2.5 text-amber-600" />
                              <span>Martine V. actif</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-slate-300 text-slate-700 bg-slate-100">
                              <span>Bot inactif</span>
                            </span>
                          )}

                          {conv.status === 'resolved' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="h-2.5 w-2.5" />
                              <span>Résolue</span>
                            </span>
                          )}

                          {conv.archived && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <Archive className="h-2.5 w-2.5" />
                              <span>Archivée</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Live Chat Space matching screenshot (8 cols) */}
          <div className="lg:col-span-8">
            {selectedConversation ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
                {/* Header matching screenshot */}
                <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-black text-sm border border-slate-300 shrink-0">
                      {(selectedConversation.visitorName || 'Visiteur').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {selectedConversation.visitorName || 'Visiteur'}
                        </h3>
                        <span className="text-xs text-slate-500 font-mono">
                          #{selectedConversation.id.replace('conv_', '').slice(0, 6)}
                        </span>
                      </div>

                      {/* Phone, Email & IP row */}
                      <div className="flex items-center gap-2.5 mt-0.5 text-xs text-slate-500 flex-wrap">
                        {selectedConversation.visitorPhone && (
                          <a
                            href={`tel:${selectedConversation.visitorPhone}`}
                            className="text-emerald-700 font-bold hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <Phone className="h-3 w-3" />
                            <span>{selectedConversation.visitorPhone}</span>
                          </a>
                        )}
                        {selectedConversation.visitorEmail && (
                          <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span>{selectedConversation.visitorEmail}</span>
                          </span>
                        )}
                        <span className="font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 border border-slate-200">
                          <Globe className="h-3 w-3 text-slate-400" />
                          <span>IP : {selectedConversation.visitorIp || '142.112.98.45'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header action buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Bot Martine V. Toggle Button (Actif / Inactif) */}
                    <button
                      onClick={() => handleToggleBotForConv(selectedConversation.id, selectedConversation.botEnabledForConv)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        selectedConversation.botEnabledForConv !== false
                          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Activer ou désactiver les réponses automatiques de Martine V. pour cette discussion"
                    >
                      <Bot className="h-3.5 w-3.5 text-amber-600" />
                      <span>
                        Bot Martine V. : {selectedConversation.botEnabledForConv !== false ? 'Actif' : 'Inactif'}
                      </span>
                    </button>

                    {/* Agent Join Info & Button */}
                    {selectedConversation.agentJoined ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-2.5 py-1 shadow-2xs">
                          <img
                            src={getSafeAvatar(selectedConversation.agentJoined.avatar, selectedConversation.agentJoined.name)}
                            alt={selectedConversation.agentJoined.name}
                            className="h-7 w-7 rounded-full object-cover border border-indigo-400 shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getInitialsAvatarUrl(selectedConversation.agentJoined?.name);
                            }}
                          />
                          <div className="text-left leading-tight">
                            <div className="text-[11px] font-black text-indigo-950 flex items-center gap-1">
                              <span>{selectedConversation.agentJoined.name}</span>
                              {selectedConversation.agentJoined.tag && (
                                <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-indigo-600 text-white">
                                  [{selectedConversation.agentJoined.tag}]
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-indigo-700">
                              Rang : {selectedConversation.agentJoined.grade || 'Conseiller Voyages'}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAgentLeave(selectedConversation.id)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                          title="Quitter la discussion et réactiver Martine V."
                        >
                          <UserX className="h-3.5 w-3.5 text-rose-500" />
                          <span>Quitter</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAgentJoin(selectedConversation.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#338b84] hover:bg-[#286f6a] text-white transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Rejoindre la conversation (désactive automatiquement Martine)"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Rejoindre la discussion</span>
                      </button>
                    )}

                    {/* Mark Resolved Button */}
                    <button
                      onClick={() => handleMarkResolved(selectedConversation.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-colors cursor-pointer"
                      title="Marquer la conversation comme résolue"
                    >
                      <Check className="h-4 w-4" />
                    </button>

                    {/* Archive Button */}
                    <button
                      onClick={() => handleArchiveConv(selectedConversation.id, selectedConversation.archived)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        selectedConversation.archived
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-slate-200'
                      }`}
                      title={selectedConversation.archived ? 'Désarchiver' : 'Archiver la conversation'}
                    >
                      <Archive className="h-4 w-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteConv(selectedConversation.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                      title="Supprimer la conversation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {/* Block IP Button (ADMIN IT ONLY) */}
                    {isCurrentUserAdmin && (
                      selectedConversation.isBlocked ? (
                        <button
                          onClick={() => handleToggleBlockIp(selectedConversation.visitorIp, false)}
                          disabled={ipActionLoading}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center gap-1"
                          title="Débloquer l'adresse IP"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Débloquer IP</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const reasonInput = window.prompt(
                              `Indiquez la raison du bannissement pour l'adresse IP ${selectedConversation.visitorIp || '142.112.98.45'} (sera affichée avec it@evasionsoleil.com et le 438-373-7076) :`,
                              'Non-respect des conditions d\'utilisation / Abus'
                            );
                            if (reasonInput !== null) {
                              handleToggleBlockIp(selectedConversation.visitorIp, true, reasonInput);
                            }
                          }}
                          disabled={ipActionLoading}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer flex items-center gap-1"
                          title="Bannir l'adresse IP avec motif"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Bloquer IP</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Messages Stream with container-only scroll (No scrollIntoView) */}
                <div
                  ref={liveChatContainerRef}
                  className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/70"
                >
                  {/* Central notice banner matching screenshot */}
                  <div className="flex items-center justify-center gap-2 py-1.5 px-4 mx-auto my-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-900 shadow-2xs max-w-md text-center">
                    <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>
                      {selectedConversation.botEnabledForConv !== false
                        ? 'Le bot Martine V. prend en charge les réponses automatiques sur ce chat.'
                        : 'Martine V. est en pause. Un membre de l\'équipe intervient directement.'}
                    </span>
                  </div>

                  {selectedConversation.messages.map((msg) => {
                    const isVisitor = msg.sender === 'visitor';
                    const isAgent = msg.sender === 'agent';
                    const isBot = msg.sender === 'bot';

                    if (msg.isJoinNotice) {
                      const joinAvatar = getSafeAvatar(
                        msg.senderAvatar || selectedConversation.agentJoined?.avatar,
                        msg.senderName || selectedConversation.agentJoined?.name
                      );
                      const joinGrade = msg.senderGrade || selectedConversation.agentJoined?.grade || 'Conseiller Voyages';
                      return (
                        <div
                          key={msg.id}
                          className="my-2 mx-auto max-w-md p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 shadow-2xs flex items-center gap-3 animate-in fade-in"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={joinAvatar}
                              alt={msg.senderName}
                              className="h-10 w-10 rounded-full object-cover border-2 border-indigo-400 shadow-xs"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = getInitialsAvatarUrl(msg.senderName);
                              }}
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border border-white animate-pulse" />
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-indigo-950">{msg.senderName}</span>
                              <span className="text-[11px] text-indigo-700">a rejoint la conversation</span>
                            </div>
                            <div className="text-[11px] text-indigo-800 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-500">Rang :</span>
                              <span className="font-black px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-900 shadow-2xs">
                                {joinGrade}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (msg.isTimeoutIntervention) {
                      return (
                        <div
                          key={msg.id}
                          className="my-2 mx-auto max-w-lg p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center gap-2 font-black text-amber-800">
                            <Sparkles className="h-4 w-4 text-amber-600" />
                            <span>Intervention de Martine V. (Attente prolongée)</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                      );
                    }

                    const avatarUrl = isBot
                      ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
                      : isAgent
                      ? getSafeAvatar(
                          msg.senderAvatar ||
                            (msg.senderName === currentUser.name ? currentUser.avatar : undefined) ||
                            selectedConversation.agentJoined?.avatar,
                          msg.senderName
                        )
                      : null;

                    const displayGrade = isBot
                      ? 'Conseillère Virtuelle IA'
                      : isAgent
                      ? (msg.senderGrade || (msg.senderName === currentUser.name ? currentUser.grade : undefined) || selectedConversation.agentJoined?.grade || 'Conseiller Voyages')
                      : null;

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${isVisitor ? 'justify-start' : isAgent ? 'justify-end' : 'justify-start'} group`}
                      >
                        {/* Avatar on left for bot or visitor */}
                        {(isBot || isVisitor) && (
                          <div className="relative shrink-0 mt-0.5">
                            {isBot ? (
                              <>
                                <img
                                  src={avatarUrl!}
                                  alt="Martine V."
                                  className="h-9 w-9 rounded-full object-cover border-2 border-amber-400 shadow-2xs ring-2 ring-amber-100"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-xs" title="BOT">
                                  <Sun className="h-2.5 w-2.5" />
                                </div>
                              </>
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-300">
                                {(msg.senderName || 'V').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}

                        <div className={`flex flex-col ${isVisitor ? 'items-start' : isAgent ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[78%]`}>
                          {/* Sender metadata: Name, Rang / Grade & Tags */}
                          <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-500 flex-wrap">
                            <span className="font-extrabold text-slate-800">
                              {isBot ? 'Martine V.' : msg.senderName}
                            </span>

                            {/* Rang / Grade Badge */}
                            {displayGrade && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black border shadow-2xs ${
                                  isBot
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-indigo-100 text-indigo-900 border-indigo-200'
                                }`}
                              >
                                {displayGrade}
                              </span>
                            )}

                            {isAgent && msg.senderTags && msg.senderTags.length > 0 && (
                              msg.senderTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase text-white bg-indigo-600 shadow-2xs"
                                >
                                  [{tag}]
                                </span>
                              ))
                            )}

                            {isAgent && !msg.senderTags && msg.senderTag && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase text-white bg-indigo-600 shadow-2xs">
                                [{msg.senderTag}]
                              </span>
                            )}

                            <span className="text-slate-400 text-[10px]">
                              &bull; {new Date(msg.timestamp).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Bubble styling */}
                          <div
                            className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                              isBot
                                ? 'border-2 border-amber-200 bg-amber-50/70 text-slate-800 rounded-tl-none'
                                : isVisitor
                                ? 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                                : 'bg-indigo-600 text-white rounded-tr-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>

                        {/* Avatar on right for agent */}
                        {isAgent && avatarUrl && (
                          <div className="relative shrink-0 mt-0.5">
                            <img
                              src={avatarUrl}
                              alt={msg.senderName}
                              className="h-9 w-9 rounded-full object-cover border-2 border-indigo-400 shadow-2xs ring-2 ring-indigo-100"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border border-white" title="En direct" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Agent Reply Footer matching screenshot */}
                <div className="p-3.5 border-t border-slate-200 bg-white space-y-2.5">
                  {/* Active Agent or Waiting Notice */}
                  {selectedConversation.agentJoined ? (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span>Vous êtes en direct avec le client. Le bot Martine V. est désactivé automatiquement.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAgentLeave(selectedConversation.id)}
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                      >
                        Quitter et réactiver Martine
                      </button>
                    </div>
                  ) : selectedConversation.status === 'waiting_agent' ? (
                    <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-bold">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-600 animate-spin shrink-0" />
                        <span>Le client attend un conseiller humain ! Rejoignez pour prendre le relais de Martine.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAgentJoin(selectedConversation.id)}
                        className="px-3 py-1 bg-[#338b84] hover:bg-[#286f6a] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer shrink-0"
                      >
                        Rejoindre maintenant
                      </button>
                    </div>
                  ) : null}

                  {/* Quick Canned Chips matching screenshot */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0">
                      RÉPONSES RAPIDES :
                    </span>
                    {[
                      "Bonjour, comment puis-je vous aider avec votre voyage ?",
                      "Un instant s'il vous plaît, je vérifie les disponibilités pour vous.",
                      "Quel est votre budget approximatif et la destination envisagée ?",
                      "Je vous prépare une soumission personnalisée sans frais.",
                      "Pouvez-vous me préciser vos dates de départ idéales ?"
                    ].map((canned) => (
                      <button
                        key={canned}
                        type="button"
                        onClick={() => setReplyText(canned)}
                        className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 cursor-pointer font-medium"
                      >
                        {canned}
                      </button>
                    ))}
                  </div>

                  {/* Status Bar & TAGS ADMIN Toggle Button (as requested by user) */}
                  <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-500">Répondre en tant que :</span>
                      <div className="flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-200 px-2 py-0.5 rounded-lg">
                        <img
                          src={getSafeAvatar(currentUser.avatar, currentUser.name)}
                          alt={currentUser.name}
                          className="h-5 w-5 rounded-full object-cover border border-indigo-400"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getInitialsAvatarUrl(currentUser.name);
                          }}
                        />
                        <strong className="text-indigo-950 font-extrabold text-xs">{currentUser.name}</strong>
                        <span className="text-indigo-800 text-[10px] font-extrabold bg-white border border-indigo-200 px-1.5 py-0.2 rounded shadow-2xs">
                          {currentUser.grade}
                        </span>
                      </div>

                      {/* USER REQUESTED TAGS ADMIN & SPECIAL TAGS (IT, etc.) TOGGLE BUTTONS (PAR DÉFAUT À OFF) */}
                      {userAvailableTags.map((tag) => {
                        const isTagOn = Boolean(tagToggles[tag]);
                        const isAdminTag = tag === 'ADMIN';
                        const isITTag = tag === 'IT';
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleSingleTag(tag)}
                            className={`px-2.5 py-1 rounded-md text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                              isTagOn
                                ? isAdminTag
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300'
                                  : isITTag
                                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white ring-2 ring-cyan-300'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-300'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                            }`}
                            title={`Cliquer pour activer ou désactiver le tag [${tag}]`}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>{isAdminTag ? 'TAGS ADMIN' : `TAG ${tag}`} : {isTagOn ? 'ON' : 'OFF'}</span>
                          </button>
                        );
                      })}
                    </div>

                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      Appuyez sur Entrée pour envoyer
                    </span>
                  </div>

                  {/* Reply Input Form */}
                  <form onSubmit={handleSendLiveReply} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Écrivez votre réponse au client en tant que ${currentUser.name}...`}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || isSendingReply}
                      className="flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all disabled:opacity-40 shrink-0 cursor-pointer"
                      title="Envoyer le message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-sky-500/50" />
                <h4 className="text-base font-extrabold text-slate-700">Sélectionnez une discussion</h4>
                <p className="text-xs mt-1">Choisissez une conversation dans la liste de gauche pour lire les échanges et intervenir en direct.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AGENT AVAILABILITY & STATUS MANAGEMENT */}
      {activeTab === 'agents' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Banner with Blue/Green Global Status */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                    agentsAvailability.availableAgents > 0 ? 'bg-emerald-600' : 'bg-sky-600'
                  }`}
                >
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Disponibilité & Statuts des Conseillers de l'Agence
                    </h3>
                    {/* Pastille de statut globale : verte si en ligne, bleue si aucun agent disponible */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 border shadow-2xs ${
                        agentsAvailability.availableAgents > 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-sky-50 text-sky-800 border-sky-300'
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          agentsAvailability.availableAgents > 0
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-sky-500'
                        }`}
                      />
                      <span>
                        {agentsAvailability.availableAgents > 0
                          ? `En ligne (${agentsAvailability.availableAgents} conseiller${
                              agentsAvailability.availableAgents > 1 ? 's' : ''
                            } disponible${agentsAvailability.availableAgents > 1 ? 's' : ''})`
                          : 'Aucun agent disponible'}
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    Définissez qui est actuellement disponible pour répondre aux voyageurs.
                    Une <strong>pastille verte</strong> indique qu'au moins un agent est en ligne.
                    Une <strong>pastille bleue</strong> signale qu'aucun conseiller n'est disponible (Martine V. prend alors le relais 24/7).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {/* View Mode Filters */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs gap-1">
                  <button
                    type="button"
                    onClick={() => setAgentViewMode('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      agentViewMode === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tous ({managedUsers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgentViewMode('disponible')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      agentViewMode === 'disponible'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>Disponibles ({(managedUsers || []).filter((u) => u.status !== 'indisponible').length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgentViewMode('indisponible')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      agentViewMode === 'indisponible'
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <span>Indisponibles ({(managedUsers || []).filter((u) => u.status === 'indisponible').length})</span>
                  </button>
                </div>

                <div className="h-5 w-px bg-slate-200 hidden sm:block" />

                <button
                  type="button"
                  onClick={() => handleBatchToggleStatus('disponible')}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                >
                  Tous Disponibles
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchToggleStatus('indisponible')}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors cursor-pointer"
                >
                  Tous Indisponibles
                </button>
                <button
                  type="button"
                  onClick={fetchAgentsStatus}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  title="Rafraîchir les statuts"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Cards Grid of All Agents */}
          {(() => {
            const displayedAgents = managedUsers.filter((u) => {
              if (agentViewMode === 'disponible') return u.status !== 'indisponible';
              if (agentViewMode === 'indisponible') return u.status === 'indisponible';
              return true;
            });

            if (displayedAgents.length === 0) {
              return (
                <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
                  <p className="text-sm font-bold text-slate-700">
                    Aucun conseiller ne correspond au mode « {agentViewMode === 'disponible' ? 'Disponible' : 'Indisponible'} ».
                  </p>
                  <button
                    type="button"
                    onClick={() => setAgentViewMode('all')}
                    className="mt-3 px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Voir tous les conseillers
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedAgents.map((agent) => {
                  const isAvailable = agent.status !== 'indisponible';
                  const isMe = agent.id === currentUser?.id;

                  return (
                    <div
                      key={agent.id}
                      className={`bg-white rounded-2xl p-4 border transition-all shadow-xs ${
                        isAvailable
                          ? 'border-emerald-200 ring-1 ring-emerald-100'
                          : 'border-sky-200 bg-slate-50/40'
                      }`}
                    >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={getSafeAvatar(agent.avatar, agent.name)}
                          alt={agent.name}
                          className="h-11 w-11 rounded-xl object-cover border-2 border-white shadow-xs"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getInitialsAvatarUrl(agent.name);
                          }}
                        />
                        {/* Pastille verte si disponible, bleue si indisponible */}
                        <span
                          className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs ${
                            isAvailable ? 'bg-emerald-500' : 'bg-sky-500'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-black text-slate-900 truncate">
                            {agent.name}
                          </h4>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-indigo-100 text-indigo-800">
                              Moi
                            </span>
                          )}
                          {agent.tag && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-amber-500 text-white">
                              [{agent.tag}]
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {agent.grade || 'Conseiller Voyages'}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          @{agent.username}
                        </p>
                      </div>
                    </div>

                    {/* Segmented Status Selector Explicite */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleToggleAgentStatus(agent.id, 'disponible')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isAvailable
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                        title="Définir ce conseiller comme Disponible"
                      >
                        Disponible
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAgentStatus(agent.id, 'indisponible')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          !isAvailable
                            ? 'bg-slate-700 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                        title="Définir ce conseiller comme Indisponible"
                      >
                        Indisponible
                      </button>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Statut en direct :</span>
                    <span
                      className={`font-bold flex items-center gap-1.5 ${
                        isAvailable ? 'text-emerald-700' : 'text-sky-700'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500'
                        }`}
                      />
                      <span>{isAvailable ? 'En ligne (Disponible)' : 'Indisponible'}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: IP MANAGEMENT & MODERATION (Admin-Only Controls) */}
      {activeTab === 'ip_security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-rose-600" />
                  <span>Modération des Adresses IP & Sécurité du Clavardage</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Seuls les Administrateurs IT peuvent ajouter ou retirer des adresses IP de la liste de blocage.
                </p>
              </div>

              {!isCurrentUserAdmin && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <span>Mode Consultation (Réservé IT/Admin)</span>
                </div>
              )}
            </div>

            {/* Add IP to Block Form (Admin only) */}
            {isCurrentUserAdmin && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">
                  Bloquer manuellement une nouvelle adresse IP :
                </span>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Ex: 142.112.98.45 ou 198.51.100.23"
                    value={manualIpToBlock}
                    onChange={(e) => setManualIpToBlock(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Motif (ex: Spam, abus, propos injurieux)..."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                  <button
                    onClick={() => handleToggleBlockIp(manualIpToBlock, true)}
                    disabled={!manualIpToBlock.trim() || ipActionLoading}
                    className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Bloquer cette IP</span>
                  </button>
                </div>
              </div>
            )}

            {/* Blocked IPs Table */}
            <div>
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">
                Adresses IP actuellement restreintes ({blockedIpsList.length}) :
              </h4>

              {blockedIpsList.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p className="font-semibold text-slate-700">Aucune adresse IP n'est actuellement bloquée.</p>
                  <p className="text-[11px] mt-0.5">Le clavardage est ouvert à tous les visiteurs légitimes.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {blockedIpsList.map((ip) => {
                    const savedReason = localSettings.blockedIpReasons?.[ip] || "Non-respect des conditions d'utilisation";
                    return (
                      <div
                        key={ip}
                        className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                            <Ban className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-extrabold text-slate-900 block">
                              {ip}
                            </span>
                            <span className="text-[11px] text-rose-700 font-bold block">
                              Raison du bannissement : {savedReason}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Affiché au visiteur : Courriel <strong>it@evasionsoleil.com</strong> &bull; Tél <strong>438-373-7076</strong>
                            </span>
                          </div>
                        </div>

                        {isCurrentUserAdmin ? (
                          <button
                            onClick={() => handleToggleBlockIp(ip, false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shrink-0"
                          >
                            Débloquer
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Verrouillé</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURATION (Strictement réservé aux Admins) */}
      {isCurrentUserAdmin && activeTab === 'config' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Paramètres du Chatbot & Messages d'Absence
              </h3>
              <p className="text-xs text-slate-500">
                Configurez l'identité de Martine V., les messages d'accueil et les alertes courriel
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{isSaving ? 'Enregistrement...' : saveSuccess ? 'Enregistré !' : 'Sauvegarder'}</span>
            </button>
          </div>

          {/* Moteur IA Google Gemini & Mode Réponses Programmées de Secours */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 border border-slate-700 rounded-2xl p-5 text-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-sm text-white">Moteur IA de Martine V. : Google Gemini</h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-400 text-slate-950">
                      {aiStatus?.configured ? `Gemini Actif (${aiStatus.model})` : 'Gemini & Secours Programmés'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Martine V. est propulsée par <strong>Google Gemini</strong> (<code>{aiStatus?.model || 'gemini-3.8-flash'}</code>) côté serveur.
                    En cas d'indisponibilité temporaire, Martine bascule automatiquement en <strong>mode réponses programmées</strong> pour assurer un service continu 24/7 aux voyageurs.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleTestOpenAi}
                  disabled={isTestingAi}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs disabled:opacity-50"
                  title="Vérifier la réponse de Martine V. avec Gemini"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isTestingAi ? 'animate-spin' : ''}`} />
                  <span>{isTestingAi ? 'Test en cours...' : 'Tester la connexion Gemini'}</span>
                </button>
              </div>
            </div>

            {/* Live Test Result Banner */}
            {testAiResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs leading-relaxed animate-in fade-in duration-200 ${
                  testAiResult.success
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                    : 'bg-amber-950/80 border-amber-500/50 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 font-black mb-1">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      testAiResult.success ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span>{testAiResult.message}</span>
                </div>
              </div>
            )}

            {/* Fallback Mode Switch */}
            <div className="pt-3 border-t border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/60 p-3.5 rounded-xl">
              <div className="space-y-0.5">
                <span className="font-extrabold text-xs text-white block">
                  Activer le basculement automatique en mode réponses programmées
                </span>
                <p className="text-[11px] text-slate-300">
                  Si activé (recommandé), Martine utilise automatiquement les réponses programmées ci-dessous en cas de besoin.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setLocalSettings({
                    ...localSettings,
                    fallbackModeEnabled: localSettings.fallbackModeEnabled !== false ? false : true,
                  })
                }
                className={`px-4 py-1.5 rounded-full font-black text-xs transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5 ${
                  localSettings.fallbackModeEnabled !== false
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    localSettings.fallbackModeEnabled !== false ? 'bg-slate-950' : 'bg-slate-400'
                  }`}
                />
                <span>
                  {localSettings.fallbackModeEnabled !== false
                    ? 'MODE SECOURS ACTIVÉ (ON)'
                    : 'MODE SECOURS DÉSACTIVÉ (OFF)'}
                </span>
              </button>
            </div>
          </div>

          {/* Configuration Complète des Réponses Programmées de Secours */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-amber-700" />
                  <span>Réponses Programmées de Secours</span>
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Ces réponses sont utilisées selon les mots-clés du visiteur lorsque le mode programmé est actif.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLocalSettings({
                    ...localSettings,
                    programmedResponses: {
                      fallbackGeneral:
                        "Je suis actuellement en mode assistance programmée. Pour toute réservation ou conseil sur mesure, vous pouvez demander un devis express ou me laisser vos coordonnées pour être rappelé(e) par un conseiller !",
                      greeting:
                        "Bonjour ! Je suis Martine V., votre assistante virtuelle Évasion Soleil. Comment puis-je vous aider aujourd'hui pour votre prochain voyage ?",
                      devis:
                        "Pour obtenir une soumission personnalisée sans frais pour votre projet de voyage, vous pouvez remplir notre formulaire de devis express directement ici !",
                      agentTransfer:
                        "Je transmets immédiatement votre demande à nos conseillers en voyages disponibles. Un membre de l'équipe prendra la relève sous peu !",
                      agentUnavailable:
                        "Tous nos conseillers sont actuellement occupés ou hors ligne. Vous pouvez nous laisser vos coordonnées ou faire une demande de devis express !",
                      pricing:
                        "Nos forfaits tout-inclus et tarifs varient selon vos dates et votre destination. Vous pouvez demander un devis gratuit pour recevoir les meilleures offres !",
                      openingHours:
                        "Notre agence est ouverte du lundi au vendredi de 9h à 18h et le samedi de 10h à 16h. Téléphone : (450) 437-3323 • Courriel : info@evasionsoleil.com",
                    },
                  });
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs transition-colors cursor-pointer border border-amber-300"
              >
                Rétablir les textes recommandés
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-800 mb-1">
                  1. Réponse générale par défaut (quand aucun mot-clé spécifique n'est reconnu)
                </label>
                <textarea
                  rows={2}
                  value={
                    localSettings.programmedResponses?.fallbackGeneral ||
                    "Je suis actuellement en mode assistance programmée. Pour toute réservation ou conseil sur mesure, vous pouvez demander un devis express ou me laisser vos coordonnées pour être rappelé(e) par un conseiller !"
                  }
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      programmedResponses: {
                        ...localSettings.programmedResponses,
                        fallbackGeneral: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  2. Salutations & Accueil (mots: bonjour, salut, allô, etc.)
                </label>
                <textarea
                  rows={3}
                  value={
                    localSettings.programmedResponses?.greeting ||
                    "Bonjour ! Je suis Martine V., votre assistante virtuelle Évasion Soleil. Comment puis-je vous aider aujourd'hui pour votre prochain voyage ?"
                  }
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      programmedResponses: {
                        ...localSettings.programmedResponses,
                        greeting: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  3. Demande de devis & soumission (mots: devis, soumission, prix, réserver)
                </label>
                <textarea
                  rows={3}
                  value={
                    localSettings.programmedResponses?.devis ||
                    "Pour obtenir une soumission personnalisée sans frais pour votre projet de voyage, vous pouvez remplir notre formulaire de devis express directement ici !"
                  }
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      programmedResponses: {
                        ...localSettings.programmedResponses,
                        devis: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  4. Demande d'agent quand un conseiller est EN LIGNE (pastille verte)
                </label>
                <textarea
                  rows={3}
                  value={
                    localSettings.programmedResponses?.agentTransfer ||
                    "Je transmets immédiatement votre demande à nos conseillers en voyages disponibles. Un membre de l'équipe prendra la relève sous peu !"
                  }
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      programmedResponses: {
                        ...localSettings.programmedResponses,
                        agentTransfer: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  5. Demande d'agent quand AUCUN AGENT N'EST DISPONIBLE (pastille bleue)
                </label>
                <textarea
                  rows={3}
                  value={
                    localSettings.programmedResponses?.agentUnavailable ||
                    "Tous nos conseillers sont actuellement occupés ou hors ligne. Vous pouvez nous laisser vos coordonnées ou faire une demande de devis express !"
                  }
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      programmedResponses: {
                        ...localSettings.programmedResponses,
                        agentUnavailable: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  6. Forfaits tout-inclus, promos & tarifs
                </label>
                <textarea
                  rows={3}
                  value={
                    localSettings.programmedResponses?.pricing ||
                    "Nos forfaits tout-inclus et tarifs varient selon vos dates et votre destination. Vous pouvez demander un devis gratuit pour recevoir les meilleures offres !"
                  }
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      programmedResponses: {
                        ...localSettings.programmedResponses,
                        pricing: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  7. Horaires d'ouverture & Coordonnées de l'Agence
                </label>
                <textarea
                  rows={3}
                  value={
                    localSettings.programmedResponses?.openingHours ||
                    "Notre agence est ouverte du lundi au vendredi de 9h à 18h et le samedi de 10h à 16h. Téléphone : (450) 437-3323 • Courriel : info@evasionsoleil.com"
                  }
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      programmedResponses: {
                        ...localSettings.programmedResponses,
                        openingHours: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* OPTIONS ET TAGS DE RÉPONSES RAPIDES DU CHATBOT (QUICK REPLY TAGS) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🏷️</span>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Options & Tags de réponses rapides pour l'IA (Quick Reply Chips)
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ces boutons interactifs s'affichent sous les réponses de Martine V. et dans la barre de suggestion pour guider le voyageur en 1 clic.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLocalSettings({
                    ...localSettings,
                    quickReplyOptions: [
                      'Faire une soumission',
                      'Forfaits tout-inclus 5★',
                      'Croisières Caraïbes',
                      'Dernière minute',
                      'Vacances en famille',
                      'Parler à un conseiller',
                      'Assurance voyage',
                    ],
                  });
                }}
                className="text-[11px] font-bold text-[#338b84] hover:underline cursor-pointer self-start sm:self-center"
              >
                Réinitialiser aux options recommandées
              </button>
            </div>

            {/* Liste des tags actifs */}
            <div>
              <label className="block font-bold text-slate-700 text-xs mb-2">
                Tags & Boutons actifs affichés au visiteur :
              </label>
              <div className="flex flex-wrap gap-2 min-h-[44px] p-3 bg-white border border-slate-200 rounded-xl">
                {(localSettings.quickReplyOptions || []).length === 0 ? (
                  <span className="text-xs text-slate-400 italic">
                    Aucun tag configuré. Les options par défaut de l'agence seront utilisées.
                  </span>
                ) : (
                  (localSettings.quickReplyOptions || []).map((tag, idx) => (
                    <div
                      key={`${tag}-${idx}`}
                      className="flex items-center gap-1.5 px-3 py-1 bg-[#f0f8f7] text-[#1c5d57] border border-[#338b84]/30 rounded-full text-xs font-bold shadow-2xs"
                    >
                      <span>💬 {tag}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (localSettings.quickReplyOptions || []).filter((_, i) => i !== idx);
                          setLocalSettings({ ...localSettings, quickReplyOptions: updated });
                        }}
                        className="h-4 w-4 rounded-full hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center text-slate-400 cursor-pointer transition-colors"
                        title="Supprimer ce tag"
                      >
                        &times;
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Ajouter un nouveau tag personnalisé */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Ex: Devis pour lune de miel, Vols vers Paris, etc."
                value={newQuickTagInput}
                onChange={(e) => setNewQuickTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newQuickTagInput.trim()) {
                      const current = localSettings.quickReplyOptions || [];
                      if (!current.includes(newQuickTagInput.trim())) {
                        setLocalSettings({
                          ...localSettings,
                          quickReplyOptions: [...current, newQuickTagInput.trim()],
                        });
                      }
                      setNewQuickTagInput('');
                    }
                  }
                }}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-[#338b84] focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => {
                  if (newQuickTagInput.trim()) {
                    const current = localSettings.quickReplyOptions || [];
                    if (!current.includes(newQuickTagInput.trim())) {
                      setLocalSettings({
                        ...localSettings,
                        quickReplyOptions: [...current, newQuickTagInput.trim()],
                      });
                    }
                    setNewQuickTagInput('');
                  }
                }}
                disabled={!newQuickTagInput.trim()}
                className="px-4 py-2 bg-[#338b84] hover:bg-[#286f6a] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40"
              >
                + Ajouter ce tag
              </button>
            </div>

            {/* Suggestions rapides prêtes à ajouter en 1 clic */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                Suggestions prêtes à l'emploi (cliquez pour ajouter) :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Faire une soumission',
                  'Forfaits tout-inclus 5★',
                  'Croisières dans les Caraïbes',
                  'Vacances en famille (parcs)',
                  'Escapade romantique / Adultes',
                  'Dernière minute soleil',
                  'Assurance voyage & Annulation',
                  'Parler à un conseiller humain',
                ].map((sug) => {
                  const already = (localSettings.quickReplyOptions || []).includes(sug);
                  return (
                    <button
                      key={sug}
                      type="button"
                      disabled={already}
                      onClick={() => {
                        const current = localSettings.quickReplyOptions || [];
                        setLocalSettings({
                          ...localSettings,
                          quickReplyOptions: [...current, sug],
                        });
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                        already
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-[#338b84] hover:text-[#338b84] cursor-pointer'
                      }`}
                    >
                      {already ? '✓ ' : '+ '}
                      {sug}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nom du Chatbot</label>
              <input
                type="text"
                value={localSettings.botName}
                onChange={(e) => setLocalSettings({ ...localSettings, botName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tag Visuel de Fonction</label>
              <input
                type="text"
                value={localSettings.botTag}
                onChange={(e) => setLocalSettings({ ...localSettings, botTag: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 uppercase"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Message d'accueil automatique</label>
              <textarea
                rows={3}
                value={localSettings.welcomeMessage}
                onChange={(e) => setLocalSettings({ ...localSettings, welcomeMessage: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Message de fermeture / absence (quand Martine est à OFF)</label>
              <textarea
                rows={3}
                value={localSettings.offlineMessage}
                onChange={(e) => setLocalSettings({ ...localSettings, offlineMessage: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Courriel d'alerte pour les transferts d'agents</label>
              <input
                type="email"
                value={localSettings.agentNotificationEmail}
                onChange={(e) => setLocalSettings({ ...localSettings, agentNotificationEmail: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Lien de redirection pour le devis express</label>
              <input
                type="text"
                value={localSettings.quoteRedirectUrl}
                onChange={(e) => setLocalSettings({ ...localSettings, quoteRedirectUrl: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 5: EMBED CODE (Strictement réservé au Super Admin) */}
      {isSuperAdmin && activeTab === 'embed' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Code HTML d'Intégration du Clavardage Martine V.
              </h3>
              <p className="text-xs text-slate-500">
                Copiez ce bloc HTML dans votre site web ou CMS (ex: evasionsoleil.com) pour afficher le widget flottant
              </p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(embedCode);
                setCopiedEmbed(true);
                setTimeout(() => setCopiedEmbed(false), 2000);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
            >
              {copiedEmbed ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedEmbed ? 'Copié !' : 'Copier le code'}</span>
            </button>
          </div>

          {/* Domain Selection */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Origine du serveur (URL de destination de l'iframe)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomDomain('https://employe.evasionsoleil.com')}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    customDomain === 'https://employe.evasionsoleil.com'
                      ? 'bg-[#338b84] text-white border-[#338b84]'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  employe.evasionsoleil.com (Officiel)
                </button>
                {typeof window !== 'undefined' && (
                  <button
                    type="button"
                    onClick={() => setCustomDomain(window.location.origin)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      customDomain === window.location.origin
                        ? 'bg-[#338b84] text-white border-[#338b84]'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Origine actuelle ({window.location.host})
                  </button>
                )}
              </div>
            </div>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="https://employe.evasionsoleil.com"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#338b84]"
            />
          </div>

          <pre className="bg-slate-900 text-amber-300 p-4 rounded-2xl text-xs overflow-x-auto font-mono leading-relaxed select-all">
            {embedCode}
          </pre>
        </div>
      )}
    </div>
  );
};
