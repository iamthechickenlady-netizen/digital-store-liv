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
import { readFileSync } from "fs";
import path from "path";

// Load configuration dynamically from the root config file
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(readFileSync(configPath, "utf-8"));

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Target the exact named database ID assigned to this workspace applet
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
