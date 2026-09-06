import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import bookService from '../services/bookService'

const BooksContext = createContext(null)

// A single books collection shared by the store and the admin screens, so a
// successful create/update/delete is reflected everywhere without a reload.
export function BooksProvider({ children }) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setBooks(await bookService.getBooks())
    } catch (apiError) {
      setError(apiError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createBook = useCallback(
    async (data, options) => {
      const book = await bookService.createBook(data, options)
      setBooks((current) => [book, ...current.filter((item) => item.id !== book.id)])
      await refresh()
      return book
    },
    [refresh],
  )

  const updateBook = useCallback(
    async (id, data, options) => {
      const book = await bookService.updateBook(id, data, options)
      setBooks((current) => current.map((item) => (item.id === book.id ? book : item)))
      return book
    },
    [],
  )

  const deleteBook = useCallback(async (id) => {
    await bookService.deleteBook(id)
    setBooks((current) => current.filter((item) => item.id !== id))
  }, [])

  const value = useMemo(
    () => ({ books, loading, error, refresh, createBook, updateBook, deleteBook }),
    [books, loading, error, refresh, createBook, updateBook, deleteBook],
  )

  return <BooksContext.Provider value={value}>{children}</BooksContext.Provider>
}

export function useBooks() {
  const context = useContext(BooksContext)
  if (!context) throw new Error('useBooks must be used inside a BooksProvider')
  return context
}
