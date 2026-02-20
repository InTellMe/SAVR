# SAVR Mobile Quick Start

## 1. Install

```bash
cd mobile
npm install --legacy-peer-deps
```

## 2. Configure Env

```bash
cp .env.example .env
```

Set:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

## 3. Start App

```bash
npm start
```

Then open on device/emulator with Expo.

## 4. Type Check

```bash
npx tsc --noEmit
```
