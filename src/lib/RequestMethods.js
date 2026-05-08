import { store } from "@/redux/store";
import { loginSuccess, signOut } from "@/redux/slices/userSlice";
import axios from "axios";

const BASE_URL =  process.env.NEXT_PUBLIC_API_URL || 'https://crescent-be.vercel.app/'
const AUTH_BASE = '/api/v1/auth';

export const publicRequest = axios.create({
    baseURL: BASE_URL
})

export const userRequest = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
})
const getTokenFromState = () => {
    const state = store.getState();
    const token = state.user.token;
    if (token) return token;
    const legacyToken = state.user.currentUser?.data?.token;
    if (legacyToken) return legacyToken;
    try {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('accessToken');
        }
    } catch (error) {
        console.error('[RequestMethods] Failed to read accessToken from localStorage:', error);
    }

    return null;
};
const getRefreshTokenFromState = () => {
    const state = store.getState();
    const refreshToken = state.user.refreshToken;
    if (refreshToken) return refreshToken;

    const legacyRefreshToken = state.user.currentUser?.data?.refreshToken;
    if (legacyRefreshToken) return legacyRefreshToken;

    try {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('refreshToken');
        }
    } catch (error) {
        console.error('[RequestMethods] Failed to read refreshToken from localStorage:', error);
    }

    return null;
};

const normalizeAuthPayload = (data) => {
    return {
        token: data?.accessToken || data?.token || data?.data?.accessToken || data?.data?.token || null,
        refreshToken: data?.refreshToken || data?.data?.refreshToken || null,
        user: data?.user || data?.data?.user || data?.profile || data?.data?.profile || null,
    };
};

const resolveErrorMessage = (error) => {
    const rawMessage = error?.response?.data?.message;
    if (Array.isArray(rawMessage)) return rawMessage.join('\n');
    if (typeof rawMessage === 'string' && rawMessage.trim().length > 0) return rawMessage;
    return error?.response?.data?.error || error?.message || 'Request failed';
};

const showBadRequestDialog = (error) => {
    if (typeof window === 'undefined') return;
    const message = resolveErrorMessage(error);
    window.alert(message);
};

let isRefreshing = false;
let refreshQueue = [];

const resolveRefreshQueue = (error, token) => {
    refreshQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });
    refreshQueue = [];
};

const isAuthEndpoint = (url = '') => {
    return url.includes(`${AUTH_BASE}/login`) || url.includes(`${AUTH_BASE}/register`) || url.includes(`${AUTH_BASE}/refresh`);
};

publicRequest.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 400) {
            showBadRequestDialog(error);
        }
        return Promise.reject(error);
    }
);

userRequest.interceptors.request.use(
    (config) => {
        const token = getTokenFromState();
        
        console.log('[RequestMethods] Request to:', config.url);
        console.log('[RequestMethods] Has token:', !!token);
        if (token) {
            console.log('[RequestMethods] Token preview:', token.substring(0, 20) + '...');
        }
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);
userRequest.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const safeErrorDetails = {
            status: error.response?.status,
            endpoint: error.config?.url?.split('?')[0], 
            errorType: error.response?.data?.error || 'Unknown Error'
        };
        console.error('[RequestMethods] Request failed:', safeErrorDetails);
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
            const refreshToken = getRefreshTokenFromState();
            if (!refreshToken) {
                store.dispatch(signOut());
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    refreshQueue.push({ resolve, reject });
                }).then((newToken) => {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return userRequest(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshResponse = await publicRequest.post(`${AUTH_BASE}/refresh`, { refreshToken });
                const refreshData = refreshResponse.data?.data || refreshResponse.data;
                const { token, refreshToken: newRefreshToken, user } = normalizeAuthPayload(refreshData);

                if (!token && !newRefreshToken && !user) {
                    throw new Error('Refresh response missing auth data');
                }

                store.dispatch(loginSuccess({ user, token, refreshToken: newRefreshToken }));
                resolveRefreshQueue(null, token);
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return userRequest(originalRequest);
            } catch (refreshError) {
                resolveRefreshQueue(refreshError, null);
                store.dispatch(signOut());
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        switch (error.response?.status) {
            case 400:
                console.error('Bad request:', safeErrorDetails);
                showBadRequestDialog(error);
                break;
            case 401:
                console.error('Authentication failed:', safeErrorDetails);
                store.dispatch(signOut());
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
                break;
            case 403:
                console.error('Permission denied:', safeErrorDetails);
                if (typeof window !== 'undefined' && window.toast) {
                    window.toast.error('Access denied');
                }
                break;
            case 500:
                console.error('Server error:', safeErrorDetails);
                if (typeof window !== 'undefined' && window.toast) {
                    window.toast.error('An unexpected error occurred');
                }
                break;
            case 503:
                console.error('Service unavailable:', safeErrorDetails);
                if (typeof window !== 'undefined' && window.toast) {
                    window.toast.error('Service temporarily unavailable. Please try again later.');
                }
                break;
            default:
                console.error('Request failed:', safeErrorDetails);
                if (typeof window !== 'undefined' && window.toast) {
                    window.toast.error('Request failed');
                }
        }
        if (process.env.NODE_ENV === 'development') {
            console.debug('Development error context:', {
                endpoint: safeErrorDetails.endpoint,
                status: safeErrorDetails.status,
                message: error.response?.data?.message || 'No error message provided'
            });
        }

        return Promise.reject(error);
    }
);