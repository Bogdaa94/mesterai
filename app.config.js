require('dotenv').config();

module.exports = {
  expo: {
    name: 'mesterai',
    slug: 'mesterai',
    scheme: 'mesterai',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: false,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.anonymous.mesterai',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.anonymous.mesterai',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-web-browser',
      'expo-image-picker',
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: 'com.googleusercontent.apps.14861675685-sjjrialrr49f37rdm4b8kjo3ttns1cla',
        },
      ],
    ],
    extra: {
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      eas: {
        projectId: 'c1a53052-2474-4927-9935-346103d2e8df',
      },
    },
  },
};
