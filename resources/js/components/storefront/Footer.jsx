import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../contexts/i18n.js';
import { useStorefrontData } from './StorefrontData.jsx';

export default function Footer() {
    const t = useI18n();
    const { settings } = useStorefrontData();

    return (
        <footer className="mt-auto border-t border-[#0F2744]/10 bg-[#0F2744] text-white">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-8">
                <div>
                    <div className="flex items-center gap-2">
                        {settings.logo_url ? <img src={settings.logo_url} alt="" className="h-8 w-8 object-contain" /> : null}
                        <span className="text-lg font-semibold">{t('nav.brand')}</span>
                    </div>
                    <p className="mt-3 max-w-xs text-sm text-white/70">{t('about.lead')}</p>
                </div>
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">{t('footer.catalog')}</h2>
                    <div className="mt-3 flex flex-col gap-2 text-sm">
                        <Link to="/products" className="hover:text-[#C9A227]">{t('nav.catalog')}</Link>
                        <Link to="/about" className="hover:text-[#C9A227]">{t('nav.about')}</Link>
                        <Link to="/contact" className="hover:text-[#C9A227]">{t('nav.contact')}</Link>
                    </div>
                </div>
                <div className="sm:col-span-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">{t('contact.title')}</h2>
                    <p className="mt-3 text-sm">{t('contact.phone')}</p>
                    <p className="text-sm">{t('contact.email')}</p>
                    <p className="text-sm text-white/70">{t('contact.address')}</p>
                </div>
            </div>
            <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
                © {new Date().getFullYear()} Sentra. {t('footer.rights')}
            </div>
        </footer>
    );
}
