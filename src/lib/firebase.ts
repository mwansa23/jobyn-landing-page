import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  connectAuthEmulator,
  type Auth,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

function getMissingFirebaseConfig(): string[] {
  return Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export function isFirebaseConfigured(): boolean {
  return getMissingFirebaseConfig().length === 0;
}

function assertFirebaseConfig(): void {
  const missing = getMissingFirebaseConfig();
  if (missing.length > 0) {
    throw new Error(`Missing Firebase configuration: ${missing.join(", ")}`);
  }
}

export function getFirebaseApp() {
  assertFirebaseConfig();
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

let authInstance: Auth | null = null;
let persistenceReady: Promise<void> | null = null;
let authStateReady: Promise<User | null> | null = null;

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
    const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
    if (
      import.meta.env.DEV &&
      import.meta.env.MODE === "test" &&
      firebaseConfig.projectId?.startsWith("demo-") &&
      emulatorHost === "127.0.0.1:9099"
    ) {
      connectAuthEmulator(authInstance, `http://${emulatorHost}`, { disableWarnings: true });
    }
    persistenceReady = setPersistence(authInstance, browserLocalPersistence);
  }
  return authInstance;
}

export async function waitForFirebaseAuthPersistence(): Promise<Auth> {
  const auth = getFirebaseAuth();
  if (persistenceReady) await persistenceReady;
  return auth;
}

export function getFirebaseCurrentUser(): User | null {
  if (typeof window === "undefined" || !isFirebaseConfigured()) return null;
  return getFirebaseAuth().currentUser;
}

async function waitForFirebaseCurrentUser(): Promise<User | null> {
  const auth = await waitForFirebaseAuthPersistence();
  if (auth.currentUser) return auth.currentUser;

  if (!authStateReady) {
    authStateReady = new Promise<User | null>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  return authStateReady;
}

export async function getCurrentFirebaseIdToken(): Promise<string | null> {
  if (typeof window === "undefined" || !isFirebaseConfigured()) return null;

  const user = await waitForFirebaseCurrentUser();
  if (!user) return null;
  return user.getIdToken();
}
