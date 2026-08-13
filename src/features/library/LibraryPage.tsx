/**
 * LibraryPage (/library) — every sound you've gathered.
 * Track rows with artwork, provider pill, duration, plus quiet actions
 * to start a room from a track or let one go.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, Page, PageHeader, Sheet } from '@/components/ui/primitives';
import { LeafPair } from '@/components/illustrations/zen';
import { useIdentity } from '@/features/identity/IdentityContext';
import { createRoom } from '@/features/rooms/roomService';
import { deleteTrack, listTracks } from './libraryService';
import { AddTrackSheet, ProviderPill } from './AddTrackSheet';
import { formatDuration } from '@/lib/utils/format';
import type { Track, TrackProvider } from '@/types/domain';

const THUMB_TINT: Record<TrackProvider, string> = {
  direct: 'bg-sage-100 text-sage-600',
  youtube: 'bg-lotus-100 text-lotus-500',
  oshoworld: 'bg-powder-100 text-powder-500',
  unknown: 'bg-sand text-ink-soft',
};

function TrackThumb({ track }: { track: Track }) {
  if (track.artworkUrl) {
    return (
      <img
        src={track.artworkUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-2xl object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-lg ${THUMB_TINT[track.provider]}`}
      aria-hidden="true"
    >
      {track.title.trim().charAt(0).toUpperCase() || '♪'}
    </div>
  );
}

export default function LibraryPage() {
  const { me } = useIdentity();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Track | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!me) return;
    try {
      setTracks(await listTracks(me.id));
    } catch {
      setNote('The library could not be loaded just now.');
      setTracks([]);
    }
  }, [me]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const startRoom = async (track: Track) => {
    if (!me || busyId) return;
    setBusyId(track.id);
    setNote(null);
    try {
      const room = await createRoom({ me, name: `Sitting with ${track.title}`, trackId: track.id });
      navigate(`/room/${room.id}`);
    } catch {
      setNote('The room could not be opened just now. Please try again.');
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteTrack(pendingDelete.id);
      setPendingDelete(null);
      await reload();
    } catch {
      setNote('The track could not be removed just now.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Your library"
        subtitle="Every sound you've gathered."
        action={
          <Button className="mt-1 shrink-0 px-5 py-2.5 text-sm" onClick={() => setAddOpen(true)}>
            Add a track
          </Button>
        }
      />

      {note && (
        <p className="mb-4 rounded-full bg-gold-100 px-4 py-2 text-sm text-ink-soft" role="alert">
          {note}
        </p>
      )}

      {tracks === null ? (
        <div className="flex flex-col gap-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-20 animate-breathe p-4" />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <EmptyState
          illustration={<LeafPair size={64} className="animate-floaty" />}
          title="Your library is quiet"
          body="Add a meditation link — YouTube or a direct audio file."
          action={<Button onClick={() => setAddOpen(true)}>Add a track</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {tracks.map((track) => (
            <li key={track.id} className="card flex items-center gap-3 p-4 animate-fade-up">
              <TrackThumb track={track} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{track.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-faint">
                  {track.teacher && <span className="truncate">{track.teacher}</span>}
                  <ProviderPill provider={track.provider} />
                  {track.durationSec != null && <span>{formatDuration(track.durationSec)}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Start a room with ${track.title}`}
                  title="Start a room"
                  disabled={busyId !== null}
                  onClick={() => void startRoom(track)}
                  className="rounded-full p-2 text-ink-faint transition-colors hover:bg-sage-100 hover:text-sage-700 disabled:opacity-40"
                >
                  {busyId === track.id ? (
                    <span className="block h-5 w-5 animate-breathe rounded-full bg-sage-300" aria-hidden="true" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M10 8.5l5 3.5-5 3.5z" fill="currentColor" stroke="none" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${track.title} from library`}
                  title="Remove track"
                  onClick={() => setPendingDelete(track)}
                  className="rounded-full p-2 text-ink-faint transition-colors hover:bg-lotus-100 hover:text-lotus-500"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddTrackSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => void reload()}
      />

      <Sheet open={pendingDelete !== null} onClose={() => setPendingDelete(null)} title="Remove this track?">
        <p className="mb-6 text-ink-soft">
          “{pendingDelete?.title}” will leave your library. It will also slip out of any playlists
          or series it belongs to.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setPendingDelete(null)}>
            Keep it
          </Button>
          <Button variant="secondary" onClick={() => void confirmDelete()} disabled={deleting}>
            {deleting ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </Sheet>
    </Page>
  );
}
