# SAVR Mobile App

Expo + React Native mobile client for SAVR.

## Tech

- Expo SDK 54
- React Native + TypeScript
- Supabase Auth and data access
- React Navigation

## Setup

```bash
npm install --legacy-peer-deps
cp .env.example .env
npm start
```

## Required Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

## Type Check

```bash
npx tsc --noEmit
```

## Native Builds

```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

See `SETUP.md` for full environment and build setup.
