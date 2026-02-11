import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { REGION } from '../../core/env';
import { getFirestore, invalidateConfigCache } from '../../core/config';
import { handleError, ValidationError, ForbiddenError, UnauthorizedError } from '../../core/errors';
import { logger } from '../../core/logger';
import { getAuthenticatedUserId } from '../../core/auth';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * ============================================================================
 * SYSTEM CONFIGURATION TOGGLES - Manager Cloud Functions
 * ============================================================================
 * 
 * Step 32: Pilot Hardening & Kill Switches
 * Step 33: Go-Live Mode - Feature Flags
 * 
 * Allows manager to toggle system-wide feature flags:
 * - tripsEnabled: Global kill switch for trip creation
 * - roadblocksEnabled: Toggle roadblocks feature
 * - paymentsEnabled: Toggle payments feature
 * 
 * ============================================================================
 */

const ToggleTripsSchema = z.object({
  enabled: z.boolean(),
});

/**
 * Schema for toggling any feature flag
 */
const ToggleFeatureFlagSchema = z.object({
  flag: z.enum(['tripsEnabled', 'roadblocksEnabled', 'paymentsEnabled']),
  enabled: z.boolean(),
});

interface ToggleTripsResponse {
  tripsEnabled: boolean;
  updatedAt: string;
}

export const managerToggleTrips = onCall<unknown, Promise<ToggleTripsResponse>>(
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
        logger.warn('🚫 [ToggleTrips] Not a manager', {
          userId: managerId,
          role: managerData?.role,
        });
        throw new ForbiddenError('Only managers can toggle trip settings');
      }

      // ========================================
      // 3. Validate input
      // ========================================
      const parsed = ToggleTripsSchema.safeParse(request.data);
      if (!parsed.success) {
        throw new ValidationError('Invalid toggle request', parsed.error.flatten());
      }

      const { enabled } = parsed.data;

      logger.info(enabled ? '🟢 [ToggleTrips] Enabling trips' : '🔴 [ToggleTrips] Disabling trips', {
        managerId,
        enabled,
      });

      // ========================================
      // 4. Update system config
      // ========================================
      const now = new Date();
      const configRef = db.collection('system').doc('config');
      
      await configRef.set({
        tripsEnabled: enabled,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: managerId,
      }, { merge: true });

      // Invalidate cache so next request gets fresh value
      invalidateConfigCache();

      logger.info('✅ [ToggleTrips] COMPLETE', {
        tripsEnabled: enabled,
        managerId,
      });

      return {
        tripsEnabled: enabled,
        updatedAt: now.toISOString(),
      };

    } catch (error) {
      logger.error('❌ [ToggleTrips] FAILED', { error });
      throw handleError(error);
    }
  }
);

/**
 * Get system configuration (for Manager Web)
 */
interface SystemConfigResponse {
  tripsEnabled: boolean;
  roadblocksEnabled: boolean;
  paymentsEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const getSystemConfigCallable = onCall<unknown, Promise<SystemConfigResponse>>(
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
      const userId = getAuthenticatedUserId(request);
      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      // ========================================
      // 2. Check manager role
      // ========================================
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new ForbiddenError('User not found');
      }
      
      const userData = userDoc.data();
      if (userData?.role !== 'manager' && userData?.role !== 'admin') {
        throw new ForbiddenError('Only managers can view system configuration');
      }

      // ========================================
      // 3. Get system config
      // ========================================
      const configDoc = await db.collection('system').doc('config').get();
      
      if (!configDoc.exists) {
        return { 
          tripsEnabled: true,
          roadblocksEnabled: true,
          paymentsEnabled: false,
        };
      }

      const data = configDoc.data()!;
      return {
        tripsEnabled: data.tripsEnabled ?? true,
        roadblocksEnabled: data.roadblocksEnabled ?? true,
        paymentsEnabled: data.paymentsEnabled ?? false,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.(),
        updatedBy: data.updatedBy,
      };

    } catch (error) {
      logger.error('❌ [GetSystemConfig] FAILED', { error });
      throw handleError(error);
    }
  }
);

/**
 * Toggle any feature flag (generalized)
 */
interface ToggleFeatureFlagResponse {
  flag: string;
  enabled: boolean;
  updatedAt: string;
}

export const managerToggleFeatureFlag = onCall<unknown, Promise<ToggleFeatureFlagResponse>>(
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
        throw new ForbiddenError('Only managers can toggle feature flags');
      }

      // ========================================
      // 3. Validate input
      // ========================================
      const parsed = ToggleFeatureFlagSchema.safeParse(request.data);
      if (!parsed.success) {
        throw new ValidationError('Invalid toggle request', parsed.error.flatten());
      }

      const { flag, enabled } = parsed.data;

      logger.info(enabled ? `🟢 [ToggleFeatureFlag] Enabling ${flag}` : `🔴 [ToggleFeatureFlag] Disabling ${flag}`, {
        managerId,
        flag,
        enabled,
      });

      // ========================================
      // 4. Update system config
      // ========================================
      const now = new Date();
      const configRef = db.collection('system').doc('config');
      
      await configRef.set({
        [flag]: enabled,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: managerId,
      }, { merge: true });

      // Invalidate cache so next request gets fresh value
      invalidateConfigCache();

      logger.info('✅ [ToggleFeatureFlag] COMPLETE', {
        flag,
        enabled,
        managerId,
      });

      return {
        flag,
        enabled,
        updatedAt: now.toISOString(),
      };

    } catch (error) {
      logger.error('❌ [ToggleFeatureFlag] FAILED', { error });
      throw handleError(error);
    }
  }
);
