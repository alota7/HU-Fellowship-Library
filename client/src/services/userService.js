import api from './api'

const userService = {
  async getUsers() {
    const result = await api.get('/users')
    return result.users || []
  },

  async updateProfile(data) {
    const result = await api.patch('/users/me', data)
    return result.user
  },

  async updateStatus(id, status) {
    const result = await api.patch(`/users/${id}/status`, { status })
    return result.user
  },
}

export default userService
