import api from './api'

const borrowingService = {
  async getMyBorrowings() {
    const result = await api.get('/borrowings/me')
    return result.borrowings || []
  },

  async getBorrowings() {
    const result = await api.get('/borrowings')
    return result.borrowings || []
  },

  async requestBorrow(data) {
    const result = await api.post('/borrowings', data)
    return result.borrowing
  },

  async approve(id) {
    const result = await api.patch(`/borrowings/${id}/approve`)
    return result.borrowing
  },

  async reject(id, reason) {
    const result = await api.patch(`/borrowings/${id}/reject`, { reason })
    return result.borrowing
  },

  async requestReturn(id) {
    const result = await api.patch(`/borrowings/${id}/request-return`)
    return result.borrowing
  },

  async markReturned(id) {
    const result = await api.patch(`/borrowings/${id}/return`)
    return result.borrowing
  },
}

export default borrowingService
