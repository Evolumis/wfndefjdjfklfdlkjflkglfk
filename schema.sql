-- ==============================================================================
-- Évasion Soleil Voyages - Schéma Relationnel MySQL Complet & Interconnecté
-- 16 Tables Relationnelles avec Clés Étrangères (Foreign Keys) et Index
-- Conforme MySQL 5.7+ / MySQL 8.0+ / MariaDB 10.3+ / phpMyAdmin / Pterodactyl
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `evasion_soleil` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `evasion_soleil`;

-- Désactiver temporairement les vérifications de clés étrangères pour les migrations sûres
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. Table des Rôles Système & Gabarits de Permissions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_roles` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT,
  `badge_color` VARCHAR(64) DEFAULT 'bg-teal-600 text-white',
  `grade` VARCHAR(120) NOT NULL,
  `role_key` VARCHAR(64) NOT NULL DEFAULT 'agent',
  `default_special_tag` VARCHAR(64),
  `special_tags_json` LONGTEXT,
  `permissions_json` LONGTEXT NOT NULL,
  `is_default` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Table des Utilisateurs & Personnel de l'Agence
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) PRIMARY KEY,
  `username` VARCHAR(64) UNIQUE,
  `password` VARCHAR(255) NOT NULL DEFAULT 'SoleilAdmin2026!',
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `avatar` TEXT,
  `role` VARCHAR(64) NOT NULL DEFAULT 'agent',
  `grade` VARCHAR(120) NOT NULL DEFAULT 'Conseiller Voyages',
  `special_tag` VARCHAR(64) NOT NULL DEFAULT 'CONSEILLER',
  `special_tags_json` LONGTEXT,
  `special_tag_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `status` VARCHAR(32) NOT NULL DEFAULT 'disponible',
  `can_manage_bot` TINYINT(1) NOT NULL DEFAULT 0,
  `can_toggle_bot` TINYINT(1) NOT NULL DEFAULT 1,
  `can_edit_form` TINYINT(1) NOT NULL DEFAULT 0,
  `can_view_submissions` TINYINT(1) NOT NULL DEFAULT 1,
  `can_manage_submissions` TINYINT(1) NOT NULL DEFAULT 1,
  `can_manage_submission_tags` TINYINT(1) NOT NULL DEFAULT 0,
  `can_view_stats` TINYINT(1) NOT NULL DEFAULT 1,
  `can_manage_team` TINYINT(1) NOT NULL DEFAULT 0,
  `can_access_team_chat` TINYINT(1) NOT NULL DEFAULT 1,
  `can_configure_mysql` TINYINT(1) NOT NULL DEFAULT 0,
  `can_export_data` TINYINT(1) NOT NULL DEFAULT 0,
  `can_manage_users` TINYINT(1) NOT NULL DEFAULT 0,
  `can_assign_admin_tags` TINYINT(1) NOT NULL DEFAULT 0,
  `can_block_ips` TINYINT(1) NOT NULL DEFAULT 0,
  `can_intervene_chat` TINYINT(1) NOT NULL DEFAULT 1,
  `can_modify_names` TINYINT(1) NOT NULL DEFAULT 0,
  `can_modify_posts` TINYINT(1) NOT NULL DEFAULT 0,
  `can_assign_special_tags` TINYINT(1) NOT NULL DEFAULT 0,
  `can_manage_permissions` TINYINT(1) NOT NULL DEFAULT 0,
  `can_send_newsletter` TINYINT(1) NOT NULL DEFAULT 1,
  `permissions_json` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Configuration Dynamique du Formulaire de Devis
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `form_config` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `title` VARCHAR(191) NOT NULL DEFAULT 'Demande de Devis Voyage Personnalisé',
  `subtitle` TEXT,
  `notification_email` VARCHAR(191) NOT NULL DEFAULT 'info@evasionsoleil.com',
  `agency_logo_url` TEXT,
  `agency_name` VARCHAR(191) DEFAULT 'Évasion Soleil Voyages Inc.',
  `agency_phone` VARCHAR(64) DEFAULT '1-800-555-SOLEIL',
  `agency_tagline` TEXT,
  `services_json` LONGTEXT NOT NULL,
  `departure_cities_json` LONGTEXT NOT NULL,
  `destinations_json` LONGTEXT NOT NULL,
  `durations_json` LONGTEXT NOT NULL,
  `hotel_categories_json` LONGTEXT,
  `meal_plans_json` LONGTEXT,
  `cruise_cabins_json` LONGTEXT NOT NULL,
  `cruise_lines_json` LONGTEXT NOT NULL,
  `budget_ranges_json` LONGTEXT NOT NULL,
  `insurance_types_json` LONGTEXT,
  `disclaimer_insurance_text` TEXT,
  `financing_available` TINYINT(1) DEFAULT 1,
  `all_inclusive_flight_classes_json` LONGTEXT,
  `vol_hotel_flight_classes_json` LONGTEXT,
  `vol_hotel_hotel_categories_json` LONGTEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Paramètres du Chatbot Martine V. & Intelligence Artificielle
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chatbot_settings` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `bot_name` VARCHAR(64) NOT NULL DEFAULT 'Martine V.',
  `bot_tag` VARCHAR(32) NOT NULL DEFAULT 'BOT',
  `bot_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `offline_message` TEXT NOT NULL,
  `welcome_message` TEXT NOT NULL,
  `agent_notification_email` VARCHAR(191) NOT NULL DEFAULT 'info@evasionsoleil.com',
  `quote_redirect_url` VARCHAR(255) NOT NULL DEFAULT 'https://evasionsoleil.com/devis',
  `system_prompt` TEXT NOT NULL,
  `show_agent_tags` TINYINT(1) NOT NULL DEFAULT 1,
  `primary_color` VARCHAR(32) NOT NULL DEFAULT '#338b84',
  `blocked_ips_json` LONGTEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Répertoire Client CRM Centralisé (Clients de l'Agence)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `crm_clients` (
  `id` VARCHAR(64) PRIMARY KEY,
  `first_name` VARCHAR(120) NOT NULL,
  `last_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `phone` VARCHAR(64) NOT NULL,
  `vip_level` VARCHAR(64) DEFAULT 'Standard',
  `preferred_call_time` VARCHAR(64) DEFAULT 'tout_temps',
  `assigned_advisor_id` VARCHAR(64) NULL,
  `assigned_advisor_name` VARCHAR(120) NULL,
  `tags_json` LONGTEXT,
  `total_submissions` INT DEFAULT 0,
  `total_reservations` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_crm_clients_email` (`email`),
  INDEX `idx_crm_clients_phone` (`phone`),
  INDEX `idx_crm_clients_advisor` (`assigned_advisor_id`),
  CONSTRAINT `fk_crm_client_advisor` FOREIGN KEY (`assigned_advisor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Table des Soumissions de Devis Voyage (Connectée aux Clients et Conseillers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `submissions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `client_id` VARCHAR(64) NULL,
  `reference_number` VARCHAR(64) NOT NULL UNIQUE,
  `service_type` VARCHAR(64) NOT NULL,
  `departure_city` VARCHAR(120) NOT NULL,
  `destination` VARCHAR(120) NOT NULL,
  `departure_date` DATE NOT NULL,
  `is_flexible_date` TINYINT(1) NOT NULL DEFAULT 0,
  `duration` VARCHAR(120) NOT NULL,
  `adults_count` INT NOT NULL DEFAULT 2,
  `children_count` INT NOT NULL DEFAULT 0,
  `children_ages` VARCHAR(120),
  `budget_per_person` VARCHAR(120),
  `cruise_cabin_type` VARCHAR(120),
  `cruise_line` VARCHAR(120),
  `competitor_url` TEXT,
  `competitor_target_price` VARCHAR(120),
  `customer_first_name` VARCHAR(120) NOT NULL,
  `customer_last_name` VARCHAR(120) NOT NULL,
  `customer_email` VARCHAR(191) NOT NULL,
  `customer_phone` VARCHAR(64) NOT NULL,
  `preferred_call_time` VARCHAR(64) DEFAULT 'tout_temps',
  `customer_notes` TEXT,
  `call_status` VARCHAR(64) NOT NULL DEFAULT 'a_appeler',
  `call_attempts` INT NOT NULL DEFAULT 0,
  `assigned_to_user_id` VARCHAR(64) NULL,
  `assigned_to_user_name` VARCHAR(120) NULL,
  `email_customer_sent` TINYINT(1) NOT NULL DEFAULT 1,
  `email_agency_sent` TINYINT(1) NOT NULL DEFAULT 1,
  `cabin_class` VARCHAR(120),
  `hotel_category` VARCHAR(120),
  `flight_class` VARCHAR(120),
  `tags_json` LONGTEXT,
  `proposals_json` LONGTEXT,
  `proposals_sent_at` TIMESTAMP NULL,
  `proposals_sent_by` VARCHAR(120) NULL,
  `proposals_sent_to_email` VARCHAR(191) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_submissions_status` (`call_status`),
  INDEX `idx_submissions_created` (`created_at`),
  INDEX `idx_submissions_email` (`customer_email`),
  INDEX `idx_submissions_client` (`client_id`),
  INDEX `idx_submissions_assigned` (`assigned_to_user_id`),
  CONSTRAINT `fk_submissions_client` FOREIGN KEY (`client_id`) REFERENCES `crm_clients`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_submissions_assigned_user` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Notes de Suivi des Devis (Journal d'appels des conseillers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `submission_notes` (
  `id` VARCHAR(64) PRIMARY KEY,
  `submission_id` VARCHAR(64) NOT NULL,
  `author_id` VARCHAR(64) NULL,
  `author_name` VARCHAR(120) NOT NULL,
  `author_grade` VARCHAR(120) NOT NULL,
  `text` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sub_notes_sub` (`submission_id`),
  INDEX `idx_sub_notes_author` (`author_id`),
  CONSTRAINT `fk_submission_notes_sub` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submission_notes_author` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Notes de Dossier Client CRM (Historique Relation Client)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `crm_client_notes` (
  `id` VARCHAR(64) PRIMARY KEY,
  `client_id` VARCHAR(64) NOT NULL,
  `author_id` VARCHAR(64) NULL,
  `author_name` VARCHAR(120) NOT NULL,
  `author_grade` VARCHAR(120),
  `text` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_client_notes_client` (`client_id`),
  INDEX `idx_client_notes_author` (`author_id`),
  CONSTRAINT `fk_client_notes_client` FOREIGN KEY (`client_id`) REFERENCES `crm_clients`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_client_notes_author` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Abonnés à l'Infolettre & Campagnes Marketing
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `newsletter_subscribers` (
  `id` VARCHAR(64) PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `first_name` VARCHAR(120) DEFAULT '',
  `last_name` VARCHAR(120) DEFAULT '',
  `status` ENUM('active', 'unsubscribed') NOT NULL DEFAULT 'active',
  `preferences_json` LONGTEXT,
  `source` VARCHAR(64) DEFAULT 'website_footer',
  `token` VARCHAR(120) UNIQUE,
  `subscribed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `unsubscribed_at` DATETIME NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_newsletter_email` (`email`),
  INDEX `idx_newsletter_status` (`status`),
  INDEX `idx_newsletter_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Historique des Campagnes d'Infolettre & Diffusions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `newsletter_campaigns` (
  `id` VARCHAR(64) PRIMARY KEY,
  `subject` VARCHAR(255) NOT NULL,
  `preview_text` TEXT,
  `content` LONGTEXT NOT NULL,
  `category` VARCHAR(64) NOT NULL DEFAULT 'all',
  `target_audience` VARCHAR(64) NOT NULL DEFAULT 'all_clients_and_subscribers',
  `sent_by_user_id` VARCHAR(64) NULL,
  `sent_by_user_name` VARCHAR(120),
  `recipient_count` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(32) NOT NULL DEFAULT 'sent',
  `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_campaigns_sent_by` (`sent_by_user_id`),
  INDEX `idx_campaigns_sent_at` (`sent_at`),
  CONSTRAINT `fk_campaigns_user` FOREIGN KEY (`sent_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. Conversations du Clavardage Visiteurs (Chatbot Martine V. & Reprises)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chat_conversations` (
  `id` VARCHAR(64) PRIMARY KEY,
  `visitor_name` VARCHAR(120) DEFAULT 'Visiteur',
  `visitor_email` VARCHAR(191),
  `visitor_phone` VARCHAR(64),
  `visitor_ip` VARCHAR(64),
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `unread_agent` TINYINT(1) NOT NULL DEFAULT 0,
  `assigned_agent_id` VARCHAR(64) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_conv_email` (`visitor_email`),
  INDEX `idx_conv_status` (`status`),
  INDEX `idx_conv_assigned` (`assigned_agent_id`),
  CONSTRAINT `fk_chat_conversations_agent` FOREIGN KEY (`assigned_agent_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. Messages du Clavardage (Visiteur / IA / Conseiller Humain)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` VARCHAR(64) PRIMARY KEY,
  `conversation_id` VARCHAR(64) NOT NULL,
  `sender` ENUM('visitor', 'bot', 'agent') NOT NULL,
  `sender_name` VARCHAR(120) NOT NULL,
  `sender_tag` VARCHAR(64),
  `sender_grade` VARCHAR(120),
  `text` TEXT NOT NULL,
  `is_agent_handoff` TINYINT(1) DEFAULT 0,
  `visitor_info_json` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_chat_msg_conv` (`conversation_id`),
  CONSTRAINT `fk_chat_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. Messagerie Interne d'Équipe (Chat d'Agence)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `team_messages` (
  `id` VARCHAR(64) PRIMARY KEY,
  `channel_id` VARCHAR(64) NOT NULL DEFAULT 'general',
  `user_id` VARCHAR(64) NOT NULL,
  `user_name` VARCHAR(120) NOT NULL,
  `user_grade` VARCHAR(120) NOT NULL,
  `user_tag` VARCHAR(64),
  `user_tag_enabled` TINYINT(1) DEFAULT 1,
  `text` TEXT NOT NULL,
  `attachments_json` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_team_msg_user` (`user_id`),
  INDEX `idx_team_msg_channel` (`channel_id`),
  CONSTRAINT `fk_team_messages_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. Notifications Push Système & Alertes Nouveaux Devis
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `push_notifications` (
  `id` VARCHAR(64) PRIMARY KEY,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(64) NOT NULL DEFAULT 'new_quote',
  `reference_id` VARCHAR(64),
  `target_user_id` VARCHAR(64) DEFAULT 'all',
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_push_target` (`target_user_id`),
  INDEX `idx_push_read` (`is_read`),
  INDEX `idx_push_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 15. Sécurité : Blocages d'Adresses IP Suspectes & Anti-Spam
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blocked_ips` (
  `id` VARCHAR(64) PRIMARY KEY,
  `ip` VARCHAR(64) NOT NULL UNIQUE,
  `reason` TEXT,
  `blocked_by_user_id` VARCHAR(64) NULL,
  `blocked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_blocked_ip` (`ip`),
  CONSTRAINT `fk_blocked_ips_user` FOREIGN KEY (`blocked_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 16. Codes de Réinitialisation Sécurisée des Mots de Passe Collaborateurs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `password_reset_codes` (
  `id` VARCHAR(64) PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL,
  `code` VARCHAR(16) NOT NULL,
  `token` VARCHAR(120) NOT NULL UNIQUE,
  `expires_at` DATETIME NOT NULL,
  `used` TINYINT(1) DEFAULT 0,
  `created_by_admin` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_reset_email` (`email`),
  INDEX `idx_reset_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 17. Modèles de Documents Légaux & PDF (Gabarits Officiels OPC)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `legal_document_templates` (
  `id` VARCHAR(64) PRIMARY KEY,
  `title` VARCHAR(191) NOT NULL,
  `category` VARCHAR(64) NOT NULL DEFAULT 'contrat_voyage',
  `description` TEXT,
  `content` LONGTEXT NOT NULL,
  `is_locked` TINYINT(1) DEFAULT 0,
  `raw_data_json` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 18. Documents Légaux & Signatures Électroniques Clients
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `legal_documents` (
  `id` VARCHAR(64) PRIMARY KEY,
  `client_key` VARCHAR(191) NOT NULL,
  `client_name` VARCHAR(160) NOT NULL,
  `client_email` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `category` VARCHAR(64) NOT NULL DEFAULT 'contrat_voyage',
  `status` VARCHAR(32) NOT NULL DEFAULT 'brouillon',
  `content` LONGTEXT NOT NULL,
  `pdf_base64` LONGTEXT,
  `pdf_file_name` VARCHAR(255),
  `signed_at` DATETIME NULL,
  `signer_name` VARCHAR(160),
  `signer_ip` VARCHAR(64),
  `signer_user_agent` TEXT,
  `signature_data_url` LONGTEXT,
  `doc_data_json` LONGTEXT,
  `raw_data_json` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_legaldoc_client` (`client_key`),
  INDEX `idx_legaldoc_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 19. Facturation & Paiements Stripe (Invoices)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(64) PRIMARY KEY,
  `invoice_number` VARCHAR(64) NOT NULL,
  `client_key` VARCHAR(191) NOT NULL,
  `client_name` VARCHAR(160) NOT NULL,
  `client_email` VARCHAR(191) NOT NULL,
  `client_phone` VARCHAR(64),
  `submission_id` VARCHAR(64),
  `submission_ref` VARCHAR(64),
  `destination` VARCHAR(160),
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `currency` VARCHAR(16) NOT NULL DEFAULT 'CAD',
  `status` VARCHAR(32) NOT NULL DEFAULT 'en_attente',
  `payment_method` VARCHAR(32) NOT NULL DEFAULT 'stripe',
  `due_date` VARCHAR(32),
  `paid_at` VARCHAR(64),
  `created_by_user_id` VARCHAR(64),
  `created_by_user_name` VARCHAR(120),
  `raw_data_json` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_inv_client` (`client_key`),
  INDEX `idx_inv_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Réactiver les vérifications de clés étrangères
SET FOREIGN_KEY_CHECKS = 1;
