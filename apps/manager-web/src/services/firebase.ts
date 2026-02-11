import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';
import {
  parseAppMode,
  shouldAllowEmulators,
  getConnectionGuardMessage,
  validateAppModeConfig,
  type AppMode,
} from '@taxi-line/shared';

// Firebase configuration for manager web
// In production, use environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-taxi-line.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-taxi-line',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-taxi-line.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abc123',
};

// ============================================================================
// APP MODE CONFIGURATION (Step 33)
// ============================================================================

const appMode: AppMode = parseAppMode(import.meta.env.VITE_APP_MODE);
const emulatorsRequested = import.meta.env.VITE_USE_EMULATORS === 'true';
const useEmulators = shouldAllowEmulators(appMode, emulatorsRequested);
const emulatorHost = import.meta.env.VITE_EMULATOR_HOST || '127.0.0.1';

// Log connection guard message
const connectionMessage = getConnectionGuardMessage(appMode, emulatorsRequested);
if (connectionMessage) {
  console.log(connectionMessage);
}

// Validate config and log warnings
const configWarnings = validateAppModeConfig(appMode, firebaseConfig.projectId);
configWarnings.forEach(warning => console.warn(warning));

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let functions: Functions | null = null;
let emulatorsConnected = false;

export function initializeFirebase(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
    // Connection mode already logged at startup via getConnectionGuardMessage()
  }
  return app;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    const firebaseApp = initializeFirebase();
    db = getFirestore(firebaseApp);
    
    if (useEmulators && !emulatorsConnected) {
      connectFirestoreEmulator(db, emulatorHost, 8080);
      console.log(`  ✓ Firestore Emulator: ${emulatorHost}:8080`);
    }
  }
  return db;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const firebaseApp = initializeFirebase();
    auth = getAuth(firebaseApp);
    
    if (useEmulators && !emulatorsConnected) {
      connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
      console.log(`  ✓ Auth Emulator: http://${emulatorHost}:9099`);
      emulatorsConnected = true;
    }
  }
  return auth;
}

export function getFunctionsInstance(): Functions {
  if (!functions) {
    const firebaseApp = initializeFirebase();
    functions = getFunctions(firebaseApp, 'me-west1');
    
    if (useEmulators) {
      connectFunctionsEmulator(functions, emulatorHost, 5001);
      console.log(`  ✓ Functions Emulator: ${emulatorHost}:5001`);
    }
  }
  return functions;
}
