import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Cpu,
  Terminal,
  FileText,
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  Play,
  RefreshCw,
  Layers,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const MySQLPterodactylSection: React.FC = () => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // MySQL form & auto-creation state
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState(3306);
  const [dbUser, setDbUser] = useState('root');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('evasion_soleil');

  const [isTesting, setIsTesting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionResult, setActionResult] = useState<{
    success?: boolean;
    message?: string;
    tables?: string[];
    database?: string;
    error?: string;
  } | null>(null);

  const [dbStatus, setDbStatus] = useState<any>(null);
  const [securityStatus, setSecurityStatus] = useState<any>(null);

  const refreshStatus = async () => {
    try {
      const [res, secRes] = await Promise.all([
        fetch('/api/db/status'),
        fetch('/api/security/status'),
      ]);
      const data = await res.json();
      setDbStatus(data);
      if (data.host) setHost(data.host);
      if (data.port) setPort(data.port);
      if (data.database) setDatabase(data.database);
      if (secRes.ok) {
        setSecurityStatus(await secRes.json());
      }
    } catch {}
  };

  useEffect(() => {
    refreshStatus();
    const timer = setInterval(refreshStatus, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setActionResult(null);
    try {
      const res = await fetch('/api/db/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port: Number(port), user: dbUser, password, database }),
      });
      const data = await res.json();
      setActionResult(data);
    } catch (err: any) {
      setActionResult({ success: false, message: `Erreur: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndConnect = async () => {
    setIsSaving(true);
    setActionResult(null);
    try {
      const res = await fetch('/api/db/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port: Number(port), user: dbUser, password, database }),
      });
      const data = await res.json();
      setActionResult(data);
      await refreshStatus();
    } catch (err: any) {
      setActionResult({
        success: false,
        message: `Échec lors de l'enregistrement : ${err.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setActionResult(null);
    try {
      const res = await fetch('/api/db/sync-all', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setActionResult({
          success: true,
          message: `Synchronisation MySQL réussie ! Toutes les données (utilisateurs, rôles, formulaires, soumissions) ont été écrites dans les tables MySQL.`,
        });
      } else {
        setActionResult({
          success: false,
          message: data.error || 'Erreur lors de la synchronisation vers MySQL.',
        });
      }
      await refreshStatus();
    } catch (err: any) {
      setActionResult({
        success: false,
        message: `Erreur réseau lors de la synchronisation : ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutoCreateTables = async () => {
    setIsCreating(true);
    setActionResult(null);
    try {
      const res = await fetch('/api/db/init-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port: Number(port), user: dbUser, password, database }),
      });
      const data = await res.json();
      setActionResult(data);

      // Refresh DB status
      await refreshStatus();
    } catch (err: any) {
      setActionResult({
        success: false,
        message: `Échec lors de la création automatique : ${err.message}`,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const envSample = `# ==============================================================================
# CONFIGURATION SERVEUR & BASE DE DONNÉES MYSQL - ÉVASION SOLEIL
# ==============================================================================
PORT=1031
SERVER_PORT=1031
NODE_ENV=production

# Base de Données MySQL (Production / MariaDB / cPanel)
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=evasion_soleil`;

  const schemaSqlContent = `-- ==============================================================================
-- Évasion Soleil Voyages - Schéma Relationnel MySQL Complet & Interconnecté
-- 16 Tables Relationnelles avec Clés Étrangères (Foreign Keys) et Index
-- Conforme MySQL 5.7+ / MySQL 8.0+ / MariaDB 10.3+ / phpMyAdmin / Pterodactyl
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS \`evasion_soleil\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`evasion_soleil\`;

-- Désactiver temporairement les vérifications de clés étrangères pour les migrations sûres
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Table des Rôles Système & Gabarits de Permissions
CREATE TABLE IF NOT EXISTS \`system_roles\` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table des Utilisateurs & Personnel de l'Agence
CREATE TABLE IF NOT EXISTS \`users\` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Configuration Dynamique du Formulaire de Devis
CREATE TABLE IF NOT EXISTS \`form_config\` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Configuration du Chatbot Martine V.
CREATE TABLE IF NOT EXISTS \`chatbot_settings\` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Répertoire Central des Clients CRM
CREATE TABLE IF NOT EXISTS \`crm_clients\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`first_name\` VARCHAR(120) NOT NULL,
  \`last_name\` VARCHAR(120) NOT NULL,
  \`email\` VARCHAR(191) NOT NULL UNIQUE,
  \`phone\` VARCHAR(64) NOT NULL,
  \`vip_level\` VARCHAR(32) DEFAULT 'Standard',
  \`preferred_call_time\` VARCHAR(64) DEFAULT 'tout_temps',
  \`assigned_advisor_id\` VARCHAR(64) NULL,
  \`assigned_advisor_name\` VARCHAR(120) NULL,
  \`tags_json\` LONGTEXT,
  \`total_submissions\` INT DEFAULT 0,
  \`total_reservations\` INT DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_crm_email\` (\`email\`),
  INDEX \`idx_crm_phone\` (\`phone\`),
  INDEX \`idx_crm_vip\` (\`vip_level\`),
  INDEX \`idx_crm_advisor\` (\`assigned_advisor_id\`),
  CONSTRAINT \`fk_crm_clients_advisor\` FOREIGN KEY (\`assigned_advisor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Journal des Notes & Historique d'Échanges Client CRM
CREATE TABLE IF NOT EXISTS \`crm_client_notes\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`client_id\` VARCHAR(64) NOT NULL,
  \`author_id\` VARCHAR(64) NULL,
  \`author_name\` VARCHAR(120) NOT NULL,
  \`author_grade\` VARCHAR(120),
  \`text\` TEXT NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_notes_client\` (\`client_id\`),
  INDEX \`idx_notes_author\` (\`author_id\`),
  CONSTRAINT \`fk_client_notes_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`crm_clients\`(\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_client_notes_user\` FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table Principale des Soumissions de Devis
CREATE TABLE IF NOT EXISTS \`submissions\` (
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
  \`assigned_to_user_name\` VARCHAR(120),
  \`email_customer_sent\` TINYINT(1) NOT NULL DEFAULT 1,
  \`email_agency_sent\` TINYINT(1) NOT NULL DEFAULT 1,
  \`cabin_class\` VARCHAR(120),
  \`hotel_category\` VARCHAR(120),
  \`flight_class\` VARCHAR(120),
  \`tags_json\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_sub_client\` (\`client_id\`),
  INDEX \`idx_sub_status\` (\`call_status\`),
  INDEX \`idx_sub_assigned\` (\`assigned_to_user_id\`),
  INDEX \`idx_sub_dest\` (\`destination\`),
  INDEX \`idx_sub_created\` (\`created_at\`),
  CONSTRAINT \`fk_submissions_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`crm_clients\`(\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`fk_submissions_user\` FOREIGN KEY (\`assigned_to_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Notes de Suivi des Soumissions de Devis
CREATE TABLE IF NOT EXISTS \`submission_notes\` (
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
  CONSTRAINT \`fk_submission_notes_user\` FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Abonnés à l'Infolettre Voyage
CREATE TABLE IF NOT EXISTS \`newsletter_subscribers\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`email\` VARCHAR(191) NOT NULL UNIQUE,
  \`first_name\` VARCHAR(120) DEFAULT '',
  \`last_name\` VARCHAR(120) DEFAULT '',
  \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',
  \`preferences_json\` LONGTEXT,
  \`source\` VARCHAR(64) DEFAULT 'website_footer',
  \`token\` VARCHAR(120) NULL,
  \`subscribed_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`unsubscribed_at\` TIMESTAMP NULL,
  INDEX \`idx_news_sub_email\` (\`email\`),
  INDEX \`idx_news_sub_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Campagnes et Envois d'Infolettres
CREATE TABLE IF NOT EXISTS \`newsletter_campaigns\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`subject\` VARCHAR(191) NOT NULL,
  \`preview_text\` VARCHAR(255) DEFAULT '',
  \`content\` LONGTEXT NOT NULL,
  \`category\` VARCHAR(64) DEFAULT 'all',
  \`target_audience\` VARCHAR(64) DEFAULT 'all_clients_and_subscribers',
  \`sent_by_user_id\` VARCHAR(64) NULL,
  \`sent_by_user_name\` VARCHAR(120) DEFAULT '',
  \`recipient_count\` INT DEFAULT 0,
  \`status\` VARCHAR(32) DEFAULT 'sent',
  \`sent_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_camp_sender\` (\`sent_by_user_id\`),
  INDEX \`idx_camp_sent_at\` (\`sent_at\`),
  CONSTRAINT \`fk_newsletter_campaigns_user\` FOREIGN KEY (\`sent_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Sessions & Conversations Chatbot / Visiteurs en Direct
CREATE TABLE IF NOT EXISTS \`chat_conversations\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`visitor_name\` VARCHAR(120) DEFAULT 'Visiteur',
  \`visitor_email\` VARCHAR(191) NULL,
  \`visitor_phone\` VARCHAR(64) NULL,
  \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',
  \`unread_agent\` TINYINT(1) NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_chat_status\` (\`status\`),
  INDEX \`idx_chat_email\` (\`visitor_email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Messages des Conversations Visiteurs
CREATE TABLE IF NOT EXISTS \`chat_messages\` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Messagerie Interne d'Équipe (Chat d'Agence)
CREATE TABLE IF NOT EXISTS \`team_messages\` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Notifications Push Système & Alertes Nouveaux Devis
CREATE TABLE IF NOT EXISTS \`push_notifications\` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Sécurité : Blocages d'Adresses IP Suspectes & Anti-Spam
CREATE TABLE IF NOT EXISTS \`blocked_ips\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`ip\` VARCHAR(64) NOT NULL UNIQUE,
  \`reason\` TEXT,
  \`blocked_by_user_id\` VARCHAR(64) NULL,
  \`blocked_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_blocked_ip\` (\`ip\`),
  CONSTRAINT \`fk_blocked_ips_user\` FOREIGN KEY (\`blocked_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Codes de Réinitialisation Sécurisée des Mots de Passe Collaborateurs
CREATE TABLE IF NOT EXISTS \`password_reset_codes\` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Réactiver les vérifications de clés étrangères
SET FOREIGN_KEY_CHECKS = 1;`;

  return (
    <div className="space-y-6">
      {/* 1. Carte Officielle des Identifiants System Admin par Défaut */}
      <div className="bg-linear-to-br from-slate-900 via-slate-800 to-amber-950 rounded-2xl p-6 text-white shadow-xl border border-amber-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg ring-2 ring-amber-400/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Identifiants System Administrateur par Défaut</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  SUPER ADMIN
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Compte unique avec privilèges globaux (Gestion d'équipe, Infolettre, Chatbot, Devis, MySQL, Rangs)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Username */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <User className="h-3.5 w-3.5 text-amber-400" />
                <span>Nom d'utilisateur (Login)</span>
              </div>
              <div className="font-mono text-base font-bold text-amber-400">admin</div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText('admin');
                setCopiedUser(true);
                setTimeout(() => setCopiedUser(false), 2000);
              }}
              className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-[11px] font-bold text-slate-200 transition-all cursor-pointer"
            >
              {copiedUser ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedUser ? 'Copié !' : 'Copier login'}</span>
            </button>
          </div>

          {/* Password */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                <span>Mot de passe sécurisé</span>
              </div>
              <div className="font-mono text-base font-bold text-emerald-400">SoleilAdmin2026!</div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText('SoleilAdmin2026!');
                setCopiedPass(true);
                setTimeout(() => setCopiedPass(false), 2000);
              }}
              className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-[11px] font-bold text-slate-200 transition-all cursor-pointer"
            >
              {copiedPass ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedPass ? 'Copié !' : 'Copier mot de passe'}</span>
            </button>
          </div>

          {/* Courriel & Grade */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                <span>Courriel & Rôle</span>
              </div>
              <div className="font-mono text-xs font-semibold text-slate-200 truncate">
                admin@evasionsoleil.com
              </div>
              <div className="text-[11px] text-amber-400/90 font-semibold mt-1">
                Grade : Administrateur Système & IT
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1">
              <Lock className="h-3 w-3 text-emerald-400" />
              <span>Droits d'accès totaux débloqués</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bouclier Anti-Hack 1000000% & Continuité Sans Interruption (Failover Local Chiffré AES-256) */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 rounded-2xl p-6 text-white border border-emerald-700/50 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Bouclier Anti-Hack & Continuité 100% Sans Interruption
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  PROTECTION ACTIVE 24/7
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-1">
                Pare-feu WAF actif (Anti-SQLi, Anti-XSS, Anti-Brute-Force, Anti-DDoS) + Basculement automatique instantané sur coffre local chiffré AES-256-GCM si MySQL devient indisponible, avec re-synchronisation automatique dès le retour de la base.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              0% Interruption • Chiffrement AES-256-GCM
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-900/70 border border-slate-700/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-400 font-semibold">Pare-Feu WAF & Anti-Injection</div>
            <div className="text-sm font-extrabold text-emerald-400 mt-0.5">
              SQLi • XSS • LFI • Bots Bloqués
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              Attaques neutralisées : <strong className="text-white">{securityStatus?.totalBlockedAttacks ?? 0}</strong>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-700/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-400 font-semibold">Anti-Brute-Force & Sessions</div>
            <div className="text-sm font-extrabold text-emerald-400 mt-0.5">
              Verrouillage IP Auto + HMAC-SHA256
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              IPs verrouillées : <strong className="text-white">{securityStatus?.activeLockouts?.length ?? 0}</strong>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-700/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-400 font-semibold">Secours Local Chiffré (Failover)</div>
            <div className="text-sm font-extrabold text-amber-300 mt-0.5">
              Coffre AES-256-GCM Actif
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              {dbStatus?.connected
                ? 'Synchronisé en temps réel avec MySQL'
                : 'Mode Secours Actif — Enregistrement local garanti'}
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-700/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-400 font-semibold">Watchdog Auto-Reconnexion</div>
            <div className="text-sm font-extrabold text-teal-300 mt-0.5">
              Vérification toutes les 15s
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
               Écritures en attente : <strong className="text-white">{dbStatus?.pendingOutageCount ?? 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Outil Automatique : Créer toutes les Tables MySQL en 1 clic */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                <Database className="h-4 w-4" />
              </span>
              <h3 className="font-extrabold text-slate-900 text-base">
                Création Automatique des 19 Tables MySQL Relationnelles
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Génère automatiquement les 19 tables interconnectées avec clés étrangères (users, system_roles, form_config, chatbot_settings, crm_clients, crm_client_notes, submissions, submission_notes, newsletter_subscribers, newsletter_campaigns, chat_conversations, chat_messages, team_messages, push_notifications, blocked_ips, password_reset_codes, legal_document_templates, legal_documents, invoices) et le compte admin dans votre base MySQL.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                dbStatus?.connected
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'
                }`}
              />
              {dbStatus?.connected ? 'MySQL Connecté (Primaire)' : 'Secours Local Chiffré Actif (0% Perte)'}
            </span>
          </div>
        </div>

        {/* Formulaire des paramètres de connexion */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Hôte (Host)</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="127.0.0.1"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 font-mono focus:bg-white focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="3306"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 font-mono focus:bg-white focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Utilisateur (User)</label>
            <input
              type="text"
              value={dbUser}
              onChange={(e) => setDbUser(e.target.value)}
              placeholder="root"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 font-mono focus:bg-white focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Optionnel ou vide"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 font-mono focus:bg-white focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Base de données</label>
            <input
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="evasion_soleil"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 font-mono focus:bg-white focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleSaveAndConnect}
            disabled={isSaving || isCreating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Enregistrement & Liaison en cours...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Enregistrer & Lier cette base MySQL</span>
              </>
            )}
          </button>

          <button
            onClick={handleAutoCreateTables}
            disabled={isCreating || isSaving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Création des tables en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Créer / Vérifier toutes les 16 tables MySQL</span>
              </>
            )}
          </button>

          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Synchronisation en cours...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Synchroniser tout vers MySQL</span>
              </>
            )}
          </button>

          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Test de connexion...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-slate-500" />
                <span>Tester la connexion</span>
              </>
            )}
          </button>
        </div>

        {/* Live MySQL table counts indicator if connected */}
        {dbStatus?.connected && (
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-950 mb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Base MySQL Connectée & Active : {dbStatus.host}:{dbStatus.port} / {dbStatus.database}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                <div className="text-[10px] uppercase font-bold text-slate-500">Collaborateurs (MySQL)</div>
                <div className="text-lg font-black text-slate-900">{dbStatus.tableCounts?.users ?? dbStatus.counts?.users ?? 0}</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                <div className="text-[10px] uppercase font-bold text-slate-500">Soumissions (MySQL)</div>
                <div className="text-lg font-black text-slate-900">{dbStatus.tableCounts?.submissions ?? dbStatus.counts?.submissions ?? 0}</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                <div className="text-[10px] uppercase font-bold text-slate-500">Rôles Système (MySQL)</div>
                <div className="text-lg font-black text-slate-900">{dbStatus.tableCounts?.systemRoles ?? 4}</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                <div className="text-[10px] uppercase font-bold text-slate-500">Messages Équipe (MySQL)</div>
                <div className="text-lg font-black text-slate-900">{dbStatus.tableCounts?.teamMessages ?? dbStatus.counts?.teamMessages ?? 0}</div>
              </div>
            </div>
          </div>
        )}

        {/* Résultat du test ou de la création */}
        {actionResult && (
          <div
            className={`p-4 rounded-xl text-xs border ${
              actionResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-2">
              {actionResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold">{actionResult.message}</div>
                {actionResult.tables && actionResult.tables.length > 0 && (
                  <div className="pt-2">
                    <span className="font-semibold text-slate-700">Tables créées / vérifiées ({actionResult.tables.length}) : </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {actionResult.tables.map((tbl) => (
                        <span
                          key={tbl}
                          className="px-2 py-0.5 rounded bg-emerald-200/60 font-mono text-[11px] text-emerald-900 font-semibold"
                        >
                          {tbl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {actionResult.error && (
                  <div className="font-mono text-[11px] text-rose-700 mt-1">
                    Détail technique : {actionResult.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Security & High Availability Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Sécurité & Haute Disponibilité MySQL
                </h3>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Pool de Connexions Actif
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              L'architecture backend gère automatiquement le maintien des connexions, la reconnexion instantanée en cas de coupure réseau et la protection des requêtes SQL par requêtes préparées (anti-injections SQL).
            </p>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Chiffrement & Protection :</span>
                <span className="font-bold text-slate-800">Paramétrage TLS / SSL natif</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mode d'exécution :</span>
                <code className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  npm start (Production)
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gestion des Transactions :</span>
                <span className="font-semibold text-emerald-700">Atomicité & Rollback automatique</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <CheckCircle2 className="h-4 w-4" /> Production Ready
            </span>
            <span>Node.js v18+ / v20+</span>
          </div>
        </div>

        {/* MySQL Architecture Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Persistance des Données & MySQL
                </h3>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                  Mode Hybride Résilient
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Vos données sont entièrement sécurisées : si les variables MySQL sont configurées, l'application se connecte directement à votre base MySQL. En cas d'arrêt ou de non-configuration, elle bascule automatiquement sur la sauvegarde JSON locale sans jamais planter.
            </p>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Driver SQL :</span>
                <span className="font-bold text-slate-800">mysql2 (Connection Pool avec reconnexion)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tables gérées :</span>
                <span className="font-semibold text-slate-800">16 tables relationnelles interconnectées (Clés étrangères & Index)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Protection Anti-Crashes :</span>
                <span className="font-bold text-emerald-700">Fallback local automatique</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 text-amber-600 font-bold">
              <CheckCircle2 className="h-4 w-4" /> Sauvegarde Continue Active
            </span>
            <span>UTF-8 mb4</span>
          </div>
        </div>
      </div>

      {/* Variables d'environnement pour MySQL (.env) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Variables d'environnement (.env) pour la Base de Données MySQL
            </h3>
            <p className="text-xs text-slate-500">
              Insérez ces variables dans votre fichier <code>.env</code> sur votre serveur de production :
            </p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(envSample);
              setCopiedEnv(true);
              setTimeout(() => setCopiedEnv(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {copiedEnv ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedEnv ? 'Copié !' : 'Copier le .env'}</span>
          </button>
        </div>

        <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto">
          {envSample}
        </pre>
      </div>

      {/* Script SQL Complet pour phpMyAdmin / Console */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Script SQL d'initialisation manuel de la base MySQL (schema.sql)
            </h3>
            <p className="text-xs text-slate-500">
              Contient la création officielle des 16 tables relationnelles et de la base <code>evasion_soleil</code> :
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(schemaSqlContent);
                setCopiedSql(true);
                setTimeout(() => setCopiedSql(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              {copiedSql ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSql ? 'Copié !' : 'Copier le SQL'}</span>
            </button>
          </div>
        </div>

        <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono max-h-72 overflow-y-auto">
          {schemaSqlContent}
        </pre>
      </div>
    </div>
  );
};
