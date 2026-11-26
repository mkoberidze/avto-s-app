import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Headphones, PackageCheck, ShieldCheck, Wrench } from 'lucide-react';
import { getProducts } from '../../../api/catalog.js';
import { useI18n } from '../../../contexts/i18n.js';
import { navCategoryRoots, useStorefrontData } from '../StorefrontData.jsx';
import { ProductCard, ProductSkeleton } from '../ui.jsx';

const categoryCards = [
    { name: 'ვიდეო მეთვალყურეობა', image: 'cctv.jpg', description: 'IP კამერები, ჩამწერები და ქსელური მოწყობილობები' },
    { name: 'სახანძრო სისტემები', image: 'fire.jpg', description: 'პანელები, დეტექტორები და შეტყობინების მოწყობილობები' },
    { name: 'დაშვების სისტემები', image: 'access.jpg', description: 'კონტროლერები, წამკითხველები და გასასვლელი ღილაკები' },
    { name: 'დაცვითი სიგნალიზაცია', image: 'alarm.jpg', description: 'მოძრაობის სენსორები, პანელები და სირენები' },
    { name: 'AJAX', image: 'ajax.jpg', description: 'უსადენო უსაფრთხოების სისტემები და აქსესუარები' },
    { name: 'EZVIZ - ჭკვიანი სახლი', image: 'ezviz.jpg', description: 'ჭკვიანი კამერები და სახლის დისტანციური მართვა' },
    { name: 'ქსელური მოწყობილობები', image: 'network.jpg', description: 'კომუტატორები, მარშრუტიზატორები და PoE მოწყობილობები' },
    { name: 'კაბელები', image: 'cables.jpg', description: 'ქსელური და უსაფრთხოების სისტემების კაბელები' },
];

export default function HomePage() {
    const t = useI18n();
    const { settings, categories } = useStorefrontData();
    const [featured, setFeatured] = useState([]);
    const [loading, setLoading] = useState(true);
    const images = [
        settings.carousel_images?.[0] || 'https://images.unsplash.com/photo-1738724149254-bf9ef3d0ea45?auto=format&fit=crop&w=1800&q=85',
        settings.carousel_images?.[1] || '/images/carousele-pic-2.avif',
        settings.carousel_images?.[2] || 'https://images.unsplash.com/photo-1664289262417-93f2d037adff?auto=format&fit=crop&w=1800&q=85',
    ];

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
            <section className="container-shell pt-6 sm:pt-8">
                <Link
                    to="/products?brand=AJAX&brand=EZVIZ"
                    aria-label="Black Friday: 15% off AJAX and EZVIZ"
                    className="block overflow-hidden rounded-xl border border-line transition hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                    <img
                        src="/images/black-friday-banner.jpg"
                        alt="Black Friday: 15% ფასდაკლება AJAX და EZVIZ პროდუქტებზე"
                        className="block h-auto w-full"
                    />
                </Link>
            </section>

            <Hero slides={slides} images={images} t={t} />

            <section className="container-shell section-space">
                <div className="mb-8 flex items-end justify-between gap-4">
                    <div>
                        <p className="section-kicker">{t('home.categories')}</p>
                        <h2 className="section-title">{t('home.categories_text')}</h2>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {categoryCards.map((card, index) => {
                        const category = tiles.find((item) => item.name === card.name);
                        if (!category) return null;

                        return (
                            <Link
                                key={category.id}
                                to={`/products/category/${category.id}`}
                                className="group relative isolate flex min-h-[340px] min-w-0 flex-col justify-between overflow-hidden rounded-xl bg-navy p-6 text-white shadow-sm transition-shadow duration-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4"
                            >
                                <img src={`/images/categories/${card.image}`} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-[65%_center] transition-transform duration-700 group-hover:scale-105 motion-reduce:transform-none" />
                                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#061725] via-[#061725]/75 to-[#061725]/10" />
                                <span className="w-fit rounded-md border border-white/30 bg-navy/70 px-3 py-1.5 text-sm font-semibold tracking-widest">{String(index + 1).padStart(2, '0')}</span>
                                <div className="mt-20">
                                    <div className="mb-4 h-1 w-10 rounded-full bg-accent transition-all group-hover:w-16" />
                                    <h3 className="text-xl font-bold leading-snug">{card.name}</h3>
                                    <p className="mt-3 text-sm leading-6 text-slate-200">{card.description}</p>
                                    <span className="mt-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-navy/60 transition-colors group-hover:border-accent group-hover:bg-accent-dark">
                                        <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
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
    }, [slide, slides.length]);

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
                {images.map((image, index) => image ? (
                    <img key={index} src={image} alt="" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${index === slide ? 'opacity-45' : 'opacity-0'}`} />
                ) : null)}
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
