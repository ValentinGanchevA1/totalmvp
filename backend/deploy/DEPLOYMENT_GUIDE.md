# G88 Backend - Render Deployment Guide

Complete guide to deploying the G88 backend to Render with PostgreSQL (PostGIS), Redis, and all required services.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Infrastructure Overview](#infrastructure-overview)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Post-Deployment Tasks](#post-deployment-tasks)
8. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
9. [Cost Breakdown](#cost-breakdown)

---

## Prerequisites

Before starting, ensure you have:

- [ ] Render account (create at https://render.com)
- [ ] Git repository pushed to GitHub/GitLab/Bitbucket (Render deploys from Git)
- [ ] Production credentials ready for all third-party services
- [ ] Your repository connected to Render (done during first deployment)

### Third-Party Services Needed

| Service | Purpose | Get Credentials |
|---------|---------|-----------------|
| **Stripe** | Payment processing | https://dashboard.stripe.com/apikeys |
| **Twilio** | SMS notifications | https://console.twilio.com |
| **SendGrid** | Email service | https://app.sendgrid.com/settings/api_keys |
| **AWS S3** | File storage | https://console.aws.amazon.com/iam |
| **Google OAuth** | Authentication | https://console.cloud.google.com/apis/credentials |

---

## Quick Start

### Deployment via Render Dashboard (Recommended)

```bash
# 1. Commit and push render.yaml to Git
git add .
git commit -m "Add Render deployment configuration"
git push

# 2. Run deployment helper (opens Render dashboard)
cd backend/deploy
./deploy-render.sh      # Mac/Linux
# or
deploy-render.bat       # Windows

# 3. In Render Dashboard:
#    - Click "New Blueprint Instance"
#    - Connect your Git repository
#    - Select branch and set blueprint path: backend/render.yaml
#    - Click "Apply"

# 4. Wait for deployment to complete (~5-10 minutes)

# 5. Set environment variables in Render Dashboard
#    (See "Environment Variables" section below)

# 6. Run database migrations via Shell in Render Dashboard
#    npm run migration:run
```

### Alternative: Manual Service Creation

See [Step-by-Step Deployment](#step-by-step-deployment) below for manual service creation.

---

## Infrastructure Overview

The `render.yaml` blueprint creates:

### 1. PostgreSQL Database (with PostGIS)
- **Type**: Docker-based private service
- **Image**: postgis/postgis:15-3.3
- **Extensions**: PostGIS, PostGIS Topology, UUID-OSSP
- **Plan**: Starter ($7/month) or Free
- **Storage**: 10GB disk

### 2. Redis Cache
- **Type**: Managed Redis service
- **Plan**: Starter ($7/month) or Free
- **Policy**: allkeys-lru (evict least recently used keys)

### 3. Web Service (NestJS Backend)
- **Type**: Node.js web service
- **Runtime**: Node.js (latest LTS)
- **Plan**: Starter ($7/month) or Free
- **Auto-deploy**: Enabled on git push
- **Health Check**: `/api/v1/health`

---

## Step-by-Step Deployment

### Step 1: Prepare Repository

1. **Commit all changes**:
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin master
   ```

2. **Ensure render.yaml is in backend directory**:
   ```
   backend/
   ├── render.yaml
   ├── deploy/
   │   ├── Dockerfile.postgres
   │   ├── init.sql
   │   └── ...
   └── ...
   ```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub/GitLab/Bitbucket
3. Authorize Render to access your repository

### Step 3: Deploy Using Blueprint

**Option A: Deployment Helper Script (Recommended)**
```bash
cd backend/deploy
./deploy-render.sh      # Mac/Linux
# or
deploy-render.bat       # Windows
```
This will open your browser and guide you through the process.

**Option B: Web Dashboard (Manual)**
1. Go to https://dashboard.render.com/blueprints
2. Click "New Blueprint Instance"
3. Connect your repository
4. Select branch (usually `master` or `main`)
5. Set blueprint file path: `backend/render.yaml`
6. Click "Apply"

### Step 4: Monitor Deployment

1. Go to https://dashboard.render.com
2. You should see 3 services being created:
   - `g88-postgres` (PostgreSQL)
   - `g88-redis` (Redis)
   - `g88-backend` (Web Service)

3. Wait for all services to show "Live" status (5-10 minutes)

### Step 5: Configure Environment Variables

Some environment variables are marked as `sync: false` and must be set manually:

**Using Render Dashboard**:
1. Go to https://dashboard.render.com/web/g88-backend
2. Click "Environment" tab
3. Add the following variables:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_your_production_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxx

# AWS
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your_secret_key

# Google OAuth
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
```

### Step 6: Run Database Migrations

Once the web service is deployed:

**Via Render Dashboard Shell**:
1. Go to your web service in Render Dashboard
2. Click "Shell" tab
3. Run: `npm run migration:run`
4. Wait for migrations to complete

### Step 7: Verify Deployment

1. **Check health endpoint**:
   ```bash
   curl https://g88-backend.onrender.com/api/v1/health
   ```

2. **Check logs** in Render Dashboard:
   - Go to service → "Logs" tab
   - View real-time logs and filter as needed

3. **Test API endpoints**:
   ```bash
   curl https://g88-backend.onrender.com/api/v1/auth/health
   ```

---

## Environment Variables

### Auto-Configured Variables

These are automatically set by Render from service connections:

| Variable | Source | Description |
|----------|--------|-------------|
| `DATABASE_HOST` | g88-postgres service | PostgreSQL host |
| `DATABASE_PORT` | g88-postgres service | PostgreSQL port |
| `DATABASE_USER` | g88-postgres service | Database username |
| `DATABASE_PASSWORD` | g88-postgres service | Database password (generated) |
| `DATABASE_NAME` | g88-postgres service | Database name |
| `DATABASE_URL` | g88-postgres service | Full connection string |
| `REDIS_HOST` | g88-redis service | Redis host |
| `REDIS_PORT` | g88-redis service | Redis port |
| `REDIS_URL` | g88-redis service | Full Redis URL |
| `JWT_SECRET` | Auto-generated | JWT signing secret |
| `JWT_REFRESH_SECRET` | Auto-generated | JWT refresh token secret |

### Manually Set Variables

These must be configured manually (see Step 6 above):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `SENDGRID_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

---

## Database Setup

### PostGIS Extensions

The database automatically installs these extensions on first boot:
- `postgis` - Geographic objects support
- `postgis_topology` - Topology support
- `uuid-ossp` - UUID generation

### Running Migrations

After initial deployment:

```bash
# SSH into web service
render ssh g88-backend

# Run migrations
npm run migration:run

# Verify migrations
npm run typeorm migration:show
```

### Database Access

**Via Render Dashboard**:
1. Go to https://dashboard.render.com
2. Select `g88-postgres` service
3. Click "Shell" tab
4. Connect to database: `psql $DATABASE_URL`

**Via Local Client**:
```bash
# Get connection string from Render Dashboard
# Format: postgresql://user:password@host:port/database

psql "postgresql://g88user:password@host.render.com:5432/g88db_production"
```

---

## Post-Deployment Tasks

### 1. Update Mobile App Configuration

Update your mobile app's API URL:

**File**: `mobile/.env.production`
```bash
API_BASE_URL=https://g88-backend.onrender.com/api/v1
```

### 2. Configure Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Create endpoint: `https://g88-backend.onrender.com/api/v1/webhooks/stripe`
3. Select events to listen for
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET` env var

### 3. Configure CORS

If your mobile app uses a custom domain, update CORS settings:

**File**: `backend/src/main.ts`
```typescript
app.enableCors({
  origin: ['https://g88app.com', 'capacitor://localhost'],
  credentials: true,
});
```

### 4. Set Up Custom Domain (Optional)

1. Go to Render Dashboard → Web Service → Settings
2. Click "Custom Domain"
3. Add domain: `api.g88app.com`
4. Configure DNS:
   - Type: `CNAME`
   - Name: `api`
   - Value: `g88-backend.onrender.com`
5. Wait for SSL certificate to provision

### 5. Enable Alerts

1. Go to Render Dashboard → Web Service → Settings
2. Scroll to "Alerts"
3. Configure notifications for:
   - Deploy failures
   - Service crashes
   - Health check failures

---

## Monitoring & Troubleshooting

### View Logs

**Via Render Dashboard**:
1. Go to https://dashboard.render.com/web/g88-backend
2. Click "Logs" tab
3. Use search/filter to find specific log entries
4. Toggle real-time mode for live log streaming

### Common Issues

#### 1. Build Fails
**Error**: `npm install` fails
**Solution**: Check Node.js version, clear cache
```bash
# In Render Dashboard → Settings → Build Command
npm ci --legacy-peer-deps && npm run build
```

#### 2. Database Connection Fails
**Error**: `ECONNREFUSED` or `authentication failed`
**Solution**:
- Verify DATABASE_URL is set correctly
- Check if postgres service is running
- Ensure environment variables are linked

#### 3. Redis Connection Fails
**Error**: `Redis connection timeout`
**Solution**:
- Check if redis service is running
- Verify REDIS_URL environment variable
- Check IP allow list settings

#### 4. Service Crashes on Start
**Error**: Service exits immediately
**Solution**:
- Check logs for errors
- Verify all required env vars are set
- Test locally with same configuration

### Health Checks

The service includes a health check endpoint: `/api/v1/health`

**Response when healthy**:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

### Performance Monitoring

**Via Render Dashboard**:
1. Go to web service
2. Click "Metrics" tab
3. Monitor:
   - CPU usage
   - Memory usage
   - Response times
   - Request rates

---

## Cost Breakdown

### Starter Plan (Recommended for Production)

| Service | Plan | Cost/Month |
|---------|------|------------|
| PostgreSQL (PostGIS) | Starter | $7 |
| Redis | Starter | $7 |
| Web Service | Starter | $7 |
| **Total** | | **$21** |

**Included**:
- 512 MB RAM per service
- Always-on (no cold starts)
- Daily backups (database)
- SSL certificates
- 100 GB bandwidth

### Free Tier (Development/Testing)

| Service | Plan | Cost/Month |
|---------|------|------------|
| PostgreSQL | Free | $0 |
| Redis | Free | $0 |
| Web Service | Free | $0 |
| **Total** | | **$0** |

**Limitations**:
- 256 MB RAM
- Spins down after 15 min inactivity
- No backups on free databases
- Limited to 100 hours/month

**To use free tier**, edit `render.yaml`:
```yaml
services:
  - type: web
    plan: free  # Change from 'starter' to 'free'
```

### Upgrade Options

As your app grows, you can upgrade to higher tiers:

| Plan | RAM | Cost/Month |
|------|-----|------------|
| Starter | 512 MB | $7 |
| Standard | 2 GB | $25 |
| Pro | 4 GB | $85 |
| Pro Plus | 8 GB | $175 |

---

## Next Steps

After successful deployment:

1. **Test all API endpoints** thoroughly
2. **Set up monitoring** and alerts
3. **Configure backups** (automatic on paid plans)
4. **Update mobile app** with production API URL
5. **Test end-to-end** with mobile app
6. **Set up CI/CD** for automated deployments
7. **Review security settings** and API keys
8. **Monitor logs and metrics** for first few days

---

## Useful Tasks via Render Dashboard

All management tasks are done through the Render Dashboard at https://dashboard.render.com

### Common Operations

| Task | Steps |
|------|-------|
| **View all services** | Dashboard → Services list |
| **View service details** | Click on service name |
| **Restart service** | Service → Settings → Manual Deploy or Restart |
| **View logs** | Service → Logs tab → Real-time or historical |
| **Shell access** | Service → Shell tab → Opens interactive terminal |
| **View environment vars** | Service → Environment tab |
| **Set environment var** | Service → Environment tab → Add Variable |
| **Run migrations** | Service → Shell tab → `npm run migration:run` |
| **View metrics** | Service → Metrics tab → CPU, Memory, Response times |
| **Configure alerts** | Service → Settings → Alerts |
| **Custom domain** | Service → Settings → Custom Domain |
| **Scale replicas** | Service → Settings → Scaling (Pro plan) |

---

## Support

- **Render Documentation**: https://render.com/docs
- **Render Status**: https://status.render.com
- **Support**: https://render.com/support

---

## Security Checklist

- [ ] All production API keys are set and valid
- [ ] JWT secrets are strong and unique
- [ ] Database credentials are generated (not defaults)
- [ ] CORS is configured correctly
- [ ] HTTPS is enabled (automatic with Render)
- [ ] Environment variables are not committed to Git
- [ ] Stripe webhook secret is configured
- [ ] AWS S3 bucket has proper permissions
- [ ] Google OAuth is configured for production domain
- [ ] Rate limiting is enabled
- [ ] API versioning is in place

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Production URL**: https://g88-backend.onrender.com
