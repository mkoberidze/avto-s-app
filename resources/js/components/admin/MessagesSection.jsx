import React, { useEffect, useState } from 'react';
import { getAdminMessages, updateAdminMessage } from '../../api/admin.js';
import { useI18n } from '../../contexts/i18n.js';
import { Button } from '../storefront/ui.jsx';
import { formatAdminDate } from './status.js';

export default function MessagesSection() {
    const t = useI18n();
    const [handled, setHandled] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const perPage = 25;

    function load() {
        setLoading(true);
        setError(false);
        const query = { page, per_page: perPage };
        if (handled !== '') query.handled = handled;
        getAdminMessages(query)
            .then(setData)
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, [handled, page]);

    async function toggle(row) {
        try {
            const saved = await updateAdminMessage(row.id, { handled: !row.handled });
            setData((prev) => ({
                ...prev,
                messages: (prev?.messages || []).map((item) => (item.id === row.id ? saved : item)),
            }));
        } catch {
            setError(true);
        }
    }

    const total = data?.total || 0;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const tabs = [
        { id: '', label: t('admin.status_all') },
        { id: '0', label: t('admin.unhandled') },
        { id: '1', label: t('admin.handled') },
    ];

    return (
        <div>
            <p className="section-kicker">{t('admin.messages')}</p>
            <h1 className="section-title">{t('admin.messages_title')}</h1>
            <p className="mt-2 text-sm text-muted">{t('admin.messages_text')}</p>
            <section className="mt-7 overflow-hidden rounded-2xl border border-line bg-white">
                <div className="flex flex-wrap gap-2 border-b border-line px-4 pt-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id || 'all'}
                            type="button"
                            onClick={() => { setHandled(tab.id); setPage(1); }}
                            className={`mb-[-1px] rounded-t-lg px-3 py-2 text-sm font-semibold ${handled === tab.id ? 'border border-b-white border-line bg-white text-navy' : 'text-muted hover:text-navy'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                {loading ? <div className="h-48 animate-pulse bg-slate-100" /> : null}
                {error ? (
                    <div className="p-8 text-center">
                        <p className="text-sm text-muted">{t('admin.error')}</p>
                        <Button className="mt-4" onClick={load}>{t('admin.retry')}</Button>
                    </div>
                ) : null}
                {!loading && !error ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-3xl text-left text-sm">
                            <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">{t('contact.name')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('admin.phone')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('contact.email_label')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('contact.message')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('admin.date')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('admin.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {(data?.messages || []).length === 0 ? (
                                    <tr><td colSpan={6} className="px-5 py-10 text-center text-muted">{t('admin.empty_messages')}</td></tr>
                                ) : (data.messages.map((row) => (
                                    <tr key={row.id}>
                                        <td className="px-5 py-3 font-bold text-navy">{row.name}</td>
                                        <td className="px-5 py-3 whitespace-nowrap">{row.phone}</td>
                                        <td className="px-5 py-3">{row.email || '—'}</td>
                                        <td className="max-w-sm px-5 py-3 text-muted">{row.message}</td>
                                        <td className="px-5 py-3 whitespace-nowrap text-xs text-muted">{formatAdminDate(row.created_at)}</td>
                                        <td className="px-5 py-3">
                                            <button type="button" onClick={() => toggle(row)} className="text-xs font-bold text-accent">
                                                {row.handled ? t('admin.mark_unhandled') : t('admin.mark_handled')}
                                            </button>
                                        </td>
                                    </tr>
                                )))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
                {pages > 1 ? (
                    <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
                        <button type="button" disabled={page <= 1} onClick={() => setPage((n) => n - 1)} className="font-bold text-accent disabled:text-muted">{t('admin.page')} {page}</button>
                        <span className="text-muted">{page} {t('admin.of')} {pages}</span>
                        <button type="button" disabled={page >= pages} onClick={() => setPage((n) => n + 1)} className="font-bold text-accent disabled:text-muted">{t('admin.of')} {pages}</button>
                    </div>
                ) : null}
            </section>
        </div>
    );
}
