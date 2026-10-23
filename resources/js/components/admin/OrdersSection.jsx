import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAdminOrders } from '../../api/admin.js';
import { useI18n } from '../../contexts/i18n.js';
import { Button, formatPrice } from '../storefront/ui.jsx';
import { ORDER_STATUSES, formatDay, statusClass } from './status.js';

export default function OrdersSection() {
    const t = useI18n();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const status = params.get('status') || '';
    const q = params.get('q') || '';
    const dateFrom = params.get('date_from') || '';
    const dateTo = params.get('date_to') || '';
    const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
    const [draftQ, setDraftQ] = useState(q);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const perPage = 25;

    useEffect(() => { setDraftQ(q); }, [q]);

    function setFilter(next) {
        const merged = { status, q, date_from: dateFrom, date_to: dateTo, page: '1', ...next };
        const sp = new URLSearchParams();
        Object.entries(merged).forEach(([key, value]) => {
            if (value && value !== 'all') sp.set(key, String(value));
        });
        setParams(sp);
    }

    function load() {
        setLoading(true);
        setError(false);
        const query = { page, per_page: perPage };
        if (status) query.status = status;
        if (q.trim()) query.q = q.trim();
        if (dateFrom) query.date_from = dateFrom;
        if (dateTo) query.date_to = dateTo;
        getAdminOrders(query)
            .then(setData)
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, [status, q, dateFrom, dateTo, page]);

    const counts = data?.counts || {};
    const total = data?.total || 0;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const tabs = [{ id: '', label: t('admin.status_all'), count: (counts.new || 0) + (counts.under_review || 0) + (counts.in_progress || 0) + (counts.completed || 0) }]
        .concat(ORDER_STATUSES.map((id) => ({ id, label: t(`order.status.${id}`), count: counts[id] || 0 })));

    return (
        <div>
            <p className="section-kicker">{t('admin.orders')}</p>
            <h1 className="section-title">{t('admin.order_management')}</h1>
            <p className="mt-2 text-sm text-muted">{t('admin.order_management_text')}</p>
            <section className="mt-7 overflow-hidden rounded-2xl border border-line bg-white">
                <div className="flex flex-wrap gap-2 border-b border-line px-4 pt-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id || 'all'}
                            type="button"
                            onClick={() => setFilter({ status: tab.id, page: '1' })}
                            className={`mb-[-1px] rounded-t-lg px-3 py-2 text-sm font-semibold ${status === tab.id ? 'border border-b-white border-line bg-white text-navy' : 'text-muted hover:text-navy'}`}
                        >
                            {tab.label} <span className="text-xs">{tab.count}</span>
                        </button>
                    ))}
                </div>
                <form
                    onSubmit={(e) => { e.preventDefault(); setFilter({ q: draftQ.trim(), page: '1' }); }}
                    className="flex flex-wrap items-end gap-3 border-b border-line p-4"
                >
                    <label className="relative min-w-0 flex-1 sm:max-w-sm">
                        <Search className="absolute left-3 top-3 text-muted" size={17} />
                        <input value={draftQ} onChange={(e) => setDraftQ(e.target.value)} placeholder={t('admin.search_orders')} className="h-11 w-full rounded-lg border border-line bg-surface pl-10 pr-3 text-sm outline-none focus:border-accent" />
                    </label>
                    <label className="text-xs font-semibold text-muted">{t('admin.date_from')}
                        <input type="date" value={dateFrom} onChange={(e) => setFilter({ date_from: e.target.value, page: '1' })} className="mt-1 block h-11 rounded-lg border border-line bg-white px-3 text-sm text-navy" />
                    </label>
                    <label className="text-xs font-semibold text-muted">{t('admin.date_to')}
                        <input type="date" value={dateTo} onChange={(e) => setFilter({ date_to: e.target.value, page: '1' })} className="mt-1 block h-11 rounded-lg border border-line bg-white px-3 text-sm text-navy" />
                    </label>
                    <Button type="submit">{t('catalog.apply')}</Button>
                </form>
                {error ? (
                    <div className="p-8 text-center">
                        <p className="text-sm text-muted">{t('admin.error')}</p>
                        <Button className="mt-4" onClick={load}>{t('admin.retry')}</Button>
                    </div>
                ) : loading ? (
                    <div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}</div>
                ) : !data?.orders?.length ? (
                    <p className="p-10 text-center text-sm text-muted">{t('admin.empty_orders')}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-3xl text-left text-sm">
                            <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">{t('account.order')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('admin.date')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('admin.customer')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('checkout.phone')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('cart.total')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('admin.items')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('admin.status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {data.orders.map((order) => (
                                    <tr key={order.id} className="cursor-pointer hover:bg-surface/60" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                                        <td className="px-5 py-4 font-bold text-navy">{order.number}</td>
                                        <td className="whitespace-nowrap px-5 py-4 text-muted">{formatDay(order.created_at)}</td>
                                        <td className="px-5 py-4 font-semibold">{order.customer_name}</td>
                                        <td className="px-5 py-4 text-muted">{order.phone}</td>
                                        <td className="whitespace-nowrap px-5 py-4 font-bold">{formatPrice(order.total)}</td>
                                        <td className="px-5 py-4 text-muted">{order.item_count}</td>
                                        <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(order.status)}`}>{t(`order.status.${order.status}`)}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {pages > 1 && !loading ? (
                    <div className="flex items-center justify-between border-t border-line px-5 py-4 text-sm">
                        <span className="text-muted">{t('admin.page')} {page} {t('admin.of')} {pages}</span>
                        <div className="flex gap-2">
                            <Button variant="ghost" disabled={page <= 1} onClick={() => setFilter({ page: String(page - 1) })}>{t('home.prev')}</Button>
                            <Button variant="ghost" disabled={page >= pages} onClick={() => setFilter({ page: String(page + 1) })}>{t('home.next')}</Button>
                        </div>
                    </div>
                ) : null}
            </section>
        </div>
    );
}
