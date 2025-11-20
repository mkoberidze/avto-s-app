import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../contexts/i18n.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import axios from 'axios';

// Default service icons as fallback
const serviceIcons = [
    '🔧', '👥', '⚙️', '💰'
];

export default function ServicesPage() {
    const t = useI18n();
    const { lang } = useLanguage();
    const [content, setContent] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get('/api/pages/services').then(res => setContent(res.data)).catch(()=>{});
    }, []);

    const title = (lang === 'ka' ? content?.title_ka : content?.title_en) || t('services.title');
    const subtitle = (lang === 'ka' ? content?.subtitle_ka : content?.subtitle_en) || '';
    const body = (lang === 'ka' ? content?.body_ka : content?.body_en) || t('services.body');
    const sections = Array.isArray(content?.sections) ? content.sections : [];

    return (
        <main className="min-h-screen">
            {/* Hero Section with Background */}
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

            {/* Services Grid Section */}
            {sections.length > 0 && (
                <section className="py-16 bg-gray-50">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {sections.map((s, i) => {
                                const sectionTitle = lang === 'ka' ? s.title_ka : s.title_en;
                                const sectionBody = lang === 'ka' ? s.body_ka : s.body_en;
                                const iconIndex = i % serviceIcons.length;
                                const isOrange = i === 0 || i === 3; // First and last get orange
                                const hasUploadedImage = s.image_url;
                                
                                if (!sectionTitle && !sectionBody) return null;

                                const handleCardClick = () => {
                                    navigate('/forms?create=1');
                                };

                                return (
                                    <div key={i} className="group">
                                        <button
                                            type="button"
                                            onClick={handleCardClick}
                                            className="relative bg-white rounded-lg shadow-lg p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full flex flex-col text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                                        >
                                            {/* Icon Circle */}
                                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
                                                isOrange ? 'bg-orange-500' : 'bg-blue-600'
                                            }`}>
                                                {hasUploadedImage ? (
                                                    <img 
                                                        src={s.image_url} 
                                                        alt={sectionTitle || 'Service icon'} 
                                                        className="w-10 h-10 object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-3xl">{serviceIcons[iconIndex]}</span>
                                                )}
                                            </div>
                                            
                                            {/* Title */}
                                            {sectionTitle && (
                                                <h3 className="text-xl font-bold text-gray-800 mb-4">{sectionTitle}</h3>
                                            )}
                                            
                                            {/* Description */}
                                            {sectionBody && (
                                                <div className="flex-1 text-gray-600 leading-relaxed">
                                                    <div dangerouslySetInnerHTML={{ __html: sectionBody }} />
                                                </div>
                                            )}
                                            
                                            {/* Hover Effect Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none"></div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* Fallback if no sections */}
            {sections.length === 0 && (
                <section className="py-16 bg-gray-50">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="bg-white rounded-lg shadow-md p-12 text-center">
                            <p className="text-gray-500 text-lg">No services available at the moment.</p>
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}


