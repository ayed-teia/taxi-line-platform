import { z } from 'zod';

/**
 * ============================================================================
 * ROADBLOCK SCHEMA
 * ============================================================================
 * 
 * Firestore Collection: roadblocks/{id}
 * 
 * This document represents a roadblock, traffic delay, or road closure.
 * Used to alert drivers and optimize routing.
 * 
 * STATUS:
 * - open: Road is fully open (roadblock cleared)
 * - closed: Road is completely closed
 * - delay: Road has delays/slowdowns
 * 
 * ============================================================================
 */

/**
 * Roadblock status options
 */
export const RoadblockStatus = {
  OPEN: 'open',
  CLOSED: 'closed',
  DELAY: 'delay',
} as const;

export type RoadblockStatus = typeof RoadblockStatus[keyof typeof RoadblockStatus];

/**
 * Roadblock document schema
 */
export const RoadblockSchema = z.object({
  /** Unique roadblock ID */
  id: z.string().optional(),
  
  /** Latitude of roadblock center */
  lat: z.number().min(-90).max(90),
  
  /** Longitude of roadblock center */
  lng: z.number().min(-180).max(180),
  
  /** Radius of affected area in meters */
  radiusMeters: z.number().positive().default(100),
  
  /** Current status of the road */
  status: z.enum(['open', 'closed', 'delay']),
  
  /** Optional note/description */
  note: z.string().optional(),
  
  /** Timestamp of last update */
  updatedAt: z.date(),
  
  /** Timestamp when created */
  createdAt: z.date().optional(),
  
  /** Who created/updated this roadblock (manager ID) */
  createdBy: z.string().optional(),
});

export type Roadblock = z.infer<typeof RoadblockSchema>;

/**
 * Schema for creating a new roadblock
 */
export const CreateRoadblockSchema = RoadblockSchema.omit({
  id: true,
  updatedAt: true,
  createdAt: true,
}).extend({
  status: z.enum(['open', 'closed', 'delay']).default('closed'),
});

export type CreateRoadblock = z.infer<typeof CreateRoadblockSchema>;

/**
 * Schema for updating a roadblock
 */
export const UpdateRoadblockSchema = RoadblockSchema.partial().omit({
  id: true,
  createdAt: true,
  createdBy: true,
});

export type UpdateRoadblock = z.infer<typeof UpdateRoadblockSchema>;

/**
 * Get display info for roadblock status
 */
export function getRoadblockStatusDisplay(status: RoadblockStatus): { 
  label: string; 
  color: string; 
  emoji: string;
  bgColor: string;
} {
  switch (status) {
    case RoadblockStatus.OPEN:
      return { label: 'Open', color: '#10b981', emoji: '✅', bgColor: 'rgba(16, 185, 129, 0.1)' };
    case RoadblockStatus.CLOSED:
      return { label: 'Closed', color: '#ef4444', emoji: '🚫', bgColor: 'rgba(239, 68, 68, 0.1)' };
    case RoadblockStatus.DELAY:
      return { label: 'Delay', color: '#f59e0b', emoji: '⚠️', bgColor: 'rgba(245, 158, 11, 0.1)' };
    default:
      return { label: status, color: '#6b7280', emoji: '❓', bgColor: 'rgba(107, 114, 128, 0.1)' };
  }
}

/**
 * Check if a point is within a roadblock's radius
 */
export function isPointInRoadblock(
  pointLat: number,
  pointLng: number,
  roadblock: Roadblock
): boolean {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(roadblock.lat - pointLat);
  const dLng = toRadians(roadblock.lng - pointLng);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(pointLat)) *
      Math.cos(toRadians(roadblock.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance <= roadblock.radiusMeters;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
