import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, loading, openPhoneModal } = useAuth();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            openPhoneModal();
        }
    }, [loading, isAuthenticated, openPhoneModal]);

    if (loading) {
        return null; // or a loading spinner
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }
    return children;
}


