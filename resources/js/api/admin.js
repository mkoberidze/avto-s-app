import axios from 'axios';

export function getAdminProducts(params = {}) {
    return axios.get('/api/admin/products', { params }).then((res) => res.data);
}

export function getAdminProduct(id) {
    return axios.get(`/api/admin/products/${id}`).then((res) => res.data);
}

export function updateAdminProduct(id, payload) {
    return axios.put(`/api/admin/products/${id}`, payload).then((res) => res.data);
}

export function getAdminCategories() {
    return axios.get('/api/admin/categories').then((res) => res.data);
}

export function updateAdminCategory(id, payload) {
    return axios.put(`/api/admin/categories/${id}`, payload).then((res) => res.data);
}

export function getAdminSettings() {
    return axios.get('/api/admin/settings').then((res) => res.data);
}

export function saveAdminSettings(payload) {
    return axios.post('/api/admin/settings', payload).then((res) => res.data);
}

export function uploadLogo(file) {
    const data = new FormData();
    data.append('logo', file);
    return axios.post('/api/admin/settings/upload-logo', data).then((res) => res.data);
}

export function uploadFavicon(file) {
    const data = new FormData();
    data.append('favicon', file);
    return axios.post('/api/admin/settings/upload-favicon', data).then((res) => res.data);
}

export function getAdminDashboard() {
    return axios.get('/api/admin/dashboard').then((res) => res.data);
}

export function getAdminOrders(params = {}) {
    return axios.get('/api/admin/orders', { params }).then((res) => res.data);
}

export function getAdminOrder(id) {
    return axios.get(`/api/admin/orders/${id}`).then((res) => res.data);
}

export function updateAdminOrder(id, payload) {
    return axios.patch(`/api/admin/orders/${id}`, payload).then((res) => res.data);
}

export function getAdminMessages(params = {}) {
    return axios.get('/api/admin/messages', { params }).then((res) => res.data);
}

export function updateAdminMessage(id, payload) {
    return axios.patch(`/api/admin/messages/${id}`, payload).then((res) => res.data);
}

export function uploadCarousel(file, index) {
    const data = new FormData();
    data.append('carousel_image', file);
    data.append('index', index);
    return axios.post('/api/admin/settings/upload-carousel', data).then((res) => res.data);
}
