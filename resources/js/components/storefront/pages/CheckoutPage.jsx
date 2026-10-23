import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Paperclip, Phone } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useCart } from '../../../contexts/CartContext.jsx';
import { useI18n } from '../../../contexts/i18n.js';
import { loginRedirect } from '../../../lib/safePath.js';
import { Button, Price } from '../ui.jsx';

const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'dwg'];
const MAX_BYTES = 20 * 1024 * 1024;

function clientToken() {
    const a = crypto.randomUUID().replace(/-/g, '');
    const b = crypto.randomUUID().replace(/-/g, '');
    return (a + b).slice(0, 64);
}

export default function CheckoutPage() {
    const t = useI18n();
    const { isAuthenticated, loading, user } = useAuth();
    const { items, total, removeItem, clear } = useCart();
    const tokenRef = useRef(clientToken());
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [comment, setComment] = useState('');
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [unavailable, setUnavailable] = useState([]);
    const [done, setDone] = useState(null);

    useEffect(() => {
        if (user?.name) setName(user.name);
    }, [user]);

    const unavailableIds = useMemo(
        () => new Set(unavailable.map((row) => String(row.product_id))),
        [unavailable]
    );

    if (loading) {
        return (
            <div className="container-shell py-10">
                <div className="h-10 w-64 animate-pulse rounded bg-slate-100" />
                <div className="mt-8 h-80 animate-pulse rounded-xl bg-slate-100" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to={loginRedirect('/checkout')} replace />;
    }

    if (done) {
        return (
            <div className="container-shell grid min-h-[38rem] place-items-center py-12">
                <div className="max-w-lg text-center">
                    <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check size={30} />
                    </span>
                    <h1 className="mt-6 text-3xl font-black text-navy">{t('checkout.confirmation_title')}</h1>
                    <p className="mt-3 text-lg font-bold text-navy">{t('checkout.order_number')}: {done.number}</p>
                    <p className="mt-2 text-muted"><Price value={done.total} /></p>
                    <p className="mt-4 leading-7 text-muted">{t('checkout.confirmation_text')}</p>
                    <p className="mt-3 text-xs text-muted">{t('cart.display_note')}</p>
                    <Link to="/"><Button className="mt-7">{t('checkout.back_home')}</Button></Link>
                </div>
            </div>
        );
    }

    if (!items.length) {
        return (
            <div className="container-shell py-12 text-center">
                <h1 className="section-title">{t('checkout.title')}</h1>
                <p className="mt-3 text-muted">{t('checkout.empty')}</p>
                <Link to="/products"><Button className="mt-6" variant="ghost">{t('cart.continue')}</Button></Link>
            </div>
        );
    }

    async function submit(event) {
        event.preventDefault();
        if (busy) return;
        setError('');
        setUnavailable([]);
        if (!address.trim()) {
            setError(t('checkout.address_required'));
            return;
        }
        if (file) {
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            if (!ALLOWED_EXT.includes(ext)) {
                setError(t('checkout.file_type'));
                return;
            }
            if (file.size > MAX_BYTES) {
                setError(t('checkout.file_size'));
                return;
            }
        }
        setBusy(true);
        try {
            const body = new FormData();
            body.append('customer_name', name.trim());
            body.append('address', address.trim());
            if (comment.trim()) body.append('comment', comment.trim());
            body.append('client_token', tokenRef.current);
            if (file) body.append('attachment', file);
            items.forEach((item, i) => {
                body.append(`items[${i}][product_id]`, item.id);
                body.append(`items[${i}][quantity]`, String(item.quantity));
            });
            const res = await axios.post('/api/orders', body, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            clear();
            setDone(res.data);
        } catch (err) {
            if (err?.response?.status === 422 && err.response.data?.message === 'items_unavailable') {
                setUnavailable(err.response.data.items || []);
                setError(t('checkout.unavailable'));
            } else if (err?.response?.status === 422) {
                setError(t('checkout.validation'));
            } else {
                setError(t('checkout.error'));
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="container-shell py-10">
            <h1 className="section-title">{t('checkout.title')}</h1>
            <p className="mt-3 text-muted">{t('checkout.text')}</p>
            <p className="mt-2 text-xs text-muted">{t('cart.display_note')}</p>
            <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
                <div className="grid gap-5 rounded-xl border border-line p-5 sm:grid-cols-2 sm:p-7">
                    <label className="form-label">{t('checkout.full_name')}
                        <input required name="customer_name" value={name} onChange={(e) => setName(e.target.value)} className="form-input" maxLength={100} />
                    </label>
                    <label className="form-label">{t('checkout.phone')}
                        <div className="relative">
                            <Phone className="absolute left-3 top-3.5 text-muted" size={17} />
                            <input name="phone" value={user?.phone || ''} readOnly className="form-input bg-surface pl-10" />
                        </div>
                    </label>
                    <label className="form-label sm:col-span-2">{t('checkout.address')}
                        <input required name="address" value={address} onChange={(e) => setAddress(e.target.value)} className="form-input" maxLength={500} />
                    </label>
                    <label className="form-label sm:col-span-2">{t('checkout.comment')}
                        <textarea name="comment" rows={5} value={comment} onChange={(e) => setComment(e.target.value)} className="form-input resize-none" maxLength={2000} />
                    </label>
                    <label className="form-label sm:col-span-2">
                        <span className="inline-flex items-center gap-2"><Paperclip size={16} />{t('checkout.attachment')}</span>
                        <input
                            type="file"
                            name="attachment"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.dwg"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="mt-2 block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-surface file:px-4 file:py-3 file:font-semibold file:text-navy"
                        />
                    </label>
                    {error ? <p className="sm:col-span-2 text-sm font-semibold text-red-600">{error}</p> : null}
                    {unavailable.length ? (
                        <ul className="sm:col-span-2 space-y-2 rounded-lg bg-red-50 p-4 text-sm">
                            {unavailable.map((row) => {
                                const line = items.find((item) => item.id === String(row.product_id));
                                return (
                                    <li key={row.product_id} className="flex items-center justify-between gap-3">
                                        <span>
                                            {line?.snapshot?.name || row.product_id}: {t(`checkout.reason.${row.reason}`)}
                                        </span>
                                        {line ? (
                                            <button type="button" className="font-semibold text-accent" onClick={() => { removeItem(line.id); setUnavailable((prev) => prev.filter((x) => String(x.product_id) !== line.id)); }}>
                                                {t('checkout.remove_unavailable')}
                                            </button>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : null}
                </div>
                <aside className="h-fit rounded-xl bg-surface p-6">
                    <div className="space-y-3 border-b border-line pb-5">
                        {items.map((item) => (
                            <div key={item.id} className={`flex justify-between gap-4 text-sm ${unavailableIds.has(item.id) ? 'text-red-600' : ''}`}>
                                <span className="line-clamp-1 text-muted">{item.quantity} × {item.snapshot.name}</span>
                                <strong className="shrink-0">{(item.snapshot.price * item.quantity).toFixed(2)} ₾</strong>
                            </div>
                        ))}
                    </div>
                    <div className="my-5 flex justify-between">
                        <strong>{t('cart.total')}</strong>
                        <Price value={total} size="large" />
                    </div>
                    <Button disabled={busy || !items.length} className="w-full" type="submit">
                        {busy ? t('checkout.placing') : t('checkout.place')}
                    </Button>
                </aside>
            </form>
        </div>
    );
}
