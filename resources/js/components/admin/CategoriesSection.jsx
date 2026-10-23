import React, { useEffect, useMemo, useState } from 'react';
import { getAdminCategories, updateAdminCategory } from '../../api/admin.js';
import { useI18n } from '../../contexts/i18n.js';
import { Button } from '../storefront/ui.jsx';

export default function CategoriesSection() {
    const t = useI18n();
    const [rows, setRows] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [toast, setToast] = useState('');
    const [saving, setSaving] = useState({});

    function load() {
        setLoading(true);
        setError(false);
        getAdminCategories()
            .then((data) => {
                const list = Array.isArray(data) ? data : [];
                setRows(list);
                const next = {};
                list.forEach((row) => {
                    next[row.id] = {
                        nav_order: row.nav_order == null ? '' : String(row.nav_order),
                        is_hidden: Boolean(row.is_hidden),
                    };
                });
                setDrafts(next);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, []);

    const ordered = useMemo(() => {
        const byId = new Map(rows.map((row) => [String(row.id), row]));
        return rows.slice().sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true })).map((row) => {
            let depth = 0;
            let current = row;
            const guard = new Set();
            while (current?.parent_id && !guard.has(String(current.id))) {
                guard.add(String(current.id));
                current = byId.get(String(current.parent_id));
                depth += 1;
            }
            return { ...row, depth };
        });
    }, [rows]);

    const dirty = rows.some((row) => {
        const d = drafts[row.id];
        if (!d) return false;
        return d.nav_order !== (row.nav_order == null ? '' : String(row.nav_order))
            || d.is_hidden !== Boolean(row.is_hidden);
    });

    useEffect(() => {
        if (!dirty) return undefined;
        const onBefore = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', onBefore);
        return () => window.removeEventListener('beforeunload', onBefore);
    }, [dirty]);

    function patch(id, field, value) {
        setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
    }

    async function saveRow(row) {
        const d = drafts[row.id];
        setSaving((s) => ({ ...s, [row.id]: true }));
        try {
            const saved = await updateAdminCategory(row.id, {
                is_hidden: d.is_hidden,
                nav_order: d.nav_order === '' ? null : Number(d.nav_order),
            });
            setRows((list) => list.map((item) => (item.id === row.id ? { ...item, ...saved, product_count: item.product_count } : item)));
        } catch {
            setToast(t('admin.failed'));
            setTimeout(() => setToast(''), 4000);
        } finally {
            setSaving((s) => ({ ...s, [row.id]: false }));
        }
    }

    async function toggleHidden(row) {
        const next = !drafts[row.id].is_hidden;
        patch(row.id, 'is_hidden', next);
        const previous = rows;
        setRows((list) => list.map((item) => (item.id === row.id ? { ...item, is_hidden: next } : item)));
        try {
            await updateAdminCategory(row.id, { is_hidden: next });
        } catch {
            setRows(previous);
            patch(row.id, 'is_hidden', !next);
            setToast(t('admin.failed'));
            setTimeout(() => setToast(''), 4000);
        }
    }

    return (
        <div>
            {toast ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{toast}</p> : null}
            <p className="section-kicker">{t('admin.categories')}</p>
            <h1 className="section-title">{t('admin.categories')}</h1>
            <p className="mt-2 text-sm text-muted">{t('admin.categories_text')}</p>
            <section className="mt-7 overflow-hidden rounded-2xl border border-line bg-white">
                {error ? (
                    <div className="p-8 text-center">
                        <p className="text-sm text-muted">{t('admin.error')}</p>
                        <Button className="mt-4" onClick={load}>{t('admin.retry')}</Button>
                    </div>
                ) : loading ? (
                    <div className="space-y-3 p-5">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-4xl text-left text-sm">
                            <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">{t('admin.name_ka')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('admin.nav_order')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('admin.product_count')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('admin.hidden')}</th>
                                    <th className="px-5 py-3 text-right font-semibold">{t('admin.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {ordered.map((row) => {
                                    const d = drafts[row.id] || { nav_order: '', is_hidden: false };
                                    return (
                                        <tr key={row.id} className="hover:bg-surface/60">
                                            <td className="px-5 py-3 font-semibold text-navy" style={{ paddingLeft: `${1.25 + row.depth * 1.25}rem` }}>{row.name_ka}</td>
                                            <td className="px-3 py-3"><input inputMode="numeric" value={d.nav_order} onChange={(e) => patch(row.id, 'nav_order', e.target.value)} placeholder={t('admin.nav_order_hint')} className="h-10 w-24 rounded-lg border border-line px-2 text-sm" /></td>
                                            <td className="px-5 py-3 text-muted">{row.product_count}</td>
                                            <td className="px-5 py-3">
                                                <button type="button" role="switch" aria-checked={d.is_hidden} onClick={() => toggleHidden(row)} className={`relative h-6 w-11 rounded-full ${d.is_hidden ? 'bg-accent' : 'bg-slate-200'}`}>
                                                    <span className={`absolute top-1 size-4 rounded-full bg-white shadow ${d.is_hidden ? 'left-6' : 'left-1'}`} />
                                                </button>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <Button variant="ghost" disabled={saving[row.id]} onClick={() => saveRow(row)}>{t('admin.save')}</Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
