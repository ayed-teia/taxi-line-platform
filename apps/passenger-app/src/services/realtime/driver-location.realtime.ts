import { getFirestore, doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { initializeFirebase } from '../firebase';

/**
 * Get Firestore instance
 */
function getFirestoreDb() {
  const app = initializeFirebase();
  return getFirestore(app);
}

/**
 * Driver live location data from Firestore
 */
export interface DriverLocation {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  updatedAt: Date | null;
}

/**
 * Subscribe to a driver's live location (read-only)
 * Used by passengers to track their driver during active trips
 * 
 * @param driverId - The driver's user ID
 * @param onData - Callback with location data (null if no location)
 * @param onError - Error callback
 * @returns Unsubscribe function
 */
export function subscribeToDriverLocation(
  driverId: string,
  onData: (location: DriverLocation | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const db = getFirestoreDb();
  const locationRef = doc(db, 'driverLive', driverId);

  return onSnapshot(
    locationRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onData({
          lat: data.lat,
          lng: data.lng,
          heading: data.heading ?? null,
          speed: data.speed ?? null,
          updatedAt: data.updatedAt?.toDate() ?? null,
        });
      } else {
        onData(null);
      }
    },
    onError
  );
}
