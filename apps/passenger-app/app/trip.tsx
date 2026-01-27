import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../src/store';
import { ActiveTripScreen } from '../src/features/trip';
import { 
  subscribeToTrip, 
  subscribeToDriverLocation,
  TripData, 
  DriverLocation 
} from '../src/services/realtime';
import { TripStatus } from '@taxi-line/shared';

export default function Trip() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const params = useLocalSearchParams<{ tripId: string }>();
  
  const [trip, setTrip] = useState<TripData | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tripId = params.tripId;

  // Subscribe to trip updates
  useEffect(() => {
    if (!tripId) return;

    const unsubscribe = subscribeToTrip(
      tripId,
      (tripData) => {
        setTrip(tripData);
        setLoading(false);
        
        // If trip is completed or cancelled, navigate home after delay
        if (tripData?.status === 'completed' || tripData?.status === 'cancelled') {
          setTimeout(() => {
            router.replace('/home');
          }, 3000);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tripId, router]);

  // Subscribe to driver location when we have a driverId
  useEffect(() => {
    if (!trip?.driverId) {
      setDriverLocation(null);
      return;
    }

    // Only track driver for active trips
    const activeStatuses = ['driver_assigned', 'driver_arrived', 'in_progress'];
    if (!activeStatuses.includes(trip.status)) {
      setDriverLocation(null);
      return;
    }

    const unsubscribe = subscribeToDriverLocation(
      trip.driverId,
      (location) => {
        setDriverLocation(location);
      },
      (err) => {
        console.error('Error subscribing to driver location:', err);
      }
    );

    return () => unsubscribe();
  }, [trip?.driverId, trip?.status]);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  // Validate required params
  if (!tripId) {
    return <Redirect href="/home" />;
  }

  const handleCancel = () => {
    // TODO: Call Cloud Function to cancel trip
    console.log('Cancel trip - will call Cloud Function');
    router.replace('/home');
  };

  const handleGoHome = () => {
    router.replace('/home');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading trip...</Text>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Trip not found'}</Text>
      </View>
    );
  }

  return (
    <ActiveTripScreen
      tripId={tripId}
      status={trip.status as TripStatus}
      estimatedPriceIls={trip.estimatedPriceIls}
      driverLocation={driverLocation}
      onCancel={handleCancel}
      onGoHome={handleGoHome}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
});
