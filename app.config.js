require('dotenv').config();

module.exports = {
  expo: {
    name: 'mesterai',
    slug: 'mesterai',
    scheme: 'mesterai',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.mesterai.app',
      infoPlist: {
        NSUserNotificationUsageDescription:
          'Mester AI îți trimite notificări pentru răspunsuri la forum și actualizări importante.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.mesterai.app',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-web-browser',
      'expo-image-picker',
      'expo-location',
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: 'com.googleusercontent.apps.14861675685-sjjrialrr49f37rdm4b8kjo3ttns1cla',
        },
      ],
    ],
    extra: {
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      firebaseApiKey:             process.env.FIREBASE_API_KEY             || '',
      firebaseAuthDomain:         process.env.FIREBASE_AUTH_DOMAIN         || '',
      firebaseProjectId:          process.env.FIREBASE_PROJECT_ID          || '',
      firebaseStorageBucket:      process.env.FIREBASE_STORAGE_BUCKET      || '',
      firebaseMessagingSenderId:  process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      firebaseAppId:              process.env.FIREBASE_APP_ID              || '',
      firebaseMeasurementId:      process.env.FIREBASE_MEASUREMENT_ID      || '',
      revenueCatIosKey:           process.env.REVENUECAT_IOS_KEY           || '',
      revenueCatAndroidKey:       process.env.REVENUECAT_ANDROID_KEY       || '',
      eas: {
        projectId: 'c1a53052-2474-4927-9935-346103d2e8df',
      },
    },
  },
};
