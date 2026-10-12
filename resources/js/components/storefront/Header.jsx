import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import { useI18n } from '../../contexts/i18n.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import { categoryRoots, childrenOf, useStorefrontData } from './StorefrontData.jsx';
import CategoryIcon from './CategoryIcon.jsx';

export default function Header() {
    const t = useI18n();
    const { lang, setLang } = useLanguage();
    const { settings, categories } = useStorefrontData();
    const { isAuthenticated, user, openPhoneModal, signOut } = useAuth();
    const { count, openDrawer } = useCart();
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [megaOpen, setMegaOpen] = useState(false);

    const roots = useMemo(() => categoryRoots(categories), [categories]);

    useEffect(() => {
        if (settings.logo_url) return;
    }, [settings.logo_url]);

    function submitSearch(e) {
        e.preventDefault();
        const term = q.trim();
        navigate(term ? `/products?q=${encodeURIComponent(term)}` : '/products');
        setMobileOpen(false);
    }

    return (
        <header className="sticky top-0 z-40 border-b border-[#0F2744]/10 bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
                <button type="button" className="grid h-10 w-10 place-items-center rounded-lg md:hidden" aria-label="Menu" onClick={() => setMobileOpen(true)}>
                    <Menu className="h-5 w-5" />
                </button>

                <Link to="/" className="flex min-w-0 items-center gap-2">
                    {settings.logo_url ? (
                        <img src={settings.logo_url} alt={t('nav.brand')} className="h-9 w-9 object-contain" />
                    ) : (
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0F2744] text-sm font-bold text-white">S</span>
                    )}
                    <span className="truncate text-lg font-semibold text-[#0F2744]">{t('nav.brand')}</span>
                </Link>

                <nav className="ml-4 hidden items-center gap-1 md:flex">
                    <div className="relative" onMouseEnter={() => setMegaOpen(true)} onMouseLeave={() => setMegaOpen(false)}>
                        <button type="button" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-[#0F2744] hover:bg-[#F4F1EA]">
                            {t('nav.catalog')} <ChevronDown className="h-4 w-4" />
                        </button>
                        {megaOpen ? (
                            <div className="absolute left-0 top-full z-50 w-[min(720px,70vw)] rounded-2xl border border-[#0F2744]/10 bg-white p-4 shadow-xl">
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {roots.map((root) => (
                                        <div key={root.id}>
                                            <Link to={`/products/category/${root.id}`} className="flex items-center gap-2 font-medium text-[#0F2744] hover:text-[#C9A227]" onClick={() => setMegaOpen(false)}>
                                                <CategoryIcon id={root.id} className="h-4 w-4 shrink-0" />
                                                <span className="min-w-0 break-words">{root.name}</span>
                                            </Link>
                                            <ul className="mt-2 space-y-1">
                                                {childrenOf(categories, root.id).slice(0, 6).map((child) => (
                                                    <li key={child.id}>
                                                        <Link to={`/products/category/${child.id}`} className="block truncate text-sm text-[#5C6B7A] hover:text-[#0F2744]" onClick={() => setMegaOpen(false)}>
                                                            {child.name}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <Link to="/about" className="rounded-lg px-3 py-2 text-sm text-[#0F2744] hover:bg-[#F4F1EA]">{t('nav.about')}</Link>
                    <Link to="/contact" className="rounded-lg px-3 py-2 text-sm text-[#0F2744] hover:bg-[#F4F1EA]">{t('nav.contact')}</Link>
                </nav>

                <form onSubmit={submitSearch} className="ml-auto hidden min-w-0 flex-1 max-w-md md:block">
                    <label className="sr-only" htmlFor="header-search">{t('nav.search')}</label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8794]" />
                        <input
                            id="header-search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder={t('nav.search_placeholder')}
                            className="h-10 w-full rounded-lg border border-[#0F2744]/15 bg-[#F7F8FA] pl-9 pr-3 text-sm outline-none focus:border-[#C9A227]"
                        />
                    </div>
                </form>

                <div className="ml-auto flex items-center gap-1 md:ml-3">
                    <div className="flex rounded-lg border border-[#0F2744]/10 p-0.5 text-xs font-semibold">
                        {['ka', 'en', 'ru'].map((code) => (
                            <button
                                key={code}
                                type="button"
                                className={`rounded-md px-2 py-1 ${lang === code ? 'bg-[#0F2744] text-white' : 'text-[#5C6B7A] hover:bg-[#F4F1EA]'}`}
                                onClick={() => setLang(code)}
                                aria-pressed={lang === code}
                            >
                                {code.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <button
                            type="button"
                            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-[#F4F1EA]"
                            aria-label={t('nav.account')}
                            onClick={() => {
                                if (!isAuthenticated) {
                                    openPhoneModal();
                                    return;
                                }
                                setAccountOpen((v) => !v);
                            }}
                        >
                            <User className="h-5 w-5" />
                        </button>
                        {isAuthenticated && accountOpen ? (
                            <div className="absolute right-0 mt-1 w-52 rounded-xl border border-[#0F2744]/10 bg-white p-3 shadow-lg">
                                <p className="truncate text-sm font-medium text-[#0F2744]">{user?.name || user?.phone}</p>
                                <button type="button" className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F4F1EA]" onClick={() => { setAccountOpen(false); signOut(); }}>
                                    {t('nav.sign_out')}
                                </button>
                            </div>
                        ) : null}
                    </div>

                    <button type="button" className="relative grid h-10 w-10 place-items-center rounded-lg hover:bg-[#F4F1EA]" aria-label={t('nav.cart')} onClick={openDrawer}>
                        <ShoppingCart className="h-5 w-5" />
                        {count > 0 ? (
                            <span className="absolute right-1 top-1 min-w-4 rounded-full bg-[#C9A227] px-1 text-center text-[10px] font-bold text-[#0F2744]">{count}</span>
                        ) : null}
                    </button>
                </div>
            </div>

            {mobileOpen ? (
                <div className="fixed inset-0 z-50 bg-[#0F2744]/40 md:hidden" onClick={() => setMobileOpen(false)}>
                    <div className="h-full w-[min(100%,20rem)] overflow-y-auto bg-white p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <span className="font-semibold">{t('nav.categories')}</span>
                            <button type="button" aria-label={t('common.close')} onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={submitSearch} className="mb-4">
                            <label className="sr-only" htmlFor="mobile-search">{t('nav.search')}</label>
                            <input id="mobile-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('nav.search_placeholder')} className="h-10 w-full rounded-lg border border-[#0F2744]/15 px-3 text-sm" />
                        </form>
                        <Link to="/products" className="block py-2 font-medium" onClick={() => setMobileOpen(false)}>{t('nav.catalog')}</Link>
                        {roots.map((root) => (
                            <div key={root.id} className="py-2">
                                <Link to={`/products/category/${root.id}`} className="flex items-center gap-2 font-medium" onClick={() => setMobileOpen(false)}>
                                    <CategoryIcon id={root.id} className="h-4 w-4" />
                                    <span className="break-words">{root.name}</span>
                                </Link>
                                {childrenOf(categories, root.id).map((child) => (
                                    <Link key={child.id} to={`/products/category/${child.id}`} className="ml-6 block py-1 text-sm text-[#5C6B7A]" onClick={() => setMobileOpen(false)}>
                                        {child.name}
                                    </Link>
                                ))}
                            </div>
                        ))}
                        <Link to="/about" className="block py-2" onClick={() => setMobileOpen(false)}>{t('nav.about')}</Link>
                        <Link to="/contact" className="block py-2" onClick={() => setMobileOpen(false)}>{t('nav.contact')}</Link>
                    </div>
                </div>
            ) : null}
        </header>
    );
}
