FROM php:8.1-apache

# Install system dependencies and PHP extensions
RUN apt-get update && apt-get install -y \
    libzip-dev zip unzip curl default-mysql-client \
    libpng-dev libjpeg-dev libwebp-dev \
    libicu-dev libxml2-dev \
    libcurl4-openssl-dev libonig-dev \
    && docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install \
       zip pdo pdo_mysql mysqli gd intl xml curl bcmath mbstring iconv \
    && rm -rf /var/lib/apt/lists/*

# PHP tuning
RUN { \
    echo "memory_limit = 512M"; \
    echo "max_execution_time = 300"; \
    echo "upload_max_filesize = 50M"; \
    echo "post_max_size = 50M"; \
    echo "date.timezone = Europe/London"; \
    echo "error_reporting = E_ALL & ~E_NOTICE & ~E_DEPRECATED"; \
    } > /usr/local/etc/php/conf.d/suitecrm.ini

# Download SuiteCRM 7.14.4 into /opt/suitecrm (NOT /var/www/html which may be a volume mount)
RUN curl -fsSL -o /tmp/suitecrm.zip \
    "https://github.com/salesagility/SuiteCRM/releases/download/v7.14.4/SuiteCRM-7.14.4.zip" \
    && unzip -q /tmp/suitecrm.zip -d /tmp/suitecrm_src \
    && SUITECRM_DIR=$(find /tmp/suitecrm_src -maxdepth 3 -name "index.php" | xargs grep -l "sugarEntry\|SuiteCRM" 2>/dev/null | head -1 | xargs dirname) \
    && echo "Found SuiteCRM at: $SUITECRM_DIR" \
    && mkdir -p /opt/suitecrm \
    && cp -r "$SUITECRM_DIR/." /opt/suitecrm/ \
    && rm -rf /tmp/suitecrm.zip /tmp/suitecrm_src \
    && chown -R www-data:www-data /opt/suitecrm \
    && chmod -R 755 /opt/suitecrm

# Apache virtual host config
RUN printf '<VirtualHost *:80>\n\
    DocumentRoot /var/www/html\n\
    <Directory /var/www/html>\n\
        AllowOverride All\n\
        Require all granted\n\
        Options -Indexes +FollowSymLinks\n\
    </Directory>\n\
    ErrorLog ${APACHE_LOG_DIR}/error.log\n\
    CustomLog ${APACHE_LOG_DIR}/access.log combined\n\
</VirtualHost>\n' > /etc/apache2/sites-available/000-default.conf

# Fix Apache MPM conflict: forcibly remove event/worker symlinks, enable only prefork
RUN rm -f /etc/apache2/mods-enabled/mpm_event.conf \
           /etc/apache2/mods-enabled/mpm_event.load \
           /etc/apache2/mods-enabled/mpm_worker.conf \
           /etc/apache2/mods-enabled/mpm_worker.load && \
    a2enmod mpm_prefork rewrite headers

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
CMD ["/entrypoint.sh"]
