// Simple API service that mirrors the proto RPC surface using JSON over HTTP.
// The frontend runs in browsers so we use HTTP endpoints as a fallback to grpc-web.
// Configure backend URL via `REACT_APP_API_URL` (defaults to same origin).

const BASE = process.env.REACT_APP_API_URL || '';

async function request(path, options = {}) {
    const url = `${BASE}${path}`;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...options,
    });

    const text = await res.text();
    try {
        return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
    } catch (e) {
        return { ok: res.ok, status: res.status, data: text };
    }
}

export async function healthCheck() {
    const r = await request('/api/health', { method: 'GET' });
    return r;
}

// Auth
export async function login(email, password) {
    return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function register(payload) {
    return request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export async function refreshToken(refresh_token) {
    return request('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token }) });
}

export async function forgotPassword(email) {
    return request('/api/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) });
}

// User
export async function getProfile(user_id) {
    return request(`/api/user/profile?user_id=${encodeURIComponent(user_id)}`, { method: 'GET' });
}

export async function updateProfile(payload) {
    return request('/api/user/profile', { method: 'PUT', body: JSON.stringify(payload) });
}

// Building
export async function getBuilding(building_id) {
    return request(`/api/building/${encodeURIComponent(building_id)}`, { method: 'GET' });
}

export async function listApartments(building_id) {
    return request(`/api/building/${encodeURIComponent(building_id)}/apartments`, { method: 'GET' });
}

// Financial
export async function getFinancialReport(params) {
    // params: { user_id, building_id }
    const qs = new URLSearchParams(params).toString();
    return request(`/api/financial/report?${qs}`, { method: 'GET' });
}

export async function getPaymentHistory(user_id) {
    return request(`/api/financial/payments?user_id=${encodeURIComponent(user_id)}`, { method: 'GET' });
}

// Events
export async function listEvents(building_id, limit = 10) {
    const qs = new URLSearchParams({ building_id, limit }).toString();
    return request(`/api/events?${qs}`, { method: 'GET' });
}

export async function createEvent(payload) {
    return request('/api/events', { method: 'POST', body: JSON.stringify(payload) });
}

// Contacts / Offers
export async function sendContactForm(payload) {
    return request('/api/contact', { method: 'POST', body: JSON.stringify(payload) });
}

export async function requestOffer(payload) {
    return request('/api/offer', { method: 'POST', body: JSON.stringify(payload) });
}

export async function requestPresentation(payload) {
    return request('/api/presentation', { method: 'POST', body: JSON.stringify(payload) });
}

export default {
    healthCheck,
    login,
    register,
    refreshToken,
    forgotPassword,
    getProfile,
    updateProfile,
    getBuilding,
    listApartments,
    getFinancialReport,
    getPaymentHistory,
    listEvents,
    createEvent,
    sendContactForm,
    requestOffer,
    requestPresentation,
};
