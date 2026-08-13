/**
 * roomSession — the room orchestrator.
 *
 * Responsibilities:
 *  - join a room and announce presence (Supabase Realtime Presence)
 *  - track participants, including host migration when the host leaves
 *  - subscribe to the authoritative session row and drive the local player
 *  - expose host controls (start/pause/resume/end) which write the session row
 *  - correct playback drift gently (rate-nudge) or hard (seek) when needed
 *  - handle late join + reconnect: the latest session row IS the state, so a
 *    (re)joining client simply reads it and aligns.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { requireSupabase } from '@/lib/supabase/client';
import { toRoom, toSession, toTrack } from '@/lib/supabase/mappers';
import { recordPeerTimestamp, resetClock, stampNow } from './clock';
import { evaluateDrift, expectedPosition } from './sessionSync';
import { DirectAudioController, YouTubeController, type PlaybackController } from './controllers';
import type {
  Meditator,
  Room,
  RoomParticipant,
  Session,
  Track,
} from '@/types/domain';
import { uuid } from '@/lib/utils/id';

export interface RoomSnapshot {
  room: Room;
  participants: RoomParticipant[];
  session: Session | null;
  track: Track | null;
  isHost: boolean;
  /** effective position the local player should be at */
  positionSec: number;
  connection: 'connecting' | 'live' | 'reconnecting' | 'lost';
}

export interface RoomCallbacks {
  onSnapshot(snap: RoomSnapshot): void;
  onSessionEnded(record: { durationSec: number; track: Track | null; companions: string[]; companionIds: string[] }): void;
  onRoomEnded(): void;
  onError(message: string): void;
}

const DRIFT_POLL_MS = 1500;
const PRESENCE_HEARTBEAT_MS = 20_000;

export class RoomSession {
  private me: Meditator;
  private roomIdOrCode: string;
  private cb: RoomCallbacks;

  private channel: RealtimeChannel | null = null;
  private room: Room | null = null;
  private session: Session | null = null;
  private track: Track | null = null;
  private participants: RoomParticipant[] = [];
  private controller: PlaybackController | null = null;
  private youtubeHostEl: HTMLElement | null = null;
  private driftTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private endedRecorded = false;
  private destroyed = false;

  constructor(me: Meditator, roomIdOrCode: string, cb: RoomCallbacks) {
    this.me = me;
    this.roomIdOrCode = roomIdOrCode;
    this.cb = cb;
  }

  /** Optional mount point for the YouTube iframe (hidden or small). */
  setYouTubeHost(el: HTMLElement | null): void {
    this.youtubeHostEl = el;
  }

  get isHost(): boolean {
    return this.room?.hostId === this.me.id;
  }

