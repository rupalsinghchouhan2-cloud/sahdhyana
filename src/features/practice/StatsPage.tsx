/**
 * /stats — a mirror for your practice, never a scoreboard.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { listRecords, computeStats } from './practiceService';
import { RecordRow } from './HistoryPage';
import { useIdentity } from '@/features/identity/IdentityContext';
import { EmptyState, Page, PageHeader } from '@/components/ui/primitives';
import { LotusMark, SunMoon } from '@/components/illustrations/zen';
import { dayKey, formatMinutes } from '@/lib/utils/format';
import type { MeditationRecord } from '@/types/domain';

const WEEKS = 15;

/** seconds → warm sage step */
function heatClass(seconds: number): string {
  if (seconds <= 0) return 'bg-sand/50';
  if (seconds < 10 * 60) return 'bg-sage-100';
  if (seconds < 30 * 60) return 'bg-sage-200';
  if (seconds < 60 * 60) return 'bg-sage-300';
  return 'bg-sage-400';
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-ink-faint">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="heading-display mt-2 text-2xl sm:text-3xl">{value}</p>
    </div>
  );
}

interface CalendarCell {
  key: string;
  label: string;
  seconds: number;
}

export default function StatsPage() {
  const { me } = useIdentity();
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

  /** Build WEEKS week-columns × 7 day-rows, ending this week. Index 0 = Sunday. */
  const weeks = useMemo((): CalendarCell[][] => {
    const today = new Date();
    const startOfThisWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfThisWeek.getDay());
    const columns: CalendarCell[][] = [];
    for (let w = WEEKS - 1; w >= 0; w--) {
      const column: CalendarCell[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(startOfThisWeek);
        day.setDate(day.getDate() - w * 7 + d);
        const key = dayKey(day);
        const seconds = stats?.days[key] ?? 0;
        const minutes = Math.round(seconds / 60);
        column.push({
          key,
          seconds,
          label: `${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${minutes} min`,
        });
      }
      columns.push(column);
    }
    return columns;
  }, [stats]);

  return (
    <Page>
      <PageHeader title="Reflections" subtitle="A mirror for your practice — never a scoreboard." />

      {error && (
        <p className="rounded-2xl border border-sand/60 bg-cream px-5 py-4 text-center text-ink-soft shadow-soft">
          We couldn't reach your reflections just now. Take a breath and try again in a moment.
        </p>
      )}

      {!error && records === null && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading your reflections">
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-sand/50" />
            ))}
          </div>
          <div className="h-40 animate-pulse rounded-3xl bg-sand/50" />
        </div>
      )}

      {!error && records !== null && records.length === 0 && (
        <EmptyState
          illustration={<SunMoon size={88} />}
          title="Nothing to reflect on yet"
          body="Once you've sat a few times, gentle patterns will gather here."
        />
      )}

      {!error && records !== null && records.length > 0 && stats && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <StatCard
              label="Current streak"
              value={`${stats.currentStreak} ${stats.currentStreak === 1 ? 'day' : 'days'}`}
              icon={<LotusMark size={18} />}
            />
            <StatCard
              label="Longest streak"
              value={`${stats.longestStreak} ${stats.longestStreak === 1 ? 'day' : 'days'}`}
            />
            <StatCard label="Total time" value={formatMinutes(stats.totalMinutes * 60)} />
            <StatCard label="People you've sat with" value={String(stats.peopleMeditatedWith)} />
          </div>

          <section aria-label="Meditation calendar">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
              The last {WEEKS} weeks
            </h2>
            <div className="card overflow-x-auto p-5 no-scrollbar">
              <div
                className="mx-auto grid w-fit grid-flow-col gap-[3px]"
                role="img"
                aria-label="A calendar of your practice; deeper green means more minutes that day."
              >
                {weeks.map((column, wi) => (
                  <div key={wi} className="grid grid-rows-7 gap-[3px]">
                    {column.map((cell) => (
                      <div
                        key={cell.key}
                        title={cell.label}
                        className={`h-3 w-3 rounded-[4px] ${heatClass(cell.seconds)}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-ink-faint">
                <span>less</span>
                <span className="h-3 w-3 rounded-[4px] bg-sand/50" />
                <span className="h-3 w-3 rounded-[4px] bg-sage-100" />
                <span className="h-3 w-3 rounded-[4px] bg-sage-200" />
                <span className="h-3 w-3 rounded-[4px] bg-sage-300" />
                <span className="h-3 w-3 rounded-[4px] bg-sage-400" />
                <span>more</span>
              </div>
            </div>
          </section>

          <section aria-label="Recent activity">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-faint">
              Recent activity
            </h2>
            <div className="card px-5">
              <ul className="divide-y divide-sand/60">
                {records.slice(0, 5).map((r) => (
                  <RecordRow key={r.id} record={r} />
                ))}
              </ul>
            </div>
          </section>

          <p className="pt-2 text-center text-sm text-ink-faint">
            Streaks are a gentle mirror, not a chain. Begin again, always.
          </p>
        </div>
      )}
    </Page>
  );
}
