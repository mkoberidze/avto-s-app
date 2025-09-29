import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PAGE_SLUGS = ['services', 'about', 'contact'];

export default function AdminPagesEditor() {
    const [active, setActive] = useState('services');
    const [data, setData] = useState({
        services: { title_en: '', title_ka: '', body_en: '', body_ka: '', sections: [] },
        about: { title_en: '', title_ka: '', body_en: '', body_ka: '', sections: [] },
        contact: { title_en: '', title_ka: '', body_en: '', body_ka: '', sections: [] },
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        PAGE_SLUGS.forEach((slug) => {
            axios.get(`/api/admin/pages/${slug}`)
                .then(res => {
                    if (res.data) {
                        setData(prev => ({ ...prev, [slug]: {
                            title_en: res.data.title_en || '',
                            title_ka: res.data.title_ka || '',
                            body_en: res.data.body_en || '',
                            body_ka: res.data.body_ka || '',
                            sections: Array.isArray(res.data.sections) ? res.data.sections : [],
                        }}));
                    }
                })
                .catch(() => {});
        });
    }, []);

    const current = data[active] || {};

    async function save() {
        setSaving(true);
        try {
            await axios.post(`/api/admin/pages/${active}`, current);
        } finally {
            setSaving(false);
        }
    }

    function update(field, value) {
        setData(prev => ({ ...prev, [active]: { ...prev[active], [field]: value } }));
    }

    function addSection() {
        setData(prev => ({ ...prev, [active]: { ...prev[active], sections: [...(prev[active].sections || []), { title_en: '', title_ka: '', body_en: '', body_ka: '' }] } }));
    }

    function updateSection(index, field, value) {
        setData(prev => {
            const sections = [...(prev[active].sections || [])];
            sections[index] = { ...sections[index], [field]: value };
            return { ...prev, [active]: { ...prev[active], sections } };
        });
    }

    function removeSection(index) {
        setData(prev => {
            const sections = [...(prev[active].sections || [])];
            sections.splice(index, 1);
            return { ...prev, [active]: { ...prev[active], sections } };
        });
    }

    return (
        <main className="pt-24 sm:pt-28">
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-semibold text-[#111827]">Manage Pages</h1>
                </div>

                <div className="bg-white border border-black/10 rounded-lg p-4">
                    <div className="flex gap-2 mb-4">
                        {PAGE_SLUGS.map((slug) => (
                            <button key={slug} onClick={() => setActive(slug)} className={`text-sm px-3 py-1.5 rounded border ${active===slug ? 'bg-[#111827] text-white border-[#111827]' : 'border-black/10 hover:border-black/30'}`}>
                                {slug.charAt(0).toUpperCase()+slug.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-[#6b7280] mb-1">Title (EN)</label>
                            <input value={current.title_en || ''} onChange={(e)=>update('title_en', e.target.value)} className="w-full border border-black/10 rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-[#6b7280] mb-1">Title (KA)</label>
                            <input value={current.title_ka || ''} onChange={(e)=>update('title_ka', e.target.value)} className="w-full border border-black/10 rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="sm:col-span-1">
                            <label className="block text-xs text-[#6b7280] mb-1">Body (EN)</label>
                            <textarea value={current.body_en || ''} onChange={(e)=>update('body_en', e.target.value)} rows={10} className="w-full border border-black/10 rounded px-3 py-2 text-sm" />
                        </div>
                        <div className="sm:col-span-1">
                            <label className="block text-xs text-[#6b7280] mb-1">Body (KA)</label>
                            <textarea value={current.body_ka || ''} onChange={(e)=>update('body_ka', e.target.value)} rows={10} className="w-full border border-black/10 rounded px-3 py-2 text-sm" />
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-medium text-[#111827]">Sections</h2>
                            <button onClick={addSection} className="text-xs px-2 py-1 rounded border border-black/10 hover:border-black/30">Add section</button>
                        </div>
                        <div className="space-y-4">
                            {(current.sections || []).map((sec, idx) => (
                                <div key={idx} className="border border-black/10 rounded p-3 bg-gray-50">
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-[#6b7280] mb-1">Subtitle (EN)</label>
                                            <input value={sec.title_en || ''} onChange={(e)=>updateSection(idx, 'title_en', e.target.value)} className="w-full border border-black/10 rounded px-3 py-2 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[#6b7280] mb-1">Subtitle (KA)</label>
                                            <input value={sec.title_ka || ''} onChange={(e)=>updateSection(idx, 'title_ka', e.target.value)} className="w-full border border-black/10 rounded px-3 py-2 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[#6b7280] mb-1">Body (EN)</label>
                                            <textarea value={sec.body_en || ''} onChange={(e)=>updateSection(idx, 'body_en', e.target.value)} rows={6} className="w-full border border-black/10 rounded px-3 py-2 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[#6b7280] mb-1">Body (KA)</label>
                                            <textarea value={sec.body_ka || ''} onChange={(e)=>updateSection(idx, 'body_ka', e.target.value)} rows={6} className="w-full border border-black/10 rounded px-3 py-2 text-sm" />
                                        </div>
                                    </div>
                                    <div className="mt-2 text-right">
                                        <button onClick={()=>removeSection(idx)} className="text-xs px-2 py-1 rounded border border-black/10 hover:border-black/30">Remove</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <button onClick={save} disabled={saving} className="text-sm px-3 py-1.5 rounded bg-[#111827] text-white disabled:opacity-50">
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                        <a href="/admin" className="text-sm px-3 py-1.5 rounded border border-black/10 hover:border-black/30">Back to Admin</a>
                    </div>
                </div>
            </section>
        </main>
    );
}


