import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct, getProducts } from '../../../api/catalog.js';
import { useI18n } from '../../../contexts/i18n.js';
import { useLanguage } from '../../../contexts/LanguageContext.jsx';
import { useCart } from '../../../contexts/CartContext.jsx';
import { categoryChain, useStorefrontData } from '../StorefrontData.jsx';
import { Button, EmptyState, Price, ProductCard, QuantityStepper, StockBadge, ProductImage } from '../ui.jsx';

export default function ProductPage() {
    const { id } = useParams();
    const t = useI18n();
    const { lang } = useLanguage();
    const { addItem } = useCart();
    const { categories } = useStorefrontData();
    const [product, setProduct] = useState(null);
    const [related, setRelated] = useState([]);
    const [status, setStatus] = useState('loading');
    const [qty, setQty] = useState(1);
    const [active, setActive] = useState(0);
    const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 });

    useEffect(() => {
        let cancelled = false;
        setStatus('loading');
        setQty(1);
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
    }, [id, lang]);

    const crumbs = useMemo(() => (product ? categoryChain(categories, product.category_id) : []), [categories, product]);
    const images = product?.images || [];
    const features = product?.features && typeof product.features === 'object' ? Object.entries(product.features) : [];

    if (status === '404') {
        return (
            <div className="mx-auto max-w-3xl px-4 py-16">
                <EmptyState
                    title={t('product.not_found')}
                    action={<Link to="/products" className="text-sm font-medium underline">{t('product.back_catalog')}</Link>}
                />
            </div>
        );
    }

    if (status !== 'ok' || !product) {
        return <div className="mx-auto max-w-7xl px-4 py-16 text-[#5C6B7A]">{t('details.loading')}</div>;
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-[#5C6B7A]">
                <Link to="/products" className="hover:text-[#0F2744]">{t('nav.catalog')}</Link>
                {crumbs.map((crumb) => (
                    <span key={crumb.id} className="flex items-center gap-1">
                        <span>/</span>
                        <Link to={`/products/category/${crumb.id}`} className="max-w-[12rem] truncate hover:text-[#0F2744]">{crumb.name}</Link>
                    </span>
                ))}
            </nav>

            <div className="grid gap-10 lg:grid-cols-2">
                <div>
                    <div
                        className="relative aspect-square overflow-hidden rounded-2xl bg-white"
                        onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setZoom({
                                on: true,
                                x: ((e.clientX - rect.left) / rect.width) * 100,
                                y: ((e.clientY - rect.top) / rect.height) * 100,
                            });
                        }}
                        onMouseLeave={() => setZoom((z) => ({ ...z, on: false }))}
                    >
                        {images[active] ? (
                            <img
                                src={images[active]}
                                alt={product.name}
                                className="h-full w-full object-contain transition-transform"
                                style={zoom.on ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
                            />
                        ) : (
                            <ProductImage src="" alt={product.name} className="h-full w-full" />
                        )}
                    </div>
                    {images.length > 1 ? (
                        <div className="mt-3 flex gap-2 overflow-x-auto">
                            {images.map((src, i) => (
                                <button key={src + i} type="button" className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${i === active ? 'border-[#C9A227]' : 'border-transparent'}`} onClick={() => setActive(i)}>
                                    <img src={src} alt="" className="h-full w-full object-contain" />
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div>
                    <StockBadge product={product} />
                    <h1 className="mt-3 break-words text-2xl font-semibold sm:text-3xl">{product.name}</h1>
                    <p className="mt-2 text-sm text-[#5C6B7A]">{t('product.code')}: {product.product_code}</p>
                    {product.brand ? <p className="text-sm text-[#5C6B7A]">{t('product.brand')}: {product.brand}</p> : null}
                    <div className="mt-4 text-3xl"><Price value={product.price} /></div>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <QuantityStepper value={qty} onChange={setQty} disabled={!product.in_stock} />
                        <Button disabled={!product.in_stock} onClick={() => addItem(product, qty)}>
                            {product.in_stock ? t('product.add_to_cart') : t('product.out_of_stock')}
                        </Button>
                    </div>
                </div>
            </div>

            {features.length ? (
                <section className="mt-12">
                    <h2 className="mb-4 text-xl font-semibold">{t('product.specs')}</h2>
                    <div className="overflow-x-auto rounded-2xl border border-[#0F2744]/10 bg-white">
                        <table className="w-full text-sm">
                            <tbody>
                                {features.map(([key, value]) => (
                                    <tr key={key} className="border-b border-[#0F2744]/8 last:border-0">
                                        <th className="w-1/3 px-4 py-3 text-left font-medium text-[#5C6B7A]">{key}</th>
                                        <td className="px-4 py-3 break-words">{String(value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}

            {product.description ? (
                <section className="mt-12">
                    <h2 className="mb-4 text-xl font-semibold">{t('product.description')}</h2>
                    <div className="product-html rounded-2xl bg-white p-6 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: product.description }} />
                </section>
            ) : null}

            {related.length ? (
                <section className="mt-12">
                    <h2 className="mb-4 text-xl font-semibold">{t('product.related')}</h2>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {related.map((item) => <ProductCard key={item.id} product={item} />)}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
