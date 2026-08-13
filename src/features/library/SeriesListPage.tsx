/**
 * SeriesListPage (/series) — discourse series are journeys with a
 * beginning and an end. Cards show progress and invite you to continue.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, EmptyState, Input, Page, PageHeader, Sheet, Textarea } from '@/components/ui/primitives';
import { MountainRiver } from '@/components/illustrations/zen';
import { useIdentity } from '@/features/identity/IdentityContext';
import { createSeries, listSeries } from './libraryService';
import type { DiscourseSeries, SeriesProgress, Track } from '@/types/domain';

type SeriesWithProgress = DiscourseSeries & { tracks: Track[]; progress: SeriesProgress | null };

export default function SeriesListPage() {
  const { me } = useIdentity();
  const navigate = useNavigate();
  const [series, setSeries] = useState<SeriesWithProgress[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!me) return;
    try {
      setSeries(await listSeries(me.id));
    } catch {
      setNote('Series could not be loaded just now.');
      setSeries([]);
    }
  }, [me]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openCreate = () => {
    setName('');
    setDescription('');
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const trimmed = name.trim();
    if (!me || !trimmed || creating) return;
    setCreating(true);
    try {
      const created = await createSeries(me.id, trimmed, description.trim() || undefined);
      setCreateOpen(false);
      navigate(`/series/${created.id}`);
    } catch {
      setNote('The series could not be created just now.');
      setCreating(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Discourse Series"
        subtitle="Journeys with a beginning and an end."
        action={
          <Button className="mt-1 shrink-0 px-5 py-2.5 text-sm" onClick={openCreate}>
            New series
          </Button>
        }
      />

      {note && (
        <p className="mb-4 rounded-full bg-gold-100 px-4 py-2 text-sm text-ink-soft" role="alert">
          {note}
        </p>
      )}

      {series === null ? (
        <div className="flex flex-col gap-4" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="card h-40 animate-breathe p-4" />
          ))}
        </div>
      ) : series.length === 0 ? (
        <EmptyState
          illustration={<MountainRiver size={110} className="animate-floaty" />}
          title="No journeys yet"
          body="A series walks a path together — one discourse at a time, in order."
          action={<Button onClick={openCreate}>New series</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {series.map((s) => {
            const total = s.tracks.length;
            const done = Math.min(s.progress?.completedCount ?? 0, total);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const nextPosition = s.progress?.nextPosition ?? 1;
            const finished = total > 0 && nextPosition > total;
            return (
              <li key={s.id} className="card flex flex-col gap-3 p-5 animate-fade-up">
                <div>
                  <h2 className="heading-display text-xl">{s.name}</h2>
                  {s.description && <p className="mt-1 text-sm text-ink-soft">{s.description}</p>}
                </div>
                {total > 0 ? (
                  <div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-ink-soft">
                        {finished ? 'Journey complete' : `${done} / ${total} completed`}
                      </span>
                      <span className="text-ink-faint">{pct}%</span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sand"
                      role="progressbar"
                      aria-valuenow={done}
                      aria-valuemin={0}
                      aria-valuemax={total}
                      aria-label={`Progress in ${s.name}`}
                    >
                      <div
                        className="h-full rounded-full bg-gold-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-ink-faint">No tracks on this path yet.</p>
                )}
                <Link
                  to={`/series/${s.id}`}
                  className="mt-1 inline-flex items-center gap-1.5 self-start font-semibold text-sage-700 transition-colors hover:text-sage-800"
                >
                  {total === 0
                    ? 'Open the path'
                    : finished
                      ? 'Walk it again'
                      : s.progress
                        ? `Continue from Track ${Math.min(nextPosition, total)}`
                        : 'Begin the journey'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="New series">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="series-name" className="label">
              Name
            </label>
            <Input
              id="series-name"
              value={name}
              autoFocus
              placeholder="The Book of Secrets…"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="series-description" className="label">
              Description <span className="font-normal text-ink-faint">(optional)</span>
            </label>
            <Textarea
              id="series-description"
              value={description}
              placeholder="What is this journey about?"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button onClick={() => void submitCreate()} disabled={!name.trim() || creating}>
            {creating ? 'Creating…' : 'Begin the path'}
          </Button>
        </div>
      </Sheet>
    </Page>
  );
}
