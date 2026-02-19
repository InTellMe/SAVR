#!/bin/bash

# Setup Stripe Secrets for Firebase Functions
# This script configures the required Stripe secrets in Google Cloud Secret Manager
# so that the stripeWebhook function can process Stripe events at runtime.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if gcloud CLI is installed (for additional setup)
GCLOUD_AVAILABLE=false
if command -v gcloud &> /dev/null; then
    GCLOUD_AVAILABLE=true
fi

echo -e "${GREEN}✓${NC} Firebase CLI found"
echo

# Get current Firebase project
echo -e "${BLUE}Step 1: Verifying Firebase project...${NC}"
CURRENT_PROJECT=$(firebase use 2>&1 | grep "Active Project" | awk '{print $NF}' || echo "")

if [ -z "$CURRENT_PROJECT" ]; then
    echo -e "${RED}❌ No active Firebase project set.${NC}"
    echo -e "Run: ${GREEN}firebase use <project-id>${NC}"
    echo -e "Or: ${GREEN}firebase login${NC} first"
    exit 1
fi

echo -e "${GREEN}✓${NC} Using Firebase project: ${YELLOW}$CURRENT_PROJECT${NC}"
echo

# Confirm with user
echo -e "${YELLOW}⚠️  This script will configure Stripe secrets for Firebase Functions.${NC}"
echo -e "Project: ${YELLOW}$CURRENT_PROJECT${NC}"
echo
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
fi

echo

# Get Stripe Secret Key
echo -e "${BLUE}Step 2: Setting STRIPE_SECRET_KEY${NC}"
echo -e "Go to: ${GREEN}https://dashboard.stripe.com/apikeys${NC}"
echo -e "Copy your secret key (starts with ${YELLOW}sk_live_${NC} or ${YELLOW}sk_test_${NC})"
echo

# Check if secret already exists
echo "Checking if STRIPE_SECRET_KEY already exists..."
if firebase functions:secrets:get STRIPE_SECRET_KEY &>/dev/null; then
    echo -e "${YELLOW}⚠️  STRIPE_SECRET_KEY already exists.${NC}"
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Skipping STRIPE_SECRET_KEY${NC}"
    else
        echo "Enter your Stripe secret key:"
        firebase functions:secrets:set STRIPE_SECRET_KEY
        echo -e "${GREEN}✓${NC} STRIPE_SECRET_KEY updated"
    fi
else
    echo "Enter your Stripe secret key:"
    firebase functions:secrets:set STRIPE_SECRET_KEY
    echo -e "${GREEN}✓${NC} STRIPE_SECRET_KEY set"
fi

echo

# Get Stripe Webhook Secret
echo -e "${BLUE}Step 3: Setting STRIPE_WEBHOOK_SECRET${NC}"
echo -e "Go to: ${GREEN}https://dashboard.stripe.com/webhooks${NC}"
echo -e "Click on your webhook, then reveal signing secret (starts with ${YELLOW}whsec_${NC})"
echo

# Check if secret already exists
echo "Checking if STRIPE_WEBHOOK_SECRET already exists..."
if firebase functions:secrets:get STRIPE_WEBHOOK_SECRET &>/dev/null; then
    echo -e "${YELLOW}⚠️  STRIPE_WEBHOOK_SECRET already exists.${NC}"
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Skipping STRIPE_WEBHOOK_SECRET${NC}"
    else
        echo "Enter your Stripe webhook secret:"
        firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
        echo -e "${GREEN}✓${NC} STRIPE_WEBHOOK_SECRET updated"
    fi
else
    echo "Enter your Stripe webhook secret:"
    firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
    echo -e "${GREEN}✓${NC} STRIPE_WEBHOOK_SECRET set"
fi

echo

# Grant IAM permissions if gcloud is available
if [ "$GCLOUD_AVAILABLE" = true ]; then
    echo -e "${BLUE}Step 4: Granting IAM permissions (optional but recommended)${NC}"
    read -p "Do you want to configure IAM permissions now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Getting project number..."
        PROJECT_NUMBER=$(gcloud projects describe "$CURRENT_PROJECT" --format="value(projectNumber)" 2>/dev/null || echo "")
        
        if [ -z "$PROJECT_NUMBER" ]; then
            echo -e "${YELLOW}⚠️  Could not get project number. Skipping IAM setup.${NC}"
            echo -e "You may need to run: ${GREEN}gcloud auth login${NC}"
        else
            echo -e "Project number: ${YELLOW}$PROJECT_NUMBER${NC}"
            
            # Grant access to STRIPE_SECRET_KEY
            echo "Granting access to STRIPE_SECRET_KEY..."
            gcloud secrets add-iam-policy-binding STRIPE_SECRET_KEY \
                --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
                --role="roles/secretmanager.secretAccessor" \
                --project="$CURRENT_PROJECT" 2>/dev/null || echo -e "${YELLOW}⚠️  Already has access or error occurred${NC}"
            
            gcloud secrets add-iam-policy-binding STRIPE_SECRET_KEY \
                --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
                --role="roles/secretmanager.secretAccessor" \
                --project="$CURRENT_PROJECT" 2>/dev/null || echo -e "${YELLOW}⚠️  Already has access or error occurred${NC}"
            
            # Grant access to STRIPE_WEBHOOK_SECRET
            echo "Granting access to STRIPE_WEBHOOK_SECRET..."
            gcloud secrets add-iam-policy-binding STRIPE_WEBHOOK_SECRET \
                --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
                --role="roles/secretmanager.secretAccessor" \
                --project="$CURRENT_PROJECT" 2>/dev/null || echo -e "${YELLOW}⚠️  Already has access or error occurred${NC}"
            
            gcloud secrets add-iam-policy-binding STRIPE_WEBHOOK_SECRET \
                --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
                --role="roles/secretmanager.secretAccessor" \
                --project="$CURRENT_PROJECT" 2>/dev/null || echo -e "${YELLOW}⚠️  Already has access or error occurred${NC}"
            
            echo -e "${GREEN}✓${NC} IAM permissions configured"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  gcloud CLI not found. Skipping IAM permission setup.${NC}"
    echo -e "Install gcloud: ${GREEN}https://cloud.google.com/sdk/docs/install${NC}"
    echo -e "Or manually configure permissions in Google Cloud Console"
fi

echo

# Prompt to redeploy
echo -e "${BLUE}Step 5: Redeploying Firebase Functions${NC}"
echo -e "${YELLOW}⚠️  Functions must be redeployed to use the new secrets.${NC}"
echo
read -p "Do you want to deploy functions now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying Firebase Functions..."
    firebase deploy --only functions
    echo -e "${GREEN}✓${NC} Functions deployed"
else
    echo -e "${YELLOW}⚠️  Remember to deploy functions later:${NC}"
    echo -e "   ${GREEN}firebase deploy --only functions${NC}"
    echo -e "   or push to main branch to trigger GitHub Actions"
fi

echo
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                     Setup Complete! 🎉                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Test your webhook: ${GREEN}https://dashboard.stripe.com/webhooks${NC}"
echo -e "2. Send a test event and verify it works"
echo -e "3. Complete a test checkout to verify subscription sync"
echo
echo -e "${BLUE}Troubleshooting:${NC}"
echo -e "- View logs: ${GREEN}firebase functions:log --only stripeWebhook${NC}"
echo -e "- Check secrets: ${GREEN}firebase functions:secrets:access STRIPE_SECRET_KEY${NC}"
echo -e "- Read guide: ${GREEN}./STRIPE_SECRETS_SETUP_GUIDE.md${NC}"
echo
