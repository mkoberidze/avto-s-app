import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../contexts/i18n.js';
import { EmptyState } from '../ui.jsx';

export default function NotFoundPage() {
    const t = useI18n();
    return (
        <div className="mx-auto max-w-3xl px-4 py-16">
            <EmptyState
                title={t('notfound.title')}
                body={t('notfound.body')}
                action={<Link to="/" className="text-sm font-medium underline">{t('notfound.home')}</Link>}
            />
        </div>
    );
}
