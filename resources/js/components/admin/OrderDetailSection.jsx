import React, { useEffect, useState } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { getAdminOrder, updateAdminOrder } from '../../api/admin.js';
import { useI18n } from '../../contexts/i18n.js';
import { Button, formatPrice } from '../storefront/ui.jsx';
import { ORDER_STATUSES, formatAdminDate, statusClass } from './status.js';

export default function OrderDetailSection() {
    const t = useI18n();
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [status, setStatus] = useState('new');
    const [note, setNote] = useState('');
    const [toast, setToast] = useState('');
    const [toastError, setToastError] = useState(false);
    const [savingStatus, setSavingStatus] = useState(false);
    const [savingNote, setSavingNote] = useState(false);
    const [copied, setCopied] = useState(false);

    const dirty = order && (status !== order.status || (note || '') !== (order.admin_note || ''));
    const blocker = useBlocker(Boolean(dirty));

    useEffect(() => {
        if (blocker.state !== 'blocked') return undefined;
        if (window.confirm(t('admin.unsaved'))) blocker.proceed();
        else blocker.reset();
        return undefined;
    }, [blocker, t]);

    useEffect(() => {
        function onBeforeUnload(event) {
            if (!dirty) return;
            event.preventDefault();
            event.returnValue = '';
        }
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);

    function load() {
        setLoading(true);
        setError(false);
        setNotFound(false);
        getAdminOrder(id)
            .then((row) => {
                setOrder(row);
                setStatus(row.status);
                setNote(row.admin_note || '');
            })
            .catch((err) => {
                if (err?.response?.status === 404) setNotFound(true);
                else setError(true);
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, [id]);

    function flash(message, isError = false) {
        setToast(message);
        setToastError(isError);
        setTimeout(() => setToast(''), 4000);
    }

    async function saveStatus() {
        setSavingStatus(true);
        try {
            const saved = await updateAdminOrder(id, { status });
            setOrder(saved);
            setStatus(saved.status);
            setNote(saved.admin_note || '');
            flash(t('admin.saved'));
        } catch {
            flash(t('admin.failed'), true);
        } finally {
            setSavingStatus(false);
        }
    }

    async function saveNote() {
        setSavingNote(true);
        try {
            const saved = await updateAdminOrder(id, { admin_note: note });
            setOrder(saved);
            setStatus(saved.status);
            setNote(saved.admin_note || '');
            flash(t('admin.saved'));
        } catch {
            flash(t('admin.failed'), true);
        } finally {
            setSavingNote(false);
        }
    }

    async function copyPhone() {
        try {
            await navigator.clipboard.writeText(order.phone || '');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            flash(t('admin.failed'), true);
        }
    }

    if (loading) {
        return (
            <div>
                <div className="h-8 w-40 animate-pulse rounded bg-slate-100" />
                <div className="mt-6 h-80 animate-pulse rounded-2xl bg-slate-100" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="rounded-2xl border border-line bg-white p-8 text-center">
                <p className="font-bold text-navy">{t('admin.order_not_found')}</p>
                <Link to="/admin/orders" className="mt-4 inline-block text-sm font-bold text-accent">{t('admin.back_orders')}</Link>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="rounded-2xl border border-line bg-white p-8 text-center">
                <p className="text-sm text-muted">{t('admin.error')}</p>
                <Button className="mt-4" onClick={load}>{t('admin.retry')}</Button>
            </div>
        );
    }

    return (
        <div>
            {toast ? <p className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${toastError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{toast}</p> : null}
            <Link to="/admin/orders" className="text-sm font-bold text-accent">{t('admin.back_orders')}</Link>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="section-kicker">{t('admin.orders')}</p>
                    <h1 className="section-title">{order.number}</h1>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${statusClass(order.status)}`}>{t(`order.status.${order.status}`)}</span>
            </div>
            <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_20rem]">
                <div className="space-y-7">
                    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                        <h2 className="font-bold text-navy">{t('admin.customer')}</h2>
                        <p className="mt-3 text-lg font-black text-navy">{order.customer_name}</p>
                        <p className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                            <a href={`tel:${order.phone}`} className="font-semibold text-accent">{order.phone}</a>
                            <button type="button" onClick={copyPhone} className="text-xs font-bold text-muted hover:text-navy">{copied ? t('admin.copied') : t('admin.copy')}</button>
                        </p>
                        <p className="mt-3 text-sm text-muted">{t('checkout.address')}: {order.address}</p>
                        {order.comment ? <p className="mt-2 text-sm text-muted">{t('checkout.comment')}: {order.comment}</p> : null}
                        <p className="mt-2 text-sm text-muted">{t('admin.language')}: {(order.language || '—').toUpperCase()}</p>
                        {order.attachment_url ? (
                            <p className="mt-2 text-sm">
                                <a href={order.attachment_url} target="_blank" rel="noreferrer" className="font-bold text-accent">{t('admin.attachment')} · {t('admin.download')}</a>
                            </p>
                        ) : null}
                        <p className="mt-4 text-xs text-muted">{t('admin.created')}: {formatAdminDate(order.created_at)}</p>
                        <p className="text-xs text-muted">{t('admin.updated')}: {formatAdminDate(order.updated_at)}</p>
                    </section>
                    <section className="overflow-hidden rounded-2xl border border-line bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-2xl text-left text-sm">
                                <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">{t('admin.sku')}</th>
                                        <th className="px-5 py-3 font-semibold">{t('admin.product_name')}</th>
                                        <th className="px-5 py-3 font-semibold">{t('catalog.price')}</th>
                                        <th className="px-5 py-3 font-semibold">{t('admin.qty')}</th>
                                        <th className="px-5 py-3 font-semibold">{t('admin.line_total')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {(order.items || []).map((item, i) => (
                                        <tr key={`${item.product_id}-${i}`}>
                                            <td className="px-5 py-3 font-semibold text-muted">{item.product_code}</td>
                                            <td className="px-5 py-3">
                                                {item.product_exists && item.product_id ? (
                                                    <a href={`/products/${item.product_id}`} target="_blank" rel="noreferrer" className="font-bold text-navy hover:text-accent">{item.name}</a>
                                                ) : (
                                                    <span>
                                                        <span className="font-bold text-navy">{item.name}</span>
                                                        <span className="ml-2 text-xs text-muted">{t('admin.product_missing')}</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3">{formatPrice(item.price)}</td>
                                            <td className="px-5 py-3">{item.quantity}</td>
                                            <td className="whitespace-nowrap px-5 py-3 font-bold">{formatPrice(item.line_total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end border-t border-line px-5 py-4">
                            <strong>{t('cart.total')}: {formatPrice(order.total)}</strong>
                        </div>
                    </section>
                </div>
                <aside className="space-y-5">
                    <section className="rounded-2xl border border-line bg-white p-5">
                        <label className="form-label">{t('admin.status')}
                            <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-input">
                                {ORDER_STATUSES.map((value) => (
                                    <option key={value} value={value}>{t(`order.status.${value}`)}</option>
                                ))}
                            </select>
                        </label>
                        <Button className="mt-4 w-full" disabled={savingStatus || status === order.status} onClick={saveStatus}>
                            {savingStatus ? t('account.saving') : t('admin.save')}
                        </Button>
                    </section>
                    <section className="rounded-2xl border border-line bg-white p-5">
                        <label className="form-label">{t('admin.internal_note')}
                            <span className="mb-2 block text-xs font-normal text-muted">{t('admin.internal_note_hint')}</span>
                            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={6} maxLength={2000} className="form-input resize-none" />
                        </label>
                        <Button className="mt-4 w-full" disabled={savingNote || (note || '') === (order.admin_note || '')} onClick={saveNote}>
                            {savingNote ? t('account.saving') : t('admin.save')}
                        </Button>
                    </section>
                </aside>
            </div>
        </div>
    );
}
