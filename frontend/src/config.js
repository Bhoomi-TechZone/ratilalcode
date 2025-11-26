// API configuration
const API_CONFIG = {
  BASE_URL: 'https://ratilalandsonscrm.onrender.com',
  API_PREFIX: '/api'
};

// Full API URL
export const API_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}`;

// Auth endpoints
export const AUTH_API = {
  LOGIN: `${API_URL}/auth/login`,
  LOGOUT: `${API_URL}/auth/logout`,
  ME: `${API_URL}/auth/me`
};

// User endpoints
export const USER_API = {
  USERS: `${API_URL}/users`
};

// Role endpoints
export const ROLE_API = {
  ROLES: `${API_URL}/roles`
};


export default {
  API_URL,
  AUTH_API,
  USER_API,
  ROLE_API
};
