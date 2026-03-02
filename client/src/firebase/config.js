import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAFWvnuyIEoCQx_mOh_5ZC1ZHG9__AbPOo",
  authDomain: "medipredict-4b671.firebaseapp.com",
  projectId: "medipredict-4b671",
  storageBucket: "medipredict-4b671.firebasestorage.app",
  messagingSenderId: "948927819782",
  appId: "1:948927819782:web:a20d8345bd2622c7061387",
  measurementId: "G-NW0Z49JH48"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize and Export Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Providers for Social Login
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

export default app;