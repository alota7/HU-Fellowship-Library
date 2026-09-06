import { isBookAvailable } from '../models'

export const defaultBookFilters = {
  query: '',
  categoryId: '',
  bookType: '',
  availability: '',
  sort: 'newest',
}

export function filterBooks(books, filters) {
  const query = filters.query.trim().toLowerCase()

  const result = books.filter((book) => {
    if (filters.categoryId && book.categoryId !== filters.categoryId) return false
    if (filters.bookType && book.bookType !== filters.bookType) return false
    if (filters.availability === 'available' && !isBookAvailable(book)) return false
    if (filters.availability === 'unavailable' && isBookAvailable(book)) return false
    if (!query) return true
    return [book.title, book.author, book.category]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(query))
  })

  const sorters = {
    'title-asc': (a, b) => a.title.localeCompare(b.title),
    'title-desc': (a, b) => b.title.localeCompare(a.title),
    'author-asc': (a, b) => a.author.localeCompare(b.author),
    newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  }

  return [...result].sort(sorters[filters.sort] || sorters.newest)
}
