import api from './api'

const bookService = {
  async getBooks() {
    const result = await api.get('/books')
    return result.books || []
  },

  async getBook(id) {
    const result = await api.get(`/books/${id}`)
    return result.book
  },

  async createBook(data, options) {
    const result = await api.post('/books', data, options)
    return result.book
  },

  async updateBook(id, data, options) {
    const result = await api.put(`/books/${id}`, data, options)
    return result.book
  },

  deleteBook(id) {
    return api.delete(`/books/${id}`)
  },

  downloadBook(book) {
    return api.download(`/books/${book.id}/download`, book.fileName || `${book.title}.pdf`)
  },
}

export default bookService
