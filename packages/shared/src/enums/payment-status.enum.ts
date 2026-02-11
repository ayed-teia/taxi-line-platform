/**
 * ============================================================================
 * PAYMENT STATUS ENUM
 * ============================================================================
 * 
 * Status values for payment documents in the payments collection.
 * 
 * ============================================================================
 */

/**
 * Payment status values
 */
export const PaymentStatus = {
  /** Payment created, awaiting collection */
  PENDING: 'pending',
  /** Payment collected/processed */
  PAID: 'paid',
  /** Payment failed */
  FAILED: 'failed',
} as const;

export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

/**
 * Payment method values
 */
export const PaymentMethod = {
  /** Cash payment */
  CASH: 'cash',
  /** Card payment (future) */
  CARD: 'card',
  /** Wallet payment (future) */
  WALLET: 'wallet',
} as const;

export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];
