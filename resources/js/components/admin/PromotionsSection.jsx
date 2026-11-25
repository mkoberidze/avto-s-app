import React, { useEffect, useState } from 'react';
import { endAdminPromotion, getAdminPromotions, saveAdminPromotion } from '../../api/admin.js';
import { useI18n } from '../../contexts/i18n.js';
import { Button, PromotionCountdown } from '../storefront/ui.jsx';

export default function PromotionsSection() {
    const t = useI18n();
    const [brands, setBrands] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [durations, setDurations] = useState([1, 3, 7, 8, 14, 30]);
    const [brand, setBrand] = useState('');
    const [discount, setDiscount] = useState('15');
    const [duration, setDuration] = useState('8');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    async function load() {
        setLoading(true);
        setError('');
        try {
            const data = await getAdminPromotions();
            setBrands(data.brands || []);
            setPromotions(data.promotions || []);
            setDurations(data.durations || [1, 3, 7, 8, 14, 30]);
            setBrand((current) => current || data.brands?.[0] || '');
        } catch {
            setError(t('admin.promotions_load_error'));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    async function save(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        setNotice('');
        try {
            await saveAdminPromotion({
                brand,
                discount_percent: Number(discount),
                duration_days: Number(duration),
            });
            setNotice(t('admin.promotion_started'));
            await load();
        } catch (err) {
            setError(err?.response?.data?.message || t('admin.promotion_save_error'));
        } finally {
            setBusy(false);
        }
    }

    async function end(id) {
        setBusy(true);
        setError('');
        setNotice('');
        try {
            await endAdminPromotion(id);
            setNotice(t('admin.promotion_ended'));
            await load();
        } catch {
            setError(t('admin.promotion_save_error'));
        } finally {
            setBusy(false);
        }
    }

    if (loading) {
        return <div className="h-64 animate-pulse rounded-2xl bg-white" />;
    }

    return (
        <div>
            <p className="section-kicker">{t('admin.promotions')}</p>
            <h1 className="section-title">{t('admin.promotions_title')}</h1>
            <p className="mt-2 text-sm text-muted">{t('admin.promotions_text')}</p>
            {error ? <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
            {notice ? <p role="status" className="mt-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p> : null}

            <form onSubmit={save} className="mt-7 grid gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
                <label className="form-label">
                    {t('admin.promotion_brand')}
                    <select required value={brand} onChange={(event) => setBrand(event.target.value)} className="form-input" disabled={!brands.length}>
                        {brands.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                </label>
                <label className="form-label">
                    {t('admin.promotion_discount')}
                    <div className="relative">
                        <input required type="number" min="1" max="90" value={discount} onChange={(event) => setDiscount(event.target.value)} className="form-input pr-10" />
                        <span className="absolute right-4 top-3 text-muted">%</span>
                    </div>
                </label>
                <label className="form-label">
                    {t('admin.promotion_duration')}
                    <select value={duration} onChange={(event) => setDuration(event.target.value)} className="form-input">
                        {durations.map((days) => <option key={days} value={days}>{days} {t('admin.days')}</option>)}
                    </select>
                </label>
                <div className="flex items-end">
                    <Button type="submit" className="w-full" disabled={busy || !brand}>
                        {busy ? t('admin.promotion_saving') : t('admin.promotion_start')}
                    </Button>
                </div>
            </form>

            <h2 className="mt-9 text-lg font-bold text-navy">{t('admin.promotion_list')}</h2>
            {promotions.length ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {promotions.map((promotion) => {
                        const expired = new Date(promotion.ends_at).getTime() <= Date.now();
                        const status = promotion.is_active ? 'admin.promotion_active' : expired ? 'admin.promotion_expired' : 'admin.promotion_ended';
                        return (
                            <article key={promotion.id} className="rounded-xl border border-line bg-white p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-navy">{promotion.brand} · {promotion.discount_percent}%</h3>
                                        <p className="mt-1 text-xs text-muted">{t(status)} · {promotion.duration_days} {t('admin.days')}</p>
                                    </div>
                                    {promotion.is_active ? (
                                        <Button variant="danger" className="min-h-9 px-3 py-1.5" disabled={busy} onClick={() => end(promotion.id)}>
                                            {t('admin.promotion_stop')}
                                        </Button>
                                    ) : null}
                                </div>
                                {promotion.is_active ? (
                                    <p className="mt-4 text-sm font-semibold text-accent">
                                        {t('admin.promotion_ends')} <PromotionCountdown endsAt={promotion.ends_at} />
                                    </p>
                                ) : null}
                                <p className="mt-2 text-xs text-muted">
                                    {t('admin.promotion_start_time')}: {new Date(promotion.starts_at).toLocaleString('ka-GE')}
                                </p>
                                <p className="mt-1 text-xs text-muted">
                                    {t('admin.promotion_end_time')}: {new Date(promotion.ends_at).toLocaleString('ka-GE')}
                                </p>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <p className="mt-4 rounded-xl border border-dashed border-line bg-white px-5 py-8 text-sm text-muted">{t('admin.no_promotions')}</p>
            )}
        </div>
    );
}
