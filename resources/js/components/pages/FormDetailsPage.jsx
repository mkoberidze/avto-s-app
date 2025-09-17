import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { translateStatus } from '../../contexts/i18n.js';
import { useI18n } from '../../contexts/i18n.js';
import AttachmentPreview from '../ui/AttachmentPreview.jsx';

export default function FormDetailsPage() {
    const { id } = useParams();
    const [form, setForm] = useState(null);
    const [editing, setEditing] = useState(false);
    const [data, setData] = useState({ title: '', input_one: '', input_two: '', input_three: '', status: 'unopened', attachment: null });
    const { lang } = useLanguage();
    const t = useI18n();

    useEffect(() => {
        axios.get(`/api/forms/${id}`).then((res) => {
            setForm(res.data);
            setData({
                title: res.data.title || '',
                input_one: res.data.input_one || '',
                input_two: res.data.input_two || '',
                input_three: res.data.input_three || '',
                status: res.data.status || 'draft',
                attachment: null,
            });
        }).catch(() => {});
    }, [id]);

    if (!form) {
        return (
            <main className="pt-24 sm:pt-28">
                <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <p className="text-[#6b7280]">{t('details.loading')}</p>
                </section>
            </main>
        );
    }

    return (
        <main className="pt-24 sm:pt-28">
            <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-semibold text-[#111827]">{form.title}</h1>
                    {!editing && (
                        <button className="text-sm px-4 py-2 rounded-md border border-black/10" onClick={() => setEditing(true)}>{t('details.edit')}</button>
                    )}
                </div>
                <div className="rounded-lg border border-black/10 bg-white p-4">
                    {editing ? (
                        <div className="grid sm:grid-cols-2 gap-3">
                            <input className="border border-black/10 rounded px-3 py-2" placeholder="Title" value={data.title} onChange={(e)=>setData({...data,title:e.target.value})} />
                            <select className="border border-black/10 rounded px-3 py-2" value={data.status} onChange={(e)=>setData({...data,status:e.target.value})}>
                                <option value="unopened">{translateStatus('unopened', lang)}</option>
                                <option value="under_review">{translateStatus('under_review', lang)}</option>
                                <option value="in_progress">{translateStatus('in_progress', lang)}</option>
                                <option value="completed">{translateStatus('completed', lang)}</option>
                            </select>
                            <input className="border border-black/10 rounded px-3 py-2" placeholder={t('details.input_one')} value={data.input_one} onChange={(e)=>setData({...data,input_one:e.target.value})} />
                            <input className="border border-black/10 rounded px-3 py-2" placeholder={t('details.input_two')} value={data.input_two} onChange={(e)=>setData({...data,input_two:e.target.value})} />
                            <input className="border border-black/10 rounded px-3 py-2" placeholder={t('details.input_three')} value={data.input_three} onChange={(e)=>setData({...data,input_three:e.target.value})} />
                            <div className="sm:col-span-2">
                                <label className="block text-xs text-[#6b7280] mb-1">Attachment</label>
                                {form.attachment_url ? (
                                    <AttachmentPreview url={form.attachment_url} size="md" className="mb-2" />
                                ) : null}
                                <input type="file" accept="image/*,application/pdf,.dwg" onChange={(e)=>setData({...data,attachment:e.target.files?.[0]||null})} />
                            </div>
                            <div className="col-span-full flex gap-2">
                                <button className="inline-flex items-center text-sm px-4 py-2 rounded-md bg-[#111827] text-white hover:bg-[#0f172a]" onClick={async()=>{
                                    const formData = new FormData();
                                    formData.append('title', data.title);
                                    formData.append('status', data.status);
                                    formData.append('input_one', data.input_one);
                                    formData.append('input_two', data.input_two);
                                    formData.append('input_three', data.input_three);
                                    if (data.attachment) {
                                        formData.append('attachment', data.attachment);
                                    }
                                    const res = await axios.put(`/api/forms/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                                    setForm(res.data);
                                    setEditing(false);
                                }}>{t('details.save')}</button>
                                <button className="text-sm px-4 py-2 rounded-md border border-black/10" onClick={()=>setEditing(false)}>{t('details.cancel')}</button>
                            </div>
                        </div>
                    ) : (
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <dt className="text-xs text-[#6b7280]">{t('details.status')}</dt>
                                <dd className="text-sm text-[#111827]">{translateStatus(form.status, lang)}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-[#6b7280]">{t('details.input_one')}</dt>
                                <dd className="text-sm text-[#111827]">{form.input_one}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-[#6b7280]">{t('details.input_two')}</dt>
                                <dd className="text-sm text-[#111827]">{form.input_two}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-[#6b7280]">{t('details.input_three')}</dt>
                                <dd className="text-sm text-[#111827]">{form.input_three}</dd>
                            </div>
                            {form.attachment_url && (
                                <div className="sm:col-span-2">
                                    <dt className="text-xs text-[#6b7280]">Attachment</dt>
                                    <dd className="text-sm text-[#111827]"><AttachmentPreview url={form.attachment_url} size="md" /></dd>
                                </div>
                            )}
                        </dl>
                    )}
                </div>
            </section>
        </main>
    );
}


