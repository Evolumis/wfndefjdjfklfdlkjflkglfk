import fs from 'fs';
import os from 'os';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
import { encryptVaultPayload, decryptVaultPayload, recordSecurityEvent } from './security.js';
import {
  User,
  ChatbotSettings,
  FormConfig,
  QuoteSubmission,
  ChatConversation,
  ChatMessage,
  TeamMessage,
  PushNotificationItem,
  DbStatus,
  CallStatus,
  SystemRole,
  ClientProfile,
  ClientNote,
  NewsletterSubscriber,
  NewsletterCampaign,
  NewsletterPreferences,
  PasswordResetCode,
  ProgrammedResponses,
  Invoice,
  InvoiceItem,
  InvoiceArticleCatalog,
  LegalDocument,
  LegalDocumentCategory,
  LegalDocumentStatus,
  LegalDocumentTemplate,
  ClientRecord,
} from '../src/types.js';

const initialUsers: User[] = [
  {
    id: 'usr_sysadmin',
    username: 'admin',
    password: 'SoleilAdmin2026!',
    name: 'System Administrateur',
    email: 'admin@evasionsoleil.com',
    avatar: '',
    role: 'super_admin',
    grade: 'Administrateur Système & IT',
    specialTag: 'ADMIN',
    specialTags: ['ADMIN', 'IT'],
    specialTagEnabled: true,
    status: 'disponible',
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
];

const initialChatbotSettings: ChatbotSettings = {
  id: 1,
  botName: 'Martine V.',
  botTag: 'BOT',
  botEnabled: true,
  offlineMessage:
    'Bonjour ! Les conseillers d\'Évasion Soleil sont actuellement hors ligne ou en rendez-vous téléphonique. Nous avons bien reçu votre message et un conseiller voyage vous répondra dans les plus brefs délais à info@evasionsoleil.com.',
  welcomeMessage:
    'Bonjour ! Je suis Martine V., votre conseillère virtuelle Évasion Soleil ☀️. En quoi puis-je vous aider pour vos prochaines vacances au soleil ?',
  agentNotificationEmail: 'info@evasionsoleil.com',
  quoteRedirectUrl: 'https://evasionsoleil.com/devis',
  systemPrompt:
    'Tu es Martine V., assistante virtuelle chaleureuse de l\'agence Évasion Soleil (evasionsoleil.com). Tu conseilles sur les forfaits tout-inclus au soleil (Cancún, Punta Cana, Varadero, Jamaïque), les vols + hôtels et les croisières. Si le visiteur demande à parler à un conseiller humain, demande-lui ses coordonnées (nom, courriel, téléphone) et préviens-le que l\'équipe a été notifiée à info@evasionsoleil.com. Si le visiteur demande un devis ou une réservation, oriente-le vers le formulaire en ligne evasionsoleil.com/devis. Sois concise, positive et dynamique.',
  showAgentTags: true,
  primaryColor: '#338b84',
  blockedIps: [],
  blockedIpReasons: {},
  fallbackModeEnabled: true,
  forceProgrammedMode: false,
  programmedResponses: {
    welcome: 'Bonjour ! Je suis Martine V., votre conseillère virtuelle Évasion Soleil ☀️. En quoi puis-je vous aider pour vos prochaines vacances au soleil ?',
    quoteRequest: 'Pour obtenir une estimation détaillée et personnalisée sans aucun frais, je vous invite à remplir notre formulaire de devis en ligne sur evasionsoleil.com/devis. Nos conseillers en voyages vous répondront en priorité avec les meilleurs tarifs du moment !',
    agentRequestOnline: 'Des conseillers de notre équipe sont actuellement disponibles en ligne ! Indiquez-moi votre nom et votre numéro de téléphone afin qu\'un conseiller prenne directement le relais avec vous.',
    agentRequestOffline: 'Actuellement, aucun agent n\'est disponible immédiatement sur le clavardage. Remplissez notre court formulaire sur evasionsoleil.com/devis ou laissez vos coordonnées ici, et un conseiller vous recontactera dès sa disponibilité !',
    destinationsInfo: 'Évasion Soleil est spécialiste des séjours tout-inclus au soleil (Cancún, Riviera Maya, Punta Cana, Varadero, Jamaïque, Bahamas) ainsi que des croisières maritimes ! Quel type d\'escapade recherchez-vous ?',
    generalFallback: 'Je suis Martine V., votre assistante virtuelle Évasion Soleil (info@evasionsoleil.com). Pour toute demande de réservation ou tarif, je vous invite à utiliser notre formulaire de devis en ligne ou à demander à parler à un conseiller.',
  },
};

const initialFormConfig: FormConfig = {
  title: 'Type de service désiré *',
  subtitle: 'Choisissez votre formule',
  notificationEmail: 'info@evasionsoleil.com',
  services: [
    {
      id: 'forfait_tout_inclus',
      title: 'Forfait / Tout-Inclus',
      subtitle: 'Vol + Transferts + Hôtel 4* ou 5* avec repas et boissons à volonté',
      icon: 'Palmtree',
      enabled: true,
    },
    {
      id: 'vol_hotel',
      title: 'Vol + Hôtel',
      subtitle: 'Flexibilité totale pour séjour urbain, bord de mer ou circuit libre',
      icon: 'Plane',
      enabled: true,
    },
    {
      id: 'croisiere',
      title: 'Croisière',
      subtitle: 'Caraïbes, Méditerranée ou Alaska avec cabine vue mer ou balcon',
      icon: 'Ship',
      enabled: true,
    },
    {
      id: 'battre_prix',
      title: 'Battre un prix',
      subtitle: 'Vous avez vu moins cher ailleurs ? Collez le lien, on fait mieux !',
      badge: 'GARANTIE MEILLEUR PRIX',
      icon: 'Flame',
      enabled: true,
    },
    {
      id: 'vol_seul',
      title: 'Vol seul (sans hôtel)',
      subtitle: 'Billet d\'avion seul aller-retour ou aller simple, aucun hébergement inclus',
      badge: 'AUCUN HÔTEL',
      icon: 'PlaneTakeoff',
      enabled: true,
    },
    {
      id: 'location_auto',
      title: 'Location d\'auto',
      subtitle: 'Véhicule économique, VUS, berline ou minivan avec prise en charge aéroport ou ville',
      badge: 'LIBERTÉ',
      icon: 'Car',
      enabled: true,
    },
  ],
  departureCities: ['Montréal (YUL)', 'Québec', 'Ottawa', 'Toronto'],
  destinations: ['Cancún / Riviera Maya', 'Punta Cana', 'Varadero / Cayo Coco', 'Montego Bay'],
  durations: [
    '7 jours / 7 nuits (Standard classique)',
    '3-4 nuits (Escapade courte)',
    '10-11 nuits (Prolongé)',
    '14 nuits (2 semaines complètes)',
    '21 jours et plus',
  ],
  cruiseCabins: [
    'Balcon Privé (Vue mer dégagée - Recommandé)',
    'Vue Mer (Extérieure avec hublot/fenêtre)',
    'Cabine Intérieure (Option économique)',
    'Suite Prestige avec majordome',
  ],
  cruiseLines: [
    'Royal Caribbean (Familial & Spectaculaire)',
    'Celebrity Cruises (Haut de gamme moderne)',
    'Norwegian Cruise Line (Freestyle & Libre)',
    'MSC Croisières (Élégance méditerranéenne)',
    'Princess Cruises',
    'Autre / Conseillez-moi',
  ],
  cruiseDeparturePorts: [
    'Port de Miami (Floride)',
    'Fort Lauderdale / Port Everglades',
    'Port Canaveral (Orlando)',
    'San Juan (Porto Rico)',
    'Tampa (Floride)',
    'New York / Cape Liberty',
    'Barcelone (Méditerranée)',
    'Rome / Civitavecchia (Italie)',
    'Vancouver / Seattle (Alaska)',
    'Québec / Montréal (St-Laurent)',
  ],
  carRentalCategories: [
    'Économique / Compacte',
    'Berline intermédiaire standard',
    'VUS / SUV familial',
    'Minivan 7 passagers',
    'Décapotable / Luxe',
  ],
  budgetRanges: [
    'Moins de 1 200 $ / personne',
    '1 200 $ - 1 600 $ / personne',
    '1 600 $ - 2 200 $ / personne',
    '2 200 $ - 3 000 $ / personne',
    '3 000 $ et plus / personne',
  ],
  hotelCategories: [
    '3 Étoiles Économique',
    '4 Étoiles Supérieur',
    '5 Étoiles Grand Luxe',
    'Complexe Réservé aux Adultes (18+)',
    'Familial avec Parc Aquatique',
  ],
  mealPlans: [
    'Tout-Inclus Classique (Repas + Boissons/Alcools)',
    'Tout-Inclus Gourmet & Premium',
    'Plan Européen (Hôtel sans repas)',
    'Déjeuners seulement inclus (BB)',
  ],
  insuranceTypes: [
    'Forfait Tout Compris (Soins Médicaux + Annulation/Interruption + Bagages)',
    'Soins Médicaux d\'Urgence seuls (Hospitalisation & Rapatriement)',
    'Annulation & Interruption de voyage seule',
    'Bagages & Effets personnels',
  ],
  disclaimerInsuranceText:
    'AVIS OFFICIEL : Vous avez sélectionné NON à l\'assurance voyage. Conformément aux politiques de l\'agence et des voyagistes, vous disposez d\'un délai maximal strict de 48 heures suivant la confirmation de réservation pour souscrire une protection. Passé ce délai, aucun ajout ni remboursement en cas d\'imprévu ne pourra être réclamé.',
  financingAvailable: true,
  allInclusiveFlightClasses: [
    'Classe Économique standard',
    'Sièges Sélection Plus (Espace jambes)',
    'Classe Premium / Club',
    'Classe Affaires'
  ],
  volHotelFlightClasses: [
    'Classe Économique standard',
    'Classe Premium Économie',
    'Classe Affaires',
    'Première Classe'
  ],
  volHotelHotelCategories: [
    '3 Étoiles Confort',
    '4 Étoiles Supérieur',
    '5 Étoiles Grand Luxe',
    'Hôtel Boutique & Charme',
    'Complexe Tout Compris'
  ],
  agencyLogoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=240',
  agencyName: 'Évasion Soleil Voyages Inc.',
  agencyPhone: '438-373-7076',
  agencyTagline: 'Votre référence québécoise pour les forfaits Sud et croisières de rêve',
};

const initialSystemRoles: SystemRole[] = [
  {
    id: 'role_sysadmin',
    name: 'Super Administrateur IT',
    description: 'Accès intégral et sans restriction à tous les modules, configurations serveur, base MySQL et gestion des utilisateurs.',
    roleKey: 'super_admin',
    grade: 'Administrateur Système & IT',
    badgeColor: 'bg-indigo-600 text-white',
    defaultSpecialTag: 'ADMIN',
    specialTags: ['ADMIN', 'IT'],
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
    },
    isDefault: true,
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
    },
    isDefault: true,
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
    },
    isDefault: true,
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
    },
    isDefault: true,
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
    },
    isDefault: true,
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
    },
    isDefault: true,
  },
];

const initialSubmissions: QuoteSubmission[] = [];

const initialTeamMessages: TeamMessage[] = [];

const initialConversations: ChatConversation[] = [];

const initialNotifications: PushNotificationItem[] = [];

interface LocalDatabase {
  users: User[];
  chatbotSettings: ChatbotSettings;
  formConfig: FormConfig;
  submissions: QuoteSubmission[];
  teamMessages: TeamMessage[];
  conversations: ChatConversation[];
  notifications: PushNotificationItem[];
  systemRoles: SystemRole[];
  clientNotes?: ClientNote[];
  newsletterSubscribers?: NewsletterSubscriber[];
  newsletterCampaigns?: NewsletterCampaign[];
  resetCodes?: PasswordResetCode[];
  invoices?: Invoice[];
  legalDocuments?: LegalDocument[];
  legalDocumentTemplates?: LegalDocumentTemplate[];
  lockPdfForAdvisors?: boolean;
  crmClients?: ClientRecord[];
}

interface EncryptedFailoverEnvelope {
  hasPendingOutageWrites: boolean;
  pendingOutageCount: number;
  lastSavedAt: string;
  state: LocalDatabase;
}

const RUNTIME_VAULT_DIR = path.join(process.cwd(), '.runtime_vault');
const PRIMARY_VAULT_FILE = path.join(RUNTIME_VAULT_DIR, 'failover_vault.enc');
const TMP_VAULT_FILE = path.join(os.tmpdir(), '.evasion_soleil_ha_vault.enc');

class DatabaseManager {
  private db: LocalDatabase;
  private pool: mysql.Pool | null = null;
  private mysqlConnected: boolean = false;
  private mysqlError?: string;
  private hasPendingOutageWrites: boolean = false;
  private pendingOutageCount: number = 0;
  private lastFailoverSyncAt?: string;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;

  constructor() {
    this.db = this.createEmptyDbState();
    this.loadFromEncryptedVault();
    this.initMySQL();
    this.startHighAvailabilityWatchdog();
  }

  private createEmptyDbState(): LocalDatabase {
    return {
      users: [...initialUsers],
      chatbotSettings: { ...initialChatbotSettings },
      formConfig: { ...initialFormConfig },
      submissions: [],
      teamMessages: [],
      conversations: [],
      notifications: [],
      systemRoles: [...initialSystemRoles],
      clientNotes: [],
      newsletterSubscribers: [],
      newsletterCampaigns: [],
      resetCodes: [],
      invoices: [],
      legalDocuments: [],
      legalDocumentTemplates: this.getDefaultLegalDocumentTemplates(),
      lockPdfForAdvisors: true,
      crmClients: [],
    };
  }

  /**
   * Sauvegarde locale de secours chiffrée en AES-256-GCM (Haute Disponibilité 0% Interruption).
   * Si MySQL est indisponible, marque les écritures comme "en attente de synchronisation" (Outbox)
   * afin qu'elles soient automatiquement fusionnées vers MySQL dès son retour en ligne,
   * sans jamais écraser les données existantes de MySQL.
   */
  public saveToJson(data = this.db, markAsSynced = false) {
    try {
      if (!this.mysqlConnected && !markAsSynced) {
        this.hasPendingOutageWrites = true;
        this.pendingOutageCount += 1;
      } else if (markAsSynced) {
        this.hasPendingOutageWrites = false;
        this.pendingOutageCount = 0;
        this.lastFailoverSyncAt = new Date().toISOString();
      }

      const envelope: EncryptedFailoverEnvelope = {
        hasPendingOutageWrites: this.hasPendingOutageWrites,
        pendingOutageCount: this.pendingOutageCount,
        lastSavedAt: new Date().toISOString(),
        state: data,
      };

      const encrypted = encryptVaultPayload(envelope);
      if (!fs.existsSync(RUNTIME_VAULT_DIR)) {
        fs.mkdirSync(RUNTIME_VAULT_DIR, { recursive: true });
      }
      fs.writeFileSync(PRIMARY_VAULT_FILE, encrypted, 'utf-8');
      fs.writeFileSync(TMP_VAULT_FILE, encrypted, 'utf-8');
    } catch (e: any) {
      console.error('[Vault Failover] Erreur écriture coffre local chiffré:', e.message);
    }
  }

  private loadFromEncryptedVault(): EncryptedFailoverEnvelope | null {
    try {
      const targetFile = fs.existsSync(PRIMARY_VAULT_FILE)
        ? PRIMARY_VAULT_FILE
        : fs.existsSync(TMP_VAULT_FILE)
        ? TMP_VAULT_FILE
        : null;
      if (!targetFile) return null;

      const rawEncrypted = fs.readFileSync(targetFile, 'utf-8');
      const envelope = decryptVaultPayload<EncryptedFailoverEnvelope>(rawEncrypted);
      if (!envelope || !envelope.state) return null;

      this.hasPendingOutageWrites = Boolean(envelope.hasPendingOutageWrites);
      this.pendingOutageCount = Number(envelope.pendingOutageCount || 0);
      const s = envelope.state;

      this.db = {
        users: Array.isArray(s.users) && s.users.length > 0 ? s.users : [...initialUsers],
        chatbotSettings: { ...initialChatbotSettings, ...(s.chatbotSettings || {}) },
        formConfig: { ...initialFormConfig, ...(s.formConfig || {}) },
        submissions: Array.isArray(s.submissions) ? s.submissions : [],
        teamMessages: Array.isArray(s.teamMessages) ? s.teamMessages : [],
        conversations: Array.isArray(s.conversations) ? s.conversations : [],
        notifications: Array.isArray(s.notifications) ? s.notifications : [],
        systemRoles: Array.isArray(s.systemRoles) && s.systemRoles.length > 0 ? s.systemRoles : [...initialSystemRoles],
        clientNotes: Array.isArray(s.clientNotes) ? s.clientNotes : [],
        newsletterSubscribers: Array.isArray(s.newsletterSubscribers) ? s.newsletterSubscribers : [],
        newsletterCampaigns: Array.isArray(s.newsletterCampaigns) ? s.newsletterCampaigns : [],
        resetCodes: Array.isArray(s.resetCodes) ? s.resetCodes : [],
        invoices: Array.isArray(s.invoices) ? s.invoices : [],
        legalDocuments: Array.isArray(s.legalDocuments) ? s.legalDocuments : [],
        legalDocumentTemplates:
          Array.isArray(s.legalDocumentTemplates) && s.legalDocumentTemplates.length > 0
            ? s.legalDocumentTemplates
            : this.getDefaultLegalDocumentTemplates(),
        lockPdfForAdvisors: s.lockPdfForAdvisors !== undefined ? Boolean(s.lockPdfForAdvisors) : true,
        crmClients: Array.isArray(s.crmClients) ? s.crmClients : [],
      };
      console.log(
        `[Vault Failover] Coffre local chiffré AES-256 chargé (${this.db.submissions.length} soumissions, en attente sync MySQL=${this.hasPendingOutageWrites})`
      );
      return envelope;
    } catch (e: any) {
      console.warn('[Vault Failover] Impossible de lire le coffre de secours:', e.message);
      return null;
    }
  }

  /**
   * Fusionne sans aucune perte les données enregistrées localement pendant une panne MySQL
   * avec les données existantes de MySQL (aucune donnée MySQL n'est écrasée).
   */
  private mergeById<T extends { id: string }>(mysqlList: T[], localOutageList: T[]): T[] {
    const map = new Map<string, T>();
    for (const item of mysqlList || []) {
      if (item && item.id) map.set(item.id, item);
    }
    for (const localItem of localOutageList || []) {
      if (!localItem || !localItem.id) continue;
      const existing = map.get(localItem.id) as any;
      if (!existing) {
        map.set(localItem.id, localItem);
      } else {
        const localTime = new Date((localItem as any).updatedAt || (localItem as any).createdAt || 0).getTime();
        const mysqlTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (localTime > mysqlTime) {
          map.set(localItem.id, localItem);
        }
      }
    }
    return Array.from(map.values());
  }

  private async mergeOutageStateIntoMySQL(outageSnapshot: LocalDatabase) {
    this.db.users = this.mergeById(this.db.users, outageSnapshot.users || []);
    this.db.systemRoles = this.mergeById(this.db.systemRoles || [], outageSnapshot.systemRoles || []);
    this.db.submissions = this.mergeById(this.db.submissions, outageSnapshot.submissions || []);
    this.db.crmClients = this.mergeById(this.db.crmClients || [], outageSnapshot.crmClients || []);
    this.db.clientNotes = this.mergeById(this.db.clientNotes || [], outageSnapshot.clientNotes || []);
    this.db.newsletterSubscribers = this.mergeById(this.db.newsletterSubscribers || [], outageSnapshot.newsletterSubscribers || []);
    this.db.newsletterCampaigns = this.mergeById(this.db.newsletterCampaigns || [], outageSnapshot.newsletterCampaigns || []);
    this.db.conversations = this.mergeById(this.db.conversations || [], outageSnapshot.conversations || []);
    this.db.teamMessages = this.mergeById(this.db.teamMessages || [], outageSnapshot.teamMessages || []);
    this.db.notifications = this.mergeById(this.db.notifications || [], outageSnapshot.notifications || []);
    this.db.invoices = this.mergeById(this.db.invoices || [], outageSnapshot.invoices || []);
    this.db.legalDocuments = this.mergeById(this.db.legalDocuments || [], outageSnapshot.legalDocuments || []);
    this.db.legalDocumentTemplates = this.mergeById(
      this.db.legalDocumentTemplates || [],
      outageSnapshot.legalDocumentTemplates || []
    );

    // Pousser toutes les nouvelles entrées fusionnées vers MySQL
    await this.syncAllToMySQL();
    this.saveToJson(this.db, true);
    console.log('[High-Availability] Données enregistrées pendant l\'indisponibilité MySQL fusionnées et synchronisées avec succès !');
  }

  private handleMySQLWriteFailure(context: string, err: any) {
    const msg = String(err?.message || err || '');
    const code = String(err?.code || '');
    const isConnLost =
      code === 'ECONNREFUSED' ||
      code === 'PROTOCOL_CONNECTION_LOST' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      code === 'ER_CON_COUNT_ERROR' ||
      msg.includes('closed state') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('Connection lost');

    if (isConnLost && this.mysqlConnected) {
      this.mysqlConnected = false;
      this.mysqlError = `Basculement automatique sur le coffre local chiffré AES-256 (${msg})`;
      recordSecurityEvent(
        'db_failover',
        '127.0.0.1',
        context,
        `Indisponibilité MySQL détectée (${code || msg}). Basculement instantané sans interruption sur le coffre local chiffré AES-256.`,
        'high'
      );
    }
    this.saveToJson(this.db, false);
  }

  /**
   * Watchdog Haute Disponibilité (toutes les 15 secondes) :
   * - Vérifie que la connexion MySQL est active.
   * - Si MySQL tombe, bascule en 0ms sur le coffre local chiffré sans aucune perte ni erreur.
   * - Dès que MySQL revient en ligne, se reconnecte automatiquement et synchronise toutes les données locales.
   */
  private startHighAvailabilityWatchdog() {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(async () => {
      if (this.isReconnecting) return;
      try {
        if (this.mysqlConnected && this.pool) {
          await this.pool.query('SELECT 1');
        } else {
          const diskConfig = this.loadMySQLConfigFromDisk();
          const host = process.env.MYSQL_HOST || diskConfig?.host;
          const user = process.env.MYSQL_USER || diskConfig?.user;
          if (!host || !user) return;

          this.isReconnecting = true;
          const password = process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD : (diskConfig?.password || '');
          const database = process.env.MYSQL_DATABASE || diskConfig?.database || 'evasion_soleil';
          const port = process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : (diskConfig?.port || 3306);

          const res = await this.autoCreateTables({ host, port, user, password, database });
          if (res.success) {
            recordSecurityEvent(
              'db_recovered',
              '127.0.0.1',
              'MySQL-Watchdog',
              `Connexion MySQL rétablie automatiquement (${host}:${port}/${database}). Synchronisation transparente du coffre local terminée.`,
              'medium'
            );
          }
        }
      } catch (err: any) {
        this.handleMySQLWriteFailure('MySQL-Watchdog-Ping', err);
      } finally {
        this.isReconnecting = false;
      }
    }, 15000);
  }

  public loadMySQLConfigFromDisk(): { host?: string; port?: number; user?: string; password?: string; database?: string } | null {
    const envPath = path.join(process.cwd(), '.env');
    try {
      if (fs.existsSync(envPath)) {
        const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf-8'));
        if (parsed.MYSQL_HOST || process.env.MYSQL_HOST) {
          return {
            host: parsed.MYSQL_HOST || process.env.MYSQL_HOST,
            port: Number(parsed.MYSQL_PORT || process.env.MYSQL_PORT || 3306),
            user: parsed.MYSQL_USER || process.env.MYSQL_USER,
            password: parsed.MYSQL_PASSWORD !== undefined ? parsed.MYSQL_PASSWORD : process.env.MYSQL_PASSWORD,
            database: parsed.MYSQL_DATABASE || process.env.MYSQL_DATABASE || 'evasion_soleil',
          };
        }
      }
    } catch {}
    if (process.env.MYSQL_HOST) {
      return {
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'evasion_soleil',
      };
    }
    return null;
  }

