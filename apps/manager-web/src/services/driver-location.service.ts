import { collection, onSnapshot, query, Unsubscribe } from 'firebase/firestore';
import { getFirestoreDb } from './firebase';

/**
 * Driver live location data
 */
export interface DriverLiveLocation {
  driverId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  updatedAt: Date | null;
}

/**
 * Subscribe to all driver live locations
 * Manager can read all driver locations for monitoring
 */
export function subscribeToAllDriverLocations(
  onData: (drivers: DriverLiveLocation[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const db = getFirestoreDb();
  const driversRef = collection(db, 'driverLive');
  const q = query(driversRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const drivers: DriverLiveLocation[] = snapshot.docs.map((doc) => ({
        driverId: doc.id,
        lat: doc.data().lat,
        lng: doc.data().lng,
        heading: doc.data().heading ?? null,
        speed: doc.data().speed ?? null,
        updatedAt: doc.data().updatedAt?.toDate() ?? null,
      }));
      onData(drivers);
    },
    onError
  );
}
