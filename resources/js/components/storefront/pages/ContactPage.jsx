import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useI18n } from '../../../contexts/i18n.js';

export default function ContactPage() {
    const t = useI18n();
    return (
        <div className="container-shell py-12 sm:py-20">
            <div className="max-w-xl">
                <p className="section-kicker">{t('nav.contact')}</p>
                <h1 className="section-title">{t('contact.title')}</h1>
                <p className="mt-4 max-w-lg leading-7 text-muted">{t('contact.body')}</p>
                <div className="mt-10 space-y-5">
                    {[[Phone, t('contact.phone_label'), t('contact.phone')], [Mail, t('contact.email_label'), t('contact.email')], [MapPin, t('contact.address_label'), t('contact.address')]].map(([Icon, label, value], i) => (
                        <div key={i} className="flex items-center gap-4">
                            <span className="grid size-11 place-items-center rounded-lg bg-surface text-navy"><Icon size={19} /></span>
                            <div>
                                <p className="text-xs text-muted">{label}</p>
                                <strong className="text-sm text-navy">{value}</strong>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
