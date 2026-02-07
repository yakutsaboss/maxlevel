import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from '@/pages/Dashboard';
import { Quests } from '@/pages/Quests';
import { Profile } from '@/pages/Profile';
import { Navigation } from '@/components/Navigation';
import { useTelegram } from '@/hooks/useTelegram';
import { useEffect } from 'react';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const { ready, expand } = useTelegram();

  useEffect(() => {
    // Initialize Telegram WebApp
    ready();
    expand();

    // Set viewport height for mobile
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);

    return () => window.removeEventListener('resize', setVH);
  }, [ready, expand]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/quests" element={<Quests />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
          <Navigation />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
