import { User, SystemRole, UserPermissions } from '../types';

export interface PermissionDefinition {
  key: keyof UserPermissions;
  label: string;
  description: string;
  category: 'chat' | 'submissions' | 'crm' | 'newsletter' | 'stats' | 'system';
  itOnly?: boolean;
}

export interface PermissionCategoryConfig {
  id: 'chat' | 'submissions' | 'crm' | 'newsletter' | 'stats' | 'system';
  name: string;
  description: string;
  iconName: string;
  color: string;
}

export const PERMISSION_CATEGORIES: PermissionCategoryConfig[] = [
  {
    id: 'chat',
    name: 'Chatbot & Clavardage Client',
    description: 'Contrôle et prise en main directe du bot d\'accueil Martine V.',
    iconName: 'Bot',
    color: 'emerald',
  },
  {
    id: 'submissions',
    name: 'Soumissions & Formulaires',
    description: 'Gestion du pipeline de devis, tags de dossiers et questions de formulaire.',
    iconName: 'FileText',
    color: 'sky',
  },
  {
    id: 'crm',
    name: 'CRM & Portefeuille Clients',
    description: 'Gestion des fiches de voyageurs et fusion de profils clients.',
    iconName: 'Users',
    color: 'violet',
  },
  {
    id: 'newsletter',
    name: 'Infolettres & Marketing',
    description: 'Création et diffusion de campagnes par courriel.',
    iconName: 'Mail',
    color: 'amber',
  },
  {
    id: 'stats',
    name: 'Statistiques & Performance',
    description: 'Consultation des métriques d\'affaires, chiffres de ventes et conversion.',
    iconName: 'BarChart3',
    color: 'indigo',
  },
  {
    id: 'system',
    name: 'Administration & Système IT',
    description: 'Gestion des collaborateurs, accès serveur, sécurité et attributions.',
    iconName: 'Shield',
    color: 'rose',
  },
];

