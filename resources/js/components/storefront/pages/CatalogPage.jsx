import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { getBrands, getProducts } from '../../../api/catalog.js';
import { useI18n } from '../../../contexts/i18n.js';
import { childrenOf, categoryRoots, useStorefrontData } from '../StorefrontData.jsx';
import { Button, EmptyState, ProductCard, ProductSkeleton } from '../ui.jsx';

const PER_PAGE = 24;

export default function CatalogPage() {
    const t = useI18n();
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
    const [qDraft, setQDraft] = useState(params.get('q') || '');

    const selectedBrands = params.getAll('brand');
    const q = params.get('q') || '';
    const sort = params.get('sort') || 'newest';
    const minPrice = params.get('min_price') || '';
    const maxPrice = params.get('max_price') || '';
    const inStock = params.get('in_stock') === '1' || params.get('in_stock') === 'true';

    useEffect(() => {
        setQDraft(q);
    }, [q]);

    useEffect(() => {
        getBrands().then((rows) => setBrands(Array.isArray(rows) ? rows : [])).catch(() => setBrands([]));
    }, []);

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
    }, [categoryId, q, sort, minPrice, maxPrice, inStock, selectedBrands.join('|')]);

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
        <div className="container-shell py-8 sm:py-12">
            <div className="mb-8">
                <p className="section-kicker">{t('nav.catalog')}</p>
                <h1 className="section-title">{t('catalog.title')}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{t('catalog.lead')}</p>
            </div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    updateFilters({ q: qDraft });
                }}
                className="mb-5 flex lg:hidden"
            >
                <input
                    value={qDraft}
                    onChange={(e) => setQDraft(e.target.value)}
                    placeholder={t('nav.search_placeholder')}
                    className="h-12 min-w-0 flex-1 rounded-l-lg border border-line px-4 text-sm outline-none"
                />
                <button type="submit" aria-label={t('nav.search')} className="grid w-12 place-items-center rounded-r-lg bg-navy text-white">
                    <Search size={18} />
                </button>
            </form>
            <div className="flex gap-8">
                <aside className="hidden w-60 shrink-0 lg:block">
                    <div className="sticky top-40 rounded-xl border border-line bg-white p-5">
                        <div className="mb-6 flex items-center gap-2 border-b border-line pb-4 font-bold text-navy">
                            <SlidersHorizontal size={18} />
                            {t('catalog.filters')}
                        </div>
                        {sidebar}
                    </div>
                </aside>
                <div className="min-w-0 flex-1">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" onClick={() => setFiltersOpen(true)} className="lg:hidden">
                                <Filter size={17} />
                                {t('catalog.filters')}
                            </Button>
                            <span className="text-sm text-muted">
                                <strong className="text-navy">{total}</strong> {t('catalog.results')}
                            </span>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-muted">
                            <span className="hidden sm:inline">{t('catalog.sort')}:</span>
                            <select
                                value={sort}
                                onChange={(e) => updateFilters({ sort: e.target.value })}
                                className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-navy outline-none"
                            >
                                <option value="newest">{t('catalog.sort.newest')}</option>
                                <option value="priceAsc">{t('catalog.sort.priceAsc')}</option>
                                <option value="priceDesc">{t('catalog.sort.priceDesc')}</option>
                                <option value="name">{t('catalog.sort.name')}</option>
                            </select>
                        </label>
                    </div>
                    {error ? (
                        <EmptyState title={t('catalog.error')} action={<Button onClick={() => updateFilters({})}>{t('catalog.retry')}</Button>} />
                    ) : loading ? (
                        <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                            {Array.from({ length: 6 }, (_, i) => <ProductSkeleton key={i} />)}
                        </div>
                    ) : products.length ? (
                        <>
                            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                                {products.map((product) => <ProductCard key={product.id} product={product} />)}
                            </div>
                            {products.length < total ? (
                                <div className="mt-8 text-center">
                                    <Button variant="ghost" onClick={loadMore}>{t('catalog.load_more')}</Button>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <EmptyState title={t('catalog.empty')} />
                    )}
                </div>
            </div>
            {filtersOpen ? (
                <>
                    <button type="button" onClick={() => setFiltersOpen(false)} aria-label={t('common.close')} className="fixed inset-0 z-50 bg-navy/40 lg:hidden" />
                    <aside className="fixed left-0 top-0 z-50 h-full w-[88%] max-w-sm overflow-y-auto bg-white p-6 lg:hidden">
                        <div className="mb-7 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-navy">{t('catalog.filters')}</h2>
                            <button type="button" onClick={() => setFiltersOpen(false)} aria-label={t('common.close')}><X /></button>
                        </div>
                        {sidebar}
                        <Button onClick={() => setFiltersOpen(false)} className="mt-8 w-full">{t('catalog.apply')}</Button>
                    </aside>
                </>
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
        <div className="space-y-7">
            <form
                className="hidden lg:block"
                onSubmit={(e) => {
                    e.preventDefault();
                    onChange({ q: e.target.q.value });
                }}
            >
                <h3 className="filter-title">{t('nav.search')}</h3>
                <input id="catalog-q" name="q" defaultValue={q} className="filter-input" />
            </form>

            <div>
                <h3 className="filter-title">{t('catalog.categories')}</h3>
                <CategoryTree
                    t={t}
                    categories={categories}
                    activeId={categoryId}
                    onSelect={(id) => navigate(id ? `/products/category/${id}` : '/products')}
                />
            </div>

            <div>
                <h3 className="filter-title">{t('catalog.brands')}</h3>
                <div className="space-y-2.5">
                    {visibleBrands.map((brand) => {
                        const checked = selectedBrands.includes(brand.name);
                        return (
                            <label key={brand.name} className="flex cursor-pointer items-center gap-3 text-sm text-muted">
                                <input
                                    type="checkbox"
                                    className="size-4 accent-accent"
                                    checked={checked}
                                    onChange={() => {
                                        const next = checked
                                            ? selectedBrands.filter((name) => name !== brand.name)
                                            : [...selectedBrands, brand.name];
                                        onChange({ brand: next });
                                    }}
                                />
                                <span className="min-w-0 break-words">{brand.name}</span>
                                <span className="ml-auto text-xs text-muted">{brand.count}</span>
                            </label>
                        );
                    })}
                </div>
                {brands.length > 12 ? (
                    <button type="button" className="mt-2 text-xs font-bold text-accent" onClick={() => setShowAllBrands((v) => !v)}>
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
                <h3 className="filter-title">{t('catalog.price')}</h3>
                <div className="flex gap-2">
                    <input aria-label={t('catalog.min')} value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" className="filter-input" placeholder={t('catalog.min')} />
                    <input aria-label={t('catalog.max')} value={max} onChange={(e) => setMax(e.target.value)} inputMode="numeric" className="filter-input" placeholder={t('catalog.max')} />
                </div>
                <Button type="submit" variant="ghost" className="mt-3 w-full">{t('catalog.apply')}</Button>
            </form>

            <label className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold text-navy">
                <span>{t('catalog.in_stock')}</span>
                <button
                    type="button"
                    role="switch"
                    aria-checked={inStock}
                    onClick={() => onChange({ in_stock: inStock ? '' : '1' })}
                    className={`relative h-6 w-11 rounded-full transition ${inStock ? 'bg-accent' : 'bg-slate-200'}`}
                >
                    <span className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${inStock ? 'left-6' : 'left-1'}`} />
                </button>
            </label>
        </div>
    );
}

function CategoryTree({ t, categories, activeId, onSelect }) {
    const roots = useMemo(() => categoryRoots(categories), [categories]);
    const [open, setOpen] = useState(() => new Set(activeId ? [String(activeId)] : []));

    return (
        <div className="space-y-2">
            <button type="button" className={!activeId ? 'filter-link-active w-full text-left' : 'filter-link w-full text-left'} onClick={() => onSelect(null)}>
                {t('catalog.all')}
            </button>
            {roots.map((root) => (
                <TreeNode key={root.id} node={root} categories={categories} activeId={activeId} open={open} setOpen={setOpen} onSelect={onSelect} />
            ))}
        </div>
    );
}

function TreeNode({ node, categories, activeId, open, setOpen, onSelect }) {
    const kids = childrenOf(categories, node.id);
    const expanded = open.has(String(node.id));
    const active = String(activeId) === String(node.id);

    return (
        <div>
            <div className="flex items-center gap-1">
                {kids.length ? (
                    <button
                        type="button"
                        className="grid h-6 w-6 shrink-0 place-items-center text-muted"
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
                ) : <span className="w-6 shrink-0" />}
                <button type="button" className={`${active ? 'filter-link-active' : 'filter-link'} min-w-0 flex-1 break-words text-left`} onClick={() => onSelect(node.id)}>
                    {node.name}
                </button>
            </div>
            {expanded && kids.length ? (
                <div className="ml-4 mt-1 space-y-1">
                    {kids.map((child) => (
                        <TreeNode key={child.id} node={child} categories={categories} activeId={activeId} open={open} setOpen={setOpen} onSelect={onSelect} />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
