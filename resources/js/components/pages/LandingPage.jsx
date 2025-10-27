import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Link } from 'react-router-dom';
import Carousel from '../ui/Carousel.jsx';
import { useI18n } from '../../contexts/i18n.js';
import axios from 'axios';

export default function LandingPage() {
    const { openPhoneModal, isAuthenticated } = useAuth();
    const t = useI18n();
    const [carouselImages, setCarouselImages] = useState([]);

    useEffect(() => {
        axios.get('/api/settings')
            .then(res => {
                if (res.data.carousel_images && Array.isArray(JSON.parse(res.data.carousel_images))) {
                    const images = JSON.parse(res.data.carousel_images);
                    if (images.length > 0) {
                        setCarouselImages(images);
                    }
                }
            })
            .catch(() => {});
    }, []);

    const slides = [
        { imageUrl: carouselImages[0] || null, title: t('landing.fire'), subtitle: '', direction: 'fire' },
        { imageUrl: carouselImages[1] || null, title: t('landing.cctv'), subtitle: '', direction: 'cctv' },
        { imageUrl: carouselImages[2] || null, title: t('landing.access'), subtitle: '', direction: 'access' }
    ].filter(slide => slide.imageUrl); // Only include slides with actual images

    return (
        <main className="py-8">
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-10 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF2FF] text-[#3730A3] px-3 py-1 text-xs font-medium border border-[#3730A3]/10">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1]"></span>
                            {t('landing.badge')}
                        </div>
                        <h1 className="mt-3 text-xl sm:text-5xl lg:text-4xl font-semibold text-[#0B1220] leading-[1.1] tracking-tight">
                            {t('landing.title')}
                        </h1>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            {isAuthenticated ? (
                                <Link to="/forms" className="inline-flex items-center text-sm px-5 py-2.5 rounded bg-[#0B1220] text-white hover:bg-[#0b1220]/90 transition">
                                    {t('forms.title')}
                                </Link>
                            ) : (
                                <>
                                    <button className="inline-flex items-center text-sm px-5 py-2.5 rounded bg-[#0B1220] text-white hover:bg-[#0b1220]/90 transition" onClick={openPhoneModal}>
                                        {t('landing.start')}
                                    </button>
                                    <button className="text-sm px-5 py-2.5 rounded border border-black/10 hover:border-black/30 transition" onClick={openPhoneModal}>
                                        {t('nav.sign_in')}
                                    </button>
                                </>
                            )}
                        </div>
                        <div className="mt-6">
                            <Carousel
                                slides={slides}
                                heightClass="h-64 sm:h-80 lg:h-96 xl:h-[28rem]"
                                onSlideClick={(slide)=>{
                                    const direction = slide?.direction || '';
                                    const url = direction ? `/forms?create=1&direction=${encodeURIComponent(direction)}` : '/forms?create=1';
                                    window.history.pushState({}, '', url);
                                    window.dispatchEvent(new PopStateEvent('popstate'));
                                }}
                            />
                        </div>
                    </div>

                </div>

                {/* Services cards removed as requested */}
            </section>
        </main>
    );
}
