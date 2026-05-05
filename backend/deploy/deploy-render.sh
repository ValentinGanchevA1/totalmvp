#!/bin/bash
# G88 Backend - Render Deployment Helper
# This script guides you through deploying to Render

set -e  # Exit on error

echo "========================================"
echo "G88 Backend - Render Deployment Helper"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if render.yaml exists
if [ ! -f "../render.yaml" ]; then
    echo -e "${RED}Error: render.yaml not found${NC}"
    echo "Please run this script from the backend/deploy directory"
    exit 1
fi

echo "This deployment will create:"
echo "  - PostgreSQL database with PostGIS (Starter: \$7/month)"
echo "  - Redis instance (Starter: \$7/month)"
echo "  - Web service for NestJS backend (Starter: \$7/month)"
echo ""
echo -e "${YELLOW}Total estimated cost: ~\$21/month (or FREE with free tier)${NC}"
echo ""

echo "========================================"
echo "DEPLOYMENT STEPS:"
echo "========================================"
echo ""
echo -e "${BLUE}Step 1: Commit and push to Git${NC}"
echo ""
echo "Run these commands:"
echo "  git add ."
echo "  git commit -m \"Add Render deployment configuration\""
echo "  git push"
echo ""

read -p "Have you pushed render.yaml to your Git repository? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please push your changes first, then run this script again."
    exit 0
fi

echo ""
echo -e "${BLUE}Step 2: Deploy via Render Dashboard${NC}"
echo ""
echo "Opening Render Blueprint page in your browser..."
echo ""

# Try to open browser (works on macOS and most Linux)
if command -v open &> /dev/null; then
    open https://dashboard.render.com/blueprints
elif command -v xdg-open &> /dev/null; then
    xdg-open https://dashboard.render.com/blueprints
else
    echo "Please open this URL in your browser:"
    echo "https://dashboard.render.com/blueprints"
fi

echo ""
echo "========================================"
echo "Follow these steps in Render Dashboard:"
echo "========================================"
echo ""
echo "1. Click 'New Blueprint Instance'"
echo "2. Connect your GitHub/GitLab/Bitbucket repository"
echo "3. Select repository: chat-copilot"
echo "4. Select branch: master (or main)"
echo "5. Set blueprint path: backend/render.yaml"
echo "6. Review the services to be created"
echo "7. Click 'Apply'"
echo ""
echo "8. Wait for deployment (~5-10 minutes)"
echo ""
echo "9. Configure environment variables:"
echo "   - Go to each service → Environment tab"
echo "   - Add required variables (see DEPLOYMENT_GUIDE.md)"
echo ""
echo "10. Run database migrations:"
echo "    - Open web service shell"
echo "    - Run: npm run migration:run"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}See DEPLOYMENT_GUIDE.md for details!${NC}"
echo -e "${GREEN}========================================${NC}"
