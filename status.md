# PantryHustler – Project Status

## Current Phase:

Environment & Deployment Setup

## Production URL:

https://www.pantryhustler.com

## Stack:

- Frontend: Next.js + Tailwind
- Backend: Firebase Functions
- Auth: Firebase Auth
- DB: Firestore
- Storage: Cloud Storage
- AI (Phase 1): OpenAI Vision + GPT-4
- AI (Phase 2): Proprietary recognition
- Payments: Stripe + PayPal

## MVP Scope:

- User auth
- Image upload
- Ingredient detection + editing
- Recipe generation
- Meal planning
- Grocery list
- Chat assistant
- Tier gating

## Next Step:

Deploy web app + Cloud Functions to a new Firebase project and wire environment variables for PantryHustler production (https://www.pantryhustler.com), then run end-to-end smoke tests for auth, inventory, recipes, meal plans, grocery lists, chat, and Stripe subscription flows.

## Risks:

- API rate limits
- Vision accuracy early-stage
- Cost spikes
- Misconfigured environment variables across web/functions leading to subtle prod-only failures
- Stripe webhook or portal misconfiguration impacting subscription state sync
- Incomplete enforcement of free vs pro tier limits in new Firebase project
- Domain and hosting misalignment between pantryhustler.com and Firebase Hosting target

## Notes:

- Web-first remote processing
- Mobile wrapper later
