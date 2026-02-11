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
 * CANCEL TRIP - Driver Cloud Function
 * ============================================================================
 * 
 * Step 32: Pilot Hardening & Kill Switches
 * 
 * Allows driver to cancel a trip they've accepted.
 * 
 * RULES:
 * - Can cancel ONLY if status = "accepted"
 * - Cannot cancel once trip has started (driver_arrived, in_progress)
 * 
 * FLOW:
 * 1. Validate driver authentication
 * 2. Verify trip is assigned to this driver
 * 3. Check trip is in cancellable state
 * 4. Update trip status to cancelled_by_driver
 * 5. Reset driver availability
 * 
 * ============================================================================
 */

const CancelTripSchema = z.object({
  tripId: z.string().min(1),
  reason: z.string().optional(),
});

interface CancelTripResponse {
  tripId: string;
  cancelled: boolean;
}

/** Statuses that drivers can cancel from */
const DRIVER_CANCELLABLE_STATUSES: string[] = [
  TripStatus.PENDING,
  TripStatus.ACCEPTED,
];

export const driverCancelTrip = onCall<unknown, Promise<CancelTripResponse>>(
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
      const driverId = getAuthenticatedUserId(request);
      if (!driverId) {
        throw new UnauthorizedError('Authentication required to cancel a trip');
      }

      // ========================================
      // 2. Validate input
      // ========================================
      const parsed = CancelTripSchema.safeParse(request.data);
      if (!parsed.success) {
        throw new ValidationError('Invalid cancel request', parsed.error.flatten());
      }

      const { tripId, reason } = parsed.data;
      logger.info('🚫 [DriverCancel] START', { driverId, tripId, reason });

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

        // Verify trip is assigned to this driver
        if (tripData.driverId !== driverId) {
          logger.warn('🚫 [DriverCancel] Not assigned driver', {
            tripDriver: tripData.driverId,
            requestingDriver: driverId,
          });
          throw new ForbiddenError('You are not assigned to this trip');
        }

        // Check if trip is in cancellable state
        if (!DRIVER_CANCELLABLE_STATUSES.includes(tripData.status)) {
          logger.warn('🚫 [DriverCancel] Not cancellable', {
            tripId,
            status: tripData.status,
          });
          throw new ForbiddenError(`Cannot cancel trip with status: ${tripData.status}`);
        }

        // Update trip status
        transaction.update(tripRef, {
          status: TripStatus.CANCELLED_BY_DRIVER,
          cancelledAt: FieldValue.serverTimestamp(),
          cancellationReason: reason || 'driver_cancelled',
        });

        // Reset driver availability
        const driverRef = db.collection('drivers').doc(driverId);
        transaction.update(driverRef, {
          isAvailable: true,
          currentTripId: null,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Update driver request
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
      });

      logger.tripEvent('TRIP_CANCELLED', tripId, {
        reason: reason || 'driver_cancelled',
        cancelledBy: driverId,
        cancellerRole: 'driver',
      });

      logger.info('✅ [DriverCancel] COMPLETE', { tripId, driverId });
      logger.info('🚗 [DriverCancel] Driver reset to available', { driverId });

      return { tripId, cancelled: true };

    } catch (error) {
      logger.error('❌ [DriverCancel] FAILED', { error });
      throw handleError(error);
    }
  }
);
