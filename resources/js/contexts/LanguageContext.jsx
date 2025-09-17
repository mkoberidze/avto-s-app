import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState('ka');

    useEffect(() => {
        try {
            const stored = localStorage.getItem('lang');
            if (stored === 'ka' || stored === 'en') setLang(stored);
        } catch {}
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('lang', lang);
        } catch {}
    }, [lang]);

    const value = useMemo(() => ({ lang, setLang, toggleLang: () => setLang((p) => (p === 'ka' ? 'en' : 'ka')) }), [lang]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
    return ctx;
}


