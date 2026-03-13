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

# Run silent install only once (config.php doesn't exist yet)
if [ ! -f /var/www/html/config.php ]; then
    echo "==> First run — writing config_si.php..."

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

    echo "==> Running PHP CLI silent installer (this may take a few minutes)..."
    cd /var/www/html
    php -d memory_limit=512M -r "
        define('sugarEntry', true);
        \$_SERVER['HTTP_HOST'] = 'localhost';
        \$_SERVER['SERVER_NAME'] = 'localhost';
        \$_SERVER['SERVER_PORT'] = '80';
        \$_SERVER['REQUEST_URI'] = '/install.php';
        \$_SERVER['SCRIPT_NAME'] = '/install.php';
        \$_SERVER['DOCUMENT_ROOT'] = '/var/www/html';
        \$_SERVER['SCRIPT_FILENAME'] = '/var/www/html/install.php';
        \$_SERVER['PHP_SELF'] = '/install.php';
        \$_GET['goto'] = 'SilentInstall';
        \$_GET['cli'] = true;
        include 'install.php';
    " 2>&1 | tail -30 || echo "==> PHP installer exited (see output above)"

    if [ -f /var/www/html/config.php ]; then
        echo "==> SuiteCRM installed successfully."
    else
        echo "==> Warning: config.php not found after install attempt."
        echo "==> Web-based installer will be available at: $SITE_URL"
    fi
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
