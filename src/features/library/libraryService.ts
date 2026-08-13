/**
 * Library service — tracks, playlists, Discourse Series.
 * All functions take the caller's meditator id explicitly so ownership rules
 * stay visible, and so V2 auth can swap the identity source without rewrites.
 */
import { requireSupabase } from '@/lib/supabase/client';
import { toPlaylist, toSeries, toTrack } from '@/lib/supabase/mappers';
import type {
  DiscourseSeries,
  Playlist,
  SeriesProgress,
  Track,
} from '@/types/domain';

// ---------------------------------------------------------------- tracks
export async function listTracks(ownerId: string): Promise<Track[]> {
  const { data, error } = await requireSupabase()
    .from('tracks')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toTrack);
}

export async function getTrack(id: string): Promise<Track | null> {
  const { data } = await requireSupabase().from('tracks').select('*').eq('id', id).maybeSingle();
  return data ? toTrack(data) : null;
}

export async function saveTrack(
  track: Omit<Track, 'id' | 'createdAt'> & { id?: string },
): Promise<Track> {
  const supabase = requireSupabase();
  const row: Record<string, unknown> = {
    owner_id: track.ownerId,
    title: track.title,
    teacher: track.teacher ?? null,
    source_url: track.sourceUrl,
    provider: track.provider,
    audio_url: track.audioUrl ?? null,
    artwork_url: track.artworkUrl ?? null,
    duration_sec: track.durationSec ?? null,
  };
  if (track.id) row.id = track.id;
  const { data, error } = await supabase.from('tracks').upsert(row).select().single();
  if (error) throw error;
  return toTrack(data);
}

export async function deleteTrack(id: string): Promise<void> {
  await requireSupabase().from('tracks').delete().eq('id', id);
}

// ---------------------------------------------------------------- playlists
export async function listPlaylists(ownerId: string): Promise<(Playlist & { tracks: Track[] })[]> {
  const supabase = requireSupabase();
  const { data: pls, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const result: (Playlist & { tracks: Track[] })[] = [];
  for (const row of pls ?? []) {
    const { data: links } = await supabase
      .from('playlist_tracks')
      .select('track_id, position')
      .eq('playlist_id', row.id)
      .order('position');
    const ids = (links ?? []).sort((a, b) => a.position - b.position).map((l) => l.track_id);
    let tracks: Track[] = [];
    if (ids.length) {
      const { data: trackRows } = await supabase.from('tracks').select('*').in('id', ids);
      const byId = new Map((trackRows ?? []).map((t: any) => [t.id, toTrack(t)]));
      tracks = ids.map((id) => byId.get(id)).filter(Boolean) as Track[];
    }
    result.push({ ...toPlaylist(row), tracks });
  }
  return result;
}

export async function createPlaylist(ownerId: string, name: string): Promise<Playlist> {
  const { data, error } = await requireSupabase()
    .from('playlists')
    .insert({ owner_id: ownerId, name })
    .select()
    .single();
  if (error) throw error;
  return toPlaylist(data);
}

export async function renamePlaylist(id: string, name: string): Promise<void> {
  await requireSupabase().from('playlists').update({ name }).eq('id', id);
}

export async function deletePlaylist(id: string): Promise<void> {
  await requireSupabase().from('playlists').delete().eq('id', id);
}

export async function addToPlaylist(playlistId: string, trackId: string): Promise<void> {
  const supabase = requireSupabase();
  const { data } = await supabase
    .from('playlist_tracks')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1);
  const next = ((data?.[0]?.position as number | undefined) ?? 0) + 1;
  await supabase.from('playlist_tracks').upsert({ playlist_id: playlistId, track_id: trackId, position: next });
}

export async function removeFromPlaylist(playlistId: string, trackId: string): Promise<void> {
  await requireSupabase()
    .from('playlist_tracks')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('track_id', trackId);
}

export async function reorderPlaylist(playlistId: string, orderedTrackIds: string[]): Promise<void> {
  const supabase = requireSupabase();
  for (let i = 0; i < orderedTrackIds.length; i++) {
    await supabase
      .from('playlist_tracks')
      .update({ position: i + 1 })
      .eq('playlist_id', playlistId)
      .eq('track_id', orderedTrackIds[i]);
  }
}

