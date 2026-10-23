export type Role = 'super_admin' | 'directeur' | 'conseiller_senior' | 'conseiller_junior' | 'support' | 'admin' | 'agent';
export type UserRole = 'super_admin' | 'directeur' | 'conseiller_senior' | 'conseiller_junior' | 'support' | 'admin' | 'agent';

export interface UserPermissions {
  canManageBot?: boolean;
  canToggleBot?: boolean;
  canEditForm?: boolean;
  canViewSubmissions?: boolean;
  canManageSubmissions?: boolean;
  canManageSubmissionTags?: boolean;
  canViewStats?: boolean;
  canManageTeam?: boolean;
  canAccessTeamChat?: boolean;
  canConfigureMySQL?: boolean;
  canExportData?: boolean;
  canManageUsers?: boolean;
  canAssignAdminTags?: boolean;
  canBlockIps?: boolean;
  canInterveneChat?: boolean;
  canModifyNames?: boolean;
  canModifyPosts?: boolean;
  canAssignSpecialTags?: boolean;
  canManagePermissions?: boolean;
  canUnassignBooked?: boolean;
  canMergeClients?: boolean;
  canSendNewsletter?: boolean;
  canManagePdfTemplates?: boolean;
}

export interface NewsletterPreferences {
  offersExclusive: boolean;
  lastMinuteAlerts: boolean;
  cruisesSpecials: boolean;
  sunDestinations: boolean;
  frequency: 'all' | 'weekly' | 'monthly';
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: 'active' | 'unsubscribed';
  preferences: NewsletterPreferences;
  subscribedAt: string;
  unsubscribedAt?: string;
  token: string;
  source: 'website_footer' | 'quote_form' | 'admin_import' | 'manual';
}

export interface NewsletterCampaign {
  id: string;
  subject: string;
  previewText?: string;
  content: string; // HTML or Markdown
  category: 'all' | 'last_minute' | 'croisiere' | 'forfait_sud' | 'vip_exclusive';
  targetAudience?: string;
  sentByUserId: string;
  sentByUserName: string;
  sentAt: string;
  recipientsCount: number;
  status: 'sent' | 'draft';
}

export interface PasswordResetCode {
  id: string;
  email: string;
  code: string;
  token: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
  createdByAdmin?: boolean;
}

export interface TagColorConfig {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  hex: string;
  isAdminOnly?: boolean;
}

export interface SystemRole {
  id: string;
  name: string;
  description: string;
  badgeColor: string;
  grade: string;
  roleKey: UserRole;
  permissions: UserPermissions;
  defaultSpecialTag?: string;
  specialTags?: string[];
  isDefault?: boolean;
}

export interface User {
  id: string;
  username?: string;
  password?: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  systemRoleId?: string;
  grade: string;
  specialTag: string;
  specialTags?: string[];
  specialTagEnabled: boolean;
  permissions: UserPermissions;
  status?: 'disponible' | 'indisponible';
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'totp' | 'email' | 'both';
  twoFactorSecret?: string;
}

export interface ProgrammedResponses {
  welcome: string;
  quoteRequest: string;
  agentRequestOnline: string;
  agentRequestOffline: string;
  destinationsInfo: string;
  generalFallback: string;
}

export interface BrandingSettings {
  agencyName: string;
  agencyLogoUrl: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  primaryColor: string;
}

export interface ChatbotSettings {
  id?: number;
  botName: string;
  botTag: string;
  botEnabled: boolean;
  offlineMessage: string;
  welcomeMessage: string;
  agentNotificationEmail: string;
  quoteRedirectUrl: string;
  systemPrompt: string;
  showAgentTags: boolean;
  primaryColor: string;
  blockedIps?: string[];
  blockedIpReasons?: Record<string, string>;
  fallbackModeEnabled?: boolean;
  forceProgrammedMode?: boolean;
  programmedResponses?: ProgrammedResponses;
  quickReplyOptions?: string[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'visitor' | 'bot' | 'agent';
  senderName: string;
  senderTag?: string;
  senderTags?: string[];
  senderGrade?: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  isAgentHandoff?: boolean;
  isJoinNotice?: boolean;
  isTimeoutIntervention?: boolean;
  suggestedTags?: string[];
  visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    interest?: string;
  };
}

