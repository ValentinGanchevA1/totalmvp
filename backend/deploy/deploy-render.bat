@echo off
REM G88 Backend - Render Deployment Helper (Windows)
REM This script opens the Render Blueprint deployment page

echo ========================================
echo G88 Backend - Render Deployment Helper
echo ========================================
echo.

REM Check if render.yaml exists
if not exist "..\render.yaml" (
    echo Error: render.yaml not found
    echo Please run this script from the backend\deploy directory
    exit /b 1
)

echo This deployment will create:
echo   - PostgreSQL database with PostGIS (Starter: $7/month^)
echo   - Redis instance (Starter: $7/month^)
echo   - Web service for NestJS backend (Starter: $7/month^)
echo.
echo Total estimated cost: ~$21/month (or FREE with free tier^)
echo.

echo ========================================
echo DEPLOYMENT STEPS:
echo ========================================
echo.
echo 1. Commit and push render.yaml to your Git repository:
echo    git add .
echo    git commit -m "Add Render deployment configuration"
echo    git push
echo.
echo 2. Opening Render Blueprint deployment page...
echo.
pause

REM Open Render Blueprint page
start https://dashboard.render.com/blueprints

echo.
echo ========================================
echo Follow these steps in the Render Dashboard:
echo ========================================
echo.
echo 1. Click "New Blueprint Instance"
echo 2. Connect your GitHub/GitLab/Bitbucket repository
echo 3. Select your repository: chat-copilot
echo 4. Select branch: master (or main^)
echo 5. Set blueprint path: backend/render.yaml
echo 6. Review the services that will be created
echo 7. Click "Apply"
echo.
echo 8. Wait for deployment to complete (~5-10 minutes^)
echo.
echo 9. Set required environment variables in Render Dashboard:
echo    - Go to each service -^> Environment tab
echo    - Add the variables listed in the deployment guide
echo.
echo 10. Run database migrations:
echo     - Open web service shell in Render Dashboard
echo     - Run: npm run migration:run
echo.
echo ========================================
echo.
echo See DEPLOYMENT_GUIDE.md for detailed instructions!
echo.
pause
