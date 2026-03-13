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

# Download SuiteCRM 7.14.4 release (pre-built, no composer needed)
RUN curl -fsSL -o /tmp/suitecrm.zip \
    "https://github.com/salesagility/SuiteCRM/releases/download/v7.14.4/SuiteCRM-7.14.4.zip" \
    && unzip -q /tmp/suitecrm.zip -d /tmp/suitecrm_src \
    && SUITECRM_DIR=$(find /tmp/suitecrm_src -name "index.php" -maxdepth 3 | head -1 | xargs dirname) \
    && cp -r "$SUITECRM_DIR/." /var/www/html/ \
    && rm -rf /tmp/suitecrm.zip /tmp/suitecrm_src \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 775 \
       /var/www/html/upload \
       /var/www/html/cache \
       /var/www/html/custom \
       /var/www/html/modules \
       /var/www/html/themes \
       /var/www/html/data 2>/dev/null || true

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
