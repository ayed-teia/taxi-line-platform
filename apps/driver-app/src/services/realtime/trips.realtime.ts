import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  orderBy,
  limit,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '../firebase';

/**
 * Subscribe to available trip requests (read-only)
 * Drivers can read trip requests per Firestore rules
 */
export function subscribeToTripRequests(
  onData: (requests: unknown[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const db = getFirebaseFirestore();
  const requestsRef = collection(db, 'tripRequests');

  // Query for pending requests, ordered by creation time
  const q = query(
    requestsRef,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const requests = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      onData(requests);
    },
    onError
  );
}

/**
 * Subscribe to driver's active trip (read-only)
 */
export function subscribeToActiveTrip(
  driverId: string,
  onData: (trip: unknown) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const db = getFirebaseFirestore();
  const tripsRef = collection(db, 'trips');

  // Query for driver's active trip
  const q = query(
    tripsRef,
    where('driverId', '==', driverId),
    where('status', 'in', ['accepted', 'driver_arrived', 'in_progress']),
    limit(1)
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0]!;
        onData({ id: docSnap.id, ...docSnap.data() });
      } else {
        onData(null);
      }
    },
    onError
  );
}