export const ALL_PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Chatbot & Clavardage
  {
    key: 'canToggleBot',
    label: 'Contrôler le Bot Martine V.',
    description: 'Activer, mettre en pause ou réinitialiser le robot de clavardage.',
    category: 'chat',
  },
  {
    key: 'canInterveneChat',
    label: 'Intervenir en direct sur le chat client',
    description: 'Prendre le relais de Martine V. et converser avec les visiteurs du site.',
    category: 'chat',
  },
  {
    key: 'canManageBot',
    label: 'Configurer le Bot Martine V.',
    description: 'Modifier la personnalité, les consignes et le prompt de Martine V.',
    category: 'chat',
    itOnly: true,
  },
  {
    key: 'canBlockIps',
    label: 'Modération & Blocage des adresses IP',
    description: 'Bannir ou débannir les adresses IP suspectes ou malveillantes.',
    category: 'chat',
    itOnly: true,
  },

  // Soumissions & Devis
  {
    key: 'canViewSubmissions',
    label: 'Consulter les soumissions de devis',
    description: 'Voir les demandes de forfaits, croisières et voyages déposées.',
    category: 'submissions',
  },
  {
    key: 'canManageSubmissions',
    label: 'Traiter et assigner les soumissions',
    description: 'Changer les statuts, assigner un conseiller et ajouter des notes.',
    category: 'submissions',
  },
  {
    key: 'canManageSubmissionTags',
    label: 'Gérer les tags de dossiers (Pipeline)',
    description: 'Créer, attribuer et supprimer les étiquettes de dossiers voyages.',
    category: 'submissions',
    itOnly: true,
  },
  {
    key: 'canUnassignBooked',
    label: 'Modifier le conseiller d\'un dossier Réservé',
    description: 'Retirer ou changer le conseiller assigné lorsqu\'un dossier est finalisé.',
    category: 'submissions',
    itOnly: true,
  },
  {
    key: 'canEditForm',
    label: 'Personnaliser le formulaire de devis',
    description: 'Modifier les étapes, destinations et options du formulaire interactif.',
    category: 'submissions',
  },

  // CRM
  {
    key: 'canMergeClients',
    label: 'Jumeler et fusionner les profils clients',
    description: 'Fusionner deux fiches doublons avec l\'ensemble de leurs historiques.',
    category: 'crm',
  },
  {
    key: 'canManagePdfTemplates',
    label: 'Studio PDF : Gérer les modèles officiels',
    description: 'Créer, modifier et personnaliser les modèles PDF et formulaires officiels à faire signer.',
    category: 'crm',
    itOnly: true,
  },

  // Infolettres
  {
    key: 'canSendNewsletter',
    label: 'Envoyer des infolettres & campagnes',
    description: 'Créer et diffuser les offres exclusives aux abonnés de l\'agence.',
    category: 'newsletter',
  },

  // Statistiques
  {
    key: 'canViewStats',
    label: 'Consulter les métriques & statistiques d\'affaires',
    description: 'Accéder aux graphiques de rentabilité, taux de conversion et volumes.',
    category: 'stats',
    itOnly: true,
  },

  // Système & Administration
  {
    key: 'canAccessTeamChat',
    label: 'Accès au chat d\'équipe interne',
    description: 'Participer aux échanges d\'agence sur le canal d\'équipe.',
    category: 'system',
  },
  {
    key: 'canManageTeam',
    label: 'Gérer l\'organisation d\'équipe',
    description: 'Voir et organiser la structure des collaborateurs.',
    category: 'system',
    itOnly: true,
  },
  {
    key: 'canManageUsers',
    label: 'Gérer les comptes collaborateurs',
    description: 'Créer de nouveaux utilisateurs, réinitialiser des accès.',
    category: 'system',
    itOnly: true,
  },
  {
    key: 'canModifyNames',
    label: 'Modifier les noms des collaborateurs',
    description: 'Autorisation stricte de renommer un membre. Interdit sur soi-même.',
    category: 'system',
    itOnly: true,
  },
  {
    key: 'canModifyPosts',
    label: 'Modifier les postes et grades officiels',
    description: 'Changer le titre de fonction officiel d\'un collaborateur.',
    category: 'system',
    itOnly: true,
  },
  {
    key: 'canAssignSpecialTags',
    label: 'Attribuer les tags spéciaux ([ADMIN], [IT]...)',
    description: 'Gérer les badges de fonction officielle des collaborateurs.',
    category: 'system',
    itOnly: true,
  },
  {
    key: 'canManagePermissions',
    label: 'Gérer les permissions & rôles du personnel',
    description: 'Attribuer des accès bonus et configurer les privilèges système.',
    category: 'system',
    itOnly: true,
  },
  {
    key: 'canExportData',
    label: 'Exporter les données et rapports (Excel/JSON)',
    description: 'Télécharger les données de l\'agence pour archivage ou comptabilité.',
    category: 'system',
  },
  {
    key: 'canConfigureMySQL',
    label: 'Accéder à la configuration MySQL & Système',
    description: 'Administration technique de la base de données et du serveur.',
    category: 'system',
    itOnly: true,
  },
];

