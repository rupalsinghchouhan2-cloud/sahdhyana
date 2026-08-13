import { registerProvider, type TrackProviderAdapter } from './registry';
import type { ResolvedTrack } from '@/types/domain';

/**
 * OshoWorld discourse pages publicly embed an HTML5 audio element whose MP3 URL
 * follows the site's CDN convention. Where that convention is not exposed we
 * degrade gracefully rather than scrape against the site's wishes.
 */
export const oshoworldProvider: TrackProviderAdapter = {
  id: 'oshoworld',
  matches: (url) => {
    try {
      return new URL(url).hostname.endsWith('oshoworld.com');
    } catch {
      return false;
    }
  },
  async resolve(url): Promise<ResolvedTrack> {
    try {
      const slug = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
      const pretty = slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      // Public CDN pattern used by oshoworld discourse audio.
      const audioUrl = `https://oshoworld.com/wp-content/uploads/audio/${slug}.mp3`;
      const head = await fetch(audioUrl, { method: 'HEAD' }).catch(() => null);
      if (head && head.ok) {
        return {
          provider: 'oshoworld',
          sourceUrl: url,
          audioUrl,
          title: pretty || 'Osho Discourse',
          teacher: 'Osho',
          playable: true,
        };
      }
      return {
        provider: 'oshoworld',
        sourceUrl: url,
        title: pretty || 'Osho Discourse',
        teacher: 'Osho',
        playable: false,
        reason:
          "This discourse page doesn't expose a playable audio stream. If you have the direct MP3 link, paste that instead.",
      };
    } catch {
      return {
        provider: 'oshoworld',
        sourceUrl: url,
        playable: false,
        reason: "This source can't be played here.",
      };
    }
  },
  capabilities: () => ({
    canSeek: true,
    canReadPosition: true,
    supportsSync: true,
  }),
};

registerProvider(oshoworldProvider);
