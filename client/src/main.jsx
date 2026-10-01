import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './context/AuthContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import { registerServiceWorker } from './services/pwa.js';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      retry: (count, err) => {
        const s = err?.response?.status;
        if (s && s >= 400 && s < 500) return false;
        return count < 2;
      },
    },
  },
});

registerServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <AuthProvider>
              <SettingsProvider>
                <AppRoutes />
              </SettingsProvider>
            </AuthProvider>
          </ToastProvider>
        </MotionConfig>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
