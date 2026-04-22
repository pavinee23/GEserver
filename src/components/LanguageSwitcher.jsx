'use client';

import { useLocale } from '@/lib/LocaleContext';
import { getT } from '@/lib/k-translations';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import CountryFlag from './CountryFlag';

export default function LanguageSwitcher({ allowedCodes, showBruneiAlias = false }) {
  const { locale, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const t = getT(locale);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allLanguages = [
    { code: 'ko', name: t.korean || '한국어', flag: 'KR' },
    { code: 'en', name: t.english || 'English', flag: 'GB' },
    { code: 'cn', name: t.chinese || '中文', flag: 'CN' },
    { code: 'ms', name: t.malay || 'Bahasa Melayu', flag: 'MY' },
    { code: 'th', name: t.thai || 'ไทย', flag: 'TH' },
    { code: 'vn', name: t.vietnamese || 'Tiếng Việt', flag: 'VN' },
  ];

  const bruneiAlias = { code: 'ms', name: t.brunei || 'Brunei', flag: 'BN' };

  const filteredLanguages = allowedCodes && allowedCodes.length > 0
    ? allLanguages.filter(lang => allowedCodes.includes(lang.code))
    : allLanguages;

  const languages = showBruneiAlias ? [...filteredLanguages, bruneiAlias] : filteredLanguages;

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-100 rounded-lg transition-colors min-w-[15rem]"
        aria-label={t.selectLanguage || 'Change language'}
      >
        <Globe className="w-5 h-5 text-gray-600" />
        <CountryFlag country={currentLanguage.flag} size="sm" />
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
          {currentLanguage.name}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[18rem] bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-[130] overflow-visible">
          <div className="grid grid-cols-2 gap-1.5">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => {
                  try {
                    setLocale(language.code);
                    try { localStorage.setItem('k_system_lang', language.code); } catch (_) {}
                    try { localStorage.setItem('locale', language.code); } catch (_) {}
                    try {
                      window.dispatchEvent(new CustomEvent('k-system-lang', { detail: language.code }));
                      window.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale: language.code } }));
                    } catch (_) {}
                  } catch (e) {}
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors ${
                  locale === language.code ? 'bg-orange-50 ring-1 ring-orange-200 text-orange-700 font-medium' : 'text-gray-700'
                }`}
              >
                <CountryFlag country={language.flag} size="sm" />
                <span className="whitespace-nowrap">{language.name}</span>
                {locale === language.code && (
                  <span className="ml-auto text-orange-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
