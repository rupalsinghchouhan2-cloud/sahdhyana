/**
 * Sahadhyāna domain model — the shared language of the whole app.
 * Keep these types stable: every feature module depends on them.
 */

// ---------------------------------------------------------------- identity
export type MeditatorId = string; // locally generated, stable per device

export interface Meditator {
  id: MeditatorId;
  name: string;
  createdAt: string; // ISO
  /** V2 hook: will hold the auth.users.id once accounts exist. */
  accountId?: string | null;
}

// ---------------------------------------------------------------- tracks
export type TrackProvider = 'direct' | 'youtube' | 'oshoworld' | 'unknown';

export interface Track {
  id: string; // uuid
  ownerId: MeditatorId;
  title: string;
  teacher?: string | null;
  sourceUrl: string;
  provider: TrackProvider;
  /** Playable URL for direct audio; null for embedded providers. */
  audioUrl?: string | null;
  artworkUrl?: string | null;
  /** seconds; null when unknown */
  durationSec?: number | null;
  createdAt: string;
}

// ---------------------------------------------------------------- playlists
export interface Playlist {
  id: string;
  ownerId: MeditatorId;
  name: string;
  createdAt: string;
}

export interface PlaylistTrack {
  playlistId: string;
  trackId: string;
  position: number;
}

// ---------------------------------------------------------------- discourse series
export interface DiscourseSeries {
  id: string;
  ownerId: MeditatorId;
  name: string;
  description?: string | null;
  createdAt: string;
}

export interface SeriesTrack {
  seriesId: string;
  trackId: string;
  position: number; // 1-based
}

export interface SeriesProgress {
  seriesId: string;
  meditatorId: MeditatorId;
  /** position of the next unplayed track (1-based). 1 = not started. */
  nextPosition: number;
  completedCount: number;
  updatedAt: string;
}

// ---------------------------------------------------------------- rooms
export type RoomStatus = 'waiting' | 'live' | 'ended';

export interface Room {
  id: string; // uuid
  code: string; // short share code, e.g. "ABC123"
  name: string;
  description?: string | null;
  hostId: MeditatorId;
  hostName: string;
  status: RoomStatus;
  trackId?: string | null;
  track?: Track | null; // joined client-side
  createdAt: string;
  endedAt?: string | null;
}

export interface RoomParticipant {
  roomId: string;
  meditatorId: MeditatorId;
  name: string;
  joinedAt: string;
  lastSeenAt: string;
  isHost: boolean;
}

// ---------------------------------------------------------------- sessions
export type SessionState = 'idle' | 'playing' | 'paused' | 'ended';

/**
 * Server-authoritative session state. Clients never trust their own clock
 * alone: they apply (serverNow - updatedAtServer) to positionSec.
 */
export interface Session {
  id: string; // session instance id — changes each time a new session starts
  roomId: string;
  trackId?: string | null;
  state: SessionState;
  /** position within the track, seconds, at updatedAtServer */
  positionSec: number;
  /** server wall-clock (ms epoch) when state/position last changed */
  updatedAtServer: number;
  /** who last drove the state (host) */
  updatedBy: MeditatorId;
  /** queue context, when the room plays a playlist/series */
  sourceKind?: 'single' | 'playlist' | 'series';
  sourceId?: string | null;
  sourcePosition?: number | null;
}

// ---------------------------------------------------------------- history & stats
export interface MeditationRecord {
  id: string;
  meditatorId: MeditatorId;
  roomId?: string | null;
  roomName?: string | null;
  trackId?: string | null;
  trackTitle?: string | null;
  teacher?: string | null;
  durationSec: number;
  completedAt: string; // ISO
  companions: string[]; // display names of others present
  companionIds: MeditatorId[];
}

export interface PracticeStats {
  currentStreak: number;
  longestStreak: number;
  totalMinutes: number;
  totalSessions: number;
  completedTracks: number;
  peopleMeditatedWith: number;
  /** yyyy-mm-dd → seconds meditated, for the calendar heatmap */
  days: Record<string, number>;
}

// ---------------------------------------------------------------- reminders
export interface Reminder {
  id: string;
  enabled: boolean;
  /** 0=Sun … 6=Sat; empty array means "every day" */
  days: number[];
  /** "HH:MM" 24h local */
  time: string;
  message: string;
}

// ---------------------------------------------------------------- settings
export interface Settings {
  soundsEnabled: boolean;
  completionSoundEnabled: boolean;
  reducedMotion: boolean;
}

// ---------------------------------------------------------------- providers
export interface ResolvedTrack {
  provider: TrackProvider;
  sourceUrl: string;
  title?: string;
  teacher?: string;
  audioUrl?: string | null;
  artworkUrl?: string | null;
  durationSec?: number | null;
  /** e.g. YouTube video id */
  embedId?: string | null;
  playable: boolean;
  reason?: string; // why not playable
}

export interface ProviderCapabilities {
  canSeek: boolean;
  canReadPosition: boolean;
  /** whether the host can reliably drive remote participants */
  supportsSync: boolean;
  syncNote?: string;
}
