import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Link } from 'react-router-dom';

export default function LandingPage() {
    const { openPhoneModal, isAuthenticated } = useAuth();
    return (
        <main className="pt-24 sm:pt-28">
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-10 items-center">
                    <div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#111827] leading-tight">
                            Welcome to YourApp
                        </h1>
                        <p className="mt-4 text-[#6b7280] text-base sm:text-lg">
                            Say some stuff here about your product. Concise, compelling, and straight to the point. Designed with a light, friendly palette.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            {isAuthenticated ? (
                                <Link to="/forms" className="inline-flex items-center text-sm px-5 py-2.5 rounded bg-[#111827] text-white hover:bg-[#0f172a] transition">
                                    Go to forms
                                </Link>
                            ) : (
                                <>
                                    <button className="inline-flex items-center text-sm px-5 py-2.5 rounded bg-[#111827] text-white hover:bg-[#0f172a] transition" onClick={openPhoneModal}>
                                        Get started
                                    </button>
                                    <button className="text-sm px-5 py-2.5 rounded border border-black/10 hover:border-black/30 transition" onClick={openPhoneModal}>
                                        Sign in with phone
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="relative">
                        <div className="aspect-video w-full rounded-lg bg-[#FFF7ED] border border-black/10"></div>
                    </div>
                </div>
            </section>
            {/* Forms page is now a separate route handled by React Router */}
        </main>
    );
}


