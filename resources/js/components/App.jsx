import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext.jsx';
import { CartProvider } from '../contexts/CartContext.jsx';
import StorefrontLayout from './storefront/StorefrontLayout.jsx';
import HomePage from './storefront/pages/HomePage.jsx';
import CatalogPage from './storefront/pages/CatalogPage.jsx';
import ProductPage from './storefront/pages/ProductPage.jsx';
import CartPage from './storefront/pages/CartPage.jsx';
import CheckoutPage from './storefront/pages/CheckoutPage.jsx';
import LoginPage from './storefront/pages/LoginPage.jsx';
import AccountPage from './storefront/pages/AccountPage.jsx';
import AboutStorePage from './storefront/pages/AboutStorePage.jsx';
import ContactPage from './storefront/pages/ContactPage.jsx';
import NotFoundPage from './storefront/pages/NotFoundPage.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import AdminPage from './admin/AdminPage.jsx';
import OrderDetailSection from './admin/OrderDetailSection.jsx';

function AppShell() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/forms" element={<Navigate to="/" replace />} />
                <Route path="/forms/*" element={<Navigate to="/" replace />} />
                <Route path="/services" element={<Navigate to="/" replace />} />
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="orders/:id" element={<OrderDetailSection />} />
                    <Route path=":section" element={<AdminPage />} />
                </Route>
                <Route element={<StorefrontLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/products" element={<CatalogPage />} />
                    <Route path="/products/category/:id" element={<CatalogPage />} />
                    <Route path="/products/:id" element={<ProductPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/account" element={<AccountPage />} />
                    <Route path="/about" element={<AboutStorePage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <CartProvider>
                <AppShell />
            </CartProvider>
        </AuthProvider>
    );
}
