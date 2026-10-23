import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useI18n } from '../../../contexts/i18n.js';
import { useCart } from '../../../contexts/CartContext.jsx';
import { Button, CartLines, EmptyState, Price } from '../ui.jsx';

export default function CartPage() {
    const t = useI18n();
    const { items, total } = useCart();

    return (
        <div className="container-shell py-10">
            <div className="mb-8 flex items-center gap-2 text-sm text-muted">
                <Link to="/">{t('nav.home')}</Link>
                <ChevronRight size={14} />
                <span className="text-navy">{t('cart.title')}</span>
            </div>
            <h1 className="section-title mb-8">{t('cart.title')}</h1>
            {items.length ? (
                <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
                    <div className="rounded-xl border border-line bg-white px-5">
                        <CartLines />
                    </div>
                    <aside className="h-fit rounded-xl bg-surface p-6">
                        <h2 className="text-lg font-bold text-navy">{t('cart.total')}</h2>
                        <div className="my-5 space-y-3 border-y border-line py-5">
                            <div className="flex justify-between text-sm text-muted">
                                <span>{t('cart.subtotal')}</span>
                                <Price value={total} />
                            </div>
                            <div className="flex justify-between text-sm text-muted">
                                <span>{t('home.delivery')}</span>
                                <span>—</span>
                            </div>
                        </div>
                        <div className="mb-6 flex items-center justify-between">
                            <strong>{t('cart.total')}</strong>
                            <Price value={total} size="large" />
                        </div>
                        <p className="mb-4 text-xs text-muted">{t('cart.display_note')}</p>
                        <Link to="/checkout"><Button className="w-full">{t('cart.proceed')}</Button></Link>
                    </aside>
                </div>
            ) : (
                <>
                    <EmptyState cart />
                    <div className="mt-5 text-center">
                        <Link to="/products"><Button variant="ghost">{t('cart.continue')}</Button></Link>
                    </div>
                </>
            )}
        </div>
    );
}
