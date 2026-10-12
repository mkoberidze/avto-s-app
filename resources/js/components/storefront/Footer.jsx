import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useI18n } from '../../contexts/i18n.js';
import { LanguageSwitcher } from './Header.jsx';

export default function Footer() {
    const t = useI18n();
    return (
        <footer className="mt-20 bg-navy text-white">
            <div className="container-shell grid gap-10 py-14 md:grid-cols-4">
                <div className="md:col-span-2">
                    <div className="mb-4 flex items-center gap-2">
                        <ShieldCheck />
                        <span className="text-xl font-black tracking-wider">{t('nav.brand')}</span>
                    </div>
                    <p className="max-w-md text-sm leading-7 text-white/65">{t('footer.text')}</p>
                </div>
                <div>
                    <h3 className="mb-4 font-bold">{t('footer.company')}</h3>
                    <div className="space-y-3 text-sm text-white/65">
                        <Link className="block hover:text-white" to="/about">{t('nav.about')}</Link>
                        <Link className="block hover:text-white" to="/contact">{t('nav.contact')}</Link>
                        <Link className="block hover:text-white" to="/products">{t('nav.catalog')}</Link>
                    </div>
                </div>
                <div>
                    <h3 className="mb-4 font-bold">{t('contact.title')}</h3>
                    <div className="space-y-2 text-sm text-white/65">
                        <p>{t('contact.phone')}</p>
                        <p>{t('contact.email')}</p>
                    </div>
                    <div className="mt-5"><LanguageSwitcher dark /></div>
                </div>
            </div>
            <div className="border-t border-white/10">
                <div className="container-shell py-5 text-xs text-white/50">© {new Date().getFullYear()} {t('nav.brand')}. {t('footer.rights')}</div>
            </div>
        </footer>
    );
}
