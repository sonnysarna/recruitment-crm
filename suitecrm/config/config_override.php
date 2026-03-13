<?php
/**
 * SuiteCRM Config Override
 * Recruitment-specific configuration for Physical AI & Robotics agency
 *
 * This file is mounted into the SuiteCRM container and applies on top
 * of the default config. Do NOT edit config.php directly.
 */

// ── API Settings ─────────────────────────────────────────────
$sugar_config['site_url']              = 'https://' . getenv('APP_HOST');
$sugar_config['enable_oauth2']         = true;
$sugar_config['oauth2_access_token_lifetime']   = 3600;        // 1 hour
$sugar_config['oauth2_refresh_token_lifetime']  = 1209600;     // 14 days

// ── Performance ───────────────────────────────────────────────
$sugar_config['cache_dir']             = 'cache/';
$sugar_config['disable_persistent_connections'] = false;

// ── Security ──────────────────────────────────────────────────
$sugar_config['default_password_hash'] = 'bcrypt';
$sugar_config['session_timeout']       = 28800;      // 8 hours
$sugar_config['login_max_attempts']    = 5;
$sugar_config['login_lockout_duration'] = 900;       // 15 mins

// ── Disable unused modules to keep UI clean ──────────────────
$sugar_config['hide_subpanels_on_login'] = true;
$sugar_config['disable_export']        = false;

// ── Email ──────────────────────────────────────────────────────
// Configure SMTP in Admin > Email Settings after first login
$sugar_config['mail_sendtype']         = 'SMTP';

// ── Currency ──────────────────────────────────────────────────
$sugar_config['default_currency_name']   = 'British Pound';
$sugar_config['default_currency_symbol'] = '£';
$sugar_config['default_currency_iso4217_code'] = 'GBP';

// ── Date/Time ─────────────────────────────────────────────────
$sugar_config['default_date_format']   = 'd/m/Y';
$sugar_config['default_time_format']   = 'H:i';
$sugar_config['default_timezone']      = 'Europe/London';

// ── Recruitment workflow: custom field defaults ───────────────
// These are applied via the Studio and vardefs — see custom-modules/

// ── Log settings ──────────────────────────────────────────────
$sugar_config['log_memory_usage']      = false;
$sugar_config['logger_level']          = 'error';   // error in prod
$sugar_config['logger_max_log_size']   = '10MB';