export const DEFAULT_FALLBACK_ROLES: SystemRole[] = [
  {
    id: 'role_sysadmin',
    name: 'Super Administrateur IT',
    description: 'Accès intégral et sans restriction à tous les modules, configurations serveur, base MySQL et gestion des utilisateurs.',
    roleKey: 'super_admin',
    grade: 'Administrateur Système & IT',
    badgeColor: 'bg-indigo-600 text-white',
    defaultSpecialTag: 'ADMIN',
    specialTags: ['ADMIN', 'IT'],
    isDefault: true,
    permissions: {
      canManageBot: true,
      canToggleBot: true,
      canEditForm: true,
      canViewSubmissions: true,
      canManageSubmissions: true,
      canManageSubmissionTags: true,
      canViewStats: true,
      canManageTeam: true,
      canAccessTeamChat: true,
      canConfigureMySQL: true,
      canExportData: true,
      canManageUsers: true,
      canAssignAdminTags: true,
      canBlockIps: true,
      canInterveneChat: true,
      canModifyNames: true,
      canModifyPosts: true,
      canAssignSpecialTags: true,
      canManagePermissions: true,
      canUnassignBooked: true,
      canMergeClients: true,
      canSendNewsletter: true,
      canManagePdfTemplates: true,
    },
  },
  {
    id: 'role_admin_agence',
    name: 'Administrateur d\'Agence',
    description: 'Direction et gestion d\'agence : accès complet au formulaire, statistiques, équipe, soumissions et collaborateurs.',
    roleKey: 'admin',
    grade: 'Directeur / Gérant d\'Agence',
    badgeColor: 'bg-purple-600 text-white',
    defaultSpecialTag: 'ADMIN',
    specialTags: ['ADMIN', 'DIRECTION'],
    isDefault: true,
    permissions: {
      canManageBot: true,
      canToggleBot: true,
      canEditForm: true,
      canViewSubmissions: true,
      canManageSubmissions: true,
      canManageSubmissionTags: true,
      canViewStats: true,
      canManageTeam: true,
      canAccessTeamChat: true,
      canConfigureMySQL: false,
      canExportData: true,
      canManageUsers: true,
      canAssignAdminTags: true,
      canBlockIps: true,
      canInterveneChat: true,
      canModifyNames: true,
      canModifyPosts: true,
      canAssignSpecialTags: true,
      canManagePermissions: true,
      canUnassignBooked: true,
      canMergeClients: true,
      canSendNewsletter: true,
      canManagePdfTemplates: true,
    },
  },
  {
    id: 'role_agent_senior',
    name: 'Conseiller Voyages Senior',
    description: 'Traitement autonome et prioritaire des soumissions, intervention chatbot, clavardage équipe et stats.',
    roleKey: 'agent',
    grade: 'Conseiller Voyages Senior - Expert Sud & Forfaits',
    badgeColor: 'bg-emerald-600 text-white',
    defaultSpecialTag: 'CONSEILLER SENIOR',
    specialTags: ['CONSEILLER SENIOR'],
    isDefault: true,
    permissions: {
      canManageBot: false,
      canToggleBot: true,
      canEditForm: false,
      canViewSubmissions: true,
      canManageSubmissions: true,
      canManageSubmissionTags: false,
      canViewStats: true,
      canManageTeam: false,
      canAccessTeamChat: true,
      canConfigureMySQL: false,
      canExportData: false,
      canManageUsers: false,
      canAssignAdminTags: false,
      canBlockIps: false,
      canInterveneChat: true,
      canModifyNames: false,
      canModifyPosts: false,
      canAssignSpecialTags: false,
      canManagePermissions: false,
      canUnassignBooked: false,
      canMergeClients: true,
      canSendNewsletter: true,
    },
  },
  {
    id: 'role_expert_croisiere',
    name: 'Spécialiste Croisières',
    description: 'Spécialiste dédié au traitement des croisières maritimes, choix de navires et cabines.',
    roleKey: 'agent',
    grade: 'Spécialiste Croisières & Forfaits Maritimes',
    badgeColor: 'bg-sky-600 text-white',
    defaultSpecialTag: 'EXPERT CROISIÈRES',
    specialTags: ['EXPERT CROISIÈRES'],
    isDefault: true,
    permissions: {
      canManageBot: false,
      canToggleBot: true,
      canEditForm: false,
      canViewSubmissions: true,
      canManageSubmissions: true,
      canManageSubmissionTags: false,
      canViewStats: true,
      canManageTeam: false,
      canAccessTeamChat: true,
      canConfigureMySQL: false,
      canExportData: false,
      canManageUsers: false,
      canAssignAdminTags: false,
      canBlockIps: false,
      canInterveneChat: true,
      canModifyNames: false,
      canModifyPosts: false,
      canAssignSpecialTags: false,
      canManagePermissions: false,
      canUnassignBooked: false,
      canMergeClients: true,
      canSendNewsletter: false,
    },
  },
  {
    id: 'role_agent_junior',
    name: 'Conseiller Voyages Junior',
    description: 'Prise en charge des dossiers assignés, clavardage avec les voyageurs et chat d\'équipe.',
    roleKey: 'agent',
    grade: 'Conseiller Voyages Junior',
    badgeColor: 'bg-teal-600 text-white',
    defaultSpecialTag: 'CONSEILLER',
    specialTags: ['CONSEILLER'],
    isDefault: true,
    permissions: {
      canManageBot: false,
      canToggleBot: false,
      canEditForm: false,
      canViewSubmissions: true,
      canManageSubmissions: true,
      canManageSubmissionTags: false,
      canViewStats: false,
      canManageTeam: false,
      canAccessTeamChat: true,
      canConfigureMySQL: false,
      canExportData: false,
      canManageUsers: false,
      canAssignAdminTags: false,
      canBlockIps: false,
      canInterveneChat: true,
      canModifyNames: false,
      canModifyPosts: false,
      canAssignSpecialTags: false,
      canManagePermissions: false,
      canUnassignBooked: false,
      canMergeClients: false,
      canSendNewsletter: false,
    },
  },
  {
    id: 'role_support',
    name: 'Support & Réception',
    description: 'Accueil des voyageurs, orientation téléphonique et clavardage de base.',
    roleKey: 'agent',
    grade: 'Agent d\'accueil & Relation Clientèle',
    badgeColor: 'bg-amber-600 text-white',
    defaultSpecialTag: 'SUPPORT',
    specialTags: ['SUPPORT'],
    isDefault: true,
    permissions: {
      canManageBot: false,
      canToggleBot: false,
      canEditForm: false,
      canViewSubmissions: true,
      canManageSubmissions: false,
      canManageSubmissionTags: false,
      canViewStats: false,
      canManageTeam: false,
      canAccessTeamChat: true,
      canConfigureMySQL: false,
      canExportData: false,
      canManageUsers: false,
      canAssignAdminTags: false,
      canBlockIps: false,
      canInterveneChat: true,
      canModifyNames: false,
      canModifyPosts: false,
      canAssignSpecialTags: false,
      canManagePermissions: false,
      canUnassignBooked: false,
      canMergeClients: false,
      canSendNewsletter: false,
    },
  },
];

