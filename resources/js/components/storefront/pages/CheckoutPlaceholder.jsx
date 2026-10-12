import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../contexts/i18n.js';
import { EmptyState } from '../ui.jsx';

export default function CheckoutPlaceholder() {
    const t = useI18n();
    return (
        <div className="mx-auto max-w-3xl px-4 py-16">
            <EmptyState
                title={t('cart.coming_soon')}
                body={t('cart.coming_soon_body')}
                action={<Link to="/cart" className="text-sm font-medium underline">{t('cart.title')}</Link>}
            />
        </div>
    );
}
