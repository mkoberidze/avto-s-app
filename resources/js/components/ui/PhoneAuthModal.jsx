import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useI18n } from '../../contexts/i18n.js';

export default function PhoneAuthModal() {
    const { phoneModalOpen, closePhoneModal, requestOtp, verifyOtp } = useAuth();
    const t = useI18n();
    // Local Georgian mobile number without country code (9 digits, starts with 5)
    const [phoneLocal, setPhoneLocal] = useState('');
    // Canonical phone sent to backend: digits-only, e.g. 995599677003
    const [normalizedPhone, setNormalizedPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [stage, setStage] = useState('phone'); // 'phone' | 'otp'
    const [otp, setOtp] = useState('');

    if (!phoneModalOpen) return null;

    async function handleContinue() {
        setError('');
        setLoading(true);
        try {
            if (stage === 'phone') {
                const digits = String(phoneLocal).replace(/\D/g, '').slice(0, 9);
                if (digits.length !== 9 || !digits.startsWith('5')) {
                    throw new Error('Enter a valid Georgian mobile (5XXXXXXXX)');
                }
                const full = `995${digits}`; // digits-only for backend
                await requestOtp(full);
                setNormalizedPhone(full);
                setStage('otp');
            } else {
                const code = String(otp).replace(/\D/g, '').slice(0, 6);
                await verifyOtp(normalizedPhone, code);
                setPhoneLocal('');
                setOtp('');
                setStage('phone');
            }
        } catch (e) {
            setError(e.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20" onClick={closePhoneModal} />
            <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-black/5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-[#111827]">{t('phone.title')}</h3>
                    <button className="text-sm text-[#6b7280] hover:text-[#111827]" onClick={closePhoneModal}>{t('phone.close')}</button>
                </div>
                {stage === 'phone' ? (
                    <>
                        <label className="block text-sm mb-1 text-[#6b7280]">{t('phone.number_label')}</label>
                        <div className="flex items-stretch w-full">
                            <div className="inline-flex items-center gap-2 rounded-l-md border border-black/10 bg-white px-3 text-sm text-[#111827] select-none">
                                <span role="img" aria-label="Georgia">🇬🇪</span>
                                <span className="text-[#6b7280]">+995</span>
                            </div>
                            <input
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder={t('phone.placeholder_local')}
                                className="flex-1 rounded-r-md border border-l-0 border-black/10 bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20"
                                value={phoneLocal}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                                    setPhoneLocal(digits);
                                }}
                            />
                        </div>
                        <p className="mt-1 text-xs text-[#6b7280]">{t('phone.only_georgian')}</p>
                    </>
                ) : (
                    <>
                        <label className="block text-sm mb-1 text-[#6b7280]">{t('phone.otp_label')}</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder={t('phone.otp_placeholder')}
                            className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 tracking-widest"
                            value={otp}
                            onChange={(e) => {
                                const code = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setOtp(code);
                            }}
                        />
                    </>
                )}
                {error ? <p className="mt-2 text-xs text-[#DC2626]">{error}</p> : null}
                <button
                    disabled={loading}
                    className="mt-4 w-full inline-flex items-center justify-center text-sm px-4 py-2 rounded-md bg-[#111827] text-white hover:bg-[#0f172a] disabled:opacity-60 transition"
                    onClick={handleContinue}
                >
                    {loading ? 'Please wait…' : stage === 'phone' ? t('phone.send_code') : t('phone.verify')}
                </button>
                <p className="mt-2 text-xs text-[#6b7280]">{t('phone.disclaimer')}</p>
            </div>
        </div>
    );
}


