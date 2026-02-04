import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  connectAuthEmulator,
  Auth
} from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Firebase configuration for Passenger App
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

// ============================================================================
// INITIALIZE FIREBASE AT MODULE SCOPE (ONCE)
// ============================================================================

// Initialize Firebase App
const app: FirebaseApp = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();

if (useEmulators) {
  console.log(`🔧 Firebase configured for EMULATOR mode at ${emulatorHost}`);
}

// Initialize Auth with proper persistence for React Native
export const auth: Auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

// Connect Auth Emulator
if (useEmulators) {
  try {
    connectAuthEmulator(auth, `http://${emulatorHost}:${EMULATOR_PORTS.auth}`, {
      disableWarnings: true,
    });
    console.log(`  ✓ Auth Emulator: http://${emulatorHost}:${EMULATOR_PORTS.auth}`);
  } catch (e) {
    // Emulator already connected
  }
}

// Initialize Firestore
export const db: Firestore = getFirestore(app);

if (useEmulators) {
  try {
    connectFirestoreEmulator(db, emulatorHost, EMULATOR_PORTS.firestore);
    console.log(`  ✓ Firestore Emulator: ${emulatorHost}:${EMULATOR_PORTS.firestore}`);
  } catch (e) {
    // Emulator already connected
  }
}

// Initialize Functions
export const functions: Functions = getFunctions(app, FUNCTIONS_REGION);

if (useEmulators) {
  try {
    connectFunctionsEmulator(functions, emulatorHost, EMULATOR_PORTS.functions);
    console.log(`  ✓ Functions Emulator: ${emulatorHost}:${EMULATOR_PORTS.functions}`);
  } catch (e) {
    // Emulator already connected
  }
}

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

/** @deprecated Use `auth` directly instead */
export function getFirebaseAuth(): Auth {
  return auth;
}

/** @deprecated Use `auth` directly instead */
export async function getFirebaseAuthAsync(): Promise<Auth> {
  return auth;
}

/** @deprecated Use `db` directly instead */
export function getFirebaseFirestore(): Firestore {
  return db;
}

/** @deprecated Use `functions` directly instead */
export function getFirebaseFunctions(): Functions {
  return functions;
}

/** @deprecated Use `app` directly instead */
export function initializeFirebase(): FirebaseApp {
  return app;
}

/**
 * Check if using emulators
 */
export function isUsingEmulators(): boolean {
  return useEmulators;
}

// Export app for other modules that might need it
export { app };
