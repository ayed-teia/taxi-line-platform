/**
 * ============================================================================
 * APP MODE CONFIGURATION
 * ============================================================================
 * 
 * Step 33: Go-Live Mode
 * 
 * Defines explicit application modes for safe deployment:
 * - DEV: Local development with emulators
 * - PILOT: Real Firebase for limited pilot testing
 * - PROD: Production (future)
 * 
 * Environment Variables:
 * - EXPO_PUBLIC_APP_MODE (mobile apps): "dev" | "pilot" | "prod"
 * - VITE_APP_MODE (web apps): "dev" | "pilot" | "prod"
 * 
 * Usage:
 *   import { getAppMode, isDevMode, isPilotMode, shouldUseEmulators } from '@taxi-line/shared';
 * 
 * ============================================================================
 */

/**
 * Application mode types
 */
export type AppMode = 'dev' | 'pilot' | 'prod';

/**
 * App mode configuration interface
 */
export interface AppModeConfig {
  mode: AppMode;
  allowEmulators: boolean;
  logLevel: 'verbose' | 'info' | 'warn' | 'error';
  logPrefix: string;
}

/**
 * Mode-specific configurations
 */
const MODE_CONFIGS: Record<AppMode, AppModeConfig> = {
  dev: {
    mode: 'dev',
    allowEmulators: true,
    logLevel: 'verbose',
    logPrefix: '🔧 DEV',
  },
  pilot: {
    mode: 'pilot',
    allowEmulators: false,
    logLevel: 'info',
    logPrefix: '🚀 PILOT',
  },
  prod: {
    mode: 'prod',
    allowEmulators: false,
    logLevel: 'warn',
    logPrefix: '🏭 PROD',
  },
};

/**
 * Parse app mode from string, with fallback to 'dev'
 */
export function parseAppMode(modeString?: string): AppMode {
  const normalized = modeString?.toLowerCase().trim();
  
  if (normalized === 'pilot') return 'pilot';
  if (normalized === 'prod' || normalized === 'production') return 'prod';
  
  // Default to dev for safety
  return 'dev';
}

/**
 * Get app mode configuration
 * This is a pure function that returns config based on the mode string.
 * The actual env reading is done by the specific app.
 */
export function getAppModeConfig(mode: AppMode): AppModeConfig {
  return MODE_CONFIGS[mode];
}

/**
 * Check if emulators should be used
 * - Only allowed in DEV mode
 * - Requires explicit EXPO_PUBLIC_USE_EMULATORS=true
 */
export function shouldAllowEmulators(mode: AppMode, useEmulatorsEnv?: boolean | string): boolean {
  const config = MODE_CONFIGS[mode];
  
  // Emulators are NEVER allowed outside dev mode
  if (!config.allowEmulators) {
    return false;
  }
  
  // In dev mode, respect the USE_EMULATORS env var
  return useEmulatorsEnv === true || useEmulatorsEnv === 'true';
}

/**
 * Get connection guard message for logging
 */
export function getConnectionGuardMessage(mode: AppMode, emulatorsRequested: boolean): string | null {
  const config = MODE_CONFIGS[mode];
  
  if (mode === 'dev') {
    if (emulatorsRequested) {
      return `${config.logPrefix} mode: Using Firebase Emulators`;
    }
    return `${config.logPrefix} mode: Using real Firebase (emulators disabled)`;
  }
  
  if (mode === 'pilot') {
    if (emulatorsRequested) {
      return `⚠️ ${config.logPrefix} mode: Emulators requested but BLOCKED - using real Firebase`;
    }
    return `${config.logPrefix} mode: Using real Firebase`;
  }
  
  if (mode === 'prod') {
    if (emulatorsRequested) {
      return `🚨 ${config.logPrefix} mode: Emulators requested but BLOCKED - using real Firebase`;
    }
    return `${config.logPrefix} mode: Using real Firebase (production)`;
  }
  
  return null;
}

/**
 * Validate app mode configuration at startup
 * Returns warnings/errors that should be logged
 */
export function validateAppModeConfig(mode: AppMode, firebaseProjectId?: string): string[] {
  const warnings: string[] = [];
  const config = MODE_CONFIGS[mode];
  
  // Check for demo project in non-dev mode
  if (mode !== 'dev' && firebaseProjectId?.startsWith('demo-')) {
    warnings.push(
      `${config.logPrefix}: Using demo project "${firebaseProjectId}" in ${mode.toUpperCase()} mode!`
    );
    warnings.push('This is likely a configuration error.');
  }
  
  // Check for missing project ID
  if (!firebaseProjectId) {
    warnings.push(`${config.logPrefix}: Firebase project ID is not set`);
  }
  
  return warnings;
}
