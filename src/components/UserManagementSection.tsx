import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  Star,
  Zap,
  Tag,
  Check,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  Lock,
  Sparkles,
  Award,
  X,
  PlusCircle,
  Hash,
  KeyRound,
  Sliders,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Info,
  Key,
  Eye,
  EyeOff,
  Save,
  Mail,
  User as UserIcon,
  Send,
  Server,
  Terminal,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import { User, UserRole, UserPermissions, SystemRole } from '../types';
import { getSafeAvatar, getInitialsAvatarUrl } from '../utils/avatarUtils';
import {
  findUserSystemRole,
  isBonusPermissionForUser,
  isPermissionInSystemRole,
  getPermissionsBreakdown,
  DEFAULT_FALLBACK_ROLES,
  ALL_PERMISSION_DEFINITIONS,
  PERMISSION_CATEGORIES,
} from '../utils/permissionUtils';
import { SystemRolesManagementTab } from './SystemRolesManagementTab';

interface UserManagementSectionProps {
  currentUser: User;
  allUsers: User[];
  systemRoles?: SystemRole[];
  onUpdateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  onAddUser: (newUser: Omit<User, 'id'>) => Promise<void>;
  onDeleteUser?: (userId: string) => Promise<boolean | void>;
  onUpdateSystemRole?: (role: SystemRole, syncUsers?: boolean) => Promise<any>;
  onAddSystemRole?: (role: Omit<SystemRole, 'id'>) => Promise<any>;
  onDeleteSystemRole?: (id: string) => Promise<boolean | void>;
  onUpdateUserStatus?: (userId: string, newStatus: 'disponible' | 'indisponible') => Promise<any>;
}

// Preset popular tags for Évasion Soleil staff
const PRESET_SPECIAL_TAGS = [
  { label: 'ADMIN', color: 'bg-indigo-600 text-white border-indigo-700' },
  { label: 'IT', color: 'bg-cyan-600 text-white border-cyan-700' },
  { label: 'CONSEILLER SENIOR', color: 'bg-emerald-600 text-white border-emerald-700' },
  { label: 'EXPERT CROISIÈRES', color: 'bg-sky-600 text-white border-sky-700' },
  { label: 'EXPERT SUD', color: 'bg-amber-600 text-white border-amber-700' },
  { label: 'DIRECTION', color: 'bg-purple-600 text-white border-purple-700' },
  { label: 'SUPPORT', color: 'bg-rose-600 text-white border-rose-700' },
  { label: 'VIP', color: 'bg-amber-500 text-slate-900 border-amber-600 font-black' },
];

interface PermissionDefinition {
  key: keyof UserPermissions;
  label: string;
  description: string;
  itOnly: boolean;
}

const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: 'canModifyNames',
    label: 'Modifier le nom des collaborateurs',
    description: 'Autorisation stricte de renommer un membre. Interdit sur soi-même.',
    itOnly: true,
  },
  {
    key: 'canModifyPosts',
    label: 'Modifier les postes et grades officiels',
    description: 'Changer le titre de fonction officiel affiché aux clients. Interdit sur soi-même.',
    itOnly: true,
  },
  {
    key: 'canAssignSpecialTags',
    label: 'Attribuer les tags spéciaux ([ADMIN], [IT]...)',
    description: 'Attribuer ou retirer les tags spéciaux de fonction. Interdit sur soi-même.',
    itOnly: true,
  },
  {
    key: 'canManageSubmissionTags',
    label: 'Ajouter ou retirer des Tags Dossiers (Pipeline)',
    description: 'Créer et assigner des tags personnalisés aux demandes de devis. Réservé IT & Administrateurs.',
    itOnly: true,
  },
  {
    key: 'canManageUsers',
    label: 'Gérer les comptes utilisateurs',
    description: 'Créer de nouveaux collaborateurs ou désactiver des accès.',
    itOnly: true,
  },
  {
    key: 'canBlockIps',
    label: 'Modération & Blocage des adresses IP',
    description: 'Bloquer les adresses IP indésirables ou spammeurs sur le chatbot.',
    itOnly: true,
  },
  {
    key: 'canToggleBot',
    label: 'Contrôler le Bot Martine V.',
    description: 'Activer, mettre en pause ou modifier le comportement automatique du bot.',
    itOnly: false,
  },
  {
    key: 'canInterveneChat',
    label: 'Intervenir en direct sur le chat client',
    description: 'Prendre le relais de Martine V. et converser avec les visiteurs.',
    itOnly: false,
  },
  {
    key: 'canManageSubmissions',
    label: 'Gérer le pipeline des soumissions',
    description: 'Traiter les demandes de devis et assigner des conseillers.',
    itOnly: false,
  },
  {
    key: 'canEditForm',
    label: 'Personnaliser le formulaire de devis',
    description: 'Modifier les questions et destinations du formulaire interactif.',
    itOnly: false,
  },
  {
    key: 'canViewStats',
    label: 'Consulter les Statistiques & Métriques d\'Affaires',
    description: 'Accès exclusif aux tableaux de bord analytiques, chiffres de ventes et taux de conversion. Réservé aux Administrateurs.',
    itOnly: true,
  },
  {
    key: 'canUnassignBooked',
    label: 'Modifier/Retirer le conseiller d\'un dossier Réservé',
    description: 'Permet de retirer ou réassigner le conseiller lorsque le voyage est au statut "Réservé". Strictement verrouillé par défaut.',
    itOnly: true,
  },
  {
    key: 'canMergeClients',
    label: 'Jumeler et fusionner les dossiers clients (CRM)',
    description: 'Permet de fusionner deux fiches clients distinctes avec leurs soumissions et historiques en un seul dossier client unifié.',
    itOnly: false,
  },
  {
    key: 'canSendNewsletter',
    label: 'Envoyer des infolettres & offres aux clients',
    description: 'Rédiger et diffuser des courriels d\'offres spéciales à l\'ensemble des clients et abonnés de l\'agence.',
    itOnly: false,
  },
  {
    key: 'canExportData',
    label: 'Exporter les données et rapports',
    description: 'Télécharger les statistiques et exports de soumissions.',
    itOnly: false,
  },
];

