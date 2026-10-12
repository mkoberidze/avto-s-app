import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'sentra_cart';

function clampQty(value) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n < 1) return 1;
    return Math.min(99, n);
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

    useEffect(() => {
        setItems(readCart());
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {}
    }, [items]);

    function addItem(product, quantity = 1) {
        const id = String(product.id);
        const qty = clampQty(quantity);
        setItems((prev) => {
            const existing = prev.find((item) => item.id === id);
            if (existing) {
                return prev.map((item) =>
                    item.id === id ? { ...item, quantity: clampQty(item.quantity + qty) } : item
                );
            }
            return [
                ...prev,
                {
                    id,
                    quantity: qty,
                    snapshot: {
                        name: product.name || '',
                        price: Number(product.price) || 0,
                        image: product.images?.[0] || '',
                        product_code: product.product_code || '',
                    },
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

    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.snapshot.price * item.quantity, 0);

    const value = useMemo(
        () => ({
            items,
            count,
            total,
            drawerOpen,
            openDrawer: () => setDrawerOpen(true),
            closeDrawer: () => setDrawerOpen(false),
            addItem,
            setQuantity,
            removeItem,
        }),
        [items, count, total, drawerOpen]
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within a CartProvider');
    return ctx;
}
