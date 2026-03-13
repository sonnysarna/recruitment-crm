-- ============================================================
--  Recruitment CRM — Database Initialisation
--  Runs once on first MySQL container startup
-- ============================================================

-- Use the recruitment DB
USE recruitment_crm;

-- ── API Users Table ──────────────────────────────────────────
-- Used by the custom API layer for authentication
-- (SuiteCRM has its own user table; this is for the API wrapper)
CREATE TABLE IF NOT EXISTS crm_api_users (
    id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role        ENUM('admin', 'recruiter', 'readonly') DEFAULT 'recruiter',
    active      TINYINT(1)   DEFAULT 1,
    last_login  DATETIME,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- ── API Audit Log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_audit_log (
    id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
    user_id     VARCHAR(36),
    method      VARCHAR(10),
    endpoint    VARCHAR(500),
    status_code SMALLINT,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(500),
    duration_ms INT,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_endpoint (endpoint(100))
);

-- ── Saved AI Scores ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_candidate_scores (
    id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    candidate_id    VARCHAR(36) NOT NULL,     -- SuiteCRM Contact ID
    job_id          VARCHAR(36) NOT NULL,     -- SuiteCRM Opportunity ID
    overall_score   TINYINT UNSIGNED,
    technical_fit   TINYINT UNSIGNED,
    seniority_fit   TINYINT UNSIGNED,
    location_fit    TINYINT UNSIGNED,
    recommended_action VARCHAR(20),
    score_json      JSON,
    model_used      VARCHAR(50),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_candidate (candidate_id),
    INDEX idx_job (job_id),
    INDEX idx_score (overall_score)
);

-- ── Outreach Sequences ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach_sequences (
    id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    candidate_id    VARCHAR(36) NOT NULL,
    job_id          VARCHAR(36),
    channel         ENUM('email', 'linkedin', 'sms') NOT NULL,
    step            TINYINT UNSIGNED DEFAULT 1,
    status          ENUM('pending', 'sent', 'replied', 'bounced', 'opted_out') DEFAULT 'pending',
    scheduled_at    DATETIME,
    sent_at         DATETIME,
    replied_at      DATETIME,
    message_preview TEXT,
    created_by      VARCHAR(36),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_candidate (candidate_id),
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_at)
);

-- ── Revenue Snapshots ─────────────────────────────────────────
-- Periodic snapshots for fast dashboard queries
CREATE TABLE IF NOT EXISTS revenue_snapshots (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    snapshot_date   DATE NOT NULL,
    total_fees      DECIMAL(12,2) DEFAULT 0,
    paid_fees       DECIMAL(12,2) DEFAULT 0,
    pending_fees    DECIMAL(12,2) DEFAULT 0,
    placement_count SMALLINT DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_date (snapshot_date)
);

-- ── Seed default admin user ───────────────────────────────────
-- Password: RecruiterAdmin2026! (bcrypt hash)
-- CHANGE THIS IMMEDIATELY after first deploy
INSERT IGNORE INTO crm_api_users (id, email, name, password_hash, role)
VALUES (
    UUID(),
    'admin@yourcompany.com',
    'Admin',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TsuFiClkj0rEL.jHnWO.GKbNUmBi',  -- RecruiterAdmin2026!
    'admin'
);

-- ============================================================
--  Done — SuiteCRM will create its own tables on first boot
-- ============================================================
