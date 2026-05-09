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
        NSMicrophoneUsageDescription:
          'Mester AI folosește microfonul pentru a înregistra descrierea problemei tale.',
      },
    },
    android: {
      icon: './assets/icon.png',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FF6B00',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      googleServicesFile: './google-services.json',
      package: 'com.anonymous.mesterai',
      permissions: [
        'CAMERA',
        'RECORD_AUDIO',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'POST_NOTIFICATIONS',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      '@react-native-firebase/app',
      'expo-web-browser',
      'expo-audio',
      'expo-image-picker',
      'expo-location',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: 'com.googleusercontent.apps.14861675685-sjjrialrr49f37rdm4b8kjo3ttns1cla',
          androidClientId: '14861675685-9rjgp8ukmg8ll0offp1mf7ej1mbe8udo.apps.googleusercontent.com',
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
