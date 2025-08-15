import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [phoneModalOpen, setPhoneModalOpen] = useState(false);
    const [user, setUser] = useState(null);

    function openPhoneModal() {
        setPhoneModalOpen(true);
    }

    function closePhoneModal() {
        setPhoneModalOpen(false);
    }

    async function requestOtp(phoneNumber) {
        if (!phoneNumber || phoneNumber.length < 6) {
            throw new Error('Enter a valid phone number');
        }
        await axios.post('/api/auth/otp/request', { phone: phoneNumber });
        return true;
    }

    async function verifyOtp(phoneNumber, code) {
        const res = await axios.post('/api/auth/otp/verify', { phone: phoneNumber, otp: code });
        const { token, user: userPayload } = res.data || {};
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            try {
                localStorage.setItem('auth_token', token);
            } catch {}
        }
        setUser(userPayload ? enhanceUser(userPayload) : null);
        setPhoneModalOpen(false);
        return userPayload;
    }

    function signOut() {
        setUser(null);
        try {
            localStorage.removeItem('auth_token');
        } catch {}
        delete axios.defaults.headers.common['Authorization'];
    }

    // Restore session from localStorage on mount
    useEffect(() => {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                axios.get('/api/user')
                    .then(res => {
                        const userData = res.data.user || res.data;
                        setUser(enhanceUser(userData));
                    })
                    .catch(() => setUser(null));
            }
        } catch {}
    }, []);

    function enhanceUser(user) {
        return {
            ...user,
            hasRole: (role) => {
                return user.role === role;
            }
        };
    }

    const value = useMemo(
        () => ({
            isAuthenticated: Boolean(user),
            user,
            phoneModalOpen,
            openPhoneModal,
            closePhoneModal,
            requestOtp,
            verifyOtp,
            signOut,
        }),
        [user, phoneModalOpen]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
