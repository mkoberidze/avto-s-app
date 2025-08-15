import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

export default function AdminPanel() {
    const { isAuthenticated, user } = useAuth();
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthenticated && user?.hasRole && user.hasRole('admin')) {
            loadForms();
        }
    }, [isAuthenticated, user]);

    const loadForms = async () => {
        try {
            const response = await axios.get('/api/admin/forms');
            setForms(response.data);
        } catch (error) {
            console.error('Failed to load forms:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateFormStatus = async (formId, newStatus) => {
        try {
            await axios.put(`/api/admin/forms/${formId}/status`, { status: newStatus });
            loadForms(); // Reload to get updated data
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

   // // Redirect if not admin
   //  if (isAuthenticated && user?.hasRole && !user.hasRole('admin')) {
   //      return <Navigate to="/" replace />;
   //  }
   //
   //  if (!isAuthenticated) {
   //      return <Navigate to="/" replace />;
   //  }
   //
   //  if (loading) {
   //      return (
   //          <main className="pt-24 sm:pt-28">
   //              <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
   //                  <p className="text-[#6b7280]">Loading admin panel...</p>
   //              </section>
   //          </main>
   //      );
   //  }

    const unopenedForms = forms.filter(f => f.status === 'unopened');
    const seenForms = forms.filter(f => f.status === 'seen');
    const completedForms = forms.filter(f => f.status === 'completed');

    return (
        <main className="pt-24 sm:pt-28">
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-semibold text-[#111827] mb-6">Admin Dashboard</h1>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Unopened Forms */}
                    <div className="bg-white rounded-lg border border-black/10 p-4">
                        <h2 className="text-lg font-medium text-[#111827] mb-3">Unopened ({unopenedForms.length})</h2>
                        <div className="space-y-2">
                            {unopenedForms.map(form => (
                                <div key={form.id} className="p-3 border border-black/5 rounded bg-gray-50">
                                    <p className="font-medium text-sm">{form.title}</p>
                                    <p className="text-xs text-[#6b7280] mb-2">From: {form.user?.phone || 'Unknown'}</p>
                                    <button
                                        onClick={() => updateFormStatus(form.id, 'seen')}
                                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                    >
                                        Mark as Seen
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Seen Forms */}
                    <div className="bg-white rounded-lg border border-black/10 p-4">
                        <h2 className="text-lg font-medium text-[#111827] mb-3">Seen ({seenForms.length})</h2>
                        <div className="space-y-2">
                            {seenForms.map(form => (
                                <div key={form.id} className="p-3 border border-black/5 rounded bg-gray-50">
                                    <p className="font-medium text-sm">{form.title}</p>
                                    <p className="text-xs text-[#6b7280] mb-2">From: {form.user?.phone || 'Unknown'}</p>
                                    <button
                                        onClick={() => updateFormStatus(form.id, 'completed')}
                                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                    >
                                        Mark as Completed
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Completed Forms */}
                    <div className="bg-white rounded-lg border border-black/10 p-4">
                        <h2 className="text-lg font-medium text-[#111827] mb-3">Completed ({completedForms.length})</h2>
                        <div className="space-y-2">
                            {completedForms.map(form => (
                                <div key={form.id} className="p-3 border border-black/5 rounded bg-gray-50">
                                    <p className="font-medium text-sm">{form.title}</p>
                                    <p className="text-xs text-[#6b7280] mb-2">From: {form.user?.phone || 'Unknown'}</p>
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                        Completed
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
