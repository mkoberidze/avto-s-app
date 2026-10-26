import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Headphones, PackageCheck, ShieldCheck, Wrench } from 'lucide-react';
import { getProducts } from '../../../api/catalog.js';
import { useI18n } from '../../../contexts/i18n.js';
import { navCategoryRoots, useStorefrontData } from '../StorefrontData.jsx';
import { ProductCard, ProductSkeleton } from '../ui.jsx';

export default function HomePage() {
    const t = useI18n();
    const { settings, categories } = useStorefrontData();
    const [featured, setFeatured] = useState([]);
    const [loading, setLoading] = useState(true);
    const images = (settings.carousel_images || []).filter(Boolean);

    const tiles = navCategoryRoots(categories);

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
    }, []);

    const slides = [
        { title: t('home.hero1Title'), text: t('home.hero1Text') },
        { title: t('home.hero2Title'), text: t('home.hero2Text') },
        { title: t('home.hero3Title'), text: t('home.hero3Text') },
    ];

    return (
        <>
            <Hero slides={slides} images={images} t={t} />

            <section className="container-shell section-space">
                <div className="mb-8 flex items-end justify-between gap-4">
                    <div>
                        <p className="section-kicker">{t('home.categories')}</p>
                        <h2 className="section-title">{t('home.categories_text')}</h2>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {tiles.map((cat, index) => (
                        <Link key={cat.id} to={`/products/category/${cat.id}`} className="group relative min-h-64 overflow-hidden rounded-xl border border-line bg-surface p-7 transition hover:border-navy/30 hover:shadow-card">
                            <span className="text-6xl font-black text-navy/5">{String(index + 1).padStart(2, '0')}</span>
                            <div className="absolute inset-x-7 bottom-7">
                                <div className={`mb-4 h-1 w-12 rounded-full ${index === 0 ? 'bg-accent' : 'bg-navy'}`} />
                                <h3 className="text-xl font-bold text-navy break-words">{cat.name}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted">{cat.product_count} {t('home.products_count')}</p>
                                <ArrowRight className="mt-5 transition group-hover:translate-x-1" size={18} />
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="bg-surface">
                <div className="container-shell section-space">
                    <div className="mb-8 flex items-end justify-between gap-4">
                        <div>
                            <p className="section-kicker">{t('home.featured')}</p>
                            <h2 className="section-title">{t('home.featured')}</h2>
                        </div>
                        <Link to="/products" className="shrink-0 text-sm font-bold text-accent hover:text-accent-dark">{t('home.view_all')}</Link>
                    </div>
                    <div className="grid auto-cols-[78%] grid-flow-col gap-4 overflow-x-auto pb-3 sm:auto-cols-[45%] lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible">
                        {loading
                            ? Array.from({ length: 8 }, (_, i) => <ProductSkeleton key={i} />)
                            : featured.map((product) => <ProductCard key={product.id} product={product} />)}
                    </div>
                </div>
            </section>

            <section className="container-shell py-10">
                <div className="grid divide-y divide-line rounded-xl border border-line bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                    {[
                        [Wrench, 'home.installation', 'home.installation_text'],
                        [ShieldCheck, 'home.warranty', 'home.warranty_text'],
                        [Headphones, 'home.support', 'home.support_text'],
                        [PackageCheck, 'home.delivery', 'home.delivery_text'],
                    ].map(([Icon, title, text]) => (
                        <div key={title} className="flex gap-4 p-6">
                            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><Icon size={21} /></span>
                            <div>
                                <h3 className="text-sm font-bold text-navy">{t(title)}</h3>
                                <p className="mt-1 text-xs leading-5 text-muted">{t(text)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
}

function Hero({ slides, images, t }) {
    const [slide, setSlide] = useState(0);
    const touch = useRef(0);

    useEffect(() => {
        const timer = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6000);
        return () => clearInterval(timer);
    }, [slides.length]);

    function move(direction) {
        setSlide((slide + direction + slides.length) % slides.length);
    }

    return (
        <section className="container-shell pt-5 sm:pt-7">
            <div
                onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                    const delta = e.changedTouches[0].clientX - touch.current;
                    if (Math.abs(delta) > 45) move(delta > 0 ? -1 : 1);
                }}
                className="relative min-h-[31rem] overflow-hidden rounded-2xl bg-navy sm:min-h-[34rem]"
            >
                {images.map((image, index) => (
                    <img key={image} src={image} alt="" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${index === slide % Math.max(images.length, 1) ? 'opacity-45' : 'opacity-0'}`} />
                ))}
                <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/75 to-navy/10" />
                <div className="relative z-10 flex min-h-[31rem] max-w-3xl flex-col justify-center px-6 py-16 text-white sm:min-h-[34rem] sm:px-12 lg:px-20">
                    <div className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-white/70">
                        <span className="h-px w-8 bg-accent" />
                        {t('home.hero_eyebrow')}
                    </div>
                    <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">{slides[slide].title}</h1>
                    <p className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg">{slides[slide].text}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link to="/products" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold hover:bg-accent-dark">{t('home.explore')}<ArrowRight size={17} /></Link>
                        <Link to="/contact" className="inline-flex min-h-12 items-center rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold backdrop-blur hover:bg-white/20">{t('home.consultation')}</Link>
                    </div>
                </div>
                <div className="absolute bottom-6 right-6 z-20 flex gap-2">
                    <button type="button" aria-label={t('home.prev')} onClick={() => move(-1)} className="grid size-11 place-items-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20"><ChevronLeft size={20} /></button>
                    <button type="button" aria-label={t('home.next')} onClick={() => move(1)} className="grid size-11 place-items-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20"><ChevronRight size={20} /></button>
                </div>
                <div className="absolute bottom-8 left-6 z-20 flex gap-2 sm:left-12 lg:left-20">
                    {slides.map((_, index) => (
                        <button key={index} type="button" aria-label={`${index + 1}`} onClick={() => setSlide(index)} className={`h-1.5 rounded-full transition-all ${index === slide ? 'w-8 bg-accent' : 'w-4 bg-white/40'}`} />
                    ))}
                </div>
            </div>
        </section>
    );
}
