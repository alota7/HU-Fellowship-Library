import api, { setToken } from './api'

const authService = {
  async register(data) {
    const result = await api.post('/auth/register', data)
    return result.user
  },

  async login(credentials) {
    const result = await api.post('/auth/login', credentials)
    setToken(result.token)
    return result.user
  },

  async logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      setToken(null)
    }
  },

  async me() {
    const result = await api.get('/auth/me')
    return result.user
  },

  verifyEmail(token) {
    return api.get('/auth/verify-email', { params: { token } })
  },

  resendVerification(email) {
    return api.post('/auth/resend-verification', { email })
  },

  forgotPassword(email) {
    return api.post('/auth/forgot-password', { email })
  },

  resetPassword({ token, password }) {
    return api.post('/auth/reset-password', { token, password })
  },
}

export default authService
