import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import axios from 'axios';

export default function FormsPage() {
    const { isAuthenticated, openPhoneModal } = useAuth();
    const [forms, setForms] = useState([]);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({ title: '', input_one: '', input_two: '', input_three: '' });

    // Open login modal after render if user is not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            openPhoneModal();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            axios.get('/api/forms').then((res) => setForms(res.data || [])).catch(() => {});
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <main className="pt-24 sm:pt-28">
                <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h1 className="text-2xl font-semibold text-[#111827] mb-4">Your Forms</h1>
                    <div className="rounded-lg border border-black/10 bg-white p-6">
                        <p className="text-[#6b7280] mb-4">Please sign in to view your forms.</p>
                        <button className="inline-flex items-center text-sm px-4 py-2 rounded-md bg-[#111827] text-white hover:bg-[#0f172a]" onClick={openPhoneModal}>
                            Sign in
                        </button>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="pt-24 sm:pt-28">
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-semibold text-[#111827] mb-4">Your Forms</h1>
                <div className="rounded-lg border border-black/10 bg-white p-4">
                    {forms.length === 0 ? (
                        <p className="text-[#6b7280]">No forms yet. Create your first form.</p>
                    ) : (
                        <ul className="divide-y divide-black/5">
                            {forms.map((f) => (
                                <li key={f.id} className="py-3 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-[#111827]">{f.title}</p>
                                        <p className="text-sm text-[#6b7280]">{f.status}</p>
                                    </div>
                                    <a href={`/forms/${f.id}`} className="text-sm px-3 py-1.5 rounded border border-black/10 hover:border-black/30" onClick={(e)=>{
                                        e.preventDefault();
                                        window.history.pushState({}, '', `/forms/${f.id}`);
                                        window.dispatchEvent(new PopStateEvent('popstate'));
                                    }}>Open</a>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-4">
                        {creating ? (
                            <div className="grid sm:grid-cols-2 gap-3">
                                <input className="border border-black/10 rounded px-3 py-2" placeholder="Title" value={formData.title} onChange={(e)=>setFormData({...formData,title:e.target.value})} />
                                <input className="border border-black/10 rounded px-3 py-2" placeholder="Input one" value={formData.input_one} onChange={(e)=>setFormData({...formData,input_one:e.target.value})} />
                                <input className="border border-black/10 rounded px-3 py-2" placeholder="Input two" value={formData.input_two} onChange={(e)=>setFormData({...formData,input_two:e.target.value})} />
                                <input className="border border-black/10 rounded px-3 py-2" placeholder="Input three" value={formData.input_three} onChange={(e)=>setFormData({...formData,input_three:e.target.value})} />
                                <div className="col-span-full flex gap-2">
                                    <button className="inline-flex items-center text-sm px-4 py-2 rounded-md bg-[#111827] text-white hover:bg-[#0f172a]" onClick={async()=>{
                                        const res = await axios.post('/api/forms', formData);
                                        setForms([res.data, ...forms]);
                                        setFormData({ title: '', input_one: '', input_two: '', input_three: '' });
                                        setCreating(false);
                                    }}>Save</button>
                                    <button className="text-sm px-4 py-2 rounded-md border border-black/10" onClick={()=>setCreating(false)}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button className="inline-flex items-center text-sm px-4 py-2 rounded-md bg-[#111827] text-white hover:bg-[#0f172a]" onClick={()=>setCreating(true)}>
                                New form
                            </button>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}


