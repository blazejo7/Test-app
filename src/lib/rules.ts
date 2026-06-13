/**
 * Pure domain rules for FleetFlow.
 *
 * These functions are deliberately free of React, Supabase, and I/O so they
 * can be unit-tested in isolation and reused on both client and (eventually)
 * server / database trigger logic. The same rules are mirrored in SQL triggers
 * in supabase/migrations/0001_init.sql — keep the two in sync.
 */

import type {
  DamageSeverity,
  FluidLevels,
  VanLock,
  VanStatus,
} from '@/types/database';

/** Below this percentage a fluid is flagged for attention. */
export const FLUID_LOW_THRESHOLD = 10;

/** Lock lifetime once a van is claimed for inspection. */
export const LOCK_DURATION_MINUTES = 15;

export type FluidKey = keyof FluidLevels;

export interface FluidEvaluation {
  /** Fluids at or below FLUID_LOW_THRESHOLD. */
  low: FluidKey[];
  /** True when no fluid is low. */
  ok: boolean;
}

/**
 * Flag any fluid at or below the low threshold. Surfaced in the inspection
 * result and the end-of-session summary.
 */
export function evaluateFluidLevels(levels: FluidLevels): FluidEvaluation {
  const low = (Object.keys(levels) as FluidKey[]).filter(
    (key) => levels[key] <= FLUID_LOW_THRESHOLD,
  );
  return { low, ok: low.length === 0 };
}

/**
 * Derive a van's status from the open damage reports against it.
 *
 * - any `groundable` damage  -> 'grounded'
 * - any other open damage    -> 'new_damage'
 * - nothing open             -> 'clear'
 *
 * "Open" means not resolved; resolved reports are ignored. A grounded van is
 * released back to a normal status only after a manager signs it off, which is
 * modelled by resolving / downgrading the groundable report.
 */
export function deriveVanStatus(
  openSeverities: DamageSeverity[],
): VanStatus {
  if (openSeverities.length === 0) {
    return 'clear';
  }
  if (openSeverities.includes('groundable')) {
    return 'grounded';
  }
  return 'new_damage';
}

/**
 * A van lock is treated as expired purely by comparing its `expires_at` to the
 * current time — no background sweeper job required. Pass `now` for testability.
 */
export function isLockExpired(
  lock: Pick<VanLock, 'expires_at'>,
  now: Date = new Date(),
): boolean {
  return new Date(lock.expires_at).getTime() <= now.getTime();
}

/** Whether a van is claimable right now: no lock, or an expired one. */
export function isVanClaimable(
  lock: Pick<VanLock, 'expires_at'> | null | undefined,
  now: Date = new Date(),
): boolean {
  return !lock || isLockExpired(lock, now);
}

/** Compute a lock's expiry timestamp from when it was claimed. */
export function lockExpiryFrom(lockedAt: Date): Date {
  return new Date(lockedAt.getTime() + LOCK_DURATION_MINUTES * 60_000);
}

/**
 * Whole minutes remaining until `expiresAt`, clamped at 0. Used for the lock
 * countdown banner. Pass `now` for testability.
 */
export function minutesRemaining(expiresAt: string, now: Date = new Date()): number {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 60_000));
}
