/**
 * WelcomeGate — the first-run identity screen.
 * A quiet threshold: no account, no friction. Just a name to sit with.
 * The identity stays on this device; nothing is asked of the visitor
 * beyond a word to be called by.
 */
import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useIdentity } from './IdentityContext';
import { Button, Input } from '@/components/ui/primitives';
import { CloudDrift, LotusMark } from '@/components/illustrations/zen';

export function WelcomeGate() {
  const { suggestedName, chooseName } = useIdentity();
  const [name, setName] = useState(suggestedName);

  const begin = () => {
    chooseName(name.trim() || suggestedName);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    begin();
  };

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* drifting clouds, barely there */}
      <CloudDrift
        size={140}
        className="pointer-events-none absolute left-[-3rem] top-[12%] animate-drift opacity-50"
      />
      <CloudDrift
        size={100}
        className="pointer-events-none absolute right-[-2rem] top-[32%] animate-drift opacity-40 [animation-delay:-6s]"
      />
      <CloudDrift
        size={120}
        className="pointer-events-none absolute bottom-[14%] left-[8%] animate-drift opacity-30 [animation-delay:-12s]"
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex w-full max-w-sm flex-col items-center text-center"
      >
        <LotusMark size={88} className="animate-breathe-slow" />

        <h1 className="heading-display mt-6 text-5xl text-balance">Sahadhyāna</h1>
        <p className="mt-3 text-lg text-ink-soft">Sit together, wherever you are.</p>

        <form onSubmit={onSubmit} className="mt-10 flex w-full flex-col items-stretch gap-4">
          <div className="text-left">
            <label htmlFor="welcome-name" className="label">
              What shall we call you?
            </label>
            <Input
              id="welcome-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="nickname"
              placeholder={suggestedName}
              aria-label="Your name"
            />
          </div>

          <Button type="submit" className="mt-2 w-full">
            Begin
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => chooseName(suggestedName)}
          >
            I'll keep a quiet name
          </Button>
        </form>

        <p className="mt-10 text-sm text-ink-faint">
          No account needed. Your name stays on this device.
        </p>
      </motion.div>
    </main>
  );
}
