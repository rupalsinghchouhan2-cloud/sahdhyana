import type { ProviderCapabilities, ResolvedTrack, TrackProvider } from '@/types/domain';

export interface TrackProviderAdapter {
  id: TrackProvider;
  matches(url: string): boolean;
  resolve(url: string): Promise<ResolvedTrack>;
  capabilities(): ProviderCapabilities;
}

const adapters: TrackProviderAdapter[] = [];

export function registerProvider(adapter: TrackProviderAdapter): void {
  adapters.push(adapter);
}

export function detectProvider(url: string): TrackProviderAdapter | null {
  return adapters.find((a) => a.matches(url)) ?? null;
}

export async function resolveUrl(url: string): Promise<ResolvedTrack> {
  const adapter = detectProvider(url);
  if (!adapter) {
    return {
      provider: 'unknown',
      sourceUrl: url,
      playable: false,
      reason: 'This source is not supported yet. Try a direct audio link or a YouTube URL.',
    };
  }
  return adapter.resolve(url);
}

export function capabilitiesFor(provider: TrackProvider): ProviderCapabilities {
  const adapter = adapters.find((a) => a.id === provider);
  return (
    adapter?.capabilities() ?? {
      canSeek: false,
      canReadPosition: false,
      supportsSync: false,
      syncNote: 'Unknown source — playback may not stay in sync.',
    }
  );
}