export interface ChatConversation {
  id: string;
  visitorName: string;
  visitorEmail?: string;
  visitorPhone?: string;
  visitorIp?: string;
  isBlocked?: boolean;
  blockReason?: string;
  status: 'active' | 'waiting_agent' | 'resolved';
  unreadAgent: boolean;
  createdAt: string;
  updatedAt: string;
  waitingSince?: string;
  callbackRequested?: boolean;
  timeoutIntervened?: boolean;
  botEnabledForConv?: boolean;
  archived?: boolean;
  agentJoined?: {
    id?: string;
    name: string;
    grade: string;
    tag?: string;
    avatar?: string;
    joinedAt: string;
  };
  messages: ChatMessage[];
}

export type ServiceType =
  | 'forfait_tout_inclus'
  | 'famille'
  | 'vol_hotel'
  | 'croisiere'
  | 'battre_prix'
  | 'vol_seul'
  | 'location_auto'
  | 'personnalise';

export type CallStatus =
  | 'a_appeler'
  | 'appele_non_repondu'
  | 'appele_contact_etabli'
  | 'devis_en_cours'
  | 'devis_envoye'
  | 'reserve'
  | 'perdu';

export interface SubmissionNote {
  id: string;
  authorName: string;
  authorGrade: string;
  text: string;
  createdAt: string;
}

