/**
 * API Service for DomUnity Frontend
 * Handles all REST API calls to the Python backend
 */

// Determine API URL based on environment
const getApiUrl = () => {
    // Explicit override wins everywhere (use this for local dev, e.g.
    // REACT_APP_API_URL=http://localhost:8080). Trailing slash trimmed.
    const explicit = process.env.REACT_APP_API_URL;
    if (explicit) {
        return explicit.replace(/\/+$/, '');
    }

    const host = process.env.REACT_APP_BACKEND_URL;
    if (host) {
        // Render passes the bare service name; build the full onrender.com URL.
        return host.startsWith('http') ? host : `https://${host}.onrender.com`;
    }

    return 'https://domunity-backend-python.onrender.com';
};

const API_URL = getApiUrl();

// Token management
//
// "Remember me" decides where the session is stored:
//   - remember = true  -> localStorage  (persists across browser restarts)
//   - remember = false -> sessionStorage (cleared when the tab/browser closes)
// Getters read from sessionStorage first, then localStorage, so either works.
const TOKEN_KEY = 'domunity_access_token';
const REFRESH_TOKEN_KEY = 'domunity_refresh_token';
const USER_KEY = 'domunity_user';

const pickStorage = (remember) => (remember ? window.localStorage : window.sessionStorage);
const readBoth = (key) => window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
const clearBoth = (key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
};

export const setTokens = (accessToken, refreshToken, remember = true) => {
    const store = pickStorage(remember);
    clearBoth(TOKEN_KEY);
    clearBoth(REFRESH_TOKEN_KEY);
    store.setItem(TOKEN_KEY, accessToken);
    store.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAccessToken = () => readBoth(TOKEN_KEY);
export const getRefreshToken = () => readBoth(REFRESH_TOKEN_KEY);

export const setUser = (user, remember = true) => {
    clearBoth(USER_KEY);
    pickStorage(remember).setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = () => {
    const user = readBoth(USER_KEY);
    return user ? JSON.parse(user) : null;
};

export const clearTokens = () => {
    clearBoth(TOKEN_KEY);
    clearBoth(REFRESH_TOKEN_KEY);
    clearBoth(USER_KEY);
};

export const isAuthenticated = () => !!getAccessToken();

// API helper
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add auth header if token exists
    const token = getAccessToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    const data = await response.json();
    return { response, data };
};

// Auth API
export const login = async (email, password, remember = true) => {
    const { data } = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    if (data.success) {
        setTokens(data.access_token, data.refresh_token, remember);
        setUser(data.user, remember);
    }

    return data;
};

export const register = async (email, password, fullName, phone) => {
    const { data } = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            phone,
        }),
    });

    return data;
};

export const refreshToken = async () => {
    const refresh = getRefreshToken();
    if (!refresh) return { success: false };

    const { data } = await apiRequest('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refresh }),
    });

    if (data.success) {
        // Update the access token in whichever storage already holds the session.
        if (window.sessionStorage.getItem(TOKEN_KEY) !== null) {
            window.sessionStorage.setItem(TOKEN_KEY, data.access_token);
        } else {
            window.localStorage.setItem(TOKEN_KEY, data.access_token);
        }
    }

    return data;
};

export const logout = () => {
    clearTokens();
};

// Request a password reset (recorded for an admin to action)
export const requestPasswordReset = async (name, email) => {
    const { data } = await apiRequest('/api/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ name, email }),
    });

    return data;
};

// Change the authenticated user's password
export const changePassword = async (oldPassword, newPassword) => {
    const { data } = await apiRequest('/api/user/password', {
        method: 'POST',
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });

    return data;
};

// User API
export const getProfile = async () => {
    const { data } = await apiRequest('/api/user/profile', {
        method: 'GET',
    });

    return data;
};

// Contact API
export const sendContactForm = async (name, phone, email, message) => {
    const { data } = await apiRequest('/api/contact/form', {
        method: 'POST',
        body: JSON.stringify({ name, phone, email, message }),
    });

    return data;
};

