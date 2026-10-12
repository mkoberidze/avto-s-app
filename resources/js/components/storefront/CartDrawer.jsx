import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useI18n } from '../../contexts/i18n.js';
import { useCart } from '../../contexts/CartContext.jsx';
import { Button, CartLines, EmptyState, Price } from './ui.jsx';

export default function CartDrawer() {
    const t = useI18n();
    const { items, total, drawerOpen, closeDrawer } = useCart();

    if (!drawerOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <button type="button" className="absolute inset-0 bg-[#0F2744]/40" aria-label={t('common.close')} onClick={closeDrawer} />
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl" role="dialog" aria-label={t('cart.title')}>
                <div className="flex items-center justify-between border-b border-[#0F2744]/10 px-4 py-4">
                    <h2 className="text-lg font-semibold text-[#0F2744]">{t('cart.title')}</h2>
                    <button type="button" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-[#F4F1EA]" aria-label={t('common.close')} onClick={closeDrawer}>
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4">
                    {items.length === 0 ? (
                        <div className="py-10">
                            <EmptyState title={t('cart.empty')} action={<Link to="/products" onClick={closeDrawer} className="text-sm font-medium text-[#0F2744] underline">{t('cart.continue')}</Link>} />
                        </div>
                    ) : (
                        <CartLines compact />
                    )}
                </div>
                {items.length > 0 ? (
                    <div className="border-t border-[#0F2744]/10 p-4">
                        <div className="mb-3 flex items-center justify-between text-[#0F2744]">
                            <span>{t('cart.total')}</span>
                            <Price value={total} />
                        </div>
                        <p className="mb-3 text-xs text-[#7A8794]">{t('cart.display_note')}</p>
                        <Link to="/checkout" onClick={closeDrawer}>
                            <Button className="w-full">{t('cart.proceed')}</Button>
                        </Link>
                    </div>
                ) : null}
            </aside>
        </div>
    );
}
