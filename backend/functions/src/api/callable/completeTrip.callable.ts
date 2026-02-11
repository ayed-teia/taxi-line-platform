import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { TripStatus, PaymentStatus, PaymentMethod } from '@taxi-line/shared';
import { REGION } from '../../core/env';
import { getFirestore } from '../../core/config';
import { handleError, ValidationError, NotFoundError, ForbiddenError, UnauthorizedError } from '../../core/errors';
import { logger } from '../../core/logger';
import { getAuthenticatedUserId } from '../../core/auth';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * ============================================================================
 * COMPLETE TRIP - Cloud Function
 * ============================================================================
 * 
 * Called when driver drops off passenger and completes the trip.
 * 
 * FLOW: IN_PROGRESS → COMPLETED
 * 
 * ============================================================================
 * QA VERIFICATION CHECKLIST:
 * ============================================================================
 * 
 * ✅ COMPLETE TRIP FLOW:
 *    LOG: "🏁 [CompleteTrip] START - driverId: {id}, tripId: {id}"
 *    LOG: "🔒 [CompleteTrip] Current status: in_progress ✓"
 *    LOG: "💵 [CompleteTrip] Final price: ₪{amount}"
 *    LOG: "📝 [CompleteTrip] Trip status → completed"
 *    LOG: "🎉 [CompleteTrip] COMPLETE"
 * 
 * ✅ INVALID STATUS:
 *    LOG: "⚠️ [CompleteTrip] Invalid status: {status}"
 * 
 * ============================================================================
 */

/**
 * Request schema for complete trip
 */
const CompleteTripSchema = z.object({
  tripId: z.string().min(1),
});

/**
 * Response type
 */
interface CompleteTripResponse {
  success: boolean;
  status: string;
  finalPriceIls: number;
  paymentId: string;
}

/**
 * Complete the trip (passenger dropped off)
 * 
 * Valid transition: IN_PROGRESS → COMPLETED
 * 
 * Validates:
 * - Driver is authenticated
 * - Driver owns the trip (trip.driverId === auth.uid)
 * - Trip status is IN_PROGRESS
 * 
 * For v1, final price = estimated price (no surge, no adjustments)
 */
export const completeTrip = onCall<unknown, Promise<CompleteTripResponse>>(
  {
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    try {
      // Require authentication
      const driverId = getAuthenticatedUserId(request);
      if (!driverId) {
        throw new UnauthorizedError('Authentication required');
      }

      // Validate input
      const parsed = CompleteTripSchema.safeParse(request.data);

      if (!parsed.success) {
        throw new ValidationError(
          'Invalid request',
          parsed.error.flatten()
        );
      }

      const { tripId } = parsed.data;

      logger.info('🏁 [CompleteTrip] START', { driverId, tripId });

      const db = getFirestore();
      const tripRef = db.collection('trips').doc(tripId);

      // Use transaction to prevent race conditions
      const result = await db.runTransaction(async (transaction) => {
        const tripDoc = await transaction.get(tripRef);

        if (!tripDoc.exists) {
          logger.warn('🚫 [CompleteTrip] Trip not found', { tripId });
          throw new NotFoundError('Trip', tripId);
        }

        const tripData = tripDoc.data()!;

        // =====================================================================
        // PAYMENT: Check if payment already exists (must read BEFORE writes)
        // =====================================================================
        const paymentId = `payment_${tripId}`;
        const paymentRef = db.collection('payments').doc(paymentId);
        const existingPayment = await transaction.get(paymentRef);

        // Validate driver ownership
        if (tripData.driverId !== driverId) {
          logger.warn('🚫 [CompleteTrip] Driver not assigned to trip', { driverId, tripId, assignedDriver: tripData.driverId });
          throw new ForbiddenError('You are not assigned to this trip');
        }

        // Validate current status
        if (tripData.status !== TripStatus.IN_PROGRESS) {
          logger.warn('⚠️ [CompleteTrip] Invalid status', { tripId, currentStatus: tripData.status, expected: TripStatus.IN_PROGRESS });
          throw new ForbiddenError(
            `Cannot complete trip from status '${tripData.status}'. Expected '${TripStatus.IN_PROGRESS}'.`
          );
        }

        logger.info('🔒 [CompleteTrip] Current status: in_progress ✓', { tripId });

        // For v1, final price = estimated price
        const finalPriceIls = tripData.estimatedPriceIls;
        logger.info('💵 [CompleteTrip] Final price: ₪' + finalPriceIls, { tripId, finalPriceIls });

        // Update trip status within transaction
        transaction.update(tripRef, {
          status: TripStatus.COMPLETED,
          finalPriceIls,
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Set driver as available again (trip completed)
        const driverDocRef = db.collection('drivers').doc(driverId);
        transaction.set(driverDocRef, {
          isAvailable: true,
          currentTripId: null,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        logger.info('🚗 [CompleteTrip] Driver isAvailable → true', { driverId });

        // =====================================================================
        // CREATE PAYMENT DOCUMENT (Idempotent - uses tripId as paymentId)
        // =====================================================================
        if (!existingPayment.exists) {
          transaction.set(paymentRef, {
            paymentId,
            tripId,
            passengerId: tripData.passengerId,
            driverId,
            amount: finalPriceIls,
            currency: 'ILS',
            method: PaymentMethod.CASH, // Default for MVP
            status: PaymentStatus.PENDING,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          logger.info('💳 [CompleteTrip] Payment created', { paymentId, tripId, amount: finalPriceIls });
        } else {
          logger.info('💳 [CompleteTrip] Payment already exists (idempotent)', { paymentId });
        }

        return { status: TripStatus.COMPLETED, finalPriceIls, paymentId };
      });

      logger.info('📝 [CompleteTrip] Trip status → completed', { tripId });
      
      // Log trip lifecycle event
      logger.tripEvent('TRIP_COMPLETED', tripId, {
        driverId,
        finalPriceIls: result.finalPriceIls,
      });
      
      logger.info('🎉 [CompleteTrip] COMPLETE', { tripId, driverId, finalPriceIls: result.finalPriceIls });

      return {
        success: true,
        status: result.status,
        finalPriceIls: result.finalPriceIls,
        paymentId: result.paymentId,
      };
    } catch (error) {
      throw handleError(error);
    }
  }
);
