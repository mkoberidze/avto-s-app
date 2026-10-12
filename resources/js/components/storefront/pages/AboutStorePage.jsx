import React from 'react';
import { useI18n } from '../../../contexts/i18n.js';

export default function AboutStorePage() {
    const t = useI18n();
    return (
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <h1 className="text-3xl font-semibold">{t('about.title')}</h1>
            <p className="mt-4 text-lg text-[#5C6B7A]">{t('about.lead')}</p>
            <p className="mt-6 leading-relaxed">{t('about.body')}</p>
        </div>
    );
}
