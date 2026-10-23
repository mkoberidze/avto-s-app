import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useI18n } from '../../../contexts/i18n.js';
import { safeInternalPath } from '../../../lib/safePath.js';
import { Button } from '../ui.jsx';

function digitsOnly(value, max) {
    return String(value).replace(/\D/g, '').slice(0, max);
}

function errorFromRequest(err, t) {
    const status = err?.response?.status;
    const retry = err?.response?.data?.retry_after;
    if (status === 503) return t('login.sms_failed');
    if (status === 429) {
        return t('login.too_many').replace('{n}', retry != null ? String(retry) : '60');
    }
    return t('login.error');
}

export default function LoginPage() {
    const t = useI18n();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, loading, requestOtp, verifyOtp } = useAuth();
    const redirectTo = safeInternalPath(new URLSearchParams(location.search).get('redirect'), '/');
    const [step, setStep] = useState(1);
    const [phone, setPhone] = useState('');
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const refs = useRef([]);

    useEffect(() => {
        if (step !== 2 || countdown <= 0) return undefined;
        const timer = setTimeout(() => setCountdown((n) => n - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, step]);

    if (loading) {
        return (
            <div className="container-shell grid min-h-[44rem] place-items-center py-12">
                <div className="h-80 w-full max-w-md animate-pulse rounded-2xl bg-slate-100" />
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    const fullPhone = `+995${phone}`;

    async function send(event) {
        event.preventDefault();
        setError('');
        if (phone.length !== 9 || !phone.startsWith('5')) {
            setError(t('login.phone_invalid'));
            return;
        }
        setBusy(true);
        try {
            await requestOtp(fullPhone);
            setStep(2);
            setCountdown(60);
            setDigits(['', '', '', '', '', '']);
        } catch (err) {
            setError(errorFromRequest(err, t));
        } finally {
            setBusy(false);
        }
    }

    function changeDigit(index, value) {
        const clean = digitsOnly(value, 1);
        setDigits((old) => old.map((v, i) => (i === index ? clean : v)));
        if (clean && index < 5) refs.current[index + 1]?.focus();
    }

    function paste(event) {
        const clean = digitsOnly(event.clipboardData.getData('text'), 6).split('');
        if (!clean.length) return;
        event.preventDefault();
        setDigits(Array.from({ length: 6 }, (_, i) => clean[i] || ''));
        refs.current[Math.min(clean.length, 5)]?.focus();
    }

    async function verify(event) {
        event.preventDefault();
        setError('');
        const code = digits.join('');
        if (code.length !== 6) {
            setError(t('login.invalid'));
            return;
        }
        setBusy(true);
        try {
            await verifyOtp(fullPhone, code);
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err?.response?.status === 422 ? t('login.invalid') : errorFromRequest(err, t));
        } finally {
            setBusy(false);
        }
    }

    async function resend() {
        if (countdown > 0 || busy) return;
        setError('');
        setBusy(true);
        try {
            await requestOtp(fullPhone);
            setCountdown(60);
        } catch (err) {
            setError(errorFromRequest(err, t));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="container-shell grid min-h-[44rem] place-items-center py-12">
            <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-card sm:p-9">
                <div className="mx-auto mb-6 grid size-12 place-items-center rounded-xl bg-navy text-white">
                    <ShieldCheck />
                </div>
                {step === 1 ? (
                    <form onSubmit={send}>
                        <h1 className="text-center text-2xl font-black text-navy">{t('login.title')}</h1>
                        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-muted">{t('login.text')}</p>
                        <label className="mt-8 block text-sm font-bold text-navy" htmlFor="login-phone">{t('login.phone')}</label>
                        <div className="mt-2 flex h-12 overflow-hidden rounded-lg border border-line focus-within:border-accent">
                            <span className="flex items-center border-r border-line bg-surface px-3 text-sm font-semibold">+995</span>
                            <input
                                id="login-phone"
                                autoFocus
                                required
                                inputMode="numeric"
                                autoComplete="tel"
                                value={phone}
                                onChange={(e) => setPhone(digitsOnly(e.target.value, 9))}
                                placeholder={t('login.placeholder')}
                                className="min-w-0 flex-1 px-4 outline-none"
                            />
                        </div>
                        {error ? <p className="mt-3 text-center text-sm font-semibold text-red-600">{error}</p> : null}
                        <Button className="mt-5 w-full" type="submit" disabled={busy}>{busy ? t('login.sending') : t('login.send')}</Button>
                    </form>
                ) : (
                    <form onSubmit={verify}>
                        <h1 className="text-center text-2xl font-black text-navy">{t('login.code_title')}</h1>
                        <p className="mt-3 text-center text-sm text-muted">
                            {t('login.code_text')} <strong className="text-navy">+995 {phone}</strong>
                        </p>
                        <p className="mt-2 text-center text-xs text-muted">{t('login.validity')}</p>
                        <div onPaste={paste} className="mt-8 flex justify-center gap-2">
                            {digits.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={(el) => { refs.current[i] = el; }}
                                    autoFocus={i === 0}
                                    inputMode="numeric"
                                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                                    aria-label={`${t('login.code_title')} ${i + 1}`}
                                    value={digit}
                                    onChange={(e) => changeDigit(i, e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Backspace' && !digit && i > 0) refs.current[i - 1]?.focus();
                                    }}
                                    className="size-11 rounded-lg border border-line text-center text-xl font-bold outline-none focus:border-accent sm:size-12"
                                />
                            ))}
                        </div>
                        {error ? <p className="mt-4 text-center text-sm font-semibold text-red-600">{error}</p> : null}
                        <Button className="mt-5 w-full" type="submit" disabled={busy}>{busy ? t('login.verifying') : t('login.verify')}</Button>
                        <button
                            type="button"
                            disabled={countdown > 0 || busy}
                            onClick={resend}
                            className="mt-4 w-full text-center text-sm font-semibold text-accent disabled:text-muted"
                        >
                            {t('login.resend')}{countdown > 0 ? ` (${countdown})` : ''}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
