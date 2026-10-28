import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, ShoppingCart } from 'lucide-react';
import { getProduct, getProducts } from '../../../api/catalog.js';
import { useI18n } from '../../../contexts/i18n.js';
import { useCart } from '../../../contexts/CartContext.jsx';
import { categoryChain, useStorefrontData } from '../StorefrontData.jsx';
import { Button, EmptyState, Price, ProductCard, ProductSkeleton, QuantityStepper, StockBadge, ProductImage, isPurchasable } from '../ui.jsx';

export default function ProductPage() {
    const { id } = useParams();
    const t = useI18n();
    const { addItem } = useCart();
    const { categories } = useStorefrontData();
    const [product, setProduct] = useState(null);
    const [related, setRelated] = useState([]);
    const [status, setStatus] = useState('loading');
    const [qty, setQty] = useState(1);
    const [active, setActive] = useState(0);
    const [tab, setTab] = useState('description');
    const [zoom, setZoom] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setStatus('loading');
        setQty(1);
        setTab('description');
        getProduct(id)
            .then((data) => {
                if (cancelled) return;
                setProduct(data);
                setActive(0);
                setStatus('ok');
                if (data.category_id) {
                    getProducts({ category_id: data.category_id, per_page: 5, sort: 'newest' })
                        .then((list) => {
                            if (!cancelled) {
                                setRelated((list.products || []).filter((item) => item.id !== String(data.id)).slice(0, 4));
                            }
                        })
                        .catch(() => {});
                }
            })
            .catch((err) => {
                if (!cancelled) setStatus(err.response?.status === 404 ? '404' : 'error');
            });
        return () => { cancelled = true; };
    }, [id]);

    const crumbs = useMemo(() => (product ? categoryChain(categories, product.category_id) : []), [categories, product]);
    const images = product?.images || [];
    const features = product?.features && typeof product.features === 'object' ? Object.entries(product.features) : [];

    if (status === '404' || status === 'error') {
        return (
            <div className="container-shell py-16">
                <EmptyState
                    title={t(status === '404' ? 'product.not_found' : 'catalog.error')}
                    action={<Link to="/products"><Button variant="ghost">{t('product.back_catalog')}</Button></Link>}
                />
            </div>
        );
    }

    if (status !== 'ok' || !product) {
        return (
            <div className="container-shell py-12">
                <div className="grid gap-8 md:grid-cols-2">
                    <ProductSkeleton />
                    <div className="space-y-5 pt-10">
                        <div className="h-7 animate-pulse rounded bg-slate-100" />
                        <div className="h-7 w-2/3 animate-pulse rounded bg-slate-100" />
                        <div className="h-20 animate-pulse rounded bg-slate-100" />
                    </div>
                </div>
            </div>
        );
    }

    const tabs = [['description', t('product.description')], ['specifications', t('product.specs')]];

    return (
        <div className="container-shell py-7 sm:py-10">
            <nav className="mb-7 flex items-center gap-2 text-xs text-muted">
                <Link to="/">{t('nav.home')}</Link>
                <ChevronRight size={13} />
                <Link to="/products">{t('nav.catalog')}</Link>
                {crumbs.map((crumb) => (
                    <span key={crumb.id} className="flex min-w-0 items-center gap-2">
                        <ChevronRight size={13} />
                        <Link to={`/products/category/${crumb.id}`} className="max-w-[10rem] truncate">{crumb.name}</Link>
                    </span>
                ))}
                <ChevronRight size={13} />
                <span className="truncate text-navy">{product.name}</span>
            </nav>
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
                <div>
                    <button type="button" aria-label={t('product.zoom')} onClick={() => images[active] && setZoom(true)} className="group block aspect-square w-full overflow-hidden rounded-xl border border-line bg-surface">
                        {images[active] ? (
                            <img src={images[active]} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        ) : (
                            <ProductImage src="" alt={product.name} className="h-full w-full" />
                        )}
                    </button>
                    {images.length > 1 ? (
                        <div className="mt-3 flex gap-3 overflow-x-auto">
                            {images.map((src, i) => (
                                <button key={src + i} type="button" onClick={() => setActive(i)} className={`size-20 shrink-0 overflow-hidden rounded-lg border-2 bg-surface ${i === active ? 'border-accent' : 'border-transparent'}`}>
                                    <img src={src} alt={product.name} className="h-full w-full object-cover" />
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
                <div className="py-2">
                    {product.brand ? <span className="text-xs font-bold uppercase tracking-wider text-accent">{product.brand}</span> : null}
                    <h1 className="mt-3 break-words text-3xl font-black leading-tight text-navy sm:text-4xl">{product.name}</h1>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
                        <span>{t('product.code')}: <strong className="text-navy">{product.product_code}</strong></span>
                        <StockBadge product={product} />
                    </div>
                    <div className="my-7 border-y border-line py-6">
                        <Price value={product.price} size="large" onRequest={product.price_on_request} />
                    </div>
                    <label className="mb-3 block text-sm font-bold text-navy">{t('product.qty')}</label>
                    <div className="flex flex-wrap gap-3">
                        <QuantityStepper value={qty} onChange={setQty} disabled={!isPurchasable(product)} />
                        <Button disabled={!isPurchasable(product)} onClick={() => addItem(product, qty)} className="flex-1 sm:flex-none">
                            <ShoppingCart size={18} />
                            {isPurchasable(product)
                                ? t('product.add_to_cart')
                                : product.in_stock
                                    ? t('product.price_on_request')
                                    : t('product.out_of_stock')}
                        </Button>
                    </div>
                </div>
            </div>
            <section className="mt-14">
                <div className="flex overflow-x-auto border-b border-line">
                    {tabs.map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={`shrink-0 border-b-2 px-5 py-4 text-sm font-bold transition ${tab === key ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-navy'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="min-h-48 py-8">
                    {tab === 'description' ? (
                        product.description
                            ? <div className="product-html max-w-3xl leading-8 text-muted" dangerouslySetInnerHTML={{ __html: product.description }} />
                            : <p className="max-w-3xl leading-8 text-muted">—</p>
                    ) : (
                        <div className="max-w-3xl overflow-hidden rounded-xl border border-line">
                            {features.length ? features.map(([key, value], i) => (
                                <div key={key} className={`grid grid-cols-2 gap-4 px-5 py-4 text-sm ${i % 2 ? 'bg-surface' : 'bg-white'}`}>
                                    <span className="text-muted">{key}</span>
                                    <strong className="break-words text-navy">{String(value)}</strong>
                                </div>
                            )) : <p className="px-5 py-4 text-sm text-muted">—</p>}
                        </div>
                    )}
                </div>
            </section>
            {related.length ? (
                <section className="mt-10">
                    <h2 className="section-title mb-7">{t('product.related')}</h2>
                    <div className="grid auto-cols-[75%] grid-flow-col gap-4 overflow-x-auto pb-3 sm:auto-cols-[42%] lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible">
                        {related.map((item) => <ProductCard key={item.id} product={item} />)}
                    </div>
                </section>
            ) : null}
            {zoom && images[active] ? (
                <div onClick={() => setZoom(false)} className="fixed inset-0 z-[70] grid cursor-zoom-out place-items-center bg-navy/90 p-5">
                    <img src={images[active]} alt={product.name} className="max-h-full max-w-full rounded-xl object-contain" />
                </div>
            ) : null}
        </div>
    );
}
