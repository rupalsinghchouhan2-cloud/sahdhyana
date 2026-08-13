import { registerProvider, type TrackProviderAdapter } from './registry';
import type { ResolvedTrack } from '@/types/domain';

const AUDIO_EXT = /\.(mp3|m4a|ogg|oga|aac|wav|flac|opus)(\?.*)?$/i;

function filenameToTitle(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = decodeURIComponent(path.split('/').filter(Boolean).pop() ?? 'Meditation');
    return last.replace(AUDIO_EXT, '').replace(/[-_]+/g, ' ').trim() || 'Meditation';
  } catch {
    return 'Meditation';
  }
}

export const directProvider: TrackProviderAdapter = {
  id: 'direct',
  matches: (url) => AUDIO_EXT.test(url),
  async resolve(url): Promise<ResolvedTrack> {
    return {
      provider: 'direct',
      sourceUrl: url,
      audioUrl: url,
      title: filenameToTitle(url),
      playable: true,
    };
  },
  capabilities: () => ({
    canSeek: true,
    canReadPosition: true,
    supportsSync: true,
  }),
};

registerProvider(directProvider);
