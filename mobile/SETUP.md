# SAVR Mobile Setup

## Prerequisites

- Node.js 20+
- npm
- Expo account
- EAS CLI (`npm i -g eas-cli`) for production builds

## Local Development

1. Install dependencies:

```bash
cd mobile
npm install --legacy-peer-deps
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Configure required variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

4. Run app:

```bash
npm start
```

## Google OAuth Notes

- Create Web, iOS, and Android OAuth client IDs in Google Cloud Console.
- Ensure package/bundle IDs match `com.savr.app`.
- Configure Supabase Auth Google provider with matching credentials.

## Production Build (EAS)

```bash
eas login
eas build --platform android --profile production
eas build --platform ios --profile production
```

## CI/CD

Mobile workflow depends on these GitHub secrets:

- `EXPO_TOKEN`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` (for Play submission)

See `../GITHUB_SECRETS_SETUP.md` for full details.
