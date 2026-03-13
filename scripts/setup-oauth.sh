#!/bin/bash
# ============================================================
#  SuiteCRM OAuth2 Setup Script
#  Run AFTER SuiteCRM first boots (usually 3-5 minutes)
#
#  Usage: bash scripts/setup-oauth.sh
# ============================================================

set -e

# Load env
source .env 2>/dev/null || { echo "ERROR: .env file not found. Copy .env.example to .env first."; exit 1; }

SUITECRM_URL="${SUITECRM_URL:-http://localhost/crm}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Recruitment CRM — OAuth2 Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This script will:"
echo "  1. Log in to SuiteCRM"
echo "  2. Create an OAuth2 client for the API"
echo "  3. Update your .env with the credentials"
echo ""
echo "SuiteCRM URL: $SUITECRM_URL"
echo ""

# Wait for SuiteCRM to be ready
echo "Waiting for SuiteCRM to be ready..."
for i in $(seq 1 30); do
    if curl -sf "${SUITECRM_URL}/index.php" > /dev/null 2>&1; then
        echo "✓ SuiteCRM is up!"
        break
    fi
    echo "  Attempt $i/30 — retrying in 10s..."
    sleep 10
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MANUAL STEP REQUIRED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "SuiteCRM OAuth2 clients must be created via the UI:"
echo ""
echo "  1. Open: ${SUITECRM_URL}/index.php?module=Administration&action=index"
echo "  2. Log in with: ${SUITECRM_ADMIN_USER} / [your password]"
echo "  3. Navigate to: Admin > OAuth2 Clients & Tokens > Add OAuth2 Client"
echo "  4. Fill in:"
echo "       Name:          Recruitment API"
echo "       Secret:        [generate a strong random string]"
echo "       Redirect URI:  https://${APP_HOST}/api/auth/callback"
echo "       Grant Type:    Password"
echo "  5. Save and copy the Client ID and Secret"
echo "  6. Update your .env:"
echo "       SUITECRM_API_CLIENT_ID=<your client id>"
echo "       SUITECRM_API_CLIENT_SECRET=<your client secret>"
echo "  7. Restart the API container:"
echo "       docker compose restart api"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate a JWT secret if not set
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "change_me_generate_with_openssl_rand_hex_64" ]; then
    NEW_SECRET=$(openssl rand -hex 64)
    echo "Generated JWT_SECRET: $NEW_SECRET"
    echo "Update your .env with: JWT_SECRET=$NEW_SECRET"
    echo ""
fi

echo "After completing the OAuth2 setup, verify your API is working:"
echo ""
echo "  # Test health"
echo "  curl https://${APP_HOST}/health"
echo ""
echo "  # Test login"
echo "  curl -X POST https://${APP_HOST}/api/auth/login \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"admin@yourcompany.com\",\"password\":\"RecruiterAdmin2026!\"}'"
echo ""
echo "  # API docs"
echo "  open https://${APP_HOST}/api/docs"
echo ""
