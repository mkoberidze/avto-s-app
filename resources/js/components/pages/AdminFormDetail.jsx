import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { translateStatus, useI18n } from '../../contexts/i18n.js';
import AttachmentPreview from '../ui/AttachmentPreview.jsx';

export default function AdminFormDetail() {
    const { id } = useParams();
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const { lang } = useLanguage();
    const t = useI18n();

    useEffect(() => {
        async function load() {
            try {
                const res = await axios.get(`/api/admin/forms/${id}`);
                setForm(res.data);
            } catch (e) {
                // noop
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    if (loading) {
        return (
            <main className="pt-24 sm:pt-28">
                <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <p className="text-[#6b7280]">Loading…</p>
                </section>
            </main>
        );
    }

    if (!form) {
        return (
            <main className="pt-24 sm:pt-28">
                <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <p className="text-[#6b7280]">Form not found.</p>
                    <Link to="/admin" className="text-blue-600 underline">Back to admin</Link>
                </section>
            </main>
        );
    }

    return (
        <main className="pt-24 sm:pt-28">
            <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-semibold text-[#111827]">{form.title}</h1>
                    <Link to="/admin" className="text-sm px-4 py-2 rounded-md border border-black/10">Back</Link>
                </div>
                <div className="rounded-lg border border-black/10 bg-white p-4">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <dt className="text-xs text-[#6b7280]">Status</dt>
                            <dd className="text-sm text-[#111827]">{translateStatus(form.status, lang)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-[#6b7280]">User</dt>
                            <dd className="text-sm text-[#111827]">{form.user?.phone || 'Unknown'}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-xs text-[#6b7280]">{t('details.input_one')}</dt>
                            <dd className="text-sm text-[#111827] whitespace-pre-wrap">{form.input_one || '-'}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-xs text-[#6b7280]">{t('details.input_two')}</dt>
                            <dd className="text-sm text-[#111827] whitespace-pre-wrap">{form.input_two || '-'}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-xs text-[#6b7280]">{t('details.input_three')}</dt>
                            <dd className="text-sm text-[#111827] whitespace-pre-wrap">{form.input_three || '-'}</dd>
                        </div>
                        {form.attachment_url && (
                            <div className="sm:col-span-2">
                                <dt className="text-xs text-[#6b7280]">Attachment</dt>
                                <dd className="text-sm text-[#111827]"><AttachmentPreview url={form.attachment_url} size="md" /></dd>
                            </div>
                        )}
                    </dl>
                </div>
            </section>
        </main>
    );
}


