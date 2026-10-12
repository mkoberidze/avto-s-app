import axios from 'axios';

function currentLanguage() {
    try {
        const stored = localStorage.getItem('sentra_language');
        if (stored === 'ka' || stored === 'en' || stored === 'ru') {
            return stored;
        }
    } catch {}
    return 'ka';
}

function catalogGet(url, params = {}) {
    return axios.get(url, {
        params: { ...params, language: currentLanguage() },
        paramsSerializer: {
            serialize(p) {
                const search = new URLSearchParams();
                Object.entries(p).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        value.forEach((item) => search.append(`${key}[]`, item));
                    } else if (value !== undefined && value !== null && value !== '') {
                        search.append(key, String(value));
                    }
                });
                return search.toString();
            },
        },
    }).then((res) => res.data);
}

export function getSettings() {
    return axios.get('/api/settings').then((res) => {
        const data = res.data || {};
        let images = data.carousel_images;
        if (typeof images === 'string') {
            try {
                images = JSON.parse(images);
            } catch {
                images = [];
            }
        }
        if (!Array.isArray(images)) {
            images = [];
        }
        return {
            ...data,
            logo_url: data.logo_url || '',
            carousel_images: images.filter(Boolean).slice(0, 3),
        };
    });
}

export function getCategories() {
    return catalogGet('/api/categories');
}

export function getBrands() {
    return catalogGet('/api/brands');
}

export function getProducts(params = {}) {
    return catalogGet('/api/products', params);
}

export function getProduct(id) {
    return catalogGet(`/api/products/${id}`);
}
