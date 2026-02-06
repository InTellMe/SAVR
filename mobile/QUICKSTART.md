# SAVR Mobile - Quick Start

Get up and running with the SAVR mobile app in 5 minutes!

## Prerequisites

- Node.js installed
- Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

## Quick Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure Firebase

Edit `app.json` and add your Firebase configuration:

```json
{
  "expo": {
    "extra": {
      "firebaseApiKey": "YOUR_API_KEY",
      "firebaseAuthDomain": "your-app.firebaseapp.com",
      "firebaseProjectId": "your-project-id",
      "firebaseStorageBucket": "your-app.appspot.com",
      "firebaseMessagingSenderId": "123456789",
      "firebaseAppId": "1:123456789:web:abc123"
    }
  }
}
```

Get these values from: [Firebase Console](https://console.firebase.google.com/) → Your Project → Settings → General → Your Apps

### 3. Start the App

```bash
npm start
```

### 4. Open on Your Phone

1. Open Expo Go app
2. Scan the QR code from your terminal
3. Wait for the app to load

## First Time Using the App

1. **Create Account**: Tap "Get Started" on the welcome screen
2. **Sign Up**: Enter your email and password
3. **Add Items**: Go to Inventory tab → Tap + → Add your first pantry item
4. **Generate Recipes**: Go to Recipes tab → Tap the ✨ button
5. **Explore**: Check out Meal Plans and Grocery List features

## Common Commands

```bash
# Start development server
npm start

# Clear cache and restart
npm start -- --clear

# Run on iOS simulator (Mac only)
npm run ios

# Run on Android emulator
npm run android
```

## Troubleshooting

**Can't connect to server?**

- Make sure your phone and computer are on the same WiFi network
- Try scanning the QR code again

**Firebase errors?**

- Double-check your Firebase configuration in `app.json`
- Ensure Firebase Authentication is enabled in Firebase Console

**App won't load?**

```bash
# Clear cache and try again
rm -rf node_modules
npm install
npm start -- --clear
```

## Need More Help?

- See [SETUP.md](./SETUP.md) for detailed setup instructions
- See [README.md](./README.md) for full documentation
- Check the main project [README](../README.md) for Firebase setup

## What's Next?

- Test all features: inventory, recipes, meal plans
- Try the camera feature to add items
- Upgrade to Pro to unlock AI Chef chat
- Share feedback and report issues

Happy cooking! 🍳
