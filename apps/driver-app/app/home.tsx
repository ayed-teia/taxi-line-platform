import React, { useCallback } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore, useDriverStore, useTripStore } from '../src/store';
import { HomeScreen } from '../src/features/home';
import { ActiveTripScreen } from '../src/features/trip';
import { updateTripStatus } from '../src/services/api';
import { TripStatus } from '@taxi-line/shared';

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const { setStatus } = useDriverStore();
  const { activeTripId, tripStatus } = useTripStore();

  // Handle status toggle - UI only for now
  // TODO: Implement actual GPS tracking and Firestore writes when ready
  const handleToggleStatus = useCallback(
    (goOnline: boolean) => {
      // UI-only toggle - no Firestore writes yet
      // Future: Call setDriverAvailability, updateDriverLocation
      if (goOnline) {
        setStatus('online');
      } else {
        setStatus('offline');
      }
    },
    [setStatus]
  );

  // Handle trip status update
  const handleUpdateTripStatus = useCallback(
    async (newStatus: TripStatus) => {
      if (!activeTripId) return;

      try {
        // Call Cloud Function to update trip status
        await updateTripStatus(activeTripId, newStatus);
      } catch (error) {
        console.error('Failed to update trip status:', error);
      }
    },
    [activeTripId]
  );

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  // Show active trip screen if there's an ongoing trip
  if (activeTripId && tripStatus) {
    return (
      <ActiveTripScreen
        tripId={activeTripId}
        status={tripStatus}
        onUpdateStatus={handleUpdateTripStatus}
      />
    );
  }

  // Default: show home screen
  return <HomeScreen onToggleStatus={handleToggleStatus} />;
}
