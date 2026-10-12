import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { ToastProvider } from './contexts/ToastContext.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { AnalyticsConsentBanner } from './components/AnalyticsConsentBanner.tsx';
import { initAnalytics } from './lib/analytics.ts';

// Must run before AuthProvider restores a saved session so identify() has an initialized SDK.
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <ThemeProvider>
          <App />
          <AnalyticsConsentBanner />
        </ThemeProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
);
