# SAVR API Reference

SAVR uses Next.js Route Handlers under `web/app/api`.

## Authentication

- Web and mobile clients authenticate with Supabase.
- Protected routes validate session/user context server-side.

## Route Groups

### AI

- `POST /api/ai/analyze-image`
- `POST /api/ai/create-recipe`
- `POST /api/ai/create-meal-plan`
- `POST /api/ai/create-grocery-list`
- `POST /api/ai/get-substitution`
- `POST /api/ai/import-recipe`
- `POST /api/ai/chat`
- `POST /api/ai/scan-receipt`

### Inventory

- `POST /api/inventory/deduct`

### Stripe

- `POST /api/stripe/webhook`
- `POST /api/stripe/portal`

### Labeling

- `POST /api/labeling/upload`
- `GET /api/labeling/annotations`
- `POST /api/labeling/save-annotation`
- `POST /api/labeling/segment`
- `GET /api/labeling/export`

### Transfer

- `POST /api/transfer/create-session`

## Notes

- Route implementation source of truth: `web/app/api/**/route.ts`
- Database schema source of truth: `supabase/migrations/*.sql`
- Client/server shared type definitions: `web/lib/types/functions.ts`, `web/types/index.ts`
