import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext.jsx';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext.jsx';
import Navbar from './layout/Navbar.jsx';
import PhoneAuthModal from './ui/PhoneAuthModal.jsx';
import LandingPage from './pages/LandingPage.jsx';
import FormsPage from './pages/FormsPage.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import FormDetailsPage from './pages/FormDetailsPage.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import AdminFormDetail from './pages/AdminFormDetail.jsx';
import AdminPagesEditor from './pages/AdminPagesEditor.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import AboutPage from './pages/AboutPage.jsx';

function AppShell() {
    const { lang } = useLanguage();
    return (
        <BrowserRouter>
            <div className={`min-h-screen bg-[#FAFAF9] flex flex-col ${lang === 'ka' ? 'lang-ka' : ''}`}>
                <Navbar />
                <main className="flex-1 overflow-y-auto pt-16">
                    <div className="pb-20">
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/services" element={<ServicesPage />} />
                            <Route path="/about" element={<AboutPage />} />
                            <Route path="/forms" element={<ProtectedRoute><FormsPage /></ProtectedRoute>} />
                            <Route path="/forms/:id" element={<ProtectedRoute><FormDetailsPage /></ProtectedRoute>} />
                            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                            <Route path="/admin/pages" element={<ProtectedRoute><AdminPagesEditor /></ProtectedRoute>} />
                            <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
                            <Route path="/admin/form/:id" element={<ProtectedRoute><AdminFormDetail /></ProtectedRoute>} />
                        </Routes>
                    </div>
                </main>
                <PhoneAuthModal />
            </div>
        </BrowserRouter>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <LanguageProvider>
                <AppShell />
            </LanguageProvider>
        </AuthProvider>
    );
}
