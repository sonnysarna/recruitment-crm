# Recruitment CRM — Cloud Deployment Guide

## What You've Got

| Layer | Technology | Purpose |
|-------|-----------|---------|
| CRM/ATS Core | SuiteCRM (Bitnami) | Candidate, job, client, placement records |
| Custom API | Node.js + Express | Recruitment-specific REST API with JWT auth |
| Database | MySQL 8.0 | Persistent data store |
| Proxy | Nginx + SSL | HTTPS termination, rate limiting, security |
| AI Layer | OpenAI GPT-4 API | Candidate scoring, skill inference, outreach drafting |

---

## Option A: Railway (Recommended — Easiest)

Railway supports Docker Compose natively. Fastest path to production.

### Steps

1. **Create account** at railway.app

2. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

3. **Create project**
   ```bash
   cd recruitment-crm
   railway init
   railway up
   ```

4. **Set environment variables** in Railway dashboard:
   - Copy all values from `.env.example`
   - Set `APP_HOST` to your Railway domain (e.g. `recruit-crm.up.railway.app`)
   - Generate a strong `JWT_SECRET`: `openssl rand -hex 64`
   - Set strong passwords for `DB_ROOT_PASSWORD` and `DB_PASSWORD`

5. **Add custom domain** (optional)
   - Railway dashboard → Settings → Domains → Add custom domain
   - Update DNS: CNAME `api.yourcompany.com` → Railway domain

6. **First-time SuiteCRM setup**
   ```bash
   bash scripts/setup-oauth.sh
   ```
   Follow the on-screen instructions to create the OAuth2 client.

7. **Deploy custom SuiteCRM fields**
   ```bash
   railway run docker exec recruit_suitecrm php -f /bitnami/suitecrm/custom/recruitment_fields.php
   ```

---

## Option B: Render

1. Connect your GitHub repo to Render
2. Create a "Blueprint" pointing to `docker-compose.yml`
3. Set environment variables in Render dashboard
4. Deploy

---

## Option C: DigitalOcean App Platform / Droplet

### App Platform (managed)
1. Create App → Docker Compose → connect repo
2. Set env vars
3. Deploy

### Droplet (self-managed VPS) — most control
```bash
# 1. SSH into your droplet
ssh root@your-droplet-ip

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y

# 3. Clone your repo
git clone https://github.com/yourorg/recruitment-crm.git
cd recruitment-crm

# 4. Configure environment
cp .env.example .env
nano .env   # fill in all values

# 5. Get SSL certificate (Let's Encrypt)
apt install certbot -y
certbot certonly --standalone -d yourcompany.com
cp /etc/letsencrypt/live/yourcompany.com/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/yourcompany.com/privkey.pem nginx/certs/

# 6. Launch everything
docker compose up -d

# 7. Monitor
docker compose logs -f
```

---

## SSL Certificates

### Let's Encrypt (recommended for VPS/Droplet)
```bash
certbot certonly --standalone -d api.yourcompany.com
# Certificates saved to: /etc/letsencrypt/live/api.yourcompany.com/
cp /etc/letsencrypt/live/api.yourcompany.com/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/api.yourcompany.com/privkey.pem nginx/certs/
```

### Railway/Render
These platforms handle SSL automatically — no certificate management needed.

---

## Post-Deployment Checklist

- [ ] SuiteCRM admin login works at `https://yourhost/crm/`
- [ ] API health check: `curl https://yourhost/health`
- [ ] API login works:
  ```bash
  curl -X POST https://yourhost/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@yourcompany.com","password":"RecruiterAdmin2026!"}'
  ```
- [ ] **CHANGE DEFAULT PASSWORD** in `scripts/init.sql` and restart
- [ ] API docs load at `https://yourhost/api/docs`
- [ ] OAuth2 client created in SuiteCRM
- [ ] `SUITECRM_API_CLIENT_ID` and `SUITECRM_API_CLIENT_SECRET` set in `.env`
- [ ] Custom recruitment fields deployed in SuiteCRM
- [ ] OpenAI API key set (if using AI features)
- [ ] Nginx IP restriction on `/crm/` set to your office IP

---

## API Quick Reference

All endpoints require `Authorization: Bearer <token>` (except `/health` and `/api/auth/login`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Current user |
| GET | `/api/candidates` | List candidates |
| POST | `/api/candidates` | Add candidate |
| PATCH | `/api/candidates/:id` | Update candidate |
| POST | `/api/candidates/:id/link-job` | Link to job |
| GET | `/api/jobs` | List jobs |
| POST | `/api/jobs` | Create job |
| PATCH | `/api/jobs/:id` | Update job |
| GET | `/api/jobs/:id/candidates` | Candidates for job |
| GET | `/api/clients` | List clients |
| POST | `/api/clients` | Add client |
| GET | `/api/placements` | List placements |
| POST | `/api/placements` | Record placement |
| PATCH | `/api/placements/:id/fee-paid` | Mark fee received |
| GET | `/api/pipeline` | Kanban pipeline view |
| PATCH | `/api/pipeline/jobs/:id/stage` | Move job stage |
| PATCH | `/api/pipeline/candidates/:id/stage` | Move candidate stage |
| GET | `/api/analytics/dashboard` | Dashboard summary |
| GET | `/api/analytics/revenue` | Revenue breakdown |
| GET | `/api/analytics/pipeline` | Pipeline value |
| POST | `/api/ai/score-candidate` | AI candidate scoring |
| POST | `/api/ai/infer-skills` | Extract/infer tech skills |
| POST | `/api/ai/draft-outreach` | Draft personalised outreach |
| POST | `/api/ai/extract-intake` | Parse intake call transcript |

Full interactive docs: `https://yourhost/api/docs`

---

## Extending the System

### Add a new recruiter user
```bash
node scripts/generate-password-hash.js "NewPassword123!"
# Insert into crm_api_users table with the hash
```

### Connect Make.com / Zapier
Use the API endpoints above as webhook targets. Authentication:
```
Header: Authorization: Bearer <your-jwt-token>
```

### Connect to Calendly
1. Get Calendly API key from calendly.com/integrations/api
2. Add webhook: when booking confirmed → `PATCH /api/pipeline/candidates/:id/stage` with `stage: Interviewing`

### Add arXiv sourcing trigger (Make.com)
1. RSS module → `https://arxiv.org/rss/cs.RO`
2. Parse author info
3. HTTP module → `POST /api/candidates` with extracted data
4. Tag with `specialisation: Robotics Software`
