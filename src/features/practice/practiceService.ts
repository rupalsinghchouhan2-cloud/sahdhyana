/**
 * Practice — meditation history, streaks, stats.
 */
import { requireSupabase } from '@/lib/supabase/client';
import { toRecord } from '@/lib/supabase/mappers';
import { dayKey } from '@/lib/utils/format';
import type { MeditationRecord, PracticeStats } from '@/types/domain';

export async function listRecords(meditatorId: string, limit = 100): Promise<MeditationRecord[]> {
  const { data, error } = await requireSupabase()
    .from('meditation_records')
    .select('*')
    .eq('meditator_id', meditatorId)
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toRecord);
}

export function computeStats(records: MeditationRecord[]): PracticeStats {
  const days: Record<string, number> = {};
  const companions = new Set<string>();
  let totalSec = 0;
  let completedTracks = 0;

  for (const r of records) {
    const key = dayKey(r.completedAt);
    days[key] = (days[key] ?? 0) + r.durationSec;
    totalSec += r.durationSec;
    if (r.trackId) completedTracks += 1;
    r.companionIds.forEach((id) => companions.add(id));
  }

  // streaks over distinct days
  const keys = Object.keys(days).sort();
  const keySet = new Set(keys);
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86400000));

  let currentStreak = 0;
  let cursor = keySet.has(today) ? today : keySet.has(yesterday) ? yesterday : null;
  if (cursor) {
    while (keySet.has(cursor)) {
      currentStreak += 1;
      const d = new Date(cursor + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      cursor = dayKey(d);
    }
  }

  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of keys) {
    if (prev) {
      const d = new Date(prev + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      run = dayKey(d) === k ? run + 1 : 1;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prev = k;
  }

  return {
    currentStreak,
    longestStreak,
    totalMinutes: Math.round(totalSec / 60),
    totalSessions: records.length,
    completedTracks,
    peopleMeditatedWith: companions.size,
    days,
  };
}
