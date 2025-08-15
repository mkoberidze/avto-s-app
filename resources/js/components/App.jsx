import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext.jsx';
import Navbar from './layout/Navbar.jsx';
import PhoneAuthModal from './ui/PhoneAuthModal.jsx';
import LandingPage from './pages/LandingPage.jsx';
import FormsPage from './pages/FormsPage.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import FormDetailsPage from './pages/FormDetailsPage.jsx';
import AdminPanel from './pages/AdminPanel.jsx';

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <div className="min-h-screen bg-[#FAFAF9]">
                    <Navbar />
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/forms" element={<ProtectedRoute><FormsPage /></ProtectedRoute>} />
                        <Route path="/forms/:id" element={<ProtectedRoute><FormDetailsPage /></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                    </Routes>
                    <PhoneAuthModal />
                </div>
            </BrowserRouter>
        </AuthProvider>
    );
}


