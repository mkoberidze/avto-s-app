import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function LegacyLayout() {
    const { lang } = useLanguage();

    return (
        <div className={`flex min-h-screen flex-col bg-[#FAFAF9] app-uppercase ${lang === 'ka' ? 'lang-ka' : ''}`}>
            <Navbar />
            <main className="flex-1 overflow-y-auto pt-16">
                <div className="pb-20">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
