import React, { useEffect, useState } from 'react';
import { useI18n } from '../../contexts/i18n.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import axios from 'axios';

export default function AboutPage() {
    const t = useI18n();
    const { lang } = useLanguage();
    const [content, setContent] = useState(null);

    useEffect(() => {
        axios.get('/api/pages/about').then(res => setContent(res.data)).catch(()=>{});
    }, []);

    const title = (lang === 'ka' ? content?.title_ka : content?.title_en) || t('about.title');
    const subtitle = (lang === 'ka' ? content?.subtitle_ka : content?.subtitle_en) || '';
    const body = (lang === 'ka' ? content?.body_ka : content?.body_en) || t('about.body');
    const sections = Array.isArray(content?.sections) ? content.sections : [];

    return (
        <main className="min-h-screen">
            {/* Hero Section with Blue Background */}
            <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)'
                    }}></div>
                </div>
                
                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{title}</h1>
                    {subtitle && (
                        <p className="text-xl text-blue-100 mb-6 max-w-2xl">{subtitle}</p>
                    )}
                    <div className="prose prose-invert max-w-2xl text-blue-50">
                        <div dangerouslySetInnerHTML={{ __html: body }} />
                    </div>
                </div>
            </section>

            {/* Sections Section */}
            {sections.length > 0 && (
                <section className="py-16 bg-gray-50">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="space-y-6">
                            {sections.map((s, i) => (
                                <div key={i} className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow duration-300">
                                    {(lang==='ka'?s.title_ka:s.title_en) && (
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-semibold">{i+1}</span>
                                            <h2 className="text-xl font-bold text-gray-800">{lang==='ka'?s.title_ka:s.title_en}</h2>
                                        </div>
                                    )}
                                    {(lang==='ka'?s.body_ka:s.body_en) && (
                                        <div className="text-gray-600 leading-relaxed">
                                            <div dangerouslySetInnerHTML={{ __html: (lang==='ka'?s.body_ka:s.body_en) }} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Fallback if no sections */}
            {sections.length === 0 && (
                <section className="py-16 bg-gray-50">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="bg-white rounded-lg shadow-md p-12 text-center">
                            <p className="text-gray-500 text-lg">No additional information available at the moment.</p>
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}


