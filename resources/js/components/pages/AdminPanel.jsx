import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useI18n } from '../../contexts/i18n.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { translateStatus } from '../../contexts/i18n.js';
import AttachmentPreview from '../ui/AttachmentPreview.jsx';

export default function AdminPanel() {
    const { isAuthenticated, user } = useAuth();
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const t = useI18n();
    const { lang } = useLanguage();

    useEffect(() => {
        if (isAuthenticated && user?.hasRole && user.hasRole('admin')) {
            loadForms();
        }
    }, [isAuthenticated, user]);

    const loadForms = async () => {
        try {
            const response = await axios.get('/api/admin/forms');
            setForms(response.data);
        } catch (error) {
            console.error('Failed to load forms:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateFormStatus = async (formId, newStatus) => {
        try {
            await axios.put(`/api/admin/forms/${formId}/status`, { status: newStatus });
            loadForms(); // Reload to get updated data
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

   // // Redirect if not admin
   //  if (isAuthenticated && user?.hasRole && !user.hasRole('admin')) {
   //      return <Navigate to="/" replace />;
   //  }
   //
   //  if (!isAuthenticated) {
   //      return <Navigate to="/" replace />;
   //  }
   //
   //  if (loading) {
   //      return (
   //          <main className="pt-24 sm:pt-28">
   //              <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
   //                  <p className="text-[#6b7280]">Loading admin panel...</p>
   //              </section>
   //          </main>
   //      );
   //  }

    const unopenedForms = forms.filter(f => f.status === 'unopened');
    const underReviewForms = forms.filter(f => f.status === 'under_review');
    const inProgressForms = forms.filter(f => f.status === 'in_progress');
    const completedForms = forms.filter(f => f.status === 'completed');

    return (
        <main className="pt-24 sm:pt-28">
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-semibold text-[#111827]">{t('admin.title')}</h1>
                    <Link to="/admin/pages" className="text-sm px-3 py-1.5 rounded border border-black/10 hover:border-black/30">{t('admin.manage_pages')}</Link>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Unopened Forms */}
                    <div className="bg-white rounded-lg border border-black/10 p-4">
                        <h2 className="text-lg font-medium text-[#111827] mb-3">{t('admin.col_unopened')} ({unopenedForms.length})</h2>
                        <div className="space-y-2">
                            {unopenedForms.map(form => (
                                <div key={form.id} className="p-3 border border-black/5 rounded bg-gray-50">
                                    <p className="font-medium text-sm">{form.title}</p>
                                    <p className="text-xs text-[#6b7280] mb-2">{t('admin.from')}: {form.user?.phone || 'Unknown'}</p>
                                    {form.attachment_url && <AttachmentPreview url={form.attachment_url} size="sm" className="mt-1" />}
                                    <div className="flex items-center gap-2 mt-2">
                                        <Link to={`/admin/form/${form.id}`} className="text-xs px-2 py-1 border border-black/10 rounded hover:bg-white">Open</Link>
                                    <button
                                        onClick={() => updateFormStatus(form.id, 'under_review')}
                                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                    >
                                        {t('admin.mark_under_review')}
                                    </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Under Review */}
                    <div className="bg-white rounded-lg border border-black/10 p-4">
                        <h2 className="text-lg font-medium text-[#111827] mb-3">{t('admin.col_under_review')} ({underReviewForms.length})</h2>
                        <div className="space-y-2">
                            {underReviewForms.map(form => (
                                <div key={form.id} className="p-3 border border-black/5 rounded bg-gray-50">
                                    <p className="font-medium text-sm">{form.title}</p>
                                    <p className="text-xs text-[#6b7280] mb-2">{t('admin.from')}: {form.user?.phone || 'Unknown'}</p>
                                    {form.attachment_url && <AttachmentPreview url={form.attachment_url} size="sm" className="mt-1" />}
                                    <div className="flex items-center gap-2 mt-2">
                                        <Link to={`/admin/form/${form.id}`} className="text-xs px-2 py-1 border border-black/10 rounded hover:bg-white">Open</Link>
                                        <button
                                            onClick={() => updateFormStatus(form.id, 'in_progress')}
                                            className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                                        >
                                            {t('admin.mark_in_progress')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* In Progress */}
                    <div className="bg-white rounded-lg border border-black/10 p-4">
                        <h2 className="text-lg font-medium text-[#111827] mb-3">{t('admin.col_in_progress')} ({inProgressForms.length})</h2>
                        <div className="space-y-2">
                            {inProgressForms.map(form => (
                                <div key={form.id} className="p-3 border border-black/5 rounded bg-gray-50">
                                    <p className="font-medium text-sm">{form.title}</p>
                                    <p className="text-xs text-[#6b7280] mb-2">{t('admin.from')}: {form.user?.phone || 'Unknown'}</p>
                                    {form.attachment_url && <AttachmentPreview url={form.attachment_url} size="sm" className="mt-1" />}
                                    <div className="flex items-center gap-2 mt-2">
                                        <Link to={`/admin/form/${form.id}`} className="text-xs px-2 py-1 border border-black/10 rounded hover:bg-white">Open</Link>
                                        <button
                                            onClick={() => updateFormStatus(form.id, 'completed')}
                                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                        >
                                            {t('admin.mark_completed')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Completed Forms */}
                    <div className="bg-white rounded-lg border border-black/10 p-4">
                        <h2 className="text-lg font-medium text-[#111827] mb-3">{t('admin.col_completed')} ({completedForms.length})</h2>
                        <div className="space-y-2">
                            {completedForms.map(form => (
                                <div key={form.id} className="p-3 border border-black/5 rounded bg-gray-50">
                                    <p className="font-medium text-sm">{form.title}</p>
                                    <p className="text-xs text-[#6b7280] mb-2">{t('admin.from')}: {form.user?.phone || 'Unknown'}</p>
                                    {form.attachment_url && <AttachmentPreview url={form.attachment_url} size="sm" className="mt-1" />}
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                        {t('admin.col_completed')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
