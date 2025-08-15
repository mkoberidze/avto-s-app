import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function PhoneAuthModal() {
    const { phoneModalOpen, closePhoneModal, requestOtp, verifyOtp } = useAuth();
    const [phone, setPhone] = useState('');
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
                await requestOtp(phone);
                setStage('otp');
            } else {
                await verifyOtp(phone, otp);
                setPhone('');
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
                    <h3 className="text-lg font-medium text-[#111827]">Continue with phone</h3>
                    <button className="text-sm text-[#6b7280] hover:text-[#111827]" onClick={closePhoneModal}>Close</button>
                </div>
                {stage === 'phone' ? (
                    <>
                        <label className="block text-sm mb-1 text-[#6b7280]">Phone number</label>
                        <input
                            type="tel"
                            inputMode="tel"
                            placeholder="e.g. +1 555 123 4567"
                            className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </>
                ) : (
                    <>
                        <label className="block text-sm mb-1 text-[#6b7280]">Enter OTP</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="6-digit code"
                            className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 tracking-widest"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                        />
                    </>
                )}
                {error ? <p className="mt-2 text-xs text-[#DC2626]">{error}</p> : null}
                <button
                    disabled={loading}
                    className="mt-4 w-full inline-flex items-center justify-center text-sm px-4 py-2 rounded-md bg-[#111827] text-white hover:bg-[#0f172a] disabled:opacity-60 transition"
                    onClick={handleContinue}
                >
                    {loading ? 'Please wait…' : stage === 'phone' ? 'Send code' : 'Verify'}
                </button>
                <p className="mt-2 text-xs text-[#6b7280]">We’ll send you a verification code.</p>
            </div>
        </div>
    );
}


