import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useI18n } from '../../contexts/i18n.js';
import { useCart } from '../../contexts/CartContext.jsx';

export function formatPrice(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return `0.00 ₾`;
    return `${n.toFixed(2)} ₾`;
}

export function isPriceOnRequest(productOrPrice) {
    if (productOrPrice && typeof productOrPrice === 'object') {
        if (productOrPrice.price_on_request) return true;
        return !(Number(productOrPrice.price) > 0);
    }
    return !(Number(productOrPrice) > 0);
}

export function isPurchasable(product) {
    return Boolean(product?.in_stock) && !isPriceOnRequest(product);
}

export function Price({ value, size = 'normal', className = '', onRequest = false }) {
    const t = useI18n();
    const request = onRequest || isPriceOnRequest(value);
    const classes = request
        ? `min-w-0 font-medium leading-tight text-muted ${size === 'large' ? 'max-w-sm text-sm' : 'flex-1 text-[11px]'} ${className}`
        : `font-bold tracking-tight text-navy ${size === 'large' ? 'text-3xl' : 'text-lg'} ${className}`;

    return (
        <span className={classes}>
            {request ? t('catalog.price_on_request') : formatPrice(value)}
        </span>
    );
}

export function stockKind(product) {
    if (!product?.in_stock) return 'out';
    if (product.stock_level === '*') return 'low';
    return 'in';
}

export function StockBadge({ product }) {
    const t = useI18n();
    const low = product.in_stock && product.stock_level === '*';
    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${!product.in_stock ? 'bg-red-50 text-red-700' : low ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {!product.in_stock ? t('stock.out') : low ? t('stock.low') : t('stock.in')}
        </span>
    );
}

export function Button({ children, variant = 'primary', className = '', type = 'button', ...props }) {
    const variants = {
        primary: 'bg-accent text-white hover:bg-accent-dark',
        secondary: 'bg-navy text-white hover:bg-navy-light',
        accent: 'bg-accent text-white hover:bg-accent-dark',
        ghost: 'border border-line bg-white text-navy hover:bg-surface',
        danger: 'text-red-700 hover:bg-red-50',
    };
    return (
        <button
            type={type}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.primary} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

export function QuantityStepper({ value, onChange, disabled = false }) {
    const t = useI18n();
    return (
        <div className="inline-flex h-11 items-center rounded-lg border border-line bg-white">
            <button
                type="button"
                aria-label={t('home.prev')}
                className="grid h-full w-10 place-items-center text-muted hover:text-navy disabled:opacity-40"
                disabled={disabled || value <= 1}
                onClick={() => onChange(value - 1)}
            >
                <Minus size={16} />
            </button>
            <input
                aria-label={t('product.qty')}
                className="min-w-8 bg-transparent text-center text-sm font-semibold outline-none"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
            />
            <button
                type="button"
                aria-label={t('home.next')}
                className="grid h-full w-10 place-items-center text-muted hover:text-navy disabled:opacity-40"
                disabled={disabled || value >= 99}
                onClick={() => onChange(value + 1)}
            >
                <Plus size={16} />
            </button>
        </div>
    );
}

export function ProductImage({ src, alt, className = '' }) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return (
            <div className={`grid place-items-center bg-surface text-slate-300 ${className}`} aria-hidden="true">
                <ShoppingCart size={36} />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt || ''}
            loading="lazy"
            className={className}
            onError={() => setFailed(true)}
        />
    );
}

export function ProductCard({ product }) {
    const t = useI18n();
    const { addItem } = useCart();
    const canBuy = isPurchasable(product);

    return (
        <article className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-white transition hover:-translate-y-1 hover:shadow-card">
            <Link to={`/products/${product.id}`} className="block aspect-square overflow-hidden bg-surface">
                <ProductImage src={product.images?.[0]} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            </Link>
            <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold uppercase tracking-wider text-muted">{product.brand}</span>
                    <StockBadge product={product} />
                </div>
                <Link to={`/products/${product.id}`} className="line-clamp-2 min-h-12 text-sm font-semibold leading-6 text-navy hover:text-accent">
                    {product.name}
                </Link>
                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <Price value={product.price} onRequest={product.price_on_request} />
                    <button
                        type="button"
                        aria-label={t('product.add_to_cart')}
                        disabled={!canBuy}
                        onClick={() => addItem(product, 1)}
                        className="grid size-11 shrink-0 place-items-center rounded-lg bg-navy text-white transition hover:bg-accent disabled:bg-slate-200 disabled:text-slate-400"
                    >
                        <ShoppingCart size={18} />
                    </button>
                </div>
            </div>
        </article>
    );
}

export function ProductSkeleton() {
    return (
        <div className="animate-pulse overflow-hidden rounded-xl border border-line bg-white">
            <div className="aspect-square bg-slate-100" />
            <div className="space-y-3 p-4">
                <div className="h-3 w-1/3 rounded bg-slate-100" />
                <div className="h-5 rounded bg-slate-100" />
                <div className="h-5 w-2/3 rounded bg-slate-100" />
                <div className="h-10 rounded bg-slate-100" />
            </div>
        </div>
    );
}

export function EmptyState({ title, body, action, cart = false }) {
    const t = useI18n();
    return (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
            <ShoppingCart className="mx-auto mb-4 text-slate-300" size={36} />
            <h3 className="text-lg font-bold text-navy">{title || t(cart ? 'cart.empty' : 'catalog.empty')}</h3>
            {(body || cart) ? <p className="mt-2 text-sm text-muted">{body || t('cart.continue')}</p> : null}
            {action ? <div className="mt-6">{action}</div> : null}
        </div>
    );
}

export function CartLines() {
    const t = useI18n();
    const { items, setQuantity, removeItem } = useCart();

    return (
        <div className="divide-y divide-line">
            {items.map((item) => (
                <div key={item.id} className="flex gap-4 py-5">
                    <Link to={`/products/${item.id}`} className="size-20 shrink-0 overflow-hidden rounded-lg bg-surface">
                        <ProductImage src={item.snapshot.image} alt={item.snapshot.name} className="h-full w-full object-cover" />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <Link to={`/products/${item.id}`} className="line-clamp-2 text-sm font-semibold text-navy">
                            {item.snapshot.name}
                        </Link>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <QuantityStepper value={item.quantity} onChange={(qty) => setQuantity(item.id, qty)} />
                            <Price value={item.snapshot.price * item.quantity} />
                        </div>
                    </div>
                    <button type="button" aria-label={t('cart.remove')} onClick={() => removeItem(item.id)} className="self-start p-2 text-muted hover:text-red-600">
                        <Trash2 size={17} />
                    </button>
                </div>
            ))}
        </div>
    );
}
