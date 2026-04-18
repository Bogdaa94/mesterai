import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import Constants from 'expo-constants';

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
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
