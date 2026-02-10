import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { getFirestoreDb } from './firebase';

/**
 * ============================================================================
 * DRIVERS REALTIME SERVICE
 * ============================================================================
 * 
 * Subscribes to realtime updates from the drivers collection.
 * 
 * FIRESTORE COLLECTION: drivers/{driverId}
 * 
 * ============================================================================
 */

/**
 * Driver document structure
 */
export interface DriverDocument {
  id: string;
  status: 'online' | 'offline';
  location?: {
    lat: number;
    lng: number;
    updatedAt: Timestamp | null;
  };
  lastSeen: Timestamp | null;
}

/**
 * Subscribe to realtime driver updates
 * 
 * @param callback - Function called whenever drivers data changes
 * @returns Unsubscribe function
 */
export function subscribeToDrivers(
  callback: (drivers: DriverDocument[]) => void
): () => void {
  const db = getFirestoreDb();
  const driversRef = collection(db, 'drivers');

  console.log('🎧 [Drivers] Starting realtime subscription...');

  const unsubscribe = onSnapshot(
    driversRef,
    (snapshot) => {
      const drivers: DriverDocument[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        drivers.push({
          id: doc.id,
          status: data.status || 'offline',
          location: data.location ? {
            lat: data.location.lat,
            lng: data.location.lng,
            updatedAt: data.location.updatedAt || null,
          } : undefined,
          lastSeen: data.lastSeen || null,
        });
      });

      console.log(`🔄 Drivers snapshot updated: ${drivers.length} driver(s)`);
      callback(drivers);
    },
    (error) => {
      console.error('❌ [Drivers] Snapshot error:', error);
    }
  );

  return unsubscribe;
}
