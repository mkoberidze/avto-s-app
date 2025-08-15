import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export default function FormDetailsPage() {
    const { id } = useParams();
    const [form, setForm] = useState(null);
    const [editing, setEditing] = useState(false);
    const [data, setData] = useState({ title: '', input_one: '', input_two: '', input_three: '', status: 'unopened' });

    useEffect(() => {
        axios.get(`/api/forms/${id}`).then((res) => {
            setForm(res.data);
            setData({
                title: res.data.title || '',
                input_one: res.data.input_one || '',
                input_two: res.data.input_two || '',
                input_three: res.data.input_three || '',
                status: res.data.status || 'draft',
            });
        }).catch(() => {});
    }, [id]);

    if (!form) {
        return (
            <main className="pt-24 sm:pt-28">
                <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <p className="text-[#6b7280]">Loading...</p>
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
                        <button className="text-sm px-4 py-2 rounded-md border border-black/10" onClick={() => setEditing(true)}>Edit</button>
                    )}
                </div>
                <div className="rounded-lg border border-black/10 bg-white p-4">
                    {editing ? (
                        <div className="grid sm:grid-cols-2 gap-3">
                            <input className="border border-black/10 rounded px-3 py-2" placeholder="Title" value={data.title} onChange={(e)=>setData({...data,title:e.target.value})} />
                            <select className="border border-black/10 rounded px-3 py-2" value={data.status} onChange={(e)=>setData({...data,status:e.target.value})}>
                                <option value="unopened">unopened</option>
                                <option value="seen">seen</option>
                                <option value="completed">completed</option>
                            </select>
                            <input className="border border-black/10 rounded px-3 py-2" placeholder="Input one" value={data.input_one} onChange={(e)=>setData({...data,input_one:e.target.value})} />
                            <input className="border border-black/10 rounded px-3 py-2" placeholder="Input two" value={data.input_two} onChange={(e)=>setData({...data,input_two:e.target.value})} />
                            <input className="border border-black/10 rounded px-3 py-2" placeholder="Input three" value={data.input_three} onChange={(e)=>setData({...data,input_three:e.target.value})} />
                            <div className="col-span-full flex gap-2">
                                <button className="inline-flex items-center text-sm px-4 py-2 rounded-md bg-[#111827] text-white hover:bg-[#0f172a]" onClick={async()=>{
                                    const res = await axios.put(`/api/forms/${id}`, data);
                                    setForm(res.data);
                                    setEditing(false);
                                }}>Save</button>
                                <button className="text-sm px-4 py-2 rounded-md border border-black/10" onClick={()=>setEditing(false)}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <dt className="text-xs text-[#6b7280]">Status</dt>
                                <dd className="text-sm text-[#111827]">{form.status}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-[#6b7280]">Input one</dt>
                                <dd className="text-sm text-[#111827]">{form.input_one}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-[#6b7280]">Input two</dt>
                                <dd className="text-sm text-[#111827]">{form.input_two}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-[#6b7280]">Input three</dt>
                                <dd className="text-sm text-[#111827]">{form.input_three}</dd>
                            </div>
                        </dl>
                    )}
                </div>
            </section>
        </main>
    );
}


