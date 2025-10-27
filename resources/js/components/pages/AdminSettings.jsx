import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useI18n } from '../../contexts/i18n.js';

export default function AdminSettings() {
    const t = useI18n();
    const [settings, setSettings] = useState({
        logo_url: '',
        favicon_url: '',
        carousel_images: []
    });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        axios.get('/api/admin/settings')
            .then(res => {
                setSettings({
                    logo_url: res.data.logo_url || '',
                    favicon_url: res.data.favicon_url || '',
                    carousel_images: res.data.carousel_images ? JSON.parse(res.data.carousel_images) : []
                });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const uploadFile = async (file, type, index = null) => {
        if (!file) return;

        setUploading({ ...uploading, [`${type}${index !== null ? `_${index}` : ''}`]: true });

        try {
            const formData = new FormData();
            let endpoint = '';
            
            if (type === 'logo') {
                formData.append('logo', file);
                endpoint = '/api/admin/settings/upload-logo';
            } else if (type === 'favicon') {
                formData.append('favicon', file);
                endpoint = '/api/admin/settings/upload-favicon';
            } else if (type === 'carousel') {
                formData.append('carousel_image', file);
                formData.append('index', index);
                endpoint = '/api/admin/settings/upload-carousel';
            }

            const res = await axios.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (type === 'carousel') {
                setSettings(prev => ({ ...prev, carousel_images: res.data.carousel_images }));
            } else {
                setSettings(prev => ({ ...prev, [`${type}_url`]: res.data[`${type}_url`] }));
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
        } finally {
            setUploading({ ...uploading, [`${type}${index !== null ? `_${index}` : ''}`]: false });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.post('/api/admin/settings', {
                logo_url: settings.logo_url,
                favicon_url: settings.favicon_url,
                carousel_images: settings.carousel_images
            });
            alert(t('settings.saved'));
        } catch (error) {
            alert(t('settings.failed'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <main className="pt-24 sm:pt-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <p>Loading...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="pt-24 sm:pt-28">
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-semibold text-[#111827] mb-6">{t('settings.title')}</h1>

                <div className="space-y-6">
                    {/* Logo */}
                    <div className="bg-white border border-black/10 rounded-lg p-6">
                        <h2 className="text-lg font-medium text-[#111827] mb-4">{t('settings.logo')}</h2>
                        {settings.logo_url && (
                            <div className="mb-4">
                                <img src={settings.logo_url} alt="Current logo" className="h-16 w-16 object-contain border border-black/10 p-2 rounded" />
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*,.svg"
                            onChange={(e) => uploadFile(e.target.files?.[0], 'logo')}
                            className="mb-2"
                        />
                        <p className="text-sm text-[#6b7280]">{t('settings.upload_logo')}</p>
                        {uploading.logo && <p className="text-sm text-blue-600 mt-2">{t('settings.saving')}</p>}
                    </div>

                    {/* Favicon */}
                    <div className="bg-white border border-black/10 rounded-lg p-6">
                        <h2 className="text-lg font-medium text-[#111827] mb-4">{t('settings.favicon')}</h2>
                        {settings.favicon_url && (
                            <div className="mb-4">
                                <img src={settings.favicon_url} alt="Current favicon" className="h-12 w-12 object-contain border border-black/10 p-2 rounded" />
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*,.ico"
                            onChange={(e) => uploadFile(e.target.files?.[0], 'favicon')}
                            className="mb-2"
                        />
                        <p className="text-sm text-[#6b7280]">{t('settings.upload_favicon')}</p>
                        {uploading.favicon && <p className="text-sm text-blue-600 mt-2">{t('settings.saving')}</p>}
                    </div>

                    {/* Carousel Images */}
                    <div className="bg-white border border-black/10 rounded-lg p-6">
                        <h2 className="text-lg font-medium text-[#111827] mb-4">{t('settings.carousel')}</h2>
                        <p className="text-sm text-[#6b7280] mb-4">{t('settings.upload_carousel')}</p>
                        
                        {[0, 1, 2].map((index) => (
                            <div key={index} className="mb-4 p-4 bg-gray-50 rounded border border-black/10">
                                <label className="block text-sm font-medium text-[#111827] mb-2">
                                    {t('settings.carousel_image')} {index + 1}
                                </label>
                                {settings.carousel_images[index] && (
                                    <div className="mb-2">
                                        <img
                                            src={settings.carousel_images[index]}
                                            alt={`Carousel ${index + 1}`}
                                            className="h-32 w-full object-cover border border-black/10 rounded"
                                        />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => uploadFile(e.target.files?.[0], 'carousel', index)}
                                    className="mb-2"
                                />
                                {uploading[`carousel_${index}`] && <p className="text-sm text-blue-600">Uploading...</p>}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="text-sm px-4 py-2 rounded bg-[#111827] text-white disabled:opacity-50"
                        >
                            {saving ? t('settings.saving') : t('settings.save')}
                        </button>
                        <a href="/admin" className="text-sm px-4 py-2 rounded border border-black/10 hover:border-black/30">
                            {t('admin.back')}
                        </a>
                    </div>
                </div>
            </section>
        </main>
    );
}

