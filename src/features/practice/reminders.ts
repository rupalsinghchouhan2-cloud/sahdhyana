/**
 * Meditation reminders — local-first. In a PWA, scheduled local notifications
 * without a push server are best-effort: we check due reminders whenever the
 * app is open or becomes visible, and fire via the Notification API.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { uuid } from '@/lib/utils/id';
import type { Reminder } from '@/types/domain';

const memoryStore = new Map<string, string>();
const safeStorage = {
  getItem: (k: string) => {
    try { return localStorage.getItem(k); } catch { return memoryStore.get(k) ?? null; }
  },
  setItem: (k: string, v: string) => {
    try { localStorage.setItem(k, v); } catch { memoryStore.set(k, v); }
  },
  removeItem: (k: string) => {
    try { localStorage.removeItem(k); } catch { memoryStore.delete(k); }
  },
};

export const PEACEFUL_MESSAGES = [
  'Your space is waiting.',
  'A little time for yourself?',
  'Shall we sit in silence?',
  'Come as you are.',
  'A few quiet breaths, together.',
];

interface ReminderState {
  reminders: Reminder[];
  addReminder(r: Omit<Reminder, 'id'>): Reminder;
  updateReminder(id: string, patch: Partial<Reminder>): void;
  removeReminder(id: string): void;
}

export const useReminders = create<ReminderState>()(
  persist(
    (set, get) => ({
      reminders: [],
      addReminder: (r) => {
        const reminder = { ...r, id: uuid() };
        set({ reminders: [...get().reminders, reminder] });
        return reminder;
      },
      updateReminder: (id, patch) =>
        set({ reminders: get().reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),
      removeReminder: (id) => set({ reminders: get().reminders.filter((r) => r.id !== id) }),
    }),
    { name: 'sahadhyana.reminders.v1', storage: createJSONStorage(() => safeStorage) },
  ),
);

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

const firedKeys = new Set<string>();

/** Fire any reminders that are due right now. Safe to call often. */
export function checkDueReminders(): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dow = now.getDay();
  for (const r of useReminders.getState().reminders) {
    if (!r.enabled || r.time !== hhmm) continue;
    if (r.days.length > 0 && !r.days.includes(dow)) continue;
    const fireKey = `${r.id}:${now.toDateString()}:${hhmm}`;
    if (firedKeys.has(fireKey)) continue;
    firedKeys.add(fireKey);
    try {
      new Notification('Sahadhyāna', {
        body: r.message,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: r.id,
        silent: true,
      });
    } catch {
      /* some platforms require a service worker registration; fail gently */
    }
  }
}

let interval: number | null = null;

export function startReminderLoop(): void {
  if (interval !== null) return;
  checkDueReminders();
  interval = window.setInterval(checkDueReminders, 30_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkDueReminders();
  });
}
