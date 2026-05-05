# G88 Backend - Render Deployment

Quick reference for deploying the G88 backend to Render.

## Quick Start

### Prerequisites
- Render account (sign up at https://render.com)
- Git repository pushed to GitHub/GitLab/Bitbucket
- Production credentials for third-party services

### Deploy

```bash
# 1. Commit and push to Git
git add .
git commit -m "Add Render deployment configuration"
git push

# 2. Run deployment helper
cd backend/deploy

# Windows:
deploy-render.bat

# Mac/Linux:
./deploy-render.sh
```

This will open the Render Dashboard where you'll complete the deployment.

### Set Environment Variables

After deployment completes, configure your production credentials in the **Render Dashboard**:

1. Go to https://dashboard.render.com/web/g88-backend
2. Click "Environment" tab
3. Add all required environment variables (see list below)

### Required Environment Variables

Set these manually in Render Dashboard:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# SendGrid
SENDGRID_API_KEY=SG....

# AWS
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Run Database Migrations

1. Go to https://dashboard.render.com/web/g88-backend
2. Click "Shell" tab
3. Run command: `npm run migration:run`
4. Wait for migrations to complete

## Files

| File | Purpose |
|------|---------|
| `render.yaml` | Infrastructure blueprint (defines all services) |
| `Dockerfile.postgres` | PostgreSQL + PostGIS Docker image |
| `init.sql` | Database initialization script (PostGIS extensions) |
| `deploy-render.sh` | Deployment helper script (Mac/Linux) |
| `deploy-render.bat` | Deployment helper script (Windows) |
| `DEPLOYMENT_GUIDE.md` | Complete deployment documentation |
| `README.md` | Quick reference guide (this file) |

## Infrastructure Created

- **PostgreSQL Database**: With PostGIS extension (Starter: $7/month)
- **Redis Cache**: Managed Redis instance (Starter: $7/month)
- **Web Service**: NestJS backend (Starter: $7/month)

**Total Cost**: ~$21/month (Starter plan) or $0 (Free tier)

## Production URL

After deployment: `https://g88-backend.onrender.com`

## Common Tasks

All tasks are performed via the Render Dashboard at https://dashboard.render.com

- **View logs**: Service → Logs tab
- **Restart service**: Service → Settings → Manual Deploy
- **View environment variables**: Service → Environment tab
- **Set environment variable**: Service → Environment → Add Variable
- **Shell access**: Service → Shell tab
- **View metrics**: Service → Metrics tab

## Need Help?

See the [Complete Deployment Guide](./DEPLOYMENT_GUIDE.md) for detailed instructions, troubleshooting, and best practices.

## Support

- Render Docs: https://render.com/docs
- Render Status: https://status.render.com
- Support: https://render.com/support