export const UserManagementSection: React.FC<UserManagementSectionProps> = ({
  currentUser,
  allUsers,
  systemRoles,
  onUpdateUser,
  onAddUser,
  onDeleteUser,
  onUpdateSystemRole,
  onAddSystemRole,
  onDeleteSystemRole,
  onUpdateUserStatus,
}) => {
  const availableRoles: SystemRole[] =
    systemRoles && systemRoles.length > 0 ? systemRoles : DEFAULT_FALLBACK_ROLES;

  // Navigation tabs: 'members' vs 'system_roles' vs 'permissions_menu' vs 'admin_credentials' vs 'email_logins'
  const [activeTab, setActiveTab] = useState<'members' | 'system_roles' | 'permissions_menu' | 'admin_credentials' | 'email_logins'>('members');
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const defaultAdmin = allUsers.find((u) => u.id === 'usr_sysadmin') || allUsers.find((u) => u.role === 'super_admin') || allUsers[0];

  // Default Admin Credentials state
  const [adminUsername, setAdminUsername] = useState(defaultAdmin?.username || 'admin');
  const [adminEmail, setAdminEmail] = useState(defaultAdmin?.email || 'admin@evasionsoleil.com');
  const [adminName, setAdminName] = useState(defaultAdmin?.name || 'System Administrateur');
  const [adminPassword, setAdminPassword] = useState(defaultAdmin?.password || 'SoleilAdmin2026!');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminSaveStatus, setAdminSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [adminSaveMessage, setAdminSaveMessage] = useState('');

  // Email status & test state
  const [emailStatus, setEmailStatus] = useState<any>(null);
  const [loadingEmailStatus, setLoadingEmailStatus] = useState(false);
  const [testEmailDestination, setTestEmailDestination] = useState(currentUser?.email || 'nathanieldagenais2206@outlook.com');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);

  // IT Super Admin: unique super_admin role or username 'admin'
  const isSuperAdmin =
    currentUser.role === 'super_admin' ||
    currentUser.username?.toLowerCase() === 'admin';

  // IT Admin: IT department or admin
  const isITAdmin =
    isSuperAdmin ||
    currentUser.role === 'admin' ||
    Boolean(currentUser.specialTags?.includes('IT')) ||
    Boolean(currentUser.specialTags?.includes('ADMIN')) ||
    Boolean(currentUser.permissions?.canAssignAdminTags) ||
    Boolean(currentUser.permissions?.canManageUsers) ||
    Boolean(currentUser.permissions?.canModifyNames) ||
    Boolean(currentUser.permissions?.canManagePermissions);

  const isCurrentUserAdmin = isITAdmin;

  useEffect(() => {
    if (activeTab === 'admin_credentials' && !isSuperAdmin) {
      setActiveTab('members');
    } else if (activeTab === 'email_logins' && !isITAdmin) {
      setActiveTab('members');
    }
  }, [activeTab, isSuperAdmin, isITAdmin]);

  const fetchEmailStatus = async () => {
    setLoadingEmailStatus(true);
    try {
      const res = await fetch('/api/admin/email-status');
      const data = await res.json();
      setEmailStatus(data);
    } catch (err) {
      console.error('Erreur chargement statut email:', err);
    } finally {
      setLoadingEmailStatus(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'email_logins') {
      fetchEmailStatus();
    }
  }, [activeTab]);

  const handleTestEmail = async (accountType: 'martine' | 'noreply') => {
    setTestingEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: accountType,
          destinationEmail: testEmailDestination.trim() || undefined,
        }),
      });
      const data = await res.json();
      setTestEmailResult(data);
      fetchEmailStatus();
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: err.message || 'Erreur réseau lors du test',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  // Admin Manual Password Reset Modal State & Handlers
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [adminResetData, setAdminResetData] = useState<{
    resetUrl?: string;
    code?: string;
    email?: string;
    expiresAt?: string;
  } | null>(null);
  const [isGeneratingReset, setIsGeneratingReset] = useState(false);
  const [adminResetFeedback, setAdminResetFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [copiedResetLink, setCopiedResetLink] = useState(false);
  const [copiedResetCode, setCopiedResetCode] = useState(false);
  const [adminDirectPassword, setAdminDirectPassword] = useState('');
  const [isDirectlySettingPass, setIsDirectlySettingPass] = useState(false);

  const handleOpenResetModal = async (targetUser: User) => {
    setResetModalUser(targetUser);
    setAdminResetData(null);
    setAdminResetFeedback(null);
    setCopiedResetLink(false);
    setCopiedResetCode(false);
    setAdminDirectPassword('');
    setIsGeneratingReset(true);

    try {
      // Generate link and code immediately without auto-sending email yet
      const res = await fetch(`/api/admin/users/${targetUser.id}/send-reset-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmail: false }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminResetData({
          resetUrl: data.resetUrl,
          code: data.code,
          email: data.email || targetUser.email,
          expiresAt: data.expiresAt,
        });
      } else {
        setAdminResetFeedback({
          type: 'error',
          message: data.error || 'Erreur lors de la génération du lien de réinitialisation.',
        });
      }
    } catch {
      setAdminResetFeedback({
        type: 'error',
        message: 'Erreur réseau avec le serveur.',
      });
    } finally {
      setIsGeneratingReset(false);
    }
  };

  const handleSendResetEmailNow = async () => {
    if (!resetModalUser) return;
    setIsSendingResetEmail(true);
    setAdminResetFeedback(null);

    try {
      const res = await fetch(`/api/admin/users/${resetModalUser.id}/send-reset-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmail: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminResetFeedback({
          type: 'success',
          message: `Le lien de réinitialisation et le code de vérification ont été envoyés par courriel avec succès à ${data.email || resetModalUser.email} !`,
        });
        if (data.resetUrl) {
          setAdminResetData((prev) => ({
            ...prev,
            resetUrl: data.resetUrl,
            code: data.code || prev?.code,
          }));
        }
      } else {
        setAdminResetFeedback({
          type: 'error',
          message: data.error || 'Erreur lors de l\'envoi du courriel.',
        });
      }
    } catch {
      setAdminResetFeedback({
        type: 'error',
        message: 'Erreur réseau lors de l\'envoi du courriel.',
      });
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleDirectPasswordSave = async () => {
    if (!resetModalUser || !adminDirectPassword.trim()) return;
    setIsDirectlySettingPass(true);
    setAdminResetFeedback(null);

    try {
      await onUpdateUser(resetModalUser.id, { password: adminDirectPassword.trim() });
      setAdminResetFeedback({
        type: 'success',
        message: `Mot de passe de ${resetModalUser.name} mis à jour avec succès dans la base de données !`,
      });
      setAdminDirectPassword('');
    } catch (err: any) {
      setAdminResetFeedback({
        type: 'error',
        message: err.message || 'Erreur lors de la mise à jour du mot de passe.',
      });
    } finally {
      setIsDirectlySettingPass(false);
    }
  };

  const envSampleSnippet = `# ==============================================================================
# 1. INTELLIGENCE ARTIFICIELLE MARTINE V. (EXCLUSIF OPENAI - PAS GEMINI)
# ==============================================================================
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"

# ==============================================================================
# 2. COURRIEL MARTINE V. (transcriptions clavardage & rappels clients)
# ==============================================================================
MARTINE_EMAIL="martine@evasionsoleil.com"
MARTINE_FROM_NAME="Martine V. - Voyages Évasion Soleil"
MARTINE_SMTP_HOST="smtp.evasionsoleil.com"
MARTINE_SMTP_PORT=587
MARTINE_SMTP_USER="martine@evasionsoleil.com"
MARTINE_SMTP_PASS="votre_mot_de_passe_martine"
MARTINE_SMTP_SECURE=false

# ==============================================================================
# 3. COURRIEL NE PAS RÉPONDRE (accusés de réception devis voyages)
# ==============================================================================
NOREPLY_EMAIL="ne_pas_repondre@evasionsoleil.com"
NOREPLY_FROM_NAME="Voyages Évasion Soleil"
NOREPLY_SMTP_HOST="smtp.evasionsoleil.com"
NOREPLY_SMTP_PORT=587
NOREPLY_SMTP_USER="ne_pas_repondre@evasionsoleil.com"
NOREPLY_SMTP_PASS="votre_mot_de_passe_noreply"
NOREPLY_SMTP_SECURE=false

# ==============================================================================
# 4. DESTINATAIRE AGENCE (reçoit les alertes de devis et de rappels)
# ==============================================================================
NOTIFICATION_EMAIL="info@evasionsoleil.com"`;

  // Sync if defaultAdmin updates from server
  useEffect(() => {
    if (defaultAdmin) {
      if (defaultAdmin.username) setAdminUsername(defaultAdmin.username);
      if (defaultAdmin.email) setAdminEmail(defaultAdmin.email);
      if (defaultAdmin.name) setAdminName(defaultAdmin.name);
      if (defaultAdmin.password) setAdminPassword(defaultAdmin.password);
    }
  }, [defaultAdmin?.id, defaultAdmin?.email, defaultAdmin?.username]);

  const handleSaveDefaultAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminEmail.trim()) {
      alert('Veuillez saisir au moins un nom d\'utilisateur et un courriel pour le compte administrateur.');
      return;
    }
    if (adminPassword.length < 6) {
      alert('Le mot de passe administrateur doit comporter au moins 6 caractères.');
      return;
    }

    setAdminSaveStatus('saving');
    setAdminSaveMessage('');

    try {
      const res = await fetch('/api/admin/default-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername.trim(),
          email: adminEmail.trim(),
          name: adminName.trim(),
          password: adminPassword.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        setAdminSaveStatus('success');
        setAdminSaveMessage('Identifiants administrateur sauvegardés avec succès !');
        await onUpdateUser(data.user.id, data.user);
        setTimeout(() => setAdminSaveStatus('idle'), 5000);
      } else {
        setAdminSaveStatus('error');
        setAdminSaveMessage(data.error || 'Erreur lors de la mise à jour des identifiants.');
      }
    } catch (err: any) {
      setAdminSaveStatus('error');
      setAdminSaveMessage(err.message || 'Erreur réseau');
    }
  };

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [customTagInput, setCustomTagInput] = useState<{ [userId: string]: string }>({});

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'disponible' | 'indisponible'>('all');

  // New user state with System Roles support
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newSelectedRoleId, setNewSelectedRoleId] = useState<string>(
    availableRoles[0]?.id || 'role_agent_senior'
  );
  const [newRole, setNewRole] = useState<UserRole>(
    availableRoles[0]?.roleKey || 'agent'
  );
  const [newGrade, setNewGrade] = useState(
    availableRoles[0]?.grade || 'Conseiller Voyages'
  );
  const [newSpecialTags, setNewSpecialTags] = useState<string[]>(
    availableRoles[0]?.specialTags || ['CONSEILLER SENIOR']
  );
  const [newCustomTag, setNewCustomTag] = useState('');
  const [newUserPermissions, setNewUserPermissions] = useState<UserPermissions>(
    availableRoles[0]?.permissions || {}
  );
  const [showPermissionsInAddModal, setShowPermissionsInAddModal] = useState(false);

  const handleSelectNewUserRole = (roleId: string) => {
    setNewSelectedRoleId(roleId);
    const role = availableRoles.find((r) => r.id === roleId);
    if (role) {
      setNewRole(role.roleKey);
      setNewGrade(role.grade);
      const tags =
        role.specialTags && role.specialTags.length > 0
          ? role.specialTags
          : role.defaultSpecialTag
          ? [role.defaultSpecialTag]
          : [];
      if (tags.length > 0) {
        setNewSpecialTags(tags);
      }
      setNewUserPermissions({ ...(role.permissions || {}) });
    }
  };

  const handleToggleNewUserPermission = (permKey: keyof UserPermissions) => {
    setNewUserPermissions((prev) => ({
      ...prev,
      [permKey]: !prev[permKey],
    }));
  };

  const handleOpenAddUserModal = () => {
    const defaultRole = availableRoles.find((r) => r.id === 'role_agent_senior') || availableRoles[0];
    if (defaultRole) {
      setNewSelectedRoleId(defaultRole.id);
      setNewRole(defaultRole.roleKey);
      setNewGrade(defaultRole.grade);
      const tags =
        defaultRole.specialTags && defaultRole.specialTags.length > 0
          ? defaultRole.specialTags
          : defaultRole.defaultSpecialTag
          ? [defaultRole.defaultSpecialTag]
          : ['CONSEILLER SENIOR'];
      setNewSpecialTags(tags);
      setNewUserPermissions({ ...(defaultRole.permissions || {}) });
    }
    setShowAddModal(true);
  };

  const getUserTags = (user: User): string[] => {
    if (user.specialTags && Array.isArray(user.specialTags) && user.specialTags.length > 0) {
      return user.specialTags;
    }
    return user.specialTag ? [user.specialTag] : [];
  };

  // Toggle or add/remove a tag for a specific user
  const handleToggleUserTag = async (user: User, tagToToggle: string) => {
    // STRICT RULE: PERSONNE NE PEUT CHANGER SES PROPRES TAGS
    if (user.id === currentUser.id) {
      alert("Action refusée : Règle de sécurité Évasion Soleil : Personne ne peut modifier ses propres tags. Seul un autre administrateur IT peut vous les attribuer ou retirer.");
      return;
    }

    if (!isCurrentUserAdmin) {
      alert("Action non autorisée : Seuls les membres IT / Administrateurs peuvent assigner ou retirer des tags spéciaux.");
      return;
    }

    const currentTags = getUserTags(user);
    let updatedTags: string[];

    if (currentTags.includes(tagToToggle)) {
      updatedTags = currentTags.filter((t) => t !== tagToToggle);
    } else {
      updatedTags = [...currentTags, tagToToggle];
    }

    await onUpdateUser(user.id, {
      specialTags: updatedTags,
      specialTag: updatedTags[0] || '',
      specialTagEnabled: updatedTags.length > 0 ? user.specialTagEnabled : false,
    });
  };

  // Add custom tag to a specific user
  const handleAddCustomTag = async (user: User) => {
    // STRICT RULE: PERSONNE NE PEUT CHANGER SES PROPRES TAGS
    if (user.id === currentUser.id) {
      alert("Action refusée : Personne ne peut ajouter des tags spéciaux à son propre compte. Seul un autre administrateur IT peut le faire.");
      return;
    }

    if (!isCurrentUserAdmin) {
      alert("Action non autorisée : Seuls les membres IT / Administrateurs peuvent assigner des tags spéciaux.");
      return;
    }

    const tagText = customTagInput[user.id]?.trim().toUpperCase();
    if (!tagText) return;

    const currentTags = getUserTags(user);
    if (!currentTags.includes(tagText)) {
      const updatedTags = [...currentTags, tagText];
      await onUpdateUser(user.id, {
        specialTags: updatedTags,
        specialTag: updatedTags[0] || tagText,
        specialTagEnabled: true,
      });
    }

    setCustomTagInput((prev) => ({ ...prev, [user.id]: '' }));
  };

  const handleToggleSpecialTagEnabled = async (user: User) => {
    if (user.id === currentUser.id && !isCurrentUserAdmin) {
      alert("Action refusée : Seuls les administrateurs IT peuvent modifier la visibilité des tags.");
      return;
    }
    await onUpdateUser(user.id, {
      specialTagEnabled: !user.specialTagEnabled,
    });
  };

  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    const matchedRole = findUserSystemRole(user, availableRoles);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      systemRoleId: user.systemRoleId || matchedRole?.id,
      grade: user.grade,
      username: user.username,
      password: user.password || '',
      specialTags: getUserTags(user),
      specialTagEnabled: user.specialTagEnabled,
      permissions: { ...(user.permissions || {}) },
    });
  };

  const handleEditUserRoleChange = (roleId: string) => {
    const role = availableRoles.find((r) => r.id === roleId);
    if (!role) return;
    setEditForm((prev) => ({
      ...prev,
      systemRoleId: role.id,
      role: role.roleKey,
      grade: prev.grade || role.grade,
    }));
  };

  const handleResetUserPermissionsToRole = (roleId?: string) => {
    const targetRoleId = roleId || editForm.systemRoleId;
    const role = availableRoles.find((r) => r.id === targetRoleId) || availableRoles[0];
    if (role && role.permissions) {
      setEditForm((prev) => ({
        ...prev,
        permissions: { ...role.permissions },
      }));
    }
  };

  const handleToggleEditFormPermission = (permKey: keyof UserPermissions) => {
    setEditForm((prev) => {
      const currentPerms = prev.permissions || ({} as UserPermissions);
      return {
        ...prev,
        permissions: {
          ...currentPerms,
          [permKey]: !currentPerms[permKey],
        },
      };
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUserId) return;

    const targetUser = allUsers.find(u => u.id === editingUserId);
    const isSelf = editingUserId === currentUser.id;

    // STRICT VALIDATION ENFORCEMENT:
    // If self, cannot change name, grade, or special tags
    if (isSelf) {
      if (editForm.name && targetUser && editForm.name.trim() !== targetUser.name.trim()) {
        alert("Action refusée : Règle stricte Évasion Soleil : Vous ne pouvez PAS modifier votre propre nom. Seul un administrateur IT peut le faire.");
        return;
      }
      if (editForm.grade && targetUser && editForm.grade.trim() !== targetUser.grade.trim()) {
        alert("Action refusée : Règle stricte Évasion Soleil : Vous ne pouvez PAS modifier votre propre poste. Seul un administrateur IT peut le faire.");
        return;
      }
    }

    if (!isCurrentUserAdmin && !isSelf) {
      alert("Action non autorisée : Seuls les membres IT peuvent modifier les comptes d'autres collaborateurs.");
      return;
    }

    try {
      await onUpdateUser(editingUserId, editForm);
      setStatusBanner({
        type: 'success',
        message: `Modifications enregistrées avec succès dans la base de données pour "${targetUser?.name || 'le collaborateur'}" !`,
      });
      setEditingUserId(null);
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        message: err.message || 'Erreur lors de la mise à jour.',
      });
    }
  };

  const handleDeleteClick = async (user: User) => {
    if (!onDeleteUser) return;
    if (user.id === 'usr_sysadmin' || user.username?.toLowerCase() === 'admin') {
      alert("Impossible de supprimer le compte System Administrateur principal.");
      return;
    }
    if (user.id === currentUser.id) {
      alert("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${user.name} (@${user.username}) ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    try {
      await onDeleteUser(user.id);
      setStatusBanner({
        type: 'success',
        message: `Compte de "${user.name}" (@${user.username}) supprimé avec succès de la base de données.`,
      });
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        message: err.message || 'Erreur lors de la suppression.',
      });
    }
  };

  const handleTogglePermissionForUser = async (user: User, permKey: keyof UserPermissions) => {
    if (!isCurrentUserAdmin) {
      alert("Action réservée au département IT : Vous devez disposer des droits Administrateur IT pour modifier les permissions.");
      return;
    }

    const currentPerms = user.permissions || {
      canEditForm: false,
      canToggleBot: true,
      canExportData: false,
      canManageUsers: false,
    };

    const newPerms: UserPermissions = {
      ...currentPerms,
      [permKey]: !currentPerms[permKey],
    };

    await onUpdateUser(user.id, {
      permissions: newPerms,
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setStatusBanner({ type: 'error', message: 'Veuillez renseigner au minimum un nom et un courriel.' });
      return;
    }

    const cleanPass = newPassword.trim() || 'soleil2026';
    const cleanUsername = (newUsername || newEmail.split('@')[0]).trim().toLowerCase();
    setIsCreatingUser(true);

    try {
      await onAddUser({
        name: newName.trim(),
        email: newEmail.trim(),
        username: cleanUsername,
        password: cleanPass,
        role: newRole,
        systemRoleId: newSelectedRoleId,
        grade: newGrade.trim() || 'Conseiller Voyages',
        specialTag: newSpecialTags[0] || 'CONSEILLER',
        specialTags: newSpecialTags,
        specialTagEnabled: newSpecialTags.length > 0,
        avatar: '',
        permissions: newUserPermissions,
      });

      setStatusBanner({
        type: 'success',
        message: `Compte "${newName.trim()}" créé avec succès et enregistré dans la base de données ! Identifiant : @${cleanUsername} • Mot de passe : ${cleanPass}`,
      });
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewUsername('');
      setNewPassword('');
      setNewSpecialTags(['CONSEILLER SENIOR']);
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        message: err.message || 'Erreur lors de la création du compte.',
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleToggleNewUserTag = (tag: string) => {
    setNewSpecialTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddNewCustomTag = () => {
    const formatted = newCustomTag.trim().toUpperCase();
    if (formatted && !newSpecialTags.includes(formatted)) {
      setNewSpecialTags((prev) => [...prev, formatted]);
      setNewCustomTag('');
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole =
      selectedRoleFilter === 'all' ||
      u.role === selectedRoleFilter ||
      (selectedRoleFilter === 'it' && (u.specialTags?.includes('IT') || u.specialTags?.includes('ADMIN')));
    const matchesStatus =
      selectedStatusFilter === 'all' ||
      (selectedStatusFilter === 'disponible' && u.status !== 'indisponible') ||
      (selectedStatusFilter === 'indisponible' && u.status === 'indisponible');
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* SECURITY RULE BANNER - MANDATORY SYSTEM POLICY */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-sm mt-0.5">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Contrôle des Permissions & Sécurité IT Évasion Soleil
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase">
                  Portail employee.evasionsoleil.com
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                <strong>RÈGLE STRICTE APPLIQUÉE :</strong> Personne ne peut modifier son propre nom, ses propres tags, ou son propre poste. Seuls les administrateurs IT peuvent effectuer ces modifications pour autrui. La seule chose qu'un collaborateur peut modifier lui-même sans les IT est sa <strong>photo de profil</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {isCurrentUserAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Accès IT / Superviseur Actif</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>Profil Collaborateur Standard</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* TOP NAVIGATION TABS: MEMBERS vs ADVANCED PERMISSIONS MENU */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'members'
              ? 'border-amber-500 text-amber-600 bg-amber-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Membres de l'Équipe ({allUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('system_roles')}
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'system_roles'
              ? 'border-amber-500 text-amber-600 bg-amber-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Rôles Système & Permissions par Défaut</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-600 text-white">
            {availableRoles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('permissions_menu')}
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'permissions_menu'
              ? 'border-amber-500 text-amber-600 bg-amber-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Permissions & Accès Bonus</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-600 text-white">
            IT
          </span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('admin_credentials')}
            className={`px-4 py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'admin_credentials'
                ? 'border-amber-500 text-amber-600 bg-amber-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="h-4 w-4 text-amber-600" />
            <span>Compte Admin Sécurité</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
              IT SUPER ADMIN
            </span>
          </button>
        )}

        {isITAdmin && (
          <button
            onClick={() => setActiveTab('email_logins')}
            className={`px-4 py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'email_logins'
                ? 'border-amber-500 text-amber-600 bg-amber-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="h-4 w-4 text-amber-600" />
            <span>Login Courriel (.env)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-600 text-white">
              IT ADMIN
            </span>
          </button>
        )}
      </div>

      {/* TAB 1: MEMBERS LIST & EDITING */}
      {activeTab === 'members' && (
        <div className="space-y-5">
          {/* Real-time Status Alert / Toast */}
          {statusBanner && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-md animate-in fade-in ${
                statusBanner.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {statusBanner.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                )}
                <span className="font-semibold">{statusBanner.message}</span>
              </div>
              <button
                onClick={() => setStatusBanner(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold px-2 py-1"
              >
                &times;
              </button>
            </div>
          )}

          {/* Controls bar: search, filters, and Add Member button */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                placeholder="Rechercher un membre par nom, poste, courriel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Statut global des agents (Pastille bleue si aucun agent disponible, verte si en ligne) */}
              {(() => {
                const availableCount = (allUsers || []).filter((u) => u.status !== 'indisponible').length;
                return (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black shadow-2xs ${
                      availableCount > 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-sky-50 text-sky-800 border-sky-300'
                    }`}
                    title={
                      availableCount > 0
                        ? `${availableCount} agent(s) actuellement disponible(s)`
                        : 'Aucun conseiller disponible'
                    }
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        availableCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500'
                      }`}
                    />
                    <span>
                      {availableCount > 0
                        ? `En ligne (${availableCount})`
                        : 'Aucun agent disponible'}
                    </span>
                  </div>
                );
              })()}

              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedRoleFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedRoleFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tous rôles
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoleFilter('it')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedRoleFilter === 'it'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  IT & Admins
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoleFilter('agent')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedRoleFilter === 'agent'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Conseillers
                </button>
              </div>

              {/* Filtre de Statut Agent (Mode Disponible / Indisponible) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedStatusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Voir tous les agents peu importe leur statut"
                >
                  Tous ({allUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('disponible')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedStatusFilter === 'disponible'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Afficher uniquement les agents en mode Disponible"
                >
                  <span className={`h-2 w-2 rounded-full ${selectedStatusFilter === 'disponible' ? 'bg-emerald-300 animate-pulse' : 'bg-emerald-500'}`} />
                  <span>Disponibles ({(allUsers || []).filter((u) => u.status !== 'indisponible').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('indisponible')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedStatusFilter === 'indisponible'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Afficher uniquement les agents en mode Indisponible"
                >
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  <span>Indisponibles ({(allUsers || []).filter((u) => u.status === 'indisponible').length})</span>
                </button>
              </div>

              {isCurrentUserAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-extrabold bg-amber-500 hover:bg-amber-600 text-white text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nouveau collaborateur</span>
                </button>
              )}
            </div>
          </div>

          {/* Users List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredUsers.map((user) => {
              const isEditing = editingUserId === user.id;
              const isSelf = user.id === currentUser.id;
              const userTags = getUserTags(user);

              return (
                <div
                  key={user.id}
                  className={`bg-white rounded-3xl border transition-all p-5 shadow-xs flex flex-col justify-between ${
                    isSelf
                      ? 'border-amber-400 ring-2 ring-amber-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Header Row: Avatar + Info + Actions */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={getSafeAvatar(user.avatar, user.name)}
                            alt={user.name}
                            className="h-14 w-14 rounded-2xl object-cover border-2 border-slate-200 shadow-2xs"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getInitialsAvatarUrl(user.name);
                            }}
                          />
                          {isSelf && (
                            <span
                              className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-white rounded-full shadow-xs"
                              title="Vous pouvez modifier votre photo de profil"
                            >
                              <Camera className="h-3 w-3" />
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-slate-900">
                              {user.name}
                            </span>
                            {isSelf && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">
                                VOUS
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 font-semibold mt-0.5">{user.grade}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                          {user.username && (
                            <p className="text-[10px] text-indigo-600 font-mono font-medium">
                              Identifiant : @{user.username}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Edit & Delete buttons */}
                      <div className="flex items-center gap-1.5">
                        {isCurrentUserAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(user)}
                            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all cursor-pointer"
                            title={`Envoyer manuellement un lien de réinitialisation de mot de passe à ${user.name}`}
                          >
                            <KeyRound className="h-4 w-4 text-amber-700" />
                          </button>
                        )}

                        <button
                          onClick={() => (isEditing ? handleSaveEdit() : startEdit(user))}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${
                            isEditing
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                          title={isEditing ? 'Enregistrer les modifications' : 'Modifier les paramètres'}
                        >
                          {isEditing ? <Check className="h-4 w-4 text-emerald-600 font-bold" /> : <Edit2 className="h-4 w-4" />}
                        </button>

                        {isCurrentUserAdmin && user.id !== 'usr_sysadmin' && user.username?.toLowerCase() !== 'admin' && !isSelf && onDeleteUser && (
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer"
                            title={`Supprimer définitivement ${user.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* EDIT FORM (STRICT ENFORCEMENT) */}
                    {isEditing ? (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5 mb-4 text-xs">
                        {/* NOTICE IF SELF: CANNOT EDIT OWN NAME, POST OR TAGS */}
                        {isSelf ? (
                          <div className="p-3 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-900 text-[11px] flex items-start gap-2">
                            <Lock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold">Verrouillage de sécurité sur votre profil :</strong>
                              Personne ne peut modifier son propre nom, son poste ou ses tags. Seul un autre administrateur IT peut le faire.
                              Vous pouvez uniquement modifier votre photo de profil via le bouton en haut à droite.
                            </div>
                          </div>
                        ) : !isCurrentUserAdmin ? (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
                            <Lock className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                            <span>Modification réservée aux membres de l'équipe IT / Administrateurs.</span>
                          </div>
                        ) : null}

                        {/* NAME FIELD */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-slate-700">Nom & Prénom officiel</label>
                            {isSelf && (
                              <span className="text-[10px] font-extrabold text-amber-800 flex items-center gap-1">
                                <Lock className="h-3 w-3" /> Verrouillé (Votre propre compte)
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            disabled={isSelf || !isCurrentUserAdmin}
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className={`w-full rounded-xl p-2.5 text-xs text-slate-800 ${
                              isSelf || !isCurrentUserAdmin
                                ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-white border border-slate-300 focus:ring-2 focus:ring-amber-500'
                            }`}
                          />
                        </div>

                        {/* GRADE / POSTE FIELD */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-slate-700">Poste & Grade officiel</label>
                            {isSelf && (
                              <span className="text-[10px] font-extrabold text-amber-800 flex items-center gap-1">
                                <Lock className="h-3 w-3" /> Verrouillé (Votre propre compte)
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            disabled={isSelf || !isCurrentUserAdmin}
                            value={editForm.grade || ''}
                            onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                            className={`w-full rounded-xl p-2.5 text-xs text-slate-800 ${
                              isSelf || !isCurrentUserAdmin
                                ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-white border border-slate-300 focus:ring-2 focus:ring-amber-500'
                            }`}
                          />
                        </div>

                        {/* USERNAME, ROLE & PASSWORD (IT ONLY) */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Identifiant</label>
                            <input
                              type="text"
                              disabled={!isCurrentUserAdmin}
                              value={editForm.username || ''}
                              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                              className={`w-full rounded-xl p-2.5 text-xs text-slate-800 ${
                                !isCurrentUserAdmin
                                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-white border border-slate-300'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Rôle Système</label>
                            <select
                              disabled={!isCurrentUserAdmin}
                              value={
                                editForm.systemRoleId ||
                                availableRoles.find(r => r.roleKey === editForm.role)?.id ||
                                availableRoles[0]?.id
                              }
                              onChange={(e) => handleEditUserRoleChange(e.target.value)}
                              className={`w-full rounded-xl p-2.5 text-xs text-slate-800 font-semibold ${
                                !isCurrentUserAdmin
                                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-white border border-slate-300 focus:ring-2 focus:ring-amber-500'
                              }`}
                            >
                              {availableRoles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name} ({r.roleKey === 'super_admin' ? 'Super Admin' : r.roleKey === 'admin' ? 'Admin' : 'Agent'})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* GESTION DES PERMISSIONS & ACCÈS BONUS DE L'UTILISATEUR */}
                        {isCurrentUserAdmin && (
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-300 space-y-2.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                                <div>
                                  <div className="font-extrabold text-slate-900 text-xs">
                                    Permissions & Accès Bonus Individuels
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Définies selon le rôle & complétées d'éventuels privilèges bonus
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleResetUserPermissionsToRole()}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Réinitialiser les permissions strictes du rôle sélectionné"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Aligner sur le rôle</span>
                              </button>
                            </div>

                            {/* Summary breakdown badge */}
                            {(() => {
                              const activeRoleId =
                                editForm.systemRoleId ||
                                availableRoles.find(r => r.roleKey === editForm.role)?.id ||
                                availableRoles[0]?.id;
                              const currentSysRole = availableRoles.find(r => r.id === activeRoleId);
                              const curPerms = editForm.permissions || {};
                              const activeCount = Object.values(curPerms).filter(Boolean).length;
                              const roleBaseCount = Object.values(currentSysRole?.permissions || {}).filter(Boolean).length;
                              const bonusCount = Object.entries(curPerms).filter(
                                ([k, v]) => Boolean(v) && !Boolean(currentSysRole?.permissions?.[k as keyof UserPermissions])
                              ).length;

                              return (
                                <div className="flex items-center gap-2 text-[10px] flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                                    {activeCount} active(s) ({roleBaseCount} incluses dans {currentSysRole?.name || 'le rôle'})
                                  </span>
                                  {bonusCount > 0 ? (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black border border-amber-300 flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                      {bonusCount} accès bonus accordé(s)
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">Aucun accès bonus accordé</span>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Permissions checklist by category */}
                            <div className="max-h-56 overflow-y-auto pr-1 space-y-3 pt-1 border-t border-slate-100">
                              {PERMISSION_CATEGORIES.map((cat) => {
                                const activeRoleId =
                                  editForm.systemRoleId ||
                                  availableRoles.find(r => r.roleKey === editForm.role)?.id ||
                                  availableRoles[0]?.id;
                                const currentSysRole = availableRoles.find(r => r.id === activeRoleId);
                                const permsInCat = ALL_PERMISSION_DEFINITIONS.filter(p => p.category === cat.id);

                                return (
                                  <div key={cat.id} className="space-y-1">
                                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                      {cat.name}
                                    </div>
                                    <div className="space-y-1">
                                      {permsInCat.map((perm) => {
                                        const isEnabled = Boolean(editForm.permissions?.[perm.key]);
                                        const isFromRole = Boolean(currentSysRole?.permissions?.[perm.key]);
                                        const isBonus = isEnabled && !isFromRole;

                                        return (
                                          <label
                                            key={perm.key}
                                            className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                                              isEnabled
                                                ? isBonus
                                                  ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200'
                                                  : 'bg-white border-slate-200'
                                                : 'bg-slate-100/50 border-slate-200 opacity-60 hover:opacity-90'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 pr-2">
                                              <input
                                                type="checkbox"
                                                checked={isEnabled}
                                                onChange={() => handleToggleEditFormPermission(perm.key)}
                                                className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                                              />
                                              <div>
                                                <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                                                  <span>{perm.label}</span>
                                                  {isBonus && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-slate-950 uppercase flex items-center gap-0.5">
                                                      <Star className="h-2.5 w-2.5 fill-slate-950" />
                                                      Bonus
                                                    </span>
                                                  )}
                                                  {isEnabled && isFromRole && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800">
                                                      Rôle
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-[10px] text-slate-500 leading-tight">
                                                  {perm.description}
                                                </div>
                                              </div>
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* MOT DE PASSE (MYSQL AUTH) */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Mot de passe (Authentification MySQL)
                          </label>
                          <input
                            type="text"
                            disabled={!isCurrentUserAdmin}
                            placeholder="Définir le mot de passe du compte..."
                            value={editForm.password || ''}
                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                            className={`w-full rounded-xl p-2.5 text-xs font-mono text-slate-800 ${
                              !isCurrentUserAdmin
                                ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-white border border-slate-300 focus:ring-2 focus:ring-amber-500'
                            }`}
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Ce mot de passe sera exigé sur le portail de connexion employee.evasionsoleil.com.
                          </p>
                        </div>

                        {/* BUTTONS */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-200 font-semibold cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer shadow-xs"
                          >
                            Enregistrer
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* STATUT DE DISPONIBILITÉ DE L'AGENT DANS LE CLAVARDAGE (DISPONIBLE / INDISPONIBLE) */}
                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`h-3 w-3 rounded-full shrink-0 ${
                            user.status !== 'indisponible'
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-sky-500'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">
                              Disponibilité Clavardage :
                            </span>
                            <span
                              className={`text-xs font-black ${
                                user.status !== 'indisponible' ? 'text-emerald-700' : 'text-sky-700'
                              }`}
                            >
                              {user.status !== 'indisponible' ? 'Disponible (En ligne)' : 'Indisponible'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {user.status !== 'indisponible'
                              ? 'Visible comme disponible par Martine V. et les visiteurs'
                              : 'Hors-ligne pour les transferts de clavardage'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          const nextStatus = user.status !== 'indisponible' ? 'indisponible' : 'disponible';
                          try {
                            if (onUpdateUserStatus) {
                              await onUpdateUserStatus(user.id, nextStatus);
                            } else {
                              const res = await fetch(`/api/users/${user.id}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: nextStatus }),
                              });
                              const data = await res.json();
                              if (data.success && onUpdateUser) {
                                await onUpdateUser(user.id, { status: nextStatus });
                              }
                            }
                          } catch (err) {
                            console.error('Erreur changement statut:', err);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-2xs shrink-0 ${
                          user.status !== 'indisponible'
                            ? 'bg-white hover:bg-sky-50 text-sky-800 border-sky-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                        }`}
                        title="Changer le statut de cet agent"
                      >
                        {user.status !== 'indisponible' ? 'Mettre Indisponible' : 'Mettre Disponible'}
                      </button>
                    </div>

                    {/* SELECTION ET GESTION DES TAGS SPÉCIAUX */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-4 w-4 text-amber-600" />
                          <span className="text-xs font-bold text-slate-800">
                            Tags Spéciaux de fonction
                          </span>
                        </div>

                        {isCurrentUserAdmin && !isSelf ? (
                          <button
                            onClick={() => handleToggleSpecialTagEnabled(user)}
                            className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                              user.specialTagEnabled
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                            title="Afficher ou masquer les tags dans le chat"
                          >
                            {user.specialTagEnabled ? 'Tags Visibles (ON)' : 'Tags Masqués (OFF)'}
                          </button>
                        ) : isSelf ? (
                          <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <Lock className="h-3 w-3" /> Auto-attribution interdite
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Réservé IT/Admin
                          </span>
                        )}
                      </div>

                      {/* Active tags chips list */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {userTags.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">
                            Aucun tag attribué.
                          </span>
                        ) : (
                          userTags.map((tag) => (
                            <span
                              key={tag}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all shadow-2xs ${
                                user.specialTagEnabled
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-300 text-slate-600 opacity-60'
                              }`}
                            >
                              <span>[{tag}]</span>
                              {isCurrentUserAdmin && !isSelf && (
                                <button
                                  onClick={() => handleToggleUserTag(user, tag)}
                                  className="hover:opacity-80 p-0.5 rounded-full cursor-pointer"
                                  title="Retirer ce tag"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </span>
                          ))
                        )}
                      </div>

                      {/* Quick toggle chips: Presets (IT/Admin only for other users) */}
                      {isCurrentUserAdmin && !isSelf ? (
                        <>
                          <div className="pt-2 border-t border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">
                              Attribuer / Retirer rapidement un tag (IT) :
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {PRESET_SPECIAL_TAGS.map((preset) => {
                                const isAssigned = userTags.includes(preset.label);
                                return (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => handleToggleUserTag(user, preset.label)}
                                    className={`px-2 py-1 rounded-md text-[10px] font-extrabold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                                      isAssigned
                                        ? 'bg-slate-900 text-white shadow-2xs'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-400 hover:text-amber-700'
                                    }`}
                                  >
                                    {isAssigned ? (
                                      <>
                                        <Check className="h-2.5 w-2.5 text-emerald-400" />
                                        <span>[{preset.label}]</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="h-2.5 w-2.5 text-slate-400" />
                                        <span>[{preset.label}]</span>
                                      </>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Add custom tag input */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <input
                              type="text"
                              placeholder="Ajouter un tag sur mesure (ex: VIP, DIRECTION)..."
                              value={customTagInput[user.id] || ''}
                              onChange={(e) =>
                                setCustomTagInput({ ...customTagInput, [user.id]: e.target.value })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCustomTag(user);
                                }
                              }}
                              className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] text-slate-800 uppercase focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddCustomTag(user)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              Ajouter
                            </button>
                          </div>
                        </>
                      ) : isSelf ? (
                        <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 text-[11px] text-amber-800">
                          <Lock className="h-3 w-3 text-amber-600" />
                          <span>Règle IT : Vous ne pouvez pas attribuer de tags à votre propre profil.</span>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Lock className="h-3 w-3 text-slate-400" />
                          <span>Attribution des tags réservée aux Administrateurs IT.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer metadata & actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="capitalize font-semibold text-slate-700">Rôle : {user.role}</span>
                      <span className="text-slate-400">
                        &bull; {userTags.length} tag{userTags.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {isCurrentUserAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenResetModal(user)}
                        className="text-[11px] font-bold text-[#338b84] hover:text-[#236862] flex items-center gap-1 cursor-pointer transition-colors"
                        title="Envoyer manuellement un lien de réinitialisation"
                      >
                        <KeyRound className="h-3 w-3" />
                        <span>Lien reset</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB SYSTEM ROLES: DÉFINITION DES RÔLES ET PERMISSIONS PAR DÉFAUT */}
      {activeTab === 'system_roles' && (
        <SystemRolesManagementTab
          currentUser={currentUser}
          allUsers={allUsers}
          systemRoles={availableRoles}
          onUpdateSystemRole={onUpdateSystemRole}
          onAddSystemRole={onAddSystemRole}
          onDeleteSystemRole={onDeleteSystemRole}
          onUpdateUser={onUpdateUser}
        />
      )}

      {/* TAB 2: ADVANCED PERMISSIONS MENU (POUSSÉ ET GÉRÉ DIRECTEMENT VIA UN MENU) */}
      {activeTab === 'permissions_menu' && (
        <div className="space-y-6">
          {/* Header Description */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-indigo-600" />
                  <span>Menu de Contrôle des Permissions Poussées (RBAC)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  Ce menu permet de définir précisément quelles actions sont autorisées pour chaque collaborateur de l'agence Évasion Soleil. Conformément à la politique d'intégrité, les modifications de noms, de postes et de tags sont strictement restreintes.
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 text-xs text-indigo-950 max-w-xs text-right hidden sm:block">
                <span className="font-extrabold block">Sécurité Renforcée</span>
                <span className="text-[11px] text-indigo-700">Modifications synchronisées en temps réel.</span>
              </div>
            </div>
          </div>

          {/* Permissions Matrix Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider block">
                  Matrice des Droits & Privilèges Individuels
                </span>
                <span className="text-[11px] text-slate-500">
                  Visualisez en direct les droits du poste vs les accès bonus accordés
                </span>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[11px] flex-wrap bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-md bg-emerald-500 text-white text-[9px] font-black">
                    <ShieldCheck className="h-3 w-3" />
                  </span>
                  Rôle par défaut
                </span>
                <span className="flex items-center gap-1.5 font-bold text-amber-900">
                  <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-md bg-amber-400 text-slate-950 text-[9px] font-black">
                    <Star className="h-3 w-3 fill-slate-950 text-slate-950" />
                  </span>
                  Accès Bonus individuel
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-500">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-slate-100 text-slate-400 border border-slate-200 text-[10px]">
                    ✕
                  </span>
                  Non accordé
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3.5 pl-6 min-w-[220px]">Collaborateur</th>
                    <th className="p-3.5 min-w-[170px]">Rôle Système</th>
                    {PERMISSION_DEFINITIONS.map((perm) => (
                      <th
                        key={perm.key}
                        className="p-3.5 text-center min-w-[130px]"
                        title={perm.description}
                      >
                        <div className="flex flex-col items-center">
                          <span>{perm.label}</span>
                          {perm.itOnly && (
                            <span className="mt-0.5 px-1.5 py-0.2 rounded text-[8px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                              IT ONLY
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allUsers.map((user) => {
                    const isSelf = user.id === currentUser.id;
                    const perms = user.permissions || {};
                    const matchedRole = findUserSystemRole(user, availableRoles);

                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isSelf ? 'bg-amber-50/30 font-medium' : ''
                        }`}
                      >
                        {/* User column */}
                        <td className="p-3.5 pl-6">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getSafeAvatar(user.avatar, user.name)}
                              alt={user.name}
                              className="h-8 w-8 rounded-xl object-cover border border-slate-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = getInitialsAvatarUrl(user.name);
                              }}
                            />
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-extrabold text-slate-900">{user.name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-white">
                                    VOUS
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500">{user.grade}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role column */}
                        <td className="p-3.5">
                          <div>
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${
                              user.role === 'admin' || user.role === 'super_admin'
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {matchedRole?.name || user.role}
                            </span>
                          </div>
                        </td>

                        {/* Permission Toggles */}
                        {PERMISSION_DEFINITIONS.map((perm) => {
                          const isEnabled = Boolean(perms[perm.key]);
                          const isBonus = isBonusPermissionForUser(perm.key, user, availableRoles);

                          return (
                            <td key={perm.key} className="p-3 text-center">
                              <button
                                type="button"
                                disabled={!isCurrentUserAdmin}
                                onClick={() => handleTogglePermissionForUser(user, perm.key)}
                                className={`inline-flex items-center justify-center gap-1 h-7 px-2 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                                  isEnabled
                                    ? isBonus
                                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs ring-1 ring-amber-300'
                                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200'
                                } ${!isCurrentUserAdmin ? 'cursor-not-allowed opacity-60' : ''}`}
                                title={`${
                                  isEnabled
                                    ? isBonus
                                      ? `Accès BONUS personnalisé accordé à ${user.name} (cliquez pour retirer)`
                                      : `Permission par défaut du rôle (cliquez pour désactiver)`
                                    : `Non accordé (cliquez pour octroyer un accès bonus)`
                                }`}
                              >
                                {isEnabled ? (
                                  isBonus ? (
                                    <>
                                      <Star className="h-3 w-3 fill-slate-950 text-slate-950" />
                                      <span>Bonus</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="h-3.5 w-3.5" />
                                      <span>Rôle</span>
                                    </>
                                  )
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN CREDENTIALS & BRAND LOGO MANAGEMENT (IT SUPER ADMIN UNIQUEMENT) */}
      {isSuperAdmin && activeTab === 'admin_credentials' && (
        <div className="space-y-6">
          {/* Security & Credentials Configuration Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black shrink-0">
                <Key className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-slate-900">
                    Identifiants du Compte Administrateur Principal (Défaut)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">
                    Compte Maître IT
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Définissez vos identifiants personnalisés pour le compte administrateur. Ces identifiants sont sauvegardés de manière permanente dans la base de données locale et MySQL.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveDefaultAdminCredentials} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span>Nom d'utilisateur administrateur *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="Ex: admin ou nathaniel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Utilisé pour vous connecter à la place de "admin"
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>Courriel de connexion & alertes *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@evasionsoleil.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Permet aussi la connexion directe et la récupération
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-slate-400" />
                  <span>Nom complet officiel affiché</span>
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="System Administrateur ou votre nom"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Mot de passe administrateur *</span>
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Nouveau mot de passe sécurisé..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Minimum 6 caractères. Mémorisez bien ce mot de passe pour vos prochaines connexions.
                </span>
              </div>

              {adminSaveMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    adminSaveStatus === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {adminSaveStatus === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <span>{adminSaveMessage}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={adminSaveStatus === 'saving'}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{adminSaveStatus === 'saving' ? 'Enregistrement en cours...' : 'Enregistrer les identifiants administrateur'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Logo Location & Branding Guide Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md">
            <div className="flex items-start gap-4 mb-5 pb-5 border-b border-slate-800">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black shrink-0">
                <Camera className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>Emplacement du Logo sur tout le site</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                    GUIDE OFFICIEL
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Voici les fichiers exacts où se trouve le logo de l'agence pour le modifier ou le remplacer :
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                  <span className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px]">1</span>
                  <span>Logo Vectoriel du Site</span>
                </div>
                <p className="text-slate-300 mb-2 font-mono text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-800 text-amber-300">
                  /public/icon.svg
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  C'est le fichier source vectoriel SVG affiché en haut à gauche de la barre de navigation et dans les onglets. Vous pouvez y déposer votre logo au format SVG.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                  <span className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px]">2</span>
                  <span>Icônes de l'App Mobile</span>
                </div>
                <p className="text-slate-300 mb-2 font-mono text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-800 text-amber-300">
                  /public/pwa-192x192.png<br />
                  /public/pwa-512x512.png
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Ce sont les icônes de l'application mobile PWA qui s'affichent sur l'écran d'accueil de votre iPhone ou téléphone Android.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                  <span className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px]">3</span>
                  <span>Composant Navbar</span>
                </div>
                <p className="text-slate-300 mb-2 font-mono text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-800 text-amber-300">
                  /src/components/Navbar.tsx
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Lignes 76-80 : le composant de la barre de navigation qui affiche le logo et le titre « Évasion Soleil ».
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EMAIL LOGINS & SMTP CONFIGURATION (.env) (IT ADMIN) */}
      {isITAdmin && activeTab === 'email_logins' && (
        <div className="space-y-6">
          {/* Header Explanation Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-md relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-sm mt-0.5">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-white">
                      Configuration des Accès & Logins Courriels (Fichier .env)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 uppercase">
                      Protection & Sécurité Serveur
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    Conformément aux normes strictes de cybersécurité, les mots de passe de messagerie et identifiants SMTP 
                    sont isolés dans le fichier <strong>.env</strong> sur votre serveur (Pterodactyl, cPanel ou VPS). 
                    Le système gère deux comptes distincts : <strong>martine@evasionsoleil.com</strong> (Chatbot) et <strong>ne_pas_repondre@evasionsoleil.com</strong> (Devis).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchEmailStatus}
                disabled={loadingEmailStatus}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-200 cursor-pointer shrink-0 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingEmailStatus ? 'animate-spin text-amber-400' : ''}`} />
                <span>Actualiser l'état</span>
              </button>
            </div>
          </div>

          {/* Side by side: Martine vs Ne Pas Répondre */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account 1: Martine V. */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                      <Sparkles className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">1. Courriel Martine V.</h4>
                      <p className="text-[11px] text-slate-500 font-mono">martine@evasionsoleil.com</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    emailStatus?.martine?.smtpConfigured
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {emailStatus?.martine?.smtpConfigured ? 'SMTP Configuré' : 'En attente .env'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  <strong>Usage :</strong> Envoyé directement au visiteur et à l'agence lorsqu'un client discute avec le Chatbot Martine et demande à être rappelé par un conseiller.
                </p>

                <div className="space-y-2.5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-4 font-mono">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Expéditeur affiché :</span>
                    <span className="font-bold text-slate-800">{emailStatus?.martine?.fromEmail || 'martine@evasionsoleil.com'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Nom affiché :</span>
                    <span className="font-bold text-slate-800">{emailStatus?.martine?.fromName || 'Martine V. - Voyages Évasion Soleil'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Hôte SMTP :</span>
                    <span className="font-bold text-slate-800">{emailStatus?.martine?.smtpHost || 'smtp.evasionsoleil.com'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Port SMTP :</span>
                    <span className="font-bold text-slate-800">{emailStatus?.martine?.smtpPort || 587}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Utilisateur Login :</span>
                    <span className="font-bold text-slate-800">{emailStatus?.martine?.smtpUser || 'martine@evasionsoleil.com'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Variable mot de passe :</span>
                    <span className="font-bold text-amber-600">MARTINE_SMTP_PASS</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTestEmail('martine')}
                disabled={testingEmail}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Tester l'envoi depuis Martine V.</span>
              </button>
            </div>

            {/* Account 2: Ne Pas Répondre */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-black">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">2. Courriel Ne Pas Répondre</h4>
                      <p className="text-[11px] text-slate-500 font-mono">ne_pas_repondre@evasionsoleil.com</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    emailStatus?.noreply?.smtpConfigured
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {emailStatus?.noreply?.smtpConfigured ? 'SMTP Configuré' : 'En attente .env'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  <strong>Usage :</strong> Envoyé comme accusé de réception officiel et professionnel dès qu'un voyageur soumet un formulaire de demande de devis sur le site.
                </p>

                <div className="space-y-2.5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-4 font-mono">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Expéditeur affiché :</span>
                    <span className="font-bold text-slate-800">{emailStatus?.noreply?.fromEmail || 'ne_pas_repondre@evasionsoleil.com'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Nom affiché :</span>
                    <span className="font-bold text-slate-800">{emailStatus?.noreply?.fromName || 'Voyages Évasion Soleil'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Hôte SMTP :</span>
                    <span className="font-bold text-slate-800">{emailStatus?.noreply?.smtpHost || 'smtp.evasionsoleil.com'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Port SMTP :</span>
                    <span className="font-bold text-slate-800">{emailStatus?.noreply?.smtpPort || 587}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Utilisateur Login :</span>
                    <span className="font-bold text-slate-800">{emailStatus?.noreply?.smtpUser || 'ne_pas_repondre@evasionsoleil.com'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Variable mot de passe :</span>
                    <span className="font-bold text-blue-600">NOREPLY_SMTP_PASS</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTestEmail('noreply')}
                disabled={testingEmail}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Tester l'envoi depuis Ne Pas Répondre</span>
              </button>
            </div>
          </div>

          {/* Test Email Live Console */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs">
            <h4 className="font-black text-sm text-slate-900 mb-1 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-amber-500" />
              <span>Outil de Test en Direct (Diagnostic SMTP)</span>
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Envoyez un courriel de test vers votre adresse personnelle pour vérifier que les courriels s'envoient bien sans tomber en erreur.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Votre adresse courriel (ex: mon.nom@gmail.com)"
                value={testEmailDestination}
                onChange={(e) => setTestEmailDestination(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
              />
              <button
                type="button"
                onClick={() => handleTestEmail('martine')}
                disabled={testingEmail}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Tester Martine</span>
              </button>
              <button
                type="button"
                onClick={() => handleTestEmail('noreply')}
                disabled={testingEmail}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Tester Ne Pas Répondre</span>
              </button>
            </div>

            {testingEmail && (
              <div className="mt-4 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <span>Connexion au serveur SMTP en cours et envoi du message...</span>
              </div>
            )}

            {testEmailResult && (
              <div className={`mt-4 p-4 rounded-xl text-xs border flex items-start gap-3 ${
                testEmailResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {testEmailResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {testEmailResult.success ? 'Succès du test SMTP !' : 'Résultat du test SMTP :'}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                    {testEmailResult.message}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Guide .env & Copy-paste section */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
              <div>
                <h4 className="font-black text-sm text-white flex items-center gap-2">
                  <Server className="h-4 w-4 text-amber-400" />
                  <span>Variables à coller dans votre fichier .env</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Remplissez vos vrais mots de passe SMTP dans les guillemets <code className="text-amber-300">MARTINE_SMTP_PASS=""</code> et <code className="text-amber-300">NOREPLY_SMTP_PASS=""</code>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(envSampleSnippet);
                  setCopiedEnv(true);
                  setTimeout(() => setCopiedEnv(false), 3000);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black cursor-pointer transition-colors shadow-xs shrink-0"
              >
                {copiedEnv ? (
                  <>
                    <Check className="h-4 w-4 text-slate-950" />
                    <span>Copié dans le presse-papiers !</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copier le modèle .env</span>
                  </>
                )}
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-[11px] text-amber-300 font-mono overflow-x-auto leading-relaxed selection:bg-amber-500 selection:text-slate-950">
              {envSampleSnippet}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL: AJOUTER UN MEMBRE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-500" />
                <span>Nouveau Membre de l'Équipe</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom et Prénom officiel *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Élodie Gagnon"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Courriel *</label>
                  <input
                    type="email"
                    required
                    placeholder="elodie.g@evasionsoleil.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom d'utilisateur</label>
                  <input
                    type="text"
                    placeholder="elodie.g"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mot de passe * <span className="text-[10px] text-emerald-600 font-normal">(Requis MySQL)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Définir le mot de passe..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Rôle Système</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">{availableRoles.length} rôles disponibles</span>
                  </label>
                  <select
                    value={newSelectedRoleId}
                    onChange={(e) => handleSelectNewUserRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.roleKey === 'super_admin' ? 'Super Admin' : r.roleKey === 'admin' ? 'Admin' : 'Agent'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Poste & Titre officiel affiché</label>
                <input
                  type="text"
                  placeholder="Ex: Conseillère Voyages - Forfaits Sud & Caraïbes"
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              {/* ACCÈS BONUS & PERMISSIONS PAR DÉFAUT DU RÔLE CHOISI */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <div>
                      <span className="font-extrabold text-slate-800 text-xs">
                        Permissions & Accès Bonus
                      </span>
                      <span className="ml-2 text-[10px] font-semibold text-slate-500">
                        (Rôle : {availableRoles.find(r => r.id === newSelectedRoleId)?.name || 'Sélectionné'})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPermissionsInAddModal(!showPermissionsInAddModal)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showPermissionsInAddModal ? 'Masquer' : 'Personnaliser / Ajouter des bonus'}</span>
                    {showPermissionsInAddModal ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Summary badges */}
                <div className="flex items-center gap-2 text-[10px] font-medium flex-wrap pt-1">
                  {(() => {
                    const selRole = availableRoles.find(r => r.id === newSelectedRoleId) || availableRoles[0];
                    const activeCount = Object.values(newUserPermissions || {}).filter(Boolean).length;
                    const roleBaseCount = Object.values(selRole?.permissions || {}).filter(Boolean).length;
                    const bonusCount = Object.entries(newUserPermissions || {}).filter(
                      ([k, v]) => Boolean(v) && !Boolean(selRole?.permissions?.[k as keyof UserPermissions])
                    ).length;

                    return (
                      <>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          {activeCount} active(s) ({roleBaseCount} par défaut du rôle)
                        </span>
                        {bonusCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black flex items-center gap-1 border border-amber-300">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            {bonusCount} accès bonus accordé(s)
                          </span>
                        ) : (
                          <span className="text-slate-400">Aucun accès bonus accordé</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (selRole?.permissions) {
                              setNewUserPermissions({ ...selRole.permissions });
                            }
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer ml-auto"
                          title="Réaligner les permissions sur le rôle système"
                        >
                          Réinitialiser au rôle
                        </button>
                      </>
                    );
                  })()}
                </div>

                {/* Detailed Collapsible Permission List with Bonus Highlights */}
                {showPermissionsInAddModal && (
                  <div className="mt-3 pt-3 border-t border-slate-200 max-h-64 overflow-y-auto pr-1 space-y-3">
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Cochez des cases supplémentaires pour octroyer des <strong className="text-amber-700">accès bonus</strong> personnalisés à ce collaborateur, en plus des permissions définies par son rôle.
                    </p>

                    {PERMISSION_CATEGORIES.map((cat) => {
                      const selRole = availableRoles.find(r => r.id === newSelectedRoleId) || availableRoles[0];
                      const permsInCat = ALL_PERMISSION_DEFINITIONS.filter(p => p.category === cat.id);

                      return (
                        <div key={cat.id} className="space-y-1.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {cat.name}
                          </div>
                          <div className="space-y-1">
                            {permsInCat.map((perm) => {
                              const isEnabled = Boolean(newUserPermissions[perm.key]);
                              const isFromRole = Boolean(selRole?.permissions?.[perm.key]);
                              const isBonus = isEnabled && !isFromRole;

                              return (
                                <label
                                  key={perm.key}
                                  className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                                    isEnabled
                                      ? isBonus
                                        ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200'
                                        : 'bg-white border-slate-300'
                                      : 'bg-slate-100/60 border-slate-200 opacity-70 hover:opacity-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 pr-2">
                                    <input
                                      type="checkbox"
                                      checked={isEnabled}
                                      onChange={() => handleToggleNewUserPermission(perm.key)}
                                      className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <div>
                                      <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                                        <span>{perm.label}</span>
                                        {isBonus && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-slate-950 uppercase flex items-center gap-0.5">
                                            <Star className="h-2.5 w-2.5 fill-slate-950" />
                                            Bonus
                                          </span>
                                        )}
                                        {isEnabled && isFromRole && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800">
                                            Rôle
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-500 leading-tight">
                                        {perm.description}
                                      </div>
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tags Spéciaux */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Tags spéciaux attribués (IT) :
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_SPECIAL_TAGS.map((preset) => {
                    const active = newSpecialTags.includes(preset.label);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleToggleNewUserTag(preset.label)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        [{preset.label}]
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Autre tag personnalisé..."
                    value={newCustomTag}
                    onChange={(e) => setNewCustomTag(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCustomTag}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer"
                  >
                    + Ajouter
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreatingUser ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Création en cours...</span>
                    </>
                  ) : (
                    <span>Créer le membre</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN : RÉINITIALISATION DU MOT DE PASSE & ENVOI DE LIEN */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Réinitialiser le mot de passe
                  </h3>
                  <p className="text-xs text-slate-500">
                    Outil d'administration sécurisé Évasion Soleil
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setResetModalUser(null);
                  setAdminResetData(null);
                  setAdminResetFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Target User Info */}
            <div className="my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <img
                src={getSafeAvatar(resetModalUser.avatar, resetModalUser.name)}
                alt={resetModalUser.name}
                className="h-12 w-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getInitialsAvatarUrl(resetModalUser.name);
                }}
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-black text-sm text-slate-900 truncate">
                  {resetModalUser.name}
                </h4>
                <p className="text-xs text-slate-600 font-semibold">{resetModalUser.grade}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{resetModalUser.email}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-200 text-slate-700">
                {resetModalUser.role}
              </span>
            </div>

            {/* Feedback alert */}
            {adminResetFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs mb-4 flex items-start gap-2 ${
                  adminResetFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border border-rose-300 text-rose-900'
                }`}
              >
                {adminResetFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 font-medium">{adminResetFeedback.message}</div>
              </div>
            )}

            {isGeneratingReset ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin text-[#338b84] mx-auto" />
                <p className="text-xs text-slate-500">Génération du code et du lien sécurisé...</p>
              </div>
            ) : adminResetData ? (
              <div className="space-y-4 text-xs">
                {/* Option 1: Send by Email */}
                <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-950 flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-[#338b84]" />
                      <span>Envoyer par courriel au collaborateur</span>
                    </span>
                    <span className="text-[10px] font-bold text-teal-700 uppercase bg-teal-100/80 px-2 py-0.5 rounded-md">
                      Recommandé
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-800 leading-relaxed">
                    Envoie immédiatement le lien de réinitialisation et le code à 6 chiffres à <strong>{adminResetData.email}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={handleSendResetEmailNow}
                    disabled={isSendingResetEmail}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#338b84] hover:bg-[#286f6a] text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  >
                    {isSendingResetEmail ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Envoi en cours via SMTP...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Envoyer le courriel de réinitialisation maintenant</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Option 2: Direct Link */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <label className="font-bold text-slate-700 block text-[11px]">
                    Lien direct de réinitialisation (valide 15 minutes) :
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={adminResetData.resetUrl || ''}
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-800 font-mono select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (adminResetData.resetUrl) {
                          navigator.clipboard.writeText(adminResetData.resetUrl);
                          setCopiedResetLink(true);
                          setTimeout(() => setCopiedResetLink(false), 2500);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedResetLink ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Option 3: 6-digit verification code */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="block font-bold text-slate-700 text-[11px]">
                      Code de vérification (6 chiffres) :
                    </span>
                    <span className="font-mono text-base font-black tracking-widest text-[#338b84]">
                      {adminResetData.code || '------'}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      À communiquer au collaborateur de vive voix ou par clavardage.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (adminResetData.code) {
                        navigator.clipboard.writeText(adminResetData.code);
                        setCopiedResetCode(true);
                        setTimeout(() => setCopiedResetCode(false), 2500);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    {copiedResetCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Option 4: Direct Admin Password Override */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="font-bold text-slate-700 block text-[11px] mb-1">
                    Ou définir immédiatement un nouveau mot de passe :
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nouveau mot de passe pour ce compte..."
                      value={adminDirectPassword}
                      onChange={(e) => setAdminDirectPassword(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleDirectPasswordSave}
                      disabled={isDirectlySettingPass || !adminDirectPassword.trim()}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      {isDirectlySettingPass ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Footer */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setResetModalUser(null);
                  setAdminResetData(null);
                  setAdminResetFeedback(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
