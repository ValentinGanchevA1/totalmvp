@echo off
REM =============================================================================
REM G88 - Git History Cleanup Script
REM Removes .env.production from git history to eliminate exposed secrets
REM =============================================================================

echo.
echo ========================================
echo  G88 Git History Cleanup
echo ========================================
echo.
echo This script will:
echo  1. Remove .env.production from git tracking
echo  2. Remove it from git history (optional)
echo  3. Force push to update remote
echo.
echo WARNING: This rewrites git history!
echo Make sure all team members know before proceeding.
echo.
pause

cd /d "C:\Users\vganc\IdeaProjects\chat-copilot\backend"

echo.
echo Step 1: Checking if .env.production is tracked...
git ls-files --error-unmatch .env.production 2>nul
if %errorlevel%==0 (
    echo  - File IS tracked in git
    echo  - Removing from tracking...
    git rm --cached .env.production
    git commit -m "security: remove .env.production from tracking"
    echo  - Done!
) else (
    echo  - File is NOT tracked (good!)
)

echo.
echo Step 2: Verify .gitignore includes .env.production...
findstr /C:".env.production" .gitignore >nul
if %errorlevel%==0 (
    echo  - .env.production is in .gitignore (good!)
) else (
    echo  - Adding .env.production to .gitignore...
    echo .env.production>> .gitignore
    git add .gitignore
    git commit -m "security: ensure .env.production is ignored"
)

echo.
echo ========================================
echo  OPTIONAL: Full History Cleanup
echo ========================================
echo.
echo To completely remove secrets from ALL git history:
echo  1. Install git-filter-repo: pip install git-filter-repo
echo  2. Run: git filter-repo --path .env.production --invert-paths
echo  3. Force push: git push origin --force --all
echo.
echo Or use BFG Repo Cleaner:
echo  1. Download from: https://rtyley.github.io/bfg-repo-cleaner/
echo  2. Run: java -jar bfg.jar --delete-files .env.production
echo  3. git reflog expire --expire=now --all
echo  4. git gc --prune=now --aggressive
echo  5. git push origin --force --all
echo.
echo ========================================
echo  Current Status
echo ========================================
git status
echo.
pause
