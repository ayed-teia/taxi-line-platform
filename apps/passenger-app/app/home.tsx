import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore, useTripStore } from '../src/store';
import { MapScreen } from '../src/features/map';
import { ActiveTripScreen } from '../src/features/trip';

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const { activeTripId, tripStatus } = useTripStore();

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
        onCancel={() => {
          // TODO: Call Cloud Function to cancel trip
          console.log('Cancel trip - will call Cloud Function');
        }}
      />
    );
  }

  // Default: show map screen
  return <MapScreen />;
}
