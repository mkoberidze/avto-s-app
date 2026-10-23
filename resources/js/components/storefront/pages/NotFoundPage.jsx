import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../contexts/i18n.js';
import { Button } from '../ui.jsx';

export default function NotFoundPage() {
    const t = useI18n();
    return (
        <div className="container-shell grid min-h-[30rem] place-items-center text-center">
            <div>
                <p className="text-7xl font-black text-navy/10">404</p>
                <h1 className="mt-3 text-2xl font-black text-navy">{t('notfound.title')}</h1>
                <Link to="/"><Button className="mt-6">{t('notfound.home')}</Button></Link>
            </div>
        </div>
    );
}
