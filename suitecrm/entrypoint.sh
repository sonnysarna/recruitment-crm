#!/bin/bash
set -e

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

echo "==> Waiting for MySQL at $DB_HOST:$DB_PORT..."
until mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT 1" >/dev/null 2>&1; do
    echo "    MySQL not ready yet, retrying in 3s..."
    sleep 3
done
echo "==> MySQL is ready."

# Run silent install only once (config.php doesn't exist yet)
if [ ! -f /var/www/html/config.php ]; then
    echo "==> First run — starting SuiteCRM silent installer..."

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

    # Start Apache temporarily so the installer can run over HTTP
    apache2ctl start
    sleep 3

    echo "==> Running installer via HTTP..."
    curl -s -o /tmp/install_out.txt -L \
        "http://localhost/index.php?module=Administration&action=DiagnosticRun" \
        -d "module=Configurator&action=index&setup_db_host_name=$DB_HOST" 2>&1 || true

    # Use PHP CLI installer (more reliable)
    cd /var/www/html
    php -d memory_limit=512M -r "
        define('sugarEntry', true);
        \$_SERVER['HTTP_HOST'] = 'localhost';
        \$_SERVER['SERVER_NAME'] = 'localhost';
        \$_SERVER['REQUEST_URI'] = '/install.php';
        \$_GET['goto'] = 'SilentInstall';
        \$_GET['cli'] = true;
        include 'install.php';
    " 2>&1 | tail -20 || true

    apache2ctl stop
    sleep 2

    if [ -f /var/www/html/config.php ]; then
        echo "==> SuiteCRM installed successfully."
    else
        echo "==> Silent install may not have completed. SuiteCRM web installer will be available at your URL."
    fi
else
    echo "==> SuiteCRM already installed, skipping setup."
fi

# Ensure upload dir exists and permissions are correct
mkdir -p /var/www/html/upload /var/www/html/cache /var/www/html/custom
chown -R www-data:www-data /var/www/html/upload /var/www/html/cache /var/www/html/custom /var/www/html/modules /var/www/html/themes 2>/dev/null || true

echo "==> Starting Apache..."
exec apache2-foreground
