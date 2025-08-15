import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, openPhoneModal } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) {
            openPhoneModal();
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }
    return children;
}


