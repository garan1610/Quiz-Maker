"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readLanguage, saveLanguage } from "@/lib/storage";
import { translate } from "@/lib/translations";

type Language = "en" | "vi";
type Translator = (text: string, values?: Record<string, string | number>) => string;
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void; t: Translator }>({ language: "en", setLanguage: () => {}, t: (text) => text });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>("en");
  useEffect(() => { Promise.resolve().then(() => updateLanguage(readLanguage())); }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const value = useMemo(() => ({ language, setLanguage: (next: Language) => { updateLanguage(next); try { saveLanguage(next); } catch { /* The switch still works if browser storage is disabled. */ } }, t: (text: string, values?: Record<string, string | number>) => translate(language, text, values) }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
