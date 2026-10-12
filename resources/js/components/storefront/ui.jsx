import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { useI18n } from '../../contexts/i18n.js';
import { useCart } from '../../contexts/CartContext.jsx';

export function formatPrice(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return `0.00 ₾`;
    return `${n.toFixed(2)} ₾`;
}

export function Price({ value, className = '' }) {
    return <span className={`font-semibold tabular-nums ${className}`}>{formatPrice(value)}</span>;
}

export function stockKind(product) {
    if (!product?.in_stock) return 'out';
    if (product.stock_level === '*') return 'low';
    return 'in';
}

export function StockBadge({ product }) {
    const t = useI18n();
    const kind = stockKind(product);
    const styles = {
        out: 'bg-red-50 text-red-700 border-red-100',
        low: 'bg-amber-50 text-amber-800 border-amber-100',
        in: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    };
    const labels = { out: t('stock.out'), low: t('stock.low'), in: t('stock.in') };
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[kind]}`}>
            {labels[kind]}
        </span>
    );
}

export function Button({ children, variant = 'primary', className = '', type = 'button', ...props }) {
    const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] disabled:opacity-50 disabled:pointer-events-none';
    const variants = {
        primary: 'bg-[#0F2744] text-white hover:bg-[#18355c]',
        accent: 'bg-[#C9A227] text-[#0F2744] hover:bg-[#d4ae3a]',
        ghost: 'border border-[#0F2744]/15 bg-white text-[#0F2744] hover:bg-[#F4F1EA]',
        danger: 'text-red-700 hover:bg-red-50',
    };
    return (
        <button type={type} className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
            {children}
        </button>
    );
}

export function QuantityStepper({ value, onChange, disabled = false }) {
    const t = useI18n();
    return (
        <div className="inline-flex items-center rounded-lg border border-[#0F2744]/15 bg-white">
            <button
                type="button"
                className="grid h-10 w-10 place-items-center text-[#0F2744] hover:bg-[#F4F1EA] disabled:opacity-40"
                aria-label="Decrease quantity"
                disabled={disabled || value <= 1}
                onClick={() => onChange(value - 1)}
            >
                <Minus className="h-4 w-4" />
            </button>
            <input
                aria-label={t('product.qty')}
                className="h-10 w-12 border-x border-[#0F2744]/10 text-center text-sm tabular-nums outline-none"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
            />
            <button
                type="button"
                className="grid h-10 w-10 place-items-center text-[#0F2744] hover:bg-[#F4F1EA] disabled:opacity-40"
                aria-label="Increase quantity"
                disabled={disabled || value >= 99}
                onClick={() => onChange(value + 1)}
            >
                <Plus className="h-4 w-4" />
            </button>
        </div>
    );
}

export function ProductImage({ src, alt, className = '' }) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return (
            <div className={`grid place-items-center bg-[#EEF2F6] text-[#8A97A6] ${className}`} aria-hidden="true">
                <ShoppingCart className="h-8 w-8" />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt || ''}
            loading="lazy"
            className={`object-contain ${className}`}
            onError={() => setFailed(true)}
        />
    );
}

export function ProductCard({ product }) {
    const t = useI18n();
    const { addItem } = useCart();
    const inStock = Boolean(product.in_stock);

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#0F2744]/8 bg-white shadow-sm transition hover:shadow-md">
            <Link to={`/products/${product.id}`} className="relative block aspect-square bg-[#F7F8FA] p-3">
                <ProductImage src={product.images?.[0]} alt={product.name} className="h-full w-full" />
                <div className="absolute left-3 top-3">
                    <StockBadge product={product} />
                </div>
            </Link>
            <div className="flex flex-1 flex-col gap-2 p-4">
                {product.brand ? <p className="text-xs uppercase tracking-wide text-[#7A8794]">{product.brand}</p> : null}
                <Link to={`/products/${product.id}`} className="line-clamp-2 min-h-[2.75rem] text-sm font-medium text-[#0F2744] hover:underline">
                    {product.name}
                </Link>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <Price value={product.price} className="text-[#0F2744]" />
                    <Button
                        variant="accent"
                        className="h-auto min-h-9 max-w-[9.5rem] px-2 py-1.5 text-xs leading-tight sm:text-sm"
                        disabled={!inStock}
                        onClick={() => addItem(product, 1)}
                    >
                        {inStock ? t('product.add_to_cart') : t('product.out_of_stock')}
                    </Button>
                </div>
            </div>
        </article>
    );
}

export function ProductSkeleton() {
    return (
        <div className="animate-pulse overflow-hidden rounded-2xl border border-[#0F2744]/8 bg-white">
            <div className="aspect-square bg-[#EEF2F6]" />
            <div className="space-y-2 p-4">
                <div className="h-3 w-16 rounded bg-[#EEF2F6]" />
                <div className="h-4 w-full rounded bg-[#EEF2F6]" />
                <div className="h-4 w-2/3 rounded bg-[#EEF2F6]" />
                <div className="h-8 w-24 rounded bg-[#EEF2F6]" />
            </div>
        </div>
    );
}

export function EmptyState({ title, body, action }) {
    return (
        <div className="rounded-2xl border border-dashed border-[#0F2744]/20 bg-white px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-[#0F2744]">{title}</h2>
            {body ? <p className="mx-auto mt-2 max-w-md text-sm text-[#5C6B7A]">{body}</p> : null}
            {action ? <div className="mt-6">{action}</div> : null}
        </div>
    );
}

export function CartLines({ compact = false }) {
    const t = useI18n();
    const { items, setQuantity, removeItem } = useCart();

    return (
        <ul className="divide-y divide-[#0F2744]/8">
            {items.map((item) => (
                <li key={item.id} className="flex gap-3 py-4">
                    <Link to={`/products/${item.id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#F7F8FA]">
                        <ProductImage src={item.snapshot.image} alt={item.snapshot.name} className="h-full w-full" />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <Link to={`/products/${item.id}`} className="line-clamp-2 text-sm font-medium text-[#0F2744] hover:underline">
                            {item.snapshot.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-[#7A8794]">{item.snapshot.product_code}</p>
                        <div className={`mt-2 flex flex-wrap items-center gap-3 ${compact ? '' : ''}`}>
                            <QuantityStepper value={item.quantity} onChange={(qty) => setQuantity(item.id, qty)} />
                            <Price value={item.snapshot.price * item.quantity} className="text-sm" />
                            <button type="button" className="text-xs text-red-700 hover:underline" onClick={() => removeItem(item.id)}>
                                {t('cart.remove')}
                            </button>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}
