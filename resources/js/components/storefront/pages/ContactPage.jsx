import React, { useState } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import axios from 'axios';
import { useI18n } from '../../../contexts/i18n.js';
import { useStorefrontData } from '../StorefrontData.jsx';
import { Button } from '../ui.jsx';

function digitsOnly(value, max) {
    return String(value).replace(/\D/g, '').slice(0, max);
}

function errorFromStatus(status, t) {
    if (status === 429) return t('contact.too_many');
    if (status === 422) return t('contact.validation');
    return t('contact.error');
}

export default function ContactPage() {
    const t = useI18n();
    const { settings } = useStorefrontData();
    const phone = settings.phone || t('contact.phone');
    const email = settings.contact_email || t('contact.email');
    const address = settings.address || t('contact.address');
    const [name, setName] = useState('');
    const [localPhone, setLocalPhone] = useState('');
    const [mail, setMail] = useState('');
    const [message, setMessage] = useState('');
    const [website, setWebsite] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    async function submit(event) {
        event.preventDefault();
        setError('');
        if (!name.trim() || name.trim().length > 100) {
            setError(t('contact.name_required'));
            return;
        }
        if (localPhone.length !== 9 || !localPhone.startsWith('5')) {
            setError(t('login.phone_invalid'));
            return;
        }
        if (message.trim().length < 5 || message.trim().length > 2000) {
            setError(t('contact.message_required'));
            return;
        }
        setBusy(true);
        try {
            await axios.post('/api/contact', {
                name: name.trim(),
                phone: `+995${localPhone}`,
                email: mail.trim() || null,
                message: message.trim(),
                website,
            });
            setSent(true);
        } catch (err) {
            setError(errorFromStatus(err?.response?.status, t));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="container-shell py-12 sm:py-20">
            <div className="grid gap-12 lg:grid-cols-2">
                <div className="max-w-xl">
                    <p className="section-kicker">{t('nav.contact')}</p>
                    <h1 className="section-title">{t('contact.title')}</h1>
                    <p className="mt-4 max-w-lg leading-7 text-muted">{t('contact.body')}</p>
                    <div className="mt-10 space-y-5">
                        {[[Phone, t('contact.phone_label'), phone], [Mail, t('contact.email_label'), email], [MapPin, t('contact.address_label'), address]].map(([Icon, label, value], i) => (
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
                <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
                    {sent ? (
                        <div>
                            <p className="section-kicker">{t('nav.contact')}</p>
                            <h2 className="section-title">{t('contact.success_title')}</h2>
                            <p className="mt-4 text-sm leading-7 text-muted">{t('contact.success_body')}</p>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="relative">
                            <h2 className="text-xl font-black text-navy">{t('contact.form_title')}</h2>
                            <label className="form-label mt-6" htmlFor="contact-name">{t('contact.name')}
                                <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required className="form-input" />
                            </label>
                            <label className="form-label mt-4" htmlFor="contact-phone">{t('contact.phone_label')}
                                <span className="mt-2 flex h-12 overflow-hidden rounded-lg border border-line focus-within:border-accent">
                                    <span className="flex items-center border-r border-line bg-surface px-3 text-sm font-semibold">+995</span>
                                    <input
                                        id="contact-phone"
                                        required
                                        inputMode="numeric"
                                        autoComplete="tel"
                                        value={localPhone}
                                        onChange={(e) => setLocalPhone(digitsOnly(e.target.value, 9))}
                                        placeholder={t('login.placeholder')}
                                        className="min-w-0 flex-1 px-4 outline-none"
                                    />
                                </span>
                            </label>
                            <label className="form-label mt-4" htmlFor="contact-email">{t('contact.email_optional')}
                                <input id="contact-email" type="email" value={mail} onChange={(e) => setMail(e.target.value)} className="form-input" />
                            </label>
                            <label className="form-label mt-4" htmlFor="contact-message">{t('contact.message')}
                                <textarea id="contact-message" required minLength={5} maxLength={2000} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className="form-input resize-none" />
                            </label>
                            <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                                <label htmlFor="contact-website">website
                                    <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                                </label>
                            </div>
                            {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
                            <Button className="mt-6 w-full" type="submit" disabled={busy}>
                                {busy ? t('contact.sending') : t('contact.send')}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
