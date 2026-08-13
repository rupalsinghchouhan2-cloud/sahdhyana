/**
 * /settings — the quiet control room. Name, sounds, reminders, install.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useIdentity } from '@/features/identity/IdentityContext';
import { useSettings } from '@/lib/storage/settingsStore';
import { useInstallPrompt } from '@/features/pwa/useInstallPrompt';
import {
  PEACEFUL_MESSAGES,
  notificationsSupported,
  requestNotificationPermission,
  useReminders,
} from './reminders';
import { Button, Input, Page, PageHeader } from '@/components/ui/primitives';
import type { Reminder } from '@/types/domain';

// ---------------------------------------------------------------- building blocks

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card p-6" aria-label={title}>
      <h2 className="heading-display mb-4 text-xl">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  note,
}: {
  checked: boolean;
  onChange(v: boolean): void;
  label: string;
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold text-ink">{label}</p>
        {note && <p className="mt-0.5 text-sm text-ink-faint">{note}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-300 ${
          checked ? 'bg-sage-200' : 'bg-sand'
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full shadow-soft transition-all duration-300 ${
            checked ? 'left-7 bg-sage-500' : 'left-1 bg-cream'
          }`}
        />
      </button>
    </div>
  );
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function describeDays(days: number[]): string {
  if (days.length === 0 || days.length === 7) return 'Every day';
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => DAY_LETTERS[d])
    .join(' · ');
}

// ---------------------------------------------------------------- name section

function NameSection() {
  const { me, rename } = useIdentity();
  const [value, setValue] = useState(me?.name ?? '');
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setValue(me?.name ?? '');
  }, [me?.name]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const save = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    rename(trimmed);
    setSaved(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <Section title="Your name">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="settings-name" className="label">
            How others will see you
          </label>
          <Input
            id="settings-name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={40}
            autoComplete="name"
          />
        </div>
        <Button
          variant="secondary"
          className="shrink-0 px-5 py-3"
          onClick={save}
          disabled={!value.trim() || value.trim() === me?.name}
        >
          Save
        </Button>
      </div>
      <p
        className={`mt-2 text-sm text-sage-600 transition-opacity duration-500 ${
          saved ? 'opacity-100' : 'opacity-0'
        }`}
        role="status"
      >
        Saved
      </p>
    </Section>
  );
}

// ---------------------------------------------------------------- reminders

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const updateReminder = useReminders((s) => s.updateReminder);
  const removeReminder = useReminders((s) => s.removeReminder);

  return (
    <li className="flex items-center gap-3 py-3">
      <button
        type="button"
        role="switch"
        aria-checked={reminder.enabled}
        aria-label={`Reminder at ${reminder.time}`}
        onClick={() => updateReminder(reminder.id, { enabled: !reminder.enabled })}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-300 ${
          reminder.enabled ? 'bg-sage-200' : 'bg-sand'
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full shadow-soft transition-all duration-300 ${
            reminder.enabled ? 'left-7 bg-sage-500' : 'left-1 bg-cream'
          }`}
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-semibold tabular-nums text-ink">{reminder.time}</p>
        <p className="truncate text-sm text-ink-faint">
          {describeDays(reminder.days)} — {reminder.message}
        </p>
      </div>
      <Button
        variant="ghost"
        className="shrink-0 px-3 py-1.5 text-sm"
        aria-label={`Delete reminder at ${reminder.time}`}
        onClick={() => removeReminder(reminder.id)}
      >
        Delete
      </Button>
    </li>
  );
}

function AddReminderForm() {
  const addReminder = useReminders((s) => s.addReminder);
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState('08:00');
  const [days, setDays] = useState<number[]>([]);
  const [message, setMessage] = useState(PEACEFUL_MESSAGES[0]);

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const submit = () => {
    if (!time) return;
    addReminder({ enabled: true, days, time, message });
    setOpen(false);
    setTime('08:00');
    setDays([]);
    setMessage(PEACEFUL_MESSAGES[0]);
  };

  if (!open) {
    return (
      <Button variant="secondary" className="mt-2 w-full" onClick={() => setOpen(true)}>
        Add reminder
      </Button>
    );
  }

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-sand/60 bg-ivory/60 p-4">
      <div>
        <label htmlFor="reminder-time" className="label">
          Time
        </label>
        <Input
          id="reminder-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>
      <div>
        <span className="label" id="reminder-days-label">
          Days
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="reminder-days-label">
          {DAY_LETTERS.map((letter, d) => {
            const active = days.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={active}
                onClick={() => toggleDay(d)}
                className={`h-10 w-10 rounded-full text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-sage-500 text-cream shadow-soft'
                    : 'bg-sand/60 text-ink-soft hover:bg-sand'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-sm text-ink-faint">No days selected means every day.</p>
      </div>
      <div>
        <label htmlFor="reminder-message" className="label">
          Message
        </label>
        <select
          id="reminder-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input appearance-none bg-cream pr-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a7f6c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
          }}
        >
          {PEACEFUL_MESSAGES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={submit} disabled={!time}>
          Save reminder
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function RemindersSection() {
  const reminders = useReminders((s) => s.reminders);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationsSupported() ? Notification.permission : 'unsupported',
  );

  const ask = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
  };

  return (
    <Section title="Reminders">
      <p className="-mt-2 mb-4 text-sm text-ink-faint">
        A soft nudge at your chosen hour, whenever the app is open.
      </p>

      {reminders.length > 0 && (
        <ul className="divide-y divide-sand/60">
          {reminders.map((r) => (
            <ReminderRow key={r.id} reminder={r} />
          ))}
        </ul>
      )}

      {permission === 'unsupported' && (
        <p className="mt-3 rounded-2xl bg-sand/50 px-4 py-3 text-sm text-ink-soft">
          Notifications aren't supported in this browser.
        </p>
      )}

      {permission === 'default' && (
        <div className="mt-3">
          <Button variant="secondary" onClick={ask}>
            Allow notifications
          </Button>
        </div>
      )}

      {permission === 'denied' && (
        <p className="mt-3 rounded-2xl bg-sand/50 px-4 py-3 text-sm text-ink-soft">
          Notifications are off — you can enable them in your browser settings.
        </p>
      )}

      <AddReminderForm />
    </Section>
  );
}

// ---------------------------------------------------------------- install

function InstallSection() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();

  return (
    <Section title="Install the app">
      {installed ? (
        <p className="text-ink-soft">Sahadhyāna lives on your home screen. 🧘</p>
      ) : canInstall ? (
        <Button variant="secondary" onClick={() => void promptInstall()}>
          Install Sahadhyāna
        </Button>
      ) : (
        <p className="text-ink-soft">
          Open your browser menu and choose 'Add to Home Screen' to keep Sahadhyāna close.
        </p>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------- page

export default function SettingsPage() {
  const soundsEnabled = useSettings((s) => s.soundsEnabled);
  const completionSoundEnabled = useSettings((s) => s.completionSoundEnabled);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const setSoundsEnabled = useSettings((s) => s.setSoundsEnabled);
  const setCompletionSoundEnabled = useSettings((s) => s.setCompletionSoundEnabled);
  const setReducedMotion = useSettings((s) => s.setReducedMotion);

  return (
    <Page>
      <PageHeader title="Settings" />

      <div className="space-y-6">
        <NameSection />

        <Section title="Sounds">
          <div className="divide-y divide-sand/60">
            <Toggle
              label="Gentle interface sounds"
              checked={soundsEnabled}
              onChange={setSoundsEnabled}
            />
            <Toggle
              label="Singing bowl at completion"
              checked={completionSoundEnabled}
              onChange={setCompletionSoundEnabled}
            />
            <Toggle
              label="Reduce motion"
              note="We'll keep animations still."
              checked={reducedMotion}
              onChange={setReducedMotion}
            />
          </div>
        </Section>

        <RemindersSection />
        <InstallSection />
      </div>

      <p className="mt-10 text-center text-xs text-ink-faint">
        Sahadhyāna V1 — sit together, wherever you are.
      </p>
    </Page>
  );
}