  public saveMySQLConfigToDisk(config: { host: string; port: number; user: string; password?: string; database: string }) {
    try {
      process.env.MYSQL_HOST = config.host;
      process.env.MYSQL_PORT = String(config.port);
      process.env.MYSQL_USER = config.user;
      process.env.MYSQL_PASSWORD = config.password || '';
      process.env.MYSQL_DATABASE = config.database;

      const envPath = path.join(process.cwd(), '.env');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

      const updateVar = (key: string, val: string | number) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${val}`);
        } else {
          envContent += `\n${key}=${val}`;
        }
      };

      updateVar('MYSQL_HOST', config.host);
      updateVar('MYSQL_PORT', config.port);
      updateVar('MYSQL_USER', config.user);
      updateVar('MYSQL_PASSWORD', config.password || '');
      updateVar('MYSQL_DATABASE', config.database);

      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
      console.log(`[Database] Paramètres de connexion MySQL enregistrés dans .env`);
    } catch (e: any) {
      console.error('Error writing .env:', e.message);
    }
  }

  private async initMySQL() {
    const diskConfig = this.loadMySQLConfigFromDisk();
    const host = process.env.MYSQL_HOST || diskConfig?.host;
    const user = process.env.MYSQL_USER || diskConfig?.user;
    const password = process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD : (diskConfig?.password || '');
    const database = process.env.MYSQL_DATABASE || diskConfig?.database || 'evasion_soleil';
    const port = process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : (diskConfig?.port || 3306);

    if (!host || !user) {
      this.mysqlConnected = false;
      this.mysqlError = 'Mode Haute Disponibilité actif (Coffre local chiffré AES-256). Configurez MySQL pour la synchronisation distante.';
      return;
    }

    try {
      const probeConn = await mysql.createConnection({
        host,
        port,
        user,
        password,
        connectTimeout: 3000,
      });
      await probeConn.ping();
      await probeConn.end();
    } catch (probeErr: any) {
      this.mysqlConnected = false;
      this.mysqlError = `Serveur MySQL indisponible sur ${host}:${port} — Continuité assurée par le coffre local chiffré AES-256.`;
      console.info(`[Database] MySQL indisponible sur ${host}:${port}. Basculement transparent sur le coffre local chiffré AES-256.`);
      return;
    }

    try {
      const initResult = await this.autoCreateTables({ host, port, user, password, database });
      if (!initResult.success) {
        throw new Error(initResult.error || initResult.message);
      }
      console.log(`[Database] Connecté à MySQL (${host}:${port}/${database}) avec secours local chiffré AES-256 actif.`);
    } catch (err: any) {
      this.mysqlConnected = false;
      this.mysqlError = `Continuité assurée par le coffre local chiffré AES-256 (${err.message})`;
      console.warn(`[Database] MySQL indisponible (${err.message}). Mode secours local chiffré actif.`);
    }
  }

  public async autoCreateTables(config?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  }): Promise<{
    success: boolean;
    database: string;
    tablesCreated: string[];
    message: string;
    adminUser?: { username: string; email: string; role: string };
    error?: string;
  }> {
    const host = config?.host || process.env.MYSQL_HOST || '127.0.0.1';
    const port = config?.port || (process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306);
    const user = config?.user || process.env.MYSQL_USER || 'root';
    const password = config?.password !== undefined ? config.password : (process.env.MYSQL_PASSWORD || '');
    const database = config?.database || process.env.MYSQL_DATABASE || 'evasion_soleil';

    const tablesCreated: string[] = [];

    try {
      // Stratégie hybride de connexion :
      // 1. Tenter d'abord la connexion directe avec le nom de la base (requis sur Pterodactyl / cPanel où l'utilisateur n'a pas les droits CREATE DATABASE globaux)
      let rootConn: mysql.Connection;
      try {
        rootConn = await mysql.createConnection({
          host,
          port,
          user,
          password,
          database,
          connectTimeout: 8000,
        });
      } catch (directErr: any) {
        // Si la connexion a été refusée ou que l'hôte est inaccessible, ne pas retenter inutilement sur le même serveur éteint
        if (directErr.code === 'ECONNREFUSED' || directErr.code === 'ENOTFOUND' || directErr.code === 'ETIMEDOUT') {
          throw directErr;
        }
        // 2. Si la connexion directe échoue (base non encore créée, ex: ER_BAD_DB_ERROR), se connecter sans base et tenter CREATE DATABASE
        rootConn = await mysql.createConnection({
          host,
          port,
          user,
          password,
          connectTimeout: 8000,
        });
        try {
          await rootConn.query(
            `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
          );
        } catch (createDbErr: any) {
          console.warn('[MySQL Init] Avertissement CREATE DATABASE (souvent normal sur hébergements mutualisés):', createDbErr.message);
        }
        await rootConn.query(`USE \`${database}\`;`);
      }

      // 1. Table system_roles (doit être créée avant users si besoin de liaison)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`system_roles\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`name\` VARCHAR(120) NOT NULL,
        \`description\` TEXT,
        \`badge_color\` VARCHAR(64) DEFAULT 'bg-teal-600 text-white',
        \`grade\` VARCHAR(120) NOT NULL,
        \`role_key\` VARCHAR(64) NOT NULL DEFAULT 'agent',
        \`default_special_tag\` VARCHAR(64),
        \`special_tags_json\` LONGTEXT,
        \`permissions_json\` LONGTEXT NOT NULL,
        \`is_default\` TINYINT(1) DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('system_roles');

      // 2. Table users (Conseillers, Collaborateurs, Admins)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`username\` VARCHAR(64) UNIQUE,
        \`password\` VARCHAR(255) NOT NULL DEFAULT 'SoleilAdmin2026!',
        \`name\` VARCHAR(120) NOT NULL,
        \`email\` VARCHAR(191) NOT NULL UNIQUE,
        \`avatar\` TEXT,
        \`role\` VARCHAR(64) NOT NULL DEFAULT 'agent',
        \`grade\` VARCHAR(120) NOT NULL DEFAULT 'Conseiller Voyages',
        \`special_tag\` VARCHAR(64) NOT NULL DEFAULT 'CONSEILLER',
        \`special_tags_json\` LONGTEXT,
        \`special_tag_enabled\` TINYINT(1) NOT NULL DEFAULT 1,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'disponible',
        \`can_manage_bot\` TINYINT(1) NOT NULL DEFAULT 0,
        \`can_toggle_bot\` TINYINT(1) NOT NULL DEFAULT 1,
        \`can_edit_form\` TINYINT(1) NOT NULL DEFAULT 0,
        \`can_view_submissions\` TINYINT(1) NOT NULL DEFAULT 1,
        \`can_manage_submissions\` TINYINT(1) NOT NULL DEFAULT 1,
        \`can_manage_submission_tags\` TINYINT(1) NOT NULL DEFAULT 0,
        \`can_view_stats\` TINYINT(1) NOT NULL DEFAULT 1,
        \`can_manage_team\` TINYINT(1) NOT NULL DEFAULT 0,
        \`can_access_team_chat\` TINYINT(1) NOT NULL DEFAULT 1,
        \`can_configure_mysql\` TINYINT(1) NOT NULL DEFAULT 0,
        \`can_export_data\` TINYINT(1) NOT NULL DEFAULT 0,
        \`can_manage_users\` TINYINT(1) NOT NULL DEFAULT 0,
        \`can_assign_admin_tags\` TINYINT(1) NOT NULL DEFAULT 0,
        \`can_block_ips\` TINYINT(1) NOT NULL DEFAULT 0,
        \`can_intervene_chat\` TINYINT(1) NOT NULL DEFAULT 1,
        \`can_modify_names\` TINYINT(1) NOT NULL DEFAULT 0,
        \`can_modify_posts\` TINYINT(1) NOT NULL DEFAULT 0,
        \`can_assign_special_tags\` TINYINT(1) NOT NULL DEFAULT 0,
        \`can_manage_permissions\` TINYINT(1) NOT NULL DEFAULT 0,
        \`can_send_newsletter\` TINYINT(1) NOT NULL DEFAULT 1,
        \`permissions_json\` LONGTEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_users_role\` (\`role\`),
        INDEX \`idx_users_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('users');

      // 3. Table chatbot_settings
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`chatbot_settings\` (
        \`id\` INT PRIMARY KEY DEFAULT 1,
        \`bot_name\` VARCHAR(64) NOT NULL DEFAULT 'Martine V.',
        \`bot_tag\` VARCHAR(32) NOT NULL DEFAULT 'BOT',
        \`bot_enabled\` TINYINT(1) NOT NULL DEFAULT 1,
        \`offline_message\` TEXT NOT NULL,
        \`welcome_message\` TEXT NOT NULL,
        \`agent_notification_email\` VARCHAR(191) NOT NULL DEFAULT 'info@evasionsoleil.com',
        \`quote_redirect_url\` VARCHAR(255) NOT NULL DEFAULT 'https://evasionsoleil.com/devis',
        \`system_prompt\` TEXT NOT NULL,
        \`show_agent_tags\` TINYINT(1) NOT NULL DEFAULT 1,
        \`primary_color\` VARCHAR(32) NOT NULL DEFAULT '#338b84',
        \`blocked_ips_json\` LONGTEXT,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('chatbot_settings');

      // 4. Table form_config
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`form_config\` (
        \`id\` INT PRIMARY KEY DEFAULT 1,
        \`title\` VARCHAR(191) NOT NULL DEFAULT 'Demande de Devis Voyage Personnalisé',
        \`subtitle\` TEXT,
        \`notification_email\` VARCHAR(191) NOT NULL DEFAULT 'info@evasionsoleil.com',
        \`agency_logo_url\` TEXT,
        \`agency_name\` VARCHAR(191) DEFAULT 'Évasion Soleil Voyages Inc.',
        \`agency_phone\` VARCHAR(64) DEFAULT '1-800-555-SOLEIL',
        \`agency_tagline\` TEXT,
        \`services_json\` LONGTEXT NOT NULL,
        \`departure_cities_json\` LONGTEXT NOT NULL,
        \`destinations_json\` LONGTEXT NOT NULL,
        \`durations_json\` LONGTEXT NOT NULL,
        \`hotel_categories_json\` LONGTEXT,
        \`meal_plans_json\` LONGTEXT,
        \`cruise_cabins_json\` LONGTEXT NOT NULL,
        \`cruise_lines_json\` LONGTEXT NOT NULL,
        \`budget_ranges_json\` LONGTEXT NOT NULL,
        \`insurance_types_json\` LONGTEXT,
        \`disclaimer_insurance_text\` TEXT,
        \`financing_available\` TINYINT(1) DEFAULT 1,
        \`all_inclusive_flight_classes_json\` LONGTEXT,
        \`vol_hotel_flight_classes_json\` LONGTEXT,
        \`vol_hotel_hotel_categories_json\` LONGTEXT,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('form_config');

      // 5. Table crm_clients (Dossiers Clients Centralisés & Liés aux Conseillers)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`crm_clients\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`first_name\` VARCHAR(120) NOT NULL,
        \`last_name\` VARCHAR(120) NOT NULL,
        \`email\` VARCHAR(191) NOT NULL UNIQUE,
        \`phone\` VARCHAR(64) NOT NULL,
        \`vip_level\` VARCHAR(64) DEFAULT 'Standard',
        \`preferred_call_time\` VARCHAR(64) DEFAULT 'tout_temps',
        \`assigned_advisor_id\` VARCHAR(64) NULL,
        \`assigned_advisor_name\` VARCHAR(120) NULL,
        \`tags_json\` LONGTEXT,
        \`total_submissions\` INT DEFAULT 0,
        \`total_reservations\` INT DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_crm_clients_email\` (\`email\`),
        INDEX \`idx_crm_clients_phone\` (\`phone\`),
        INDEX \`idx_crm_clients_advisor\` (\`assigned_advisor_id\`),
        CONSTRAINT \`fk_crm_client_advisor\` FOREIGN KEY (\`assigned_advisor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('crm_clients');

      // 6. Table submissions (Demandes de Devis - Connectées aux Clients et aux Conseillers)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`submissions\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`client_id\` VARCHAR(64) NULL,
        \`reference_number\` VARCHAR(64) NOT NULL UNIQUE,
        \`service_type\` VARCHAR(64) NOT NULL,
        \`departure_city\` VARCHAR(120) NOT NULL,
        \`destination\` VARCHAR(120) NOT NULL,
        \`departure_date\` DATE NOT NULL,
        \`is_flexible_date\` TINYINT(1) NOT NULL DEFAULT 0,
        \`duration\` VARCHAR(120) NOT NULL,
        \`adults_count\` INT NOT NULL DEFAULT 2,
        \`children_count\` INT NOT NULL DEFAULT 0,
        \`children_ages\` VARCHAR(120),
        \`budget_per_person\` VARCHAR(120),
        \`cruise_cabin_type\` VARCHAR(120),
        \`cruise_line\` VARCHAR(120),
        \`competitor_url\` TEXT,
        \`competitor_target_price\` VARCHAR(120),
        \`customer_first_name\` VARCHAR(120) NOT NULL,
        \`customer_last_name\` VARCHAR(120) NOT NULL,
        \`customer_email\` VARCHAR(191) NOT NULL,
        \`customer_phone\` VARCHAR(64) NOT NULL,
        \`preferred_call_time\` VARCHAR(64) DEFAULT 'tout_temps',
        \`customer_notes\` TEXT,
        \`call_status\` VARCHAR(64) NOT NULL DEFAULT 'a_appeler',
        \`call_attempts\` INT NOT NULL DEFAULT 0,
        \`assigned_to_user_id\` VARCHAR(64) NULL,
        \`assigned_to_user_name\` VARCHAR(120) NULL,
        \`email_customer_sent\` TINYINT(1) NOT NULL DEFAULT 1,
        \`email_agency_sent\` TINYINT(1) NOT NULL DEFAULT 1,
        \`cabin_class\` VARCHAR(120),
        \`hotel_category\` VARCHAR(120),
        \`flight_class\` VARCHAR(120),
        \`tags_json\` LONGTEXT,
        \`proposals_json\` LONGTEXT,
        \`proposals_sent_at\` TIMESTAMP NULL,
        \`proposals_sent_by\` VARCHAR(120) NULL,
        \`proposals_sent_to_email\` VARCHAR(191) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_submissions_status\` (\`call_status\`),
        INDEX \`idx_submissions_created\` (\`created_at\`),
        INDEX \`idx_submissions_email\` (\`customer_email\`),
        INDEX \`idx_submissions_client\` (\`client_id\`),
        INDEX \`idx_submissions_assigned\` (\`assigned_to_user_id\`),
        CONSTRAINT \`fk_submissions_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`crm_clients\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_submissions_assigned_user\` FOREIGN KEY (\`assigned_to_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('submissions');

      // 7. Table submission_notes (Journal d'appels & notes de devis)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`submission_notes\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`submission_id\` VARCHAR(64) NOT NULL,
        \`author_id\` VARCHAR(64) NULL,
        \`author_name\` VARCHAR(120) NOT NULL,
        \`author_grade\` VARCHAR(120) NOT NULL,
        \`text\` TEXT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_sub_notes_sub\` (\`submission_id\`),
        INDEX \`idx_sub_notes_author\` (\`author_id\`),
        CONSTRAINT \`fk_submission_notes_sub\` FOREIGN KEY (\`submission_id\`) REFERENCES \`submissions\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_submission_notes_author\` FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('submission_notes');

      // 8. Table crm_client_notes (Notes de suivi au dossier client CRM)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`crm_client_notes\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`client_id\` VARCHAR(64) NOT NULL,
        \`author_id\` VARCHAR(64) NULL,
        \`author_name\` VARCHAR(120) NOT NULL,
        \`author_grade\` VARCHAR(120),
        \`text\` TEXT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_client_notes_client\` (\`client_id\`),
        INDEX \`idx_client_notes_author\` (\`author_id\`),
        CONSTRAINT \`fk_client_notes_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`crm_clients\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_client_notes_author\` FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('crm_client_notes');

      // 9. Table newsletter_subscribers (Abonnés Infolettre & Préférences)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`newsletter_subscribers\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`email\` VARCHAR(191) NOT NULL UNIQUE,
        \`first_name\` VARCHAR(120) DEFAULT '',
        \`last_name\` VARCHAR(120) DEFAULT '',
        \`status\` ENUM('active', 'unsubscribed') NOT NULL DEFAULT 'active',
        \`preferences_json\` LONGTEXT,
        \`source\` VARCHAR(64) DEFAULT 'website_footer',
        \`token\` VARCHAR(120) UNIQUE,
        \`subscribed_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`unsubscribed_at\` DATETIME NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_newsletter_email\` (\`email\`),
        INDEX \`idx_newsletter_status\` (\`status\`),
        INDEX \`idx_newsletter_token\` (\`token\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('newsletter_subscribers');

      // 10. Table newsletter_campaigns (Campagnes & Offres Envoyées)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`newsletter_campaigns\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`subject\` VARCHAR(255) NOT NULL,
        \`preview_text\` TEXT,
        \`content\` LONGTEXT NOT NULL,
        \`category\` VARCHAR(64) NOT NULL DEFAULT 'all',
        \`target_audience\` VARCHAR(64) NOT NULL DEFAULT 'all_clients_and_subscribers',
        \`sent_by_user_id\` VARCHAR(64) NULL,
        \`sent_by_user_name\` VARCHAR(120),
        \`recipient_count\` INT NOT NULL DEFAULT 0,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'sent',
        \`sent_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_campaigns_sent_by\` (\`sent_by_user_id\`),
        INDEX \`idx_campaigns_sent_at\` (\`sent_at\`),
        CONSTRAINT \`fk_campaigns_user\` FOREIGN KEY (\`sent_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('newsletter_campaigns');

      // 11. Table chat_conversations (Clavardage Visiteurs en Ligne)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`chat_conversations\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`visitor_name\` VARCHAR(120) DEFAULT 'Visiteur',
        \`visitor_email\` VARCHAR(191),
        \`visitor_phone\` VARCHAR(64),
        \`visitor_ip\` VARCHAR(64),
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',
        \`unread_agent\` TINYINT(1) NOT NULL DEFAULT 0,
        \`assigned_agent_id\` VARCHAR(64) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_conv_email\` (\`visitor_email\`),
        INDEX \`idx_conv_status\` (\`status\`),
        INDEX \`idx_conv_assigned\` (\`assigned_agent_id\`),
        CONSTRAINT \`fk_chat_conversations_agent\` FOREIGN KEY (\`assigned_agent_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('chat_conversations');

      // 12. Table chat_messages (Messages Échangés)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`chat_messages\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`conversation_id\` VARCHAR(64) NOT NULL,
        \`sender\` ENUM('visitor', 'bot', 'agent') NOT NULL,
        \`sender_name\` VARCHAR(120) NOT NULL,
        \`sender_tag\` VARCHAR(64),
        \`sender_grade\` VARCHAR(120),
        \`text\` TEXT NOT NULL,
        \`is_agent_handoff\` TINYINT(1) DEFAULT 0,
        \`visitor_info_json\` TEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_chat_msg_conv\` (\`conversation_id\`),
        CONSTRAINT \`fk_chat_messages_conversation\` FOREIGN KEY (\`conversation_id\`) REFERENCES \`chat_conversations\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('chat_messages');

      // 13. Table team_messages (Clavardage Interne d'Agence)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`team_messages\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`channel_id\` VARCHAR(64) NOT NULL DEFAULT 'general',
        \`user_id\` VARCHAR(64) NOT NULL,
        \`user_name\` VARCHAR(120) NOT NULL,
        \`user_grade\` VARCHAR(120) NOT NULL,
        \`user_tag\` VARCHAR(64),
        \`user_tag_enabled\` TINYINT(1) DEFAULT 1,
        \`text\` TEXT NOT NULL,
        \`attachments_json\` LONGTEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_team_msg_user\` (\`user_id\`),
        INDEX \`idx_team_msg_channel\` (\`channel_id\`),
        CONSTRAINT \`fk_team_messages_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('team_messages');

      // 14. Table push_notifications (Notifications & Alertes de Devis)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`push_notifications\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`title\` VARCHAR(191) NOT NULL,
        \`message\` TEXT NOT NULL,
        \`type\` VARCHAR(64) NOT NULL DEFAULT 'new_quote',
        \`reference_id\` VARCHAR(64),
        \`target_user_id\` VARCHAR(64) DEFAULT 'all',
        \`is_read\` TINYINT(1) DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_push_target\` (\`target_user_id\`),
        INDEX \`idx_push_read\` (\`is_read\`),
        INDEX \`idx_push_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('push_notifications');

      // 15. Table blocked_ips (Sécurité Anti-Spam & Filtrage)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`blocked_ips\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`ip\` VARCHAR(64) NOT NULL UNIQUE,
        \`reason\` TEXT,
        \`blocked_by_user_id\` VARCHAR(64) NULL,
        \`blocked_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_blocked_ip\` (\`ip\`),
        CONSTRAINT \`fk_blocked_ips_user\` FOREIGN KEY (\`blocked_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('blocked_ips');

      // 16. Table password_reset_codes (Réinitialisation Mots de Passe Collaborateurs)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`password_reset_codes\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`email\` VARCHAR(191) NOT NULL,
        \`code\` VARCHAR(16) NOT NULL,
        \`token\` VARCHAR(120) NOT NULL UNIQUE,
        \`expires_at\` DATETIME NOT NULL,
        \`used\` TINYINT(1) DEFAULT 0,
        \`created_by_admin\` TINYINT(1) DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_reset_email\` (\`email\`),
        INDEX \`idx_reset_token\` (\`token\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('password_reset_codes');

      // 17. Table legal_document_templates (Studio Modèles PDF)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`legal_document_templates\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`title\` VARCHAR(191) NOT NULL,
        \`category\` VARCHAR(64) NOT NULL,
        \`description\` TEXT,
        \`file_name\` VARCHAR(191),
        \`header_subtitle\` TEXT,
        \`body_text\` LONGTEXT,
        \`footer_legal_note\` TEXT,
        \`accent_color\` VARCHAR(32),
        \`is_system_default\` TINYINT(1) DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_template_cat\` (\`category\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('legal_document_templates');

      // 18. Table legal_documents (Signatures & Documents Clients)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`legal_documents\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`template_id\` VARCHAR(64),
        \`category\` VARCHAR(64) NOT NULL,
        \`title\` VARCHAR(191) NOT NULL,
        \`client_key\` VARCHAR(64),
        \`client_name\` VARCHAR(191) NOT NULL,
        \`client_email\` VARCHAR(191) NOT NULL,
        \`client_phone\` VARCHAR(64),
        \`destination\` VARCHAR(191),
        \`summary\` TEXT,
        \`submission_ref\` VARCHAR(64),
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'en_attente',
        \`sent_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`signed_at\` TIMESTAMP NULL,
        \`signed_by_name\` VARCHAR(191),
        \`signed_by_email\` VARCHAR(191),
        \`signer_ip\` VARCHAR(64),
        \`signer_user_agent\` TEXT,
        \`signature_data_url\` LONGTEXT,
        \`doc_data_json\` LONGTEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_legaldoc_client\` (\`client_key\`),
        INDEX \`idx_legaldoc_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('legal_documents');

      // 19. Table des Factures & Paiements (Invoices)
      await rootConn.query(`CREATE TABLE IF NOT EXISTS \`invoices\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`invoice_number\` VARCHAR(64) NOT NULL,
        \`client_key\` VARCHAR(191) NOT NULL,
        \`client_name\` VARCHAR(160) NOT NULL,
        \`client_email\` VARCHAR(191) NOT NULL,
        \`client_phone\` VARCHAR(64),
        \`submission_id\` VARCHAR(64),
        \`submission_ref\` VARCHAR(64),
        \`destination\` VARCHAR(160),
        \`subtotal\` DECIMAL(12,2) NOT NULL DEFAULT 0,
        \`total\` DECIMAL(12,2) NOT NULL DEFAULT 0,
        \`currency\` VARCHAR(16) NOT NULL DEFAULT 'CAD',
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'en_attente',
        \`payment_method\` VARCHAR(32) NOT NULL DEFAULT 'stripe',
        \`due_date\` VARCHAR(32),
        \`paid_at\` VARCHAR(64),
        \`created_by_user_id\` VARCHAR(64),
        \`created_by_user_name\` VARCHAR(120),
        \`raw_data_json\` LONGTEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_inv_client\` (\`client_key\`),
        INDEX \`idx_inv_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      tablesCreated.push('invoices');

      // Safe schema migrations for existing tables
      const safeAlter = async (sql: string) => {
        try {
          await rootConn.query(sql);
        } catch {}
      };
      await safeAlter("ALTER TABLE `users` ADD COLUMN `special_tags_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `users` ADD COLUMN `permissions_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `users` ADD COLUMN `can_block_ips` TINYINT(1) DEFAULT 0;");
      await safeAlter("ALTER TABLE `users` ADD COLUMN `can_intervene_chat` TINYINT(1) DEFAULT 1;");
      await safeAlter("ALTER TABLE `users` ADD COLUMN `can_modify_names` TINYINT(1) DEFAULT 0;");
      await safeAlter("ALTER TABLE `users` ADD COLUMN `can_modify_posts` TINYINT(1) DEFAULT 0;");
      await safeAlter("ALTER TABLE `users` ADD COLUMN `can_assign_special_tags` TINYINT(1) DEFAULT 0;");
      await safeAlter("ALTER TABLE `users` ADD COLUMN `can_manage_submission_tags` TINYINT(1) DEFAULT 0;");
      await safeAlter("ALTER TABLE `users` ADD COLUMN `can_manage_permissions` TINYINT(1) DEFAULT 0;");
      await safeAlter("ALTER TABLE `users` ADD COLUMN `can_send_newsletter` TINYINT(1) DEFAULT 1;");
      await safeAlter("ALTER TABLE `users` ADD COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'disponible';");
      await safeAlter("ALTER TABLE `users` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `system_roles` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `form_config` ADD COLUMN `all_inclusive_flight_classes_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `form_config` ADD COLUMN `vol_hotel_flight_classes_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `form_config` ADD COLUMN `vol_hotel_hotel_categories_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `form_config` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `submissions` ADD COLUMN `client_id` VARCHAR(64) NULL;");
      await safeAlter("ALTER TABLE `submissions` ADD COLUMN `cabin_class` VARCHAR(120);");
      await safeAlter("ALTER TABLE `submissions` ADD COLUMN `hotel_category` VARCHAR(120);");
      await safeAlter("ALTER TABLE `submissions` ADD COLUMN `flight_class` VARCHAR(120);");
      await safeAlter("ALTER TABLE `submissions` ADD COLUMN `tags_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `submissions` ADD COLUMN `proposals_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `submissions` ADD COLUMN `proposals_sent_at` TIMESTAMP NULL;");
      await safeAlter("ALTER TABLE `submissions` ADD COLUMN `proposals_sent_by` VARCHAR(120) NULL;");
      await safeAlter("ALTER TABLE `submissions` ADD COLUMN `proposals_sent_to_email` VARCHAR(191) NULL;");
      await safeAlter("ALTER TABLE `submissions` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `chatbot_settings` ADD COLUMN `blocked_ips_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `chatbot_settings` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `crm_clients` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `crm_client_notes` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `newsletter_subscribers` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `newsletter_campaigns` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `chat_conversations` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `team_messages` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `push_notifications` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `password_reset_codes` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `legal_document_templates` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `legal_documents` ADD COLUMN `raw_data_json` LONGTEXT;");
      await safeAlter("ALTER TABLE `invoices` ADD COLUMN `raw_data_json` LONGTEXT;");

      // Insérer le compte System Administrateur par défaut s'il n'existe pas encore
      const [rows]: any = await rootConn.query(
        "SELECT id FROM `users` WHERE `username` = 'admin' OR `id` = 'usr_sysadmin' LIMIT 1;"
      );
      if (!rows || rows.length === 0) {
        await rootConn.query(
          `INSERT INTO \`users\` (
            \`id\`, \`username\`, \`password\`, \`name\`, \`email\`, \`avatar\`, \`role\`, \`grade\`,
            \`special_tag\`, \`special_tag_enabled\`, \`can_manage_bot\`, \`can_toggle_bot\`,
            \`can_edit_form\`, \`can_view_submissions\`, \`can_manage_submissions\`,
            \`can_view_stats\`, \`can_manage_team\`, \`can_access_team_chat\`,
            \`can_configure_mysql\`, \`can_export_data\`, \`can_manage_users\`, \`can_assign_admin_tags\`,
            \`can_block_ips\`, \`can_intervene_chat\`, \`can_modify_names\`, \`can_modify_posts\`,
            \`can_assign_special_tags\`, \`can_manage_permissions\`, \`can_send_newsletter\`, \`permissions_json\`
          ) VALUES (
            'usr_sysadmin', 'admin', 'SoleilAdmin2026!', 'System Administrateur', 'admin@evasionsoleil.com',
            '',
            'super_admin', 'Administrateur Système & IT', 'ADMIN', 1,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            '{"canManageBot":true,"canToggleBot":true,"canEditForm":true,"canViewSubmissions":true,"canManageSubmissions":true,"canManageSubmissionTags":true,"canViewStats":true,"canManageTeam":true,"canAccessTeamChat":true,"canConfigureMySQL":true,"canExportData":true,"canManageUsers":true,"canAssignAdminTags":true,"canBlockIps":true,"canInterveneChat":true,"canModifyNames":true,"canModifyPosts":true,"canAssignSpecialTags":true,"canManagePermissions":true,"canUnassignBooked":true,"canMergeClients":true,"canSendNewsletter":true,"canManagePdfTemplates":true}'
          );`
        );
        console.log('[MySQL Init] System Administrateur inséré dans MySQL (admin / SoleilAdmin2026!)');
      }

      await rootConn.end();

      // Initialiser ou ré-initialiser le pool MySQL actif avec ces paramètres validés
      try {
        if (this.pool) {
          await this.pool.end().catch(() => {});
        }
        this.pool = mysql.createPool({
          host,
          port,
          user,
          password,
          database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          connectTimeout: 5000,
        });
        const conn = await this.pool.getConnection();
        await conn.ping();
        conn.release();
        this.mysqlConnected = true;
        this.mysqlError = undefined;

        // Conserver une copie des éventuelles écritures locales réalisées pendant une coupure MySQL
        const hadOutageWrites = this.hasPendingOutageWrites;
        const outageSnapshot: LocalDatabase | null = hadOutageWrites
          ? JSON.parse(JSON.stringify(this.db))
          : null;

        // 1. Charger d'abord toutes les données existantes depuis MySQL (source de vérité principale)
        const loaded = await this.loadAllFromMySQL();

        // 2. Si des données ont été enregistrées localement pendant que MySQL était hors-ligne,
        // les fusionner sans écraser MySQL et les synchroniser immédiatement !
        if (hadOutageWrites && outageSnapshot) {
          await this.mergeOutageStateIntoMySQL(outageSnapshot);
        } else if (!loaded) {
          await this.syncAllToMySQL();
          this.saveToJson(this.db, true);
        } else {
          this.saveToJson(this.db, true);
        }
        console.log(`[MySQL Init] Connexion et synchronisation haute-disponibilité terminées sur '${database}'.`);

        // Sauvegarder la configuration pour persistance garantie après redémarrage
        this.saveMySQLConfigToDisk({ host, port, user, password, database });
      } catch (poolErr: any) {
        console.error('[MySQL Pool Error]:', poolErr.message);
      }

      return {
        success: true,
        database,
        tablesCreated,
        message: `Toutes les 19 tables MySQL interconnectées ont été vérifiées/créées avec succès dans la base '${database}' !`,
        adminUser: {
          username: 'admin',
          email: 'admin@evasionsoleil.com',
          role: 'super_admin',
        },
      };
    } catch (err: any) {
      console.warn(`[MySQL Auto-Create] Hôte ${host}:${port} indisponible (${err.message}).`);
      return {
        success: false,
        database,
        tablesCreated,
        error: err.message,
        message: `Erreur de connexion au serveur MySQL (${host}:${port}) : ${err.message}.`,
      };
    }
  }

  public async saveAndConnectMySQL(config: {
    host: string;
    port: number;
    user: string;
    password?: string;
    database: string;
  }): Promise<{ success: boolean; message: string; tablesCreated?: string[]; error?: string }> {
    const { host, port, user, password = '', database } = config;
    try {
      // 1. Tester d'abord et créer toutes les tables
      const initResult = await this.autoCreateTables({ host, port, user, password, database });
      if (!initResult.success) {
        return {
          success: false,
          error: initResult.error,
          message: initResult.message,
        };
      }

      // 2. Sauvegarder dans le fichier de config et .env
      this.saveMySQLConfigToDisk({ host, port, user, password, database });

      // 3. Activer immédiatement le pool de connexions MySQL et synchroniser
      if (this.pool) {
        try {
          await this.pool.end();
        } catch {}
      }

      this.pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 5000,
      });

      this.mysqlConnected = true;
      this.mysqlError = null;

      // Si la base MySQL contient déjà des données, charger depuis MySQL (source de vérité)
      const loaded = await this.loadAllFromMySQL();
      if (!loaded) {
        await this.syncAllToMySQL();
      }

      return {
        success: true,
        message: `Connexion établie et sauvegardée avec succès ! Les tables de la base '${database}' sont prêtes et synchronisées.`,
        tablesCreated: initResult.tablesCreated,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        message: `Erreur de connexion MySQL : ${err.message}`,
      };
    }
  }

  public async getStatus(): Promise<DbStatus> {
    const diskConfig = this.loadMySQLConfigFromDisk();
    const host = diskConfig?.host || process.env.MYSQL_HOST || '127.0.0.1';
    const port = diskConfig?.port || (process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306);
    const database = diskConfig?.database || process.env.MYSQL_DATABASE || 'evasion_soleil';

    let tableCounts: Record<string, number> | undefined;
    if (this.mysqlConnected && this.pool) {
      try {
        const [userRows]: any = await this.pool.query('SELECT COUNT(*) as c FROM users');
        const [subRows]: any = await this.pool.query('SELECT COUNT(*) as c FROM submissions');
        const [teamRows]: any = await this.pool.query('SELECT COUNT(*) as c FROM team_messages');
        const [roleRows]: any = await this.pool.query('SELECT COUNT(*) as c FROM system_roles');
        tableCounts = {
          users: userRows?.[0]?.c || 0,
          submissions: subRows?.[0]?.c || 0,
          teamMessages: teamRows?.[0]?.c || 0,
          systemRoles: roleRows?.[0]?.c || 0,
        };
      } catch (e: any) {
        console.warn('[MySQL] Could not fetch table counts:', e.message);
        this.handleMySQLWriteFailure('getStatus', e);
      }
    }

    return {
      mode: this.mysqlConnected ? 'mysql' : 'json_fallback',
      connected: this.mysqlConnected,
      host,
      port,
      database,
      error: this.mysqlError,
      counts: {
        submissions: this.db.submissions.length,
        conversations: this.db.conversations.length,
        teamMessages: this.db.teamMessages.length,
        users: this.db.users.length,
      },
      tableCounts,
      lastSyncedAt: this.lastFailoverSyncAt || new Date().toISOString(),
      failoverVaultActive: true,
      hasPendingOutageWrites: this.hasPendingOutageWrites,
      pendingOutageCount: this.pendingOutageCount,
    } as any;
  }

  public async testMySQLConnection(config?: {
    host: string;
    port: number;
    user: string;
    password?: string;
    database: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const testPool = mysql.createPool({
        host: config?.host || process.env.MYSQL_HOST || '127.0.0.1',
        port: config?.port || (process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306),
        user: config?.user || process.env.MYSQL_USER || 'root',
        password: config?.password !== undefined ? config.password : (process.env.MYSQL_PASSWORD || ''),
        database: config?.database || process.env.MYSQL_DATABASE || 'evasion_soleil',
        connectTimeout: 5000,
      });
      const conn = await testPool.getConnection();
      await conn.ping();
      conn.release();
      await testPool.end();
      return { success: true, message: 'Connexion MySQL réussie avec succès !' };
    } catch (err: any) {
      return { success: false, message: `Échec de connexion : ${err.message}` };
    }
  }

  // Users
  public getUsers(): User[] {
    return this.db.users;
  }

  public getUserById(id: string): User | undefined {
    if (!id) return undefined;
    const clean = id.trim().toLowerCase();
    return this.db.users.find(
      (u) =>
        u.id === id ||
        (u.id && u.id.toLowerCase() === clean) ||
        (u.username && u.username.toLowerCase() === clean) ||
        (u.email && u.email.toLowerCase() === clean) ||
        ((clean === 'admin' || clean === 'usr_sysadmin') && (u.id === 'usr_sysadmin' || u.username === 'admin'))
    );
  }

  public getUserByUsernameOrEmail(identifier: string): User | undefined {
    if (!identifier || typeof identifier !== 'string') return undefined;
    const clean = identifier.trim().toLowerCase();
    if (!clean) return undefined;
    return this.db.users.find((u) => {
      const uUsername = (u.username || '').trim().toLowerCase();
      const uEmail = (u.email || '').trim().toLowerCase();
      const uId = (u.id || '').trim().toLowerCase();
      return uUsername === clean || uEmail === clean || uId === clean;
    });
  }

  private twoFactorChallenges = new Map<string, { userId: string; code: string; expiresAt: number }>();

  public authenticate(identifier: string, passwordAttempt: string): { user?: User; error?: string } {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (passwordAttempt || '').trim();

    const user = this.getUserByUsernameOrEmail(cleanId);
    if (!user) {
      return { error: 'Identifiant ou courriel introuvable.' };
    }

    const isPasswordValid =
      user.password === passwordAttempt ||
      user.password === cleanPass ||
      (user.password && user.password.toLowerCase() === cleanPass.toLowerCase());

    if (!isPasswordValid) {
      return { error: 'Mot de passe incorrect pour ce compte.' };
    }
    return { user };
  }

  public createTwoFactorChallenge(user: User): { challengeToken: string; emailCode: string } {
    const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
    const challengeToken = `2fa_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    this.twoFactorChallenges.set(challengeToken, {
      userId: user.id,
      code: emailCode,
      expiresAt,
    });

    this.createNotification({
      title: 'Connexion A2F en cours',
      message: `Code de sécurité A2F [${emailCode}] généré pour ${user.name} (${user.email}).`,
      type: 'system',
      referenceId: user.id,
    });

    return { challengeToken, emailCode };
  }

  public verifyTwoFactorChallenge(
    challengeToken: string,
    codeAttempt: string,
    verifyTotpFn: (secret: string, code: string) => boolean
  ): { success: boolean; user?: User; error?: string } {
    const cleanToken = (challengeToken || '').trim();
    const cleanCode = (codeAttempt || '').replace(/\s+/g, '');

    if (!cleanCode || !/^\d{6}$/.test(cleanCode)) {
      return { success: false, error: 'Veuillez entrer un code de sécurité à 6 chiffres valide.' };
    }

    const challenge = this.twoFactorChallenges.get(cleanToken);
    if (!challenge) {
      return { success: false, error: 'Session de vérification A2F expirée ou invalide. Veuillez vous reconnecter.' };
    }

    if (Date.now() > challenge.expiresAt) {
      this.twoFactorChallenges.delete(cleanToken);
      return { success: false, error: 'Le délai de vérification A2F (10 minutes) est expiré. Veuillez vous reconnecter.' };
    }

    const user = this.getUserById(challenge.userId);
    if (!user) {
      return { success: false, error: 'Utilisateur introuvable.' };
    }

    const isEmailCodeMatch = challenge.code === cleanCode;
    const isTotpMatch = user.twoFactorSecret ? verifyTotpFn(user.twoFactorSecret, cleanCode) : false;

    if (!isEmailCodeMatch && !isTotpMatch) {
      return {
        success: false,
        error: 'Code A2F invalide. Vérifiez votre application Authenticator ou le code reçu par courriel.',
      };
    }

    this.twoFactorChallenges.delete(cleanToken);
    return { success: true, user };
  }

  public resendTwoFactorChallenge(challengeToken: string): {
    success: boolean;
    user?: User;
    emailCode?: string;
    error?: string;
  } {
    const cleanToken = (challengeToken || '').trim();
    const challenge = this.twoFactorChallenges.get(cleanToken);
    if (!challenge) {
      return { success: false, error: 'Session A2F introuvable ou expirée.' };
    }
    const user = this.getUserById(challenge.userId);
    if (!user) {
      return { success: false, error: 'Utilisateur introuvable.' };
    }
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    challenge.code = newCode;
    challenge.expiresAt = Date.now() + 10 * 60 * 1000;
    this.twoFactorChallenges.set(cleanToken, challenge);
    return { success: true, user, emailCode: newCode };
  }

  public requestPasswordReset(
    identifier: string,
    createdByAdmin = false
  ): {
    success: boolean;
    message: string;
    email?: string;
    userName?: string;
    code?: string;
    token?: string;
    user?: User;
  } {
    const user = this.getUserByUsernameOrEmail(identifier);
    if (!user) {
      return {
        success: false,
        message: 'Aucun compte associé à ce nom d\'utilisateur ou courriel.',
      };
    }

    if (!Array.isArray(this.db.resetCodes)) {
      this.db.resetCodes = [];
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = `rst_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const resetEntry: PasswordResetCode = {
      id: `rc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email: user.email.toLowerCase(),
      code,
      token,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString(),
      createdByAdmin,
    };

    // Filter out old codes for this email to avoid clutter
    this.db.resetCodes = this.db.resetCodes
      .filter((r) => r.email !== user.email.toLowerCase() || (!r.used && new Date(r.expiresAt).getTime() > Date.now()))
      .concat(resetEntry);

    this.saveToJson();
    this.syncPasswordResetCodeToMySQL(resetEntry).catch((err: any) =>
      console.error('[MySQL] Sync requestPasswordReset error:', err.message)
    );

    console.log(`[Security / Password Reset] Code à 6 chiffres généré pour ${user.name} (${user.email}): ${code} (Token: ${token})`);

    // In-app alert notification
    this.createNotification({
      title: 'Demande de Réinitialisation de Mot de Passe',
      message: `Code de vérification [${code}] généré pour ${user.name} (${user.email}).`,
      type: 'system',
      referenceId: user.id,
    });

    return {
      success: true,
      message: `Un code de vérification à 6 chiffres a été généré et envoyé à l'adresse courriel ${user.email}.`,
      email: user.email,
      userName: user.name,
      code,
      token,
      user,
    };
  }

  public verifyPasswordResetCode(
    identifier: string,
    codeAttempt: string
  ): { success: boolean; valid: boolean; token?: string; email?: string; message: string } {
    const cleanCode = (codeAttempt || '').replace(/\s+/g, '');
    if (!cleanCode || cleanCode.length !== 6) {
      return { success: false, valid: false, message: 'Le code de vérification doit comporter exactement 6 chiffres.' };
    }

    if (!Array.isArray(this.db.resetCodes)) {
      this.db.resetCodes = [];
    }

    const now = Date.now();
    let user = identifier ? this.getUserByUsernameOrEmail(identifier.trim()) : undefined;

    // Look for matching code (by user email if user found, or directly by code if valid)
    const matchingCode = this.db.resetCodes.find(
      (r) =>
        r.code === cleanCode &&
        !r.used &&
        new Date(r.expiresAt).getTime() > now &&
        (!user || r.email === user.email.toLowerCase())
    );

    if (!matchingCode) {
      return {
        success: false,
        valid: false,
        message: 'Code de vérification invalide ou expiré (durée de validité : 15 minutes). Veuillez redemander un code.',
      };
    }

    if (!user) {
      user = this.getUserByUsernameOrEmail(matchingCode.email);
    }

    return {
      success: true,
      valid: true,
      token: matchingCode.token,
      email: user?.email || matchingCode.email,
      message: 'Code de vérification validé avec succès ! Vous pouvez maintenant saisir votre nouveau mot de passe.',
    };
  }

  public verifyPasswordResetToken(tokenAttempt: string): { valid: boolean; email?: string; user?: User } {
    const cleanToken = (tokenAttempt || '').trim();
    if (!cleanToken || !Array.isArray(this.db.resetCodes)) return { valid: false };

    const matching = this.db.resetCodes.find(
      (r) => r.token === cleanToken && !r.used && new Date(r.expiresAt).getTime() > Date.now()
    );

    if (!matching) return { valid: false };

    const user = this.getUserByUsernameOrEmail(matching.email);
    return { valid: true, email: matching.email, user };
  }

  public resetPassword(
    identifier: string,
    newPass: string,
    codeOrToken?: string,
    isAdminOverride = false
  ): { success: boolean; message: string; user?: User } {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (newPass || '').trim();
    if (!cleanPass) {
      return { success: false, message: 'Le mot de passe ne peut pas être vide.' };
    }
    if (cleanPass.length < 3) {
      return { success: false, message: 'Le mot de passe doit comporter au moins 3 caractères.' };
    }

    const cleanVerification = (codeOrToken || '').trim();
    let user = cleanId ? this.getUserByUsernameOrEmail(cleanId) : undefined;

    // Fallback lookup by token or code if identifier was not passed or was changed
    if (!user && cleanVerification && Array.isArray(this.db.resetCodes)) {
      const codeMatch = this.db.resetCodes.find(
        (r) => (r.token === cleanVerification || r.code === cleanVerification) && !r.used
      );
      if (codeMatch) {
        user = this.getUserByUsernameOrEmail(codeMatch.email);
      }
    }

    if (!user) {
      return { success: false, message: 'Utilisateur introuvable avec cet identifiant ou courriel.' };
    }

    if (!isAdminOverride) {
      let isVerified = false;

      if (cleanVerification.length === 6 && /^\d+$/.test(cleanVerification)) {
        const verifyRes = this.verifyPasswordResetCode(user.email, cleanVerification);
        isVerified = verifyRes.valid;
      } else if (cleanVerification.startsWith('rst_')) {
        const verifyTokenRes = this.verifyPasswordResetToken(cleanVerification);
        isVerified = verifyTokenRes.valid;
      }

      if (!isVerified) {
        return {
          success: false,
          message: 'Vérification requise : Veuillez saisir le code de vérification à 6 chiffres reçu ou utiliser un lien sécurisé valide.',
        };
      }
    }

    // Mark corresponding code as used
    if (Array.isArray(this.db.resetCodes)) {
      const userEmail = user.email.toLowerCase();
      this.db.resetCodes.forEach((r) => {
        if (r.email === userEmail && (!codeOrToken || r.code === codeOrToken || r.token === codeOrToken)) {
          r.used = true;
          this.syncPasswordResetCodeToMySQL(r).catch(() => {});
        }
      });
    }

    user.password = cleanPass;
    const updated = this.updateUser(user);
    this.saveToJson();

    console.log(`[Security / Password Reset] Mot de passe réinitialisé avec succès pour ${user.name} (${user.email})`);
    return {
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès dans la base de données. Vous pouvez maintenant vous connecter.',
      user: updated,
    };
  }

  public generateAdminResetLink(
    userId: string,
    originUrl?: string
  ): {
    success: boolean;
    code?: string;
    token?: string;
    resetUrl?: string;
    user?: User;
    message?: string;
  } {
    const user = this.getUserById(userId) || this.getUserByUsernameOrEmail(userId);
    if (!user) {
      return { success: false, message: 'Utilisateur introuvable.' };
    }

    const reqResult = this.requestPasswordReset(user.email, true);
    if (!reqResult.success || !reqResult.token) {
      return { success: false, message: 'Erreur lors de la génération du lien.' };
    }

    const base = originUrl || '';
    const resetUrl = `${base}/?reset_token=${encodeURIComponent(reqResult.token)}&email=${encodeURIComponent(user.email)}&tab=portal`;

    return {
      success: true,
      code: reqResult.code,
      token: reqResult.token,
      resetUrl,
      user,
      message: `Lien direct et code de réinitialisation créés pour ${user.name}.`,
    };
  }

  // MySQL Synchronizers
  public async syncUserToMySQL(user: User): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const perms: any = user.permissions || {};
      await this.pool.execute(
        `INSERT INTO users (
          id, username, password, name, email, avatar, role, grade,
          special_tag, special_tags_json, special_tag_enabled, status,
          can_manage_bot, can_toggle_bot, can_edit_form, can_view_submissions,
          can_manage_submissions, can_view_stats, can_manage_team, can_access_team_chat,
          can_configure_mysql, can_export_data, can_manage_users, can_assign_admin_tags,
          can_block_ips, can_intervene_chat, can_modify_names, can_modify_posts,
          can_assign_special_tags, can_manage_permissions, permissions_json, raw_data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          username=VALUES(username), password=VALUES(password), name=VALUES(name), email=VALUES(email),
          avatar=VALUES(avatar), role=VALUES(role), grade=VALUES(grade), special_tag=VALUES(special_tag),
          special_tags_json=VALUES(special_tags_json), special_tag_enabled=VALUES(special_tag_enabled),
          status=VALUES(status),
          can_manage_bot=VALUES(can_manage_bot), can_toggle_bot=VALUES(can_toggle_bot), can_edit_form=VALUES(can_edit_form),
          can_view_submissions=VALUES(can_view_submissions), can_manage_submissions=VALUES(can_manage_submissions),
          can_view_stats=VALUES(can_view_stats), can_manage_team=VALUES(can_manage_team),
          can_access_team_chat=VALUES(can_access_team_chat), can_configure_mysql=VALUES(can_configure_mysql),
          can_export_data=VALUES(can_export_data), can_manage_users=VALUES(can_manage_users),
          can_assign_admin_tags=VALUES(can_assign_admin_tags), can_block_ips=VALUES(can_block_ips),
          can_intervene_chat=VALUES(can_intervene_chat), can_modify_names=VALUES(can_modify_names),
          can_modify_posts=VALUES(can_modify_posts), can_assign_special_tags=VALUES(can_assign_special_tags),
          can_manage_permissions=VALUES(can_manage_permissions), permissions_json=VALUES(permissions_json),
          raw_data_json=VALUES(raw_data_json)`,
        [
          user.id,
          user.username || '',
          user.password || 'soleil2026',
          user.name,
          user.email,
          user.avatar || '',
          user.role || 'agent',
          user.grade || '',
          user.specialTag || '',
          JSON.stringify(user.specialTags || []),
          user.specialTagEnabled !== false ? 1 : 0,
          user.status === 'indisponible' ? 'indisponible' : 'disponible',
          perms.canManageBot ? 1 : 0,
          perms.canToggleBot ? 1 : 0,
          perms.canEditForm ? 1 : 0,
          perms.canViewSubmissions ? 1 : 0,
          perms.canManageSubmissions ? 1 : 0,
          perms.canViewStats ? 1 : 0,
          perms.canManageTeam ? 1 : 0,
          perms.canAccessTeamChat ? 1 : 0,
          perms.canConfigureMySQL ? 1 : 0,
          perms.canExportData ? 1 : 0,
          perms.canManageUsers ? 1 : 0,
          perms.canAssignAdminTags ? 1 : 0,
          perms.canBlockIps ? 1 : 0,
          perms.canInterveneChat !== false ? 1 : 0,
          perms.canModifyNames ? 1 : 0,
          perms.canModifyPosts ? 1 : 0,
          perms.canAssignSpecialTags ? 1 : 0,
          perms.canManagePermissions ? 1 : 0,
          JSON.stringify(perms),
          JSON.stringify(user),
        ]
      );
      console.log(`[MySQL] Utilisateur synchronisé avec succès: ${user.name} (@${user.username})`);
      return true;
    } catch (err: any) {
      console.error(`[MySQL] Erreur sync utilisateur ${user.name}:`, err.message);
      this.handleMySQLWriteFailure('syncUserToMySQL', err);
      return false;
    }
  }

  public async syncSubmissionToMySQL(sub: QuoteSubmission): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const rawDate = sub.departureDate ? String(sub.departureDate).substring(0, 10) : new Date().toISOString().substring(0, 10);
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : new Date().toISOString().substring(0, 10);

      const emailClean = (sub.customerEmail || '').toLowerCase().trim();
      const clientId = emailClean ? `cli_${emailClean.replace(/[^a-z0-9]/g, '_')}` : `cli_${sub.id}`;
      
      const parsedFirst = sub.customerFirstName || (sub as any).fullName?.split(' ')[0] || (sub as any).customerName?.split(' ')[0] || 'Client';
      const parsedLast = sub.customerLastName || (sub as any).fullName?.split(' ').slice(1).join(' ') || (sub as any).customerName?.split(' ').slice(1).join(' ') || '';

      try {
        await this.pool.execute(
          `INSERT INTO crm_clients (id, first_name, last_name, email, phone, preferred_call_time)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE first_name=VALUES(first_name), last_name=VALUES(last_name), phone=VALUES(phone)`,
          [
            clientId,
            parsedFirst || '',
            parsedLast || '',
            emailClean || `sans_courriel_${sub.id}@client.evasionsoleil.com`,
            sub.customerPhone ?? '',
            sub.preferredCallTime || 'tout_temps',
          ]
        );
      } catch (clientErr: any) {
        console.warn(`[MySQL] Note crm_clients pour ${sub.customerEmail}:`, clientErr.message);
      }

      const assignedUserId = sub.assignedToUserId && this.db.users.some(u => u.id === sub.assignedToUserId)
        ? sub.assignedToUserId
        : null;

      await this.pool.execute(
        `INSERT INTO submissions (
          id, client_id, reference_number, service_type, departure_city, destination,
          departure_date, is_flexible_date, duration, adults_count, children_count,
          children_ages, budget_per_person, cruise_cabin_type, cruise_line,
          competitor_url, competitor_target_price, customer_first_name, customer_last_name,
          customer_email, customer_phone, preferred_call_time, customer_notes,
          call_status, call_attempts, assigned_to_user_id, assigned_to_user_name,
          email_customer_sent, email_agency_sent, cabin_class, hotel_category, flight_class, tags_json,
          proposals_json, proposals_sent_at, proposals_sent_by, proposals_sent_to_email, raw_data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          client_id=VALUES(client_id),
          call_status=VALUES(call_status),
          call_attempts=VALUES(call_attempts),
          assigned_to_user_id=VALUES(assigned_to_user_id),
          assigned_to_user_name=VALUES(assigned_to_user_name),
          cabin_class=VALUES(cabin_class),
          hotel_category=VALUES(hotel_category),
          flight_class=VALUES(flight_class),
          tags_json=VALUES(tags_json),
          proposals_json=VALUES(proposals_json),
          proposals_sent_at=VALUES(proposals_sent_at),
          proposals_sent_by=VALUES(proposals_sent_by),
          proposals_sent_to_email=VALUES(proposals_sent_to_email),
          raw_data_json=VALUES(raw_data_json),
          updated_at=CURRENT_TIMESTAMP`,
        [
          sub.id,
          clientId,
          sub.referenceNumber ?? null,
          sub.serviceType ?? 'forfait_sud',
          sub.departureCity ?? 'YUL',
          sub.destination ?? '',
          validDate,
          sub.isFlexibleDate ? 1 : 0,
          sub.duration ?? '',
          sub.adultsCount || (sub as any).adults || 2,
          sub.childrenCount || 0,
          sub.childrenAges ?? '',
          sub.budgetPerPerson ?? '',
          sub.cruiseCabinType ?? '',
          sub.cruiseLine ?? '',
          sub.competitorUrl ?? '',
          sub.competitorTargetPrice ?? '',
          parsedFirst ?? '',
          parsedLast ?? '',
          emailClean ?? '',
          sub.customerPhone ?? '',
          sub.preferredCallTime || 'tout_temps',
          sub.customerNotes ?? '',
          sub.callStatus || 'a_appeler',
          sub.callAttempts || 0,
          assignedUserId,
          sub.assignedToUserName ?? null,
          sub.emailCustomerSent !== false ? 1 : 0,
          sub.emailAgencySent !== false ? 1 : 0,
          sub.cabinClass ?? '',
          sub.hotelCategory ?? '',
          sub.flightClass ?? '',
          JSON.stringify((sub as any).tags || []),
          sub.proposals ? JSON.stringify(sub.proposals) : null,
          sub.proposalsSentAt ? new Date(sub.proposalsSentAt) : null,
          sub.proposalsSentBy ?? null,
          sub.proposalsSentToEmail ?? null,
          JSON.stringify(sub),
        ]
      );

      if (Array.isArray(sub.notes)) {
        for (const note of sub.notes) {
          const authorUser = this.db.users.find(u => u.name === note.authorName || u.username === note.authorName);
          const authorId = authorUser ? authorUser.id : null;
          await this.pool.execute(
            `INSERT INTO submission_notes (id, submission_id, author_id, author_name, author_grade, text, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE text=VALUES(text)`,
            [
              note.id,
              sub.id,
              authorId,
              note.authorName || 'Conseiller',
              note.authorGrade || '',
              note.text,
              note.createdAt ? new Date(note.createdAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
            ]
          ).catch(() => {});
        }
      }
      return true;
    } catch (err: any) {
      console.error(`[MySQL] Erreur sync soumission ${sub.referenceNumber}:`, err.message);
      this.handleMySQLWriteFailure('syncSubmissionToMySQL', err);
      return false;
    }
  }

  public async syncFormConfigToMySQL(fc = this.db.formConfig): Promise<boolean> {
    if (!this.pool) return false;
    try {
      await this.pool.execute(
        `INSERT INTO form_config (
          id, title, subtitle, notification_email, agency_logo_url, agency_name, agency_phone, agency_tagline,
          services_json, departure_cities_json, destinations_json, durations_json, hotel_categories_json,
          meal_plans_json, cruise_cabins_json, cruise_lines_json, budget_ranges_json, insurance_types_json,
          disclaimer_insurance_text, financing_available,
          all_inclusive_flight_classes_json, vol_hotel_flight_classes_json, vol_hotel_hotel_categories_json, raw_data_json
        ) VALUES (
          1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        ) ON DUPLICATE KEY UPDATE
          title=VALUES(title), subtitle=VALUES(subtitle), notification_email=VALUES(notification_email),
          agency_logo_url=VALUES(agency_logo_url), agency_name=VALUES(agency_name), agency_phone=VALUES(agency_phone),
          agency_tagline=VALUES(agency_tagline), services_json=VALUES(services_json),
          departure_cities_json=VALUES(departure_cities_json), destinations_json=VALUES(destinations_json),
          durations_json=VALUES(durations_json), hotel_categories_json=VALUES(hotel_categories_json),
          meal_plans_json=VALUES(meal_plans_json), cruise_cabins_json=VALUES(cruise_cabins_json),
          cruise_lines_json=VALUES(cruise_lines_json), budget_ranges_json=VALUES(budget_ranges_json),
          insurance_types_json=VALUES(insurance_types_json), disclaimer_insurance_text=VALUES(disclaimer_insurance_text),
          financing_available=VALUES(financing_available),
          all_inclusive_flight_classes_json=VALUES(all_inclusive_flight_classes_json),
          vol_hotel_flight_classes_json=VALUES(vol_hotel_flight_classes_json),
          vol_hotel_hotel_categories_json=VALUES(vol_hotel_hotel_categories_json),
          raw_data_json=VALUES(raw_data_json)`,
        [
          fc.title || 'Demande de Devis Voyage Personnalisé',
          fc.subtitle || '',
          fc.notificationEmail || 'info@evasionsoleil.com',
          fc.agencyLogoUrl || '',
          fc.agencyName || 'Évasion Soleil Voyages Inc.',
          fc.agencyPhone || '438-373-7076',
          fc.agencyTagline || '',
          JSON.stringify(fc.services || []),
          JSON.stringify(fc.departureCities || []),
          JSON.stringify(fc.destinations || []),
          JSON.stringify(fc.durations || []),
          JSON.stringify(fc.hotelCategories || []),
          JSON.stringify(fc.mealPlans || []),
          JSON.stringify(fc.cruiseCabins || []),
          JSON.stringify(fc.cruiseLines || []),
          JSON.stringify(fc.budgetRanges || []),
          JSON.stringify(fc.insuranceTypes || []),
          fc.disclaimerInsuranceText || '',
          fc.financingAvailable ? 1 : 0,
          JSON.stringify(fc.allInclusiveFlightClasses || []),
          JSON.stringify(fc.volHotelFlightClasses || []),
          JSON.stringify(fc.volHotelHotelCategories || []),
          JSON.stringify(fc),
        ]
      );
      console.log('[MySQL] FormConfig synchronisé avec succès');
      return true;
    } catch (err: any) {
      console.error('[MySQL] Erreur sync form_config:', err.message);
      this.handleMySQLWriteFailure('syncFormConfigToMySQL', err);
      return false;
    }
  }

  public async syncChatbotSettingsToMySQL(cs = this.db.chatbotSettings): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const payload = {
        ...cs,
        lockPdfForAdvisors: this.db.lockPdfForAdvisors,
      };
      await this.pool.execute(
        `INSERT INTO chatbot_settings (
          id, bot_name, bot_tag, bot_enabled, offline_message, welcome_message,
          agent_notification_email, quote_redirect_url, system_prompt, show_agent_tags, primary_color, blocked_ips_json, raw_data_json
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          bot_name=VALUES(bot_name), bot_tag=VALUES(bot_tag), bot_enabled=VALUES(bot_enabled),
          offline_message=VALUES(offline_message), welcome_message=VALUES(welcome_message),
          agent_notification_email=VALUES(agent_notification_email), quote_redirect_url=VALUES(quote_redirect_url),
          system_prompt=VALUES(system_prompt), show_agent_tags=VALUES(show_agent_tags),
          primary_color=VALUES(primary_color), blocked_ips_json=VALUES(blocked_ips_json),
          raw_data_json=VALUES(raw_data_json)`,
        [
          cs.botName || 'Martine V.',
          cs.botTag || 'BOT',
          cs.botEnabled ? 1 : 0,
          cs.offlineMessage || '',
          cs.welcomeMessage || '',
          cs.agentNotificationEmail || 'info@evasionsoleil.com',
          cs.quoteRedirectUrl || 'https://evasionsoleil.com/devis',
          cs.systemPrompt || '',
          cs.showAgentTags ? 1 : 0,
          cs.primaryColor || '#338b84',
          JSON.stringify((cs as any).blockedIps || []),
          JSON.stringify(payload),
        ]
      );

      // Sync blocked_ips table
      const blockedIps = cs.blockedIps || [];
      const reasons = cs.blockedIpReasons || {};
      await this.pool.query('DELETE FROM `blocked_ips`').catch(() => {});
      for (const ip of blockedIps) {
        await this.pool.execute(
          `INSERT INTO blocked_ips (ip_address, reason) VALUES (?, ?) ON DUPLICATE KEY UPDATE reason=VALUES(reason)`,
          [ip, reasons[ip] || 'Non-respect des conditions d\'utilisation']
        ).catch(() => {});
      }

      return true;
    } catch (err: any) {
      console.error('[MySQL] Erreur sync chatbot_settings:', err.message);
      this.handleMySQLWriteFailure('syncChatbotSettingsToMySQL', err);
      return false;
    }
  }

  public async syncSystemRoleToMySQL(r: SystemRole): Promise<boolean> {
    if (!this.pool) return false;
    try {
      await this.pool.execute(
        `INSERT INTO system_roles (
          id, name, description, badge_color, grade, role_key,
          default_special_tag, special_tags_json, permissions_json, is_default, raw_data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name=VALUES(name), description=VALUES(description), badge_color=VALUES(badge_color),
          grade=VALUES(grade), role_key=VALUES(role_key), default_special_tag=VALUES(default_special_tag),
          special_tags_json=VALUES(special_tags_json), permissions_json=VALUES(permissions_json),
          is_default=VALUES(is_default), raw_data_json=VALUES(raw_data_json)`,
        [
          r.id,
          r.name,
          r.description || '',
          r.badgeColor || 'bg-teal-600 text-white',
          r.grade || '',
          r.roleKey || 'agent',
          r.defaultSpecialTag || '',
          JSON.stringify(r.specialTags || []),
          JSON.stringify(r.permissions || {}),
          r.isDefault ? 1 : 0,
          JSON.stringify(r),
        ]
      );
      return true;
    } catch (err: any) {
      console.error(`[MySQL] Erreur sync rôle ${r.name}:`, err.message);
      this.handleMySQLWriteFailure('syncSystemRoleToMySQL', err);
      return false;
    }
  }

  public async syncCrmClientToMySQL(c: any): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const assignedAdvisorId = c.assignedAdvisorId && this.db.users.some(u => u.id === c.assignedAdvisorId)
        ? c.assignedAdvisorId
        : null;

      await this.pool.execute(
        `INSERT INTO crm_clients (
          id, first_name, last_name, email, phone, vip_level, preferred_call_time,
          assigned_advisor_id, assigned_advisor_name, tags_json, total_submissions, total_reservations, raw_data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          first_name=VALUES(first_name), last_name=VALUES(last_name), phone=VALUES(phone),
          vip_level=VALUES(vip_level), preferred_call_time=VALUES(preferred_call_time),
          assigned_advisor_id=VALUES(assigned_advisor_id), assigned_advisor_name=VALUES(assigned_advisor_name),
          tags_json=VALUES(tags_json), total_submissions=VALUES(total_submissions),
          total_reservations=VALUES(total_reservations), raw_data_json=VALUES(raw_data_json)`,
        [
          c.id,
          c.firstName ?? '',
          c.lastName ?? '',
          (c.email || '').toLowerCase().trim() || `client_${c.id}@evasionsoleil.com`,
          c.phone ?? '',
          c.vipLevel || 'Standard',
          c.preferredCallTime || 'tout_temps',
          assignedAdvisorId,
          c.assignedAdvisorName ?? null,
          JSON.stringify(c.tags || []),
          c.totalSubmissions || c.submissionsCount || 0,
          c.totalReservations || c.traveledCount || 0,
          JSON.stringify(c),
        ]
      );
      return true;
    } catch (err: any) {
      console.error(`[MySQL] Erreur sync crm_client ${c.email}:`, err.message);
      this.handleMySQLWriteFailure('syncCrmClientToMySQL', err);
      return false;
    }
  }

  public async syncCrmClientNoteToMySQL(n: ClientNote): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const author = this.db.users.find(u => u.name === n.authorName || u.username === n.authorName);
      const authorId = author ? author.id : null;

      // Ensure parent client exists in crm_clients so FK doesn't fail
      await this.pool.execute(
        `INSERT IGNORE INTO crm_clients (id, first_name, last_name, email, phone) VALUES (?, 'Client', '', ?, '')`,
        [n.clientId, `client_${n.clientId}@evasionsoleil.com`]
      ).catch(() => {});

      await this.pool.execute(
        `INSERT INTO crm_client_notes (id, client_id, author_id, author_name, author_grade, text, raw_data_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE text=VALUES(text), raw_data_json=VALUES(raw_data_json)`,
        [
          n.id,
          n.clientId,
          authorId,
          n.authorName,
          n.authorGrade || '',
          n.text,
          JSON.stringify(n),
          n.createdAt ? new Date(n.createdAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
        ]
      );
      return true;
    } catch (err: any) {
      console.error(`[MySQL] Erreur sync crm_client_note:`, err.message);
      this.handleMySQLWriteFailure('syncCrmClientNoteToMySQL', err);
      return false;
    }
  }

  public async syncNewsletterSubscriberToMySQL(s: NewsletterSubscriber): Promise<boolean> {
    if (!this.pool) return false;
    try {
      await this.pool.execute(
        `INSERT INTO newsletter_subscribers (
          id, email, first_name, last_name, status, preferences_json, source, token, raw_data_json, subscribed_at, unsubscribed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          first_name=VALUES(first_name), last_name=VALUES(last_name), status=VALUES(status),
          preferences_json=VALUES(preferences_json), raw_data_json=VALUES(raw_data_json), unsubscribed_at=VALUES(unsubscribed_at)`,
        [
          s.id,
          s.email.toLowerCase().trim(),
          s.firstName || '',
          s.lastName || '',
          s.status || 'active',
          JSON.stringify(s.preferences || {}),
          s.source || 'website_footer',
          s.token || null,
          JSON.stringify(s),
          s.subscribedAt ? new Date(s.subscribedAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
          s.unsubscribedAt ? new Date(s.unsubscribedAt).toISOString().slice(0, 19).replace('T', ' ') : null,
        ]
      );
      return true;
    } catch (err: any) {
      console.error(`[MySQL] Erreur sync newsletter_subscribers (${s.email}):`, err.message);
      this.handleMySQLWriteFailure('syncNewsletterSubscriberToMySQL', err);
      return false;
    }
  }

  public async syncNewsletterCampaignToMySQL(c: NewsletterCampaign): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const senderId = c.sentByUserId && this.db.users.some(u => u.id === c.sentByUserId)
        ? c.sentByUserId
        : null;

      await this.pool.execute(
        `INSERT INTO newsletter_campaigns (
          id, subject, preview_text, content, category, target_audience, sent_by_user_id, sent_by_user_name, recipient_count, status, raw_data_json, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status=VALUES(status), recipient_count=VALUES(recipient_count), raw_data_json=VALUES(raw_data_json)`,
        [
          c.id,
          c.subject,
          c.previewText || '',
          c.content,
          c.category || 'all',
          c.targetAudience || 'all_clients_and_subscribers',
          senderId,
          c.sentByUserName || '',
          c.recipientsCount || 0,
          c.status || 'sent',
          JSON.stringify(c),
          c.sentAt ? new Date(c.sentAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
        ]
      );
      return true;
    } catch (err: any) {
      console.error(`[MySQL] Erreur sync newsletter_campaigns (${c.subject}):`, err.message);
      this.handleMySQLWriteFailure('syncNewsletterCampaignToMySQL', err);
      return false;
    }
  }

  public async syncTeamMessageToMySQL(m: TeamMessage): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const userExists = this.db.users.some(u => u.id === m.userId);
      const effectiveUserId = userExists ? m.userId : (this.db.users[0]?.id || 'usr_sysadmin');

      await this.pool.execute(
        `INSERT INTO team_messages (
          id, channel_id, user_id, user_name, user_grade, user_tag, user_tag_enabled, text, attachments_json, raw_data_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE text=VALUES(text), raw_data_json=VALUES(raw_data_json)`,
        [
          m.id,
          m.channelId || 'general',
          effectiveUserId,
          m.userName,
          m.userGrade || '',
          m.userTag || '',
          m.userTagEnabled !== false ? 1 : 0,
          m.text,
          JSON.stringify(m.attachments || []),
          JSON.stringify(m),
          m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
        ]
      );
      return true;
    } catch (err: any) {
      console.error('[MySQL] Erreur sync team_messages:', err.message);
      this.handleMySQLWriteFailure('syncTeamMessageToMySQL', err);
      return false;
    }
  }

  public async syncChatConversationToMySQL(conv: ChatConversation): Promise<boolean> {
    if (!this.pool) return false;
    try {
      await this.pool.execute(
        `INSERT INTO chat_conversations (
          id, visitor_name, visitor_email, visitor_phone, status, unread_agent, raw_data_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status=VALUES(status), unread_agent=VALUES(unread_agent),
          visitor_name=VALUES(visitor_name), visitor_email=VALUES(visitor_email),
          visitor_phone=VALUES(visitor_phone), raw_data_json=VALUES(raw_data_json)`,
        [
          conv.id,
          conv.visitorName || 'Visiteur',
          conv.visitorEmail || null,
          conv.visitorPhone || null,
          conv.status || 'active',
          conv.unreadAgent ? 1 : 0,
          JSON.stringify(conv),
          conv.createdAt ? new Date(conv.createdAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
        ]
      );

      if (Array.isArray(conv.messages)) {
        for (const msg of conv.messages) {
          await this.pool.execute(
            `INSERT INTO chat_messages (
              id, conversation_id, sender, sender_name, sender_tag, sender_grade, text, is_agent_handoff, visitor_info_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE text=VALUES(text)`,
            [
              msg.id,
              conv.id,
              msg.sender,
              msg.senderName,
              msg.senderTag || null,
              msg.senderGrade || null,
              msg.text,
              msg.isAgentHandoff ? 1 : 0,
              msg.visitorInfo ? JSON.stringify(msg.visitorInfo) : null,
              msg.timestamp ? new Date(msg.timestamp).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
            ]
          ).catch(() => {});
        }
      }
      return true;
    } catch (err: any) {
      console.error('[MySQL] Erreur sync chat_conversations:', err.message);
      this.handleMySQLWriteFailure('syncChatConversationToMySQL', err);
      return false;
    }
  }

  public async syncPushNotificationToMySQL(n: PushNotificationItem): Promise<boolean> {
    if (!this.pool) return false;
    try {
      await this.pool.execute(
        `INSERT INTO push_notifications (
          id, title, message, type, reference_id, is_read, raw_data_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE is_read=VALUES(is_read), raw_data_json=VALUES(raw_data_json)`,
        [
          n.id,
          n.title,
          n.message,
          n.type || 'new_quote',
          n.referenceId || null,
          n.isRead ? 1 : 0,
          JSON.stringify(n),
          n.createdAt ? new Date(n.createdAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
        ]
      );
      return true;
    } catch (err: any) {
      console.error('[MySQL] Erreur sync push_notifications:', err.message);
      this.handleMySQLWriteFailure('syncPushNotificationToMySQL', err);
      return false;
    }
  }

  public async syncPasswordResetCodeToMySQL(rc: PasswordResetCode): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const user = this.getUserByUsernameOrEmail(rc.email);
      const userId = user ? user.id : (this.db.users[0]?.id || 'usr_sysadmin');
      await this.pool.execute(
        `INSERT INTO password_reset_codes (
          id, user_id, email, code, token, expires_at, is_used, raw_data_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE is_used=VALUES(is_used), raw_data_json=VALUES(raw_data_json)`,
        [
          rc.id,
          userId,
          rc.email,
          rc.code,
          rc.token,
          new Date(rc.expiresAt).toISOString().slice(0, 19).replace('T', ' '),
          rc.used ? 1 : 0,
          JSON.stringify(rc),
          rc.createdAt ? new Date(rc.createdAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
        ]
      );
      return true;
    } catch (err: any) {
      console.error('[MySQL] Erreur sync password_reset_codes:', err.message);
      this.handleMySQLWriteFailure('syncPasswordResetCodeToMySQL', err);
      return false;
    }
  }

  public async syncLegalDocumentTemplateToMySQL(t: LegalDocumentTemplate): Promise<boolean> {
    if (!this.pool) return false;
    try {
      await this.pool.execute(
        `INSERT INTO legal_document_templates (
          id, title, category, description, content, is_locked, raw_data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title=VALUES(title), category=VALUES(category), description=VALUES(description),
          content=VALUES(content), is_locked=VALUES(is_locked), raw_data_json=VALUES(raw_data_json)`,
        [
          t.id,
          t.title,
          t.category || 'contrat_voyage',
          t.description || '',
          t.bodyTemplate || '',
          t.lockedForAdvisors ? 1 : 0,
          JSON.stringify(t),
        ]
      );
      return true;
    } catch (err: any) {
      console.error('[MySQL] Erreur sync legal_document_templates:', err.message);
      this.handleMySQLWriteFailure('syncLegalDocumentTemplateToMySQL', err);
      return false;
    }
  }

  public async syncLegalDocumentToMySQL(doc: LegalDocument): Promise<boolean> {
    if (!this.pool) return false;
    try {
      await this.pool.execute(
        `INSERT INTO legal_documents (
          id, client_key, client_name, client_email, title, category, status,
          content, pdf_base64, pdf_file_name, signed_at, signer_name, signer_ip,
          signature_data_url, doc_data_json, raw_data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status=VALUES(status), content=VALUES(content), pdf_base64=VALUES(pdf_base64),
          pdf_file_name=VALUES(pdf_file_name), signed_at=VALUES(signed_at),
          signer_name=VALUES(signer_name), signer_ip=VALUES(signer_ip),
          signature_data_url=VALUES(signature_data_url), doc_data_json=VALUES(doc_data_json),
          raw_data_json=VALUES(raw_data_json)`,
        [
          doc.id,
          doc.clientKey || '',
          doc.clientName || '',
          doc.clientEmail || '',
          doc.title || '',
          doc.category || 'contrat_voyage',
          doc.status || 'brouillon',
          doc.documentBodyHtml || '',
          doc.fileAttachmentBase64 || null,
          doc.fileAttachmentName || null,
          doc.signedAt ? new Date(doc.signedAt).toISOString().slice(0, 19).replace('T', ' ') : null,
          doc.signatureSignerName || null,
          doc.signedByIp || null,
          doc.signatureDataUrl || null,
          JSON.stringify(doc),
          JSON.stringify(doc),
        ]
      );
      return true;
    } catch (err: any) {
      console.error('[MySQL] Erreur sync legal_documents:', err.message);
      this.handleMySQLWriteFailure('syncLegalDocumentToMySQL', err);
      return false;
    }
  }

  public async syncInvoiceToMySQL(inv: Invoice): Promise<boolean> {
    if (!this.pool) return false;
    try {
      await this.pool.execute(
        `INSERT INTO invoices (
          id, invoice_number, client_key, client_name, client_email, client_phone,
          submission_id, submission_ref, destination, subtotal, total, currency,
          status, payment_method, due_date, paid_at, created_by_user_id, created_by_user_name, raw_data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status=VALUES(status), payment_method=VALUES(payment_method), paid_at=VALUES(paid_at),
          subtotal=VALUES(subtotal), total=VALUES(total), raw_data_json=VALUES(raw_data_json)`,
        [
          inv.id,
          inv.invoiceNumber,
          inv.clientKey || '',
          inv.clientName || '',
          inv.clientEmail || '',
          inv.clientPhone || '',
          inv.submissionId || null,
          inv.submissionRef || null,
          inv.destination || null,
          inv.subtotal || 0,
          inv.total || 0,
          inv.currency || 'CAD',
          inv.status || 'en_attente',
          inv.paymentMethod || 'stripe',
          inv.dueDate || null,
          inv.paidAt || null,
          inv.createdByUserId || null,
          inv.createdByUserName || null,
          JSON.stringify(inv),
        ]
      );
      return true;
    } catch (err: any) {
      console.error('[MySQL] Erreur sync invoices:', err.message);
      this.handleMySQLWriteFailure('syncInvoiceToMySQL', err);
      return false;
    }
  }

  public async syncAllToMySQL(): Promise<{
    success: boolean;
    synced: {
      users: number;
      systemRoles: number;
      submissions: number;
      crmClients: number;
      crmNotes: number;
      newsletterSubscribers: number;
      newsletterCampaigns: number;
      teamMessages: number;
      chatConversations: number;
      pushNotifications: number;
      formConfig: boolean;
      chatbotSettings: boolean;
    };
    error?: string;
  }> {
    if (!this.pool || !this.mysqlConnected) {
      return {
        success: false,
        synced: {
          users: 0, systemRoles: 0, submissions: 0, crmClients: 0, crmNotes: 0,
          newsletterSubscribers: 0, newsletterCampaigns: 0, teamMessages: 0,
          chatConversations: 0, pushNotifications: 0, formConfig: false, chatbotSettings: false
        },
        error: 'Serveur MySQL non connecté. Aucune synchronisation possible.',
      };
    }

    let syncedUsers = 0;
    let syncedRoles = 0;
    let syncedSubmissions = 0;
    let syncedClients = 0;
    let syncedNotes = 0;
    let syncedSubscribers = 0;
    let syncedCampaigns = 0;
    let syncedTeamMessages = 0;
    let syncedChatConversations = 0;
    let syncedNotifications = 0;

    for (const user of this.db.users) {
      if (await this.syncUserToMySQL(user)) syncedUsers++;
    }
    for (const role of (this.db.systemRoles || [])) {
      if (await this.syncSystemRoleToMySQL(role)) syncedRoles++;
    }
    const fcOk = await this.syncFormConfigToMySQL(this.db.formConfig);
    const csOk = await this.syncChatbotSettingsToMySQL(this.db.chatbotSettings);

    for (const client of (this.db.crmClients || [])) {
      if (await this.syncCrmClientToMySQL(client)) syncedClients++;
    }
    for (const cNote of (this.db.clientNotes || [])) {
      if (await this.syncCrmClientNoteToMySQL(cNote)) syncedNotes++;
    }
    for (const sub of this.db.submissions) {
      if (await this.syncSubmissionToMySQL(sub)) syncedSubmissions++;
    }
    for (const subr of (this.db.newsletterSubscribers || [])) {
      if (await this.syncNewsletterSubscriberToMySQL(subr)) syncedSubscribers++;
    }
    for (const camp of (this.db.newsletterCampaigns || [])) {
      if (await this.syncNewsletterCampaignToMySQL(camp)) syncedCampaigns++;
    }
    for (const tMsg of (this.db.teamMessages || [])) {
      if (await this.syncTeamMessageToMySQL(tMsg)) syncedTeamMessages++;
    }
    for (const conv of (this.db.conversations || [])) {
      if (await this.syncChatConversationToMySQL(conv)) syncedChatConversations++;
    }
    for (const notif of (this.db.notifications || [])) {
      if (await this.syncPushNotificationToMySQL(notif)) syncedNotifications++;
    }
    for (const rc of (this.db.resetCodes || [])) {
      await this.syncPasswordResetCodeToMySQL(rc);
    }
    for (const tmpl of (this.db.legalDocumentTemplates || [])) {
      await this.syncLegalDocumentTemplateToMySQL(tmpl);
    }
    for (const doc of (this.db.legalDocuments || [])) {
      await this.syncLegalDocumentToMySQL(doc);
    }
    for (const inv of (this.db.invoices || [])) {
      await this.syncInvoiceToMySQL(inv);
    }

    console.log(`[MySQL] SYNCHRONISATION TOTALE EFFECTUÉE (19 TABLES) : ${syncedUsers} utilisateurs, ${syncedRoles} rôles, ${syncedClients} clients CRM, ${syncedSubmissions} soumissions.`);

    return {
      success: true,
      synced: {
        users: syncedUsers,
        systemRoles: syncedRoles,
        submissions: syncedSubmissions,
        crmClients: syncedClients,
        crmNotes: syncedNotes,
        newsletterSubscribers: syncedSubscribers,
        newsletterCampaigns: syncedCampaigns,
        teamMessages: syncedTeamMessages,
        chatConversations: syncedChatConversations,
        pushNotifications: syncedNotifications,
        formConfig: fcOk,
        chatbotSettings: csOk,
      },
    };
  }

  public async loadAllFromMySQL(): Promise<boolean> {
    if (!this.pool || !this.mysqlConnected) return false;
    try {
      const parseJsonSafe = <T>(val: any, fallback: T): T => {
        if (!val) return fallback;
        if (typeof val === 'object') return val as T;
        try {
          return JSON.parse(val) as T;
        } catch {
          return fallback;
        }
      };

      const [countRows]: any = await this.pool.query('SELECT COUNT(*) as count FROM `users`');
      const count = countRows?.[0]?.count || 0;
      if (count === 0) {
        console.log('[MySQL Load] La table users est vide dans MySQL. Initialisation de la base...');
        await this.syncAllToMySQL();
        return false;
      }

      // 1. Load Users
      const [userRows]: any = await this.pool.query('SELECT * FROM `users` ORDER BY `created_at` ASC');
      if (Array.isArray(userRows) && userRows.length > 0) {
        this.db.users = userRows.map((r: any) => {
          const raw = parseJsonSafe<Partial<User>>(r.raw_data_json, {});
          const perms = parseJsonSafe<any>(r.permissions_json, raw.permissions || {});
          const specialTags = parseJsonSafe<string[]>(r.special_tags_json, raw.specialTags || []);
          return {
            ...raw,
            id: r.id,
            username: r.username,
            password: r.password,
            name: r.name,
            email: r.email,
            avatar: r.avatar || raw.avatar || '',
            role: r.role || raw.role || 'agent',
            grade: r.grade || raw.grade || '',
            specialTag: r.special_tag || raw.specialTag || '',
            specialTags: specialTags.length > 0 ? specialTags : (r.special_tag ? [r.special_tag] : []),
            specialTagEnabled: Boolean(r.special_tag_enabled),
            status: r.status === 'indisponible' ? 'indisponible' : 'disponible',
            permissions: {
              canManageBot: Boolean(perms.canManageBot ?? r.can_manage_bot),
              canToggleBot: Boolean(perms.canToggleBot ?? r.can_toggle_bot),
              canEditForm: Boolean(perms.canEditForm ?? r.can_edit_form),
              canViewSubmissions: Boolean(perms.canViewSubmissions ?? r.can_view_submissions),
              canManageSubmissions: Boolean(perms.canManageSubmissions ?? r.can_manage_submissions),
              canManageSubmissionTags: Boolean(perms.canManageSubmissionTags ?? r.can_manage_submission_tags),
              canViewStats: Boolean(perms.canViewStats ?? r.can_view_stats),
              canManageTeam: Boolean(perms.canManageTeam ?? r.can_manage_team),
              canAccessTeamChat: Boolean(perms.canAccessTeamChat ?? r.can_access_team_chat),
              canConfigureMySQL: Boolean(perms.canConfigureMySQL ?? r.can_configure_mysql),
              canExportData: Boolean(perms.canExportData ?? r.can_export_data),
              canManageUsers: Boolean(perms.canManageUsers ?? r.can_manage_users),
              canAssignAdminTags: Boolean(perms.canAssignAdminTags ?? r.can_assign_admin_tags),
              canBlockIps: Boolean(perms.canBlockIps ?? r.can_block_ips),
              canInterveneChat: Boolean(perms.canInterveneChat ?? r.can_intervene_chat),
              canModifyNames: Boolean(perms.canModifyNames ?? r.can_modify_names),
              canModifyPosts: Boolean(perms.canModifyPosts ?? r.can_modify_posts),
              canAssignSpecialTags: Boolean(perms.canAssignSpecialTags ?? r.can_assign_special_tags),
              canManagePermissions: Boolean(perms.canManagePermissions ?? r.can_manage_permissions),
              canSendNewsletter: Boolean(perms.canSendNewsletter ?? r.can_send_newsletter),
              canManagePdfTemplates: Boolean(perms.canManagePdfTemplates ?? (r.role === 'super_admin' || r.role === 'admin' || r.username === 'admin')),
              ...perms,
            },
          };
        });
      }

      // 2. Load System Roles
      try {
        const [roleRows]: any = await this.pool.query('SELECT * FROM `system_roles` ORDER BY `created_at` ASC');
        if (Array.isArray(roleRows) && roleRows.length > 0) {
          this.db.systemRoles = roleRows.map((r: any) => {
            const raw = parseJsonSafe<Partial<SystemRole>>(r.raw_data_json, {});
            return {
              ...raw,
              id: r.id,
              name: r.name,
              description: r.description,
              badgeColor: r.badge_color,
              grade: r.grade,
              roleKey: r.role_key,
              defaultSpecialTag: r.default_special_tag,
              specialTags: parseJsonSafe<string[]>(r.special_tags_json, raw.specialTags || []),
              permissions: parseJsonSafe<any>(r.permissions_json, raw.permissions || {}),
              isDefault: Boolean(r.is_default),
            };
          });
        }
      } catch (e: any) {
        console.warn('[MySQL Load] system_roles warning:', e.message);
      }

      // 3. Load Form Config
      try {
        const [fcRows]: any = await this.pool.query('SELECT * FROM `form_config` WHERE `id` = 1 LIMIT 1');
        if (Array.isArray(fcRows) && fcRows.length > 0) {
          const r = fcRows[0];
          const raw = parseJsonSafe<Partial<FormConfig>>(r.raw_data_json, {});
          this.db.formConfig = {
            ...initialFormConfig,
            ...raw,
            title: r.title || raw.title || initialFormConfig.title,
            subtitle: r.subtitle ?? raw.subtitle ?? initialFormConfig.subtitle,
            notificationEmail: r.notification_email || raw.notificationEmail || initialFormConfig.notificationEmail,
            agencyLogoUrl: r.agency_logo_url ?? raw.agencyLogoUrl ?? initialFormConfig.agencyLogoUrl,
            agencyName: r.agency_name ?? raw.agencyName ?? initialFormConfig.agencyName,
            agencyPhone: r.agency_phone || raw.agencyPhone || '438-373-7076',
            agencyTagline: r.agency_tagline ?? raw.agencyTagline ?? initialFormConfig.agencyTagline,
            services: parseJsonSafe(r.services_json, raw.services || initialFormConfig.services),
            departureCities: parseJsonSafe(r.departure_cities_json, raw.departureCities || initialFormConfig.departureCities),
            destinations: parseJsonSafe(r.destinations_json, raw.destinations || initialFormConfig.destinations),
            durations: parseJsonSafe(r.durations_json, raw.durations || initialFormConfig.durations),
            hotelCategories: parseJsonSafe(r.hotel_categories_json, raw.hotelCategories || initialFormConfig.hotelCategories),
            mealPlans: parseJsonSafe(r.meal_plans_json, raw.mealPlans || initialFormConfig.mealPlans),
            cruiseCabins: parseJsonSafe(r.cruise_cabins_json, raw.cruiseCabins || initialFormConfig.cruiseCabins),
            cruiseLines: parseJsonSafe(r.cruise_lines_json, raw.cruiseLines || initialFormConfig.cruiseLines),
            budgetRanges: parseJsonSafe(r.budget_ranges_json, raw.budgetRanges || initialFormConfig.budgetRanges),
            insuranceTypes: parseJsonSafe(r.insurance_types_json, raw.insuranceTypes || initialFormConfig.insuranceTypes),
            allInclusiveFlightClasses: parseJsonSafe(r.all_inclusive_flight_classes_json, raw.allInclusiveFlightClasses || initialFormConfig.allInclusiveFlightClasses),
            volHotelFlightClasses: parseJsonSafe(r.vol_hotel_flight_classes_json, raw.volHotelFlightClasses || initialFormConfig.volHotelFlightClasses),
            volHotelHotelCategories: parseJsonSafe(r.vol_hotel_hotel_categories_json, raw.volHotelHotelCategories || initialFormConfig.volHotelHotelCategories),
            disclaimerInsuranceText: r.disclaimer_insurance_text || raw.disclaimerInsuranceText || initialFormConfig.disclaimerInsuranceText,
            financingAvailable: Boolean(r.financing_available ?? raw.financingAvailable ?? true),
          };
        }
      } catch (e: any) {
        console.warn('[MySQL Load] form_config warning:', e.message);
      }

      // 4. Load Chatbot Settings & Blocked IPs
      try {
        const [csRows]: any = await this.pool.query('SELECT * FROM `chatbot_settings` WHERE `id` = 1 LIMIT 1');
        if (Array.isArray(csRows) && csRows.length > 0) {
          const r = csRows[0];
          const raw = parseJsonSafe<any>(r.raw_data_json, {});
          if (raw.lockPdfForAdvisors !== undefined) {
            this.db.lockPdfForAdvisors = Boolean(raw.lockPdfForAdvisors);
          }
          this.db.chatbotSettings = {
            ...initialChatbotSettings,
            ...raw,
            botName: r.bot_name || raw.botName || initialChatbotSettings.botName,
            botTag: r.bot_tag || raw.botTag || initialChatbotSettings.botTag,
            botEnabled: Boolean(r.bot_enabled ?? raw.botEnabled ?? true),
            offlineMessage: r.offline_message || raw.offlineMessage || initialChatbotSettings.offlineMessage,
            welcomeMessage: r.welcome_message || raw.welcomeMessage || initialChatbotSettings.welcomeMessage,
            agentNotificationEmail: r.agent_notification_email || raw.agentNotificationEmail || initialChatbotSettings.agentNotificationEmail,
            quoteRedirectUrl: r.quote_redirect_url || raw.quoteRedirectUrl || initialChatbotSettings.quoteRedirectUrl,
            systemPrompt: r.system_prompt || raw.systemPrompt || initialChatbotSettings.systemPrompt,
            showAgentTags: Boolean(r.show_agent_tags ?? raw.showAgentTags ?? true),
            primaryColor: r.primary_color || raw.primaryColor || initialChatbotSettings.primaryColor,
            blockedIps: parseJsonSafe<string[]>(r.blocked_ips_json, raw.blockedIps || []),
            blockedIpReasons: raw.blockedIpReasons || {},
          };
        }
        const [ipRows]: any = await this.pool.query('SELECT * FROM `blocked_ips`');
        if (Array.isArray(ipRows) && ipRows.length > 0) {
          const ips = new Set<string>(this.db.chatbotSettings.blockedIps || []);
          const reasons: Record<string, string> = { ...(this.db.chatbotSettings.blockedIpReasons || {}) };
          for (const row of ipRows) {
            if (row.ip_address) {
              ips.add(row.ip_address);
              if (row.reason) reasons[row.ip_address] = row.reason;
            }
          }
          this.db.chatbotSettings.blockedIps = Array.from(ips);
          this.db.chatbotSettings.blockedIpReasons = reasons;
        }
      } catch (e: any) {
        console.warn('[MySQL Load] chatbot_settings warning:', e.message);
      }

      // 5. Load CRM Clients & Notes
      try {
        const [crmRows]: any = await this.pool.query('SELECT * FROM `crm_clients` ORDER BY `updated_at` DESC');
        if (Array.isArray(crmRows)) {
          this.db.crmClients = crmRows.map((r: any) => {
            const raw = parseJsonSafe<Partial<ClientRecord>>(r.raw_data_json, {});
            const firstName = r.first_name || raw.firstName || '';
            const lastName = r.last_name || raw.lastName || '';
            return {
              ...raw,
              id: r.id,
              firstName,
              lastName,
              fullName: raw.fullName || `${firstName} ${lastName}`.trim() || 'Client',
              email: r.email || raw.email || '',
              phone: r.phone || raw.phone || '',
              vipLevel: r.vip_level || raw.vipLevel || 'Standard',
              assignedAdvisorId: r.assigned_advisor_id || raw.assignedAdvisorId || undefined,
              assignedAdvisorName: r.assigned_advisor_name || raw.assignedAdvisorName || undefined,
              tags: parseJsonSafe<string[]>(r.tags_json, raw.tags || []),
              notes: raw.notes || [],
              createdAt: r.created_at ? new Date(r.created_at).toISOString() : (raw.createdAt || new Date().toISOString()),
              updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : (raw.updatedAt || new Date().toISOString()),
            };
          });
        }
        const [cNoteRows]: any = await this.pool.query('SELECT * FROM `crm_client_notes` ORDER BY `created_at` DESC');
        if (Array.isArray(cNoteRows)) {
          this.db.clientNotes = cNoteRows.map((r: any) => {
            const raw = parseJsonSafe<Partial<ClientNote>>(r.raw_data_json, {});
            return {
              ...raw,
              id: r.id,
              clientId: r.client_id,
              authorName: r.author_name || raw.authorName || 'Conseiller',
              authorGrade: r.author_grade || raw.authorGrade || '',
              text: r.text || raw.text || '',
              createdAt: r.created_at ? new Date(r.created_at).toISOString() : (raw.createdAt || new Date().toISOString()),
            };
          });
        }
      } catch (e: any) {
        console.warn('[MySQL Load] crm_clients warning:', e.message);
      }

      // 6. Load Submissions & Submission Notes
      try {
        const [subRows]: any = await this.pool.query('SELECT * FROM `submissions` ORDER BY `created_at` DESC');
        const [subNoteRows]: any = await this.pool.query('SELECT * FROM `submission_notes` ORDER BY `created_at` ASC');
        const notesBySubId = new Map<string, any[]>();
        if (Array.isArray(subNoteRows)) {
          for (const nr of subNoteRows) {
            const list = notesBySubId.get(nr.submission_id) || [];
            list.push({
              id: nr.id,
              authorName: nr.author_name || 'Conseiller',
              authorGrade: nr.author_grade || '',
              text: nr.text || '',
              createdAt: nr.created_at ? new Date(nr.created_at).toISOString() : new Date().toISOString(),
            });
            notesBySubId.set(nr.submission_id, list);
          }
        }
        if (Array.isArray(subRows)) {
          this.db.submissions = subRows.map((r: any) => {
            const raw = parseJsonSafe<Partial<QuoteSubmission>>(r.raw_data_json, {});
            const dbNotes = notesBySubId.get(r.id);
            return {
              ...raw,
              id: r.id,
              referenceNumber: r.reference_number || raw.referenceNumber || `ES-2026-${r.id.slice(-4)}`,
              serviceType: (r.service_type || raw.serviceType || 'forfait_tout_inclus') as any,
              departureCity: r.departure_city || raw.departureCity || 'Montréal (YUL)',
              destination: r.destination || raw.destination || '',
              departureDate: r.departure_date
                ? (typeof r.departure_date === 'string' ? r.departure_date.slice(0, 10) : new Date(r.departure_date).toISOString().slice(0, 10))
                : (raw.departureDate || ''),
              isFlexibleDate: Boolean(r.is_flexible_date ?? raw.isFlexibleDate),
              duration: r.duration || raw.duration || '7 jours',
              adultsCount: Number(r.adults_count ?? raw.adultsCount ?? 2),
              childrenCount: Number(r.children_count ?? raw.childrenCount ?? 0),
              childrenAges: r.children_ages ?? raw.childrenAges ?? '',
              budgetPerPerson: r.budget_per_person || raw.budgetPerPerson || '',
              cabinClass: r.cabin_class ?? raw.cabinClass ?? '',
              hotelCategory: r.hotel_category ?? raw.hotelCategory ?? '',
              flightClass: r.flight_class ?? raw.flightClass ?? '',
              cruiseCabinType: r.cruise_cabin_type ?? raw.cruiseCabinType,
              cruiseLine: r.cruise_line ?? raw.cruiseLine,
              competitorUrl: r.competitor_url ?? raw.competitorUrl,
              competitorTargetPrice: r.competitor_target_price ?? raw.competitorTargetPrice,
              customerFirstName: r.customer_first_name || raw.customerFirstName || '',
              customerLastName: r.customer_last_name || raw.customerLastName || '',
              customerEmail: r.customer_email || raw.customerEmail || '',
              customerPhone: r.customer_phone || raw.customerPhone || '',
              preferredCallTime: (r.preferred_call_time || raw.preferredCallTime || 'tout_temps') as any,
              customerNotes: r.customer_notes ?? raw.customerNotes ?? '',
              callStatus: (r.call_status || raw.callStatus || 'a_appeler') as any,
              callAttempts: Number(r.call_attempts ?? raw.callAttempts ?? 0),
              assignedToUserId: r.assigned_to_user_id ?? raw.assignedToUserId ?? undefined,
              assignedToUserName: r.assigned_to_user_name ?? raw.assignedToUserName ?? undefined,
              tags: parseJsonSafe<string[]>(r.tags_json, raw.tags || []),
              proposals: parseJsonSafe<any[]>(r.proposals_json, raw.proposals || undefined),
              proposalsSentAt: r.proposals_sent_at ? new Date(r.proposals_sent_at).toISOString() : raw.proposalsSentAt,
              proposalsSentBy: r.proposals_sent_by ?? raw.proposalsSentBy,
              proposalsSentToEmail: r.proposals_sent_to_email ?? raw.proposalsSentToEmail,
              notes: dbNotes && dbNotes.length > 0 ? dbNotes : (raw.notes || []),
              emailCustomerSent: Boolean(r.email_customer_sent ?? raw.emailCustomerSent ?? true),
              emailCustomerSender: raw.emailCustomerSender || 'ne_pas_repondre@evasionsoleil.com',
              emailAgencySent: Boolean(r.email_agency_sent ?? raw.emailAgencySent ?? true),
              emailAgencyRecipient: raw.emailAgencyRecipient || 'info@evasionsoleil.com',
              createdAt: r.created_at ? new Date(r.created_at).toISOString() : (raw.createdAt || new Date().toISOString()),
              updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : (raw.updatedAt || new Date().toISOString()),
            } as QuoteSubmission;
          });
        }
      } catch (e: any) {
        console.warn('[MySQL Load] submissions warning:', e.message);
      }

      // 7. Load Newsletter Subscribers & Campaigns
      try {
        const [subscrRows]: any = await this.pool.query('SELECT * FROM `newsletter_subscribers` ORDER BY `subscribed_at` DESC');
        if (Array.isArray(subscrRows)) {
          this.db.newsletterSubscribers = subscrRows.map((r: any) => {
            const raw = parseJsonSafe<Partial<NewsletterSubscriber>>(r.raw_data_json, {});
            return {
              ...raw,
              id: r.id,
              email: r.email,
              firstName: r.first_name || raw.firstName || '',
              lastName: r.last_name || raw.lastName || '',
              status: (r.status || raw.status || 'active') as any,
              preferences: parseJsonSafe(r.preferences_json, raw.preferences || {
                offersExclusive: true,
                lastMinuteAlerts: true,
                cruisesSpecials: true,
                sunDestinations: true,
                frequency: 'weekly',
              }),
              source: (r.source || raw.source || 'website_footer') as any,
              token: r.token || raw.token || `tok_${r.id}`,
              subscribedAt: r.subscribed_at ? new Date(r.subscribed_at).toISOString() : (raw.subscribedAt || new Date().toISOString()),
              unsubscribedAt: r.unsubscribed_at ? new Date(r.unsubscribed_at).toISOString() : raw.unsubscribedAt,
            };
          });
        }
        const [campRows]: any = await this.pool.query('SELECT * FROM `newsletter_campaigns` ORDER BY `sent_at` DESC');
        if (Array.isArray(campRows)) {
          this.db.newsletterCampaigns = campRows.map((r: any) => {
            const raw = parseJsonSafe<Partial<NewsletterCampaign>>(r.raw_data_json, {});
            return {
              ...raw,
              id: r.id,
              subject: r.subject,
              previewText: r.preview_text || raw.previewText || '',
              content: r.content || raw.content || '',
              category: (r.category || raw.category || 'all') as any,
              targetAudience: (r.target_audience || raw.targetAudience || 'all_clients_and_subscribers') as any,
              sentByUserId: r.sent_by_user_id || raw.sentByUserId || '',
              sentByUserName: r.sent_by_user_name || raw.sentByUserName || '',
              recipientsCount: Number(r.recipient_count ?? raw.recipientsCount ?? 0),
              status: (r.status || raw.status || 'sent') as any,
              sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : (raw.sentAt || new Date().toISOString()),
            } as NewsletterCampaign;
          });
        }
      } catch (e: any) {
        console.warn('[MySQL Load] newsletter warning:', e.message);
      }

      // 8. Load Chat Conversations & Messages
      try {
        const [convRows]: any = await this.pool.query('SELECT * FROM `chat_conversations` ORDER BY `updated_at` DESC');
        const [msgRows]: any = await this.pool.query('SELECT * FROM `chat_messages` ORDER BY `created_at` ASC');
        const msgsByConv = new Map<string, ChatMessage[]>();
        if (Array.isArray(msgRows)) {
          for (const mr of msgRows) {
            const list = msgsByConv.get(mr.conversation_id) || [];
            list.push({
              id: mr.id,
              conversationId: mr.conversation_id,
              sender: mr.sender,
              senderName: mr.sender_name,
              senderTag: mr.sender_tag || undefined,
              senderGrade: mr.sender_grade || undefined,
              text: mr.text,
              isAgentHandoff: Boolean(mr.is_agent_handoff),
              visitorInfo: mr.visitor_info_json ? parseJsonSafe(mr.visitor_info_json, undefined) : undefined,
              timestamp: mr.created_at ? new Date(mr.created_at).toISOString() : new Date().toISOString(),
            });
            msgsByConv.set(mr.conversation_id, list);
          }
        }
        if (Array.isArray(convRows)) {
          this.db.conversations = convRows.map((r: any) => {
            const raw = parseJsonSafe<Partial<ChatConversation>>(r.raw_data_json, {});
            const dbMsgs = msgsByConv.get(r.id);
            return {
              ...raw,
              id: r.id,
              visitorName: r.visitor_name || raw.visitorName || 'Visiteur',
              visitorEmail: r.visitor_email || raw.visitorEmail || undefined,
              visitorPhone: r.visitor_phone || raw.visitorPhone || undefined,
              status: (r.status || raw.status || 'active') as any,
              unreadAgent: Boolean(r.unread_agent ?? raw.unreadAgent),
              createdAt: r.created_at ? new Date(r.created_at).toISOString() : (raw.createdAt || new Date().toISOString()),
              updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : (raw.updatedAt || new Date().toISOString()),
              messages: dbMsgs && dbMsgs.length > 0 ? dbMsgs : (raw.messages || []),
            } as ChatConversation;
          });
        }
      } catch (e: any) {
        console.warn('[MySQL Load] chat_conversations warning:', e.message);
      }

      // 9. Load Team Messages
      try {
        const [tmRows]: any = await this.pool.query('SELECT * FROM `team_messages` ORDER BY `created_at` ASC');
        if (Array.isArray(tmRows)) {
          this.db.teamMessages = tmRows.map((r: any) => {
            const raw = parseJsonSafe<Partial<TeamMessage>>(r.raw_data_json, {});
            return {
              ...raw,
              id: r.id,
              channelId: r.channel_id || raw.channelId || 'general',
              userId: r.user_id || raw.userId || '',
              userName: r.user_name || raw.userName || '',
              userAvatar: raw.userAvatar || '',
              userGrade: r.user_grade || raw.userGrade || '',
              userTag: r.user_tag || raw.userTag || '',
              userTagEnabled: Boolean(r.user_tag_enabled ?? raw.userTagEnabled ?? true),
              text: r.text || raw.text || '',
              attachments: parseJsonSafe(r.attachments_json, raw.attachments || []),
              createdAt: r.created_at ? new Date(r.created_at).toISOString() : (raw.createdAt || new Date().toISOString()),
            };
          });
        }
      } catch (e: any) {
        console.warn('[MySQL Load] team_messages warning:', e.message);
      }

      // 10. Load Push Notifications
      try {
        const [notifRows]: any = await this.pool.query('SELECT * FROM `push_notifications` ORDER BY `created_at` DESC LIMIT 50');
        if (Array.isArray(notifRows)) {
          this.db.notifications = notifRows.map((r: any) => {
            const raw = parseJsonSafe<Partial<PushNotificationItem>>(r.raw_data_json, {});
            return {
              ...raw,
              id: r.id,
              title: r.title,
              message: r.message,
              type: (r.type || raw.type || 'new_quote') as any,
              referenceId: r.reference_id || raw.referenceId || undefined,
              isRead: Boolean(r.is_read ?? raw.isRead),
              createdAt: r.created_at ? new Date(r.created_at).toISOString() : (raw.createdAt || new Date().toISOString()),
            };
          });
        }
      } catch (e: any) {
        console.warn('[MySQL Load] push_notifications warning:', e.message);
      }

      // 11. Load Password Reset Codes
      try {
        const [rcRows]: any = await this.pool.query('SELECT * FROM `password_reset_codes` ORDER BY `created_at` DESC');
        if (Array.isArray(rcRows)) {
          this.db.resetCodes = rcRows.map((r: any) => {
            const raw = parseJsonSafe<Partial<PasswordResetCode>>(r.raw_data_json, {});
            return {
              ...raw,
              id: r.id,
              email: r.email,
              code: r.code,
              token: r.token,
              expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : (raw.expiresAt || new Date().toISOString()),
              used: Boolean(r.is_used ?? raw.used),
              createdAt: r.created_at ? new Date(r.created_at).toISOString() : (raw.createdAt || new Date().toISOString()),
            };
          });
        }
      } catch (e: any) {
        console.warn('[MySQL Load] password_reset_codes warning:', e.message);
      }

      // 12. Load Legal Document Templates & Legal Documents
      try {
        const [tmplRows]: any = await this.pool.query('SELECT * FROM `legal_document_templates` ORDER BY `updated_at` DESC');
        if (Array.isArray(tmplRows) && tmplRows.length > 0) {
          this.db.legalDocumentTemplates = tmplRows.map((r: any) => {
            const raw = parseJsonSafe<Partial<LegalDocumentTemplate>>(r.raw_data_json, {});
            return {
              ...raw,
              id: r.id,
              title: r.title,
              category: (r.category || raw.category || 'contrat_voyage') as any,
              description: r.description || raw.description || '',
              defaultFileName: raw.defaultFileName || `${r.title}.pdf`,
              bodyTemplate: r.content || raw.bodyTemplate || '',
              headerSubtitle: raw.headerSubtitle || 'DOCUMENT OFFICIEL • PERMIS DU QUÉBEC (OPC #703492)',
              footerLegalNote: raw.footerLegalNote || 'Évasion Soleil • Titulaire d\'un permis d\'agence de voyages du Québec #703492',
              accentColor: raw.accentColor || '#338b84',
              lockedForAdvisors: Boolean(r.is_locked ?? raw.lockedForAdvisors ?? true),
              createdByUserName: raw.createdByUserName || 'Direction Évasion Soleil',
              updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : (raw.updatedAt || new Date().toISOString()),
            };
          });
        }
        const [docRows]: any = await this.pool.query('SELECT * FROM `legal_documents` ORDER BY `updated_at` DESC');
        if (Array.isArray(docRows)) {
          this.db.legalDocuments = docRows.map((r: any) => {
            const raw = parseJsonSafe<Partial<LegalDocument>>(r.raw_data_json || r.doc_data_json, {});
            return {
              ...raw,
              id: r.id,
              clientKey: r.client_key || raw.clientKey || '',
              clientName: r.client_name || raw.clientName || '',
              clientEmail: r.client_email || raw.clientEmail || '',
              title: r.title || raw.title || '',
              category: (r.category || raw.category || 'contrat_voyage') as any,
              status: (r.status || raw.status || 'brouillon') as any,
              contentSummary: raw.contentSummary || '',
              documentBodyHtml: r.content || raw.documentBodyHtml || '',
              fileAttachmentBase64: r.pdf_base64 || raw.fileAttachmentBase64,
              fileAttachmentName: r.pdf_file_name || raw.fileAttachmentName,
              signedAt: r.signed_at ? new Date(r.signed_at).toISOString() : raw.signedAt,
              signatureSignerName: r.signer_name || raw.signatureSignerName,
              signedByIp: r.signer_ip || raw.signedByIp,
              signatureDataUrl: r.signature_data_url || raw.signatureDataUrl,
              createdAt: r.created_at ? new Date(r.created_at).toISOString() : (raw.createdAt || new Date().toISOString()),
              updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : (raw.updatedAt || new Date().toISOString()),
            } as LegalDocument;
          });
        }
      } catch (e: any) {
        console.warn('[MySQL Load] legal_documents warning:', e.message);
      }

      // 13. Load Invoices
      try {
        const [invRows]: any = await this.pool.query('SELECT * FROM `invoices` ORDER BY `created_at` DESC');
        if (Array.isArray(invRows)) {
          this.db.invoices = invRows.map((r: any) => {
            const raw = parseJsonSafe<Partial<Invoice>>(r.raw_data_json, {});
            return {
              ...raw,
              id: r.id,
              invoiceNumber: r.invoice_number || raw.invoiceNumber || '',
              clientKey: r.client_key || raw.clientKey || '',
              clientName: r.client_name || raw.clientName || '',
              clientEmail: r.client_email || raw.clientEmail || '',
              clientPhone: r.client_phone || raw.clientPhone || '',
              submissionId: r.submission_id || raw.submissionId,
              submissionRef: r.submission_ref || raw.submissionRef,
              destination: r.destination || raw.destination,
              items: raw.items || [],
              subtotal: Number(r.subtotal ?? raw.subtotal ?? 0),
              taxRateTPS: raw.taxRateTPS ?? 0,
              taxRateTVQ: raw.taxRateTVQ ?? 0,
              taxTPS: raw.taxTPS ?? 0,
              taxTVQ: raw.taxTVQ ?? 0,
              taxExempt: Boolean(raw.taxExempt ?? true),
              total: Number(r.total ?? raw.total ?? 0),
              currency: 'CAD',
              status: (r.status || raw.status || 'en_attente') as any,
              paymentMethod: (r.payment_method || raw.paymentMethod || 'stripe') as any,
              dueDate: r.due_date || raw.dueDate || '',
              paidAt: r.paid_at || raw.paidAt,
              createdByUserId: r.created_by_user_id || raw.createdByUserId || 'usr_sysadmin',
              createdByUserName: r.created_by_user_name || raw.createdByUserName || 'Conseiller Évasion Soleil',
              createdAt: r.created_at ? new Date(r.created_at).toISOString() : (raw.createdAt || new Date().toISOString()),
            } as Invoice;
          });
        }
      } catch (e: any) {
        console.warn('[MySQL Load] invoices warning:', e.message);
      }

      console.log(`[MySQL Load] Restauration complète effectuée depuis MySQL (${this.db.users.length} utilisateurs, ${this.db.submissions.length} soumissions, ${(this.db.invoices || []).length} factures, ${(this.db.legalDocuments || []).length} documents légaux).`);
      return true;
    } catch (err: any) {
      console.error('[MySQL loadAllFromMySQL Error]:', err.message);
      return false;
    }
  }

  public addUser(newUser: Omit<User, 'id'>): User {
    const rawUsername = newUser.username || newUser.email.split('@')[0];
    const cleanUsername = rawUsername.trim().toLowerCase();
    const user: User = {
      ...newUser,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      password: newUser.password && newUser.password.trim() ? newUser.password.trim() : 'soleil2026',
    };
    
    // Check if user with same username or email already exists to update instead of duplicating
    const existingIdx = this.db.users.findIndex(
      (u) => u.username?.toLowerCase() === cleanUsername || (u.email && u.email.toLowerCase() === user.email.toLowerCase())
    );
    if (existingIdx >= 0) {
      this.db.users[existingIdx] = { ...this.db.users[existingIdx], ...user };
    } else {
      this.db.users.push(user);
    }
    this.saveToJson();
    console.log(`[Database] Utilisateur enregistré avec succès: ${user.name} (@${user.username}), total=${this.db.users.length}`);

    // Synchronisation immédiate vers MySQL
    this.syncUserToMySQL(user).catch((err: any) => console.error('[MySQL] Sync addUser error:', err.message));

    return user;
  }

  public deleteUser(id: string): boolean {
    const initialLen = this.db.users.length;
    this.db.users = this.db.users.filter((u) => u.id !== id);
    if (this.db.users.length !== initialLen) {
      this.saveToJson();
      console.log(`[Database] Utilisateur supprimé: id=${id}, total restant=${this.db.users.length}`);
      if (this.pool) {
        this.pool
          .execute(`DELETE FROM users WHERE id = ?`, [id])
          .catch((err: any) => console.error('[MySQL] Sync deleteUser error:', err.message));
      }
      return true;
    }
    return false;
  }

  public updateUser(user: User): User {
    let idx = this.db.users.findIndex((u) => u.id === user.id);
    if (idx < 0 && user.username) {
      idx = this.db.users.findIndex((u) => u.username?.toLowerCase() === user.username?.toLowerCase());
    }
    if (idx < 0 && user.email) {
      idx = this.db.users.findIndex((u) => u.email?.toLowerCase() === user.email?.toLowerCase());
    }

    if (idx >= 0) {
      const existing = this.db.users[idx];
      const mergedPermissions = {
        ...(existing.permissions || {}),
        ...(user.permissions || {}),
      };
      this.db.users[idx] = {
        ...existing,
        ...user,
        id: existing.id || user.id,
        permissions: mergedPermissions,
      };
      user = this.db.users[idx];
    } else {
      if (!user.id) {
        user.id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      }
      this.db.users.push(user);
    }
    this.saveToJson();
    console.log(`[Database] Utilisateur mis à jour: ${user.name} (@${user.username})`);

    // Synchronisation immédiate vers MySQL
    this.syncUserToMySQL(user).catch((err: any) => console.error('[MySQL] Sync updateUser error:', err.message));

    return user;
  }

  public updateUserStatus(userId: string, status: 'disponible' | 'indisponible'): User | null {
    const cleanId = (userId || '').trim();
    const user = this.db.users.find((u) =>
      u.id === cleanId ||
      u.username?.toLowerCase() === cleanId.toLowerCase() ||
      u.email?.toLowerCase() === cleanId.toLowerCase() ||
      ((cleanId === 'usr_sysadmin' || cleanId === 'usr_admin' || cleanId === 'admin') && (u.id === 'usr_sysadmin' || u.username === 'admin'))
    );
    if (!user) {
      console.warn(`[Agents Status] Utilisateur non trouvé pour l'ID: ${userId}`);
      return null;
    }
    user.status = status;
    this.saveToJson();
    this.syncUserToMySQL(user).catch((err: any) => console.error('[MySQL] Sync updateUserStatus error:', err.message));
    console.log(`[Agents Status] ${user.name} (@${user.username}) est maintenant [${status}]`);
    return user;
  }

  public getAgentsAvailability(): {
    totalAgents: number;
    availableAgents: number;
    status: 'disponible' | 'indisponible';
    availableList: Array<{ id: string; name: string; avatar: string; grade: string; status: 'disponible' | 'indisponible' }>;
    allAgents: User[];
  } {
    const staff = this.db.users || [];
    const available = staff.filter((u) => u.status !== 'indisponible');
    const isAnyAvailable = available.length > 0;
    return {
      totalAgents: staff.length,
      availableAgents: available.length,
      status: isAnyAvailable ? 'disponible' : 'indisponible',
      availableList: staff.map((u) => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar || '',
        grade: u.grade || '',
        status: (u.status === 'indisponible' ? 'indisponible' : 'disponible') as 'disponible' | 'indisponible',
      })),
      allAgents: staff,
    };
  }

  // Chatbot Settings
  public getChatbotSettings(): ChatbotSettings {
    return this.db.chatbotSettings;
  }

  public updateChatbotSettings(settings: Partial<ChatbotSettings>): ChatbotSettings {
    this.db.chatbotSettings = { ...this.db.chatbotSettings, ...settings };
    this.saveToJson();
    this.syncChatbotSettingsToMySQL(this.db.chatbotSettings).catch((err: any) => console.error('[MySQL] Sync chatbot_settings error:', err.message));
    return this.db.chatbotSettings;
  }

  // Form Config
  public getFormConfig(): FormConfig {
    return this.db.formConfig;
  }

  public updateFormConfig(config: Partial<FormConfig>): FormConfig {
    this.db.formConfig = { ...this.db.formConfig, ...config };
    this.saveToJson();
    this.syncFormConfigToMySQL(this.db.formConfig).catch((err: any) => console.error('[MySQL] Sync form_config error:', err.message));
    return this.db.formConfig;
  }

  // System Roles Management
  public getSystemRoles(): SystemRole[] {
    return this.db.systemRoles && this.db.systemRoles.length > 0 ? this.db.systemRoles : initialSystemRoles;
  }

  public addSystemRole(newRole: Omit<SystemRole, 'id'>): SystemRole {
    const role: SystemRole = {
      ...newRole,
      id: `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    if (!Array.isArray(this.db.systemRoles)) {
      this.db.systemRoles = [...initialSystemRoles];
    }
    this.db.systemRoles.push(role);
    this.saveToJson();
    this.syncSystemRoleToMySQL(role).catch((err: any) => console.error('[MySQL] Sync addSystemRole error:', err.message));
    return role;
  }

  public updateSystemRole(role: SystemRole): SystemRole {
    if (!Array.isArray(this.db.systemRoles)) {
      this.db.systemRoles = [...initialSystemRoles];
    }
    const idx = this.db.systemRoles.findIndex((r) => r.id === role.id);
    if (idx >= 0) {
      this.db.systemRoles[idx] = { ...this.db.systemRoles[idx], ...role };
    } else {
      this.db.systemRoles.push(role);
    }
    this.saveToJson();
    this.syncSystemRoleToMySQL(role).catch((err: any) => console.error('[MySQL] Sync updateSystemRole error:', err.message));
    return role;
  }

  public deleteSystemRole(id: string): boolean {
    if (!Array.isArray(this.db.systemRoles)) return false;
    const prevLen = this.db.systemRoles.length;
    this.db.systemRoles = this.db.systemRoles.filter((r) => r.id !== id);
    if (this.db.systemRoles.length !== prevLen) {
      this.saveToJson();
      if (this.pool) {
        this.pool.execute(`DELETE FROM system_roles WHERE id = ?`, [id]).catch((e: any) => console.error('[MySQL] Delete system_role error:', e.message));
      }
      return true;
    }
    return false;
  }

  // Submissions
  public getSubmissions(filterCallStatus?: string): QuoteSubmission[] {
    if (!filterCallStatus || filterCallStatus === 'all') {
      return this.db.submissions;
    }
    return this.db.submissions.filter((s) => s.callStatus === filterCallStatus);
  }

  public getSubmissionById(id: string): QuoteSubmission | undefined {
    return this.db.submissions.find((s) => s.id === id);
  }

  public createSubmission(submissionData: Omit<QuoteSubmission, 'id' | 'referenceNumber' | 'createdAt' | 'updatedAt' | 'callAttempts' | 'notes' | 'emailCustomerSent' | 'emailAgencySent'>): QuoteSubmission {
    const count = this.db.submissions.length + 813;
    const referenceNumber = `ES-2026-${String(count).padStart(4, '0')}`;
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const effectiveCabinClass =
      submissionData.cabinClass ||
      (submissionData as any).allInclusiveFlightClass ||
      (submissionData as any).volHotelFlightClass ||
      submissionData.flightClass ||
      '';

    const newSubmission: QuoteSubmission = {
      ...submissionData,
      id,
      referenceNumber,
      cabinClass: effectiveCabinClass,
      allInclusiveFlightClass: (submissionData as any).allInclusiveFlightClass,
      volHotelFlightClass: (submissionData as any).volHotelFlightClass,
      volHotelHotelCategory: (submissionData as any).volHotelHotelCategory,
      callStatus: submissionData.callStatus || 'a_appeler',
      callAttempts: 0,
      notes: [],
      emailCustomerSent: true,
      emailCustomerSender: 'ne_pas_repondre@evasionsoleil.com',
      emailAgencySent: true,
      emailAgencyRecipient: 'info@evasionsoleil.com',
      createdAt: now,
      updatedAt: now,
    };

    console.log(`[Email / Envoi Client Automatique] De: ne_pas_repondre@evasionsoleil.com -> À: ${newSubmission.customerEmail} (Réf: ${referenceNumber}) - Accusé de réception officiel pour le voyage vers ${newSubmission.destination}`);
    console.log(`[Email / Notification Équipe Agence] De: ne_pas_repondre@evasionsoleil.com -> À: info@evasionsoleil.com (Réf: ${referenceNumber}) - Nouvelle demande de ${newSubmission.customerFirstName} ${newSubmission.customerLastName} (${newSubmission.customerPhone})`);

    this.db.submissions.unshift(newSubmission);

    // Create push notification
    this.createNotification({
      title: 'Nouvelle soumission de devis !',
      message: `${newSubmission.customerFirstName} ${newSubmission.customerLastName} (${newSubmission.destination}, ${newSubmission.serviceType})`,
      type: 'new_quote',
      referenceId: newSubmission.id,
    });

    this.saveToJson();

    // Synchronisation immédiate vers MySQL
    this.syncSubmissionToMySQL(newSubmission).catch((err: any) => console.error('[MySQL] Sync createSubmission error:', err.message));

    return newSubmission;
  }

  public updateSubmissionStatus(id: string, callStatus: CallStatus, agentNote?: { authorName?: string; authorGrade?: string; text: string }): QuoteSubmission | undefined {
    const sub = this.db.submissions.find((s) => s.id === id);
    if (!sub) return undefined;

    if (callStatus) {
      sub.callStatus = callStatus;
      if (typeof callStatus === 'string' && callStatus.startsWith('appele')) {
        sub.callAttempts = (sub.callAttempts || 0) + 1;
      }
    }
    if (!Array.isArray(sub.notes)) {
      sub.notes = [];
    }
    if (agentNote && typeof agentNote.text === 'string' && agentNote.text.trim()) {
      sub.notes.push({
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        authorName: agentNote.authorName || 'Conseiller',
        authorGrade: agentNote.authorGrade || 'Agent',
        text: agentNote.text.trim(),
        createdAt: new Date().toISOString(),
      });
    }
    sub.updatedAt = new Date().toISOString();
    this.saveToJson();

    // Synchronisation immédiate vers MySQL
    this.syncSubmissionToMySQL(sub).catch((err: any) => console.error('[MySQL] Sync updateSubmissionStatus error:', err.message));

    return sub;
  }

  public addSubmissionNote(id: string, authorName: string, authorGrade: string, text: string): QuoteSubmission | undefined {
    const sub = this.db.submissions.find((s) => s.id === id);
    if (!sub) return undefined;

    sub.notes.push({
      id: `note_${Date.now()}`,
      authorName,
      authorGrade,
      text,
      createdAt: new Date().toISOString(),
    });
    sub.updatedAt = new Date().toISOString();
    this.saveToJson();

    // Synchronisation immédiate vers MySQL
    this.syncSubmissionToMySQL(sub).catch((err: any) => console.error('[MySQL] Sync addSubmissionNote error:', err.message));

    return sub;
  }

  public updateSubmissionTags(id: string, tags: string[]): QuoteSubmission | undefined {
    const sub = this.db.submissions.find((s) => s.id === id);
    if (!sub) return undefined;

    sub.tags = tags;
    sub.updatedAt = new Date().toISOString();

    // Propagate VIP and Blacklist tags to all submissions of the same client so CRM & Pipeline stay in sync
    const hasVip = tags.some((t) => t.toUpperCase().includes('VIP'));
    const hasBlacklist = tags.some((t) => t.toUpperCase().includes('BLACK') || t.toUpperCase().includes('NOIRE'));
    const targetEmail = (sub.customerEmail || '').trim().toLowerCase();
    const targetPhone = (sub.customerPhone || '').replace(/\D/g, '');

    if (targetEmail || targetPhone) {
      this.db.submissions.forEach((other) => {
        if (other.id === sub.id) return;
        const otherEmail = (other.customerEmail || '').trim().toLowerCase();
        const otherPhone = (other.customerPhone || '').replace(/\D/g, '');
        const sameClient =
          (targetEmail && otherEmail === targetEmail) ||
          (targetPhone && targetPhone.length >= 7 && otherPhone === targetPhone);
        if (sameClient) {
          let otherTags = (other.tags || []).filter(
            (t) => !t.toUpperCase().includes('VIP') && !t.toUpperCase().includes('BLACK') && !t.toUpperCase().includes('NOIRE')
          );
          if (hasBlacklist) otherTags = ['Blacklist', ...otherTags];
          if (hasVip) otherTags = ['VIP', ...otherTags];
          other.tags = otherTags;
          other.updatedAt = new Date().toISOString();
          this.syncSubmissionToMySQL(other).catch(() => {});
        }
      });
    }

    this.saveToJson();

    // Synchronisation immédiate vers MySQL
    this.syncSubmissionToMySQL(sub).catch((err: any) => console.error('[MySQL] Sync updateSubmissionTags error:', err.message));

    return sub;
  }

  public recordSubmissionProposals(
    id: string,
    proposals: any[],
    sentBy: string,
    sentToEmail: string
  ): QuoteSubmission | undefined {
    const sub = this.db.submissions.find((s) => s.id === id);
    if (!sub) return undefined;

    const count = Array.isArray(proposals) ? proposals.length : 1;
    sub.proposals = proposals;
    sub.proposalsSentAt = new Date().toISOString();
    sub.proposalsSentBy = sentBy;
    sub.proposalsSentToEmail = sentToEmail;
    sub.callStatus = 'devis_envoye';
    sub.updatedAt = new Date().toISOString();

    if (!Array.isArray(sub.notes)) {
      sub.notes = [];
    }
    sub.notes.push({
      id: `note_prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      authorName: sentBy,
      authorGrade: 'Conseiller Voyages',
      text: `☀️ ${count} offre(s) / proposition(s) de soumission envoyée(s) par courriel à ${sentToEmail} et archivée(s) à info@evasionsoleil.com. Statut mis à jour : Devis Envoyé.`,
      createdAt: new Date().toISOString(),
    });

    this.saveToJson();

    // Synchronisation immédiate vers MySQL
    this.syncSubmissionToMySQL(sub).catch((err: any) => console.error('[MySQL] Sync recordSubmissionProposals error:', err.message));

    return sub;
  }

  public selectSubmissionProposal(
    id: string,
    proposalId: string | null,
    chosenBy: string,
    notes?: string,
    autoSetReserved?: boolean
  ): QuoteSubmission | undefined {
    const sub = this.db.submissions.find((s) => s.id === id);
    if (!sub) return undefined;

    if (!Array.isArray(sub.notes)) {
      sub.notes = [];
    }

    if (!proposalId) {
      const prevTitle = sub.selectedProposalTitle || 'Option précédente';
      sub.selectedProposalId = undefined;
      sub.selectedProposalTitle = undefined;
      sub.selectedProposalHotel = undefined;
      sub.selectedProposalPrice = undefined;
      sub.selectedProposalChosenAt = undefined;
      sub.selectedProposalChosenBy = undefined;
      sub.selectedProposalNotes = undefined;
      sub.updatedAt = new Date().toISOString();

      sub.notes.push({
        id: `note_unselect_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        authorName: chosenBy,
        authorGrade: 'Conseiller Voyages',
        text: `🔄 Annulation du choix d'option (${prevTitle}). Le dossier est de nouveau en attente de la décision du client.`,
        createdAt: new Date().toISOString(),
      });

      this.saveToJson();
      this.syncSubmissionToMySQL(sub).catch((err: any) => console.error('[MySQL] Sync selectSubmissionProposal unselect error:', err.message));
      return sub;
    }

    const prop = (sub.proposals || []).find((p: any) => p.id === proposalId);
    const title = prop?.title || `Option (${proposalId})`;
    const hotel = prop?.hotelOrCruiseName || 'Établissement / Forfait';
    const price = prop?.pricePerPerson || prop?.totalPrice || '';

    sub.selectedProposalId = proposalId;
    sub.selectedProposalTitle = title;
    sub.selectedProposalHotel = hotel;
    sub.selectedProposalPrice = price;
    sub.selectedProposalChosenAt = new Date().toISOString();
    sub.selectedProposalChosenBy = chosenBy;
    sub.selectedProposalNotes = notes || undefined;

    if (autoSetReserved) {
      sub.callStatus = 'reserve';
    }

    sub.updatedAt = new Date().toISOString();

    sub.notes.push({
      id: `note_select_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      authorName: chosenBy,
      authorGrade: 'Conseiller Voyages',
      text: `🎯 Option retenue par le client : ${title} — ${hotel} (${price})${notes ? ' | Précisions : ' + notes : ''}${autoSetReserved ? ' → Dossier marqué comme VOYAGE RÉSERVÉ 🎉' : ''}.`,
      createdAt: new Date().toISOString(),
    });

    this.saveToJson();
    this.syncSubmissionToMySQL(sub).catch((err: any) => console.error('[MySQL] Sync selectSubmissionProposal select error:', err.message));
    return sub;
  }

  public assignSubmission(
    id: string,
    assignedToUserId?: string,
    assignedToUserName?: string,
    noteText?: string
  ): QuoteSubmission | undefined {
    const sub = this.db.submissions.find((s) => s.id === id);
    if (!sub) return undefined;

    sub.assignedToUserId = assignedToUserId || undefined;
    sub.assignedToUserName = assignedToUserName || undefined;
    
    if (noteText && noteText.trim()) {
      if (!Array.isArray(sub.notes)) {
        sub.notes = [];
      }
      sub.notes.push({
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        authorName: assignedToUserName || 'Système',
        authorGrade: 'Prise en charge du dossier',
        text: noteText.trim(),
        createdAt: new Date().toISOString(),
      });
    }

    sub.updatedAt = new Date().toISOString();
    this.saveToJson();
    console.log(`[Pipeline] Dossier ${sub.referenceNumber} assigné à ${assignedToUserName || 'Non assigné'}`);

    // Synchronisation immédiate vers MySQL
    this.syncSubmissionToMySQL(sub).catch((err: any) => console.error('[MySQL] Sync assignSubmission error:', err.message));

    return sub;
  }

  public deleteSubmission(id: string): boolean {
    const prevLen = this.db.submissions.length;
    this.db.submissions = this.db.submissions.filter((s) => s.id !== id);
    if (this.db.submissions.length !== prevLen) {
      this.saveToJson();
      if (this.pool) {
        this.pool.execute(`DELETE FROM submissions WHERE id = ?`, [id]).catch((e: any) => console.error('[MySQL] Delete submission error:', e.message));
      }
      return true;
    }
    return false;
  }

  // Conversations
  public checkTimeouts(): void {
    const now = Date.now();
    for (const conv of this.db.conversations) {
      if (
        conv.status === 'waiting_agent' &&
        !conv.agentJoined &&
        !conv.timeoutIntervened &&
        conv.waitingSince
      ) {
        const waitTime = now - new Date(conv.waitingSince).getTime();
        if (waitTime > 35000) {
          this.triggerTimeoutIntervention(conv.id);
        }
      }
    }
  }

  public getConversations(): ChatConversation[] {
    this.checkTimeouts();
    return this.db.conversations;
  }

  public getConversationById(id: string): ChatConversation | undefined {
    this.checkTimeouts();
    const conv = this.db.conversations.find((c) => c.id === id);
    if (conv && conv.visitorIp) {
      const blocked = this.isIpBlocked(conv.visitorIp);
      conv.isBlocked = blocked;
      if (blocked) {
        conv.blockReason = this.getIpBlockReason(conv.visitorIp);
      } else {
        conv.blockReason = undefined;
      }
    }
    return conv;
  }

  public isIpBlocked(ip?: string): boolean {
    if (!ip) return false;
    const blocked = this.db.chatbotSettings.blockedIps || [];
    return blocked.includes(ip.trim());
  }

  public getIpBlockReason(ip?: string): string {
    if (!ip) return 'Non-respect des conditions d\'utilisation';
    const cleanIp = ip.trim();
    const reasons = this.db.chatbotSettings.blockedIpReasons || {};
    return reasons[cleanIp] || 'Non-respect des conditions d\'utilisation';
  }

  public blockIp(
    ip: string,
    block: boolean,
    reason?: string
  ): { success: boolean; blockedIps: string[]; blockedIpReasons: Record<string, string> } {
    const cleanIp = ip.trim();
    if (!this.db.chatbotSettings.blockedIps) {
      this.db.chatbotSettings.blockedIps = [];
    }
    if (!this.db.chatbotSettings.blockedIpReasons) {
      this.db.chatbotSettings.blockedIpReasons = {};
    }

    const effectiveReason = (reason || '').trim() || 'Non-respect des conditions d\'utilisation';

    if (block) {
      if (!this.db.chatbotSettings.blockedIps.includes(cleanIp)) {
        this.db.chatbotSettings.blockedIps.push(cleanIp);
      }
      this.db.chatbotSettings.blockedIpReasons[cleanIp] = effectiveReason;
    } else {
      this.db.chatbotSettings.blockedIps = this.db.chatbotSettings.blockedIps.filter(
        (item) => item !== cleanIp
      );
      delete this.db.chatbotSettings.blockedIpReasons[cleanIp];
    }

    // Update conversation states
    for (const conv of this.db.conversations) {
      if (conv.visitorIp === cleanIp) {
        conv.isBlocked = block;
        conv.blockReason = block ? effectiveReason : undefined;
        this.syncChatConversationToMySQL(conv).catch(() => {});
      }
    }

    this.saveToJson();
    this.syncChatbotSettingsToMySQL(this.db.chatbotSettings).catch(() => {});
    return {
      success: true,
      blockedIps: this.db.chatbotSettings.blockedIps,
      blockedIpReasons: this.db.chatbotSettings.blockedIpReasons,
    };
  }

  public createOrGetConversation(
    id?: string,
    visitorName?: string,
    visitorEmail?: string,
    visitorPhone?: string,
    visitorIp?: string
  ): ChatConversation {
    if (id) {
      const existing = this.db.conversations.find((c) => c.id === id);
      if (existing) {
        if (visitorName && existing.visitorName === 'Visiteur') existing.visitorName = visitorName;
        if (visitorPhone && !existing.visitorPhone) existing.visitorPhone = visitorPhone;
        if (visitorEmail && !existing.visitorEmail) existing.visitorEmail = visitorEmail;
        if (visitorIp && !existing.visitorIp) existing.visitorIp = visitorIp;
        if (existing.visitorIp) {
          existing.isBlocked = this.isIpBlocked(existing.visitorIp);
          existing.blockReason = existing.isBlocked ? this.getIpBlockReason(existing.visitorIp) : undefined;
        }
        return existing;
      }
    }
    const convId = id || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isBlocked = visitorIp ? this.isIpBlocked(visitorIp) : false;
    const blockReason = isBlocked && visitorIp ? this.getIpBlockReason(visitorIp) : undefined;
    const newConv: ChatConversation = {
      id: convId,
      visitorName: visitorName || 'Visiteur',
      visitorEmail,
      visitorPhone,
      visitorIp: visitorIp || '142.112.98.45',
      isBlocked,
      blockReason,
      status: 'active',
      unreadAgent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    this.db.conversations.unshift(newConv);
    this.saveToJson();
    this.syncChatConversationToMySQL(newConv).catch(() => {});
    return newConv;
  }

  public updateConversation(id: string, updates: Partial<ChatConversation>): ChatConversation | undefined {
    const conv = this.getConversationById(id);
    if (!conv) return undefined;
    Object.assign(conv, updates);
    conv.updatedAt = new Date().toISOString();
    this.saveToJson();
    this.syncChatConversationToMySQL(conv).catch(() => {});
    return conv;
  }

  public deleteConversation(id: string): boolean {
    const idx = this.db.conversations.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.db.conversations.splice(idx, 1);
    this.saveToJson();
    if (this.pool) {
      this.pool.execute(`DELETE FROM chat_conversations WHERE id = ?`, [id]).catch(() => {});
    }
    return true;
  }

  public agentJoinConversation(
    conversationId: string,
    agent: { id?: string; name: string; grade: string; tag?: string; avatar?: string }
  ): { conversation: ChatConversation; joinMessage: ChatMessage } {
    const conv = this.createOrGetConversation(conversationId);
    conv.agentJoined = {
      ...agent,
      joinedAt: new Date().toISOString(),
    };
    conv.status = 'active';
    conv.unreadAgent = false;
    conv.botEnabledForConv = false;

    const joinText = `👤 ${agent.name} (${agent.grade}${agent.tag ? ` • [${agent.tag}]` : ''}) a rejoint la conversation pour vous assister.`;
    const joinMsg: ChatMessage = {
      id: `msg_join_${Date.now()}`,
      conversationId,
      sender: 'agent',
      senderName: agent.name,
      senderGrade: agent.grade,
      senderTag: agent.tag,
      senderAvatar: agent.avatar,
      text: joinText,
      timestamp: new Date().toISOString(),
      isJoinNotice: true,
    };
    conv.messages.push(joinMsg);
    conv.updatedAt = joinMsg.timestamp;
    this.saveToJson();
    this.syncChatConversationToMySQL(conv).catch(() => {});

    return { conversation: conv, joinMessage: joinMsg };
  }

  public agentLeaveConversation(
    conversationId: string,
    agentName?: string
  ): { conversation: ChatConversation; leaveMessage: ChatMessage } {
    const conv = this.createOrGetConversation(conversationId);
    const prevAgent = conv.agentJoined;
    conv.agentJoined = undefined;
    conv.botEnabledForConv = true;
    conv.status = 'active';

    const leaveText = `👤 ${agentName || prevAgent?.name || 'Le conseiller'} a quitté la conversation. Martine V. reprend l'accueil automatique.`;
    const leaveMsg: ChatMessage = {
      id: `msg_leave_${Date.now()}`,
      conversationId,
      sender: 'bot',
      senderName: 'Martine V.',
      senderTag: 'BOT',
      text: leaveText,
      timestamp: new Date().toISOString(),
    };
    conv.messages.push(leaveMsg);
    conv.updatedAt = leaveMsg.timestamp;
    this.saveToJson();
    this.syncChatConversationToMySQL(conv).catch(() => {});

    return { conversation: conv, leaveMessage: leaveMsg };
  }

  public triggerTimeoutIntervention(conversationId: string): ChatMessage {
    const conv = this.createOrGetConversation(conversationId);
    conv.timeoutIntervened = true;
    const text = `Bonjour ${conv.visitorName !== 'Visiteur' ? conv.visitorName : ''} ! Nos conseillers sont actuellement très sollicités auprès d'autres voyageurs en ligne. Pour ne pas vous faire attendre inutilement, nous vous proposons deux solutions rapides :

👉 **Option 1 : Remplir notre formulaire de devis en ligne** (Garantie de proposition détaillée sous 4h)
👉 **Option 2 : Confirmer un rappel téléphonique prioritaire** (Un conseiller vous rappellera directement à votre numéro ${conv.visitorPhone || ''})`;

    const msg: ChatMessage = {
      id: `msg_timeout_${Date.now()}`,
      conversationId,
      sender: 'bot',
      senderName: 'Martine V.',
      senderTag: 'BOT',
      text,
      timestamp: new Date().toISOString(),
      isTimeoutIntervention: true,
    };
    conv.messages.push(msg);
    conv.updatedAt = msg.timestamp;
    this.saveToJson();
    this.syncChatConversationToMySQL(conv).catch(() => {});
    return msg;
  }

  public requestCallback(conversationId: string, phone?: string): ChatConversation {
    const conv = this.createOrGetConversation(conversationId);
    conv.callbackRequested = true;
    if (phone) conv.visitorPhone = phone;

    const confirmMsg: ChatMessage = {
      id: `msg_cb_${Date.now()}`,
      conversationId,
      sender: 'bot',
      senderName: 'Martine V.',
      senderTag: 'BOT',
      text: `Parfait ! Votre demande de rappel prioritaire a été transmise immédiatement à notre équipe. Un conseiller vous contactera par téléphone au ${conv.visitorPhone || phone || 'numéro fourni'} dès sa prochaine disponibilité.`,
      timestamp: new Date().toISOString(),
    };
    conv.messages.push(confirmMsg);
    conv.updatedAt = confirmMsg.timestamp;

    this.createNotification({
      title: '📞 Demande de rappel téléphonique prioritaire !',
      message: `${conv.visitorName} (${conv.visitorPhone || 'Tél'}) attend un appel pour planifier son voyage.`,
      type: 'agent_requested',
      referenceId: conv.id,
    });

    this.saveToJson();
    this.syncChatConversationToMySQL(conv).catch(() => {});
    return conv;
  }

  public addChatMessage(
    conversationId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp' | 'conversationId'>,
    visitorIp?: string
  ): ChatMessage {
    const conv = this.createOrGetConversation(conversationId, message.visitorInfo?.name, message.visitorInfo?.email, message.visitorInfo?.phone, visitorIp);
    const newMsg: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      conversationId,
      timestamp: new Date().toISOString(),
    };
    conv.messages.push(newMsg);
    conv.updatedAt = newMsg.timestamp;

    if (visitorIp && !conv.visitorIp) {
      conv.visitorIp = visitorIp;
    }

    if (message.sender === 'visitor') {
      conv.unreadAgent = true;
    } else {
      conv.unreadAgent = false;
    }

    if (message.isAgentHandoff) {
      conv.status = 'waiting_agent';
      conv.waitingSince = new Date().toISOString();
      this.createNotification({
        title: 'Un visiteur demande à parler à un conseiller !',
        message: `${conv.visitorName} (${conv.visitorPhone || 'Tél'}) souhaite être contacté au sujet de son voyage.`,
        type: 'agent_requested',
        referenceId: conv.id,
      });
    }

    this.saveToJson();
    this.syncChatConversationToMySQL(conv).catch(() => {});
    return newMsg;
  }

  // Team Messages
  public getTeamMessages(channelId = 'general'): TeamMessage[] {
    return this.db.teamMessages.filter((m) => m.channelId === channelId);
  }

  public addTeamMessage(messageData: Omit<TeamMessage, 'id' | 'createdAt'>): TeamMessage {
    const newMsg: TeamMessage = {
      ...messageData,
      id: `tmsg_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.db.teamMessages.push(newMsg);
    this.saveToJson();
    this.syncTeamMessageToMySQL(newMsg).catch(() => {});
    return newMsg;
  }

  // Notifications
  public getNotifications(): PushNotificationItem[] {
    return this.db.notifications;
  }

  public createNotification(item: Omit<PushNotificationItem, 'id' | 'createdAt' | 'isRead'>): PushNotificationItem {
    const notif: PushNotificationItem = {
      ...item,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.db.notifications.unshift(notif);
    if (this.db.notifications.length > 50) {
      this.db.notifications = this.db.notifications.slice(0, 50);
    }
    this.saveToJson();
    this.syncPushNotificationToMySQL(notif).catch(() => {});
    return notif;
  }

  public markNotificationAsRead(id: string): void {
    const notif = this.db.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.saveToJson();
      this.syncPushNotificationToMySQL(notif).catch(() => {});
    }
  }

  public markAllNotificationsAsRead(): void {
    this.db.notifications.forEach((n) => {
      n.isRead = true;
      n.read = true;
    });
    this.saveToJson();
    if (this.pool) {
      this.pool.query('UPDATE `push_notifications` SET `is_read` = 1').catch(() => {});
    }
  }

  public clearNotifications(): void {
    this.db.notifications = [];
    this.saveToJson();
    if (this.pool) {
      this.pool.query('DELETE FROM `push_notifications`').catch(() => {});
    }
  }

  public deleteNotification(id: string): void {
    this.db.notifications = this.db.notifications.filter((n) => n.id !== id);
    this.saveToJson();
    if (this.pool) {
      this.pool.execute('DELETE FROM `push_notifications` WHERE `id` = ?', [id]).catch(() => {});
    }
  }

  public clearTeamMessages(): void {
    this.db.teamMessages = [];
    this.saveToJson();
    if (this.pool) {
      this.pool.query('DELETE FROM `team_messages`').catch(() => {});
    }
  }

  // CRM Client Directory & Notes
  public getClientNotes(clientId: string): ClientNote[] {
    return (this.db.clientNotes || []).filter((n) => n.clientId === clientId);
  }

  public addClientNote(clientId: string, authorName: string, authorGrade: string, text: string): ClientNote {
    if (!this.db.clientNotes) {
      this.db.clientNotes = [];
    }
    const newNote: ClientNote = {
      id: `cnote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      clientId,
      authorName,
      authorGrade,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    this.db.clientNotes.unshift(newNote);
    this.saveToJson();
    this.syncCrmClientNoteToMySQL(newNote).catch(() => {});
    return newNote;
  }

  public mergeClientDossiers(
    primaryKey: string,
    secondaryKey: string,
    targetInfo?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    },
    caller?: { name?: string; grade?: string; userId?: string }
  ): { success: boolean; mergedCount: number; message: string; updatedSubmissions: QuoteSubmission[] } {
    const clients = this.getCrmClients();
    const matchClient = (key: string) => {
      const clean = key.trim().toLowerCase();
      const rawDigits = key.replace(/\D/g, '');
      return clients.find((c) => 
        c.id === key ||
        c.id.toLowerCase() === clean ||
        (c.email && c.email.toLowerCase() === clean) ||
        (rawDigits.length >= 7 && c.phone && c.phone.replace(/\D/g, '').includes(rawDigits)) ||
        c.fullName.toLowerCase() === clean
      );
    };

    const primary = matchClient(primaryKey);
    const secondary = matchClient(secondaryKey);

    if (!primary || !secondary) {
      return {
        success: false,
        mergedCount: 0,
        message: 'L\'un des dossiers clients spécifiés est introuvable pour le jumelage.',
        updatedSubmissions: this.db.submissions,
      };
    }

    if (primary.id === secondary.id) {
      return {
        success: false,
        mergedCount: 0,
        message: 'Impossible de jumeler un dossier client avec lui-même.',
        updatedSubmissions: this.db.submissions,
      };
    }

    const unifiedFirstName = targetInfo?.firstName || primary.firstName || secondary.firstName;
    const unifiedLastName = targetInfo?.lastName || primary.lastName || secondary.lastName;
    const unifiedEmail = targetInfo?.email || primary.email || secondary.email;
    const unifiedPhone = targetInfo?.phone || primary.phone || secondary.phone;

    let mergedCount = 0;
    const now = new Date().toISOString();

    const secondarySubIds = new Set(secondary.submissions.map((s) => s.id));

    this.db.submissions.forEach((sub) => {
      if (secondarySubIds.has(sub.id)) {
        sub.customerFirstName = unifiedFirstName;
        sub.customerLastName = unifiedLastName;
        sub.customerEmail = unifiedEmail;
        sub.customerPhone = unifiedPhone;
        sub.updatedAt = now;

        if (!Array.isArray(sub.notes)) {
          sub.notes = [];
        }
        sub.notes.push({
          id: `note_merge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          authorName: caller?.name || 'Système',
          authorGrade: caller?.grade || 'Administrateur',
          text: `[Dossier Jumelé] Rattaché à la fiche client unifiée de ${unifiedFirstName} ${unifiedLastName} (${unifiedEmail} - ${unifiedPhone}). Fusionné depuis la fiche précédente de ${secondary.fullName}.`,
          createdAt: now,
        });

        mergedCount++;
        this.syncSubmissionToMySQL(sub).catch(() => {});
      } else if (primary.submissions.some((s) => s.id === sub.id)) {
        if (targetInfo) {
          if (targetInfo.firstName) sub.customerFirstName = unifiedFirstName;
          if (targetInfo.lastName) sub.customerLastName = unifiedLastName;
          if (targetInfo.email) sub.customerEmail = unifiedEmail;
          if (targetInfo.phone) sub.customerPhone = unifiedPhone;
          sub.updatedAt = now;
          this.syncSubmissionToMySQL(sub).catch(() => {});
        }
      }
    });

    // Re-link client notes
    if (Array.isArray(this.db.clientNotes)) {
      this.db.clientNotes.forEach((cn) => {
        if (cn.clientId === secondary.id || cn.clientId === secondaryKey) {
          cn.clientId = primary.id;
        }
      });
    }

    // Add consolidation note to the primary client
    this.addClientNote(
      primary.id,
      caller?.name || 'Système',
      caller?.grade || 'Administrateur',
      `Jumelage de dossiers clients effectué le ${new Date().toLocaleDateString('fr-CA')} : Intégration complète de la fiche "${secondary.fullName}" (${secondary.email || 'Sans courriel'} - ${secondary.phone || 'Sans tél'}) avec ${secondary.submissions.length} soumission(s) transférée(s).`
    );

    this.saveToJson();

    console.log(`[CRM] Jumelage réussi : ${secondary.fullName} -> ${primary.fullName} (${mergedCount} soumissions regroupées)`);

    return {
      success: true,
      mergedCount,
      message: `${mergedCount} soumission(s) et l'historique complet de "${secondary.fullName}" ont été jumelés avec succès dans le dossier de "${unifiedFirstName} ${unifiedLastName}".`,
      updatedSubmissions: this.db.submissions,
    };
  }

  public getCrmClients(searchQuery = ''): ClientProfile[] {
    const submissions = this.db.submissions || [];
    const clientMap = new Map<string, {
      id?: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      address?: string;
      city?: string;
      postalCode?: string;
      birthDate?: string;
      passportNumber?: string;
      passportExpiry?: string;
      preferredDestinations?: string[];
      budgetRange?: string;
      preferredDepartureCity?: string;
      assignedAdvisorId?: string;
      assignedAdvisorName?: string;
      vipLevel?: string;
      tags?: string[];
      notes?: ClientNote[];
      submissions: QuoteSubmission[];
      createdAt?: string;
      updatedAt?: string;
    }>();

    // 1. First, register all explicit client records from DB
    const crmClients = this.db.crmClients || [];
    crmClients.forEach((c) => {
      const email = (c.email || '').trim().toLowerCase();
      const rawPhone = (c.phone || '').replace(/\D/g, '');
      const key = c.id || (email ? `email:${email}` : rawPhone ? `phone:${rawPhone}` : `name:${(c.fullName || '').toLowerCase()}`);
      if (!key) return;

      clientMap.set(key, {
        id: c.id,
        firstName: c.firstName || '',
        lastName: c.lastName || '',
        email: c.email || '',
        phone: c.phone || '',
        address: c.address,
        city: c.city,
        postalCode: c.postalCode,
        birthDate: c.birthDate,
        passportNumber: c.passportNumber,
        passportExpiry: c.passportExpiry,
        preferredDestinations: c.preferredDestinations || [],
        budgetRange: c.budgetRange,
        preferredDepartureCity: c.preferredDepartureCity,
        assignedAdvisorId: c.assignedAdvisorId,
        assignedAdvisorName: c.assignedAdvisorName,
        vipLevel: c.vipLevel,
        tags: c.tags || [],
        notes: c.notes || [],
        submissions: [],
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
      });
    });

    // 2. Group submissions by client identity
    submissions.forEach((sub) => {
      const email = (sub.customerEmail || '').trim().toLowerCase();
      const rawPhone = (sub.customerPhone || '').replace(/\D/g, '');
      const fullName = `${(sub.customerFirstName || '').trim()} ${(sub.customerLastName || '').trim()}`.trim();
      
      // Match existing manual client if present
      let matchedKey: string | undefined;
      for (const [k, c] of clientMap.entries()) {
        if (email && c.email && c.email.trim().toLowerCase() === email) { matchedKey = k; break; }
        if (rawPhone && c.phone && c.phone.replace(/\D/g, '') === rawPhone) { matchedKey = k; break; }
      }

      const key = matchedKey || (email ? `email:${email}` : rawPhone ? `phone:${rawPhone}` : `name:${fullName.toLowerCase()}`);
      if (!key || key === 'name:') return;

      if (!clientMap.has(key)) {
        clientMap.set(key, {
          id: key.replace(/[^a-zA-Z0-9_-]/g, '_'),
          firstName: sub.customerFirstName || '',
          lastName: sub.customerLastName || '',
          email: sub.customerEmail || '',
          phone: sub.customerPhone || '',
          submissions: [],
          createdAt: sub.createdAt || new Date().toISOString(),
          updatedAt: sub.updatedAt || new Date().toISOString(),
        });
      }

      const entry = clientMap.get(key)!;
      if (!entry.firstName && sub.customerFirstName) entry.firstName = sub.customerFirstName;
      if (!entry.lastName && sub.customerLastName) entry.lastName = sub.customerLastName;
      if (!entry.email && sub.customerEmail) entry.email = sub.customerEmail;
      if (!entry.phone && sub.customerPhone) entry.phone = sub.customerPhone;
      entry.submissions.push(sub);
    });

    const clientNotes = this.db.clientNotes || [];

    const profiles: ClientProfile[] = Array.from(clientMap.entries()).map(([key, data]) => {
      const subs = [...data.submissions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const statusCounts: Record<string, number> = {};
      let traveledCount = 0;

      subs.forEach((s) => {
        const st = s.callStatus || 'a_appeler';
        statusCounts[st] = (statusCounts[st] || 0) + 1;
        if (st === 'reserve') {
          traveledCount += 1;
        }
      });

      const destinations = Array.from(new Set([...(data.preferredDestinations || []), ...subs.map((s) => s.destination).filter(Boolean)]));
      const departureCities = Array.from(new Set([...(data.preferredDepartureCity ? [data.preferredDepartureCity] : []), ...subs.map((s) => s.departureCity).filter(Boolean)]));
      const serviceTypes = Array.from(new Set(subs.map((s) => s.serviceType).filter(Boolean)));
      const assignedAdvisors = Array.from(new Set([...(data.assignedAdvisorName ? [data.assignedAdvisorName] : []), ...subs.map((s) => s.assignedToUserName).filter(Boolean) as string[]]));

      const clientId = data.id || key.replace(/[^a-zA-Z0-9_-]/g, '_');
      const matchingNotes = [
        ...(data.notes || []),
        ...clientNotes.filter((n) => n.clientId === clientId || n.clientId === key),
      ];

      const tags: string[] = [...(data.tags || [])];
      if (traveledCount >= 2 && !tags.includes('Voyageur VIP')) {
        tags.push('Voyageur VIP');
      } else if (traveledCount === 1 && !tags.includes('Voyageur Confirmé')) {
        tags.push('Voyageur Confirmé');
      }
      if (subs.length >= 3 && !tags.includes('Grand Habitué')) {
        tags.push('Grand Habitué');
      } else if (subs.length === 0 && !tags.includes('Fiche Client Directe')) {
        tags.push('Fiche Client Directe');
      }

      const fullName = `${data.firstName} ${data.lastName}`.trim() || 'Client sans nom';

      return {
        id: clientId,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        birthDate: data.birthDate,
        passportNumber: data.passportNumber,
        passportExpiry: data.passportExpiry,
        preferredDestinations: data.preferredDestinations,
        budgetRange: data.budgetRange,
        preferredDepartureCity: data.preferredDepartureCity,
        assignedAdvisorId: data.assignedAdvisorId,
        assignedAdvisorName: data.assignedAdvisorName,
        vipLevel: data.vipLevel,
        submissionsCount: subs.length,
        traveledCount,
        callStatusCounts: statusCounts,
        firstSubmissionDate: subs[subs.length - 1]?.createdAt || data.createdAt || new Date().toISOString(),
        lastSubmissionDate: subs[0]?.createdAt || data.updatedAt || new Date().toISOString(),
        destinations,
        departureCities,
        serviceTypes,
        assignedAdvisors,
        preferredCallTime: subs[0]?.preferredCallTime,
        notes: matchingNotes,
        tags,
        submissions: subs,
      };
    });

    // Sort by most recent activity or traveledCount
    profiles.sort((a, b) => new Date(b.lastSubmissionDate).getTime() - new Date(a.lastSubmissionDate).getTime());

    if (!searchQuery || !searchQuery.trim()) {
      return profiles;
    }

    const q = searchQuery.toLowerCase().trim();
    return profiles.filter((p) =>
      p.fullName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.destinations.some((d) => d.toLowerCase().includes(q)) ||
      p.submissions.some((s) => s.referenceNumber.toLowerCase().includes(q))
    );
  }

  public addCrmClient(data: Partial<ClientRecord>): ClientRecord {
    if (!this.db.crmClients) {
      this.db.crmClients = [];
    }
    const fName = (data.firstName || '').trim();
    const lName = (data.lastName || '').trim();
    const fullName = `${fName} ${lName}`.trim() || 'Client';
    const email = (data.email || '').trim().toLowerCase();
    const phone = (data.phone || '').trim();

    const newClient: ClientRecord = {
      id: data.id || `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      firstName: fName,
      lastName: lName,
      fullName,
      email,
      phone,
      address: data.address?.trim(),
      city: data.city?.trim(),
      postalCode: data.postalCode?.trim(),
      birthDate: data.birthDate?.trim(),
      passportNumber: data.passportNumber?.trim(),
      passportExpiry: data.passportExpiry?.trim(),
      preferredDestinations: Array.isArray(data.preferredDestinations) ? data.preferredDestinations : [],
      budgetRange: data.budgetRange?.trim(),
      preferredDepartureCity: data.preferredDepartureCity?.trim(),
      assignedAdvisorId: data.assignedAdvisorId,
      assignedAdvisorName: data.assignedAdvisorName,
      vipLevel: data.vipLevel || 'Nouveau Prospect',
      tags: Array.isArray(data.tags) ? data.tags : [],
      notes: Array.isArray(data.notes) ? data.notes : [],
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if ((data as any).initialNote && typeof (data as any).initialNote === 'string' && (data as any).initialNote.trim()) {
      newClient.notes = [
        {
          id: `cnote_${Date.now()}`,
          clientId: newClient.id,
          authorName: data.assignedAdvisorName || 'Conseiller Voyages',
          authorGrade: 'Équipe CRM',
          text: (data as any).initialNote.trim(),
          createdAt: new Date().toISOString(),
        },
      ];
    }

    const existingIdx = email
      ? this.db.crmClients.findIndex((c) => c.email && c.email.toLowerCase() === email)
      : -1;
    if (existingIdx >= 0) {
      this.db.crmClients[existingIdx] = { ...this.db.crmClients[existingIdx], ...newClient };
    } else {
      this.db.crmClients.unshift(newClient);
    }

    this.saveToJson();
    this.syncCrmClientToMySQL(newClient).catch(() => {});
    console.log(`[CRM] Fiche client sauvegardée en base de données : ${newClient.fullName} (${newClient.email})`);
    return newClient;
  }

  public updateCrmClient(id: string, updates: Partial<ClientRecord>): ClientRecord | undefined {
    if (!this.db.crmClients) this.db.crmClients = [];
    let client = this.db.crmClients.find((c) => c.id === id);
    if (!client) {
      const all = this.getCrmClients();
      const fromAll = all.find((c) => c.id === id);
      if (fromAll) {
        client = this.addCrmClient({
          id,
          firstName: fromAll.firstName,
          lastName: fromAll.lastName,
          email: fromAll.email,
          phone: fromAll.phone,
        });
      }
    }
    if (!client) return undefined;

    Object.assign(client, updates, { updatedAt: new Date().toISOString() });
    if (updates.firstName || updates.lastName) {
      client.fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.fullName;
    }
    this.saveToJson();
    this.syncCrmClientToMySQL(client).catch(() => {});
    return client;
  }

  public deleteCrmClient(id: string): boolean {
    if (!this.db.crmClients) return false;
    const initialLen = this.db.crmClients.length;
    this.db.crmClients = this.db.crmClients.filter((c) => c.id !== id);
    if (this.db.crmClients.length !== initialLen) {
      this.saveToJson();
      if (this.pool) {
        this.pool.execute('DELETE FROM `crm_clients` WHERE `id` = ?', [id]).catch(() => {});
      }
      return true;
    }
    return false;
  }

  // Analytics & Stats
  public getStats() {
    const submissions = this.db.submissions;
    const totalSubmissions = submissions.length;

    const callStatusCounts = {
      a_appeler: submissions.filter((s) => s.callStatus === 'a_appeler').length,
      appele_non_repondu: submissions.filter((s) => s.callStatus === 'appele_non_repondu').length,
      appele_contact_etabli: submissions.filter((s) => s.callStatus === 'appele_contact_etabli').length,
      devis_en_cours: submissions.filter((s) => s.callStatus === 'devis_en_cours').length,
      devis_envoye: submissions.filter((s) => s.callStatus === 'devis_envoye').length,
      reserve: submissions.filter((s) => s.callStatus === 'reserve').length,
      perdu: submissions.filter((s) => s.callStatus === 'perdu').length,
    };

    const serviceCounts = {
      forfait_tout_inclus: submissions.filter((s) => s.serviceType === 'forfait_tout_inclus').length,
      vol_hotel: submissions.filter((s) => s.serviceType === 'vol_hotel').length,
      croisiere: submissions.filter((s) => s.serviceType === 'croisiere').length,
      battre_prix: submissions.filter((s) => s.serviceType === 'battre_prix').length,
    };

    const destinationCounts: Record<string, number> = {};
    submissions.forEach((s) => {
      destinationCounts[s.destination] = (destinationCounts[s.destination] || 0) + 1;
    });

    const conversionRate = totalSubmissions > 0
      ? Math.round((callStatusCounts.reserve / totalSubmissions) * 100)
      : 0;

    const contactedRate = totalSubmissions > 0
      ? Math.round(((totalSubmissions - callStatusCounts.a_appeler) / totalSubmissions) * 100)
      : 0;

    return {
      totalSubmissions,
      conversionRate,
      contactedRate,
      callStatusCounts,
      serviceCounts,
      topDestinations: Object.entries(destinationCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      botEnabled: this.db.chatbotSettings.botEnabled,
      activeConversations: this.db.conversations.length,
      totalTeamMessages: this.db.teamMessages.length,
    };
  }

  // --- NEWSLETTER SUBSCRIBERS & CAMPAIGNS ---
  public getNewsletterSubscribers(): NewsletterSubscriber[] {
    return this.db.newsletterSubscribers || [];
  }

  public getNewsletterCampaigns(): NewsletterCampaign[] {
    return this.db.newsletterCampaigns || [];
  }

  public subscribeToNewsletter(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    source?: 'website_footer' | 'quote_form' | 'admin_import' | 'manual';
    preferences?: Partial<NewsletterPreferences>;
  }): { subscriber: NewsletterSubscriber; isNew: boolean } {
    if (!this.db.newsletterSubscribers) {
      this.db.newsletterSubscribers = [];
    }

    const cleanEmail = data.email.trim().toLowerCase();
    const existingIndex = this.db.newsletterSubscribers.findIndex(
      (s) => s.email.trim().toLowerCase() === cleanEmail
    );

    const defaultPrefs: NewsletterPreferences = {
      offersExclusive: true,
      lastMinuteAlerts: true,
      cruisesSpecials: true,
      sunDestinations: true,
      frequency: 'weekly',
    };

    if (existingIndex >= 0) {
      const existing = this.db.newsletterSubscribers[existingIndex];
      existing.status = 'active';
      existing.unsubscribedAt = undefined;
      if (data.firstName) existing.firstName = data.firstName;
      if (data.lastName) existing.lastName = data.lastName;
      if (data.preferences) {
        existing.preferences = { ...existing.preferences, ...data.preferences };
      }
      this.saveToJson();
      this.syncNewsletterSubscriberToMySQL(existing).catch(() => {});
      return { subscriber: existing, isNew: false };
    }

    const token = 'tok_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newSubscriber: NewsletterSubscriber = {
      id: 'subscr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      email: cleanEmail,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      status: 'active',
      preferences: { ...defaultPrefs, ...(data.preferences || {}) },
      subscribedAt: new Date().toISOString(),
      token,
      source: data.source || 'website_footer',
    };

    this.db.newsletterSubscribers.unshift(newSubscriber);
    this.saveToJson();
    this.syncNewsletterSubscriberToMySQL(newSubscriber).catch(() => {});

    this.createNotification({
      title: 'Nouvel abonné Newsletter 📩',
      message: `${cleanEmail} vient de s'abonner à l'infolettre Évasion Soleil.`,
      type: 'chat_alert',
      targetUserId: 'all',
    });

    return { subscriber: newSubscriber, isNew: true };
  }

  public getSubscriberByToken(token: string): NewsletterSubscriber | null {
    if (!this.db.newsletterSubscribers) return null;
    return this.db.newsletterSubscribers.find((s) => s.token === token) || null;
  }

  public updateSubscriberPreferences(
    token: string,
    updates: {
      firstName?: string;
      lastName?: string;
      preferences?: Partial<NewsletterPreferences>;
      status?: 'active' | 'unsubscribed';
    }
  ): NewsletterSubscriber | null {
    if (!this.db.newsletterSubscribers) return null;
    const subscriber = this.db.newsletterSubscribers.find((s) => s.token === token);
    if (!subscriber) return null;

    if (updates.firstName !== undefined) subscriber.firstName = updates.firstName;
    if (updates.lastName !== undefined) subscriber.lastName = updates.lastName;
    if (updates.preferences) {
      subscriber.preferences = { ...subscriber.preferences, ...updates.preferences };
    }
    if (updates.status) {
      subscriber.status = updates.status;
      if (updates.status === 'unsubscribed') {
        subscriber.unsubscribedAt = new Date().toISOString();
      } else {
        subscriber.unsubscribedAt = undefined;
      }
    }

    this.saveToJson();
    this.syncNewsletterSubscriberToMySQL(subscriber).catch(() => {});
    return subscriber;
  }

  public unsubscribeByToken(token: string): boolean {
    if (!this.db.newsletterSubscribers) return false;
    const subscriber = this.db.newsletterSubscribers.find((s) => s.token === token);
    if (!subscriber) return false;

    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date().toISOString();
    this.saveToJson();
    this.syncNewsletterSubscriberToMySQL(subscriber).catch(() => {});
    return true;
  }

  public unsubscribeByEmail(email: string): boolean {
    if (!this.db.newsletterSubscribers) return false;
    const clean = email.trim().toLowerCase();
    const subscriber = this.db.newsletterSubscribers.find((s) => s.email.trim().toLowerCase() === clean);
    if (!subscriber) return false;

    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date().toISOString();
    this.saveToJson();
    this.syncNewsletterSubscriberToMySQL(subscriber).catch(() => {});
    return true;
  }

  public deleteNewsletterSubscriber(id: string): boolean {
    if (!this.db.newsletterSubscribers) return false;
    const before = this.db.newsletterSubscribers.length;
    this.db.newsletterSubscribers = this.db.newsletterSubscribers.filter((s) => s.id !== id);
    if (this.db.newsletterSubscribers.length !== before) {
      this.saveToJson();
      if (this.pool) {
        this.pool.execute('DELETE FROM `newsletter_subscribers` WHERE `id` = ?', [id]).catch(() => {});
      }
      return true;
    }
    return false;
  }

  public addNewsletterCampaign(campaign: Omit<NewsletterCampaign, 'id' | 'sentAt'>): NewsletterCampaign {
    if (!this.db.newsletterCampaigns) {
      this.db.newsletterCampaigns = [];
    }

    const newCampaign: NewsletterCampaign = {
      ...campaign,
      id: 'camp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sentAt: new Date().toISOString(),
    };

    this.db.newsletterCampaigns.unshift(newCampaign);
    this.saveToJson();
    this.syncNewsletterCampaignToMySQL(newCampaign).catch(() => {});
    return newCampaign;
  }

  // --- FACTURATION & PAIEMENTS STRIPE ---
  public getInvoiceCatalog(): InvoiceArticleCatalog[] {
    return [
      {
        id: 'art_sud_5star',
        title: '🌴 Forfait Tout-Inclus Sud - Vol + Hôtel 5★',
        category: 'Forfait Sud',
        defaultPrice: 1850.0,
        description: 'Vol direct aller-retour, formule tout-inclus 24h repas & boissons, transferts aéroport-hôtel et 1 bagage enregistré inclus.',
      },
      {
        id: 'art_croisiere_balcon',
        title: '🚢 Croisière Maritime Caraïbes - Cabine Balcon Vue Mer',
        category: 'Croisière',
        defaultPrice: 2290.0,
        description: 'Croisière 7 nuits en cabine balcon privée, tous les repas gastronomiques, divertissements à bord et pourboires inclus.',
      },
      {
        id: 'art_vol_hotel_7j',
        title: '✈️ Séjour Vol + Hôtel Bord de Mer (7 nuits)',
        category: 'Vol + Hôtel',
        defaultPrice: 1420.0,
        description: 'Vols réguliers et 7 nuits en établissement 4★ supérieur avec petits-déjeuners inclus.',
      },
      {
        id: 'art_assurance_medicale',
        title: '🛡️ Assurance Voyage Complète Médicale & Annulation',
        category: 'Assurance',
        defaultPrice: 185.0,
        description: 'Couverture médicale d\'urgence 5M$, rapatriement et annulation/interruption de voyage toutes causes justifiées.',
      },
      {
        id: 'art_assurance_annulation',
        title: '📑 Assurance Annulation / Interruption Toutes Causes',
        category: 'Assurance',
        defaultPrice: 220.0,
        description: 'Protection intégrale en cas d\'imprévu personnel, professionnel ou médical avant ou pendant le voyage.',
      },
      {
        id: 'art_frais_dossier',
        title: '🧳 Frais de Gestion & Conciergerie VIP Évasion Soleil',
        category: 'Services',
        defaultPrice: 75.0,
        description: 'Recherche de disponibilités au meilleur tarif garanti, réservation prioritaire et assistance 24/7 durant le voyage.',
      },
      {
        id: 'art_transfert_vip',
        title: '🚐 Transfert Privé Aéroport ⇄ Hôtel VIP Aller-Retour',
        category: 'Transfert',
        defaultPrice: 140.0,
        description: 'Véhicule climatisé privé avec chauffeur dédié sans attente à l\'arrivée ni arrêts multiples.',
      },
      {
        id: 'art_surclassement_vue_mer',
        title: '🌅 Surclassement Chambre Supérieure / Vue Mer VIP',
        category: 'Hôtel',
        defaultPrice: 320.0,
        description: 'Chambre avec vue mer panoramique, étage supérieur et commodités exclusives VIP.',
      },
      {
        id: 'art_location_auto',
        title: '🚗 Location Véhicule Catégorie Intermédiaire (7 jours)',
        category: 'Transport',
        defaultPrice: 480.0,
        description: 'Kilométrage illimité, assurances de base et prise en charge directe à l\'aéroport.',
      },
      {
        id: 'art_pass_excursions',
        title: '🎟️ Pass Excursion & Activités Nautiques Premium',
        category: 'Excursion',
        defaultPrice: 195.0,
        description: 'Journée en catamaran avec dîner langouste, plongée en apnée et guide francophone certifié.',
      },
    ];
  }

  public getInvoices(clientKey?: string): Invoice[] {
    const list = this.db.invoices || [];
    if (!clientKey) return list;
    const cleanKey = clientKey.trim().toLowerCase();
    return list.filter((inv) => {
      const invKey = (inv.clientKey || '').toLowerCase();
      const invEmail = (inv.clientEmail || '').toLowerCase();
      const invPhone = (inv.clientPhone || '').replace(/\D/g, '');
      const searchClean = cleanKey.replace('email:', '').replace('phone:', '').replace(/\D/g, '');
      return (
        invKey === cleanKey ||
        invKey.includes(cleanKey) ||
        invEmail === cleanKey ||
        (searchClean && invPhone.includes(searchClean))
      );
    });
  }

  public getInvoiceById(id: string): Invoice | undefined {
    return (this.db.invoices || []).find((inv) => inv.id === id);
  }

  public saveInvoice(data: Partial<Invoice>): Invoice {
    if (!this.db.invoices) {
      this.db.invoices = [];
    }

    const now = new Date();
    const year = now.getFullYear();
    const count = (this.db.invoices.length + 1).toString().padStart(4, '0');
    const invoiceNumber = data.invoiceNumber || `FAC-${year}-${count}`;
    const id = data.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Calculs financiers
    const items: InvoiceItem[] = (data.items || []).map((it, idx) => ({
      id: it.id || `item_${idx + 1}_${Date.now()}`,
      articleId: it.articleId,
      title: it.title || 'Prestation de voyage',
      description: it.description || '',
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      total: Math.round(((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)) * 100) / 100,
    }));

    const subtotal = Math.round(items.reduce((sum, it) => sum + it.total, 0) * 100) / 100;
    const taxExempt = Boolean(data.taxExempt ?? true); // Forfaits voyages internationaux souvent exempts de TPS/TVQ
    const taxRateTPS = taxExempt ? 0 : (data.taxRateTPS ?? 0.05);
    const taxRateTVQ = taxExempt ? 0 : (data.taxRateTVQ ?? 0.09975);
    const taxTPS = Math.round((subtotal * taxRateTPS) * 100) / 100;
    const taxTVQ = Math.round((subtotal * taxRateTVQ) * 100) / 100;
    const total = Math.round((subtotal + taxTPS + taxTVQ) * 100) / 100;

    // Génération du lien de paiement Stripe officiel / simulé sécurisé
    const stripePaymentLink =
      data.stripePaymentLink ||
      `https://checkout.stripe.com/c/pay/cs_live_${id.replace('inv_', '')}_evasionsoleil?amount=${Math.round(total * 100)}&currency=cad`;

    const existingIndex = this.db.invoices.findIndex((i) => i.id === id);

    const invoice: Invoice = {
      id,
      invoiceNumber,
      clientKey: data.clientKey || '',
      clientName: data.clientName || 'Client Évasion Soleil',
      clientEmail: data.clientEmail || '',
      clientPhone: data.clientPhone || '',
      submissionId: data.submissionId,
      submissionRef: data.submissionRef,
      destination: data.destination,
      items,
      subtotal,
      taxRateTPS,
      taxRateTVQ,
      taxTPS,
      taxTVQ,
      taxExempt,
      total,
      currency: 'CAD',
      status: data.status || 'en_attente',
      paymentMethod: data.paymentMethod || 'stripe',
      stripePaymentLink,
      stripeSessionId: data.stripeSessionId || `cs_live_${Math.random().toString(36).substring(2, 12)}`,
      paidAt: data.paidAt,
      createdAt: data.createdAt || now.toISOString(),
      dueDate: data.dueDate || new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      createdByUserId: data.createdByUserId || 'usr_sysadmin',
      createdByUserName: data.createdByUserName || 'Conseiller Évasion Soleil',
      notes: data.notes || '',
      lastEmailSentAt: data.lastEmailSentAt,
      requireIdentityVerification: Boolean(data.requireIdentityVerification),
      identityVerificationStatus: data.requireIdentityVerification
        ? (data.identityVerificationStatus || 'en_attente')
        : (data.identityVerificationStatus || 'non_requis'),
      identityDocumentType: data.identityDocumentType || 'passeport',
      identityVerifiedAt: data.identityVerifiedAt,
      identityDocumentUrl: data.identityDocumentUrl,
    };

    if (existingIndex >= 0) {
      this.db.invoices[existingIndex] = invoice;
    } else {
      this.db.invoices.unshift(invoice);
    }

    this.saveToJson();
    this.syncInvoiceToMySQL(invoice).catch(() => {});
    return invoice;
  }

  public updateInvoiceStatus(
    id: string,
    status: Invoice['status'],
    paidDetails?: { paidAt?: string; paymentMethod?: 'stripe' | 'virement' | 'carte_agence' }
  ): Invoice | undefined {
    if (!this.db.invoices) return undefined;
    const inv = this.db.invoices.find((i) => i.id === id);
    if (!inv) return undefined;

    inv.status = status;
    if (status === 'payee') {
      inv.paidAt = paidDetails?.paidAt || new Date().toISOString();
      if (paidDetails?.paymentMethod) {
        inv.paymentMethod = paidDetails.paymentMethod;
      }
    }
    this.saveToJson();
    this.syncInvoiceToMySQL(inv).catch(() => {});
    return inv;
  }

  public updateInvoiceIdentityVerification(
    id: string,
    status: 'verifie' | 'rejete' | 'en_attente',
    documentUrl?: string
  ): Invoice | undefined {
    if (!this.db.invoices) return undefined;
    const inv = this.db.invoices.find((i) => i.id === id);
    if (!inv) return undefined;

    inv.identityVerificationStatus = status;
    if (status === 'verifie') {
      inv.identityVerifiedAt = new Date().toISOString();
    }
    if (documentUrl) {
      inv.identityDocumentUrl = documentUrl;
    }
    this.saveToJson();
    this.syncInvoiceToMySQL(inv).catch(() => {});
    return inv;
  }

  public deleteInvoice(id: string): boolean {
    if (!this.db.invoices) return false;
    const prevLen = this.db.invoices.length;
    this.db.invoices = this.db.invoices.filter((i) => i.id !== id);
    if (this.db.invoices.length !== prevLen) {
      this.saveToJson();
      if (this.pool) {
        this.pool.execute('DELETE FROM `invoices` WHERE `id` = ?', [id]).catch(() => {});
      }
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------------
  // DOCUMENTS LÉGAUX & SIGNATURES ÉLECTRONIQUES (Espace CRM Client)
  // -------------------------------------------------------------------
  public getDefaultLegalDocumentTemplates(): LegalDocumentTemplate[] {
    return [
      {
        id: 'tmpl_contrat_voyage',
        title: 'Contrat de Vente & Conditions de Réservation Voyage',
        category: 'contrat_voyage',
        description: 'Contrat officiel conforme à l\'Office de la protection du consommateur du Québec (OPC) régissant le forfait tout-inclus ou vol+hôtel.',
        defaultFileName: 'Contrat_de_Voyage_Evasion_Soleil.pdf',
        headerSubtitle: 'CONTRAT OFFICIEL DE VOYAGE • PERMIS DU QUÉBEC (OPC #703492)',
        footerLegalNote: 'Évasion Soleil • Titulaire d\'un permis d\'agence de voyages du Québec #703492 • Fonds d\'indemnisation des clients des agents de voyages (FICAV).',
        accentColor: '#338b84',
        lockedForAdvisors: true,
        createdByUserName: 'Direction Évasion Soleil',
        updatedAt: '2026-09-01T10:00:00Z',
        bodyTemplate: `CONTRAT DE VENTE & CONDITIONS DE VOYAGE - VOYAGES ÉVASION SOLEIL INC.
Permis d'agent de voyages du Québec : #703492

CLIENT : {{NOM_CLIENT}} ({{COURRIEL_CLIENT}})
DOSSIER : {{REF_DOSSIER}} — DESTINATION : {{DESTINATION}}
CONSEILLER ATTITRÉ : {{NOM_CONSEILLER}} — DATE : {{DATE_JOUR}}

1. OBJET DU CONTRAT : L'agence Voyages Évasion Soleil agit comme intermédiaire autorisé entre le client soussigné et les prestataires de services touristiques (compagnies aériennes, hôteliers, croisiéristes, réceptifs locaux).
2. PAIEMENT & DÉPÔTS : Le paiement complet du voyage doit être acquitté selon l'échéancier convenu avant l'émission finale des billets électroniques et bons d'échange d'hôtel. Tout retard peut entraîner l'annulation automatique sans préavis.
3. MODIFICATIONS & ANNULATIONS : Les forfaits vacances et billets d'avion sont 100% non remboursables et non modifiables une fois confirmés auprès des grossistes (Transat, Sunwing, Air Canada Vacances, WestJet Vacances), sauf si une assurance annulation toutes causes a été souscrite.
4. FORMALITÉS DOUANIÈRES & PASSEPORT : Le voyageur est seul et entièrement responsable de détenir un passeport valide (au minimum 6 mois suivant la date de retour prévue pour les destinations internationales) ainsi que tout visa ou autorisation électronique (ESTA, etc.).
5. CLAUSE DE NON-RESPONSABILITÉ : L'agence ne saurait être tenue responsable des retards de vol, changements d'horaire, intempéries météo (ouragans, tempêtes) ou force majeure.

En apposant ma signature électronique ci-dessous, je confirme avoir lu, compris et accepté sans réserve l'intégralité des clauses du présent contrat de voyage.`,
      },
      {
        id: 'tmpl_autorisation_paiement',
        title: 'Formulaire d\'Autorisation de Débit & Carte de Crédit',
        category: 'autorisation_paiement',
        description: 'Autorisation formelle signée permettant à l\'agence de débiter la carte de crédit pour le paiement de l\'acompte ou du solde du forfait.',
        defaultFileName: 'Autorisation_Paiement_Carte_Credit.pdf',
        headerSubtitle: 'AUTORISATION DE FACTURATION SÉCURISÉE • CONFORME OPC',
        footerLegalNote: 'Transaction protégée par le Fonds d\'indemnisation des clients des agents de voyages (FICAV).',
        accentColor: '#0284c7',
        lockedForAdvisors: true,
        createdByUserName: 'Direction Évasion Soleil',
        updatedAt: '2026-09-01T10:00:00Z',
        bodyTemplate: `AUTORISATION DE DÉBIT & CARTE DE CRÉDIT
VOYAGES ÉVASION SOLEIL INC.

CLIENT : {{NOM_CLIENT}} ({{COURRIEL_CLIENT}})
DOSSIER : {{REF_DOSSIER}} — DESTINATION : {{DESTINATION}}

Je soussigné(e), {{NOM_CLIENT}}, titulaire du dossier voyage ou titulaire de la carte de crédit, autorise expressément l'agence Voyages Évasion Soleil Inc. ou le voyagiste désigné à débiter ma carte de crédit (Visa, MasterCard, American Express) du montant convenu pour le règlement du voyage vers {{DESTINATION}}.

- Acompte / Dépôt de garantie : Selon entente au dossier {{REF_DOSSIER}}
- Solde final : Dû à la date limite spécifiée sur la facture officielle
- Politique de contestation : J'atteste que cette transaction est légitime et renonce à contester le débit auprès de mon institution financière dès lors que les prestations touristiques ont été réservées conformément à ma demande.

Signature électronique et consentement formel requis du voyageur payeur.`,
      },
      {
        id: 'tmpl_decharge_assurance',
        title: 'Décharge & Déclaration de Refus d\'Assurance Voyage',
        category: 'decharge_assurance',
        description: 'Document légal attestant que le voyageur a été informé des risques et a formellement décliné la couverture d\'assurance médicale et annulation.',
        defaultFileName: 'Decharge_Refus_Assurance_Voyage.pdf',
        headerSubtitle: 'DÉCLARATION LÉGALE OBLIGATOIRE • RENONCIATION D\'ASSURANCE',
        footerLegalNote: 'Document archivé conformément aux obligations réglementaires de l\'Office de la protection du consommateur du Québec.',
        accentColor: '#d97706',
        lockedForAdvisors: true,
        createdByUserName: 'Direction Évasion Soleil',
        updatedAt: '2026-09-01T10:00:00Z',
        bodyTemplate: `DÉCHARGE OFFICIELLE & REFUS D'ASSURANCE VOYAGE
VOYAGES ÉVASION SOLEIL INC.

VOYAGEUR : {{NOM_CLIENT}} — DOSSIER : {{REF_DOSSIER}} ({{DESTINATION}})

AVIS IMPORTANT DE L'AGENCE : Voyages Évasion Soleil recommande fortement et sans réserve la souscription d'une assurance voyage complète couvrant les soins médicaux d'urgence à l'étranger (rapatriement, hospitalisation sans limite) ainsi que l'annulation et l'interruption de voyage.

DÉCLARATION DU CLIENT :
Je confirme par la présente que mon conseiller en voyages ({{NOM_CONSEILLER}}) m'a présenté en détail les options d'assurance voyage.
J'atteste avoir choisi de : DÉCLINER ET REFUSER CETTE PROTECTION EN TOUTE CONNAISSANCE DE CAUSE.

Je décharge formellement Voyages Évasion Soleil Inc., ses dirigeants et ses conseillers de toute responsabilité financière, médicale ou juridique résultant d'un imprévu, d'une maladie, d'un accident ou de l'annulation de mon séjour. Je comprends que la Régie de l'assurance maladie du Québec (RAMQ) ne rembourse qu'une fraction dérisoire des frais médicaux hors du Canada.`,
      },
      {
        id: 'tmpl_decharge_responsabilite',
        title: 'Décharge de Responsabilité & Activités d\'Excursions',
        category: 'decharge_responsabilite',
        description: 'Décharge pour la pratique d\'activités nautiques, excursions aventure, location de motomarine ou sports motorisés.',
        defaultFileName: 'Decharge_Excursions_Aventure.pdf',
        headerSubtitle: 'DÉCHARGE DE RESPONSABILITÉ • ACTIVITÉS ET EXCURSIONS',
        footerLegalNote: 'Document contractuel d\'information et d\'acceptation des risques lié au dossier client.',
        accentColor: '#4f46e5',
        lockedForAdvisors: true,
        createdByUserName: 'Direction Évasion Soleil',
        updatedAt: '2026-09-01T10:00:00Z',
        bodyTemplate: `DÉCHARGE DE RESPONSABILITÉ - ACTIVITÉS & EXCURSIONS
VOYAGES ÉVASION SOLEIL INC.

PARTICIPANT : {{NOM_CLIENT}} — DESTINATION : {{DESTINATION}} (Dossier {{REF_DOSSIER}})

Pour toute participation à des excursions optionnelles réservées par l'entremise de l'agence (catamaran, plongée sous-marine, motomarine, tyrolienne, buggy tout-terrain, safari) :
Le voyageur reconnaît que ces activités comportent des risques inhérents et assume l'entière responsabilité de son état physique et de sa sécurité personnelle.
L'agence n'est pas le transporteur ni l'opérateur direct de l'excursion et décline toute responsabilité pour tout dommage matériel ou corporel.`,
      },
    ];
  }

  public getLegalDocumentTemplates(): LegalDocumentTemplate[] {
    if (!this.db.legalDocumentTemplates || this.db.legalDocumentTemplates.length === 0) {
      this.db.legalDocumentTemplates = this.getDefaultLegalDocumentTemplates();
      this.saveToJson();
    }
    return this.db.legalDocumentTemplates;
  }

  public saveLegalDocumentTemplate(data: Partial<LegalDocumentTemplate> & { title: string; bodyTemplate: string }): LegalDocumentTemplate {
    if (!this.db.legalDocumentTemplates || this.db.legalDocumentTemplates.length === 0) {
      this.db.legalDocumentTemplates = this.getDefaultLegalDocumentTemplates();
    }
    const now = new Date().toISOString();
    const id = data.id || `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const existingIdx = this.db.legalDocumentTemplates.findIndex((t) => t.id === id);

    const safeFileName = (data.defaultFileName || `${data.title.replace(/[^a-zA-Z0-9À-ÿ_-]/g, '_')}.pdf`).endsWith('.pdf')
      ? (data.defaultFileName || `${data.title.replace(/[^a-zA-Z0-9À-ÿ_-]/g, '_')}.pdf`)
      : `${data.defaultFileName || data.title.replace(/[^a-zA-Z0-9À-ÿ_-]/g, '_')}.pdf`;

    const template: LegalDocumentTemplate = {
      id,
      title: data.title.trim(),
      category: data.category || 'contrat_voyage',
      description: data.description || 'Modèle PDF officiel créé sur le site Évasion Soleil.',
      defaultFileName: safeFileName,
      bodyTemplate: data.bodyTemplate,
      headerSubtitle: data.headerSubtitle || 'DOCUMENT OFFICIEL • PERMIS DU QUÉBEC (OPC #703492)',
      footerLegalNote:
        data.footerLegalNote ||
        "Évasion Soleil • Titulaire d'un permis d'agence de voyages du Québec #703492 • Fonds d'indemnisation des clients des agents de voyages (FICAV).",
      accentColor: data.accentColor || '#338b84',
      lockedForAdvisors: data.lockedForAdvisors !== undefined ? Boolean(data.lockedForAdvisors) : true,
      createdByUserName: data.createdByUserName || 'Direction Évasion Soleil',
      updatedAt: now,
    };

    if (existingIdx >= 0) {
      this.db.legalDocumentTemplates[existingIdx] = template;
    } else {
      this.db.legalDocumentTemplates.unshift(template);
    }
    this.saveToJson();
    this.syncLegalDocumentTemplateToMySQL(template).catch(() => {});
    return template;
  }

  public deleteLegalDocumentTemplate(id: string): boolean {
    if (!this.db.legalDocumentTemplates) return false;
    const prev = this.db.legalDocumentTemplates.length;
    this.db.legalDocumentTemplates = this.db.legalDocumentTemplates.filter((t) => t.id !== id);
    if (this.db.legalDocumentTemplates.length !== prev) {
      this.saveToJson();
      if (this.pool) {
        this.pool.execute('DELETE FROM `legal_document_templates` WHERE `id` = ?', [id]).catch(() => {});
      }
      return true;
    }
    return false;
  }

  public getLockPdfForAdvisors(): boolean {
    if (this.db.lockPdfForAdvisors === undefined) {
      this.db.lockPdfForAdvisors = true;
    }
    return Boolean(this.db.lockPdfForAdvisors);
  }

  public setLockPdfForAdvisors(locked: boolean): boolean {
    this.db.lockPdfForAdvisors = Boolean(locked);
    this.saveToJson();
    this.syncChatbotSettingsToMySQL(this.db.chatbotSettings).catch(() => {});
    return this.db.lockPdfForAdvisors;
  }

  public getLegalDocuments(clientKey?: string): LegalDocument[] {
    if (!this.db.legalDocuments) {
      this.db.legalDocuments = [];
    }
    if (clientKey) {
      const needle = clientKey.toLowerCase();
      return this.db.legalDocuments.filter(
        (d) =>
          d.clientKey.toLowerCase() === needle ||
          d.clientEmail.toLowerCase() === needle ||
          (d.clientPhone && d.clientPhone.replace(/\D/g, '') === needle.replace(/\D/g, ''))
      );
    }
    return this.db.legalDocuments;
  }

  public getLegalDocumentById(id: string): LegalDocument | undefined {
    if (!id) return undefined;
    if (!this.db.legalDocuments) {
      this.db.legalDocuments = [];
    }
    const cleanId = String(id).trim();
    const lowerId = cleanId.toLowerCase();
    return this.db.legalDocuments.find(
      (d) =>
        d.id === cleanId ||
        d.signatureToken === cleanId ||
        d.id.toLowerCase() === lowerId ||
        (d.signatureToken && d.signatureToken.toLowerCase() === lowerId)
    );
  }

  public saveLegalDocument(data: Partial<LegalDocument>): LegalDocument {
    if (!this.db.legalDocuments) {
      this.db.legalDocuments = [];
    }
    const now = new Date().toISOString();
    const id = data.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const existingIdx = this.db.legalDocuments.findIndex((d) => d.id === id);

    const doc: LegalDocument = {
      id,
      title: data.title || 'Document Légal de Voyage',
      category: data.category || 'contrat_voyage',
      clientKey: data.clientKey || '',
      clientName: data.clientName || 'Client Évasion Soleil',
      clientEmail: data.clientEmail || '',
      clientPhone: data.clientPhone,
      submissionId: data.submissionId,
      submissionRef: data.submissionRef,
      destination: data.destination,
      status: data.status || 'brouillon',
      contentSummary: data.contentSummary || '',
      documentBodyHtml: data.documentBodyHtml || '',
      fileAttachmentName: data.fileAttachmentName || 'Document_Officiel_Evasion_Soleil.pdf',
      fileAttachmentBase64: data.fileAttachmentBase64,
      fileAttachmentSize: data.fileAttachmentSize || '142 Ko',
      signatureToken: data.signatureToken || `sig_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      signedAt: data.signedAt,
      signedByIp: data.signedByIp,
      signatureDataUrl: data.signatureDataUrl,
      signatureSignerName: data.signatureSignerName,
      sentAt: data.sentAt,
      sentByAdvisorName: data.sentByAdvisorName || 'Conseiller Évasion Soleil',
      templateId: data.templateId,
      lockedForAdvisors: data.lockedForAdvisors !== undefined ? Boolean(data.lockedForAdvisors) : true,
      headerSubtitle: data.headerSubtitle,
      footerLegalNote: data.footerLegalNote,
      accentColor: data.accentColor,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    if (existingIdx >= 0) {
      this.db.legalDocuments[existingIdx] = doc;
    } else {
      this.db.legalDocuments.unshift(doc);
    }
    this.saveToJson();
    this.syncLegalDocumentToMySQL(doc).catch(() => {});
    return doc;
  }

  public deleteLegalDocument(id: string): boolean {
    if (!this.db.legalDocuments) return false;
    const prev = this.db.legalDocuments.length;
    this.db.legalDocuments = this.db.legalDocuments.filter((d) => d.id !== id);
    if (this.db.legalDocuments.length !== prev) {
      this.saveToJson();
      if (this.pool) {
        this.pool.execute('DELETE FROM `legal_documents` WHERE `id` = ?', [id]).catch(() => {});
      }
      return true;
    }
    return false;
  }

  public signLegalDocument(
    id: string,
    signatureDataUrl: string,
    clientIp: string,
    signerName?: string
  ): LegalDocument | undefined {
    if (!this.db.legalDocuments) {
      this.db.legalDocuments = [];
    }
    const cleanId = String(id || '').trim();
    const lowerId = cleanId.toLowerCase();
    const doc = this.db.legalDocuments.find(
      (d) =>
        d.id === cleanId ||
        d.signatureToken === cleanId ||
        d.id.toLowerCase() === lowerId ||
        (d.signatureToken && d.signatureToken.toLowerCase() === lowerId)
    );
    if (!doc) return undefined;

    doc.status = 'signe';
    doc.signedAt = new Date().toISOString();
    doc.signatureDataUrl = signatureDataUrl;
    doc.signedByIp = clientIp || '142.112.98.45';
    if (signerName) {
      doc.signatureSignerName = signerName;
    }
    doc.updatedAt = new Date().toISOString();
    this.saveToJson();
    this.syncLegalDocumentToMySQL(doc).catch(() => {});
    return doc;
  }

  public getAllClientNotes(): ClientNote[] {
    return this.db.clientNotes || [];
  }

  public deleteClientNote(id: string): boolean {
    if (!this.db.clientNotes) return false;
    const prev = this.db.clientNotes.length;
    this.db.clientNotes = this.db.clientNotes.filter((n) => n.id !== id);
    if (this.db.clientNotes.length !== prev) {
      this.saveToJson();
      if (this.pool) {
        this.pool.execute('DELETE FROM `crm_client_notes` WHERE `id` = ?', [id]).catch(() => {});
      }
      return true;
    }
    return false;
  }

  public appendLegalDocumentChunk(
    id: string,
    chunkData: string,
    chunkIndex: number,
    isLastChunk: boolean
  ): LegalDocument | undefined {
    const doc = this.getLegalDocumentById(id);
    if (!doc) return undefined;
    if (chunkIndex === 0) {
      doc.fileAttachmentBase64 = chunkData;
    } else {
      doc.fileAttachmentBase64 = (doc.fileAttachmentBase64 || '') + chunkData;
    }
    doc.updatedAt = new Date().toISOString();
    if (isLastChunk) {
      this.saveToJson();
      this.syncLegalDocumentToMySQL(doc).catch(() => {});
    }
    return doc;
  }

  public updateClientTags(
    clientIdOrKey: string,
    newTags: string[]
  ): { success: boolean; clientTags: string[]; updatedSubmissions: QuoteSubmission[] } {
    const cleanKey = clientIdOrKey.trim().toLowerCase();
    const submissions = this.db.submissions || [];
    const updatedSubmissions: QuoteSubmission[] = [];

    submissions.forEach((sub) => {
      const email = (sub.customerEmail || '').trim().toLowerCase();
      const rawPhone = (sub.customerPhone || '').replace(/\D/g, '');
      const key1 = email ? `email:${email}` : '';
      const key2 = rawPhone ? `phone:${rawPhone}` : '';
      const id1 = email ? `cli_${email.replace(/[^a-z0-9]/g, '_')}` : '';

      const matches =
        sub.id === clientIdOrKey ||
        (Boolean(email) && email === cleanKey) ||
        (Boolean(key1) && key1 === cleanKey) ||
        (Boolean(key2) && key2 === cleanKey) ||
        (Boolean(id1) && id1 === cleanKey) ||
        (Boolean(email) && cleanKey.includes(email)) ||
        (Boolean(rawPhone) && rawPhone.length >= 7 && cleanKey.includes(rawPhone));

      if (matches) {
        sub.tags = [...newTags];
        sub.updatedAt = new Date().toISOString();
        updatedSubmissions.push(sub);
        if (this.pool) {
          this.syncSubmissionToMySQL(sub).catch(() => {});
        }
      }
    });

    this.saveToJson();
    return { success: true, clientTags: newTags, updatedSubmissions };
  }

  // Aucune donnée de démonstration en dur dans les fichiers — 100% piloté par la base de données MySQL
  private getInitialLegalDocuments(): LegalDocument[] {
    return [];
  }
}

export const dbManager = new DatabaseManager();
