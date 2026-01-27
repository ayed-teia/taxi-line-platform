import { z } from 'zod';

/**
 * Trip estimate schema for validation
 * Contains distance, duration, and price from estimateTrip
 */
export const TripEstimateSchema = z.object({
  /** Distance in kilometers */
  distanceKm: z.number().positive(),
  /** Duration in minutes */
  durationMin: z.number().positive(),
  /** Price in Israeli Shekels */
  priceIls: z.number().positive().int(),
});

export type TripEstimate = z.infer<typeof TripEstimateSchema>;
