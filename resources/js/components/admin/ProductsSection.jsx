import React, { useEffect, useState } from 'react';
import { Pencil, Search, X } from 'lucide-react';
import { getAdminCategories, getAdminProduct, getAdminProducts, updateAdminProduct } from '../../api/admin.js';
import { getBrands } from '../../api/catalog.js';
import { useI18n } from '../../contexts/i18n.js';
import { Button, formatPrice } from '../storefront/ui.jsx';

export default function ProductsSection() {
    const t = useI18n();
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [toast, setToast] = useState('');
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('all');
    const [featured, setFeatured] = useState(false);
    const [categoryId, setCategoryId] = useState('');
    const [brand, setBrand] = useState('');
    const [sort, setSort] = useState('newest');
    const [translation, setTranslation] = useState('');
    const [translationLang, setTranslationLang] = useState('en');
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const perPage = 25;

    useEffect(() => {
        getAdminCategories().then((rows) => setCategories(Array.isArray(rows) ? rows : [])).catch(() => {});
        getBrands().then((rows) => setBrands(Array.isArray(rows) ? rows : [])).catch(() => {});
    }, []);

    function load(nextPage = page) {
        setLoading(true);
        setError(false);
        const params = { page: nextPage, per_page: perPage, sort, status };
        if (q.trim()) params.q = q.trim();
        if (featured) params.featured = 1;
        if (categoryId) params.category_id = categoryId;
        if (brand) params.brand = brand;
        if (translation) {
            params.translation = translation;
            params.lang = translationLang;
        }
        return getAdminProducts(params)
            .then((data) => {
                setItems(data.products || []);
                setTotal(data.total || 0);
                setPage(data.page || nextPage);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        load(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, featured, categoryId, brand, sort, translation, translationLang]);

    async function toggle(product, field) {
        const previous = items;
        const nextValue = !product[field];
        setItems((rows) => rows.map((row) => (row.id === product.id ? { ...row, [field]: nextValue } : row)));
        try {
            const saved = await updateAdminProduct(product.id, { [field]: nextValue });
            setItems((rows) => rows.map((row) => (row.id === product.id ? { ...row, ...pickList(saved) } : row)));
        } catch {
            setItems(previous);
            setToast(t('admin.failed'));
            setTimeout(() => setToast(''), 4000);
        }
    }

    const pages = Math.max(1, Math.ceil(total / perPage));

    return (
        <div>
            {toast ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{toast}</p> : null}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="section-kicker">{t('admin.inventory')}</p>
                    <h1 className="section-title">{t('admin.products')}</h1>
                    <p className="mt-2 text-sm text-muted">{t('admin.inventory_text')}</p>
                </div>
            </div>
            <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-white">
                <form
                    onSubmit={(e) => { e.preventDefault(); load(1); }}
                    className="flex flex-wrap items-center gap-3 border-b border-line p-4"
                >
                    <label className="relative min-w-0 flex-1 sm:max-w-sm">
                        <Search className="absolute left-3 top-3 text-muted" size={17} />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.search')} className="h-11 w-full rounded-lg border border-line bg-surface pl-10 pr-3 text-sm outline-none focus:border-accent" />
                    </label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy">
                        <option value="all">{t('admin.status_all')}</option>
                        <option value="visible">{t('admin.visible')}</option>
                        <option value="hidden">{t('admin.hidden')}</option>
                        <option value="gone">{t('admin.gone')}</option>
                    </select>
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-11 max-w-48 rounded-lg border border-line bg-white px-3 text-sm">
                        <option value="">{t('catalog.categories')}</option>
                        {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name_ka}</option>)}
                    </select>
                    <select value={brand} onChange={(e) => setBrand(e.target.value)} className="h-11 max-w-40 rounded-lg border border-line bg-white px-3 text-sm">
                        <option value="">{t('catalog.brands')}</option>
                        {brands.map((row) => <option key={row.name} value={row.name}>{row.name}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm font-semibold text-navy">
                        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-accent" />
                        {t('admin.featured')}
                    </label>
                    <select value={translation} onChange={(e) => setTranslation(e.target.value)} className="h-11 rounded-lg border border-line bg-white px-3 text-sm">
                        <option value="">{t('admin.translation_filter')}</option>
                        <option value="missing">{t('admin.translation_missing')}</option>
                        <option value="machine">{t('admin.translation_machine')}</option>
                        <option value="manual">{t('admin.translation_manual')}</option>
                    </select>
                    <select value={translationLang} onChange={(e) => setTranslationLang(e.target.value)} className="h-11 rounded-lg border border-line bg-white px-3 text-sm">
                        <option value="en">{t('admin.lang_en')}</option>
                        <option value="ru">{t('admin.lang_ru')}</option>
                    </select>
                    <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 rounded-lg border border-line bg-white px-3 text-sm">
                        <option value="newest">{t('catalog.sort.newest')}</option>
                        <option value="name">{t('catalog.sort.name')}</option>
                        <option value="priceAsc">{t('catalog.sort.priceAsc')}</option>
                        <option value="priceDesc">{t('catalog.sort.priceDesc')}</option>
                    </select>
                    <span className="ml-auto text-sm text-muted">{total} {t('admin.products').toLowerCase()}</span>
                </form>
                {error ? (
                    <div className="p-8 text-center">
                        <p className="text-sm text-muted">{t('admin.error')}</p>
                        <Button className="mt-4" onClick={() => load(page)}>{t('admin.retry')}</Button>
                    </div>
                ) : loading ? (
                    <div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}</div>
                ) : items.length === 0 ? (
                    <p className="p-10 text-center text-sm text-muted">{t('admin.empty')}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-4xl text-left text-sm">
                            <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">{t('admin.product_name')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('admin.sku')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('catalog.brands')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('stock.in')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('catalog.price')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('admin.status')}</th>
                                    <th className="px-5 py-3 text-right font-semibold">{t('admin.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {items.map((product) => (
                                    <tr key={product.id} className="hover:bg-surface/60">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                {product.image ? <img src={product.image} alt="" className="size-12 rounded-lg bg-surface object-cover" /> : <span className="size-12 rounded-lg bg-surface" />}
                                                <div>
                                                    <p className="max-w-sm line-clamp-2 font-bold text-navy">{product.name_ka}</p>
                                                    <p className="mt-1 flex flex-wrap gap-1">
                                                        <TranslationBadge lang="EN" state={product.translation_en} t={t} />
                                                        <TranslationBadge lang="RU" state={product.translation_ru} t={t} />
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 font-semibold text-muted">{product.product_code}</td>
                                        <td className="px-5 py-4 text-muted">{product.brand}</td>
                                        <td className="px-5 py-4"><StockPill product={product} t={t} /></td>
                                        <td className="whitespace-nowrap px-5 py-4 font-bold">{formatPrice(product.price)}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {product.is_hidden ? <Badge className="bg-slate-100 text-slate-700">{t('admin.hidden')}</Badge> : null}
                                                {!product.in_feed ? <Badge className="bg-red-50 text-red-700">{t('admin.gone')}</Badge> : null}
                                                {product.is_featured ? <Badge className="bg-amber-50 text-amber-700">{t('admin.featured')}</Badge> : null}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-1">
                                                <button type="button" onClick={() => toggle(product, 'is_hidden')} className="rounded-lg px-2 py-1 text-xs font-bold text-muted hover:bg-surface">{product.is_hidden ? t('admin.show') : t('admin.hide')}</button>
                                                <button type="button" onClick={() => toggle(product, 'is_featured')} className="rounded-lg px-2 py-1 text-xs font-bold text-muted hover:bg-surface">{product.is_featured ? t('admin.unfeature') : t('admin.feature')}</button>
                                                <button type="button" onClick={() => setEditingId(product.id)} aria-label={t('admin.edit')} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-blue-50 hover:text-blue-700"><Pencil size={16} /></button>
                                            </div>
                                        </td>
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
                            <Button variant="ghost" disabled={page <= 1} onClick={() => load(page - 1)}>{t('home.prev')}</Button>
                            <Button variant="ghost" disabled={page >= pages} onClick={() => load(page + 1)}>{t('home.next')}</Button>
                        </div>
                    </div>
                ) : null}
            </div>
            {editingId ? (
                <ProductEditor
                    id={editingId}
                    onClose={() => setEditingId(null)}
                    onSaved={() => { setEditingId(null); load(page); }}
                    onFail={() => { setToast(t('admin.failed')); setTimeout(() => setToast(''), 4000); }}
                />
            ) : null}
        </div>
    );
}

function Badge({ className, children }) {
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

function TranslationBadge({ lang, state, t }) {
    const label = state === 'manual' ? t('admin.translation_manual') : state === 'machine' ? t('admin.translation_machine') : t('admin.translation_missing');
    const cls = state === 'manual' ? 'bg-emerald-50 text-emerald-700' : state === 'machine' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600';
    return <Badge className={cls}>{lang} {label}</Badge>;
}

function FieldBadge({ product, lang, field, t }) {
    const value = product.translations?.[lang]?.[field];
    const manual = Array.isArray(product.translations?.[lang]?._manual) && product.translations[lang]._manual.includes(field);
    if (manual) return <span className="ml-2 text-xs font-bold uppercase tracking-wide text-emerald-700">{t('admin.manual_translation')}</span>;
    if (value) return <span className="ml-2 text-xs font-bold uppercase tracking-wide text-blue-700">{t('admin.machine_translated')}</span>;
    return null;
}

function StockPill({ product, t }) {
    if (!product.in_stock) return <Badge className="bg-red-50 text-red-700">{t('stock.out')}</Badge>;
    if (product.stock_level === '*') return <Badge className="bg-amber-50 text-amber-700">{t('stock.low')}</Badge>;
    return <Badge className="bg-emerald-50 text-emerald-700">{t('stock.in')}</Badge>;
}

function pickList(detail) {
    return {
        id: detail.id,
        product_code: detail.product_code,
        name_ka: detail.name_ka,
        brand: detail.brand,
        category_id: detail.category_id,
        price: detail.price,
        in_stock: detail.in_stock,
        stock_level: detail.stock_level,
        in_feed: detail.in_feed,
        is_hidden: detail.is_hidden,
        is_featured: detail.is_featured,
        image: detail.image,
        has_en: detail.has_en,
        has_ru: detail.has_ru,
        translation_en: detail.translation_en,
        translation_ru: detail.translation_ru,
    };
}

function ProductEditor({ id, onClose, onSaved, onFail }) {
    const t = useI18n();
    const [product, setProduct] = useState(null);
    const [lang, setLang] = useState('en');
    const [form, setForm] = useState({ en: { name: '', short_description: '', description: '' }, ru: { name: '', short_description: '', description: '' } });
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getAdminProduct(id).then((data) => {
            setProduct(data);
            setForm({
                en: {
                    name: data.translations?.en?.name || '',
                    short_description: data.translations?.en?.short_description || '',
                    description: data.translations?.en?.description || '',
                },
                ru: {
                    name: data.translations?.ru?.name || '',
                    short_description: data.translations?.ru?.short_description || '',
                    description: data.translations?.ru?.description || '',
                },
            });
        }).catch(onFail);
    }, [id]);

    useEffect(() => {
        if (!dirty) return undefined;
        const onBefore = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', onBefore);
        return () => window.removeEventListener('beforeunload', onBefore);
    }, [dirty]);

    function close() {
        if (dirty && !window.confirm(t('admin.unsaved'))) return;
        onClose();
    }

    function change(field, value) {
        setDirty(true);
        setForm((current) => ({ ...current, [lang]: { ...current[lang], [field]: value } }));
    }

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        try {
            await updateAdminProduct(id, { translations: form });
            setDirty(false);
            onSaved();
        } catch {
            onFail();
        } finally {
            setSaving(false);
        }
    }

    if (!product) {
        return <><button type="button" onClick={onClose} aria-label={t('common.close')} className="fixed inset-0 z-50 bg-navy/50" /><aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl bg-white p-8"><div className="h-40 animate-pulse rounded-xl bg-slate-100" /></aside></>;
    }

    return (
        <>
            <button type="button" onClick={close} aria-label={t('common.close')} className="fixed inset-0 z-50 bg-navy/50" />
            <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-6 py-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-accent">{t('admin.inventory')}</p>
                        <h2 className="mt-1 text-xl font-black text-navy">{t('admin.edit_product')}</h2>
                    </div>
                    <button type="button" onClick={close} aria-label={t('common.close')} className="grid size-10 place-items-center rounded-lg hover:bg-surface"><X size={20} /></button>
                </div>
                <form onSubmit={submit} className="grid gap-5 p-6">
                    <p className="rounded-lg bg-surface px-4 py-3 text-xs leading-5 text-muted"><strong className="text-navy">{t('admin.synced')}.</strong> {t('admin.synced_note')}</p>
                    <label className="form-label">{t('admin.product_name')}<input readOnly value={product.name_ka || ''} className="form-input bg-surface" /></label>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <label className="form-label">{t('admin.sku')}<input readOnly value={product.product_code || ''} className="form-input bg-surface" /></label>
                        <label className="form-label">{t('catalog.brands')}<input readOnly value={product.brand || ''} className="form-input bg-surface" /></label>
                        <label className="form-label">{t('catalog.price')}<input readOnly value={formatPrice(product.price)} className="form-input bg-surface" /></label>
                        <label className="form-label">{t('stock.in')}<input readOnly value={product.in_stock ? product.stock_level || t('stock.in') : t('stock.out')} className="form-input bg-surface" /></label>
                    </div>
                    <label className="form-label">{t('admin.short_description')}<textarea readOnly rows={3} value={product.short_description_ka || ''} className="form-input resize-none bg-surface" /></label>
                    <label className="form-label">{t('admin.description')}<textarea readOnly rows={5} value={product.description_ka || ''} className="form-input resize-none bg-surface" /></label>
                    <div className="flex gap-2 border-b border-line">
                        {['en', 'ru'].map((code) => (
                            <button key={code} type="button" onClick={() => setLang(code)} className={`border-b-2 px-4 py-3 text-sm font-bold ${lang === code ? 'border-accent text-accent' : 'border-transparent text-muted'}`}>
                                {t(code === 'en' ? 'admin.lang_en' : 'admin.lang_ru')} {code === 'en' ? (product.has_en ? '✓' : '') : (product.has_ru ? '✓' : '')}
                            </button>
                        ))}
                    </div>
                    <label className="form-label">{t('admin.product_name')}<FieldBadge product={product} lang={lang} field="name" t={t} /><input value={form[lang].name} onChange={(e) => change('name', e.target.value)} className="form-input" /></label>
                    <label className="form-label">{t('admin.short_description')}<FieldBadge product={product} lang={lang} field="short_description" t={t} /><textarea rows={3} value={form[lang].short_description} onChange={(e) => change('short_description', e.target.value)} className="form-input resize-none" /></label>
                    <label className="form-label">{t('admin.description')}<FieldBadge product={product} lang={lang} field="description" t={t} /><textarea rows={8} value={form[lang].description} onChange={(e) => change('description', e.target.value)} className="form-input resize-none" /></label>
                    <div className="flex justify-end gap-3 border-t border-line pt-5">
                        <Button type="button" variant="ghost" onClick={close}>{t('admin.cancel')}</Button>
                        <Button disabled={saving}>{t('admin.save')}</Button>
                    </div>
                </form>
            </aside>
        </>
    );
}
