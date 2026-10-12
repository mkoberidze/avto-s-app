import React from 'react';
import { useI18n } from '../../../contexts/i18n.js';

export default function ContactPage() {
    const t = useI18n();
    return (
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <h1 className="text-3xl font-semibold">{t('contact.title')}</h1>
            <p className="mt-4 text-[#5C6B7A]">{t('contact.body')}</p>
            <dl className="mt-8 space-y-4 rounded-2xl bg-white p-6">
                <div>
                    <dt className="text-xs uppercase tracking-wide text-[#7A8794]">{t('contact.phone_label')}</dt>
                    <dd className="mt-1 text-lg"><a href="tel:+995322112233" className="hover:underline">{t('contact.phone')}</a></dd>
                </div>
                <div>
                    <dt className="text-xs uppercase tracking-wide text-[#7A8794]">{t('contact.email_label')}</dt>
                    <dd className="mt-1 text-lg"><a href="mailto:info@sentra.ge" className="hover:underline">{t('contact.email')}</a></dd>
                </div>
                <div>
                    <dt className="text-xs uppercase tracking-wide text-[#7A8794]">{t('contact.address_label')}</dt>
                    <dd className="mt-1 text-lg">{t('contact.address')}</dd>
                </div>
            </dl>
        </div>
    );
}
