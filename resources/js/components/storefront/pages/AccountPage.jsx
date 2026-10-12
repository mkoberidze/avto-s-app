import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useI18n } from '../../../contexts/i18n.js';
import { loginRedirect } from '../../../lib/safePath.js';
import { Button, EmptyState, Price } from '../ui.jsx';

function statusClass(status) {
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
    if (status === 'in_progress') return 'bg-sky-50 text-sky-700';
    if (status === 'under_review') return 'bg-violet-50 text-violet-700';
    return 'bg-amber-50 text-amber-700';
}

function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
}

export default function AccountPage() {
    const t = useI18n();
    const navigate = useNavigate();
    const { isAuthenticated, loading, user, signOut, updateProfile } = useAuth();
    const [name, setName] = useState('');
    const [orders, setOrders] = useState([]);
    const [openId, setOpenId] = useState(null);
    const [details, setDetails] = useState({});
    const [saving, setSaving] = useState(false);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [detailError, setDetailError] = useState('');

    useEffect(() => {
        if (user?.name) setName(user.name);
    }, [user]);

    useEffect(() => {
        if (!isAuthenticated) return undefined;
        let cancelled = false;
        setLoadingOrders(true);
        axios.get('/api/orders')
            .then((res) => {
                if (!cancelled) setOrders(res.data.orders || []);
            })
            .catch(() => {
                if (!cancelled) setError(t('account.load_error'));
            })
            .finally(() => {
                if (!cancelled) setLoadingOrders(false);
            });
        return () => { cancelled = true; };
    }, [isAuthenticated, t]);

    if (loading) {
        return (
            <div className="container-shell py-12">
                <div className="h-10 w-48 animate-pulse rounded bg-slate-100" />
                <div className="mt-8 grid gap-7 lg:grid-cols-[18rem_1fr]">
                    <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to={loginRedirect('/account')} replace />;
    }

    async function saveProfile() {
        setSaving(true);
        setSaved(false);
        setError('');
        try {
            await updateProfile(name);
            setSaved(true);
        } catch {
            setError(t('account.save_error'));
        } finally {
            setSaving(false);
        }
    }

    async function toggleOrder(id) {
        if (openId === id) {
            setOpenId(null);
            return;
        }
        setOpenId(id);
        setDetailError('');
        if (details[id]) return;
        try {
            const res = await axios.get(`/api/orders/${id}`);
            setDetails((prev) => ({ ...prev, [id]: res.data }));
        } catch {
            setDetailError(t('account.load_error'));
        }
    }

    function logout() {
        signOut();
        navigate('/');
    }

    return (
        <div className="container-shell py-12">
            <h1 className="section-title">{t('account.title')}</h1>
            <div className="mt-8 grid gap-7 lg:grid-cols-[18rem_1fr]">
                <aside className="h-fit rounded-xl bg-navy p-6 text-white">
                    <span className="grid size-12 place-items-center rounded-full bg-white/10"><ShieldCheck /></span>
                    <p className="mt-4 font-bold">{user?.phone}</p>
                    <button type="button" onClick={logout} className="mt-7 text-sm font-semibold text-white/60 hover:text-white">{t('account.logout')}</button>
                </aside>
                <div className="space-y-7">
                    <section className="rounded-xl border border-line p-6">
                        <h2 className="text-lg font-bold text-navy">{t('account.profile')}</h2>
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('checkout.full_name')} className="form-input mt-0" maxLength={100} />
                            <Button onClick={saveProfile} disabled={saving}>{saving ? t('account.saving') : t('account.save')}</Button>
                        </div>
                        {saved ? <p className="mt-3 text-sm text-emerald-700">{t('account.name_saved')}</p> : null}
                    </section>
                    <section>
                        <h2 className="mb-4 text-lg font-bold text-navy">{t('account.history')}</h2>
                        {error ? <p className="mb-4 text-sm font-semibold text-red-600">{error}</p> : null}
                        {loadingOrders ? (
                            <div className="space-y-3">
                                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                            </div>
                        ) : orders.length ? (
                            <div className="space-y-3">
                                {orders.map((order) => {
                                    const detail = details[order.id];
                                    return (
                                        <div key={order.id} className="rounded-xl border border-line p-5">
                                            <button type="button" className="flex w-full flex-wrap items-center justify-between gap-4 text-left" onClick={() => toggleOrder(order.id)}>
                                                <div>
                                                    <span className="text-xs text-muted">{t('account.order')}</span>
                                                    <p className="font-bold text-navy">{order.number}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted">{formatDate(order.created_at)}</span>
                                                    <p className="font-bold"><Price value={order.total} /></p>
                                                </div>
                                                <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusClass(order.status)}`}>
                                                    {t(`order.status.${order.status}`)}
                                                </span>
                                            </button>
                                            {openId === order.id ? (
                                                <div className="mt-4 border-t border-line pt-4 text-sm text-muted">
                                                    {detailError && !detail ? <p className="text-red-600">{detailError}</p> : null}
                                                    {!detail && !detailError ? <div className="h-16 animate-pulse rounded bg-slate-100" /> : null}
                                                    {detail ? (
                                                        <>
                                                            <p>{t('checkout.address')}: {detail.address}</p>
                                                            {detail.comment ? <p className="mt-1">{t('checkout.comment')}: {detail.comment}</p> : null}
                                                            <ul className="mt-3 space-y-1">
                                                                {(detail.items || []).map((item, i) => (
                                                                    <li key={`${item.product_id}-${i}`}>
                                                                        {item.quantity} × {item.name} — {Number(item.price).toFixed(2)} ₾
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState title={t('account.empty')} body={t('account.empty_body')} action={<Link to="/products"><Button variant="ghost">{t('cart.continue')}</Button></Link>} />
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
