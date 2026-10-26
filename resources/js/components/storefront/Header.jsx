import React, { useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, Menu, Search, ShieldCheck, ShoppingCart, User, X } from 'lucide-react';
import { useI18n } from '../../contexts/i18n.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import { navCategoryRoots, childrenOf, useStorefrontData } from './StorefrontData.jsx';
import { loginRedirect } from '../../lib/safePath.js';

export default function Header() {
    const t = useI18n();
    const { settings, categories } = useStorefrontData();
    const phone = settings.phone || t('contact.phone');
    const email = settings.contact_email || t('contact.email');
    const { isAuthenticated, user } = useAuth();
    const isAdmin = Boolean(user?.hasRole?.('admin'));
    const { count, openDrawer } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const [q, setQ] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const roots = useMemo(() => navCategoryRoots(categories), [categories]);

    function search(event) {
        event.preventDefault();
        const term = q.trim();
        navigate(term ? `/products?q=${encodeURIComponent(term)}` : '/products');
        setMenuOpen(false);
    }

    return (
        <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
            <div className="bg-navy text-white">
                <div className="container-shell flex h-8 items-center justify-between text-xs">
                    <span>{t('home.tagline')}</span>
                    <span className="hidden text-white/65 sm:block">{phone} · {email}</span>
                </div>
            </div>
            <div className="container-shell flex h-18 items-center gap-4">
                <Link to="/" className="flex shrink-0 items-center gap-2.5">
                    {settings.logo_url ? (
                        <img src={settings.logo_url} alt="" className="size-9 rounded-lg object-contain" />
                    ) : (
                        <span className="grid size-9 place-items-center rounded-lg bg-accent text-white"><ShieldCheck size={21} /></span>
                    )}
                    <span className="text-xl font-black tracking-wider text-navy">{t('nav.brand')}</span>
                </Link>
                <form onSubmit={search} className="mx-auto hidden max-w-xl flex-1 md:flex">
                    <label className="sr-only" htmlFor="header-search">{t('nav.search')}</label>
                    <input
                        id="header-search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="h-11 w-full rounded-l-lg border border-r-0 border-line bg-surface px-4 text-sm outline-none focus:border-accent"
                        placeholder={t('nav.search_placeholder')}
                    />
                    <button type="submit" aria-label={t('nav.search')} className="grid w-12 place-items-center rounded-r-lg bg-navy text-white">
                        <Search size={18} />
                    </button>
                </form>
                <div className="ml-auto flex items-center gap-1 sm:gap-2">
                    <Link
                        to={isAuthenticated ? '/account' : loginRedirect(`${location.pathname}${location.search}`)}
                        aria-label={isAuthenticated ? t('nav.account') : t('nav.sign_in')}
                        className="grid size-10 place-items-center rounded-lg text-navy hover:bg-surface"
                    >
                        <User size={20} />
                    </Link>
                    <button type="button" onClick={openDrawer} aria-label={t('nav.cart')} className="relative grid size-10 place-items-center rounded-lg text-navy hover:bg-surface">
                        <ShoppingCart size={20} />
                        {count > 0 ? <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-white">{count}</span> : null}
                    </button>
                    {isAdmin ? (
                        <Link
                            to="/admin/dashboard"
                            aria-label={t('nav.admin')}
                            className="grid size-10 place-items-center rounded-lg text-navy hover:bg-surface"
                        >
                            <LayoutDashboard size={20} />
                        </Link>
                    ) : null}
                    <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={t('nav.categories')} className="grid size-10 place-items-center rounded-lg text-navy hover:bg-surface lg:hidden">
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>
            <nav className="hidden border-t border-line lg:block">
                <div className="container-shell flex h-12 items-center gap-8 text-sm font-semibold text-navy">
                    <div className="group relative flex h-full items-center gap-1">
                        {t('nav.catalog')}
                        <ChevronDown size={15} />
                        <div className="invisible absolute left-0 top-full z-50 w-[min(40rem,70vw)] translate-y-2 rounded-b-xl border border-line bg-white p-3 opacity-0 shadow-card transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                            <div className="grid gap-1 sm:grid-cols-2">
                                {roots.map((root) => (
                                    <div key={root.id}>
                                        <Link to={`/products/category/${root.id}`} className="block rounded-lg px-3 py-2.5 hover:bg-surface hover:text-accent">{root.name}</Link>
                                        {[...childrenOf(categories, root.id)]
                                            .sort((a, b) => (b.product_count || 0) - (a.product_count || 0))
                                            .slice(0, 4)
                                            .map((child) => (
                                            <Link key={child.id} to={`/products/category/${child.id}`} className="block truncate rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface hover:text-accent">
                                                {child.name}
                                            </Link>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <NavLink to="/about" className={({ isActive }) => (isActive ? 'text-accent' : 'hover:text-accent')}>{t('nav.about')}</NavLink>
                    <NavLink to="/contact" className={({ isActive }) => (isActive ? 'text-accent' : 'hover:text-accent')}>{t('nav.contact')}</NavLink>
                </div>
            </nav>
            {menuOpen ? (
                <div className="border-t border-line bg-white p-4 lg:hidden">
                    <form onSubmit={search} className="mb-4 flex">
                        <input value={q} onChange={(e) => setQ(e.target.value)} className="h-11 min-w-0 flex-1 rounded-l-lg border border-line px-3 text-sm" placeholder={t('nav.search_placeholder')} />
                        <button type="submit" className="grid w-11 place-items-center rounded-r-lg bg-navy text-white"><Search size={18} /></button>
                    </form>
                    <div className="space-y-1">
                        {roots.map((root) => (
                            <Link onClick={() => setMenuOpen(false)} key={root.id} to={`/products/category/${root.id}`} className="block rounded-lg px-3 py-2 font-semibold text-navy hover:bg-surface">{root.name}</Link>
                        ))}
                        {isAdmin ? (
                            <Link onClick={() => setMenuOpen(false)} to="/admin/dashboard" className="block rounded-lg px-3 py-2 font-semibold text-navy">{t('nav.admin')}</Link>
                        ) : null}
                        <Link onClick={() => setMenuOpen(false)} to="/about" className="block rounded-lg px-3 py-2 font-semibold text-navy">{t('nav.about')}</Link>
                        <Link onClick={() => setMenuOpen(false)} to="/contact" className="block rounded-lg px-3 py-2 font-semibold text-navy">{t('nav.contact')}</Link>
                    </div>
                </div>
            ) : null}
        </header>
    );
}
