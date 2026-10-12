import React from 'react';
import { Outlet } from 'react-router-dom';
import { StorefrontDataProvider } from './StorefrontData.jsx';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import CartDrawer from './CartDrawer.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function StorefrontLayout() {
    const { lang } = useLanguage();

    return (
        <StorefrontDataProvider>
            <div className={`flex min-h-screen flex-col bg-[#F4F1EA] text-[#0F2744] ${lang === 'ka' ? 'lang-ka' : ''}`}>
                <Header />
                <main className="flex-1">
                    <Outlet />
                </main>
                <Footer />
                <CartDrawer />
            </div>
        </StorefrontDataProvider>
    );
}
