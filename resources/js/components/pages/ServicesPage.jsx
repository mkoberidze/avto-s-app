import React, { useEffect, useState } from 'react';
import { useI18n } from '../../contexts/i18n.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import axios from 'axios';

export default function ServicesPage() {
    const t = useI18n();
    const { lang } = useLanguage();
    const [content, setContent] = useState(null);

    useEffect(() => {
        axios.get('/api/pages/services').then(res => setContent(res.data)).catch(()=>{});
    }, []);

    const title = (lang === 'ka' ? content?.title_ka : content?.title_en) || t('services.title');
    const body = (lang === 'ka' ? content?.body_ka : content?.body_en) || t('services.body');
    const sections = Array.isArray(content?.sections) ? content.sections : [];

    return (
        <main className="pt-24 sm:pt-28">
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-semibold text-[#111827] mb-4">{title}</h1>
                <div className="rounded-lg border border-black/10 bg-white p-6">
                    <p className="text-[#6b7280] whitespace-pre-line">{body}</p>
                    {sections.length > 0 && (
                        <div className="mt-6 space-y-4">
                            {sections.map((s, i) => (
                                <div key={i}>
                                    {(lang==='ka'?s.title_ka:s.title_en) && (<h2 className="text-lg font-medium text-[#111827]">{lang==='ka'?s.title_ka:s.title_en}</h2>)}
                                    {(lang==='ka'?s.body_ka:s.body_en) && (<p className="mt-1 text-[#6b7280] whitespace-pre-line">{lang==='ka'?s.body_ka:s.body_en}</p>)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}


