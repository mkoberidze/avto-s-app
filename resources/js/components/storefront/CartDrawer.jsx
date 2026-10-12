import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useI18n } from '../../contexts/i18n.js';
import { useCart } from '../../contexts/CartContext.jsx';
import { Button, CartLines, EmptyState, Price } from './ui.jsx';

export default function CartDrawer() {
    const t = useI18n();
    const { items, total, drawerOpen, closeDrawer } = useCart();

    return (
        <>
            {drawerOpen ? <button type="button" aria-label={t('common.close')} onClick={closeDrawer} className="fixed inset-0 z-50 bg-navy/45" /> : null}
            <aside className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white p-5 shadow-2xl transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`} role="dialog" aria-label={t('cart.title')}>
                <div className="flex items-center justify-between border-b border-line pb-4">
                    <h2 className="text-xl font-bold text-navy">{t('cart.title')}</h2>
                    <button type="button" onClick={closeDrawer} aria-label={t('common.close')} className="grid size-10 place-items-center rounded-lg hover:bg-surface">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {items.length ? <CartLines /> : <div className="pt-8"><EmptyState cart /></div>}
                </div>
                {items.length > 0 ? (
                    <div className="border-t border-line pt-5">
                        <div className="mb-4 flex items-center justify-between">
                            <span className="font-semibold">{t('cart.total')}</span>
                            <Price value={total} size="large" />
                        </div>
                        <p className="mb-4 text-xs text-muted">{t('cart.display_note')}</p>
                        <Link onClick={closeDrawer} to="/checkout">
                            <Button className="w-full">{t('cart.proceed')}</Button>
                        </Link>
                    </div>
                ) : null}
            </aside>
        </>
    );
}
