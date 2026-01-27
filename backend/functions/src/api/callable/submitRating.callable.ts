import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { TripStatus } from '@taxi-line/shared';
import { REGION } from '../../core/env';
import { getFirestore } from '../../core/config';
import { handleError, ValidationError, NotFoundError, ForbiddenError, UnauthorizedError } from '../../core/errors';
import { logger } from '../../core/logger';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Request schema for submitting a rating
 */
const SubmitRatingSchema = z.object({
  tripId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

/**
 * Response type
 */
interface SubmitRatingResponse {
  success: boolean;
  ratingId: string;
}

/**
 * Submit a rating for a completed trip
 * 
 * Validates:
 * - Caller is authenticated
 * - Trip exists and status is COMPLETED
 * - Caller is the passenger of the trip
 * - No existing rating for this trip by this passenger
 * 
 * Stores rating in ratings/{tripId}
 */
export const submitRating = onCall<unknown, Promise<SubmitRatingResponse>>(
  {
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    try {
      // Require authentication
      if (!request.auth?.uid) {
        throw new UnauthorizedError('Authentication required');
      }

      const passengerId = request.auth.uid;

      // Validate input
      const parsed = SubmitRatingSchema.safeParse(request.data);

      if (!parsed.success) {
        throw new ValidationError(
          'Invalid request',
          parsed.error.flatten()
        );
      }

      const { tripId, rating, comment } = parsed.data;

      logger.info('Passenger submitting rating', { passengerId, tripId, rating });

      const db = getFirestore();
      
      // Get the trip
      const tripRef = db.collection('trips').doc(tripId);
      const tripDoc = await tripRef.get();

      if (!tripDoc.exists) {
        throw new NotFoundError('Trip', tripId);
      }

      const tripData = tripDoc.data()!;

      // Validate caller is the passenger
      if (tripData.passengerId !== passengerId) {
        throw new ForbiddenError('You are not the passenger of this trip');
      }

      // Validate trip is completed
      if (tripData.status !== TripStatus.COMPLETED) {
        throw new ForbiddenError(
          `Cannot rate trip with status '${tripData.status}'. Trip must be completed.`
        );
      }

      // Check if rating already exists
      const ratingRef = db.collection('ratings').doc(tripId);
      const existingRating = await ratingRef.get();

      if (existingRating.exists) {
        throw new ForbiddenError('A rating has already been submitted for this trip');
      }

      // Create the rating
      const ratingData = {
        tripId,
        passengerId,
        driverId: tripData.driverId,
        rating,
        comment: comment || null,
        createdAt: FieldValue.serverTimestamp(),
      };

      await ratingRef.set(ratingData);

      logger.info('Rating submitted successfully', { 
        tripId, 
        passengerId, 
        driverId: tripData.driverId,
        rating 
      });

      return {
        success: true,
        ratingId: tripId,
      };
    } catch (error) {
      throw handleError(error);
    }
  }
);
