/**
 * CreateRoomPage — /meditate
 * A calm, single-column flow: name the room, choose a track, begin.
 * The track picker reads the caller's library; new tracks are added by URL
 * through the shared AddTrackSheet used by the Library screens.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Page, PageHeader, Textarea } from '@/components/ui/primitives';
import { LeafPair } from '@/components/illustrations/zen';
import { useIdentity } from '@/features/identity/IdentityContext';
import { listTracks } from '@/features/library/libraryService';
import { AddTrackSheet, ProviderPill } from '@/features/library/AddTrackSheet';
import { createRoom } from './roomService';
import { formatDuration } from '@/lib/utils/format';
import type { Track } from '@/types/domain';

// ---------------------------------------------------------------- track card

function TrackCard({
  track,
  selected,
  onSelect,
}: {
  track: Track;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-48 shrink-0 snap-start flex-col gap-1 rounded-3xl border p-4 text-left transition-all duration-300 ${
        selected
          ? 'border-sage-400 bg-sage-50 shadow-soft'
          : 'border-sand/60 bg-cream hover:border-sand-deep hover:bg-sand/40'
      }`}
    >
      <span className="line-clamp-2 font-semibold text-ink">{track.title}</span>
      {track.teacher && <span className="text-sm text-ink-soft">{track.teacher}</span>}
      <span className="mt-auto flex items-center justify-between gap-2 pt-2">
        <ProviderPill provider={track.provider} />
        {track.durationSec ? (
          <span className="text-xs text-ink-faint">{formatDuration(track.durationSec)}</span>
        ) : null}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------- page

export default function CreateRoomPage() {
  const { me } = useIdentity();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [tracksError, setTracksError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = useCallback(() => {
    if (!me) return;
    setTracksError(false);
    listTracks(me.id)
      .then((list) => setTracks(list))
      .catch(() => setTracksError(true));
  }, [me]);

  useEffect(loadLibrary, [loadLibrary]);

  const canCreate = Boolean(name.trim()) && Boolean(selectedId) && !creating;

  const handleCreate = async () => {
    if (!me || !canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const room = await createRoom({
        me,
        name: name.trim(),
        description: description.trim() || undefined,
        trackId: selectedId,
      });
      navigate(`/room/${room.id}`);
    } catch {
      setError('The room did not open just then. Take a breath and try once more.');
      setCreating(false);
    }
  };

  return (
    <Page>
      <PageHeader title="Create a room" subtitle="A quiet space to share." />

      <div className="flex flex-col gap-8">
        <Card>
          <div className="flex flex-col gap-5">
            <label className="block">
              <span className="label">Room name</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Morning sit"
                maxLength={80}
                required
              />
            </label>
            <label className="block">
              <span className="label">A few words, if you like</span>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A gentle intention for this sitting…"
                maxLength={280}
              />
            </label>
          </div>
        </Card>

        <section aria-label="Choose a track">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="heading-display text-xl">Choose a track</h2>
            <Button variant="ghost" className="text-sm" onClick={() => setSheetOpen(true)}>
              Add a track by URL
            </Button>
          </div>

          {tracks === null && !tracksError && (
            <p className="rounded-3xl bg-sand/40 px-5 py-6 text-center text-ink-faint">
              Gathering your library…
            </p>
          )}
          {tracksError && (
            <div className="rounded-3xl bg-sand/40 px-5 py-6 text-center">
              <p className="text-ink-soft">The library would not open just now.</p>
              <Button variant="ghost" className="mt-2 text-sm" onClick={loadLibrary}>
                Try again
              </Button>
            </div>
          )}
          {tracks !== null && tracks.length === 0 && !tracksError && (
            <p className="rounded-3xl bg-sand/40 px-5 py-6 text-center text-ink-faint">
              Your library is quiet for now — add a track by URL to begin.
            </p>
          )}
          {tracks !== null && tracks.length > 0 && (
            <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
              {tracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  selected={track.id === selectedId}
                  onSelect={() => setSelectedId(track.id)}
                />
              ))}
            </div>
          )}
        </section>

        {error && (
          <p role="alert" className="text-center text-sm text-lotus-500">
            {error}
          </p>
        )}

        <div className="flex flex-col items-center gap-3">
          <Button
            className="w-full sm:w-auto sm:px-12"
            disabled={!canCreate}
            onClick={() => void handleCreate()}
          >
            {creating ? 'Preparing the room…' : 'Open the room'}
          </Button>
          <LeafPair size={28} className="opacity-60" />
        </div>
      </div>

      <AddTrackSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={(track) => {
          setTracks((prev) => (prev ? [track, ...prev] : [track]));
          setSelectedId(track.id);
        }}
      />
    </Page>
  );
}
