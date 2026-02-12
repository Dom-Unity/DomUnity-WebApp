/**
 * API Service for DomUnity Frontend
 * Handles all REST API calls to the Python backend
 */

// Determine API URL based on environment
const getApiUrl = () => {
    if (process.env.NODE_ENV === 'production') {
        const host = process.env.REACT_APP_BACKEND_URL;
        return host ? `https://${host}.onrender.com` : 'http://localhost:8080';
    }
    return 'http://localhost:8080';
};

const API_URL = getApiUrl();

// Token management
const TOKEN_KEY = 'domunity_access_token';
const REFRESH_TOKEN_KEY = 'domunity_refresh_token';
const USER_KEY = 'domunity_user';

export const setTokens = (accessToken, refreshToken) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setUser = (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = () => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
};

export const clearTokens = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
export const login = async (email, password) => {
    const { data } = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    if (data.success) {
        setTokens(data.access_token, data.refresh_token);
        setUser(data.user);
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
        localStorage.setItem(TOKEN_KEY, data.access_token);
    }

    return data;
};

export const logout = () => {
    clearTokens();
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

const apiService = {
    login,
    register,
    refreshToken,
    logout,
    getProfile,
    sendContactForm,
    requestOffer,
    requestPresentation,
    isAuthenticated,
    getUser,
    getAccessToken,
    healthCheck,
    getAdminResidents,
    getApartmentDetails,
    getBuildingApartments,
    getMaintenanceRecords,
};

export default apiService;

