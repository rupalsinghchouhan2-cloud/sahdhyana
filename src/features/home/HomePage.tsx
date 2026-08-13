/**
 * HomePage — the home sanctuary.
 * A warm landing that greets the meditator, offers the two ways to sit
 * (start or join), and surfaces the threads of their ongoing practice:
 * series in progress, playlists, and the quiet arithmetic of their sittings.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useIdentity } from '@/features/identity/IdentityContext';
import { listPlaylists, listSeries } from '@/features/library/libraryService';
import { computeStats, listRecords } from '@/features/practice/practiceService';
import {
  BreathingOrb,
  Button,
  Card,
  EmptyState,
  Page,
} from '@/components/ui/primitives';
import { BirdsCalm, LeafPair, SittingFigure } from '@/components/illustrations/zen';
import type {
  DiscourseSeries,
  MeditationRecord,
  Playlist,
  PracticeStats,
  SeriesProgress,
  Track,
} from '@/types/domain';

type SeriesWithExtras = DiscourseSeries & {
  tracks: Track[];
  progress: SeriesProgress | null;
};

type PlaylistWithTracks = Playlist & { tracks: Track[] };

/** "morning" | "afternoon" | "evening" from the local hour. */
function daypart(hour: number): string {
  if (hour < 5) return 'evening'; // the deep night still belongs to evening
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

/** A soft skeleton line that pulses while a section loads. */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl bg-sand/70 ${className}`}
    />
  );
}

export default function HomePage() {
  const { me } = useIdentity();
  const navigate = useNavigate();

  const [series, setSeries] = useState<SeriesWithExtras[] | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistWithTracks[] | null>(null);
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;

    listSeries(me.id)
      .then((rows) => {
        if (!cancelled) setSeries(rows);
      })
      .catch(() => {
        if (!cancelled) setSeries([]);
      });

    listPlaylists(me.id)
      .then((rows) => {
        if (!cancelled) setPlaylists(rows);
      })
      .catch(() => {
        if (!cancelled) setPlaylists([]);
      });

    listRecords(me.id, 100)
      .then((records: MeditationRecord[]) => {
        if (!cancelled) {
          setStats(computeStats(records));
          setStatsLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStats(computeStats([]));
          setStatsLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [me]);

  if (!me) return null;

  const greeting = `Good ${daypart(new Date().getHours())}, ${firstName(me.name)}`;

  // Series still being listened to: anything with an unplayed track ahead.
  const inProgress = (series ?? [])
    .filter((s) => s.tracks.length > 0)
    .filter((s) => {
      const completed = s.progress?.completedCount ?? 0;
      return completed < s.tracks.length;
    })
    .slice(0, 2);

  const playlistPreview = (playlists ?? []).slice(0, 3);
  const hasStats = statsLoaded && stats !== null && stats.totalSessions > 0;

  return (
    <Page>
      {/* ------------------------------------------------ greeting */}
      <header className="animate-fade-up" style={{ animationDelay: '0ms' }}>
        <p className="text-ink-soft">{greeting}</p>
        <h1 className="heading-display mt-2 text-4xl text-balance sm:text-5xl">
          Shall we sit?
        </h1>
      </header>

      {/* ------------------------------------------------ hero: begin */}
      <section
        aria-label="Begin meditating"
        className="mt-8 animate-fade-up"
        style={{ animationDelay: '70ms' }}
      >
        <Card className="flex flex-col items-center gap-7 px-6 py-10">
          <BreathingOrb className="h-[140px] w-[140px]" />
          <div className="flex w-full flex-col gap-3">
            <Button className="w-full" onClick={() => navigate('/meditate')}>
              Start a Meditation
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => navigate('/join')}>
              Join a Room
            </Button>
          </div>
        </Card>
      </section>

      {/* ------------------------------------------------ continue your journey */}
      {(series === null || inProgress.length > 0) && (
        <section
          aria-label="Continue your journey"
          className="mt-10 animate-fade-up"
          style={{ animationDelay: '140ms' }}
        >
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="heading-display text-2xl">Continue your journey</h2>
            <Link
              to="/series"
              className="shrink-0 text-sm font-semibold text-sage-600 transition-colors hover:text-sage-700"
            >
              All series
            </Link>
          </div>

          {series === null ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {inProgress.map((s) => {
                const completed = s.progress?.completedCount ?? 0;
                const next = s.progress?.nextPosition ?? 1;
                return (
                  <li key={s.id}>
                    <Link
                      to={`/series/${s.id}`}
                      className="card flex items-center gap-4 p-5 transition-shadow duration-300 hover:shadow-lift"
                    >
                      <LeafPair size={36} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{s.name}</p>
                        <p className="mt-0.5 text-sm text-ink-soft">
                          {completed} / {s.tracks.length} completed
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-sage-100 px-3 py-1.5 text-xs font-semibold text-sage-700">
                        Continue from Track {next}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* ------------------------------------------------ your playlists */}
      {(playlists === null || playlistPreview.length > 0) && (
        <section
          aria-label="Your playlists"
          className="mt-10 animate-fade-up"
          style={{ animationDelay: '210ms' }}
        >
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="heading-display text-2xl">Your playlists</h2>
            <Link
              to="/playlists"
              className="shrink-0 text-sm font-semibold text-sage-600 transition-colors hover:text-sage-700"
            >
              See all
            </Link>
          </div>

          {playlists === null ? (
            <div className="flex gap-3">
              <Skeleton className="h-11 w-28 rounded-full" />
              <Skeleton className="h-11 w-36 rounded-full" />
              <Skeleton className="h-11 w-24 rounded-full" />
            </div>
          ) : (
            <ul className="flex flex-wrap gap-3">
              {playlistPreview.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/playlists"
                    className="inline-flex items-center gap-2 rounded-full border border-sand/60 bg-cream px-4 py-2.5 text-sm font-semibold text-ink shadow-soft transition-shadow duration-300 hover:shadow-lift"
                  >
                    <span className="max-w-[10rem] truncate">{p.name}</span>
                    <span className="text-xs font-normal text-ink-faint">
                      {p.tracks.length} {p.tracks.length === 1 ? 'track' : 'tracks'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ------------------------------------------------ your practice */}
      <section
        aria-label="Your practice"
        className="mt-10 animate-fade-up"
        style={{ animationDelay: '280ms' }}
      >
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="heading-display text-2xl">Your practice</h2>
          {hasStats && (
            <Link
              to="/stats"
              className="shrink-0 text-sm font-semibold text-sage-600 transition-colors hover:text-sage-700"
            >
              See your practice
            </Link>
          )}
        </div>

        {!statsLoaded ? (
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : hasStats && stats ? (
          <div className="grid grid-cols-3 gap-3">
            <Card className="flex flex-col items-center gap-1 p-4 text-center">
              <span className="heading-display text-3xl text-sage-700">
                {stats.currentStreak}
              </span>
              <span className="text-xs font-semibold text-ink-soft">
                day{stats.currentStreak === 1 ? '' : 's'} streak
              </span>
            </Card>
            <Card className="flex flex-col items-center gap-1 p-4 text-center">
              <span className="heading-display text-3xl text-sage-700">
                {stats.totalMinutes}
              </span>
              <span className="text-xs font-semibold text-ink-soft">minutes</span>
            </Card>
            <Card className="flex flex-col items-center gap-1 p-4 text-center">
              <span className="heading-display text-3xl text-sage-700">
                {stats.totalSessions}
              </span>
              <span className="text-xs font-semibold text-ink-soft">
                session{stats.totalSessions === 1 ? '' : 's'}
              </span>
            </Card>
          </div>
        ) : (
          <Card className="p-0">
            <EmptyState
              illustration={<SittingFigure size={88} className="animate-floaty" />}
              title="Your practice begins with a single sit."
              body="Every streak, every quiet minute, starts here."
              action={
                <Button variant="secondary" onClick={() => navigate('/meditate')}>
                  Begin your first sit
                </Button>
              }
            />
          </Card>
        )}
      </section>

      {/* ------------------------------------------------ quiet footer */}
      <footer
        className="mt-14 flex animate-fade-up flex-col items-center gap-3 pb-2 text-center"
        style={{ animationDelay: '350ms' }}
      >
        <BirdsCalm size={64} className="opacity-70" />
        <p className="text-sm text-ink-faint">
          <Link
            to="/meditate"
            className="font-semibold text-ink-soft underline decoration-sand-deep underline-offset-4 transition-colors hover:text-ink"
          >
            Meditate together
          </Link>
        </p>
      </footer>
    </Page>
  );
}
