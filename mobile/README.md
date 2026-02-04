# PantryHustler Mobile App

A React Native mobile application for PantryHustler - your smart cooking assistant.

## Features

- 📱 **Cross-Platform**: Works on iOS and Android
- 🔐 **Firebase Authentication**: Email and Google sign-in
- 📸 **Camera Integration**: Scan and add pantry items with photos
- 🍳 **Recipe Discovery**: AI-powered recipe generation from your ingredients
- 📅 **Meal Planning**: Weekly meal plan generation
- 🛒 **Grocery Lists**: Smart shopping lists based on your needs
- 💬 **AI Chef Chat**: Get cooking advice from AI (Pro feature)
- 🔄 **Real-time Sync**: Share data across web and mobile apps

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for navigation
- **Firebase** (Auth, Firestore, Storage, Functions)
- **Expo Image Picker** for camera integration

## Project Structure

```
mobile/
├── src/
│   ├── config/
│   │   └── firebase.ts              # Firebase configuration
│   ├── contexts/
│   │   └── AuthContext.tsx          # Authentication context
│   ├── navigation/
│   │   ├── RootNavigator.tsx        # Root navigation
│   │   ├── AuthNavigator.tsx        # Auth flow navigation
│   │   └── MainNavigator.tsx        # Main app navigation
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── SignInScreen.tsx
│   │   │   └── SignUpScreen.tsx
│   │   └── main/
│   │       ├── HomeScreen.tsx
│   │       ├── InventoryScreen.tsx
│   │       ├── RecipesScreen.tsx
│   │       ├── RecipeDetailScreen.tsx
│   │       ├── MealPlansScreen.tsx
│   │       ├── GroceryListScreen.tsx
│   │       ├── ChatScreen.tsx
│   │       └── ProfileScreen.tsx
│   ├── components/
│   │   ├── LoadingSpinner.tsx
│   │   ├── ImagePickerComponent.tsx
│   │   └── RecipeCard.tsx
│   ├── utils/
│   │   └── imageUtils.ts            # Image handling utilities
│   └── types/
│       └── index.ts                  # TypeScript types
├── App.tsx                           # App entry point
├── app.json                          # Expo configuration
└── package.json                      # Dependencies
```

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Configure Firebase:**
   
   Update `app.json` with your Firebase configuration:
   ```json
   {
     "expo": {
       "extra": {
         "firebaseApiKey": "your-api-key",
         "firebaseAuthDomain": "your-auth-domain",
         "firebaseProjectId": "your-project-id",
         "firebaseStorageBucket": "your-storage-bucket",
         "firebaseMessagingSenderId": "your-messaging-sender-id",
         "firebaseAppId": "your-app-id"
       }
     }
   }
   ```

   Alternatively, create a `.env` file (requires expo-constants):
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

3. **Configure Google Sign-In:**
   
   Update the Google Client ID in `src/contexts/AuthContext.tsx`:
   ```typescript
   const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
     clientId: 'YOUR_GOOGLE_CLIENT_ID',
   });
   ```

   Get your Client ID from [Google Cloud Console](https://console.cloud.google.com/).

## Running the App

### Development

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

### Production Build

#### iOS
```bash
expo build:ios
```

#### Android
```bash
expo build:android
```

## Key Components

### Authentication

The app uses Firebase Authentication with support for:
- Email/password sign-in and sign-up
- Google OAuth
- Persistent authentication state with AsyncStorage

### Camera Integration

Uses `expo-image-picker` for:
- Taking photos with camera
- Selecting images from library
- Image upload to Firebase Storage

### Navigation

Three-level navigation structure:
1. **Root Navigator**: Switches between Auth and Main flows
2. **Auth Navigator**: Welcome, Sign In, Sign Up screens
3. **Main Navigator**: Tab navigation with stack screens

### Data Sync

All data is stored in Firebase Firestore and syncs in real-time:
- Inventory items
- Recipes
- Meal plans
- Grocery lists

## Firebase Collections

The app uses the same Firebase collections as the web app:

- `users`: User profiles and subscription info
- `inventory`: Pantry items
- `recipes`: Saved recipes
- `mealPlans`: Weekly meal plans
- `groceryLists`: Shopping lists

## Cloud Functions

Integrates with Firebase Cloud Functions:
- `generateRecipes`: Generate recipes from inventory
- `generateMealPlan`: Create weekly meal plans
- `chatWithAI`: Chat with AI chef (Pro only)

## Permissions

The app requires the following permissions:
- **Camera**: For taking photos of pantry items
- **Photo Library**: For selecting existing images
- **Internet**: For Firebase and API communication

## Troubleshooting

### Build Issues

If you encounter build issues:
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
expo start -c
```

### Firebase Connection

Ensure your Firebase configuration is correct and:
- Firebase project is set up
- Authentication providers are enabled
- Firestore security rules allow read/write
- Storage rules allow uploads

### Camera Permissions

On iOS, add to `app.json`:
```json
{
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "This app uses the camera to scan pantry items.",
      "NSPhotoLibraryUsageDescription": "This app needs access to your photos."
    }
  }
}
```

## Development Notes

### Code Style

- TypeScript for type safety
- Functional components with hooks
- StyleSheet for styling (no inline styles)
- Consistent color scheme matching web app

### Color Palette

- Primary: `#ea580c` (Orange)
- Pro: `#7c3aed` (Purple)
- Text: `#111827` (Dark Gray)
- Background: `#f9fafb` (Light Gray)

## Future Enhancements

- [ ] Offline mode with local caching
- [ ] Push notifications for meal reminders
- [ ] Barcode scanning for inventory
- [ ] Social sharing of recipes
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Voice commands

## Contributing

1. Create a feature branch
2. Make your changes
3. Test on both iOS and Android
4. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For issues or questions:
- Email: support@pantryhustler.com
- GitHub Issues: [Create an issue](https://github.com/InTellMe/PantryHustler/issues)
