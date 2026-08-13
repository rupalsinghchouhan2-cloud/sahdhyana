import { registerProvider, type TrackProviderAdapter } from './registry';
import type { ResolvedTrack } from '@/types/domain';

export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (u.hostname.endsWith('youtube.com') || u.hostname.endsWith('youtube-nocookie.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const parts = u.pathname.split('/');
      const idx = parts.findIndex((p) => ['embed', 'shorts', 'live', 'v'].includes(p));
      if (idx >= 0) return parts[idx + 1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchOEmbedTitle(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as { title?: string; author_name?: string };
    return data.title ?? undefined;
  } catch {
    return undefined;
  }
}

export const youtubeProvider: TrackProviderAdapter = {
  id: 'youtube',
  matches: (url) => extractYouTubeId(url) !== null,
  async resolve(url): Promise<ResolvedTrack> {
    const embedId = extractYouTubeId(url);
    if (!embedId) {
      return { provider: 'youtube', sourceUrl: url, playable: false, reason: 'Could not read that YouTube link.' };
    }
    const title = await fetchOEmbedTitle(url);
    return {
      provider: 'youtube',
      sourceUrl: url,
      embedId,
      title: title ?? 'YouTube meditation',
      artworkUrl: `https://i.ytimg.com/vi/${embedId}/hqdefault.jpg`,
      playable: true,
    };
  },
  capabilities: () => ({
    canSeek: true,
    canReadPosition: true,
    supportsSync: true,
    syncNote:
      'YouTube playback syncs through the official player. Small drift is normal; the player re-aligns gently.',
  }),
};

registerProvider(youtubeProvider);
