import React, { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { loginRedirect } from '../../lib/safePath.js';
import { ExternalLink, Menu, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useI18n } from '../../contexts/i18n.js';
import { LanguageSwitcher } from '../storefront/Header.jsx';
import { ADMIN_SECTIONS, findAdminSection } from './sections.js';

export default function AdminLayout() {
    const t = useI18n();
    const { isAuthenticated, user, loading } = useAuth();
    const location = useLocation();
    const [sidebar, setSidebar] = useState(false);
    const sectionId = location.pathname.split('/')[2] || 'products';
    const active = findAdminSection(sectionId);

    if (loading) {
        return (
            <div className="storefront-root grid min-h-screen place-items-center bg-surface">
                <span className="size-10 animate-pulse rounded-xl bg-navy" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to={loginRedirect(`${location.pathname}${location.search}`)} replace />;
    }

    if (!user?.hasRole?.('admin')) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="storefront-root min-h-screen bg-surface">
            {sidebar ? <button type="button" onClick={() => setSidebar(false)} aria-label={t('common.close')} className="fixed inset-0 z-40 bg-navy/50 lg:hidden" /> : null}
            <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-navy text-white transition-transform lg:translate-x-0 ${sidebar ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
                    <Link to="/admin/products" onClick={() => setSidebar(false)} className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-accent"><ShieldCheck size={22} /></span>
                        <span>
                            <strong className="block tracking-widest">SENTRA</strong>
                            <span className="text-xs text-white/50">{t('admin.panel')}</span>
                        </span>
                    </Link>
                    <button type="button" onClick={() => setSidebar(false)} aria-label={t('common.close')} className="grid size-9 place-items-center rounded-lg hover:bg-white/10 lg:hidden">
                        <X size={19} />
                    </button>
                </div>
                <nav className="flex-1 space-y-1 p-4">
                    {ADMIN_SECTIONS.map(({ id, icon: Icon, label }) => (
                        <NavLink
                            key={id}
                            to={`/admin/${id}`}
                            onClick={() => setSidebar(false)}
                            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-white text-navy' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}
                        >
                            <Icon size={19} />
                            {t(label)}
                        </NavLink>
                    ))}
                </nav>
                <div className="border-t border-white/10 p-4">
                    <Link to="/" className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-white/65 hover:bg-white/10 hover:text-white">
                        {t('admin.view_store')}
                        <ExternalLink size={16} />
                    </Link>
                </div>
            </aside>
            <div className="lg:pl-72">
                <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur sm:px-7">
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setSidebar(true)} aria-label={t('nav.categories')} className="grid size-10 place-items-center rounded-lg border border-line lg:hidden">
                            <Menu size={20} />
                        </button>
                        <div>
                            <p className="text-xs text-muted">{t('admin.panel')}</p>
                            <p className="font-bold text-navy">{t(active?.label || 'admin.products')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <span className="hidden size-10 place-items-center rounded-full bg-navy text-sm font-bold text-white sm:grid">
                            {(user?.name || user?.phone || 'A').slice(0, 2).toUpperCase()}
                        </span>
                    </div>
                </header>
                <main className="p-4 sm:p-7 xl:p-9">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
