/**
 * SeriesDetailPage (/series/:id) — one journey, walked in order.
 * A hero progress ring, a path of numbered steps, and gentle actions:
 * mark complete, reorder, remove, add from the library or by URL.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Page, PageHeader, Sheet } from '@/components/ui/primitives';
import { MountainRiver } from '@/components/illustrations/zen';
import { useIdentity } from '@/features/identity/IdentityContext';
import { createRoom } from '@/features/rooms/roomService';
import {
  addToSeries,
  listSeries,
  listTracks,
  markSeriesTrackComplete,
  removeFromSeries,
  reorderSeries,
} from './libraryService';
import { AddTrackSheet } from './AddTrackSheet';
import { formatDuration } from '@/lib/utils/format';
import type { DiscourseSeries, SeriesProgress, Track } from '@/types/domain';

type SeriesFull = DiscourseSeries & { tracks: Track[]; progress: SeriesProgress | null };

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useIdentity();
  const navigate = useNavigate();
  const [series, setSeries] = useState<SeriesFull | null | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [urlSheetOpen, setUrlSheetOpen] = useState(false);
  const [library, setLibrary] = useState<Track[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyPos, setBusyPos] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!me || !id) return;
    try {
      const all = await listSeries(me.id);
      setSeries(all.find((s) => s.id === id) ?? null);
    } catch {
      setNote('The series could not be loaded just now.');
      setSeries(null);
    }
  }, [me, id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const total = series?.tracks.length ?? 0;
  const completed = Math.min(series?.progress?.completedCount ?? 0, total);
  const nextPosition = series?.progress?.nextPosition ?? 1;
  const finished = total > 0 && nextPosition > total;
  const nextTrackIndex = Math.min(nextPosition, total) - 1;

  const continueJourney = async () => {
    if (!me || !series || total === 0 || busy) return;
    const track = series.tracks[nextTrackIndex];
    setBusy(true);
    setNote(null);
    try {
      const room = await createRoom({ me, name: series.name, trackId: track.id });
      navigate(`/room/${room.id}`);
    } catch {
      setNote('The room could not be opened just now. Please try again.');
      setBusy(false);
    }
  };

  const markComplete = async (position: number) => {
    if (!me || !series || busyPos !== null) return;
    setBusyPos(position);
    setNote(null);
    try {
      await markSeriesTrackComplete(series.id, me.id, position);
    } catch {
      setNote('Progress could not be saved just now.');
    } finally {
      setBusyPos(null);
      void reload();
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!series || busy) return;
    const target = index + dir;
    if (target < 0 || target >= total) return;
    const ids = series.tracks.map((t) => t.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusy(true);
    setNote(null);
    try {
      await reorderSeries(series.id, ids);
    } catch {
      setNote('The order could not be saved just now.');
    } finally {
      setBusy(false);
      void reload();
    }
  };

  const remove = async (track: Track) => {
    if (!series || busy) return;
    setBusy(true);
    setNote(null);
    try {
      await removeFromSeries(series.id, track.id);
    } catch {
      setNote('The track could not be removed just now.');
    } finally {
      setBusy(false);
      void reload();
    }
  };

  const openAdd = async () => {
    if (!me) return;
    setAddOpen(true);
    try {
      setLibrary(await listTracks(me.id));
    } catch {
      setLibrary([]);
      setNote('Your library could not be loaded just now.');
    }
  };

  const addExisting = async (track: Track) => {
    if (!series || busy) return;
    setBusy(true);
    setNote(null);
    try {
      await addToSeries(series.id, track.id);
    } catch {
      setNote('The track could not be added just now.');
    } finally {
      setBusy(false);
      void reload();
    }
  };

  if (series === undefined) {
    return (
      <Page>
        <div className="card h-24 animate-breathe" aria-hidden="true" />
      </Page>
    );
  }

  if (series === null) {
    return (
      <Page>
        <EmptyState
          illustration={<MountainRiver size={100} className="animate-floaty" />}
          title="This journey has drifted away."
          body="It may have been removed, or the link has wandered."
          action={
            <Button variant="secondary" onClick={() => navigate('/series')}>
              Back to series
            </Button>
          }
        />
      </Page>
    );
  }

  const inSeries = new Set(series.tracks.map((t) => t.id));
  const available = library.filter((t) => !inSeries.has(t.id));
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  // Progress ring geometry.
  const ringR = 44;
  const ringC = 2 * Math.PI * ringR;

  return (
    <Page>
      <PageHeader
        title={series.name}
        subtitle={series.description ?? undefined}
        back={() => navigate('/series')}
      />

      {note && (
        <p className="mb-4 rounded-full bg-gold-100 px-4 py-2 text-sm text-ink-soft" role="alert">
          {note}
        </p>
      )}

      <section className="card mb-6 flex items-center gap-5 p-5 animate-fade-up" aria-label="Journey progress">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={ringR} fill="none" strokeWidth="8" className="stroke-sand" />
            <circle
              cx="50"
              cy="50"
              r={ringR}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className="stroke-gold-400 transition-all duration-700"
              strokeDasharray={ringC}
              strokeDashoffset={ringC - (ringC * pct) / 100}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-xl text-ink">{completed}</span>
            <span className="text-xs text-ink-faint">of {total}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">
            {total === 0
              ? 'The path is not yet laid.'
              : finished
                ? 'The journey is complete.'
                : series.progress
                  ? `Track ${nextPosition} awaits.`
                  : 'The first step awaits.'}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {total === 0
              ? 'Add discourses below to shape the journey.'
              : finished
                ? `${completed} ${completed === 1 ? 'discourse' : 'discourses'} heard. You can always walk it again.`
                : `${completed} of ${total} discourses heard.`}
          </p>
          {total > 0 && (
            <Button
              className="mt-3 px-5 py-2.5 text-sm"
              onClick={() => void continueJourney()}
              disabled={busy}
            >
              {busy
                ? 'Opening…'
                : finished
                  ? 'Begin again'
                  : series.progress
                    ? `Continue from Track ${Math.min(nextPosition, total)}`
                    : 'Begin the journey'}
            </Button>
          )}
        </div>
      </section>

      {total > 0 && (
        <ol className="relative flex flex-col gap-2">
          {series.tracks.map((track, i) => {
            const position = i + 1;
            const isDone = position < nextPosition || finished;
            const isNext = position === nextPosition && !finished;
            return (
              <li
                key={track.id}
                className={`card flex items-center gap-3 p-3 animate-fade-up ${
                  isNext ? 'ring-2 ring-gold-300' : ''
                } ${isDone ? 'opacity-75' : ''}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm ${
                    isDone
                      ? 'bg-sage-100 text-sage-700'
                      : isNext
                        ? 'bg-gold-100 text-gold-500'
                        : 'bg-sand/60 text-ink-faint'
                  }`}
                  aria-label={
                    isDone ? `Track ${position}, completed` : isNext ? `Track ${position}, up next` : `Track ${position}`
                  }
                >
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                  ) : (
                    position
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-semibold ${isDone ? 'text-ink-soft' : 'text-ink'}`}>
                    {track.title}
                  </p>
                  <p className="truncate text-sm text-ink-faint">
                    {track.teacher && <span>{track.teacher} · </span>}
                    {track.durationSec != null ? formatDuration(track.durationSec) : 'length unknown'}
                  </p>
                </div>
                {!isDone && (
                  <Button
                    variant="ghost"
                    className="shrink-0 px-3 py-1.5 text-xs"
                    quiet
                    disabled={busyPos !== null}
                    onClick={() => void markComplete(position)}
                    aria-label={`Mark ${track.title} complete`}
                  >
                    {busyPos === position ? 'Marking…' : 'Mark complete'}
                  </Button>
                )}
                <div className="flex shrink-0 flex-col">
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
                    disabled={i === total - 1 || busy}
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
                  aria-label={`Remove ${track.title} from this series`}
                  disabled={busy}
                  onClick={() => void remove(track)}
                  className="shrink-0 rounded-full p-2 text-ink-faint transition-colors hover:bg-lotus-100 hover:text-lotus-500 disabled:opacity-30"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-4">
        <Button variant="secondary" className="w-full" onClick={() => void openAdd()}>
          Add tracks
        </Button>
      </div>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add to this journey">
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="label mb-0">From library</h3>
              <button
                type="button"
                onClick={() => {
                  setAddOpen(false);
                  setUrlSheetOpen(true);
                }}
                className="text-sm font-semibold text-sage-700 transition-colors hover:text-sage-800"
              >
                New URL instead
              </button>
            </div>
            {available.length === 0 ? (
              <p className="rounded-2xl bg-sand/40 px-4 py-3 text-sm text-ink-soft">
                {library.length === 0
                  ? 'Your library is still quiet — add a track by URL.'
                  : 'Everything in your library is already on this path.'}
              </p>
            ) : (
              <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {available.map((track) => (
                  <li key={track.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void addExisting(track)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-sand/50 disabled:opacity-50"
                      aria-label={`Add ${track.title} to series`}
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
          </div>
        </div>
      </Sheet>

      <AddTrackSheet
        open={urlSheetOpen}
        onClose={() => setUrlSheetOpen(false)}
        onSaved={(t) => {
          void addToSeries(series.id, t.id)
            .catch(() => setNote('The track was saved but could not join the series just now.'))
            .finally(() => void reload());
        }}
      />
    </Page>
  );
}
