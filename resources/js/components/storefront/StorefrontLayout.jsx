import React from 'react';
import { Outlet } from 'react-router-dom';
import { StorefrontDataProvider } from './StorefrontData.jsx';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import CartDrawer from './CartDrawer.jsx';

export default function StorefrontLayout() {
    return (
        <StorefrontDataProvider>
            <div className="storefront-root min-h-screen bg-white text-ink">
                <Header />
                <main>
                    <Outlet />
                </main>
                <Footer />
                <CartDrawer />
            </div>
        </StorefrontDataProvider>
    );
}
