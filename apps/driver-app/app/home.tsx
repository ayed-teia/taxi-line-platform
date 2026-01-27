import React, { useCallback, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { Alert } from 'react-native';
import { useAuthStore, useDriverStore } from '../src/store';
import { HomeScreen } from '../src/features/home';
import { 
  startLocationTracking, 
  stopLocationTracking,
  requestLocationPermissions,
  setDriverAvailability,
  getCurrentLocation,
} from '../src/services/location';

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const { status, setStatus } = useDriverStore();

  // Handle location tracking based on online status
  useEffect(() => {
    if (!user?.uid) return;

    const manageTracking = async () => {
      if (status === 'online') {
        const started = await startLocationTracking(user.uid);
        if (!started) {
          console.warn('Failed to start location tracking');
        }
      } else {
        await stopLocationTracking();
      }
    };

    manageTracking();

    // Cleanup on unmount
    return () => {
      stopLocationTracking();
    };
  }, [status, user?.uid]);

  // Handle status toggle with location tracking
  const handleToggleStatus = useCallback(
    async (goOnline: boolean) => {
      if (!user?.uid) return;

      if (goOnline) {
        // Request permissions first
        const hasPermission = await requestLocationPermissions();
        if (!hasPermission) {
          Alert.alert(
            'Location Required',
            'Location permission is required to go online. Please enable location access in settings.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Get current location for availability
        const location = await getCurrentLocation();
        
        // Update Firestore availability
        try {
          await setDriverAvailability(user.uid, true, location ?? undefined);
          setStatus('online');
        } catch (error) {
          console.error('Failed to go online:', error);
          Alert.alert('Error', 'Failed to go online. Please try again.');
        }
      } else {
        // Go offline
        try {
          await setDriverAvailability(user.uid, false);
          setStatus('offline');
        } catch (error) {
          console.error('Failed to go offline:', error);
        }
      }
    },
    [user?.uid, setStatus]
  );

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  // Default: show home screen
  // Active trips are now handled via /trip route with realtime subscription
  return <HomeScreen onToggleStatus={handleToggleStatus} />;
}
