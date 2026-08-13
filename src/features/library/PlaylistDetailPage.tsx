/**
 * PlaylistDetailPage (/playlists/:id) — one flexible collection, in order.
 * Reorder with soft chevrons, add tracks from the library, play together.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Page, PageHeader, Sheet } from '@/components/ui/primitives';
import { CloudDrift } from '@/components/illustrations/zen';
import { useIdentity } from '@/features/identity/IdentityContext';
import { createRoom } from '@/features/rooms/roomService';
import {
  addToPlaylist,
  listPlaylists,
  listTracks,
  removeFromPlaylist,
  reorderPlaylist,
} from './libraryService';
import { formatDuration } from '@/lib/utils/format';
import type { Playlist, Track } from '@/types/domain';

type PlaylistWithTracks = Playlist & { tracks: Track[] };

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useIdentity();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistWithTracks | null | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [library, setLibrary] = useState<Track[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!me || !id) return;
    try {
      const all = await listPlaylists(me.id);
      setPlaylist(all.find((p) => p.id === id) ?? null);
    } catch {
      setNote('The playlist could not be loaded just now.');
      setPlaylist(null);
    }
  }, [me, id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const playTogether = async () => {
    if (!me || !playlist || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const room = await createRoom({
        me,
        name: playlist.name,
        trackId: playlist.tracks[0]?.id ?? null,
      });
      navigate(`/room/${room.id}`);
    } catch {
      setNote('The room could not be opened just now. Please try again.');
      setBusy(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!playlist || busy) return;
    const target = index + dir;
    if (target < 0 || target >= playlist.tracks.length) return;
    const ids = playlist.tracks.map((t) => t.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    // Optimistic reorder so the list feels alive.
    const nextTracks = ids
      .map((tid) => playlist.tracks.find((t) => t.id === tid))
      .filter(Boolean) as Track[];
    setPlaylist({ ...playlist, tracks: nextTracks });
    setBusy(true);
    setNote(null);
    try {
      await reorderPlaylist(playlist.id, ids);
    } catch {
      setNote('The order could not be saved just now.');
    } finally {
      setBusy(false);
      void reload();
    }
  };

  const remove = async (track: Track) => {
    if (!playlist || busy) return;
    setBusy(true);
    setNote(null);
    try {
      await removeFromPlaylist(playlist.id, track.id);
    } catch {
      setNote('The track could not be removed just now.');
    } finally {
      setBusy(false);
      void reload();
    }
  };

  const openPicker = async () => {
    if (!me) return;
    setPickerOpen(true);
    try {
      setLibrary(await listTracks(me.id));
    } catch {
      setLibrary([]);
      setNote('Your library could not be loaded just now.');
    }
  };

  const addTrack = async (track: Track) => {
    if (!playlist || busy) return;
    setBusy(true);
    setNote(null);
    try {
      await addToPlaylist(playlist.id, track.id);
    } catch {
      setNote('The track could not be added just now.');
    } finally {
      setBusy(false);
      void reload();
    }
  };

  if (playlist === undefined) {
    return (
      <Page>
        <div className="card h-24 animate-breathe" aria-hidden="true" />
      </Page>
    );
  }

  if (playlist === null) {
    return (
      <Page>
        <EmptyState
          illustration={<CloudDrift size={90} className="animate-floaty" />}
          title="This playlist has drifted away."
          body="It may have been removed, or the link has wandered."
          action={
            <Button variant="secondary" onClick={() => navigate('/playlists')}>
              Back to playlists
            </Button>
          }
        />
      </Page>
    );
  }

  const inPlaylist = new Set(playlist.tracks.map((t) => t.id));
  const available = library.filter((t) => !inPlaylist.has(t.id));

  return (
    <Page>
      <PageHeader
        title={playlist.name}
        subtitle={`${playlist.tracks.length} ${playlist.tracks.length === 1 ? 'track' : 'tracks'}, in their own order.`}
        back={() => navigate('/playlists')}
        action={
          <Button
            className="mt-1 shrink-0 px-5 py-2.5 text-sm"
            onClick={() => void playTogether()}
            disabled={playlist.tracks.length === 0 || busy}
          >
            Play together
          </Button>
        }
      />

      {note && (
        <p className="mb-4 rounded-full bg-gold-100 px-4 py-2 text-sm text-ink-soft" role="alert">
          {note}
        </p>
      )}

      {playlist.tracks.length === 0 ? (
        <EmptyState
          illustration={<CloudDrift size={80} className="animate-floaty" />}
          title="Nothing gathered yet"
          body="Add a few tracks from your library to give this playlist its shape."
          action={
            <Button variant="secondary" onClick={() => void openPicker()}>
              Add tracks
            </Button>
          }
        />
      ) : (
        <>
          <ol className="flex flex-col gap-2">
            {playlist.tracks.map((track, i) => (
              <li key={track.id} className="card flex items-center gap-3 p-3 animate-fade-up">
                <span className="w-7 shrink-0 text-center font-display text-lg text-ink-faint" aria-label={`Position ${i + 1}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{track.title}</p>
                  <p className="truncate text-sm text-ink-faint">
                    {track.teacher && <span>{track.teacher} · </span>}
                    {track.durationSec != null ? formatDuration(track.durationSec) : 'length unknown'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col" aria-hidden={false}>
                  <button
                    type="button"
                    aria-label={`Move ${track.title} earlier`}
                    disabled={i === 0 || busy}
                    onClick={() => void move(i, -1)}
                    className="rounded-full p-1 text-ink-faint transition-colors hover:bg-sand/70 hover:text-ink disabled:opacity-30"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${track.title} later`}
                    disabled={i === playlist.tracks.length - 1 || busy}
                    onClick={() => void move(i, 1)}
                    className="rounded-full p-1 text-ink-faint transition-colors hover:bg-sand/70 hover:text-ink disabled:opacity-30"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${track.title} from this playlist`}
                  disabled={busy}
                  onClick={() => void remove(track)}
                  className="shrink-0 rounded-full p-2 text-ink-faint transition-colors hover:bg-lotus-100 hover:text-lotus-500 disabled:opacity-30"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <Button variant="secondary" className="w-full" onClick={() => void openPicker()}>
              Add tracks
            </Button>
          </div>
        </>
      )}

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add from your library">
        {available.length === 0 ? (
          <p className="py-4 text-center text-ink-soft">
            {library.length === 0
              ? 'Your library is still quiet — add a track there first.'
              : 'Everything in your library is already here.'}
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {available.map((track) => (
              <li key={track.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void addTrack(track)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-sand/50 disabled:opacity-50"
                  aria-label={`Add ${track.title} to playlist`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{track.title}</p>
                    <p className="truncate text-sm text-ink-faint">
                      {track.teacher ?? '—'}
                      {track.durationSec != null && ` · ${formatDuration(track.durationSec)}`}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-sage-100 px-3 py-1 text-sm font-semibold text-sage-700">
                    Add
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </Page>
  );
}
