import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getProduct } from '../api/catalog.js';

const CartContext = createContext(null);
const STORAGE_KEY = 'sentra_cart';

function clampQty(value) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n < 1) return 1;
    return Math.min(99, n);
}

export function livePrice(snapshot, now = Date.now()) {
    const discounted = Number(snapshot?.price) || 0;
    const endsAt = Date.parse(snapshot?.promotion_ends_at || '');
    if (snapshot?.discount_percent && endsAt > now) return discounted;
    return Number(snapshot?.original_price) || discounted;
}

function readCart() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (!Array.isArray(raw)) return [];
        return raw
            .filter((item) => item && item.id)
            .map((item) => ({
                id: String(item.id),
                quantity: clampQty(item.quantity),
                snapshot: {
                    name: item.snapshot?.name || '',
                    price: Number(item.snapshot?.price) || 0,
                    original_price: Number(item.snapshot?.original_price) || Number(item.snapshot?.price) || 0,
                    discount_percent: Number(item.snapshot?.discount_percent) || 0,
                    promotion_ends_at: item.snapshot?.promotion_ends_at || null,
                    image: item.snapshot?.image || '',
                    product_code: item.snapshot?.product_code || '',
                },
            }));
    } catch {
        return [];
    }
}

export function CartProvider({ children }) {
    const [items, setItems] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        setItems(readCart());
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {}
    }, [items]);

    const itemIds = items.map((item) => item.id).join(',');
    useEffect(() => {
        if (!itemIds) return undefined;
        let cancelled = false;
        const refresh = async () => {
            try {
                const products = await Promise.all(itemIds.split(',').map((id) => getProduct(id)));
                if (cancelled) return;
                const byId = new Map(products.map((product) => [String(product.id), product]));
                setItems((current) => current.map((item) => {
                    const product = byId.get(item.id);
                    if (!product) return item;
                    return { ...item, snapshot: snapshotFor(product) };
                }));
            } catch (error) {
                if (!cancelled) console.error('Unable to refresh cart prices', error);
            }
        };
        refresh();
        const interval = window.setInterval(refresh, 60_000);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [itemIds]);

    useEffect(() => {
        if (!items.length) return undefined;
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, [items.length]);

    function addItem(product, quantity = 1) {
        if (!product?.in_stock || !(Number(product.price) > 0) || product.price_on_request) {
            return;
        }
        const id = String(product.id);
        const qty = clampQty(quantity);
        setItems((prev) => {
            const existing = prev.find((item) => item.id === id);
            if (existing) {
                return prev.map((item) =>
                    item.id === id
                        ? { ...item, quantity: clampQty(item.quantity + qty), snapshot: snapshotFor(product) }
                        : item
                );
            }
            return [
                ...prev,
                {
                    id,
                    quantity: qty,
                    snapshot: snapshotFor(product),
                },
            ];
        });
        setDrawerOpen(true);
    }

    function setQuantity(id, quantity) {
        const qty = clampQty(quantity);
        setItems((prev) => prev.map((item) => (item.id === String(id) ? { ...item, quantity: qty } : item)));
    }

    function removeItem(id) {
        setItems((prev) => prev.filter((item) => item.id !== String(id)));
    }

    function clear() {
        setItems([]);
    }

    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + livePrice(item.snapshot, now) * item.quantity, 0);

    const value = useMemo(
        () => ({
            items,
            now,
            count,
            total,
            drawerOpen,
            openDrawer: () => setDrawerOpen(true),
            closeDrawer: () => setDrawerOpen(false),
            addItem,
            setQuantity,
            removeItem,
            clear,
        }),
        [items, count, total, drawerOpen, now]
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function snapshotFor(product) {
    return {
        name: product.name || '',
        price: Number(product.price) || 0,
        original_price: Number(product.original_price) || Number(product.price) || 0,
        discount_percent: Number(product.discount_percent) || 0,
        promotion_ends_at: product.promotion_ends_at || null,
        image: product.images?.[0] || '',
        product_code: product.product_code || '',
    };
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within a CartProvider');
    return ctx;
}
