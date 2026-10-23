import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Plus,
  Save,
  Zap,
  Check,
  X,
  Edit2,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  Bot,
  FileText,
  Mail,
  BarChart3,
  Sliders,
  CheckCircle2,
  Tag,
  RefreshCw,
  Info
} from 'lucide-react';
import { User, SystemRole, UserPermissions } from '../types';
import {
  PERMISSION_CATEGORIES,
  ALL_PERMISSION_DEFINITIONS,
  DEFAULT_FALLBACK_ROLES,
  PermissionDefinition,
} from '../utils/permissionUtils';

interface SystemRolesManagementTabProps {
  currentUser: User;
  allUsers: User[];
  systemRoles?: SystemRole[];
  onUpdateSystemRole?: (role: SystemRole, syncUsers?: boolean) => Promise<any>;
  onAddSystemRole?: (role: Omit<SystemRole, 'id'>) => Promise<any>;
  onDeleteSystemRole?: (id: string) => Promise<boolean | void>;
  onUpdateUser?: (userId: string, updates: Partial<User>) => Promise<void>;
}

const BADGE_COLOR_OPTIONS = [
  { label: 'Indigo (IT & Admin)', value: 'bg-indigo-600 text-white', border: 'border-indigo-700' },
  { label: 'Violet (Direction & Gérance)', value: 'bg-purple-600 text-white', border: 'border-purple-700' },
  { label: 'Émeraude (Senior & Expert)', value: 'bg-emerald-600 text-white', border: 'border-emerald-700' },
  { label: 'Ciel (Croisières & Mer)', value: 'bg-sky-600 text-white', border: 'border-sky-700' },
  { label: 'Sarcelle (Junior & Ventes)', value: 'bg-teal-600 text-white', border: 'border-teal-700' },
  { label: 'Ambre (Support & Accueil)', value: 'bg-amber-600 text-white', border: 'border-amber-700' },
  { label: 'Rose (Animation & Event)', value: 'bg-rose-600 text-white', border: 'border-rose-700' },
  { label: 'Bleu Royal (Affaires & Pro)', value: 'bg-blue-600 text-white', border: 'border-blue-700' },
];

