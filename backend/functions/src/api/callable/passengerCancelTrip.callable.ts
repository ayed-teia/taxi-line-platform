import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { TripStatus } from '@taxi-line/shared';
import { REGION } from '../../core/env';
import { getFirestore } from '../../core/config';
import { handleError, ValidationError, NotFoundError, ForbiddenError, UnauthorizedError } from '../../core/errors';
import { logger } from '../../core/logger';
import { getAuthenticatedUserId } from '../../core/auth';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * ============================================================================
 * CANCEL TRIP - Passenger Cloud Function
 * ============================================================================
 * 
 * Step 32: Pilot Hardening & Kill Switches
 * 
 * Allows passenger to cancel their trip.
 * 
 * RULES:
 * - Can cancel ONLY if status = "pending" OR "accepted"
 * - Cannot cancel once trip has started (driver_arrived, in_progress)
 * 
 * FLOW:
 * 1. Validate passenger authentication
 * 2. Verify trip belongs to passenger
 * 3. Check trip is in cancellable state
 * 4. Update trip status to cancelled_by_passenger
 * 5. Reset driver availability if assigned
 * 
 * ============================================================================
 */

const CancelTripSchema = z.object({
  tripId: z.string().min(1),
});

interface CancelTripResponse {
  tripId: string;
  cancelled: boolean;
}

/** Statuses that passengers can cancel from */
const PASSENGER_CANCELLABLE_STATUSES: string[] = [
  TripStatus.PENDING,
  TripStatus.ACCEPTED,
];

export const passengerCancelTrip = onCall<unknown, Promise<CancelTripResponse>>(
  {
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    try {
      // ========================================
      // 1. Validate authentication
      // ========================================
      const passengerId = getAuthenticatedUserId(request);
      if (!passengerId) {
        throw new UnauthorizedError('Authentication required to cancel a trip');
      }

      // ========================================
      // 2. Validate input
      // ========================================
      const parsed = CancelTripSchema.safeParse(request.data);
      if (!parsed.success) {
        throw new ValidationError('Invalid cancel request', parsed.error.flatten());
      }

      const { tripId } = parsed.data;
      logger.info('🚫 [PassengerCancel] START', { passengerId, tripId });

      const db = getFirestore();

      // ========================================
      // 3. Run transaction for atomicity
      // ========================================
      await db.runTransaction(async (transaction) => {
        const tripRef = db.collection('trips').doc(tripId);
        const tripDoc = await transaction.get(tripRef);

        if (!tripDoc.exists) {
          throw new NotFoundError('Trip not found');
        }

        const tripData = tripDoc.data()!;

        // Verify trip belongs to this passenger
        if (tripData.passengerId !== passengerId) {
          logger.warn('🚫 [PassengerCancel] Not trip owner', {
            tripPassenger: tripData.passengerId,
            requestingPassenger: passengerId,
          });
          throw new ForbiddenError('You are not the owner of this trip');
        }

        // Check if trip is in cancellable state
        if (!PASSENGER_CANCELLABLE_STATUSES.includes(tripData.status)) {
          logger.warn('🚫 [PassengerCancel] Not cancellable', {
            tripId,
            status: tripData.status,
          });
          throw new ForbiddenError(`Cannot cancel trip with status: ${tripData.status}`);
        }

        // Update trip status
        transaction.update(tripRef, {
          status: TripStatus.CANCELLED_BY_PASSENGER,
          cancelledAt: FieldValue.serverTimestamp(),
          cancellationReason: 'passenger_cancelled',
        });

        // Reset driver availability if assigned
        const driverId = tripData.driverId;
        if (driverId) {
          const driverRef = db.collection('drivers').doc(driverId);
          transaction.update(driverRef, {
            isAvailable: true,
            currentTripId: null,
            updatedAt: FieldValue.serverTimestamp(),
          });
          logger.info('🚗 [PassengerCancel] Driver reset to available', { driverId });
        }

        // Update driver request if exists
        if (driverId) {
          const driverRequestRef = db
            .collection('driverRequests')
            .doc(driverId)
            .collection('requests')
            .doc(tripId);
          
          const driverRequestDoc = await transaction.get(driverRequestRef);
          if (driverRequestDoc.exists) {
            transaction.update(driverRequestRef, {
              status: 'cancelled',
              cancelledAt: FieldValue.serverTimestamp(),
            });
          }
        }
      });

      logger.tripEvent('TRIP_CANCELLED', tripId, {
        reason: 'passenger_cancelled',
        cancelledBy: passengerId,
      });

      logger.info('✅ [PassengerCancel] COMPLETE', { tripId });

      return { tripId, cancelled: true };

    } catch (error) {
      logger.error('❌ [PassengerCancel] FAILED', { error });
      throw handleError(error);
    }
  }
);
