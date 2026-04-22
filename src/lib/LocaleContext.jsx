'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, getT } from '@/lib/k-translations';

const LocaleContext = createContext(undefined);

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState('ko');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const validLocales = ['ko', 'en', 'th', 'cn', 'vn', 'ms'];

    const savedLocale = localStorage.getItem('locale');
    if (savedLocale && validLocales.includes(savedLocale)) {
      setLocaleState(savedLocale);
    }
    setMounted(true);

    const handleLocaleChanged = (e) => {
      const detail = e.detail;
      const incoming = detail?.locale;
      if (incoming && validLocales.includes(incoming)) {
        setLocaleState(incoming);
      }
    };
    window.addEventListener('locale-changed', handleLocaleChanged);
    return () => window.removeEventListener('locale-changed', handleLocaleChanged);
  }, []);

  const setLocale = (newLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const t = (key) => {
    const activeLocale = mounted ? locale : 'ko';
    const merged = getT(activeLocale);
    const val = merged[key];
    return typeof val === 'string' ? val : key;
  };

  const tObj = getT(mounted ? locale : 'ko');

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, tObj }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  return context ?? {
    locale: 'en',
    setLocale: () => {},
    t: (key) => key,
    tObj: translations['en'],
  };
}
