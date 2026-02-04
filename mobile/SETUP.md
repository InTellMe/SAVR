# PantryHustler Mobile - Setup Guide

This guide walks you through setting up the PantryHustler mobile application.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **npm** or **yarn** package manager
3. **Expo CLI** - Install globally:
   ```bash
   npm install -g expo-cli
   ```
4. **Development Environment**:
   - For iOS: Mac with Xcode installed
   - For Android: Android Studio with emulator
   - Or use Expo Go app on your physical device

## Step 1: Install Dependencies

Navigate to the mobile directory and install dependencies:

```bash
cd mobile
npm install
```

## Step 2: Firebase Configuration

### 2.1 Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your PantryHustler project
3. Go to Project Settings (gear icon)
4. Under "Your apps", select or add a Web app
5. Copy the configuration values

### 2.2 Configure the App

**Option A: Using app.json (Recommended)**

Edit `app.json` and replace the Firebase configuration:

```json
{
  "expo": {
    "extra": {
      "firebaseApiKey": "AIza...",
      "firebaseAuthDomain": "your-project.firebaseapp.com",
      "firebaseProjectId": "your-project-id",
      "firebaseStorageBucket": "your-project.appspot.com",
      "firebaseMessagingSenderId": "123456789",
      "firebaseAppId": "1:123456789:web:abc123"
    }
  }
}
```

**Option B: Using .env file**

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Firebase credentials:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

## Step 3: Google Sign-In Setup

### 3.1 Get Google Client IDs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Go to "APIs & Services" > "Credentials"
4. Create OAuth 2.0 Client IDs for:
   - Web application (for Expo)
   - iOS (if deploying to iOS)
   - Android (if deploying to Android)

### 3.2 Configure in Code

Edit `src/contexts/AuthContext.tsx`:

```typescript
const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
  clientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
});
```

### 3.3 Configure Firebase

1. In Firebase Console, go to Authentication > Sign-in method
2. Enable Google sign-in provider
3. Add your OAuth client IDs

## Step 4: Firebase Functions Setup

Ensure your Firebase Cloud Functions are deployed:

```bash
cd ../functions
npm install
npm run build
firebase deploy --only functions
```

Required functions:
- `generateRecipes`
- `generateMealPlan`
- `chatWithAI`

## Step 5: Firebase Security Rules

### 5.1 Firestore Rules

Ensure your `firestore.rules` allow mobile access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    match /inventory/{itemId} {
      allow read, write: if request.auth != null && 
                           resource.data.userId == request.auth.uid;
    }
    
    match /recipes/{recipeId} {
      allow read, write: if request.auth != null && 
                           resource.data.userId == request.auth.uid;
    }
    
    match /mealPlans/{planId} {
      allow read, write: if request.auth != null && 
                           resource.data.userId == request.auth.uid;
    }
    
    match /groceryLists/{listId} {
      allow read, write: if request.auth != null && 
                           resource.data.userId == request.auth.uid;
    }
  }
}
```

### 5.2 Storage Rules

Ensure your `storage.rules` allow image uploads:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /inventory/{userId}/{itemId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## Step 6: Running the App

### Development Mode

Start the Expo development server:

```bash
npm start
```

This will open Expo Developer Tools in your browser.

### Running on iOS Simulator

```bash
npm run ios
```

Requirements:
- macOS
- Xcode installed
- iOS Simulator running

### Running on Android Emulator

```bash
npm run android
```

Requirements:
- Android Studio installed
- Android emulator running

### Running on Physical Device

1. Install "Expo Go" from App Store (iOS) or Play Store (Android)
2. Scan the QR code shown in the terminal or Expo Developer Tools
3. The app will load on your device

## Step 7: Testing

### Test Authentication

1. Try creating a new account
2. Sign out and sign in again
3. Test Google sign-in (requires proper OAuth setup)

### Test Camera

1. Navigate to Inventory screen
2. Tap the "+" button
3. Test both "Take Photo" and "Choose from Library"
4. Grant camera and photo library permissions when prompted

### Test Data Sync

1. Add items in mobile app
2. Check if they appear in web app (and vice versa)
3. Verify real-time sync

## Troubleshooting

### "Unable to resolve module @expo/vector-icons"

```bash
npm install @expo/vector-icons
expo start -c
```

### Firebase Configuration Not Found

Ensure `app.json` has the `extra` field with Firebase config, or `.env` file exists.

### Camera Permissions Denied

On iOS, add to `app.json`:
```json
{
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "We need camera access to scan pantry items",
      "NSPhotoLibraryUsageDescription": "We need photo library access to upload images"
    }
  }
}
```

On Android, permissions are in `app.json` under `android.permissions`.

### Google Sign-In Not Working

1. Verify OAuth client IDs are correct
2. Check that the package name (Android) or bundle ID (iOS) matches
3. Ensure redirect URIs are configured in Google Cloud Console
4. For development, use web client ID in Expo Go

### Firebase Functions Error

1. Ensure functions are deployed: `firebase deploy --only functions`
2. Check Cloud Functions logs: `firebase functions:log`
3. Verify CORS is configured in functions

### Build Errors

Clear cache and rebuild:
```bash
expo start -c
```

Or reset everything:
```bash
rm -rf node_modules
npm install
expo start -c
```

## Production Deployment

### iOS App Store

1. Configure `app.json` with iOS bundle ID and app info
2. Build:
   ```bash
   expo build:ios
   ```
3. Follow Expo's guide for App Store submission

### Google Play Store

1. Configure `app.json` with Android package name
2. Build:
   ```bash
   expo build:android
   ```
3. Follow Expo's guide for Play Store submission

### Managed Workflow vs Bare Workflow

This app uses Expo Managed Workflow for easier development. To eject to bare workflow:

```bash
expo eject
```

This gives you full control but requires more configuration.

## Environment-Specific Configuration

For different environments (dev, staging, production):

1. Create multiple app.config.js files
2. Use environment variables
3. Configure Firebase projects per environment

Example `app.config.js`:
```javascript
export default {
  expo: {
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      // ... other config
    }
  }
}
```

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)

## Support

For issues or questions:
- Check the main [README.md](./README.md)
- Review [Firebase setup guide](../README.md)
- Create an issue on GitHub
