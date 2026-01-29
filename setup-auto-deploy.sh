#!/bin/bash
# Setup automatic Vercel deployments from GitHub
# This script helps connect your GitHub repository to Vercel for auto-deploy

set -e

echo "=========================================="
echo "Vercel Auto-Deploy Setup"
echo "=========================================="
echo ""

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null && ! command -v ~/.npm-global/bin/vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel@latest
    echo "✓ Vercel CLI installed"
fi

# Use vercel command (either in PATH or in npm-global)
if command -v vercel &> /dev/null; then
    VERCEL_CMD="vercel"
else
    VERCEL_CMD="~/.npm-global/bin/vercel"
fi

echo "Using Vercel CLI: $VERCEL_CMD"
echo ""

# Set Vercel token
export VERCEL_TOKEN="0qfv8ZdrVxHsnO8kbHNdubBM"

echo "Step 1: Linking project..."
cd ~/cosauce-portal
$VERCEL_CMD link --yes

echo ""
echo "Step 2: Checking Git connection..."

# Check if git is already connected
if git remote -v | grep -q "origin.*github.com"; then
    echo "✓ Git repository detected: $(git remote get-url origin)"
else
    echo "⚠ No GitHub remote found. Please add one:"
    echo "  git remote add origin git@github.com:ricki2828/cosauce-portal.git"
    exit 1
fi

echo ""
echo "=========================================="
echo "GitHub Integration Setup Required"
echo "=========================================="
echo ""
echo "To enable automatic deployments, you need to connect"
echo "your GitHub repository to Vercel. Here's how:"
echo ""
echo "OPTION 1: Via Vercel Dashboard (Recommended)"
echo "  1. Visit: https://vercel.com/rickis-projects-e03243a5/cosauce-portal/settings/git"
echo "  2. Click 'Connect Git Repository'"
echo "  3. Select 'ricki2828/cosauce-portal'"
echo "  4. Choose 'main' as production branch"
echo "  5. Save"
echo ""
echo "OPTION 2: Via GitHub Integration"
echo "  1. Visit: https://github.com/apps/vercel"
echo "  2. Configure the Vercel app"
echo "  3. Grant access to 'cosauce-portal' repository"
echo "  4. Return to Vercel dashboard and refresh"
echo ""
echo "After connecting, every push to 'main' will automatically deploy!"
echo ""
echo "Current project: https://cosauce-portal.vercel.app"
echo "Vercel dashboard: https://vercel.com/rickis-projects-e03243a5/cosauce-portal"
echo ""
echo "=========================================="
