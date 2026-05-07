import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import Constants from 'expo-constants';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey:            extra.firebaseApiKey            as string,
  authDomain:        extra.firebaseAuthDomain        as string,
  projectId:         extra.firebaseProjectId         as string,
  storageBucket:     extra.firebaseStorageBucket     as string,
  messagingSenderId: extra.firebaseMessagingSenderId  as string,
  appId:             extra.firebaseAppId             as string,
  measurementId:     extra.firebaseMeasurementId     as string,
};

const app = initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export default app;
