import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getProducts } from '../../../api/catalog.js';
import { useI18n } from '../../../contexts/i18n.js';
import { useLanguage } from '../../../contexts/LanguageContext.jsx';
import { useStorefrontData } from '../StorefrontData.jsx';
import CategoryIcon from '../CategoryIcon.jsx';
import { ProductCard, ProductSkeleton } from '../ui.jsx';

export default function HomePage() {
    const t = useI18n();
    const { lang } = useLanguage();
    const { settings, categories } = useStorefrontData();
    const [featured, setFeatured] = useState([]);
    const [loading, setLoading] = useState(true);
    const slides = (settings.carousel_images || []).filter(Boolean);

    const tiles = categories
        .filter((c) => c.parent_id == null && c.nav_order != null)
        .slice()
        .sort((a, b) => a.nav_order - b.nav_order);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getProducts({ featured: 1, per_page: 8 })
            .then((data) => {
                if (cancelled) return data;
                if (data.total > 0) return data;
                return getProducts({ sort: 'newest', in_stock: true, per_page: 8 });
            })
            .then((data) => {
                if (!cancelled) setFeatured(data.products || []);
            })
            .catch(() => {
                if (!cancelled) setFeatured([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [lang]);

    return (
        <div>
            <Hero slides={slides} fallbackLabel={t('home.hero_fallback')} shopLabel={t('home.shop')} />

            <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-end justify-between">
                    <h2 className="text-2xl font-semibold">{t('home.categories')}</h2>
                    <Link to="/products" className="text-sm font-medium text-[#0F2744] underline">{t('home.view_all')}</Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {tiles.map((cat) => (
                        <Link key={cat.id} to={`/products/category/${cat.id}`} className="flex flex-col gap-3 rounded-2xl border border-[#0F2744]/8 bg-white p-4 shadow-sm transition hover:border-[#C9A227] hover:shadow-md">
                            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0F2744] text-white">
                                <CategoryIcon id={cat.id} className="h-5 w-5" />
                            </span>
                            <span className="break-words text-sm font-semibold leading-snug">{cat.name}</span>
                            <span className="text-xs text-[#7A8794]">{cat.product_count} {t('home.products_count')}</span>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
                <h2 className="mb-6 text-2xl font-semibold">{t('home.featured')}</h2>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {loading
                        ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
                        : featured.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
            </section>

            <section className="bg-white">
                <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:px-8">
                    <h2 className="sr-only">{t('home.trust.title')}</h2>
                    {[
                        ['home.trust.stock', 'home.trust.stock_body'],
                        ['home.trust.support', 'home.trust.support_body'],
                        ['home.trust.b2b', 'home.trust.b2b_body'],
                    ].map(([title, body]) => (
                        <div key={title}>
                            <h3 className="font-semibold">{t(title)}</h3>
                            <p className="mt-2 text-sm text-[#5C6B7A]">{t(body)}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function Hero({ slides, fallbackLabel, shopLabel }) {
    const [index, setIndex] = useState(0);
    const startX = useRef(null);
    const count = slides.length;

    useEffect(() => {
        if (count <= 1) return undefined;
        const id = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
        return () => clearInterval(id);
    }, [count]);

    function go(next) {
        if (count === 0) return;
        setIndex((next + count) % count);
    }

    return (
        <section className="relative overflow-hidden bg-[#0F2744]">
            <div
                className="relative mx-auto h-64 max-w-7xl sm:h-80 lg:h-[28rem]"
                onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                    if (startX.current == null) return;
                    const dx = e.changedTouches[0].clientX - startX.current;
                    if (dx > 40) go(index - 1);
                    if (dx < -40) go(index + 1);
                    startX.current = null;
                }}
            >
                {count === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center text-white">
                        <h1 className="max-w-2xl text-3xl font-semibold sm:text-4xl">{fallbackLabel}</h1>
                        <Link to="/products" className="rounded-lg bg-[#C9A227] px-5 py-2.5 text-sm font-medium text-[#0F2744]">{shopLabel}</Link>
                    </div>
                ) : (
                    slides.map((src, i) => (
                        <img
                            key={src}
                            src={src}
                            alt=""
                            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
                        />
                    ))
                )}
                {count > 1 ? (
                    <>
                        <button type="button" className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/80" aria-label="Previous" onClick={() => go(index - 1)}>
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button type="button" className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/80" aria-label="Next" onClick={() => go(index + 1)}>
                            <ChevronRight className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                            {slides.map((_, i) => (
                                <button key={i} type="button" aria-label={`Slide ${i + 1}`} className={`h-2 w-2 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'}`} onClick={() => go(i)} />
                            ))}
                        </div>
                    </>
                ) : null}
            </div>
        </section>
    );
}
