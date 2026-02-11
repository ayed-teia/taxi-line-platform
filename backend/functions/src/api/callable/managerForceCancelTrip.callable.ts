import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { TripStatus, ACTIVE_TRIP_STATUSES } from '@taxi-line/shared';
import { REGION } from '../../core/env';
import { getFirestore } from '../../core/config';
import { handleError, ValidationError, NotFoundError, ForbiddenError, UnauthorizedError } from '../../core/errors';
import { logger } from '../../core/logger';
import { getAuthenticatedUserId } from '../../core/auth';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * ============================================================================
 * MANAGER FORCE CANCEL TRIP - Cloud Function
 * ============================================================================
 * 
 * Step 32: Pilot Hardening & Kill Switches
 * 
 * Allows manager to force-cancel ANY trip (override).
 * 
 * RULES:
 * - Manager can cancel any active trip
 * - Cannot cancel already completed/cancelled trips
 * - Reason is always "manager_override"
 * 
 * FLOW:
 * 1. Validate manager authentication
 * 2. Check user has manager role
 * 3. Verify trip is in active state
 * 4. Update trip status to cancelled_by_system
 * 5. Reset driver availability if assigned
 * 
 * ============================================================================
 */

const ForceCancelTripSchema = z.object({
  tripId: z.string().min(1),
  reason: z.string().optional(),
});

interface ForceCancelTripResponse {
  tripId: string;
  cancelled: boolean;
}

export const managerForceCancelTrip = onCall<unknown, Promise<ForceCancelTripResponse>>(
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
      const managerId = getAuthenticatedUserId(request);
      if (!managerId) {
        throw new UnauthorizedError('Authentication required');
      }

      // ========================================
      // 2. Check manager role
      // ========================================
      const db = getFirestore();
      const managerDoc = await db.collection('users').doc(managerId).get();
      
      if (!managerDoc.exists) {
        throw new ForbiddenError('User not found');
      }
      
      const managerData = managerDoc.data();
      if (managerData?.role !== 'manager' && managerData?.role !== 'admin') {
        logger.warn('🚫 [ManagerCancel] Not a manager', {
          userId: managerId,
          role: managerData?.role,
        });
        throw new ForbiddenError('Only managers can force cancel trips');
      }

      // ========================================
      // 3. Validate input
      // ========================================
      const parsed = ForceCancelTripSchema.safeParse(request.data);
      if (!parsed.success) {
        throw new ValidationError('Invalid cancel request', parsed.error.flatten());
      }

      const { tripId, reason } = parsed.data;
      logger.info('⚠️ [ManagerCancel] START - Manager override', {
        managerId,
        tripId,
        reason: reason || 'manager_override',
      });

      // ========================================
      // 4. Run transaction for atomicity
      // ========================================
      await db.runTransaction(async (transaction) => {
        const tripRef = db.collection('trips').doc(tripId);
        const tripDoc = await transaction.get(tripRef);

        if (!tripDoc.exists) {
          throw new NotFoundError('Trip not found');
        }

        const tripData = tripDoc.data()!;

        // Check if trip is in active state (can be cancelled)
        if (!ACTIVE_TRIP_STATUSES.includes(tripData.status)) {
          logger.warn('⚠️ [ManagerCancel] Trip not active', {
            tripId,
            status: tripData.status,
          });
          throw new ForbiddenError(`Trip is already ${tripData.status}`);
        }

        // Update trip status
        transaction.update(tripRef, {
          status: TripStatus.CANCELLED_BY_SYSTEM,
          cancelledAt: FieldValue.serverTimestamp(),
          cancellationReason: reason || 'manager_override',
          cancelledBy: managerId,
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
          logger.info('🚗 [ManagerCancel] Driver reset to available', { driverId });

          // Update driver request if exists
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
        reason: reason || 'manager_override',
        cancelledBy: managerId,
        cancellerRole: 'manager',
      });

      logger.info('✅ [ManagerCancel] COMPLETE - Trip force cancelled', { tripId, managerId });

      return { tripId, cancelled: true };

    } catch (error) {
      logger.error('❌ [ManagerCancel] FAILED', { error });
      throw handleError(error);
    }
  }
);
