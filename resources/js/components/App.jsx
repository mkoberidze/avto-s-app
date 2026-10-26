import React from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
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

const router = createBrowserRouter([
    { path: '/forms', element: <Navigate to="/" replace /> },
    { path: '/forms/*', element: <Navigate to="/" replace /> },
    { path: '/services', element: <Navigate to="/" replace /> },
    {
        path: '/admin',
        element: <AdminLayout />,
        children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: 'orders/:id', element: <OrderDetailSection /> },
            { path: ':section', element: <AdminPage /> },
        ],
    },
    {
        element: <StorefrontLayout />,
        children: [
            { path: '/', element: <HomePage /> },
            { path: '/products', element: <CatalogPage /> },
            { path: '/products/category/:id', element: <CatalogPage /> },
            { path: '/products/:id', element: <ProductPage /> },
            { path: '/cart', element: <CartPage /> },
            { path: '/checkout', element: <CheckoutPage /> },
            { path: '/login', element: <LoginPage /> },
            { path: '/account', element: <AccountPage /> },
            { path: '/about', element: <AboutStorePage /> },
            { path: '/contact', element: <ContactPage /> },
            { path: '*', element: <NotFoundPage /> },
        ],
    },
]);

export default function App() {
    return (
        <AuthProvider>
            <CartProvider>
                <RouterProvider router={router} />
            </CartProvider>
        </AuthProvider>
    );
}
