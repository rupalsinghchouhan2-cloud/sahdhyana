/**
 * useRoomSession — React binding over the RoomSession orchestrator.
 * Screens subscribe to snapshots; controls are no-ops for non-hosts.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { RoomSession, type RoomSnapshot } from '@/lib/sync/roomSession';
import { useIdentity } from '@/features/identity/IdentityContext';
import { sounds } from '@/lib/sounds/soundEngine';
import { useSettings } from '@/lib/storage/settingsStore';
import type { Track } from '@/types/domain';

export interface SessionEndedInfo {
  durationSec: number;
  track: Track | null;
  companions: string[];
  companionIds: string[];
}

export function useRoomSession(roomIdOrCode: string | undefined) {
  const { me } = useIdentity();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [ended, setEnded] = useState<SessionEndedInfo | null>(null);
  const [roomGone, setRoomGone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<RoomSession | null>(null);
  const completionSound = useSettings((s) => s.completionSoundEnabled);

  useEffect(() => {
    if (!me || !roomIdOrCode) return;
    const session = new RoomSession(me, roomIdOrCode, {
      onSnapshot: (snap) => {
        setSnapshot(snap);
        if (snap.session?.state === 'paused') setEnded(null);
        if (snap.session?.state === 'playing') setEnded(null);
      },
      onSessionEnded: (info) => {
        setEnded(info);
        if (completionSound) sounds.bowl();
      },
      onRoomEnded: () => setRoomGone(true),
      onError: (message) => setError(message),
    });
    sessionRef.current = session;
    void session.join();
    return () => {
      void session.leave();
      sessionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, roomIdOrCode]);

  const controls = {
    start: useCallback((trackId?: string) => sessionRef.current?.startSession(trackId), []),
    pause: useCallback(() => sessionRef.current?.pauseSession(), []),
    resume: useCallback(() => sessionRef.current?.resumeSession(), []),
    seek: useCallback((sec: number) => sessionRef.current?.seekSession(sec), []),
    changeTrack: useCallback((trackId: string) => sessionRef.current?.changeTrack(trackId), []),
    endSession: useCallback(() => sessionRef.current?.endSession(), []),
    endRoom: useCallback(() => sessionRef.current?.endRoom(), []),
    setYouTubeHost: useCallback(
      (el: HTMLElement | null) => sessionRef.current?.setYouTubeHost(el),
      [],
    ),
  };

  return { snapshot, ended, roomGone, error, controls, isHost: snapshot?.isHost ?? false };
}
