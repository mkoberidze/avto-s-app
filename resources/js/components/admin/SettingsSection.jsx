import React, { useEffect, useState } from 'react';
import { getAdminSettings, saveAdminSettings, uploadCarousel, uploadFavicon, uploadLogo } from '../../api/admin.js';
import { useI18n } from '../../contexts/i18n.js';
import { Button } from '../storefront/ui.jsx';

const empty = {
    store_name: '',
    contact_email: '',
    phone: '',
    address: '',
    delivery_note: '',
    logo_url: '',
    favicon_url: '',
    carousel_images: ['', '', ''],
};

export default function SettingsSection() {
    const t = useI18n();
    const [form, setForm] = useState(empty);
    const [initial, setInitial] = useState(empty);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [done, setDone] = useState(false);
    const [toast, setToast] = useState('');
    const [uploading, setUploading] = useState({});

    function apply(data) {
        const images = Array.isArray(data.carousel_images) ? data.carousel_images : [];
        const next = {
            store_name: data.store_name || '',
            contact_email: data.contact_email || '',
            phone: data.phone || '',
            address: data.address || '',
            delivery_note: data.delivery_note || '',
            logo_url: data.logo_url || '',
            favicon_url: data.favicon_url || '',
            carousel_images: [images[0] || '', images[1] || '', images[2] || ''],
        };
        setForm(next);
        setInitial(next);
    }

    function load() {
        setLoading(true);
        setError(false);
        getAdminSettings()
            .then(apply)
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, []);

    const dirty = JSON.stringify(form) !== JSON.stringify(initial);

    useEffect(() => {
        if (!dirty) return undefined;
        const onBefore = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', onBefore);
        return () => window.removeEventListener('beforeunload', onBefore);
    }, [dirty]);

    function setField(key, value) {
        setDone(false);
        setForm((current) => ({ ...current, [key]: value }));
    }

    async function onUpload(kind, file, index) {
        if (!file) return;
        const key = kind + (index ?? '');
        setUploading((u) => ({ ...u, [key]: true }));
        try {
            if (kind === 'logo') {
                const res = await uploadLogo(file);
                setField('logo_url', res.logo_url);
                setInitial((cur) => ({ ...cur, logo_url: res.logo_url }));
            } else if (kind === 'favicon') {
                const res = await uploadFavicon(file);
                setField('favicon_url', res.favicon_url);
                setInitial((cur) => ({ ...cur, favicon_url: res.favicon_url }));
            } else {
                const res = await uploadCarousel(file, index);
                const images = [form.carousel_images[0], form.carousel_images[1], form.carousel_images[2]];
                (res.carousel_images || []).forEach((url, i) => { images[i] = url || images[i]; });
                images[index] = res.carousel_images?.[index] || images[index];
                setForm((current) => ({ ...current, carousel_images: images }));
                setInitial((current) => ({ ...current, carousel_images: images }));
            }
        } catch {
            setToast(t('admin.failed'));
            setTimeout(() => setToast(''), 4000);
        } finally {
            setUploading((u) => ({ ...u, [key]: false }));
        }
    }

    async function submit(event) {
        event.preventDefault();
        try {
            const saved = await saveAdminSettings({
                store_name: form.store_name,
                contact_email: form.contact_email || null,
                phone: form.phone,
                address: form.address,
                delivery_note: form.delivery_note,
                logo_url: form.logo_url,
                favicon_url: form.favicon_url,
                carousel_images: form.carousel_images,
            });
            apply(saved);
            setDone(true);
        } catch {
            setToast(t('admin.failed'));
            setTimeout(() => setToast(''), 4000);
        }
    }

    if (loading) {
        return <div className="h-64 animate-pulse rounded-2xl bg-white" />;
    }
    if (error) {
        return (
            <div className="rounded-2xl border border-line bg-white p-8 text-center">
                <p className="text-sm text-muted">{t('admin.error')}</p>
                <Button className="mt-4" onClick={load}>{t('admin.retry')}</Button>
            </div>
        );
    }

    return (
        <div>
            {toast ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{toast}</p> : null}
            <p className="section-kicker">{t('admin.settings')}</p>
            <h1 className="section-title">{t('admin.business_settings')}</h1>
            <p className="mt-2 text-sm text-muted">{t('admin.settings_text')}</p>
            <form onSubmit={submit} className="mt-7 max-w-2xl space-y-5 rounded-2xl border border-line bg-white p-6 sm:p-8">
                <label className="form-label">{t('admin.store_name')}<input value={form.store_name} onChange={(e) => setField('store_name', e.target.value)} className="form-input" /></label>
                <label className="form-label">{t('admin.contact_email')}<input type="email" value={form.contact_email} onChange={(e) => setField('contact_email', e.target.value)} className="form-input" /></label>
                <label className="form-label">{t('admin.phone')}<input value={form.phone} onChange={(e) => setField('phone', e.target.value)} className="form-input" /></label>
                <label className="form-label">{t('admin.address')}<input value={form.address} onChange={(e) => setField('address', e.target.value)} className="form-input" /></label>
                <label className="form-label">{t('admin.delivery_note')}<textarea rows={4} value={form.delivery_note} onChange={(e) => setField('delivery_note', e.target.value)} className="form-input resize-none" /></label>

                <ImageSlot label={t('admin.logo')} url={form.logo_url} uploading={uploading.logo} onFile={(file) => onUpload('logo', file)} onRemove={() => setField('logo_url', '')} t={t} />
                <ImageSlot label={t('admin.favicon')} url={form.favicon_url} uploading={uploading.favicon} onFile={(file) => onUpload('favicon', file)} onRemove={() => setField('favicon_url', '')} t={t} />
                <div>
                    <p className="form-label mb-3">{t('admin.carousel')}</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {form.carousel_images.map((url, index) => (
                            <ImageSlot key={index} label={`${index + 1}`} url={url} uploading={uploading[`carousel${index}`]} onFile={(file) => onUpload('carousel', file, index)} onRemove={() => setField('carousel_images', form.carousel_images.map((item, i) => (i === index ? '' : item)))} t={t} />
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Button>{t('admin.save')}</Button>
                    {done ? <span className="text-sm font-bold text-emerald-700">{t('admin.settings_saved')}</span> : null}
                </div>
            </form>
        </div>
    );
}

function ImageSlot({ label, url, uploading, onFile, onRemove, t }) {
    return (
        <div className="rounded-xl border border-line p-3">
            <p className="mb-2 text-xs font-bold text-muted">{label}</p>
            {url ? <img src={url} alt="" className="mb-3 h-24 w-full rounded-lg bg-surface object-contain" /> : <div className="mb-3 h-24 rounded-lg bg-surface" />}
            <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-lg border border-line px-3 py-2 text-xs font-bold text-navy hover:bg-surface">
                    {uploading ? '…' : t('admin.upload')}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                {url ? <button type="button" onClick={onRemove} className="rounded-lg px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">{t('admin.remove')}</button> : null}
            </div>
        </div>
    );
}
