import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import axios from 'axios';

export default function FormsPage() {
    const { isAuthenticated, openPhoneModal } = useAuth();
    const { lang } = useLanguage();
    const [forms, setForms] = useState([]);
    const [creating, setCreating] = useState(false);
    const [step, setStep] = useState(1); // 1 -> direction, 2 -> details, 3 -> success
    const [direction, setDirection] = useState('');
    const [comment, setComment] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [fullName, setFullName] = useState('');
    const [contact, setContact] = useState('');
    const [submitting, setSubmitting] = useState(false);

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
                    <h1 className="text-2xl font-semibold text-[#111827] mb-4">{lang === 'ka' ? 'თქვენი განაცხადები' : 'Your Forms'}</h1>
                    <div className="rounded-lg border border-black/10 bg-white p-6">
                        <p className="text-[#6b7280] mb-4">{lang === 'ka' ? 'გთხოვთ, შედით, რათა იხილოთ თქვენი განაცხადები.' : 'Please sign in to view your forms.'}</p>
                        <button className="inline-flex items-center text-sm px-4 py-2 rounded-md bg-[#111827] text-white hover:bg-[#0f172a]" onClick={openPhoneModal}>
                            {lang === 'ka' ? 'შესვლა' : 'Sign in'}
                        </button>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="pt-24 sm:pt-28">
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-semibold text-[#111827] mb-4">{lang === 'ka' ? 'განაცხადი' : 'Request Form'}</h1>

                {!creating ? (
                    <div className="rounded-lg border border-black/10 bg-white p-6 flex items-center justify-between">
                        <div>
                            <p className="text-[#6b7280]">{lang === 'ka' ? 'დააყენეთ ახალი განაცხადი' : 'Create a new request'}</p>
                        </div>
                        <button className="inline-flex items-center text-sm px-4 py-2 rounded-md bg-[#111827] text-white hover:bg-[#0f172a]" onClick={()=>{ setCreating(true); setStep(1); }}>
                            {lang === 'ka' ? 'დაწყება' : 'Start'}
                        </button>
                    </div>
                ) : (
                    <div className="rounded-lg border border-black/10 bg-white p-6">
                        <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                            {[1,2,3].map((s)=> (
                                <div key={s} className={`inline-flex items-center gap-2 ${s === step ? 'text-[#0B1220]' : ''}`}>
                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center border ${s <= step ? 'bg-[#0B1220] text-white border-[#0B1220]' : 'border-black/10 text-[#6b7280]'}`}>{s}</div>
                                    <span>
                                        {lang === 'ka' ? (s===1?'მიმართულება': s===2?'დეტალები':'დაადასტურეთ') : (s===1?'Direction': s===2?'Details':'Confirm')}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {step === 1 && (
                            <div className="mt-6">
                                <p className="text-sm text-[#111827] font-medium mb-2">{lang === 'ka' ? 'აირჩიე რომელი მიმართულება გინდა' : 'Choose a service direction'}</p>
                                <div className="grid sm:grid-cols-3 gap-3">
                                    {[{key:'fire',labelKa:'სახანძრო უსაფრთხოება',labelEn:'Fire Safety'},{key:'cctv',labelKa:'კამერები',labelEn:'Cameras'},{key:'access',labelKa:'დაშვების სისტემა',labelEn:'Access Control'}].map(opt => (
                                        <button key={opt.key} onClick={()=>setDirection(opt.key)} className={`rounded-md border px-4 py-3 text-sm ${direction===opt.key ? 'border-[#0B1220] bg-[#0B1220] text-white' : 'border-black/10 hover:border-black/20'}`}>
                                            {lang === 'ka' ? opt.labelKa : opt.labelEn}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-6 flex gap-2">
                                    <button disabled={!direction} className="inline-flex items-center text-sm px-4 py-2 rounded-md bg-[#111827] text-white disabled:opacity-50" onClick={()=>setStep(2)}>
                                        {lang === 'ka' ? 'შემდეგი' : 'Next'}
                                    </button>
                                    <button className="text-sm px-4 py-2 rounded-md border border-black/10" onClick={()=>setCreating(false)}>
                                        {lang === 'ka' ? 'გაუქმება' : 'Cancel'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="mt-6 grid gap-4">
                                <div>
                                    <label className="block text-sm mb-1 text-[#6b7280]">{lang === 'ka' ? 'მოგვიყევი რა გსურთ (კომენტარი)' : 'Tell us what you need (comment)'}</label>
                                    <textarea className="w-full rounded-md border border-black/10 px-3 py-2 text-sm" rows={5} value={comment} onChange={(e)=>setComment(e.target.value)} placeholder={lang === 'ka' ? 'სავალდებულო' : 'Required'} />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1 text-[#6b7280]">{lang === 'ka' ? 'ატაჩმენტი (DWG, PDF, სურათები) – არასავალდებულო' : 'Attachment (DWG, PDF, images) – optional'}</label>
                                    <input type="file" accept=".dwg,.pdf,application/pdf,image/*" onChange={(e)=>setAttachment(e.target.files?.[0] || null)} />
                                    <p className="mt-1 text-xs text-[#6b7280]">{lang === 'ka' ? 'თუ ატვირთავთ, თქვენი მოთხოვნა დაჩქარებული წესით განიხილება' : 'If you attach a file, we will prioritize your request'}</p>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <input className="border border-black/10 rounded px-3 py-2" placeholder={lang === 'ka' ? 'სახელი და გვარი' : 'Full name'} value={fullName} onChange={(e)=>setFullName(e.target.value)} />
                                    <input className="border border-black/10 rounded px-3 py-2" placeholder={lang === 'ka' ? 'საკონტაქტო ინფორმაცია' : 'Contact info'} value={contact} onChange={(e)=>setContact(e.target.value)} />
                                </div>
                                <div className="flex gap-2">
                                    <button className="inline-flex items-center text-sm px-4 py-2 rounded-md bg-[#111827] text-white disabled:opacity-50" disabled={!comment.trim() || !fullName.trim() || !contact.trim() || submitting} onClick={async()=>{
                                        setSubmitting(true);
                                        try {
                                            const form = new FormData();
                                            form.append('title', lang === 'ka' ? `მოთხოვნა: ${direction}` : `Request: ${direction}`);
                                            form.append('input_one', direction);
                                            form.append('input_two', comment.trim());
                                            form.append('input_three', `${fullName.trim()} | ${contact.trim()}`);
                                            if (attachment) form.append('attachment', attachment);
                                            const res = await axios.post('/api/forms', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                                            setForms([res.data, ...forms]);
                                            setStep(3);
                                        } finally {
                                            setSubmitting(false);
                                        }
                                    }}>
                                        {submitting ? (lang === 'ka' ? 'იგზავნება…' : 'Submitting…') : (lang === 'ka' ? 'გაგზავნა' : 'Submit')}
                                    </button>
                                    <button className="text-sm px-4 py-2 rounded-md border border-black/10" onClick={()=>setStep(1)}>
                                        {lang === 'ka' ? 'უკან' : 'Back'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="mt-6 text-center">
                                <div className="mx-auto h-14 w-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-2.59a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06l1.47 1.47 3.97-3.97a.75.75 0 0 1 1.06 0Z" clipRule="evenodd"/></svg>
                                </div>
                                <h2 className="mt-4 text-xl font-semibold text-[#111827]">{lang === 'ka' ? 'თქვენი განაცხადი მიღებულია' : 'Your request has been received'}</h2>
                                <p className="mt-1 text-[#6b7280]">{lang === 'ka' ? 'ჩვენი ინჟინერი ძალიან მალე დაგიკავშირდებათ.' : 'Our engineer will contact you very soon.'}</p>
                                <div className="mt-6 flex items-center justify-center gap-2">
                                    <button className="text-sm px-4 py-2 rounded-md border border-black/10" onClick={()=>{ setCreating(false); setDirection(''); setComment(''); setAttachment(null); setFullName(''); setContact(''); }}>
                                        {lang === 'ka' ? 'დახურვა' : 'Close'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {forms.length > 0 && (
                    <div className="mt-6 rounded-lg border border-black/10 bg-white p-4">
                        <h2 className="text-sm font-medium text-[#111827] mb-2">{lang === 'ka' ? 'ბოლო განაცხადები' : 'Recent Requests'}</h2>
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
                                    }}>{lang === 'ka' ? 'გახსნა' : 'Open'}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>
        </main>
    );
}


