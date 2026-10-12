import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { getBrands, getProducts } from '../../../api/catalog.js';
import { useI18n } from '../../../contexts/i18n.js';
import { useLanguage } from '../../../contexts/LanguageContext.jsx';
import { childrenOf, categoryRoots, useStorefrontData } from '../StorefrontData.jsx';
import { Button, EmptyState, ProductCard, ProductSkeleton } from '../ui.jsx';

const PER_PAGE = 24;

export default function CatalogPage() {
    const t = useI18n();
    const { lang } = useLanguage();
    const { id: categoryId } = useParams();
    const [params, setParams] = useSearchParams();
    const { categories } = useStorefrontData();
    const [brands, setBrands] = useState([]);
    const [products, setProducts] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const selectedBrands = params.getAll('brand');
    const q = params.get('q') || '';
    const sort = params.get('sort') || 'newest';
    const minPrice = params.get('min_price') || '';
    const maxPrice = params.get('max_price') || '';
    const inStock = params.get('in_stock') === '1' || params.get('in_stock') === 'true';

    useEffect(() => {
        getBrands().then((rows) => setBrands(Array.isArray(rows) ? rows : [])).catch(() => setBrands([]));
    }, [lang]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        const query = {
            page: 1,
            per_page: PER_PAGE,
            sort,
        };
        if (categoryId) query.category_id = categoryId;
        if (q) query.q = q;
        if (minPrice) query.min_price = minPrice;
        if (maxPrice) query.max_price = maxPrice;
        if (inStock) query.in_stock = true;
        if (selectedBrands.length) query.brand = selectedBrands;

        getProducts(query)
            .then((data) => {
                if (cancelled) return;
                setProducts(data.products || []);
                setTotal(data.total || 0);
                setPage(1);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [lang, categoryId, q, sort, minPrice, maxPrice, inStock, selectedBrands.join('|')]);

    function updateFilters(patch, replace = false) {
        const next = replace ? new URLSearchParams() : new URLSearchParams(params);
        Object.entries(patch).forEach(([key, value]) => {
            next.delete(key);
            if (Array.isArray(value)) {
                value.filter(Boolean).forEach((v) => next.append(key, v));
            } else if (value !== '' && value !== false && value != null) {
                next.set(key, String(value));
            }
        });
        setParams(next, { replace: true });
    }

    async function loadMore() {
        const nextPage = page + 1;
        const query = {
            page: nextPage,
            per_page: PER_PAGE,
            sort,
        };
        if (categoryId) query.category_id = categoryId;
        if (q) query.q = q;
        if (minPrice) query.min_price = minPrice;
        if (maxPrice) query.max_price = maxPrice;
        if (inStock) query.in_stock = true;
        if (selectedBrands.length) query.brand = selectedBrands;
        const data = await getProducts(query);
        setProducts((prev) => [...prev, ...(data.products || [])]);
        setPage(nextPage);
        setTotal(data.total || 0);
    }

    const sidebar = (
        <Filters
            t={t}
            categories={categories}
            categoryId={categoryId}
            brands={brands}
            selectedBrands={selectedBrands}
            minPrice={minPrice}
            maxPrice={maxPrice}
            inStock={inStock}
            q={q}
            onChange={updateFilters}
        />
    );

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">{t('catalog.title')}</h1>
                    <p className="text-sm text-[#5C6B7A]">{total} {t('catalog.results')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-[#0F2744]/15 bg-white px-3 py-2 text-sm lg:hidden" onClick={() => setFiltersOpen(true)}>
                        <SlidersHorizontal className="h-4 w-4" /> {t('catalog.filters')}
                    </button>
                    <label className="flex items-center gap-2 text-sm">
                        <span className="text-[#5C6B7A]">{t('catalog.sort')}</span>
                        <select
                            className="h-10 rounded-lg border border-[#0F2744]/15 bg-white px-2"
                            value={sort}
                            onChange={(e) => updateFilters({ sort: e.target.value })}
                        >
                            <option value="newest">{t('catalog.sort.newest')}</option>
                            <option value="priceAsc">{t('catalog.sort.priceAsc')}</option>
                            <option value="priceDesc">{t('catalog.sort.priceDesc')}</option>
                            <option value="name">{t('catalog.sort.name')}</option>
                        </select>
                    </label>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
                <aside className="hidden lg:block">{sidebar}</aside>
                <div>
                    {error ? (
                        <EmptyState title={t('catalog.error')} action={<Button onClick={() => updateFilters({})}>{t('catalog.retry')}</Button>} />
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                                {loading
                                    ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
                                    : products.map((product) => <ProductCard key={product.id} product={product} />)}
                            </div>
                            {!loading && products.length === 0 ? <div className="mt-6"><EmptyState title={t('catalog.empty')} /></div> : null}
                            {!loading && products.length < total ? (
                                <div className="mt-8 text-center">
                                    <Button variant="ghost" onClick={loadMore}>{t('catalog.load_more')}</Button>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </div>

            {filtersOpen ? (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button type="button" className="absolute inset-0 bg-[#0F2744]/40" aria-label={t('common.close')} onClick={() => setFiltersOpen(false)} />
                    <div className="absolute inset-y-0 left-0 w-[min(100%,20rem)] overflow-y-auto bg-white p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-semibold">{t('catalog.filters')}</h2>
                            <button type="button" onClick={() => setFiltersOpen(false)} aria-label={t('common.close')}><X className="h-5 w-5" /></button>
                        </div>
                        {sidebar}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function Filters({ t, categories, categoryId, brands, selectedBrands, minPrice, maxPrice, inStock, q, onChange }) {
    const navigate = useNavigate();
    const [showAllBrands, setShowAllBrands] = useState(false);
    const [min, setMin] = useState(minPrice);
    const [max, setMax] = useState(maxPrice);
    const visibleBrands = showAllBrands ? brands : brands.slice(0, 12);

    useEffect(() => {
        setMin(minPrice);
        setMax(maxPrice);
    }, [minPrice, maxPrice]);

    return (
        <div className="space-y-8 text-sm">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onChange({ q: e.target.q.value });
                }}
            >
                <label className="mb-1 block font-medium" htmlFor="catalog-q">{t('nav.search')}</label>
                <input id="catalog-q" name="q" defaultValue={q} className="h-10 w-full rounded-lg border border-[#0F2744]/15 px-3" />
            </form>

            <div>
                <h3 className="mb-2 font-medium">{t('catalog.categories')}</h3>
                <CategoryTree
                    t={t}
                    categories={categories}
                    activeId={categoryId}
                    onSelect={(id) => navigate(id ? `/products/category/${id}` : '/products')}
                />
            </div>

            <div>
                <h3 className="mb-2 font-medium">{t('catalog.brands')}</h3>
                <ul className="space-y-1">
                    {visibleBrands.map((brand) => {
                        const checked = selectedBrands.includes(brand.name);
                        return (
                            <li key={brand.name}>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                            const next = checked
                                                ? selectedBrands.filter((name) => name !== brand.name)
                                                : [...selectedBrands, brand.name];
                                            onChange({ brand: next });
                                        }}
                                    />
                                    <span className="min-w-0 break-words">{brand.name}</span>
                                    <span className="ml-auto text-xs text-[#7A8794]">{brand.count}</span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
                {brands.length > 12 ? (
                    <button type="button" className="mt-2 text-xs font-medium underline" onClick={() => setShowAllBrands((v) => !v)}>
                        {showAllBrands ? t('catalog.show_less') : t('catalog.show_more')}
                    </button>
                ) : null}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onChange({ min_price: min, max_price: max });
                }}
            >
                <h3 className="mb-2 font-medium">{t('catalog.price')}</h3>
                <div className="flex gap-2">
                    <input aria-label={t('catalog.min')} value={min} onChange={(e) => setMin(e.target.value)} className="h-10 w-full rounded-lg border border-[#0F2744]/15 px-2" placeholder={t('catalog.min')} />
                    <input aria-label={t('catalog.max')} value={max} onChange={(e) => setMax(e.target.value)} className="h-10 w-full rounded-lg border border-[#0F2744]/15 px-2" placeholder={t('catalog.max')} />
                </div>
                <Button type="submit" variant="ghost" className="mt-2 w-full">{t('catalog.apply')}</Button>
            </form>

            <label className="flex items-center gap-2">
                <input type="checkbox" checked={inStock} onChange={(e) => onChange({ in_stock: e.target.checked ? '1' : '' })} />
                {t('catalog.in_stock')}
            </label>
        </div>
    );
}

function CategoryTree({ t, categories, activeId, onSelect }) {
    const roots = useMemo(() => categoryRoots(categories), [categories]);
    const [open, setOpen] = useState(() => new Set(activeId ? [String(activeId)] : []));

    return (
        <ul className="space-y-1">
            <li>
                <button type="button" className={`text-left ${!activeId ? 'font-semibold' : 'text-[#5C6B7A]'}`} onClick={() => onSelect(null)}>
                    {t('catalog.title')}
                </button>
            </li>
            {roots.map((root) => (
                <TreeNode key={root.id} node={root} categories={categories} activeId={activeId} open={open} setOpen={setOpen} onSelect={onSelect} />
            ))}
        </ul>
    );
}

function TreeNode({ node, categories, activeId, open, setOpen, onSelect }) {
    const kids = childrenOf(categories, node.id);
    const expanded = open.has(String(node.id));
    const active = String(activeId) === String(node.id);

    return (
        <li>
            <div className="flex items-center gap-1">
                {kids.length ? (
                    <button
                        type="button"
                        className="grid h-6 w-6 place-items-center"
                        aria-label={expanded ? 'Collapse' : 'Expand'}
                        onClick={() => {
                            const next = new Set(open);
                            if (expanded) next.delete(String(node.id));
                            else next.add(String(node.id));
                            setOpen(next);
                        }}
                    >
                        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                ) : <span className="w-6" />}
                <button type="button" className={`min-w-0 flex-1 break-words text-left ${active ? 'font-semibold text-[#0F2744]' : 'text-[#5C6B7A]'}`} onClick={() => onSelect(node.id)}>
                    {node.name}
                </button>
            </div>
            {expanded && kids.length ? (
                <ul className="ml-4 mt-1 space-y-1">
                    {kids.map((child) => (
                        <TreeNode key={child.id} node={child} categories={categories} activeId={activeId} open={open} setOpen={setOpen} onSelect={onSelect} />
                    ))}
                </ul>
            ) : null}
        </li>
    );
}
