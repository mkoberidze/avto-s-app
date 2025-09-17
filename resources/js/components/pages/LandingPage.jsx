import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Link } from 'react-router-dom';
import Carousel from '../ui/Carousel.jsx';
import { useI18n } from '../../contexts/i18n.js';

export default function LandingPage() {
    const { openPhoneModal, isAuthenticated } = useAuth();
    const t = useI18n();

    const slides = [
        { imageUrl: '/images/fire.svg', title: t('landing.fire'), subtitle: '' },
        { imageUrl: '/images/cctv.svg', title: t('landing.cctv'), subtitle: '' },
        { imageUrl: '/images/access.svg', title: t('landing.access'), subtitle: '' }
    ];

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
                        <p className="mt-4 text-[#475569] text-base sm:text-lg max-w-2xl">
                            {t('landing.desc')}
                        </p>
                        <div className="mt-6">
                            <Carousel slides={slides} heightClass="h-52 sm:h-64 lg:h-[20rem] xl:h-[24rem] max-h-[70vh]" />
                        </div>
                        <div className="mt-6 flex flex-wrap items-center gap-3">
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
                    </div>

                </div>

                <div id="services" className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { title: 'Licensed Experts', desc: 'Qualified team for regulated systems and compliance.' },
                        { title: 'Rapid Deployment', desc: 'Stocked inventory and efficient on‑site installation.' },
                        { title: '24/7 Support', desc: 'Round‑the‑clock monitoring and emergency response.' },
                        { title: 'Maintenance Plans', desc: 'Preventive servicing to maximize system uptime.' },
                    ].map((f, i) => (
                        <div key={i} className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                            <h3 className="text-[#0B1220] font-medium">{f.title}</h3>
                            <p className="mt-1 text-sm text-[#64748B]">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
