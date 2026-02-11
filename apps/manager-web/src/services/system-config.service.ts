/**
 * System Configuration Service
 * 
 * Step 32: Pilot Hardening & Kill Switches
 * 
 * Manages system-wide configuration including the trips kill switch.
 */

import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getFirestoreDb, getFunctionsInstance } from './firebase';

/**
 * System configuration document
 */
export interface SystemConfig {
  tripsEnabled: boolean;
  updatedAt?: Date;
  updatedBy?: string;
}

/**
 * Subscribe to system configuration changes
 */
export function subscribeToSystemConfig(
  onData: (config: SystemConfig) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getFirestoreDb();
  const configRef = doc(db, 'system', 'config');
  
  return onSnapshot(
    configRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onData({
          tripsEnabled: data.tripsEnabled ?? true,
          updatedAt: data.updatedAt?.toDate(),
          updatedBy: data.updatedBy,
        });
      } else {
        // Default config
        onData({ tripsEnabled: true });
      }
    },
    (error) => {
      console.error('Error subscribing to system config:', error);
      onError?.(error);
    }
  );
}

/**
 * Toggle trips enabled/disabled (kill switch)
 */
export async function toggleTripsEnabled(enabled: boolean): Promise<void> {
  const functions = getFunctionsInstance();
  const toggleTrips = httpsCallable<{ enabled: boolean }, { tripsEnabled: boolean }>(
    functions,
    'managerToggleTrips'
  );
  
  await toggleTrips({ enabled });
}

/**
 * Force cancel a trip (manager override)
 */
export async function forceCancelTrip(tripId: string, reason?: string): Promise<void> {
  const functions = getFunctionsInstance();
  const forceCancel = httpsCallable<{ tripId: string; reason?: string }, { cancelled: boolean }>(
    functions,
    'managerForceCancelTrip'
  );
  
  await forceCancel({ tripId, reason });
}
