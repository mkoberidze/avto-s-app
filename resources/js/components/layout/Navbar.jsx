import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import axios from 'axios';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { useI18n } from '../../contexts/i18n.js';

export default function Navbar() {
    const { isAuthenticated, user, openPhoneModal, signOut } = useAuth();
    const { lang, setLang, toggleLang } = useLanguage();
    const t = useI18n();
    const [logoUrl, setLogoUrl] = useState('');
    const [faviconUrl, setFaviconUrl] = useState('');

    useEffect(() => {
        axios.get('/api/settings')
            .then(res => {
                if (res.data.logo_url) {
                    setLogoUrl(res.data.logo_url);
                }
                if (res.data.favicon_url) {
                    setFaviconUrl(res.data.favicon_url);
                    // Update the favicon link in the document
                    const link = document.querySelector("link[rel~='icon']");
                    if (link) {
                        link.href = res.data.favicon_url;
                    }
                } else {
                    // Remove favicon if no custom one is set
                    const link = document.querySelector("link[rel~='icon']");
                    if (link) {
                        link.remove();
                    }
                }
            })
            .catch(() => {});
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post('/api/auth/logout');
            signOut();
        } catch (error) {
            console.error('Logout failed:', error);
            signOut(); // Force logout even if API fails
        }
    };

    return (
        <header className="w-full border-b border-black/5 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 fixed top-0 left-0 z-30">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 group">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
                    ) : (
                        <div className="h-8 w-8 bg-gray-200 animate-pulse rounded"></div>
                    )}
                    <span
                        className="font-semibold text-[#0B1220] group-hover:opacity-90 transition">{t('nav.brand')}</span>
                </Link>

                <nav className="hidden md:flex items-center gap-6 text-sm text-[#475569]">
                    <Link to="/services" className="hover:text-[#0B1220] transition">{t('nav.services')}</Link>
                    <Link to="/about" className="hover:text-[#0B1220] transition">{t('nav.about')}</Link>
                    {user?.hasRole && user.hasRole('admin') && (
                        <Link to="/admin" className="hover:text-[#0B1220] transition">{t('nav.admin')}</Link>
                    )}
                </nav>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button
                            className="inline-flex h-8 w-12 items-center justify-center rounded-md border border-black/10 bg-white hover:bg-gray-50 transition"
                            onClick={toggleLang}
                            title={lang === 'ka' ? 'Switch to English' : 'გადადი ქართულზე'}
                            aria-label={lang === 'ka' ? 'KA' : 'EN'}
                        >
                            {lang === 'ka' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className="h-5 w-7" aria-hidden="true">
                                    <path fill="#fff" d="M0 0h640v480H0z"/>
                                    <g fill="#e8102a">
                                        <path d="M256 0h128v480H256zM0 176h640v128H0z"/>
                                        <path d="M180 142v-40h-40v40h-40v40h40v40h40v-40h40v-40z"/>
                                        <path d="M500 142v-40h-40v40h-40v40h40v40h40v-40h40v-40z"/>
                                        <path d="M180 338v-40h-40v40h-40v40h40v40h40v-40h40v-40z"/>
                                        <path d="M500 338v-40h-40v40h-40v40h40v40h40v-40h40v-40z"/>
                                    </g>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="h-5 w-7" aria-hidden="true">
                                    <clipPath id="s"><path d="M0 0v30h60V0z"/></clipPath>
                                    <path d="M0 0v30h60V0z" fill="#012169"/>
                                    <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
                                    <path d="M0 0l60 30m0-30L0 30" clipPath="url(#s)" stroke="#C8102E" strokeWidth="4"/>
                                    <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
                                    <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
                                </svg>
                            )}
                        </button>
                    </div>
                    {isAuthenticated ? (
                        <div className="flex items-center gap-3">
                            <Link to="/forms" className="hidden sm:inline text-sm text-[#64748B] hover:text-[#0B1220] transition" title="Go to your forms">
                                {user?.phone}
                            </Link>
                            <button className="inline-flex items-center text-sm px-4 py-2 rounded-md border border-black/10 bg-white hover:bg-gray-50 transition" onClick={handleLogout}>
                                Sign out
                            </button>
                        </div>
                    ) : (
                        <>
                            <button className="inline-flex items-center text-sm px-4 py-2 rounded-md bg-[#0B1220] text-white hover:bg-[#0b1220]/90 transition" onClick={openPhoneModal}>
                                {t('nav.sign_in')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}


