import api from './api'

const categoryService = {
  async getCategories() {
    const result = await api.get('/categories')
    return result.categories || []
  },

  async createCategory(data) {
    const result = await api.post('/categories', data)
    return result.category
  },

  async updateCategory(id, data) {
    const result = await api.put(`/categories/${id}`, data)
    return result.category
  },

  deleteCategory(id) {
    return api.delete(`/categories/${id}`)
  },
}

export default categoryService
