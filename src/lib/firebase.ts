import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore,
  doc as realDoc,
  getDoc as realGetDoc,
  getDocs as realGetDocs,
  setDoc as realSetDoc,
  updateDoc as realUpdateDoc,
  deleteDoc as realDeleteDoc,
  addDoc as realAddDoc,
  collection as realCollection,
  query as realQuery,
  orderBy as realOrderBy
} from "firebase/firestore";
import { existsSync, readFileSync, writeFileSync } from "fs";
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

// Helper to check if Firebase is fully configured and active
const isFirebaseActive = (): boolean => {
  return !!(firebaseConfig && firebaseConfig.apiKey);
};

// 3. Initialize Firebase resiliently so that missing config never crashes container startup
let dbInstance: any = null;

if (isFirebaseActive()) {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} else {
  console.warn("⚠️ Firebase configuration is missing or incomplete! Using local JSON file fallback database.");
  dbInstance = { isMock: true };
}

export const db = dbInstance;

// === Local File Storage Fallback for Seamless Resilient Offline Development ===
const LOCAL_DB_PATH = path.join(process.cwd(), "local-db.json");

function readLocalDb() {
  if (!existsSync(LOCAL_DB_PATH)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(LOCAL_DB_PATH, "utf-8"));
  } catch (e) {
    console.error("Failed to parse local-db.json, returning empty:", e);
    return {};
  }
}

function writeLocalDb(data: any) {
  try {
    writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write local-db.json:", e);
  }
}

// Mock references to mimic Firestore class interfaces
class MockDocRef {
  type = "document" as const;
  constructor(public collectionName: string, public docId: string) {}
  get id() { return this.docId; }
  get path() { return `${this.collectionName}/${this.docId}`; }
}

class MockCollectionRef {
  type = "collection" as const;
  constructor(public collectionName: string) {}
}

class MockQuery {
  orderByFields: { field: string; direction: "asc" | "desc" }[] = [];
  constructor(public collectionRef: MockCollectionRef, constraints: any[]) {
    for (const c of constraints) {
      if (c && c.type === "orderBy") {
        this.orderByFields.push({ field: c.field, direction: c.direction });
      }
    }
  }
}

// Wrapped resilient API methods
export function doc(db: any, collectionNameOrPath: string, ...pathSegments: string[]) {
  if (isFirebaseActive()) {
    return realDoc(db, collectionNameOrPath, ...pathSegments);
  }
  const docId = pathSegments[0] || "default";
  return new MockDocRef(collectionNameOrPath, docId);
}

export function collection(db: any, collectionName: string) {
  if (isFirebaseActive()) {
    return realCollection(db, collectionName);
  }
  return new MockCollectionRef(collectionName);
}

export async function getDoc(docRef: any) {
  if (isFirebaseActive()) {
    return await realGetDoc(docRef);
  }
  if (docRef instanceof MockDocRef) {
    const dbData = readLocalDb() as any;
    const colData = dbData[docRef.collectionName] || {};
    const docData = colData[docRef.docId];
    return {
      exists: () => docData !== undefined,
      data: () => docData,
      id: docRef.docId
    };
  }
  throw new Error("Invalid Document Reference passed to getDoc");
}

export async function setDoc(docRef: any, data: any, options?: any) {
  if (isFirebaseActive()) {
    return await realSetDoc(docRef, data, options);
  }
  if (docRef instanceof MockDocRef) {
    const dbData = readLocalDb() as any;
    if (!dbData[docRef.collectionName]) {
      dbData[docRef.collectionName] = {};
    }
    const existing = dbData[docRef.collectionName][docRef.docId] || {};
    const merged = (options && options.merge) ? { ...existing, ...data } : data;
    dbData[docRef.collectionName][docRef.docId] = merged;
    writeLocalDb(dbData);
    return;
  }
  throw new Error("Invalid Document Reference passed to setDoc");
}

export async function updateDoc(docRef: any, data: any) {
  if (isFirebaseActive()) {
    return await realUpdateDoc(docRef, data);
  }
  if (docRef instanceof MockDocRef) {
    const dbData = readLocalDb() as any;
    if (!dbData[docRef.collectionName]) {
      dbData[docRef.collectionName] = {};
    }
    const existing = dbData[docRef.collectionName][docRef.docId] || {};
    dbData[docRef.collectionName][docRef.docId] = { ...existing, ...data };
    writeLocalDb(dbData);
    return;
  }
  throw new Error("Invalid Document Reference passed to updateDoc");
}

export async function deleteDoc(docRef: any) {
  if (isFirebaseActive()) {
    return await realDeleteDoc(docRef);
  }
  if (docRef instanceof MockDocRef) {
    const dbData = readLocalDb() as any;
    if (dbData[docRef.collectionName]) {
      delete dbData[docRef.collectionName][docRef.docId];
      writeLocalDb(dbData);
    }
    return;
  }
  throw new Error("Invalid Document Reference passed to deleteDoc");
}

export async function addDoc(collectionRef: any, data: any) {
  if (isFirebaseActive()) {
    return await realAddDoc(collectionRef, data);
  }
  if (collectionRef instanceof MockCollectionRef) {
    const dbData = readLocalDb() as any;
    if (!dbData[collectionRef.collectionName]) {
      dbData[collectionRef.collectionName] = {};
    }
    const newId = "local_" + Math.random().toString(36).substring(2, 11);
    dbData[collectionRef.collectionName][newId] = data;
    writeLocalDb(dbData);
    return {
      id: newId,
      path: `${collectionRef.collectionName}/${newId}`
    };
  }
  throw new Error("Invalid Collection Reference passed to addDoc");
}

export async function getDocs(queryOrRef: any) {
  if (isFirebaseActive()) {
    return await realGetDocs(queryOrRef);
  }
  let collectionName = "";
  if (queryOrRef instanceof MockCollectionRef) {
    collectionName = queryOrRef.collectionName;
  } else if (queryOrRef instanceof MockQuery) {
    collectionName = queryOrRef.collectionRef.collectionName;
  } else {
    throw new Error("Invalid Query/Collection Reference passed to getDocs");
  }

  const dbData = readLocalDb() as any;
  const colData = dbData[collectionName] || {};
  const docs = Object.keys(colData).map(id => {
    return {
      id,
      data: () => colData[id]
    };
  });

  // Handle optional ordering if constraints are defined
  if (queryOrRef instanceof MockQuery && queryOrRef.orderByFields.length > 0) {
    const { field, direction } = queryOrRef.orderByFields[0];
    docs.sort((a, b) => {
      const valA = a.data()[field];
      const valB = b.data()[field];
      if (valA === undefined) return 1;
      if (valB === undefined) return -1;
      if (valA < valB) return direction === "desc" ? 1 : -1;
      if (valA > valB) return direction === "desc" ? -1 : 1;
      return 0;
    });
  }

  return {
    docs,
    forEach: (callback: (doc: any) => void) => {
      docs.forEach(callback);
    },
    size: docs.length,
    empty: docs.length === 0
  };
}

export function query(collectionRef: any, ...constraints: any[]) {
  if (isFirebaseActive()) {
    return realQuery(collectionRef, ...constraints);
  }
  if (collectionRef instanceof MockCollectionRef) {
    return new MockQuery(collectionRef, constraints);
  }
  throw new Error("Invalid Collection Reference passed to query");
}

export function orderBy(field: string, direction: "asc" | "desc" = "asc") {
  if (isFirebaseActive()) {
    return realOrderBy(field, direction);
  }
  return { type: "orderBy" as const, field, direction };
}

