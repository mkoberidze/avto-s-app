import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../contexts/i18n.js';
import { Button, EmptyState } from '../ui.jsx';

export default function CheckoutPlaceholder() {
    const t = useI18n();
    return (
        <div className="container-shell grid min-h-[30rem] place-items-center py-12">
            <div className="w-full max-w-lg">
                <EmptyState title={t('cart.coming_soon')} body={t('cart.coming_soon_body')} />
                <div className="mt-5 text-center">
                    <Link to="/cart"><Button variant="ghost">{t('cart.title')}</Button></Link>
                </div>
            </div>
        </div>
    );
}
