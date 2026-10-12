import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { findAdminSection } from './sections.js';

export default function AdminPage() {
    const { section } = useParams();
    const match = findAdminSection(section);
    if (!match) {
        return <Navigate to="/admin/products" replace />;
    }
    const Component = match.Component;
    return <Component />;
}
