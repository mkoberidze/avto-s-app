import React from 'react';
import { Building2 } from 'lucide-react';
import { useI18n } from '../../../contexts/i18n.js';

export default function AboutStorePage() {
    const t = useI18n();
    return (
        <>
            <section className="bg-navy">
                <div className="container-shell py-20 text-white sm:py-28">
                    <p className="section-kicker text-white/60">{t('nav.about')}</p>
                    <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">{t('about.hero_title')}</h1>
                    <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">{t('about.hero_text')}</p>
                </div>
            </section>
            <section className="container-shell grid gap-10 py-16 lg:grid-cols-2 lg:py-24">
                <div>
                    <span className="grid size-14 place-items-center rounded-xl bg-accent/10 text-accent"><Building2 /></span>
                    <p className="mt-6 text-lg leading-8 text-muted">{t('about.body')}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {[['15+', 'about.stat_warranty'], ['100+', 'about.stat_projects'], ['24/7', 'about.stat_support'], ['8', 'about.stat_categories']].map(([n, key]) => (
                        <div key={key} className="rounded-xl border border-line bg-surface p-6">
                            <strong className="text-3xl font-black text-navy">{n}</strong>
                            <p className="mt-2 text-sm text-muted">{t(key)}</p>
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
}
