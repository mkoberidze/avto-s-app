import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';

export default function LegacyLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-[#FAFAF9] app-uppercase lang-ka">
            <Navbar />
            <main className="flex-1 overflow-y-auto pt-16">
                <div className="pb-20">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
