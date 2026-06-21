import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  orderBy
} from "firebase/firestore";
import { existsSync, readFileSync } from "fs";
import path from "path";

let firebaseConfig: any = null;

// 1. Try to load from local file first (for workspace development)
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
if (existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (e) {
    console.warn("Could not parse firebase-applet-config.json:", e);
  }
}

// 2. Fall back to environment variables (useful for secure secret management in Cloud Run deployments)
if (!firebaseConfig) {
  if (process.env.FIREBASE_CONFIG) {
    try {
      firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (e) {
      console.warn("Could not parse process.env.FIREBASE_CONFIG:", e);
    }
  } else if (process.env.FIREBASE_API_KEY) {
    firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID
    };
  }
}

// 3. Initialize Firebase resiliently so that missing config never crashes container startup
let dbInstance: any = null;

if (firebaseConfig && firebaseConfig.apiKey) {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} else {
  console.warn("⚠️ Firebase configuration is missing or incomplete! To resolve this, configure the FIREBASE_CONFIG or individual FIREBASE_* environment variables.");
  dbInstance = new Proxy({}, {
    get(target, prop) {
      throw new Error("Firestore was accessed but Firebase is not configured. Please supply a valid firebase-applet-config.json in your directory OR define the FIREBASE_CONFIG environment variable.");
    }
  });
}

export const db = dbInstance;

// Export standard firestore functions for server-side & client-side use
export {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  orderBy
};
