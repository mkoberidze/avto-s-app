import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext.jsx';
import { LanguageProvider } from '../contexts/LanguageContext.jsx';
import { CartProvider } from '../contexts/CartContext.jsx';
import PhoneAuthModal from './ui/PhoneAuthModal.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import StorefrontLayout from './storefront/StorefrontLayout.jsx';
import LegacyLayout from './layout/LegacyLayout.jsx';
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
import FormsPage from './pages/FormsPage.jsx';
import FormDetailsPage from './pages/FormDetailsPage.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import AdminPage from './admin/AdminPage.jsx';

function AppShell() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<LegacyLayout />}>
                    <Route path="/services" element={<ServicesPage />} />
                    <Route path="/forms" element={<ProtectedRoute><FormsPage /></ProtectedRoute>} />
                    <Route path="/forms/:id" element={<ProtectedRoute><FormDetailsPage /></ProtectedRoute>} />
                </Route>
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="products" replace />} />
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
            <PhoneAuthModal />
        </BrowserRouter>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <LanguageProvider>
                <CartProvider>
                    <AppShell />
                </CartProvider>
            </LanguageProvider>
        </AuthProvider>
    );
}
