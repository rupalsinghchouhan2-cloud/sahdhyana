/**
 * AddTrackSheet — the gentle "paste a link" flow shared by Library and Series.
 * Paste a URL → resolve → preview (editable title/teacher) → save.
 */
import { useEffect, useState } from 'react';
import { Button, Input, Sheet } from '@/components/ui/primitives';
import { resolveUrl } from '@/lib/providers/registry';
import { saveTrack } from './libraryService';
import { useIdentity } from '@/features/identity/IdentityContext';
import type { ResolvedTrack, Track, TrackProvider } from '@/types/domain';

const PROVIDER_BADGE: Record<TrackProvider, { label: string; cls: string }> = {
  direct: { label: 'Direct', cls: 'bg-sage-100 text-sage-700' },
  youtube: { label: 'YouTube', cls: 'bg-lotus-100 text-lotus-500' },
  oshoworld: { label: 'OshoWorld', cls: 'bg-powder-100 text-powder-500' },
  unknown: { label: 'Other', cls: 'bg-sand text-ink-soft' },
};

export function ProviderPill({ provider }: { provider: TrackProvider }) {
  const badge = PROVIDER_BADGE[provider] ?? PROVIDER_BADGE.unknown;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
      {badge.label}
    </span>
  );
}

export function AddTrackSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose(): void;
  onSaved(track: Track): void;
}) {
  const { me } = useIdentity();
  const [url, setUrl] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedTrack | null>(null);
  const [title, setTitle] = useState('');
  const [teacher, setTeacher] = useState('');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Reset everything each time the sheet is reopened.
  useEffect(() => {
    if (open) {
      setUrl('');
      setResolving(false);
      setResolved(null);
      setTitle('');
      setTeacher('');
      setSaving(false);
      setNote(null);
    }
  }, [open]);

  const resolve = async () => {
    const trimmed = url.trim();
    if (!trimmed || resolving) return;
    setResolving(true);
    setNote(null);
    setResolved(null);
    try {
      const r = await resolveUrl(trimmed);
      setResolved(r);
      setTitle(r.title ?? '');
      setTeacher(r.teacher ?? '');
      if (!r.playable && r.reason) setNote(r.reason);
    } catch {
      setNote('We could not read that link just now. Please try again.');
    } finally {
      setResolving(false);
    }
  };

  const save = async () => {
    if (!me || !resolved || !resolved.playable || saving) return;
    const finalTitle = title.trim();
    if (!finalTitle) {
      setNote('Give the track a name so you can find it later.');
      return;
    }
    setSaving(true);
    setNote(null);
    try {
      const track = await saveTrack({
        ownerId: me.id,
        title: finalTitle,
        teacher: teacher.trim() || null,
        sourceUrl: resolved.sourceUrl,
        provider: resolved.provider,
        audioUrl: resolved.audioUrl ?? null,
        artworkUrl: resolved.artworkUrl ?? null,
        durationSec: resolved.durationSec ?? null,
      });
      onSaved(track);
      onClose();
    } catch {
      setNote('The track could not be saved just now. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add a track">
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="track-url" className="label">
            Paste a meditation URL
          </label>
          <div className="flex gap-2">
            <Input
              id="track-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void resolve();
                }
              }}
            />
            <Button variant="secondary" onClick={() => void resolve()} disabled={!url.trim() || resolving}>
              {resolving ? 'Listening…' : 'Look'}
            </Button>
          </div>
        </div>

        {resolving && (
          <div className="flex items-center gap-3 rounded-2xl bg-sand/40 px-4 py-3 text-ink-soft" role="status">
            <span className="h-3 w-3 animate-breathe rounded-full bg-sage-300" aria-hidden="true" />
            Holding the link up to the light…
          </div>
        )}

        {resolved && (
          <div className="card flex flex-col gap-4 p-4 animate-fade-up">
            <div className="flex items-center gap-3">
              {resolved.artworkUrl ? (
                <img
                  src={resolved.artworkUrl}
                  alt=""
                  className="h-14 w-14 rounded-2xl object-cover"
                />
              ) : (
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-100 font-display text-xl text-sage-600"
                  aria-hidden="true"
                >
                  {(title || resolved.title || '♪').trim().charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <ProviderPill provider={resolved.provider} />
                <p className="mt-1 truncate text-sm text-ink-faint">{resolved.sourceUrl}</p>
              </div>
            </div>

            {!resolved.playable && (
              <p className="rounded-full bg-gold-100 px-3 py-1.5 text-sm text-ink-soft" role="alert">
                {resolved.reason ?? 'This source cannot be played in the room.'}
              </p>
            )}

            <div>
              <label htmlFor="track-title" className="label">
                Title
              </label>
              <Input
                id="track-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A name for this meditation"
              />
            </div>
            <div>
              <label htmlFor="track-teacher" className="label">
                Teacher <span className="font-normal text-ink-faint">(optional)</span>
              </label>
              <Input
                id="track-teacher"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="Who is guiding?"
              />
            </div>

            <Button onClick={() => void save()} disabled={!resolved.playable || saving || !title.trim()}>
              {saving ? 'Adding…' : 'Add to library'}
            </Button>
          </div>
        )}

        {note && (
          <p className="rounded-full bg-gold-100 px-3 py-1.5 text-sm text-ink-soft" role="alert">
            {note}
          </p>
        )}
      </div>
    </Sheet>
  );
}