export interface QuoteSubmission {
  id: string;
  referenceNumber: string;
  serviceType: ServiceType;
  departureCity: string;
  destination: string;
  departureDate: string;
  endDate?: string;
  returnDate?: string;
  isFlexibleDate: boolean;
  duration: string;
  // Page 1 options
  hotelName?: string;
  hotelClassification?: string;
  hotelCategory?: string;
  mealPlan?: string;
  flightDirectOnly?: boolean;
  cruiseCabinType?: string;
  cruiseLine?: string;
  cruiseDeparturePort?: string;
  cruiseRequiresFlights?: boolean;
  cruiseFlightDepartureCity?: string;
  carRentalRequested?: boolean;
  carCategory?: string;
  carPickupLocation?: string;
  carDropoffLocation?: string;
  carSameDropoffLocation?: boolean;
  carRentalStartDate?: string;
  carRentalEndDate?: string;
  carDriverAge?: string;
  customProjectType?: 'sur_mesure' | 'battre_prix';
  competitorUrl?: string;
  competitorTargetPrice?: string;
  competitorDetails?: string;
  // Options Vol Seul / Forfait / Vol + Hôtel
  flightTripType?: 'aller_retour' | 'aller_simple' | 'multi_destinations';
  flightClass?: string;
  cabinClass?: string;
  allInclusiveFlightClass?: string;
  volHotelFlightClass?: string;
  volHotelHotelCategory?: string;
  flightOnlyNoHotelConfirmed?: boolean;
  // Page 2: Voyageurs & Chambres & Assurances
  roomsCount?: number;
  adultsCount: number;
  childrenCount: number;
  childrenAges?: string;
  childrenAgesList?: number[];
  travelInsurance?: 'oui' | 'non' | 'deja_assure';
  insuranceConfirmedNo?: boolean;
  insuranceTypeSelected?: string;
  vacationFinancing?: 'oui' | 'non';
  budgetPerPerson?: string;
  // Page 3: Coordonnées
  fullName?: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  preferredCallTime: 'matin' | 'apres-midi' | 'soiree' | 'tout_temps';
  customerNotes?: string;
  callStatus: CallStatus;
  callAttempts: number;
  assignedToUserId?: string;
  assignedToUserName?: string;
  notes: SubmissionNote[];
  emailCustomerSent: boolean;
  emailCustomerSender?: string;
  emailAgencySent: boolean;
  emailAgencyRecipient?: string;
  tags?: string[];
  proposals?: SubmissionProposalItem[];
  proposalsSentAt?: string;
  proposalsSentBy?: string;
  proposalsSentToEmail?: string;
  selectedProposalId?: string;
  selectedProposalTitle?: string;
  selectedProposalHotel?: string;
  selectedProposalPrice?: string;
  selectedProposalChosenAt?: string;
  selectedProposalChosenBy?: string;
  selectedProposalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionProposalItem {
  id: string;
  title: string;
  hotelOrCruiseName: string;
  destination: string;
  departureCity: string;
  arrivalAirportOrPort?: string;
  supplier?: string; // Fournisseur / Voyagiste (Transat, Sunwing, Air Canada, etc.)
  airlineAndFlight: string;
  departureFlightDate?: string;
  departureFlightNumber?: string;
  returnFlightDate?: string;
  returnFlightNumber?: string;
  datesAndDuration: string;
  roomOrCabinType: string;
  pricePerPerson: string;
  totalPrice: string;
  inclusions: string;
  advisorHighlight?: string;
}

export interface SubmissionProposalsPayload {
  submissionId: string;
  customerEmail: string;
  agencyEmail: string;
  advisorMessage: string;
  advisorUserId?: string;
  advisorName: string;
  advisorRole?: string;
  advisorEmail?: string;
  advisorPhone?: string;
  priceDisclaimer: string;
  proposals: SubmissionProposalItem[];
}

export interface FormServiceConfig {
  id: ServiceType;
  title: string;
  subtitle: string;
  icon: string;
  enabled: boolean;
  badge?: string;
}

export interface FormConfig {
  title: string;
  subtitle: string;
  notificationEmail: string;
  agencyLogoUrl?: string;
  agencyName?: string;
  agencyPhone?: string;
  agencyTagline?: string;
  tabTitles?: Record<string, string>;
  tabDescriptions?: Record<string, string>;
  services: FormServiceConfig[];
  departureCities: string[];
  destinations: string[];
  durations: string[];
  hotelCategories: string[];
  mealPlans: string[];
  cruiseCabins: string[];
  cruiseLines: string[];
  budgetRanges: string[];
  insuranceTypes: string[];
  disclaimerInsuranceText: string;
  financingAvailable: boolean;
  // Options configurables demandées
  allInclusiveFlightClasses?: string[]; // Classe de cabine pour Tout-Inclus
  volHotelFlightClasses?: string[]; // Classe de cabine pour Vol + Hôtel
  volHotelHotelCategories?: string[]; // Options / Catégories d'hôtel pour Vol + Hôtel
  cruiseDeparturePorts?: string[]; // Ports d'embarquement / départ pour Croisières
  carRentalCategories?: string[]; // Catégories de location de véhicules
}

export interface TeamAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
}

export type FileAttachment = TeamAttachment;

export interface TeamMessage {
  id: string;
  channelId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userGrade: string;
  userTag?: string;
  userTags?: string[];
  userTagEnabled?: boolean;
  text: string;
  attachments?: FileAttachment[];
  timestamp?: string;
  createdAt: string;
}

export interface PushNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'new_quote' | 'agent_requested' | 'team_chat' | 'new_submission' | 'chat_alert' | 'admin_broadcast' | 'admin_alert' | string;
  referenceId?: string;
  targetUserId?: string; // 'all' or specific user ID
  targetUserName?: string;
  senderName?: string;
  read?: boolean;
  isRead?: boolean;
  timestamp?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalSubmissions: number;
  pendingCalls: number;
  completedReservations: number;
  conversionRate: number;
  activeChatConversations: number;
  topDestinations: { name: string; count: number }[];
}

export interface DbStatus {
  mode: 'mysql' | 'json_fallback';
  connected: boolean;
  host: string;
  port: number;
  database: string;
  error?: string;
  counts: {
    submissions: number;
    conversations: number;
    teamMessages: number;
    users: number;
  };
  tableCounts?: Record<string, number>;
  lastSyncedAt?: string;
}

export interface ClientRecord {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  authorName: string;
  authorGrade?: string;
  text: string;
  createdAt: string;
}

