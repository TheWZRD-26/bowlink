import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LANGUAGES, translate } from "../lib/translations";

const I18nContext = createContext(null);

const STORAGE_KEY = "bowlink_lang";

function detectInitial() {
  const saved = typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY);
  if (saved && LANGUAGES.find((l) => l.code === saved)) return saved;
  const nav = typeof navigator !== "undefined" && navigator.language;
  if (nav) {
    const short = nav.split("-")[0];
    if (LANGUAGES.find((l) => l.code === short)) return short;
  }
  return "fr";
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectInitial);

  const setLang = (code) => {
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  };

  const dir = useMemo(() => LANGUAGES.find((l) => l.code === lang)?.dir || "ltr", [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const t = useMemo(() => (path) => translate(lang, path), [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
