#!/bin/bash
# Route stderr to stdout so Railway captures all output
exec 2>&1

echo "==> entrypoint.sh starting..."

# Map Railway MySQL env vars to our expected vars
DB_HOST="${MYSQLHOST:-${DATABASE_HOST:-mysql}}"
DB_PORT="${MYSQLPORT:-${DATABASE_PORT:-3306}}"
DB_NAME="${MYSQLDATABASE:-${DATABASE_NAME:-suitecrm}}"
DB_USER="${MYSQLUSER:-${DATABASE_USER:-suitecrm}}"
DB_PASS="${MYSQLPASSWORD:-${DATABASE_PASSWORD:-suitecrm}}"

ADMIN_USER="${SUITECRM_USERNAME:-admin}"
ADMIN_PASS="${SUITECRM_PASSWORD:-RecruiterAdmin2026!}"
ADMIN_EMAIL="${SUITECRM_EMAIL:-admin@recruityear.com}"
SITE_URL="${SITE_URL:-http://localhost}"

echo "==> DB_HOST=$DB_HOST  DB_PORT=$DB_PORT  DB_NAME=$DB_NAME  DB_USER=$DB_USER"
echo "==> Waiting for MySQL TCP port at $DB_HOST:$DB_PORT..."
until (echo > /dev/tcp/$DB_HOST/$DB_PORT) 2>/dev/null; do
    echo "    MySQL not ready yet, retrying in 3s..."
    sleep 3
done
echo "==> MySQL port is open."

# Write silent-install config so the web installer auto-populates on first visit
if [ ! -f /var/www/html/config.php ]; then
    echo "==> First run — writing config_si.php for web installer..."

    cat > /var/www/html/config_si.php << ENDCONFIG
<?php
\$sugar_config_si = array(
  'setup_db_host_name'              => '$DB_HOST',
  'setup_db_port'                   => '$DB_PORT',
  'setup_db_database_name'          => '$DB_NAME',
  'setup_db_username'               => '$DB_USER',
  'setup_db_password'               => '$DB_PASS',
  'setup_db_type'                   => 'mysql',
  'setup_db_create_database'        => '0',
  'setup_db_drop_tables'            => '0',
  'setup_db_admin_username'         => '$DB_USER',
  'setup_db_admin_password'         => '$DB_PASS',
  'setup_site_admin_user_name'      => '$ADMIN_USER',
  'setup_site_admin_password'       => '$ADMIN_PASS',
  'setup_site_admin_email'          => '$ADMIN_EMAIL',
  'setup_site_url'                  => '$SITE_URL',
  'setup_system_name'               => 'Recruitment CRM',
  'default_currency_name'           => 'British Pound',
  'default_currency_symbol'         => '£',
  'default_currency_iso4217'        => 'GBP',
  'default_currency_significant_digits' => '2',
  'default_date_format'             => 'd/m/Y',
  'default_time_format'             => 'H:i',
  'default_language'                => 'en_us',
  'setup_license_agrement_accept'   => 'I Agree',
);
ENDCONFIG

    chown www-data:www-data /var/www/html/config_si.php
    echo "==> config_si.php written. Visit $SITE_URL to complete installation via web installer."
else
    echo "==> SuiteCRM already installed (config.php present), skipping setup."
fi

# Ensure correct permissions on writable dirs
echo "==> Setting file permissions..."
mkdir -p /var/www/html/upload /var/www/html/cache /var/www/html/custom
chown -R www-data:www-data \
    /var/www/html/upload \
    /var/www/html/cache \
    /var/www/html/custom \
    /var/www/html/modules \
    /var/www/html/themes 2>/dev/null || true

echo "==> Starting Apache..."
exec apache2-foreground