export interface ClientProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
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
  submissionsCount: number;
  traveledCount: number; // Number of times traveled with us (submissions where callStatus === 'reserve')
  callStatusCounts: Record<string, number>;
  firstSubmissionDate: string;
  lastSubmissionDate: string;
  destinations: string[];
  departureCities: string[];
  serviceTypes: ServiceType[];
  assignedAdvisors: string[];
  preferredCallTime?: string;
  budgetSummary?: string;
  notes: ClientNote[];
  tags: string[];
  submissions: QuoteSubmission[];
}

export interface InvoiceArticleCatalog {
  id: string;
  title: string;
  category: string;
  defaultPrice: number;
  description: string;
}

export interface InvoiceItem {
  id: string;
  articleId?: string;
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // ex: FAC-2026-0042
  clientKey: string; // email:xyz or phone:xyz
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  submissionId?: string;
  submissionRef?: string;
  destination?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRateTPS: number; // 0.05
  taxRateTVQ: number; // 0.09975
  taxTPS: number;
  taxTVQ: number;
  taxExempt: boolean;
  total: number;
  currency: 'CAD' | 'USD';
  status: 'en_attente' | 'payee' | 'annulee' | 'remboursee';
  paymentMethod: 'stripe' | 'virement' | 'carte_agence';
  stripePaymentLink: string;
  stripeSessionId?: string;
  paidAt?: string;
  createdAt: string;
  dueDate: string;
  createdByUserId: string;
  createdByUserName: string;
  notes?: string;
  lastEmailSentAt?: string;
  // Vérification d'identité demandée par l'utilisateur
  requireIdentityVerification?: boolean;
  identityVerificationStatus?: 'non_requis' | 'en_attente' | 'verifie' | 'rejete';
  identityDocumentType?: 'passeport' | 'permis_conduire' | 'carte_nationale';
  identityVerifiedAt?: string;
  identityDocumentUrl?: string;
}

export type LegalDocumentCategory =
  | 'contrat_voyage'
  | 'autorisation_paiement'
  | 'decharge_assurance'
  | 'decharge_responsabilite'
  | 'declaration_medicale'
  | 'autre';

export type LegalDocumentStatus =
  | 'brouillon'
  | 'envoye'
  | 'consulte'
  | 'signe'
  | 'expire';

export interface LegalDocument {
  id: string;
  title: string;
  category: LegalDocumentCategory;
  clientKey: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  submissionId?: string;
  submissionRef?: string;
  destination?: string;
  status: LegalDocumentStatus;
  contentSummary?: string;
  documentBodyHtml?: string;
  fileAttachmentName?: string;
  fileAttachmentBase64?: string;
  fileAttachmentSize?: string;
  signatureToken?: string;
  signedAt?: string;
  signedByIp?: string;
  signatureDataUrl?: string;
  signatureSignerName?: string;
  sentAt?: string;
  sentByAdvisorName?: string;
  templateId?: string;
  lockedForAdvisors?: boolean;
  headerSubtitle?: string;
  footerLegalNote?: string;
  accentColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegalDocumentTemplate {
  id: string;
  title: string;
  category: LegalDocumentCategory;
  description: string;
  defaultFileName: string;
  bodyTemplate: string;
  headerSubtitle?: string;
  footerLegalNote?: string;
  accentColor?: string;
  lockedForAdvisors?: boolean;
  createdByUserName?: string;
  updatedAt?: string;
}

export interface NextcloudCustomizationConfig {
  logoUrl?: string;
  logoMode: 'logo_and_text' | 'logo_only' | 'text_only';
  logoHeightPx: number;
  logoFit: 'contain' | 'cover';
  brandTitle: string;
  brandSubtitle: string;
  primaryColor: string;
  accentColor: string;
  intranetDomain: string;
  appBaseUrl: string;
  headerMode: '0' | 'compact' | 'classic';
  defaultTab: string;
  enableDashboardWidgets: boolean;
  widgetSoumissionsEnabled: boolean;
  widgetMartineEnabled: boolean;
  widgetCrmEnabled: boolean;
  widgetChatEnabled: boolean;
  widgetHeightPx: number;
  ssoAutoLoginUser: string;
  allowPublicIframe: boolean;
}