/**
 * Trouve le rôle système d'un utilisateur par son systemRoleId, son rôle technique, ou son grade.
 */
export const findUserSystemRole = (user: User, systemRoles: SystemRole[]): SystemRole | undefined => {
  const roles = systemRoles && systemRoles.length > 0 ? systemRoles : DEFAULT_FALLBACK_ROLES;
  if (user.systemRoleId) {
    const match = roles.find((r) => r.id === user.systemRoleId);
    if (match) return match;
  }
  // Chercher par grade identique
  if (user.grade) {
    const matchGrade = roles.find((r) => r.grade?.toLowerCase().trim() === user.grade.toLowerCase().trim());
    if (matchGrade) return matchGrade;
  }
  // Chercher par clé de rôle
  if (user.role === 'super_admin') {
    return roles.find((r) => r.roleKey === 'super_admin' || r.id === 'role_sysadmin');
  }
  if (user.role === 'admin') {
    return roles.find((r) => r.roleKey === 'admin' || r.id === 'role_admin_agence');
  }
  return roles.find((r) => r.roleKey === user.role) || roles[0];
};

/**
 * Vérifie si une permission est incluse dans le gabarit d'un rôle système
 */
export const isPermissionInSystemRole = (permKey: keyof UserPermissions, role?: SystemRole): boolean => {
  if (!role || !role.permissions) return false;
  return Boolean(role.permissions[permKey]);
};

/**
 * Détermine si une permission activée pour un utilisateur est un ACCÈS BONUS individuel
 */
export const isBonusPermissionForUser = (
  permKey: keyof UserPermissions,
  user: User,
  systemRoles: SystemRole[]
): boolean => {
  const isEnabled = Boolean(user.permissions?.[permKey]);
  if (!isEnabled) return false;
  const sysRole = findUserSystemRole(user, systemRoles);
  // Si elle n'est pas dans les permissions par défaut du rôle mais active chez l'utilisateur => C'est un BONUS !
  return !isPermissionInSystemRole(permKey, sysRole);
};

/**
 * Calcule le nombre total de permissions, le nombre incluses dans le rôle et les bonus
 */
export const getPermissionsBreakdown = (user: User, systemRoles: SystemRole[]) => {
  const sysRole = findUserSystemRole(user, systemRoles);
  let roleCount = 0;
  let bonusCount = 0;

  ALL_PERMISSION_DEFINITIONS.forEach((p) => {
    const hasPerm = Boolean(user.permissions?.[p.key]);
    if (hasPerm) {
      if (isPermissionInSystemRole(p.key, sysRole)) {
        roleCount++;
      } else {
        bonusCount++;
      }
    }
  });

  return {
    total: roleCount + bonusCount,
    fromRole: roleCount,
    bonus: bonusCount,
    roleName: sysRole?.name || 'Rôle Standard',
  };
};
