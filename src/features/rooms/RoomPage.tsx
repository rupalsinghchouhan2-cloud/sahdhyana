/**
 * RoomPage — /room/:roomId
 * The heart of Sahadhyāna: a shared meditation room.
 * Minimal, warm, spacious — controls recede once the sitting begins.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AvatarPebbles,
  BreathingOrb,
  Button,
  Card,
  EmptyState,
  Input,
  Page,
  Sheet,
} from '@/components/ui/primitives';
import {
  CloudDrift,
  LotusMark,
  SittingFigure,
} from '@/components/illustrations/zen';
import { useIdentity } from '@/features/identity/IdentityContext';
import { listTracks } from '@/features/library/libraryService';
import { ProviderPill } from '@/features/library/AddTrackSheet';
import { capabilitiesFor } from '@/lib/providers/registry';
import { sounds } from '@/lib/sounds/soundEngine';
import { formatDuration } from '@/lib/utils/format';
import { useRoomSession, type SessionEndedInfo } from './useRoomSession';
import type { RoomSnapshot } from '@/lib/sync/roomSession';
import type { SessionState, Track } from '@/types/domain';

// ---------------------------------------------------------------- helpers

function inviteLink(code: string): string {
  return `${window.location.origin}${window.location.pathname}#/join/${code}`;
}

function ConnectionPill({ connection }: { connection: RoomSnapshot['connection'] }) {
  if (connection === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold text-sage-700">
        <span className="h-1.5 w-1.5 rounded-full bg-sage-500" aria-hidden="true" />
        live
      </span>
    );
  }
  if (connection === 'reconnecting' || connection === 'connecting') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-500">
        <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-gold-400" aria-hidden="true" />
        reconnecting…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-lotus-100 px-3 py-1 text-xs font-semibold text-lotus-500">
      We lost the connection for a moment. Reconnecting…
    </span>
  );
}

// ---------------------------------------------------------------- choose-track sheet (host, no track yet)

function ChooseTrackSheet({
  open,
  onClose,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (trackId: string) => void;
}) {
  const { me } = useIdentity();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    if (!me) return;
    setFailed(false);
    listTracks(me.id)
      .then(setTracks)
      .catch(() => setFailed(true));
  }, [me]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  return (
    <Sheet open={open} onClose={onClose} title="Choose a track">
      {tracks === null && !failed && (
        <p className="py-6 text-center text-ink-faint">Gathering your library…</p>
      )}
      {failed && (
        <div className="py-6 text-center">
          <p className="text-ink-soft">The library would not open just now.</p>
          <Button variant="ghost" className="mt-2 text-sm" onClick={load}>
            Try again
          </Button>
        </div>
      )}
      {tracks !== null && tracks.length === 0 && !failed && (
        <p className="py-6 text-center text-ink-faint">
          Your library is quiet for now — add a track from the library first.
        </p>
      )}
      {tracks !== null && tracks.length > 0 && (
        <ul className="-m-2 flex max-h-[50vh] flex-col overflow-y-auto p-2">
          {tracks.map((track) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => {
                  onChoose(track.id);
                  onClose();
                }}
                className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-sand/50"
              >
                <span>
                  <span className="block font-semibold text-ink">{track.title}</span>
                  {track.teacher && (
                    <span className="block text-sm text-ink-soft">{track.teacher}</span>
                  )}
                </span>
                {track.durationSec ? (
                  <span className="shrink-0 text-sm text-ink-faint">
                    {formatDuration(track.durationSec)}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- completion overlay

function CompletionOverlay({
  info,
  dismissed,
  onDismiss,
  onReturnHome,
}: {
  info: SessionEndedInfo;
  dismissed: boolean;
  onDismiss: () => void;
  onReturnHome: () => void;
}) {
  const minutes = Math.max(1, Math.round(info.durationSec / 60));
  return (
    <Sheet open={!dismissed} onClose={onDismiss} title="Sitting complete">
      <div className="flex flex-col items-center gap-4 pb-2 pt-4 text-center">
        <LotusMark size={64} className="animate-breathe" />
        <h2 className="heading-display text-3xl text-balance">
          You sat for {minutes} {minutes === 1 ? 'minute' : 'minutes'}.
        </h2>
        <p className="text-ink-soft">
          {info.track ? info.track.title : 'Silent meditation'}
          {info.companions.length > 0 && <> · with {info.companions.join(', ')}</>}
        </p>
        <p className="text-sm text-ink-faint">Take one more breath before you leave.</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <Button className="w-full" onClick={onReturnHome}>
            Return home
          </Button>
          <Button variant="ghost" className="w-full" onClick={onDismiss}>
            Stay in the room
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- page

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { snapshot, ended, roomGone, error, controls, isHost } = useRoomSession(roomId);

  const [copied, setCopied] = useState(false);
  const [endedDismissed, setEndedDismissed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const prevStateRef = useRef<SessionState | null>(null);

  // Ring a soft bell whenever the sitting begins (or resumes).
  useEffect(() => {
    const state = snapshot?.session?.state ?? null;
    if (state === 'playing' && prevStateRef.current !== 'playing') sounds.bell();
    prevStateRef.current = state;
  }, [snapshot?.session?.state]);

  // A fresh "ended" moment re-opens the completion overlay.
  useEffect(() => {
    if (ended) setEndedDismissed(false);
  }, [ended]);

  const copyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink(code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the code is already visible to share by hand */
    }
  };

  // ---- ended / gone / error --------------------------------------------
  if (error || roomGone) {
    return (
      <Page>
        <EmptyState
          illustration={<CloudDrift size={100} />}
          title={error ?? 'This meditation room has ended.'}
          body="Thank you for sitting. The stillness goes with you."
          action={
            <Button variant="ghost" onClick={() => navigate('/')}>
              Return home
            </Button>
          }
        />
      </Page>
    );
  }

  // ---- entering ---------------------------------------------------------
  if (!snapshot) {
    return (
      <Page>
        <div className="flex flex-col items-center gap-6 py-24 text-center">
          <BreathingOrb active className="h-28 w-28" />
          <p className="font-display text-xl text-ink-soft">Entering the room…</p>
        </div>
      </Page>
    );
  }

  // ---- live room ----------------------------------------------------------
  const { room, participants, session, track, positionSec, connection } = snapshot;
  const state: SessionState = session?.state ?? 'idle';
  const waiting = state === 'idle';
  const live = state === 'playing' || state === 'paused';
  const duration = track?.durationSec ?? null;
  const progress = duration && duration > 0 ? Math.min(100, (positionSec / duration) * 100) : 0;
  const caps = track ? capabilitiesFor(track.provider) : null;
  const names = participants.map((p) => p.name);
  const hostName = participants.find((p) => p.isHost)?.name;

  return (
    <Page className="text-center">
      {/* header */}
      <div className="relative mb-6">
        <div className="absolute right-0 top-0">
          <Button variant="ghost" className="text-sm" onClick={() => navigate('/')}>
            Leave
          </Button>
        </div>
        <div className="flex flex-col items-center gap-2 pt-8">
          <h1 className="font-display text-2xl text-balance">{room.name}</h1>
          <p className="text-sm text-ink-faint">Hosted by {room.hostName}</p>
          <ConnectionPill connection={connection} />
        </div>
      </div>

      {/* participants */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <AvatarPebbles names={names} />
        <p className="text-sm text-ink-soft">
          {names.length} {names.length === 1 ? 'person' : 'people'} meditating
          {hostName && (
            <span className="text-ink-faint" title="host">
              {' '}
              · {hostName} hosts
            </span>
          )}
        </p>
      </div>

      {/* share card — only while everyone is still arriving */}
      {waiting && (
        <Card className="mb-8 animate-fade-up">
          <p className="mb-1 text-sm text-ink-faint">Invite with this code</p>
          <p className="font-mono text-3xl font-semibold tracking-[0.4em] text-ink">
            {room.code}
          </p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <Input
              readOnly
              value={inviteLink(room.code)}
              onFocus={(e) => e.target.select()}
              className="text-center text-xs text-ink-faint"
              aria-label="Invite link"
            />
            <Button variant="secondary" className="text-sm" onClick={() => void copyInvite(room.code)}>
              {copied ? 'Copied' : 'Copy invite link'}
            </Button>
          </div>
        </Card>
      )}

      {/* track */}
      <div className="mb-8 flex flex-col items-center gap-3">
        {track ? (
          <>
            {track.artworkUrl ? (
              <img
                src={track.artworkUrl}
                alt=""
                className="h-44 w-44 rounded-3xl object-cover shadow-soft"
              />
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded-full bg-sand/70">
                <SittingFigure size={96} />
              </div>
            )}
            <div className="flex flex-col items-center gap-1">
              <p className="font-display text-xl">{track.title}</p>
              {track.teacher && <p className="text-sm text-ink-soft">{track.teacher}</p>}
              <p className="mt-1">
                <ProviderPill provider={track.provider} />
              </p>
            </div>
          </>
        ) : (
          isHost && (
            <Button variant="secondary" onClick={() => setPickerOpen(true)}>
              Choose a track
            </Button>
          )
        )}
      </div>

      {/* YouTube needs a visible player surface */}
      {track?.provider === 'youtube' && (
        <div className="mb-8 flex flex-col items-center gap-2">
          <div
            ref={(el) => {
              // Callback ref: mounts with the element, unmounts with null.
              controls.setYouTubeHost(el);
            }}
            className="h-[200px] w-full max-w-sm overflow-hidden rounded-3xl bg-sand/40"
          />
          <p className="text-xs text-ink-faint">Plays through the official YouTube player.</p>
          {caps?.syncNote && <p className="text-[11px] text-ink-faint/80">{caps.syncNote}</p>}
        </div>
      )}

      {/* the player */}
      {waiting && (
        <div className="flex flex-col items-center gap-4">
          {isHost ? (
            <Button
              className="px-10 py-4 text-lg"
              onClick={() => controls.start(track?.id)}
              disabled={!track}
            >
              Begin the meditation
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <BreathingOrb active={false} className="h-16 w-16" />
              <p className="text-ink-soft">Waiting for the host to begin…</p>
            </div>
          )}
        </div>
      )}

      {live && (
        <div className="flex flex-col items-center gap-5 animate-fade-up">
          {/* time + progress */}
          <div className="w-full max-w-sm">
            <p className="mb-2 font-mono text-lg tabular-nums text-ink-soft">
              {formatDuration(positionSec)}
              {duration ? <span className="text-ink-faint"> / {formatDuration(duration)}</span> : null}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-sage-400 transition-[width] duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* seek — host only, and only when the provider allows it */}
          {isHost && duration && duration > 0 && caps?.canSeek && (
            <input
              type="range"
              min={0}
              max={duration}
              step={1}
              value={Math.min(Math.round(positionSec), duration)}
              onChange={(e) => controls.seek(Number(e.target.value))}
              aria-label="Seek within the track"
              className="w-full max-w-sm accent-sage-500"
            />
          )}

          {/* transport */}
          {isHost ? (
            <button
              type="button"
              aria-label={state === 'playing' ? 'Pause' : 'Resume'}
              onClick={() => (state === 'playing' ? controls.pause() : controls.resume())}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-sage-600 text-cream shadow-lift transition-transform hover:bg-sage-700 active:scale-95"
            >
              {state === 'playing' ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" rx="1.5" />
                  <rect x="14" y="5" width="4" height="14" rx="1.5" />
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z" />
                </svg>
              )}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <BreathingOrb active={state === 'playing'} className="h-20 w-20" />
              <p className="font-display text-lg text-ink-soft">
                {state === 'playing' ? 'Meditating…' : 'Paused'}
              </p>
            </div>
          )}

          {isHost && (
            <Button variant="ghost" className="text-sm" onClick={() => controls.endSession()}>
              End session
            </Button>
          )}
        </div>
      )}

      {/* session closed, room still open */}
      {state === 'ended' && (
        <div className="flex animate-fade-up flex-col items-center gap-4">
          <BreathingOrb active={false} className="h-14 w-14" />
          {isHost ? (
            <Button variant="secondary" onClick={() => controls.start(track?.id)} disabled={!track}>
              Sit again
            </Button>
          ) : (
            <p className="text-ink-soft">Rest here as long as you like.</p>
          )}
        </div>
      )}

      {/* discreet host footer */}
      {isHost && (
        <footer className="mt-16 border-t border-sand/60 pt-6">
          <button
            type="button"
            onClick={() => controls.endRoom()}
            className="text-sm text-lotus-400 underline-offset-4 transition-colors hover:text-lotus-500 hover:underline"
          >
            End room for everyone
          </button>
        </footer>
      )}

      {/* sheets & overlays */}
      <ChooseTrackSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onChoose={(trackId) => controls.changeTrack(trackId)}
      />

      {ended && (
        <CompletionOverlay
          info={ended}
          dismissed={endedDismissed}
          onDismiss={() => setEndedDismissed(true)}
          onReturnHome={() => navigate('/')}
        />
      )}
    </Page>
  );
}