export const SystemRolesManagementTab: React.FC<SystemRolesManagementTabProps> = ({
  currentUser,
  allUsers,
  systemRoles,
  onUpdateSystemRole,
  onAddSystemRole,
  onDeleteSystemRole,
}) => {
  // Liste locale des rôles pour modification réactive
  const initialRoles = systemRoles && systemRoles.length > 0 ? systemRoles : DEFAULT_FALLBACK_ROLES;
  const [roles, setRoles] = useState<SystemRole[]>(initialRoles);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(initialRoles[0]?.id || null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [syncingRoleId, setSyncingRoleId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modale de création de rôle
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState<'agent' | 'admin' | 'super_admin'>('agent');
  const [newRoleGrade, setNewRoleGrade] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleBadgeColor, setNewRoleBadgeColor] = useState('bg-teal-600 text-white');
  const [newRoleTag, setNewRoleTag] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<UserPermissions>({
    canViewSubmissions: true,
    canManageSubmissions: true,
    canAccessTeamChat: true,
    canToggleBot: false,
    canEditForm: false,
  });

  // Modale d'édition des infos du rôle
  const [editingRole, setEditingRole] = useState<SystemRole | null>(null);

  // Synchroniser l'état local si les props changent
  React.useEffect(() => {
    if (systemRoles && systemRoles.length > 0) {
      setRoles(systemRoles);
    }
  }, [systemRoles]);

  const isITAdmin =
    currentUser.role === 'super_admin' ||
    currentUser.username?.toLowerCase() === 'admin' ||
    currentUser.grade?.toLowerCase().includes('it') ||
    currentUser.specialTags?.includes('ADMIN') ||
    currentUser.specialTags?.includes('IT');

  // Compter le nombre de collaborateurs ayant ce rôle
  const getRoleUsers = (role: SystemRole): User[] => {
    return allUsers.filter((u) => {
      if (u.systemRoleId && u.systemRoleId === role.id) return true;
      if (!u.systemRoleId) {
        if (role.roleKey === 'super_admin' && u.role === 'super_admin') return true;
        if (role.roleKey === 'admin' && (u.role === 'admin' || u.role === 'directeur')) return true;
        if (role.grade && u.grade && role.grade.toLowerCase().trim() === u.grade.toLowerCase().trim()) return true;
      }
      return false;
    });
  };

  // Basculer une permission par défaut pour un rôle
  const handleToggleDefaultPermission = (roleId: string, permKey: keyof UserPermissions) => {
    if (!isITAdmin) {
      alert("Action refusée : Seuls les Administrateurs IT peuvent modifier les permissions par défaut d'un rôle système.");
      return;
    }

    setRoles((prevRoles) =>
      prevRoles.map((r) => {
        if (r.id !== roleId) return r;
        const currentVal = Boolean(r.permissions?.[permKey]);
        return {
          ...r,
          permissions: {
            ...r.permissions,
            [permKey]: !currentVal,
          },
        };
      })
    );
  };

  // Enregistrer les permissions par défaut du rôle dans le backend
  const handleSaveRolePermissions = async (role: SystemRole) => {
    if (!isITAdmin) {
      alert("Action refusée : Réservé aux Administrateurs IT.");
      return;
    }

    setSavingRoleId(role.id);
    try {
      if (onUpdateSystemRole) {
        await onUpdateSystemRole(role, false);
      } else {
        // Sauvegarde directe via l'API REST
        const res = await fetch(`/api/system-roles/${role.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, syncUsers: false }),
        });
        if (!res.ok) throw new Error('Erreur lors de la sauvegarde du rôle');
      }

      setStatusMessage({
        type: 'success',
        text: `Permissions par défaut du rôle "${role.name}" enregistrées avec succès ! Les futurs comptes créés avec ce rôle recevront ces accès.`,
      });
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || "Erreur lors de l'enregistrement des permissions du rôle.",
      });
    } finally {
      setSavingRoleId(null);
    }
  };

  // Synchroniser les permissions par défaut avec tous les collaborateurs ayant ce rôle
  const handleSyncRoleWithUsers = async (role: SystemRole) => {
    const affectedUsers = getRoleUsers(role);
    if (affectedUsers.length === 0) {
      alert(`Aucun collaborateur n'est actuellement rattaché au rôle "${role.name}". Les permissions sont prêtes pour les futurs comptes.`);
      return;
    }

    const confirmSync = window.confirm(
      `Voulez-vous synchroniser les permissions par défaut du rôle "${role.name}" avec les ${affectedUsers.length} collaborateur(s) actuel(s) ?\n\n` +
      `Membres concernés : ${affectedUsers.map((u) => u.name).join(', ')}\n\n` +
      `Note : Leurs accès de base seront mis à jour conformément à ce rôle.`
    );

    if (!confirmSync) return;

    setSyncingRoleId(role.id);
    try {
      if (onUpdateSystemRole) {
        await onUpdateSystemRole(role, true);
      } else {
        const res = await fetch(`/api/system-roles/${role.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, syncUsers: true }),
        });
        if (!res.ok) throw new Error('Erreur lors de la synchronisation avec les utilisateurs');
      }

      setStatusMessage({
        type: 'success',
        text: `Synchronisation réussie ! Les permissions par défaut du rôle "${role.name}" ont été appliquées à ${affectedUsers.length} collaborateur(s).`,
      });
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Erreur lors de la synchronisation.',
      });
    } finally {
      setSyncingRoleId(null);
    }
  };

  // Création d'un nouveau rôle système
  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      alert('Veuillez renseigner au minimum un nom pour ce rôle.');
      return;
    }

    const newId = `role_${Date.now()}`;
    const grade = newRoleGrade.trim() || newRoleName.trim();
    const tag = newRoleTag.trim().toUpperCase() || newRoleName.trim().toUpperCase().substring(0, 12);

    const createdRole: SystemRole = {
      id: newId,
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || `Rôle système personnalisé pour le poste de ${grade}.`,
      roleKey: newRoleKey,
      grade,
      badgeColor: newRoleBadgeColor,
      defaultSpecialTag: tag,
      specialTags: [tag],
      permissions: newRolePermissions,
      isDefault: false,
    };

    try {
      if (onAddSystemRole) {
        await onAddSystemRole(createdRole);
      } else {
        const res = await fetch('/api/system-roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createdRole),
        });
        if (!res.ok) throw new Error('Erreur création de rôle');
      }

      setRoles((prev) => [...prev, createdRole]);
      setShowCreateModal(false);
      setNewRoleName('');
      setNewRoleGrade('');
      setNewRoleDesc('');
      setNewRoleTag('');
      setExpandedRoleId(createdRole.id);

      setStatusMessage({
        type: 'success',
        text: `Nouveau rôle système "${createdRole.name}" créé avec succès et prêt à être attribué !`,
      });
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création du rôle');
    }
  };

  // Suppression d'un rôle
  const handleDeleteRole = async (role: SystemRole) => {
    if (role.isDefault || role.id === 'role_sysadmin' || role.id === 'role_admin_agence') {
      alert("Ce rôle système fondamental est protégé et ne peut pas être supprimé.");
      return;
    }

    const usersWithRole = getRoleUsers(role);
    if (usersWithRole.length > 0) {
      alert(`Impossible de supprimer ce rôle : ${usersWithRole.length} collaborateur(s) y sont actuellement rattachés. Réassignez-les d'abord.`);
      return;
    }

    if (!window.confirm(`Confirmez-vous la suppression définitive du rôle système "${role.name}" ?`)) {
      return;
    }

    try {
      if (onDeleteSystemRole) {
        await onDeleteSystemRole(role.id);
      } else {
        await fetch(`/api/system-roles/${role.id}`, { method: 'DELETE' });
      }
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      setStatusMessage({
        type: 'info',
        text: `Rôle système "${role.name}" supprimé.`,
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  // Enregistrer l'édition des métadonnées du rôle
  const handleSaveRoleDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    try {
      if (onUpdateSystemRole) {
        await onUpdateSystemRole(editingRole, false);
      } else {
        await fetch(`/api/system-roles/${editingRole.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: editingRole, syncUsers: false }),
        });
      }

      setRoles((prev) => prev.map((r) => (r.id === editingRole.id ? editingRole : r)));
      setEditingRole(null);
      setStatusMessage({
        type: 'success',
        text: `Informations du rôle "${editingRole.name}" mises à jour avec succès.`,
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Banner / Toast message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold shadow-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border border-rose-200'
              : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : (
              <Info className="h-5 w-5 text-indigo-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header explanation & actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Gabarits RBAC & Rôles Métier</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Rôles Système & Permissions par Défaut
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Définissez ici les permissions accordées par défaut à chaque poste de l'agence.
              Lors de la création d'un collaborateur, ces permissions sont automatiquement appliquées.
              Vous pouvez ensuite accorder des <strong>accès bonus personnalisés</strong> à chaque membre sans modifier le gabarit global.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau Rôle Système</span>
            </button>
          </div>
        </div>
      </div>

      {/* Roles List & Accordions */}
      <div className="space-y-4">
        {roles.map((role) => {
          const isExpanded = expandedRoleId === role.id;
          const assignedUsers = getRoleUsers(role);
          const activePermsCount = ALL_PERMISSION_DEFINITIONS.filter(
            (p) => Boolean(role.permissions?.[p.key])
          ).length;
          const isSaving = savingRoleId === role.id;
          const isSyncing = syncingRoleId === role.id;

          return (
            <div
              key={role.id}
              className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                isExpanded ? 'border-indigo-400 ring-2 ring-indigo-50/50 shadow-md' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Role Header Card */}
              <div
                className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none bg-slate-50/40 hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className={`px-3 py-1 rounded-xl text-xs font-black shadow-xs shrink-0 ${role.badgeColor}`}>
                    {role.name}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base">
                        {role.grade}
                      </h3>
                      {role.isDefault && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          Système
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">
                        key: {role.roleKey}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl line-clamp-2">
                      {role.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end lg:self-center" onClick={(e) => e.stopPropagation()}>
                  {/* Assigned Users Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold" title={`Collaborateurs actuels : ${assignedUsers.map(u => u.name).join(', ') || 'Aucun'}`}>
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                    <span>{assignedUsers.length} membre{assignedUsers.length > 1 ? 's' : ''}</span>
                  </div>

                  {/* Active perms counter */}
                  <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs font-bold">
                    <span>{activePermsCount} / {ALL_PERMISSION_DEFINITIONS.length} accès par défaut</span>
                  </div>

                  {/* Expand / Collapse Icon */}
                  <button
                    type="button"
                    onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Expanded Permissions Editor */}
              {isExpanded && (
                <div className="p-5 sm:p-6 border-t border-slate-200 space-y-6 bg-white animate-in fade-in">
                  {/* Actions Bar for this role */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-extrabold text-slate-800">
                        Configuration des accès par défaut du rôle "{role.name}"
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Edit Details */}
                      <button
                        type="button"
                        onClick={() => setEditingRole(role)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                        title="Modifier le nom, le grade ou la couleur du badge"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Modifier infos</span>
                      </button>

                      {/* Sync with existing users */}
                      <button
                        type="button"
                        onClick={() => handleSyncRoleWithUsers(role)}
                        disabled={isSyncing || assignedUsers.length === 0}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        title="Appliquer ces permissions aux collaborateurs ayant ce rôle"
                      >
                        {isSyncing ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Zap className="h-3 w-3 text-indigo-600" />
                        )}
                        <span>Synchroniser ({assignedUsers.length} membres)</span>
                      </button>

                      {/* Save Default Permissions */}
                      <button
                        type="button"
                        onClick={() => handleSaveRolePermissions(role)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Enregistrement...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            <span>Enregistrer les permissions</span>
                          </>
                        )}
                      </button>

                      {/* Delete Custom Role */}
                      {!role.isDefault && role.id !== 'role_sysadmin' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(role)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                          title="Supprimer ce rôle système personnalisé"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Supprimer</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Categories Grids */}
                  <div className="space-y-6">
                    {PERMISSION_CATEGORIES.map((cat) => {
                      const permsInCat = ALL_PERMISSION_DEFINITIONS.filter((p) => p.category === cat.id);
                      if (permsInCat.length === 0) return null;

                      return (
                        <div key={cat.id} className="space-y-3">
                          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                            {cat.id === 'chat' && <Bot className="h-4 w-4 text-emerald-600" />}
                            {cat.id === 'submissions' && <FileText className="h-4 w-4 text-sky-600" />}
                            {cat.id === 'crm' && <Users className="h-4 w-4 text-violet-600" />}
                            {cat.id === 'newsletter' && <Mail className="h-4 w-4 text-amber-600" />}
                            {cat.id === 'stats' && <BarChart3 className="h-4 w-4 text-indigo-600" />}
                            {cat.id === 'system' && <Shield className="h-4 w-4 text-rose-600" />}
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              {cat.name}
                            </h4>
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({permsInCat.filter((p) => Boolean(role.permissions?.[p.key])).length}/{permsInCat.length})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {permsInCat.map((perm) => {
                              const isChecked = Boolean(role.permissions?.[perm.key]);

                              return (
                                <div
                                  key={perm.key}
                                  onClick={() => handleToggleDefaultPermission(role.id, perm.key)}
                                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                                    isChecked
                                      ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/20'
                                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                                  }`}
                                >
                                  <div
                                    className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                      isChecked
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'bg-white border border-slate-300 text-transparent'
                                    }`}
                                  >
                                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                                  </div>

                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`text-xs font-bold leading-tight ${
                                          isChecked ? 'text-emerald-950' : 'text-slate-800'
                                        }`}
                                      >
                                        {perm.label}
                                      </span>
                                      {perm.itOnly && (
                                        <span className="text-[9px] font-black px-1 rounded bg-indigo-100 text-indigo-800">
                                          IT
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-snug">
                                      {perm.description}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: NOUVEAU RÔLE SYSTÈME */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                <h3 className="font-black text-slate-900 text-lg">
                  Créer un Nouveau Rôle Système
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom du Rôle Système *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conseiller Grands Comptes / VIP"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Clé Système Technique *
                  </label>
                  <select
                    value={newRoleKey}
                    onChange={(e: any) => setNewRoleKey(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="agent">agent (Conseiller / Opérationnel)</option>
                    <option value="admin">admin (Direction / Gestionnaire)</option>
                    <option value="super_admin">super_admin (Administrateur IT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grade Officiel Affiché
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Spécialiste Voyages Haut de Gamme"
                    value={newRoleGrade}
                    onChange={(e) => setNewRoleGrade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Couleur du Badge
                  </label>
                  <select
                    value={newRoleBadgeColor}
                    onChange={(e) => setNewRoleBadgeColor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    {BADGE_COLOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tag Spécial par Défaut
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: VIP, CROISIÈRES..."
                    value={newRoleTag}
                    onChange={(e) => setNewRoleTag(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 uppercase focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description des Responsabilités
                </label>
                <textarea
                  rows={2}
                  placeholder="Décrivez les missions principales de ce rôle..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Aperçu du badge */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <span className="text-xs text-slate-500">Aperçu du badge :</span>
                <span className={`px-3 py-1 rounded-xl text-xs font-black shadow-xs ${newRoleBadgeColor}`}>
                  {newRoleName.trim() || 'Nouveau Rôle'}
                </span>
                {newRoleTag && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-900 text-white">
                    [{newRoleTag.trim().toUpperCase()}]
                  </span>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100 text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Créer le rôle système
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ÉDITION DES INFORMATIONS DU RÔLE */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base">
                  Modifier les Infos du Rôle
                </h3>
              </div>
              <button
                onClick={() => setEditingRole(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleDetails} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom du Rôle
                </label>
                <input
                  type="text"
                  required
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Grade / Poste Officiel par Défaut
                </label>
                <input
                  type="text"
                  required
                  value={editingRole.grade}
                  onChange={(e) => setEditingRole({ ...editingRole, grade: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Couleur du Badge
                </label>
                <select
                  value={editingRole.badgeColor}
                  onChange={(e) => setEditingRole({ ...editingRole, badgeColor: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-semibold"
                >
                  {BADGE_COLOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100 text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
