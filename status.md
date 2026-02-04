# status.md — PantryHustler (Repo Root)

**Last Updated:** 2026-02-04  
**Current Phase:** Architect (planning)  
**Production URL:** https://www.pantryhustler.com

## 🎯 Primary Goal (MVP)
Web-first PantryHustler app where users upload pantry/fridge images (and later short videos), the backend extracts ingredients, users edit inventory, and the app generates recipes, meal plans, grocery lists, and chat help. Subscription-based access with server-side tier gating.

## ✅ Definition of Done (MVP)
- [ ] Auth: Firebase Auth (Google + email/password)
- [ ] Upload: image upload to Cloud Storage
- [ ] Vision: Function `POST /vision/extract` returns structured ingredient list
- [ ] Inventory Editor: user can add/edit/delete items and save to Firestore
- [ ] Recipes: Function `POST /recipes/suggest` returns recipe cards + one full recipe
- [ ] Planner: Function `POST /planner/generate` generates X days plan
- [ ] Grocery: Function `POST /grocery/generate` consolidates missing items
- [ ] Chat: Function `POST /chat` provides multi-turn assistant (inventory-aware)
- [ ] Payments: Stripe + PayPal checkout on web; webhook sets `tier`
- [ ] Gating: server-side quotas enforced (free/pro/family)
- [ ] Deploy: Firebase Hosting + Functions live; `/health` passes

## 🧠 Current Priorities
1) Stabilize repo skeleton + shared contracts  
2) Implement backend endpoints + security rules  
3) Build web UI flows end-to-end  
4) Add Stripe/PayPal entitlements + quotas  
5) Logging + release checklist

## 📝 Change Log (Memory)
| Date | Agent Phase | Action Taken | Next Step |
|---|---|---|---|
| 2026-02-04 | Architect | Initialized agent pack + repo docs plan | Bootstrap repo; generate starter contracts + endpoints |

## ⚠️ Known Constraints
- All AI calls must be server-side via Firebase Functions.
- Proprietary SaaS license: no redistribution/reverse engineering.
- Store user corrections as labeled training data for Phase 2 proprietary recognition.
- Keep UX “soccer-mom simple”: minimal taps, obvious actions, no jargon.

## 🧩 Open Questions (must be answered in-repo, not guessed)
- Exact tier limits (vision extracts/month, chat turns/day, etc.)
- Whether video support is in MVP (if yes: keyframe extraction rules)
- DNS provider of pantryhustler.com (for app subdomain later)
