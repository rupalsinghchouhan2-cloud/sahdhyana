/**
 * JoinRoomPage — /join and /join/:code
 * A single generous code input. Shared links prefill the code so the
 * arriving guest only has to breathe and press one button.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Input, Page, PageHeader } from '@/components/ui/primitives';
import { MountainRiver } from '@/components/illustrations/zen';
import { getRoomByCode } from './roomService';

type Outcome =
  | { kind: 'not-found' }
  | { kind: 'ended'; roomName: string }
  | { kind: 'error' };

export default function JoinRoomPage() {
  const navigate = useNavigate();
  const { code: routeCode } = useParams<{ code?: string }>();

  const [code, setCode] = useState(() => (routeCode ?? '').toUpperCase().slice(0, 6));
  const [searching, setSearching] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const handleFind = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || searching) return;
    setSearching(true);
    setOutcome(null);
    try {
      const room = await getRoomByCode(trimmed);
      if (!room) {
        setOutcome({ kind: 'not-found' });
      } else if (room.status === 'ended') {
        setOutcome({ kind: 'ended', roomName: room.name });
      } else {
        navigate(`/room/${room.id}`);
        return;
      }
    } catch {
      setOutcome({ kind: 'error' });
    } finally {
      setSearching(false);
    }
  };

  return (
    <Page>
      <PageHeader title="Join a room" subtitle="Someone kept a seat for you." />

      <Card>
        <div className="flex flex-col gap-5">
          <label className="block">
            <span className="label">Room code</span>
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                setOutcome(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleFind();
                }
              }}
              placeholder="ABC123"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="py-4 text-center font-mono text-2xl uppercase tracking-[0.5em] placeholder:tracking-[0.5em]"
              aria-label="Room code"
            />
          </label>

          <Button
            className="w-full"
            disabled={code.trim().length === 0 || searching}
            onClick={() => void handleFind()}
          >
            {searching ? 'Looking…' : 'Find the room'}
          </Button>
        </div>
      </Card>

      {outcome?.kind === 'not-found' && (
        <p role="status" className="mt-6 animate-fade-up text-center text-ink-soft">
          We couldn&rsquo;t find that room — check the code?
        </p>
      )}
      {outcome?.kind === 'error' && (
        <p role="status" className="mt-6 animate-fade-up text-center text-ink-soft">
          The connection wavered for a moment. Try once more?
        </p>
      )}
      {outcome?.kind === 'ended' && (
        <div className="mt-10 flex animate-fade-up flex-col items-center gap-3 text-center">
          <MountainRiver size={110} />
          <h2 className="heading-display text-2xl">This meditation room has ended.</h2>
          <p className="max-w-sm text-ink-soft">
            &ldquo;{outcome.roomName}&rdquo; has already closed its doors. Perhaps begin a room of your own?
          </p>
        </div>
      )}

      <p className="mt-10 text-center text-sm text-ink-faint">
        Or open a link shared with you — it brings you straight here.
      </p>
    </Page>
  );
}
