import { z } from 'zod';

/**
 * ============================================================================
 * PAYMENT SCHEMA
 * ============================================================================
 * 
 * Firestore Collection: payments/{paymentId}
 * 
 * This document represents a payment record for a completed trip.
 * Created automatically when a trip is completed.
 * 
 * ============================================================================
 */

/**
 * Payment document schema
 */
export const PaymentSchema = z.object({
  /** Unique payment ID (same as document ID) */
  paymentId: z.string(),
  
  /** Associated trip ID */
  tripId: z.string(),
  
  /** Passenger who owes the payment */
  passengerId: z.string(),
  
  /** Driver who should receive the payment */
  driverId: z.string(),
  
  /** Payment amount */
  amount: z.number().nonnegative(),
  
  /** Currency code (e.g., "ILS") */
  currency: z.string().default('ILS'),
  
  /** Payment method: cash | card | wallet */
  method: z.enum(['cash', 'card', 'wallet']).default('cash'),
  
  /** Payment status: pending | paid | failed */
  status: z.enum(['pending', 'paid', 'failed']).default('pending'),
  
  /** Timestamp when payment was created */
  createdAt: z.any(), // Firestore Timestamp
  
  /** Timestamp when payment was last updated */
  updatedAt: z.any(), // Firestore Timestamp
});

export type Payment = z.infer<typeof PaymentSchema>;

/**
 * Payment creation input (used by Cloud Functions)
 */
export const CreatePaymentInputSchema = z.object({
  tripId: z.string().min(1),
  passengerId: z.string().min(1),
  driverId: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: z.string().default('ILS'),
  method: z.enum(['cash', 'card', 'wallet']).default('cash'),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentInputSchema>;
