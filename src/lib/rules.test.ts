import {
  deriveVanStatus,
  evaluateFluidLevels,
  FLUID_LOW_THRESHOLD,
  isLockExpired,
  isVanClaimable,
  lockExpiryFrom,
  LOCK_DURATION_MINUTES,
  minutesRemaining,
} from './rules';

describe('evaluateFluidLevels', () => {
  it('reports all fluids ok when above threshold', () => {
    const result = evaluateFluidLevels({ adblue: 80, coolant: 50, screenwash: 100 });
    expect(result.ok).toBe(true);
    expect(result.low).toEqual([]);
  });

  it('flags fluids at or below threshold', () => {
    const result = evaluateFluidLevels({
      adblue: FLUID_LOW_THRESHOLD,
      coolant: 5,
      screenwash: 60,
    });
    expect(result.ok).toBe(false);
    expect(result.low.sort()).toEqual(['adblue', 'coolant']);
  });
});

describe('deriveVanStatus', () => {
  it('is clear with no open damage', () => {
    expect(deriveVanStatus([])).toBe('clear');
  });

  it('is new_damage with non-groundable damage', () => {
    expect(deriveVanStatus(['cosmetic', 'monitor'])).toBe('new_damage');
  });

  it('is grounded when any damage is groundable', () => {
    expect(deriveVanStatus(['cosmetic', 'groundable'])).toBe('grounded');
  });
});

describe('isLockExpired / isVanClaimable', () => {
  const now = new Date('2026-06-13T12:00:00Z');

  it('treats a future expiry as active', () => {
    const lock = { expires_at: '2026-06-13T12:10:00Z' };
    expect(isLockExpired(lock, now)).toBe(false);
    expect(isVanClaimable(lock, now)).toBe(false);
  });

  it('treats a past expiry as expired and claimable', () => {
    const lock = { expires_at: '2026-06-13T11:50:00Z' };
    expect(isLockExpired(lock, now)).toBe(true);
    expect(isVanClaimable(lock, now)).toBe(true);
  });

  it('treats a missing lock as claimable', () => {
    expect(isVanClaimable(null, now)).toBe(true);
    expect(isVanClaimable(undefined, now)).toBe(true);
  });
});

describe('lockExpiryFrom', () => {
  it('adds the lock duration', () => {
    const lockedAt = new Date('2026-06-13T12:00:00Z');
    const expiry = lockExpiryFrom(lockedAt);
    expect(expiry.getTime() - lockedAt.getTime()).toBe(LOCK_DURATION_MINUTES * 60_000);
  });
});

describe('minutesRemaining', () => {
  const now = new Date('2026-06-13T12:00:00Z');

  it('rounds up minutes left', () => {
    expect(minutesRemaining('2026-06-13T12:09:30Z', now)).toBe(10);
  });

  it('clamps to 0 once expired', () => {
    expect(minutesRemaining('2026-06-13T11:50:00Z', now)).toBe(0);
  });
});
