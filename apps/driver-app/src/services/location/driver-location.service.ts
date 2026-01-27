import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  GeoPoint,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '../firebase';

/**
 * Driver Live Location Service
 *
 * ALLOWED WRITES per Firestore rules:
 * - driverLive/{driverId}: Driver can write their own location
 * - driverAvailability/{driverId}: Driver can update their own availability
 * - drivers/{driverId}: Driver can update their own profile
 *
 * These are the ONLY Firestore writes allowed from the driver app.
 */

/**
 * Location update data structure
 */
export interface LocationUpdate {
  lat: number;
  lng: number;
  heading?: number | undefined;
  speed?: number | undefined;
}

/**
 * Update driver's live location
 * This write is allowed by Firestore rules for the driver's own document
 */
export async function updateDriverLocation(
  driverId: string,
  location: LocationUpdate
): Promise<void> {
  const db = getFirebaseFirestore();
  const locationRef = doc(db, 'driverLive', driverId);

  await setDoc(locationRef, {
    lat: location.lat,
    lng: location.lng,
    heading: location.heading ?? null,
    speed: location.speed ?? null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Remove driver's live location (when going offline)
 */
export async function removeDriverLocation(driverId: string): Promise<void> {
  const db = getFirebaseFirestore();
  const locationRef = doc(db, 'driverLive', driverId);

  await deleteDoc(locationRef);
}

/**
 * Set driver availability status
 * This write is allowed by Firestore rules for the driver's own document
 */
export async function setDriverAvailability(
  driverId: string,
  isOnline: boolean,
  currentLocation?: { lat: number; lng: number }
): Promise<void> {
  const db = getFirebaseFirestore();
  const availabilityRef = doc(db, 'driverAvailability', driverId);

  if (isOnline) {
    await setDoc(availabilityRef, {
      isOnline: true,
      lastLocation: currentLocation
        ? new GeoPoint(currentLocation.lat, currentLocation.lng)
        : null,
      onlineSince: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(availabilityRef, {
      isOnline: false,
      offlineSince: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
