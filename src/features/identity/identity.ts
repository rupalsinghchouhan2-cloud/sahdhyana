/**
 * Local, account-free meditator identity for V1.
 * A stable UUID + display name lives in localStorage. The shape leaves room for
 * a future accountId so V2 auth can adopt history without a schema rewrite.
 */
import { uuid } from '@/lib/utils/id';
import type { Meditator } from '@/types/domain';

const KEY = 'sahadhyana.identity.v1';

/**
 * Storage can be unavailable (sandboxed iframes, private-mode quotas).
 * Fall back to an in-memory identity so the app still works for the session.
 */
let memoryIdentity: Meditator | null = null;

function safeSet(value: string): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* storage blocked — identity lives in memory this session */
  }
}

function safeGet(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const ADJECTIVES = ['Quiet', 'Gentle', 'Wandering', 'Still', 'Open', 'Morning', 'River', 'Cloud', 'Moonlit', 'Patient'];
const NOUNS = ['Lotus', 'River', 'Mountain', 'Breeze', 'Flame', 'Leaf', 'Stone', 'Wave', 'Sky', 'Seed'];

export function generateMeditatorName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a} ${n}`;
}

export function loadIdentity(): Meditator | null {
  if (memoryIdentity) return memoryIdentity;
  try {
    const raw = safeGet();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.name) return null;
    memoryIdentity = parsed as Meditator;
    return memoryIdentity;
  } catch {
    return null;
  }
}

export function createIdentity(name?: string): Meditator {
  const identity: Meditator = {
    id: uuid(),
    name: (name ?? generateMeditatorName()).trim().slice(0, 40),
    createdAt: new Date().toISOString(),
    accountId: null,
  };
  memoryIdentity = identity;
  safeSet(JSON.stringify(identity));
  return identity;
}

export function renameIdentity(name: string): Meditator | null {
  const current = loadIdentity();
  if (!current) return null;
  const next = { ...current, name: name.trim().slice(0, 40) || current.name };
  memoryIdentity = next;
  safeSet(JSON.stringify(next));
  return next;
}
