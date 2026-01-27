import { z } from 'zod';

/**
 * Status values for trip requests (before matching with driver)
 */
export const TripRequestStatus = {
  /** Request is open and waiting for driver match */
  OPEN: 'open',
  /** Request matched with a driver, trip being created */
  MATCHED: 'matched',
  /** Request expired with no available drivers */
  EXPIRED: 'expired',
  /** Request cancelled by passenger before matching */
  CANCELLED: 'cancelled',
} as const;

export type TripRequestStatus = (typeof TripRequestStatus)[keyof typeof TripRequestStatus];

export const TripRequestStatusSchema = z.enum([
  'open',
  'matched',
  'expired',
  'cancelled',
]);

/** Statuses that indicate the request is still active */
export const ACTIVE_REQUEST_STATUSES: TripRequestStatus[] = [
  TripRequestStatus.OPEN,
];

/** Statuses that indicate the request has ended */
export const TERMINAL_REQUEST_STATUSES: TripRequestStatus[] = [
  TripRequestStatus.MATCHED,
  TripRequestStatus.EXPIRED,
  TripRequestStatus.CANCELLED,
];
