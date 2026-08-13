import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { IdentityProvider, useIdentity } from '@/features/identity/IdentityContext';
import { unlockSounds } from '@/lib/sounds/soundEngine';
import { startReminderLoop } from '@/features/practice/reminders';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { Nav } from './Nav';
import { WelcomeGate } from '@/features/identity/WelcomeGate';

import HomePage from '@/features/home/HomePage';
import CreateRoomPage from '@/features/rooms/CreateRoomPage';
import JoinRoomPage from '@/features/rooms/JoinRoomPage';
import RoomPage from '@/features/rooms/RoomPage';
import LibraryPage from '@/features/library/LibraryPage';
import PlaylistsPage from '@/features/library/PlaylistsPage';
import PlaylistDetailPage from '@/features/library/PlaylistDetailPage';
import SeriesListPage from '@/features/library/SeriesListPage';
import SeriesDetailPage from '@/features/library/SeriesDetailPage';
import HistoryPage from '@/features/practice/HistoryPage';
import StatsPage from '@/features/practice/StatsPage';
import SettingsPage from '@/features/practice/SettingsPage';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/meditate" element={<CreateRoomPage />} />
        <Route path="/join" element={<JoinRoomPage />} />
        <Route path="/join/:code" element={<JoinRoomPage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/playlists" element={<PlaylistsPage />} />
        <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
        <Route path="/series" element={<SeriesListPage />} />
        <Route path="/series/:id" element={<SeriesDetailPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function MissingBackend() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="heading-display text-3xl">Almost there</h1>
      <p className="text-ink-soft">
        Sahadhyāna needs its Supabase connection. Set{' '}
        <code className="rounded bg-sand/70 px-1.5 py-0.5 text-sm">VITE_SUPABASE_URL</code> and{' '}
        <code className="rounded bg-sand/70 px-1.5 py-0.5 text-sm">VITE_SUPABASE_PUBLISHABLE_KEY</code>{' '}
        in your environment, then restart.
      </p>
    </div>
  );
}

function Shell() {
  const { me } = useIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    const unlock = () => unlockSounds();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    startReminderLoop();
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Deep link: /join/ABC123 lands on the join flow pre-filled.
  useEffect(() => {
    if (window.location.hash.startsWith('#/room/')) return; // room page handles itself
  }, [navigate]);

  if (!me) return <WelcomeGate />;

  return (
    <div className="min-h-dvh">
      <AnimatedRoutes />
      <Nav />
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <MissingBackend />;
  return (
    <IdentityProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </IdentityProvider>
  );
}
