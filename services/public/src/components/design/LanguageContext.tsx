import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { t } from "../../i18n";
import type { Language, StringKey } from "../../i18n";

const STORAGE_KEY = "samala-language";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "ny",
  setLanguage: () => undefined,
  toggle: () => undefined,
});

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ny") return stored;
    return "ny"; // public site reads Chichewa first
  } catch {
    return "ny";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setLanguageState((prev) => {
      const next: Language = prev === "en" ? "ny" : "en";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, toggle }),
    [language, setLanguage, toggle]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** The one translation seam: components call `const t = useT()` and translate
 * by key alone — language comes from context, never props. */
export function useT() {
  const { language } = useLanguage();
  return useCallback((key: StringKey) => t(key, language), [language]);
}