// ---------------------------------------------------------------- series
export async function listSeries(
  ownerId: string,
): Promise<(DiscourseSeries & { tracks: Track[]; progress: SeriesProgress | null })[]> {
  const supabase = requireSupabase();
  const { data: rows, error } = await supabase
    .from('series')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const result: (DiscourseSeries & { tracks: Track[]; progress: SeriesProgress | null })[] = [];
  for (const row of rows ?? []) {
    const { data: links } = await supabase
      .from('series_tracks')
      .select('track_id, position')
      .eq('series_id', row.id)
      .order('position');
    const ids = (links ?? []).sort((a, b) => a.position - b.position).map((l) => l.track_id);
    let tracks: Track[] = [];
    if (ids.length) {
      const { data: trackRows } = await supabase.from('tracks').select('*').in('id', ids);
      const byId = new Map((trackRows ?? []).map((t: any) => [t.id, toTrack(t)]));
      tracks = ids.map((id) => byId.get(id)).filter(Boolean) as Track[];
    }
    const { data: prog } = await supabase
      .from('series_progress')
      .select('*')
      .eq('series_id', row.id)
      .eq('meditator_id', ownerId)
      .maybeSingle();
    result.push({
      ...toSeries(row),
      tracks,
      progress: prog
        ? {
            seriesId: prog.series_id,
            meditatorId: prog.meditator_id,
            nextPosition: prog.next_position,
            completedCount: prog.completed_count,
            updatedAt: prog.updated_at,
          }
        : null,
    });
  }
  return result;
}

export async function createSeries(ownerId: string, name: string, description?: string): Promise<DiscourseSeries> {
  const { data, error } = await requireSupabase()
    .from('series')
    .insert({ owner_id: ownerId, name, description: description ?? null })
    .select()
    .single();
  if (error) throw error;
  return toSeries(data);
}

export async function deleteSeries(id: string): Promise<void> {
  await requireSupabase().from('series').delete().eq('id', id);
}

export async function addToSeries(seriesId: string, trackId: string): Promise<void> {
  const supabase = requireSupabase();
  const { data } = await supabase
    .from('series_tracks')
    .select('position')
    .eq('series_id', seriesId)
    .order('position', { ascending: false })
    .limit(1);
  const next = ((data?.[0]?.position as number | undefined) ?? 0) + 1;
  await supabase.from('series_tracks').upsert({ series_id: seriesId, track_id: trackId, position: next });
}

export async function removeFromSeries(seriesId: string, trackId: string): Promise<void> {
  const supabase = requireSupabase();
  await supabase.from('series_tracks').delete().eq('series_id', seriesId).eq('track_id', trackId);
  // re-pack positions so the journey stays sequential
  const { data: links } = await supabase
    .from('series_tracks')
    .select('track_id')
    .eq('series_id', seriesId)
    .order('position');
  const ids = (links ?? []).map((l) => l.track_id);
  for (let i = 0; i < ids.length; i++) {
    await supabase
      .from('series_tracks')
      .update({ position: i + 1 })
      .eq('series_id', seriesId)
      .eq('track_id', ids[i]);
  }
}

export async function reorderSeries(seriesId: string, orderedTrackIds: string[]): Promise<void> {
  const supabase = requireSupabase();
  // Two-phase update avoids the unique(series_id, position) constraint clash.
  for (let i = 0; i < orderedTrackIds.length; i++) {
    await supabase
      .from('series_tracks')
      .update({ position: 1000 + i })
      .eq('series_id', seriesId)
      .eq('track_id', orderedTrackIds[i]);
  }
  for (let i = 0; i < orderedTrackIds.length; i++) {
    await supabase
      .from('series_tracks')
      .update({ position: i + 1 })
      .eq('series_id', seriesId)
      .eq('track_id', orderedTrackIds[i]);
  }
}

export async function markSeriesTrackComplete(
  seriesId: string,
  meditatorId: string,
  completedPosition: number,
): Promise<void> {
  const supabase = requireSupabase();
  const { data: existing } = await supabase
    .from('series_progress')
    .select('*')
    .eq('series_id', seriesId)
    .eq('meditator_id', meditatorId)
    .maybeSingle();
  const completedCount = Math.max(existing?.completed_count ?? 0, completedPosition);
  await supabase.from('series_progress').upsert({
    series_id: seriesId,
    meditator_id: meditatorId,
    next_position: completedPosition + 1,
    completed_count: completedCount,
    updated_at: new Date().toISOString(),
  });
}
