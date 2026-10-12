import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'sentra_language';
const LEGACY_KEY = 'lang';
const ALLOWED = ['ka', 'en', 'ru'];

function readStoredLanguage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (ALLOWED.includes(stored)) {
            return stored;
        }
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy === 'ka' || legacy === 'en') {
            localStorage.setItem(STORAGE_KEY, legacy);
            return legacy;
        }
    } catch {}
    return 'ka';
}

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState('ka');

    useEffect(() => {
        setLangState(readStoredLanguage());
    }, []);

    const setLang = (next) => {
        if (!ALLOWED.includes(next)) {
            return;
        }
        setLangState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {}
    };

    const value = useMemo(
        () => ({
            lang,
            setLang,
            toggleLang: () => setLang(lang === 'ka' ? 'en' : 'ka'),
        }),
        [lang]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
    return ctx;
}
