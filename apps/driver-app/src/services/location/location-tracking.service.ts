import * as Location from 'expo-location';
import { updateDriverLocation, removeDriverLocation, LocationUpdate } from './driver-location.service';

/**
 * Location tracking configuration
 */
const LOCATION_TRACKING_CONFIG = {
  /** Update interval in milliseconds */
  updateInterval: 2000,
  /** Minimum distance change (meters) to trigger update */
  distanceInterval: 5,
  /** Accuracy setting for battery efficiency */
  accuracy: Location.Accuracy.Balanced,
};

/**
 * Location tracking state
 */
interface TrackingState {
  isTracking: boolean;
  watchId: Location.LocationSubscription | null;
  driverId: string | null;
  lastUpdate: Date | null;
}

const trackingState: TrackingState = {
  isTracking: false,
  watchId: null,
  driverId: null,
  lastUpdate: null,
};

/**
 * Request location permissions
 * Returns true if permissions granted, false otherwise
 */
export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      console.warn('Foreground location permission denied');
      return false;
    }

    // For background tracking (optional, needed for when app is backgrounded)
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    
    if (backgroundStatus !== 'granted') {
      console.warn('Background location permission denied - tracking only works in foreground');
    }

    return true;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
}

/**
 * Check if location services are enabled
 */
export async function isLocationEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    console.error('Error checking location services:', error);
    return false;
  }
}

/**
 * Get current location once
 */
export async function getCurrentLocation(): Promise<LocationUpdate | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      heading: location.coords.heading !== null ? location.coords.heading : undefined,
      speed: location.coords.speed !== null ? location.coords.speed : undefined,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

/**
 * Start location tracking for a driver
 * Updates are sent to Firestore every 2 seconds
 */
export async function startLocationTracking(driverId: string): Promise<boolean> {
  // Already tracking
  if (trackingState.isTracking && trackingState.driverId === driverId) {
    console.log('Location tracking already active for driver:', driverId);
    return true;
  }

  // Stop any existing tracking
  if (trackingState.isTracking) {
    await stopLocationTracking();
  }

  try {
    // Check permissions
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      console.error('Location permissions not granted');
      return false;
    }

    // Check if location services are enabled
    const enabled = await isLocationEnabled();
    if (!enabled) {
      console.error('Location services are disabled');
      return false;
    }

    console.log('Starting location tracking for driver:', driverId);

    // Start watching location
    const watchId = await Location.watchPositionAsync(
      {
        accuracy: LOCATION_TRACKING_CONFIG.accuracy,
        timeInterval: LOCATION_TRACKING_CONFIG.updateInterval,
        distanceInterval: LOCATION_TRACKING_CONFIG.distanceInterval,
      },
      async (location) => {
        const update: LocationUpdate = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          heading: location.coords.heading !== null ? location.coords.heading : undefined,
          speed: location.coords.speed !== null ? location.coords.speed : undefined,
        };

        try {
          await updateDriverLocation(driverId, update);
          trackingState.lastUpdate = new Date();
        } catch (error) {
          console.error('Error updating driver location:', error);
        }
      }
    );

    trackingState.isTracking = true;
    trackingState.watchId = watchId;
    trackingState.driverId = driverId;

    console.log('Location tracking started successfully');
    return true;
  } catch (error) {
    console.error('Error starting location tracking:', error);
    return false;
  }
}

/**
 * Stop location tracking
 * Also removes the driver's live location from Firestore
 */
export async function stopLocationTracking(): Promise<void> {
  if (!trackingState.isTracking) {
    return;
  }

  console.log('Stopping location tracking');

  try {
    // Stop the location watcher
    if (trackingState.watchId) {
      trackingState.watchId.remove();
    }

    // Remove driver's live location from Firestore
    if (trackingState.driverId) {
      await removeDriverLocation(trackingState.driverId);
    }
  } catch (error) {
    console.error('Error stopping location tracking:', error);
  } finally {
    // Reset state
    trackingState.isTracking = false;
    trackingState.watchId = null;
    trackingState.driverId = null;
    trackingState.lastUpdate = null;
  }
}

/**
 * Get tracking status
 */
export function getTrackingStatus(): {
  isTracking: boolean;
  driverId: string | null;
  lastUpdate: Date | null;
} {
  return {
    isTracking: trackingState.isTracking,
    driverId: trackingState.driverId,
    lastUpdate: trackingState.lastUpdate,
  };
}
