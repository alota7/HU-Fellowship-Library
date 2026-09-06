const env = import.meta.env

export const API_BASE_URL = env.VITE_API_BASE_URL || '/api'

// The mock adapter is a development stand-in for the future backend.
// Set VITE_USE_MOCK_API=false to talk to the real API instead.
export const USE_MOCK_API = String(env.VITE_USE_MOCK_API ?? 'true') !== 'false'

// Mock mode only: an account registered with this email is treated as an
// administrator. No credentials are stored in the frontend.
export const MOCK_ADMIN_EMAIL = (env.VITE_MOCK_ADMIN_EMAIL || '').trim().toLowerCase()

export const TOKEN_STORAGE_KEY = 'hufl.token'
