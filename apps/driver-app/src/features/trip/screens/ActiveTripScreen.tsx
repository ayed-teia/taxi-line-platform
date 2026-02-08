import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { TripStatus } from '@taxi-line/shared';
import { Button } from '../../../ui';
import { driverArrived, startTrip, completeTrip, confirmCashPayment } from '../../../services/api';
import { 
  subscribeToActiveRoadblocks, 
  checkRouteIntersectsRoadblocks,
  RoadblockData 
} from '../../../services/realtime';

interface ActiveTripScreenProps {
  tripId: string;
  status: TripStatus;
  estimatedPriceIls?: number;
  fareAmount?: number;
  paymentStatus?: 'pending' | 'paid';
  pickup?: { lat: number; lng: number };
  dropoff?: { lat: number; lng: number };
  onTripCompleted: () => void;
  onPaymentConfirmed?: () => void;
}

/**
 * Active Trip Screen for Driver
 * Shows current trip details and allows status updates via Cloud Functions
 */
export function ActiveTripScreen({ 
  tripId, 
  status, 
  estimatedPriceIls,
  fareAmount,
  paymentStatus = 'pending',
  pickup,
  dropoff,
  onTripCompleted,
  onPaymentConfirmed
}: ActiveTripScreenProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCollectingPayment, setIsCollectingPayment] = useState(false);
  const [roadblocks, setRoadblocks] = useState<RoadblockData[]>([]);
  const [intersectingRoadblocks, setIntersectingRoadblocks] = useState<RoadblockData[]>([]);

  // Subscribe to roadblocks
  useEffect(() => {
    const unsubscribe = subscribeToActiveRoadblocks(
      (data) => {
        setRoadblocks(data);
      },
      (error) => {
        console.error('❌ [ActiveTrip] Roadblocks subscription error:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Check for route intersection with closed roadblocks
  useEffect(() => {
    if (pickup && dropoff && roadblocks.length > 0) {
      const intersecting = checkRouteIntersectsRoadblocks(pickup, dropoff, roadblocks);
      setIntersectingRoadblocks(intersecting);
      if (intersecting.length > 0) {
        console.log('🚧 [ActiveTrip] Route intersects roadblocks:', intersecting.length);
      }
    } else {
      setIntersectingRoadblocks([]);
    }
  }, [pickup, dropoff, roadblocks]);

  const getStatusDisplay = (tripStatus: TripStatus) => {
    switch (tripStatus) {
      case 'accepted':
        return { text: 'Heading to pickup', icon: '🚗', action: 'Arrived at Pickup' };
      case 'driver_arrived':
        return { text: 'Waiting for passenger', icon: '📍', action: 'Start Trip' };
      case 'in_progress':
        return { text: 'Trip in progress', icon: '🛣️', action: 'Complete Trip' };
      case 'completed':
        return { text: 'Trip completed', icon: '✅', action: null }; // Payment handled separately
      default:
        return { text: 'Unknown status', icon: '❓', action: null };
    }
  };

  const handleAction = useCallback(async () => {
    setIsUpdating(true);
    console.log(`🚗 [ActiveTrip] Action triggered for status: ${status}`);
    
    try {
      switch (status) {
        case 'accepted':
          console.log('📍 [ActiveTrip] Calling driverArrived...');
          await driverArrived(tripId);
          console.log('✅ [ActiveTrip] Driver marked as arrived');
          break;
        case 'driver_arrived':
          console.log('🛣️ [ActiveTrip] Calling startTrip...');
          await startTrip(tripId);
          console.log('✅ [ActiveTrip] Trip started');
          break;
        case 'in_progress':
          console.log('🏁 [ActiveTrip] Calling completeTrip...');
          const result = await completeTrip(tripId);
          console.log('✅ [ActiveTrip] Trip completed, fare:', result.finalPriceIls);
          Alert.alert(
            'Trip Completed!',
            `Final fare: ₪${result.finalPriceIls}`,
            [{ text: 'OK', onPress: onTripCompleted }]
          );
          return; // Don't reset isUpdating, we're navigating away
        default:
          console.log('⚠️ [ActiveTrip] Unknown status, no action');
          return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update trip';
      console.error('❌ [ActiveTrip] Action failed:', message);
      Alert.alert('Error', message);
    } finally {
      setIsUpdating(false);
    }
  }, [tripId, status, onTripCompleted]);

  const statusDisplay = getStatusDisplay(status);
  const hasAction = status === 'accepted' || status === 'driver_arrived' || status === 'in_progress';

  return (
    <View style={styles.container}>
      {/* Roadblock Warning Banner */}
      {intersectingRoadblocks.length > 0 && (
        <View style={styles.roadblockBanner}>
          <Text style={styles.roadblockBannerIcon}>🚧</Text>
          <View style={styles.roadblockBannerText}>
            <Text style={styles.roadblockBannerTitle}>Road Closure Ahead</Text>
            <Text style={styles.roadblockBannerMessage}>
              {intersectingRoadblocks.length === 1 
                ? 'Your route passes through a closed road'
                : `Your route passes through ${intersectingRoadblocks.length} closed roads`}
            </Text>
            {intersectingRoadblocks[0]?.note && (
              <Text style={styles.roadblockNote}>{intersectingRoadblocks[0].note}</Text>
            )}
          </View>
        </View>
      )}

      {/* Map placeholder */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapEmoji}>🗺️</Text>
        <Text style={styles.routeText}>Route to destination</Text>
        {/* Roadblock indicators on map placeholder */}
        {roadblocks.length > 0 && (
          <View style={styles.roadblockIndicator}>
            <Text style={styles.roadblockIndicatorText}>🚧 {roadblocks.length} roadblock(s)</Text>
          </View>
        )}
      </View>

      {/* Trip info card */}
      <View style={styles.tripCard}>
        <View style={styles.statusContainer}>
          <Text style={styles.statusIcon}>{statusDisplay.icon}</Text>
          <Text style={styles.statusText}>{statusDisplay.text}</Text>
        </View>

        <View style={styles.tripDetails}>
          <Text style={styles.tripId}>Trip: {tripId.slice(0, 8)}...</Text>
          
          {estimatedPriceIls && (
            <Text style={styles.priceText}>Fare: ₪{estimatedPriceIls}</Text>
          )}
          
          {/* Placeholder passenger info */}
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerName}>👤 Passenger Name</Text>
            <Text style={styles.passengerPhone}>📞 +972-XXX-XXXX</Text>
          </View>
        </View>

        {hasAction && statusDisplay.action && (
          <Button
            title={isUpdating ? 'Updating...' : statusDisplay.action}
            onPress={handleAction}
            disabled={isUpdating}
            loading={isUpdating}
          />
        )}

        {status === 'completed' && paymentStatus === 'pending' && (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentLabel}>💵 Cash Payment</Text>
            <Text style={styles.paymentAmount}>₪{fareAmount || estimatedPriceIls}</Text>
            <Button
              title={isCollectingPayment ? 'Confirming...' : '✅ Cash Collected'}
              onPress={async () => {
                setIsCollectingPayment(true);
                try {
                  console.log('💵 [ActiveTrip] Confirming cash payment...');
                  const result = await confirmCashPayment(tripId);
                  console.log('✅ [ActiveTrip] Payment confirmed:', result);
                  Alert.alert(
                    'Payment Confirmed',
                    `₪${result.fareAmount} cash collected`,
                    [{ text: 'OK', onPress: () => {
                      onPaymentConfirmed?.();
                      onTripCompleted();
                    }}]
                  );
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Failed to confirm payment';
                  console.error('❌ [ActiveTrip] Payment confirmation failed:', message);
                  Alert.alert('Error', message);
                } finally {
                  setIsCollectingPayment(false);
                }
              }}
              disabled={isCollectingPayment}
              loading={isCollectingPayment}
            />
          </View>
        )}

        {status === 'completed' && paymentStatus === 'paid' && (
          <View style={styles.completedMessage}>
            <Text style={styles.completedText}>✅ Trip completed</Text>
            <Text style={styles.paidText}>💵 Payment collected</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C8D6C5',
  },
  mapEmoji: {
    fontSize: 64,
  },
  routeText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666666',
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  tripDetails: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 16,
  },
  tripId: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 12,
  },
  passengerInfo: {
    gap: 8,
  },
  passengerName: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  passengerPhone: {
    fontSize: 16,
    color: '#3C3C43',
  },
  completedMessage: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  completedText: {
    fontSize: 18,
    color: '#34C759',
    fontWeight: '600',
  },
  paymentSection: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F0FFF4',
    borderRadius: 12,
    marginBottom: 16,
  },
  paymentLabel: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#34C759',
    marginBottom: 16,
  },
  paidText: {
    fontSize: 16,
    color: '#34C759',
    marginTop: 8,
  },
  roadblockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    padding: 12,
    paddingHorizontal: 16,
  },
  roadblockBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  roadblockBannerText: {
    flex: 1,
  },
  roadblockBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  roadblockBannerMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  roadblockNote: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
    fontStyle: 'italic',
  },
  roadblockIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roadblockIndicatorText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
