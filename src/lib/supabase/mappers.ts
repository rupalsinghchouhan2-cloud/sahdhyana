/**
 * Row <-> domain mappers. Database rows are snake_case; the app speaks camelCase.
 * Every module touches Supabase data through these, never raw rows.
 */
import type {
  MeditationRecord,
  Playlist,
  Room,
  DiscourseSeries,
  Session,
  Track,
} from '@/types/domain';

export function toTrack(row: any): Track {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    teacher: row.teacher ?? null,
    sourceUrl: row.source_url,
    provider: row.provider,
    audioUrl: row.audio_url ?? null,
    artworkUrl: row.artwork_url ?? null,
    durationSec: row.duration_sec ?? null,
    createdAt: row.created_at,
  };
}

export function fromTrack(t: Omit<Track, 'id' | 'createdAt'>) {
  return {
    owner_id: t.ownerId,
    title: t.title,
    teacher: t.teacher ?? null,
    source_url: t.sourceUrl,
    provider: t.provider,
    audio_url: t.audioUrl ?? null,
    artwork_url: t.artworkUrl ?? null,
    duration_sec: t.durationSec ?? null,
  };
}

export function toRoom(row: any): Room {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    hostId: row.host_id,
    hostName: row.host_name,
    status: row.status,
    trackId: row.track_id ?? null,
    createdAt: row.created_at,
    endedAt: row.ended_at ?? null,
  };
}

export function toPlaylist(row: any): Playlist {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function toSeries(row: any): DiscourseSeries {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description ?? null,
    createdAt: row.created_at,
  };
}

export function toSession(row: any): Session {
  return {
    id: row.id,
    roomId: row.room_id,
    trackId: row.track_id ?? null,
    state: row.state,
    positionSec: Number(row.position_sec ?? 0),
    updatedAtServer: Number(row.updated_at_server ?? 0),
    updatedBy: row.updated_by,
    sourceKind: row.source_kind ?? undefined,
    sourceId: row.source_id ?? null,
    sourcePosition: row.source_position ?? null,
  };
}

export function toRecord(row: any): MeditationRecord {
  return {
    id: row.id,
    meditatorId: row.meditator_id,
    roomId: row.room_id ?? null,
    roomName: row.room_name ?? null,
    trackId: row.track_id ?? null,
    trackTitle: row.track_title ?? null,
    teacher: row.teacher ?? null,
    durationSec: Number(row.duration_sec ?? 0),
    completedAt: row.completed_at,
    companions: row.companions ?? [],
    companionIds: row.companion_ids ?? [],
  };
}
