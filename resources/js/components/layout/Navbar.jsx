import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import axios from 'axios';
import { useI18n } from '../../contexts/i18n.js';

export default function Navbar() {
    const { isAuthenticated, user, openPhoneModal, signOut } = useAuth();
    const t = useI18n();
    const [logoUrl, setLogoUrl] = useState('');
    const [faviconUrl, setFaviconUrl] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef(null);

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

    useEffect(() => {
        if (!mobileMenuOpen) {
            return;
        }

        const handleClickOutside = (event) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                setMobileMenuOpen(false);
            }
        };

        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [mobileMenuOpen]);

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
                    {isAuthenticated ? (
                        <div className="flex items-center gap-3">
                            <Link to="/forms" className="hidden sm:inline text-sm text-[#64748B] hover:text-[#0B1220] transition" title="Go to your forms">
                                {user?.phone}
                            </Link>
                            <button className="inline-flex items-center text-sm px-4 py-2 rounded-md border border-black/10 bg-white hover:bg-gray-50 transition" onClick={handleLogout}>
                                {t('nav.sign_out')}
                            </button>
                        </div>
                    ) : (
                        <>
                            <button className="inline-flex items-center text-sm px-4 py-2 rounded-md bg-[#0B1220] text-white hover:bg-[#0b1220]/90 transition" onClick={openPhoneModal}>
                                {t('nav.sign_in')}
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        className="md:hidden inline-flex items-center justify-center rounded-md border border-black/10 bg-white/80 h-10 w-10 text-[#0B1220] hover:bg-white transition"
                        aria-label="Toggle menu"
                        aria-expanded={mobileMenuOpen}
                        onClick={() => setMobileMenuOpen((prev) => !prev)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                        </svg>
                    </button>
                </div>
            </div>

            {mobileMenuOpen && (
                <div className="md:hidden bg-white/95 border-t border-black/5 shadow-xl" ref={mobileMenuRef}>
                    <div className="px-4 py-4 space-y-4">
                        <nav className="flex flex-col gap-3 text-sm text-[#475569]">
                            <Link to="/services" className="hover:text-[#0B1220] transition" onClick={() => setMobileMenuOpen(false)}>
                                {t('nav.services')}
                            </Link>
                            <Link to="/about" className="hover:text-[#0B1220] transition" onClick={() => setMobileMenuOpen(false)}>
                                {t('nav.about')}
                            </Link>
                            {user?.hasRole && user.hasRole('admin') && (
                                <Link to="/admin" className="hover:text-[#0B1220] transition" onClick={() => setMobileMenuOpen(false)}>
                                    {t('nav.admin')}
                                </Link>
                            )}
                        </nav>

                        <div className="flex flex-col gap-3">
                            {isAuthenticated ? (
                                <>
                                    <Link to="/forms" className="text-sm text-[#64748B] hover:text-[#0B1220] transition" onClick={() => setMobileMenuOpen(false)}>
                                        {user?.phone}
                                    </Link>
                                    <button
                                        className="w-full inline-flex items-center justify-center text-sm px-4 py-2 rounded-md border border-black/10 bg-white hover:bg-gray-50 transition"
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            handleLogout();
                                        }}
                                    >
                                        {t('nav.sign_out')}
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="w-full inline-flex items-center justify-center text-sm px-4 py-2 rounded-md bg-[#0B1220] text-white hover:bg-[#0b1220]/90 transition"
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        openPhoneModal();
                                    }}
                                >
                                    {t('nav.sign_in')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}


