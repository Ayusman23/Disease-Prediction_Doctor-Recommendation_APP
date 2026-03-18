import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ─────────────────────────────────────────────────────────
//  Firebase Config — reads from .env (NEVER hardcode keys!)
//  All keys are stored in client/.env as VITE_FIREBASE_*
// ─────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate that keys are loaded (dev-time safety net)
if (import.meta.env.DEV && !firebaseConfig.apiKey) {
  console.warn(
    "⚠️  Firebase API key is missing!\n" +
    "Make sure client/.env exists and contains VITE_FIREBASE_API_KEY.\n" +
    "See client/.env for the required variables."
  );
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize and Export Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Providers for Social Login
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

export default app;