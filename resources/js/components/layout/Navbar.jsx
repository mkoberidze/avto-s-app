import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import axios from 'axios'; // Added axios import

export default function Navbar() {
    const { isAuthenticated, user, openPhoneModal, signOut } = useAuth();
    const handleLogout = async () => {
        try {
            await axios.post('/api/auth/logout');
            signOut();
        } catch (error) {
            console.error('Logout failed:', error);
            signOut(); // Force logout even if API fails
        }
    };

    return (
        <header className="w-full border-b border-black/5 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 fixed top-0 left-0 z-30">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-[#F97316]"></div>
                    <span className="font-semibold text-[#1f2937]">YourApp</span>
                </Link>
                <div className="flex items-center gap-3">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-3">
                            {user?.hasRole && user.hasRole('admin') && (
                                <Link to="/admin" className="text-sm px-4 py-2 rounded border border-black/10 hover:border-black/30 transition">
                                    Admin Panel
                                </Link>
                            )}
                            <span className="hidden sm:inline text-sm text-[#6b7280]">{user?.phone}</span>
                            <button className="inline-flex items-center text-sm px-4 py-2 rounded border border-black/10 hover:border-black/30 transition" onClick={handleLogout}>
                                Sign out
                            </button>
                        </div>
                    ) : (
                        <button className="inline-flex items-center text-sm px-4 py-2 rounded bg-[#111827] text-white hover:bg-[#0f172a] transition" onClick={openPhoneModal}>
                            Sign in
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}


