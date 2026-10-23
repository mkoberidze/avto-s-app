import React, { useEffect, useState } from 'react';
import { BarChart3, Boxes, ChevronRight, ShoppingBag, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAdminDashboard } from '../../api/admin.js';
import { useI18n } from '../../contexts/i18n.js';
import { Button, formatPrice } from '../storefront/ui.jsx';
import { formatDay, statusClass } from './status.js';

function isStale(iso) {
    if (!iso) return true;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return true;
    return Date.now() - t > 36 * 60 * 60 * 1000;
}

export default function DashboardSection() {
    const t = useI18n();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    function load() {
        setLoading(true);
        setError(false);
        getAdminDashboard()
            .then(setData)
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, []);

    if (loading) {
        return (
            <div>
                <div className="h-10 w-72 animate-pulse rounded bg-slate-100" />
                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />)}
                </div>
                <div className="mt-7 h-56 animate-pulse rounded-2xl bg-slate-100" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="rounded-2xl border border-line bg-white p-8 text-center">
                <p className="text-sm text-muted">{t('admin.error')}</p>
                <Button className="mt-4" onClick={load}>{t('admin.retry')}</Button>
            </div>
        );
    }

    const by = data.orders_by_status || {};
    const newCount = by.new || 0;
    const stats = [
        { label: t('admin.orders_total'), value: String(data.orders_total), note: '', icon: BarChart3, tone: 'bg-violet-50 text-violet-700' },
        { label: t('admin.new_orders'), value: String(newCount), note: newCount > 0 ? t('admin.needs_review') : '', icon: ShoppingBag, tone: newCount > 0 ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200' : 'bg-blue-50 text-blue-700' },
        { label: t('admin.in_progress_orders'), value: String(by.in_progress || 0), note: '', icon: Boxes, tone: 'bg-violet-50 text-violet-700' },
        { label: t('admin.completed_orders'), value: String(by.completed || 0), note: '', icon: ShoppingBag, tone: 'bg-emerald-50 text-emerald-700' },
        { label: t('admin.completed_revenue'), value: formatPrice(data.completed_revenue), note: t('admin.completed_revenue_note'), icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-700' },
    ];
    const days = data.orders_last_30_days || [];
    const max = Math.max(1, ...days.map((d) => d.count));
    const stale = isStale(data.last_sync_at);
    const products = data.products || {};

    return (
        <div>
            <div className="mb-8">
                <p className="section-kicker">{t('admin.overview')}</p>
                <h1 className="section-title">{t('admin.welcome')}</h1>
                <p className="mt-2 text-sm text-muted">{t('admin.welcome_text')}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <article key={stat.label} className={`rounded-2xl border border-line bg-white p-5 ${stat.tone.includes('ring') ? 'ring-2 ring-blue-200' : ''}`}>
                            <span className={`grid size-11 place-items-center rounded-xl ${stat.tone.replace(' ring-2 ring-blue-200', '')}`}><Icon size={20} /></span>
                            <p className="mt-5 text-sm font-semibold text-muted">{stat.label}</p>
                            <p className="mt-1 text-2xl font-black text-navy">{stat.value}</p>
                            {stat.note ? <p className="mt-2 text-xs text-muted">{stat.note}</p> : null}
                        </article>
                    );
                })}
            </div>
            <section className="mt-7 overflow-hidden rounded-2xl border border-line bg-white p-5">
                <h2 className="font-bold text-navy">{t('admin.orders_30d')}</h2>
                <div className="mt-5 flex h-40 items-end gap-1">
                    {days.map((day) => (
                        <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center justify-end" title={`${day.date}: ${day.count}`}>
                            <span className="w-full rounded-t bg-navy/80" style={{ height: `${Math.max(day.count ? 8 : 2, (day.count / max) * 100)}%` }} />
                        </div>
                    ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted">
                    <span>{days[0] ? formatDay(days[0].date) : ''}</span>
                    <span>{days[days.length - 1] ? formatDay(days[days.length - 1].date) : ''}</span>
                </div>
            </section>
            <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_18rem]">
                <section className="overflow-hidden rounded-2xl border border-line bg-white">
                    <div className="flex items-center justify-between border-b border-line px-5 py-4">
                        <h2 className="font-bold text-navy">{t('admin.recent_orders')}</h2>
                        <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm font-bold text-accent">{t('admin.view_all')}<ChevronRight size={16} /></Link>
                    </div>
                    {(data.recent_orders || []).length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted">{t('admin.empty_orders')}</p>
                    ) : (
                        <ul className="divide-y divide-line">
                            {data.recent_orders.map((order) => (
                                <li key={order.id}>
                                    <Link to={`/admin/orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-surface/60">
                                        <div>
                                            <p className="font-bold text-navy">{order.number}</p>
                                            <p className="text-xs text-muted">{order.customer_name} · {order.phone}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold">{formatPrice(order.total)}</span>
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(order.status)}`}>{t(`order.status.${order.status}`)}</span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
                <section className="h-fit rounded-2xl border border-line bg-white p-5">
                    <h2 className="font-bold text-navy">{t('admin.catalog_health')}</h2>
                    <dl className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between"><dt className="text-muted">{t('admin.visible')}</dt><dd className="font-bold">{products.visible ?? 0}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted">{t('admin.hidden')}</dt><dd className="font-bold">{products.hidden ?? 0}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted">{t('admin.gone')}</dt><dd className="font-bold">{products.gone ?? 0}</dd></div>
                    </dl>
                    <p className="mt-4 text-xs text-muted">
                        {t('admin.last_sync')}: {data.last_sync_at ? formatDay(data.last_sync_at) : t('admin.never_synced')}
                    </p>
                    {stale ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('admin.sync_stale')}</p> : null}
                </section>
            </div>
        </div>
    );
}
