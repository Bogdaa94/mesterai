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
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
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
    plugins: ['expo-web-browser', 'expo-image-picker'],
    extra: {
      geminiApiKey: process.env.GEMINI_API_KEY || '',
    },
  },
};
