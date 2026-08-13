/**
 * Session synchronization helpers.
 *
 * The database holds one authoritative session row per room. The host writes
 * state changes; everyone (including the host's own player) derives the target
 * playback position from (positionSec, updatedAtServer) + the synced clock.
 */
import { estimatedServerNow } from './clock';
import type { Session } from '@/types/domain';

/** Where the playhead should be *right now*, given the authoritative state. */
export function expectedPosition(session: Session): number {
  if (session.state !== 'playing') return session.positionSec;
  const elapsed = Math.max(0, estimatedServerNow() - session.updatedAtServer) / 1000;
  return session.positionSec + elapsed;
}

export interface DriftDecision {
  target: number;
  drift: number;
  shouldCorrect: boolean;
  /** small drift is fixed by nudging playbackRate instead of an audible seek */
  rate: number;
}

const HARD_THRESHOLD_SEC = 2.0;
const SOFT_THRESHOLD_SEC = 0.35;
const RATE_WINDOW_SEC = 8; // spread soft correction over this long

export function evaluateDrift(session: Session, actualPosition: number): DriftDecision {
  const target = expectedPosition(session);
  const drift = target - actualPosition;
  const abs = Math.abs(drift);

  if (session.state !== 'playing' || abs < SOFT_THRESHOLD_SEC) {
    return { target, drift, shouldCorrect: false, rate: 1 };
  }
  if (abs > HARD_THRESHOLD_SEC) {
    // Hard re-sync: a real seek. Infrequent by design.
    return { target, drift, shouldCorrect: true, rate: 1 };
  }
  // Soft correction: gently speed up or slow down to converge without a glitch.
  const rate = 1 + Math.max(-0.06, Math.min(0.06, drift / RATE_WINDOW_SEC));
  return { target, drift, shouldCorrect: false, rate };
}
