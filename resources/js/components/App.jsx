import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext.jsx';
import { LanguageProvider } from '../contexts/LanguageContext.jsx';
import Navbar from './layout/Navbar.jsx';
import PhoneAuthModal from './ui/PhoneAuthModal.jsx';
import LandingPage from './pages/LandingPage.jsx';
import FormsPage from './pages/FormsPage.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import FormDetailsPage from './pages/FormDetailsPage.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import AdminFormDetail from './pages/AdminFormDetail.jsx';

export default function App() {
    return (
        <AuthProvider>
            <LanguageProvider>
                <BrowserRouter>
                    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
                        <Navbar />
                        <main className="flex-1 overflow-y-auto pt-16">
                            <div className="pb-20">
                                <Routes>
                                    <Route path="/" element={<LandingPage />} />
                                    <Route path="/forms" element={<ProtectedRoute><FormsPage /></ProtectedRoute>} />
                                    <Route path="/forms/:id" element={<ProtectedRoute><FormDetailsPage /></ProtectedRoute>} />
                                    <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                                    <Route path="/admin/form/:id" element={<ProtectedRoute><AdminFormDetail /></ProtectedRoute>} />
                                </Routes>
                            </div>
                        </main>
                        <PhoneAuthModal />
                    </div>
                </BrowserRouter>
            </LanguageProvider>
        </AuthProvider>
    );
}
