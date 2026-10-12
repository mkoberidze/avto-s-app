import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
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
import CheckoutPlaceholder from './storefront/pages/CheckoutPlaceholder.jsx';
import AboutStorePage from './storefront/pages/AboutStorePage.jsx';
import ContactPage from './storefront/pages/ContactPage.jsx';
import NotFoundPage from './storefront/pages/NotFoundPage.jsx';
import FormsPage from './pages/FormsPage.jsx';
import FormDetailsPage from './pages/FormDetailsPage.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import AdminFormDetail from './pages/AdminFormDetail.jsx';
import AdminPagesEditor from './pages/AdminPagesEditor.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import ServicesPage from './pages/ServicesPage.jsx';

function AppShell() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<LegacyLayout />}>
                    <Route path="/services" element={<ServicesPage />} />
                    <Route path="/forms" element={<ProtectedRoute><FormsPage /></ProtectedRoute>} />
                    <Route path="/forms/:id" element={<ProtectedRoute><FormDetailsPage /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                    <Route path="/admin/pages" element={<ProtectedRoute><AdminPagesEditor /></ProtectedRoute>} />
                    <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
                    <Route path="/admin/form/:id" element={<ProtectedRoute><AdminFormDetail /></ProtectedRoute>} />
                </Route>
                <Route element={<StorefrontLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/products" element={<CatalogPage />} />
                    <Route path="/products/category/:id" element={<CatalogPage />} />
                    <Route path="/products/:id" element={<ProductPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPlaceholder />} />
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
