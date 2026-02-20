#!/bin/bash

# Setup Stripe Secrets for Firebase Functions
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to keep window open on exit
finish() {
    echo -e "\n${BLUE}Press Enter to close this window...${NC}"
    read -r
}
trap finish EXIT

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Stripe Secrets Setup for Firebase Functions           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed.${NC}"
    echo -e "Install it with: ${GREEN}npm install -g firebase-tools${NC}"
    exit 1
fi

GCLOUD_AVAILABLE=false
if command -v gcloud &> /dev/null; then
    GCLOUD_AVAILABLE=true
fi

echo -e "${GREEN}✓${NC} Firebase CLI found"

# Get current Firebase project
echo -e "${BLUE}Step 1: Verifying Firebase project...${NC}"

# Robust check for active project
CURRENT_PROJECT=$(firebase use --json 2>/dev/null | grep -oP '"active":\s*"\K[^"]+' || firebase use 2>/dev/null | grep "Active Project" | awk '{print $NF}' || echo "")

# Fallback check
if [ -z "$CURRENT_PROJECT" ] || [[ "$CURRENT_PROJECT" == *"null"* ]]; then
    # Final attempt: try to get it from the non-interactive output
    CURRENT_PROJECT=$(firebase use | grep -o 'savr-[a-z0-9]*' | head -n 1)
fi

if [ -z "$CURRENT_PROJECT" ]; then
    echo -e "${RED}❌ No active Firebase project set.${NC}"
    echo -e "Run: ${GREEN}firebase use <project-id>${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Using Firebase project: ${YELLOW}$CURRENT_PROJECT${NC}"
echo
echo -e "${YELLOW}⚠️  This script will configure Stripe secrets for Firebase Functions.${NC}"
read -p "Continue? (y/n): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
fi

echo

# --- STRIPE_SECRET_KEY ---
echo -e "${BLUE}Step 2: Setting STRIPE_SECRET_KEY${NC}"
echo -e "Go to: ${GREEN}https://dashboard.stripe.com/apikeys${NC}"
echo

if firebase functions:secrets:get STRIPE_SECRET_KEY &>/dev/null; then
    echo -e "${YELLOW}⚠️  STRIPE_SECRET_KEY already exists.${NC}"
    read -p "Do you want to update it? (y/n): " update_sk
    if [[ $update_sk =~ ^[Yy]$ ]]; then
        firebase functions:secrets:set STRIPE_SECRET_KEY
    fi
else
    firebase functions:secrets:set STRIPE_SECRET_KEY
fi

echo

# --- STRIPE_WEBHOOK_SECRET ---
echo -e "${BLUE}Step 3: Setting STRIPE_WEBHOOK_SECRET${NC}"
echo -e "Go to: ${GREEN}https://dashboard.stripe.com/webhooks${NC}"
echo

if firebase functions:secrets:get STRIPE_WEBHOOK_SECRET &>/dev/null; then
    echo -e "${YELLOW}⚠️  STRIPE_WEBHOOK_SECRET already exists.${NC}"
    read -p "Do you want to update it? (y/n): " update_wh
    if [[ $update_wh =~ ^[Yy]$ ]]; then
        firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
    fi
else
    firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
fi

echo

# --- IAM PERMISSIONS ---
if [ "$GCLOUD_AVAILABLE" = true ]; then
    echo -e "${BLUE}Step 4: Granting IAM permissions${NC}"
    read -p "Configure IAM permissions now? (y/n): " do_iam
    if [[ $do_iam =~ ^[Yy]$ ]]; then
        PROJECT_NUMBER=$(gcloud projects describe "$CURRENT_PROJECT" --format="value(projectNumber)" 2>/dev/null || echo "")
        if [ -n "$PROJECT_NUMBER" ]; then
            for SECRET in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET; do
                echo "Granting access to $SECRET..."
                gcloud secrets add-iam-policy-binding $SECRET \
                    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
                    --role="roles/secretmanager.secretAccessor" \
                    --project="$CURRENT_PROJECT" --quiet &>/dev/null || true
            done
            echo -e "${GREEN}✓${NC} IAM permissions configured"
        fi
    fi
fi

echo

# --- DEPLOY ---
echo -e "${BLUE}Step 5: Redeploying Firebase Functions${NC}"
read -p "Deploy functions now? (y/n): " do_deploy
if [[ $do_deploy =~ ^[Yy]$ ]]; then
    firebase deploy --only functions
else
    echo -e "${YELLOW}⚠️  Remember to deploy manually: firebase deploy --only functions${NC}"
fi

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                     Setup Complete! 🎉                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"