#!/usr/bin/env bash
# ============================================================
# setup-github.sh
# Run ONCE from your terminal to publish sch3-reviewer to GitHub Pages.
#
# Usage:
#   cd "Balance Sheet Vite APP Schedule 3/sch3-reviewer"
#   bash setup-github.sh
#
# Prerequisites:
#   • GitHub CLI (gh) logged in  — https://cli.github.com
#     OR a Personal Access Token set as GITHUB_TOKEN env var
#   • Node / npm installed
# ============================================================

set -e
REPO_NAME="sch3-reviewer"
GH_USER="dhruvdua88"

echo ""
echo "▶  Step 1: Remove sandbox-created .git (if any) and re-init cleanly"
rm -rf .git
git init
git config user.name  "Dhruv Dua"
git config user.email "dhruv@ddandco.in"
git branch -m main

echo ""
echo "▶  Step 2: Stage all source files"
git add .
git status --short

echo ""
echo "▶  Step 3: Initial commit"
git commit -m "Initial commit — Schedule III Reviewer (Vite 5 + React 18 + DeepSeek)"

echo ""
echo "▶  Step 4: Create GitHub repo and push"
if command -v gh &>/dev/null; then
  gh repo create "$GH_USER/$REPO_NAME" \
    --public \
    --description "AI-assisted Schedule III & CARO 2020 review tool for Indian CAs" \
    --source . \
    --remote origin \
    --push
else
  echo ""
  echo "  gh CLI not found. Manually:"
  echo "  1. Go to https://github.com/new"
  echo "  2. Create a PUBLIC repo named '$REPO_NAME'"
  echo "  3. Then run these two commands:"
  echo "     git remote add origin https://github.com/$GH_USER/$REPO_NAME.git"
  echo "     git push -u origin main"
  read -p "  Press Enter once the repo is created and you've pushed..."
fi

echo ""
echo "▶  Step 5: Build for GitHub Pages and deploy"
npm ci
GITHUB_PAGES=true npm run build
npx gh-pages -d dist

echo ""
echo "✅  Done!"
echo "   Your app will be live at: https://$GH_USER.github.io/$REPO_NAME/"
echo "   (GitHub Pages may take 1–2 minutes to go live after the first deploy)"
