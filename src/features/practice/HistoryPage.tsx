/**
 * /history — every sit, remembered. A gentle log, not a ledger.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { listRecords, computeStats } from './practiceService';
import { useIdentity } from '@/features/identity/IdentityContext';
import { AvatarPebbles, Button, EmptyState, Page, PageHeader } from '@/components/ui/primitives';
import { SittingFigure } from '@/components/illustrations/zen';
import { dayKey, formatMinutes, relativeDate } from '@/lib/utils/format';
import type { MeditationRecord } from '@/types/domain';

function timeOfDay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function firstNames(names: string[]): string {
  const firsts = names.map((n) => n.trim().split(/\s+/)[0]).filter(Boolean);
  if (firsts.length <= 2) return firsts.join(' & ');
  return `${firsts.slice(0, 2).join(', ')} +${firsts.length - 2}`;
}

function StatChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sand/60 bg-cream px-3.5 py-1.5 text-sm font-semibold text-ink-soft shadow-soft">
      {children}
    </span>
  );
}

export function RecordRow({ record }: { record: MeditationRecord }) {
  return (
    <li className="flex items-center gap-4 py-3.5">
      <span className="w-12 shrink-0 text-sm font-semibold tabular-nums text-ink-faint">
        {timeOfDay(record.completedAt)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">
          {record.trackTitle ?? 'Open meditation'}
        </p>
        {record.roomName && (
          <p className="truncate text-sm text-ink-faint">{record.roomName}</p>
        )}
        {record.companions.length > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <AvatarPebbles names={record.companions} size={20} />
            <span className="truncate text-xs text-ink-faint">
              with {firstNames(record.companions)}
            </span>
          </div>
        )}
      </div>
      <span className="shrink-0 text-sm tabular-nums text-ink-soft">
        {formatMinutes(record.durationSec)}
      </span>
    </li>
  );
}

export default function HistoryPage() {
  const { me } = useIdentity();
  const navigate = useNavigate();
  const [records, setRecords] = useState<MeditationRecord[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!me) return;
    let alive = true;
    listRecords(me.id, 100)
      .then((rows) => {
        if (alive) setRecords(rows);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [me]);

  const stats = useMemo(() => (records ? computeStats(records) : null), [records]);

  const groups = useMemo(() => {
    if (!records) return [];
    const byDay = new Map<string, MeditationRecord[]>();
    for (const r of records) {
      const key = dayKey(r.completedAt);
      const bucket = byDay.get(key);
      if (bucket) bucket.push(r);
      else byDay.set(key, [r]);
    }
    // records arrive newest-first, so insertion order is already most recent day first
    return [...byDay.entries()];
  }, [records]);

  return (
    <Page>
      <PageHeader title="Your practice" subtitle="Every sit, remembered." />

      {error && (
        <p className="rounded-2xl border border-sand/60 bg-cream px-5 py-4 text-center text-ink-soft shadow-soft">
          We couldn't reach your history just now. Take a breath and try again in a moment.
        </p>
      )}

      {!error && records === null && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading your history">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 w-28 animate-pulse rounded-full bg-sand/60" />
            ))}
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-3xl bg-sand/50" />
          ))}
        </div>
      )}

      {!error && records !== null && records.length === 0 && (
        <EmptyState
          illustration={<SittingFigure size={96} />}
          title="Nothing here yet"
          body="Your first sit will appear here."
          action={
            <Button onClick={() => navigate('/meditate')}>Start a meditation</Button>
          }
        />
      )}

      {!error && records !== null && records.length > 0 && stats && (
        <>
          <div className="mb-8 flex flex-wrap gap-2">
            <StatChip>
              <span aria-hidden="true">🌿</span> Current streak {stats.currentStreak}{' '}
              {stats.currentStreak === 1 ? 'day' : 'days'}
            </StatChip>
            <StatChip>{stats.totalSessions} sits</StatChip>
            <StatChip>{formatMinutes(stats.totalMinutes * 60)}</StatChip>
          </div>

          <div className="space-y-8">
            {groups.map(([key, dayRecords]) => (
              <section key={key} aria-label={relativeDate(dayRecords[0].completedAt)}>
                <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                  {relativeDate(dayRecords[0].completedAt)}
                </h2>
                <div className="card px-5">
                  <ul className="divide-y divide-sand/60">
                    {dayRecords.map((r) => (
                      <RecordRow key={r.id} record={r} />
                    ))}
                  </ul>
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
