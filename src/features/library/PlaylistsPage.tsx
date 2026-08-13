/**
 * PlaylistsPage (/playlists) — flexible collections for different moods.
 * A soft grid of cards; each offers rename / let go through a small sheet.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, Input, Page, PageHeader, Sheet } from '@/components/ui/primitives';
import { CloudDrift } from '@/components/illustrations/zen';
import { useIdentity } from '@/features/identity/IdentityContext';
import {
  createPlaylist,
  deletePlaylist,
  listPlaylists,
  renamePlaylist,
} from './libraryService';
import type { Playlist, Track } from '@/types/domain';

type PlaylistWithTracks = Playlist & { tracks: Track[] };

function PlaylistArtwork({ tracks }: { tracks: Track[] }) {
  const art = tracks.map((t) => t.artworkUrl).filter(Boolean).slice(0, 4) as string[];
  if (art.length === 0) {
    return (
      <div className="flex h-24 w-full items-center justify-center rounded-2xl bg-sage-100" aria-hidden="true">
        <CloudDrift size={56} />
      </div>
    );
  }
  return (
    <div className="grid h-24 w-full grid-cols-2 gap-0.5 overflow-hidden rounded-2xl" aria-hidden="true">
      {art.map((url, i) => (
        <img key={i} src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ))}
    </div>
  );
}

export default function PlaylistsPage() {
  const { me } = useIdentity();
  const [playlists, setPlaylists] = useState<PlaylistWithTracks[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuFor, setMenuFor] = useState<PlaylistWithTracks | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!me) return;
    try {
      setPlaylists(await listPlaylists(me.id));
    } catch {
      setNote('Playlists could not be loaded just now.');
      setPlaylists([]);
    }
  }, [me]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openCreate = () => {
    setNewName('');
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const name = newName.trim();
    if (!me || !name || creating) return;
    setCreating(true);
    try {
      await createPlaylist(me.id, name);
      setCreateOpen(false);
      await reload();
    } catch {
      setNote('The playlist could not be created just now.');
    } finally {
      setCreating(false);
    }
  };

  const openMenu = (pl: PlaylistWithTracks) => {
    setMenuFor(pl);
    setRenaming(false);
    setConfirmingDelete(false);
    setRenameValue(pl.name);
  };

  const submitRename = async () => {
    const name = renameValue.trim();
    if (!menuFor || !name || busy) return;
    setBusy(true);
    try {
      await renamePlaylist(menuFor.id, name);
      setMenuFor(null);
      await reload();
    } catch {
      setNote('The playlist could not be renamed just now.');
    } finally {
      setBusy(false);
    }
  };

  const submitDelete = async () => {
    if (!menuFor || busy) return;
    setBusy(true);
    try {
      await deletePlaylist(menuFor.id);
      setMenuFor(null);
      await reload();
    } catch {
      setNote('The playlist could not be removed just now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Playlists"
        subtitle="Flexible collections for different moods."
        action={
          <Button className="mt-1 shrink-0 px-5 py-2.5 text-sm" onClick={openCreate}>
            New playlist
          </Button>
        }
      />

      {note && (
        <p className="mb-4 rounded-full bg-gold-100 px-4 py-2 text-sm text-ink-soft" role="alert">
          {note}
        </p>
      )}

      {playlists === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="card h-44 animate-breathe p-4" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <EmptyState
          illustration={<CloudDrift size={90} className="animate-floaty" />}
          title="No playlists yet"
          body="Gather a few tracks around a mood — morning stillness, deep focus, unwinding."
          action={<Button onClick={openCreate}>New playlist</Button>}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {playlists.map((pl) => (
            <li key={pl.id} className="card relative flex flex-col gap-3 p-4 animate-fade-up">
              <Link
                to={`/playlists/${pl.id}`}
                className="flex flex-col gap-3 rounded-2xl focus-visible:ring-2 focus-visible:ring-sage-400"
                aria-label={`Open playlist ${pl.name}`}
              >
                <PlaylistArtwork tracks={pl.tracks} />
                <div>
                  <p className="font-semibold text-ink">{pl.name}</p>
                  <p className="text-sm text-ink-faint">
                    {pl.tracks.length} {pl.tracks.length === 1 ? 'track' : 'tracks'}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                aria-label={`More options for ${pl.name}`}
                title="More options"
                onClick={() => openMenu(pl)}
                className="absolute right-3 top-3 rounded-full bg-cream/80 p-2 text-ink-faint transition-colors hover:bg-sand hover:text-ink"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="12" cy="19" r="1.8" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="New playlist">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="playlist-name" className="label">
              Name
            </label>
            <Input
              id="playlist-name"
              value={newName}
              autoFocus
              placeholder="Morning stillness…"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submitCreate();
                }
              }}
            />
          </div>
          <Button onClick={() => void submitCreate()} disabled={!newName.trim() || creating}>
            {creating ? 'Creating…' : 'Create playlist'}
          </Button>
        </div>
      </Sheet>

      <Sheet open={menuFor !== null} onClose={() => setMenuFor(null)} title={menuFor?.name}>
        {confirmingDelete ? (
          <div className="flex flex-col gap-4">
            <p className="text-ink-soft">
              Let “{menuFor?.name}” drift away? The tracks themselves stay in your library.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
                Keep it
              </Button>
              <Button variant="secondary" onClick={() => void submitDelete()} disabled={busy}>
                {busy ? 'Removing…' : 'Delete playlist'}
              </Button>
            </div>
          </div>
        ) : renaming ? (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="playlist-rename" className="label">
                Name
              </label>
              <Input
                id="playlist-rename"
                value={renameValue}
                autoFocus
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void submitRename();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRenaming(false)}>
                Back
              </Button>
              <Button onClick={() => void submitRename()} disabled={!renameValue.trim() || busy}>
                {busy ? 'Saving…' : 'Save name'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button variant="secondary" className="justify-start" onClick={() => setRenaming(true)}>
              Rename
            </Button>
            <Button variant="ghost" className="justify-start text-lotus-500" onClick={() => setConfirmingDelete(true)}>
              Delete playlist
            </Button>
          </div>
        )}
      </Sheet>
    </Page>
  );
}
