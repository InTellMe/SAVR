import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SAVR',
  slug: 'savr',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  scheme: 'savr',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.savr.app',
    infoPlist: {
      NSCameraUsageDescription: 'SAVR uses your camera to scan and photograph pantry items for inventory management.',
      NSPhotoLibraryUsageDescription: 'SAVR needs access to your photo library to select images of pantry items.',
      NSPhotoLibraryAddUsageDescription: 'SAVR saves recipe photos and inventory images to your photo library.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.savr.app',
    versionCode: 1,
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'INTERNET',
      'ACCESS_NETWORK_STATE',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-camera',
    'expo-image-picker',
  ],
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID || '',
    },
    // Supabase configuration
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    // Google OAuth
    googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  },
  owner: 'intellme',
});