  async join(): Promise<void> {
    const supabase = requireSupabase();
    // 1. Resolve room by id or code
    const isUuid = /^[0-9a-f-]{36}$/i.test(this.roomIdOrCode);
    const query = supabase.from('rooms').select('*');
    const { data, error } = await (isUuid
      ? query.eq('id', this.roomIdOrCode)
      : query.eq('code', this.roomIdOrCode.toUpperCase())
    ).maybeSingle();

    if (error || !data) {
      this.cb.onError('This meditation room has ended.');
      return;
    }
    this.room = toRoom(data);
    if (this.room.status === 'ended') {
      this.cb.onRoomEnded();
      return;
    }

    // 2. Load current session row + track, if any
    await this.refreshSession();
    await this.refreshTrack();

    // 3. Record participation (durable, so late-join history survives reloads)
    await supabase.from('room_participants').upsert({
      room_id: this.room.id,
      meditator_id: this.me.id,
      name: this.me.name,
      is_host: this.room.hostId === this.me.id,
      joined_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    });

    // 4. Realtime channel: presence + postgres changes
    resetClock();
    this.channel = supabase.channel(`room:${this.room.id}`, {
      config: { presence: { key: this.me.id } },
    });

    this.channel
      .on('presence', { event: 'sync' }, () => this.handlePresenceSync())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `room_id=eq.${this.room.id}` },
        (payload) => this.handleSessionChange(payload),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${this.room.id}` },
        (payload) => this.handleRoomChange(payload),
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel?.track({
            name: this.me.name,
            isHost: this.isHost,
            localTime: Date.now(),
          });
          this.pushSnapshot('live');
          this.startHeartbeat();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.pushSnapshot('reconnecting');
        } else if (status === 'CLOSED') {
          if (!this.destroyed) this.pushSnapshot('lost');
        }
      });

    // 5. Prepare the player for the current track
    await this.prepareController();
    this.alignToSession(true);
    this.startDriftLoop();
  }

  // ------------------------------------------------------------ presence
  private handlePresenceSync(): void {
    if (!this.channel) return;
    const state = this.channel.presenceState() as Record<
      string,
      Array<{ name?: string; isHost?: boolean; localTime?: number }>
    >;
    const list: RoomParticipant[] = Object.entries(state).map(([id, metas]) => {
      const meta = metas[metas.length - 1] ?? {};
      if (typeof meta.localTime === 'number') {
        recordPeerTimestamp(meta.localTime, this.room?.hostId === id);
      }
      return {
        roomId: this.room!.id,
        meditatorId: id,
        name: meta.name ?? 'Meditator',
        isHost: this.room?.hostId === id,
        joinedAt: '',
        lastSeenAt: new Date().toISOString(),
      };
    });
    this.participants = list;

    // Host migration: if the host is gone, the earliest-joined participant
    // (stable ordering by meditator id as tiebreak) takes over peacefully.
    const hostPresent = list.some((p) => p.meditatorId === this.room?.hostId);
    if (!hostPresent && this.room && list.length > 0) {
      const successor = [...list].sort((a, b) => a.meditatorId.localeCompare(b.meditatorId))[0];
      if (successor.meditatorId === this.me.id) {
        void this.claimHost();
      }
    }
    this.pushSnapshot();
  }

  private async claimHost(): Promise<void> {
    if (!this.room) return;
    const supabase = requireSupabase();
    const { data } = await supabase
      .from('rooms')
      .update({ host_id: this.me.id, host_name: this.me.name })
      .eq('id', this.room.id)
      .eq('host_id', this.room.hostId) // optimistic: only if host unchanged
      .select()
      .maybeSingle();
    if (data) {
      this.room = toRoom(data);
      await this.channel?.track({ name: this.me.name, isHost: true, localTime: Date.now() });
      await supabase
        .from('room_participants')
        .update({ is_host: true })
        .eq('room_id', this.room.id)
        .eq('meditator_id', this.me.id);
    }
  }

  // ------------------------------------------------------------ db changes
  private async handleSessionChange(payload: any): Promise<void> {
    if (payload.eventType === 'DELETE') return;
    const incoming = toSession(payload.new);
    this.session = incoming;
    await this.refreshTrack();
    await this.prepareController();
    this.alignToSession(true);
    if (incoming.state === 'ended' && !this.endedRecorded) {
      await this.recordCompletion();
    }
    this.pushSnapshot();
  }

  private handleRoomChange(payload: any): void {
    if (payload.eventType === 'DELETE') {
      this.cb.onRoomEnded();
      return;
    }
    const updated = toRoom(payload.new);
    const wasHost = this.isHost;
    this.room = updated;
    if (updated.status === 'ended') {
      this.cb.onRoomEnded();
      return;
    }
    if (!wasHost && this.isHost) {
      void this.channel?.track({ name: this.me.name, isHost: true, localTime: Date.now() });
    }
    if (updated.trackId !== this.track?.id) void this.refreshTrack().then(() => this.prepareController());
    this.pushSnapshot();
  }

  private async refreshSession(): Promise<void> {
    if (!this.room) return;
    const supabase = requireSupabase();
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('room_id', this.room.id)
      .maybeSingle();
    this.session = data ? toSession(data) : null;
    if (this.session?.state === 'ended') this.endedRecorded = true;
  }

  private async refreshTrack(): Promise<void> {
    const trackId = this.session?.trackId ?? this.room?.trackId ?? null;
    if (!trackId) {
      this.track = null;
      return;
    }
    if (this.track?.id === trackId) return;
    const supabase = requireSupabase();
    const { data } = await supabase.from('tracks').select('*').eq('id', trackId).maybeSingle();
    this.track = data ? toTrack(data) : null;
  }

  // ------------------------------------------------------------ playback
  private async prepareController(): Promise<void> {
    const track = this.track;
    if (!track) return;
    const kind = track.provider === 'youtube' ? 'youtube' : 'direct';

    if (this.controller && this.currentKind === kind) {
      // same kind: load new media if the track changed
      if (this.loadedTrackId !== track.id) {
        await this.loadIntoController(track);
      }
      return;
    }
    this.controller?.destroy();
    this.controller =
      kind === 'youtube'
        ? new YouTubeController(this.youtubeHostEl ?? this.makeHiddenHost())
        : new DirectAudioController();
    this.currentKind = kind;
    this.controller.onEnded(() => {
      if (this.isHost) void this.endSession();
    });
    this.controller.onReady?.(() => this.alignToSession(true));
    await this.loadIntoController(track);
  }

  private currentKind: 'direct' | 'youtube' | null = null;
  private loadedTrackId: string | null = null;

  private async loadIntoController(track: Track): Promise<void> {
    if (!this.controller) return;
    const mediaRef = track.provider === 'youtube' ? this.extractVideoId(track) : track.audioUrl;
    if (!mediaRef) return;
    await this.controller.load(mediaRef);
    this.loadedTrackId = track.id;
  }

  private extractVideoId(track: Track): string | null {
    const m = track.sourceUrl.match(
      /(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{6,})/,
    );
    return m?.[1] ?? null;
  }

  private makeHiddenHost(): HTMLElement {
    const el = document.createElement('div');
    el.id = `yt-${uuid()}`;
    el.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0.02;pointer-events:none;bottom:0;right:0;';
    document.body.appendChild(el);
    return el;
  }

  /** Align local playback with the authoritative session state. */
  private alignToSession(force = false): void {
    if (!this.controller || !this.session) return;
    const s = this.session;
    if (s.state === 'playing') {
      const target = expectedPosition(s);
      const actual = this.controller.getPosition();
      if (force || Math.abs(target - actual) > 0.5) {
        this.controller.seekTo(target);
      }
      this.controller.setRate(1);
      this.controller.play();
    } else if (s.state === 'paused') {
      this.controller.pause();
      const target = s.positionSec;
      if (force || Math.abs(this.controller.getPosition() - target) > 0.5) {
        this.controller.seekTo(target);
      }
    } else if (s.state === 'idle' || s.state === 'ended') {
      this.controller.pause();
    }
  }

  private startDriftLoop(): void {
    this.stopDriftLoop();
    this.driftTimer = window.setInterval(() => {
      if (!this.controller || !this.session || this.session.state !== 'playing') return;
      const decision = evaluateDrift(this.session, this.controller.getPosition());
      if (decision.shouldCorrect) {
        this.controller.seekTo(decision.target);
        this.controller.setRate(1);
      } else {
        this.controller.setRate(decision.rate);
      }
    }, DRIFT_POLL_MS);
  }

  private stopDriftLoop(): void {
    if (this.driftTimer !== null) {
      clearInterval(this.driftTimer);
      this.driftTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.room) return;
      const supabase = requireSupabase();
      void supabase
        .from('room_participants')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('room_id', this.room.id)
        .eq('meditator_id', this.me.id)
        .then(() => undefined);
      void this.channel?.track({ name: this.me.name, isHost: this.isHost, localTime: Date.now() });
    }, PRESENCE_HEARTBEAT_MS);
  }

  // ------------------------------------------------------------ host controls
  private async writeSession(patch: Partial<Session> & { state: Session['state'] }): Promise<void> {
    if (!this.room || !this.isHost) return;
    const supabase = requireSupabase();
    const row: Record<string, unknown> = {
      room_id: this.room.id,
      state: patch.state,
      position_sec: patch.positionSec ?? this.controller?.getPosition() ?? 0,
      updated_at_server: Math.round(stampNow()),
      updated_by: this.me.id,
    };
    if (patch.id) row.id = patch.id;
    if (patch.trackId !== undefined) row.track_id = patch.trackId;
    if (patch.sourceKind !== undefined) row.source_kind = patch.sourceKind;
    if (patch.sourceId !== undefined) row.source_id = patch.sourceId;
    if (patch.sourcePosition !== undefined) row.source_position = patch.sourcePosition;

    const { data } = await supabase
      .from('sessions')
      .upsert(row, { onConflict: 'room_id' })
      .select()
      .maybeSingle();
    if (data) this.session = toSession(data);
  }

  async startSession(trackId?: string): Promise<void> {
    const id = trackId ?? this.room?.trackId ?? this.session?.trackId ?? undefined;
    if (!id) return;
    this.endedRecorded = false;
    await this.writeSession({
      id: uuid(),
      state: 'playing',
      positionSec: 0,
      trackId: id,
    });
    await requireSupabase().from('rooms').update({ status: 'live', track_id: id }).eq('id', this.room!.id);
    this.alignToSession(true);
  }

  async pauseSession(): Promise<void> {
    await this.writeSession({ state: 'paused', positionSec: this.controller?.getPosition() ?? 0 });
    this.controller?.pause();
  }

  async resumeSession(): Promise<void> {
    await this.writeSession({ state: 'playing', positionSec: this.controller?.getPosition() ?? 0 });
    this.controller?.play();
  }

  async seekSession(seconds: number): Promise<void> {
    await this.writeSession({
      state: this.session?.state === 'playing' ? 'playing' : 'paused',
      positionSec: seconds,
    });
    this.controller?.seekTo(seconds);
  }

  async changeTrack(trackId: string): Promise<void> {
    await requireSupabase().from('rooms').update({ track_id: trackId }).eq('id', this.room!.id);
    if (this.session && this.session.state !== 'idle') {
      await this.writeSession({ id: uuid(), state: 'paused', positionSec: 0, trackId });
    } else {
      await this.writeSession({ id: uuid(), state: 'idle', positionSec: 0, trackId });
    }
  }

  async endSession(): Promise<void> {
    const duration = this.controller?.getPosition() ?? this.session?.positionSec ?? 0;
    await this.writeSession({ state: 'ended', positionSec: duration });
  }

  private async recordCompletion(): Promise<void> {
    if (this.endedRecorded) return;
    this.endedRecorded = true;
    const companions = this.participants
      .filter((p) => p.meditatorId !== this.me.id)
      .map((p) => p.name);
    const companionIds = this.participants
      .filter((p) => p.meditatorId !== this.me.id)
      .map((p) => p.meditatorId);
    const durationSec = Math.round(this.session?.positionSec ?? this.controller?.getPosition() ?? 0);
    if (durationSec < 5) return; // ignore accidental instant-ends

    const supabase = requireSupabase();
    await supabase.from('meditation_records').insert({
      meditator_id: this.me.id,
      room_id: this.room?.id ?? null,
      room_name: this.room?.name ?? null,
      track_id: this.track?.id ?? null,
      track_title: this.track?.title ?? null,
      teacher: this.track?.teacher ?? null,
      duration_sec: durationSec,
      companions,
      companion_ids: companionIds,
    });
    this.cb.onSessionEnded({
      durationSec,
      track: this.track,
      companions,
      companionIds,
    });
  }

  /** Record a series/playlist track completion for progress tracking. */
  async markSeriesProgress(seriesId: string, nextPosition: number, completedCount: number): Promise<void> {
    const supabase = requireSupabase();
    await supabase.from('series_progress').upsert({
      series_id: seriesId,
      meditator_id: this.me.id,
      next_position: nextPosition,
      completed_count: completedCount,
      updated_at: new Date().toISOString(),
    });
  }

  async endRoom(): Promise<void> {
    if (!this.room || !this.isHost) return;
    await requireSupabase()
      .from('rooms')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', this.room.id);
  }

  // ------------------------------------------------------------ snapshot
  private pushSnapshot(connection?: RoomSnapshot['connection']): void {
    if (!this.room) return;
    this.cb.onSnapshot({
      room: this.room,
      participants: this.participants,
      session: this.session,
      track: this.track,
      isHost: this.isHost,
      positionSec: this.session ? expectedPosition(this.session) : 0,
      connection: connection ?? 'live',
    });
  }

  async leave(): Promise<void> {
    this.destroyed = true;
    this.stopDriftLoop();
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.controller?.destroy();
    this.controller = null;
    const supabase = requireSupabase();
    if (this.room) {
      await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', this.room.id)
        .eq('meditator_id', this.me.id);
    }
    if (this.channel) {
      await this.channel.untrack();
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
    resetClock();
  }
}
