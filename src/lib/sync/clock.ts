/**
 * Clock synchronisation against Supabase Realtime Presence.
 *
 * supabase-js does not expose the websocket server clock, so we lean on
 * presence 'sync' events: each presence payload we broadcast carries our local
 * time; when we receive a peer's presence we can pair their timestamp with the
 * moment it arrived. The host is the timing authority for a room, so we track
 * the host's offset specifically and fall back to the median of all peers.
 *
 * offset = hostClock - myClock  →  estimatedServerNow() = Date.now() + offset
 */

const PEER_WINDOW = 8;

interface OffsetSample {
  offset: number;
  at: number;
  isHost: boolean;
}

let samples: OffsetSample[] = [];

export function recordPeerTimestamp(peerLocalMs: number, isHost: boolean): void {
  const arrival = Date.now();
  // Assume symmetric latency; presence payloads are small and frequent enough
  // that the error stays well under audible drift thresholds.
  samples.push({ offset: peerLocalMs - arrival, at: arrival, isHost });
  if (samples.length > PEER_WINDOW * 4) samples = samples.slice(-PEER_WINDOW * 4);
}

export function resetClock(): void {
  samples = [];
}

/** Median of recent samples — robust against one-off latency spikes. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function estimatedServerNow(): number {
  const recent = samples.filter((s) => Date.now() - s.at < 30_000);
  const hostSamples = recent.filter((s) => s.isHost).slice(-PEER_WINDOW);
  if (hostSamples.length > 0) return Date.now() + median(hostSamples.map((s) => s.offset));
  const peerSamples = recent.slice(-PEER_WINDOW);
  if (peerSamples.length > 0) return Date.now() + median(peerSamples.map((s) => s.offset));
  return Date.now(); // solo in room — own clock is authoritative enough
}

/** What the host stamps onto session writes. */
export function stampNow(): number {
  return estimatedServerNow();
}
