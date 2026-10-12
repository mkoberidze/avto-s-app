import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../contexts/i18n.js';
import { useCart } from '../../../contexts/CartContext.jsx';
import { Button, CartLines, EmptyState, Price } from '../ui.jsx';

export default function CartPage() {
    const t = useI18n();
    const { items, total } = useCart();

    return (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="mb-6 text-2xl font-semibold">{t('cart.title')}</h1>
            {items.length === 0 ? (
                <EmptyState
                    title={t('cart.empty')}
                    action={<Link to="/products" className="text-sm font-medium underline">{t('cart.continue')}</Link>}
                />
            ) : (
                <div className="rounded-2xl bg-white p-4 sm:p-6">
                    <CartLines />
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#0F2744]/10 pt-4">
                        <div>
                            <div className="text-sm text-[#5C6B7A]">{t('cart.total')}</div>
                            <Price value={total} className="text-2xl" />
                            <p className="mt-1 max-w-sm text-xs text-[#7A8794]">{t('cart.display_note')}</p>
                        </div>
                        <Link to="/checkout"><Button>{t('cart.proceed')}</Button></Link>
                    </div>
                </div>
            )}
        </div>
    );
}
