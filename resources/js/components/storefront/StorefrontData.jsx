import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCategories, getSettings } from '../../api/catalog.js';

const StorefrontDataContext = createContext(null);

export function StorefrontDataProvider({ children }) {
    const [settings, setSettings] = useState({ logo_url: '', carousel_images: [] });
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        getSettings().then(setSettings).catch(() => {});
        getCategories()
            .then((rows) => setCategories(Array.isArray(rows) ? rows : []))
            .catch(() => setCategories([]));
    }, []);

    const value = useMemo(() => ({ settings, categories }), [settings, categories]);
    return <StorefrontDataContext.Provider value={value}>{children}</StorefrontDataContext.Provider>;
}

export function useStorefrontData() {
    const ctx = useContext(StorefrontDataContext);
    if (!ctx) throw new Error('useStorefrontData must be used within StorefrontDataProvider');
    return ctx;
}

export function categoryRoots(categories) {
    return categories.filter((c) => c.parent_id == null);
}

export function navCategoryRoots(categories) {
    return categories
        .filter((c) => c.parent_id == null && c.nav_order != null)
        .slice()
        .sort((a, b) => Number(a.nav_order) - Number(b.nav_order));
}

export function childrenOf(categories, parentId) {
    return categories.filter((c) => String(c.parent_id) === String(parentId));
}

export function categoryChain(categories, id) {
    const byId = new Map(categories.map((c) => [String(c.id), c]));
    const chain = [];
    let current = byId.get(String(id));
    const guard = new Set();
    while (current && !guard.has(current.id)) {
        guard.add(current.id);
        chain.unshift(current);
        current = current.parent_id ? byId.get(String(current.parent_id)) : null;
    }
    return chain;
}