export const requestOffer = async (offerData) => {
    const { data } = await apiRequest('/api/contact/offer', {
        method: 'POST',
        body: JSON.stringify({
            phone: offerData.phone,
            email: offerData.email,
            city: offerData.city,
            num_properties: offerData.numProperties,
            address: offerData.address,
            additional_info: offerData.additionalInfo,
        }),
    });

    return data;
};

export const requestPresentation = async (presentationData) => {
    const { data } = await apiRequest('/api/contact/presentation', {
        method: 'POST',
        body: JSON.stringify({
            date: presentationData.date,
            building_type: presentationData.buildingType,
            phone: presentationData.phone,
            email: presentationData.email,
            address: presentationData.address,
            additional_info: presentationData.additionalInfo,
        }),
    });

    return data;
};

// Health check API
export const healthCheck = async () => {
    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        return data;
    } catch (err) {
        console.warn('Health check failed:', err);
        return { status: 'error', message: err.message };
    }
};

// Admin API
export const getAdminResidents = async () => {
    const { data } = await apiRequest('/api/admin/residents', {
        method: 'GET',
    });
    return data;
};

export const getEntrances = async () => {
    const { data } = await apiRequest('/api/admin/entrances', {
        method: 'GET',
    });
    return data;
};

export const createEntrance = async (payload) => {
    const { data } = await apiRequest('/api/admin/entrances', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return data;
};

export const updateEntrance = async (id, payload) => {
    const { data } = await apiRequest(`/api/admin/entrances/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return data;
};

export const createResident = async (payload) => {
    const { data } = await apiRequest('/api/admin/residents', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return data;
};

export const updateResident = async (id, payload) => {
    const { data } = await apiRequest(`/api/admin/residents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return data;
};

// Apartment API
export const getApartmentDetails = async () => {
    const { data } = await apiRequest('/api/user/apartment', {
        method: 'GET',
    });
    return data;
};

// Building API
export const getBuildingApartments = async (buildingId = 1) => {
    const { data } = await apiRequest(`/api/building/${buildingId}/apartments`, {
        method: 'GET',
    });
    return data;
};

export const getMaintenanceRecords = async (buildingId = 1) => {
    const { data } = await apiRequest(`/api/building/${buildingId}/maintenance`, {
        method: 'GET',
    });
    return data;
};

// Issues / maintenance reports API
export const getMyIssues = async () => {
    const { data } = await apiRequest('/api/issues', { method: 'GET' });
    return data;
};

export const createIssue = async (payload) => {
    const { data } = await apiRequest('/api/issues', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return data;
};

export const replyIssue = async (issueId, message) => {
    const { data } = await apiRequest(`/api/issues/${issueId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message }),
    });
    return data;
};

export const getAdminIssues = async (status) => {
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    const { data } = await apiRequest(`/api/admin/issues${qs}`, { method: 'GET' });
    return data;
};

export const updateIssueStatus = async (issueId, status) => {
    const { data } = await apiRequest(`/api/admin/issues/${issueId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
    });
    return data;
};

// Payments API
export const payInvoice = async (paymentId) => {
    const { data } = await apiRequest('/api/payments/pay', {
        method: 'POST',
        body: JSON.stringify({ payment_id: paymentId }),
    });
    return data;
};

const apiService = {
    login,
    register,
    refreshToken,
    logout,
    requestPasswordReset,
    changePassword,
    getProfile,
    sendContactForm,
    requestOffer,
    requestPresentation,
    isAuthenticated,
    getUser,
    getAccessToken,
    healthCheck,
    getAdminResidents,
    getEntrances,
    createEntrance,
    updateEntrance,
    createResident,
    updateResident,
    getApartmentDetails,
    getBuildingApartments,
    getMaintenanceRecords,
    payInvoice,
    getMyIssues,
    createIssue,
    replyIssue,
    getAdminIssues,
    updateIssueStatus,
};

export default apiService;

