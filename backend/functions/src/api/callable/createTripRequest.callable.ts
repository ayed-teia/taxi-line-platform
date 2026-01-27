import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { LatLngSchema, TripEstimateSchema, TripRequestStatus } from '@taxi-line/shared';
import { REGION } from '../../core/env';
import { getFirestore } from '../../core/config';
import { handleError, ValidationError, UnauthorizedError } from '../../core/errors';
import { logger } from '../../core/logger';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Request schema for creating a trip request
 */
const CreateTripRequestSchema = z.object({
  pickup: LatLngSchema,
  dropoff: LatLngSchema,
  estimate: TripEstimateSchema,
});

/**
 * Response type for trip request creation
 */
interface CreateTripRequestResponse {
  requestId: string;
}

/**
 * Firestore document structure for trip request
 */
interface TripRequestDocument {
  passengerId: string;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  estimatedPriceIls: number;
  status: string;
  createdAt: FirebaseFirestore.FieldValue;
}

/**
 * Create a new trip request
 *
 * This function:
 * 1. Validates the authenticated user
 * 2. Validates input using Zod schemas from @taxi-line/shared
 * 3. Creates a document in tripRequests collection with status: OPEN
 * 4. Returns the request ID for tracking
 *
 * No driver matching logic yet - just creates the request.
 */
export const createTripRequest = onCall<unknown, Promise<CreateTripRequestResponse>>(
  {
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    try {
      // Require authentication
      if (!request.auth?.uid) {
        throw new UnauthorizedError('Authentication required to create a trip request');
      }

      const passengerId = request.auth.uid;

      // Validate input
      const parsed = CreateTripRequestSchema.safeParse(request.data);

      if (!parsed.success) {
        throw new ValidationError(
          'Invalid trip request data',
          parsed.error.flatten()
        );
      }

      const { pickup, dropoff, estimate } = parsed.data;

      logger.info('Creating trip request', {
        passengerId,
        pickup,
        dropoff,
        estimate,
      });

      // Get Firestore instance
      const db = getFirestore();

      // Create trip request document
      const tripRequestDoc: TripRequestDocument = {
        passengerId,
        pickup: { lat: pickup.lat, lng: pickup.lng },
        dropoff: { lat: dropoff.lat, lng: dropoff.lng },
        estimatedDistanceKm: estimate.distanceKm,
        estimatedDurationMin: estimate.durationMin,
        estimatedPriceIls: estimate.priceIls,
        status: TripRequestStatus.OPEN,
        createdAt: FieldValue.serverTimestamp(),
      };

      // Write to Firestore
      const docRef = await db.collection('tripRequests').add(tripRequestDoc);
      const requestId = docRef.id;

      logger.info('Trip request created', {
        requestId,
        passengerId,
        status: TripRequestStatus.OPEN,
      });

      return { requestId };
    } catch (error) {
      throw handleError(error);
    }
  }
);
