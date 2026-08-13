/**
 * Room lifecycle: create, look up by code, list recent rooms.
 * Joining/live logic lives in lib/sync/roomSession.ts.
 */
import { requireSupabase } from '@/lib/supabase/client';
import { toRoom } from '@/lib/supabase/mappers';
import { roomCode } from '@/lib/utils/id';
import type { Meditator, Room } from '@/types/domain';

export async function createRoom(input: {
  me: Meditator;
  name: string;
  description?: string;
  trackId?: string | null;
}): Promise<Room> {
  const supabase = requireSupabase();
  // Retry a couple of times in the rare case of a code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        code: roomCode(6),
        name: input.name.trim(),
        description: input.description?.trim() || null,
        host_id: input.me.id,
        host_name: input.me.name,
        track_id: input.trackId ?? null,
      })
      .select()
      .single();
    if (!error && data) return toRoom(data);
    if (error && error.code !== '23505') throw error; // 23505 = unique violation → retry
  }
  throw new Error('Could not create the room. Please try again.');
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const { data } = await requireSupabase()
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .maybeSingle();
  return data ? toRoom(data) : null;
}

export async function getRoom(id: string): Promise<Room | null> {
  const { data } = await requireSupabase()
    .from('rooms')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toRoom(data) : null;
}
