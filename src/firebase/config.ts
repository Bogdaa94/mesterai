import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBNYMmKgUwde373rxF5gcUaVrv0v1vmXvo",
  authDomain: "mesterai-eeef7.firebaseapp.com",
  projectId: "mesterai-eeef7",
  storageBucket: "mesterai-eeef7.firebasestorage.app",
  messagingSenderId: "14861675685",
  appId: "1:14861675685:web:4e621a00f8b65ea1d4b14c",
  measurementId: "G-G37L77B93B"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
