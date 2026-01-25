import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import Constants from 'expo-constants';

/**
 * Firebase configuration for Driver App
 * Environment variables are loaded via Expo Constants
 */
const expoConfig = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: (expoConfig.firebaseApiKey as string) || 'demo-api-key',
  authDomain: (expoConfig.firebaseAuthDomain as string) || 'localhost',
  projectId: (expoConfig.firebaseProjectId as string) || 'demo-taxi-line',
  storageBucket: (expoConfig.firebaseStorageBucket as string) || 'demo-taxi-line.appspot.com',
  messagingSenderId: (expoConfig.firebaseMessagingSenderId as string) || '123456789',
  appId: (expoConfig.firebaseAppId as string) || '1:123456789:web:abc123',
};

// Emulator configuration
const useEmulators = expoConfig.useEmulators === true || expoConfig.useEmulators === 'true';
const emulatorHost = (expoConfig.emulatorHost as string) || '127.0.0.1';

// Emulator ports (must match firebase.json)
const EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  functions: 5001,
} as const;

const FUNCTIONS_REGION = 'europe-west1';

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let functions: Functions;

export function initializeFirebase(): FirebaseApp {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    
    if (useEmulators) {
      console.log(`🔧 Firebase configured for EMULATOR mode at ${emulatorHost}`);
    }
  } else {
    app = getApps()[0]!;
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const firebaseApp = initializeFirebase();
    auth = getAuth(firebaseApp);
    if (useEmulators) {
      connectAuthEmulator(auth, `http://${emulatorHost}:${EMULATOR_PORTS.auth}`, {
        disableWarnings: true,
      });
      console.log(`  ✓ Auth Emulator: http://${emulatorHost}:${EMULATOR_PORTS.auth}`);
    }
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    const firebaseApp = initializeFirebase();
    firestore = getFirestore(firebaseApp);
    if (useEmulators) {
      connectFirestoreEmulator(firestore, emulatorHost, EMULATOR_PORTS.firestore);
      console.log(`  ✓ Firestore Emulator: ${emulatorHost}:${EMULATOR_PORTS.firestore}`);
    }
  }
  return firestore;
}

export function getFirebaseFunctions(): Functions {
  if (!functions) {
    const firebaseApp = initializeFirebase();
    functions = getFunctions(firebaseApp, FUNCTIONS_REGION);
    if (useEmulators) {
      connectFunctionsEmulator(functions, emulatorHost, EMULATOR_PORTS.functions);
      console.log(`  ✓ Functions Emulator: ${emulatorHost}:${EMULATOR_PORTS.functions}`);
    }
  }
  return functions;
}

/**
 * Check if using emulators
 */
export function isUsingEmulators(): boolean {
  return useEmulators;
}

// Initialize on import
initializeFirebase();

