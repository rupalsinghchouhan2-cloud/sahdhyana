import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  createIdentity,
  generateMeditatorName,
  loadIdentity,
  renameIdentity,
} from './identity';
import type { Meditator } from '@/types/domain';

interface IdentityContextValue {
  me: Meditator | null;
  suggestedName: string;
  chooseName(name: string): void;
  rename(name: string): void;
}

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Meditator | null>(() => loadIdentity());
  const [suggestedName] = useState(() => me?.name ?? generateMeditatorName());

  useEffect(() => {
    const stored = loadIdentity();
    if (stored && !me) setMe(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseName = (name: string) => {
    const identity = createIdentity(name || suggestedName);
    setMe(identity);
  };

  const rename = (name: string) => {
    const updated = renameIdentity(name);
    if (updated) setMe(updated);
  };

  return (
    <IdentityContext.Provider value={{ me, suggestedName, chooseName, rename }}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useIdentity must be used inside IdentityProvider');
  return ctx;
}
