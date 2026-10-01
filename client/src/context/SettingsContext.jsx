import { createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { communityApi } from '../api/endpoints.js';

const DEFAULTS = {
  platformName: 'SRKians',
  tagline: 'Find Your City. Find Your Fan Club. Find Your SRKian Family.',
  description: 'A dedicated city-based network for SRKians.',
  hero: {
    headline: 'ONE KING.\nONE FAMILY.\nMILLIONS OF SRKIANS.',
    subheading: 'Find SRKians in your city, discover fan clubs, connect with admins and join unforgettable fan events.',
    primaryCta: 'FIND YOUR CITY',
    secondaryCta: 'JOIN THE COMMUNITY',
  },
  social: {},
  disclaimer:
    'This is an independent fan community platform and is not officially affiliated with Shah Rukh Khan, Red Chillies Entertainment, or any official organization.',
  seo: { titleTemplate: '%s | SRKians' },
  defaultImages: {},
};

const SettingsContext = createContext(DEFAULTS);

/** Branding is database-driven (SiteSetting) — components read it from here, never hardcode it. */
export function SettingsProvider({ children }) {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: communityApi.settings, staleTime: 5 * 60 * 1000 });
  const settings = { ...DEFAULTS, ...(data?.settings || {}), hero: { ...DEFAULTS.hero, ...(data?.settings?.hero || {}) } };

  useEffect(() => {
    const href = settings.favicon?.url;
    if (href) {
      const el = document.getElementById('app-favicon');
      if (el) el.setAttribute('href', href);
    }
  }, [settings.favicon?.url]);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
