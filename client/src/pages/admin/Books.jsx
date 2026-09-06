import { useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import Badge from '../../components/common/Badge'
import BookFilters from '../../components/books/BookFilters'
import BookForm from '../../components/books/BookForm'
import BookCover from '../../components/books/BookCover'
import { useTranslation } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useBooks } from '../../context/BooksContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import categoryService from '../../services/categoryService'
import { defaultBookFilters, filterBooks } from '../../utils/books'
import { isBookAvailable } from '../../models'

export default function AdminBooks() {
  const { t } = useTranslation()
  const toast = useToast()
  const { books, loading, error, refresh, createBook, updateBook, deleteBook } = useBooks()
  const { data: categories } = useAsyncData(() => categoryService.getCategories(), [])

  const [filters, setFilters] = useState(defaultBookFilters)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(null)
  const [bookToDelete, setBookToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const results = useMemo(() => filterBooks(books, filters), [books, filters])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(book) {
    setEditing(book)
    setFormOpen(true)
  }

  async function handleSubmit(values) {
    setSubmitting(true)
    setProgress(0)
    const options = { onUploadProgress: (event) => setProgress(event.percent) }
    try {
      if (editing) {
        await updateBook(editing.id, values, options)
        toast.success(t('adminBooks.updated'))
      } else {
        await createBook(values, options)
        toast.success(t('adminBooks.created'))
      }
      setFormOpen(false)
      setEditing(null)
    } catch (saveError) {
      toast.error(t(saveError?.messageKey || 'adminBooks.saveError'))
    } finally {
      setSubmitting(false)
      setProgress(null)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteBook(bookToDelete.id)
      toast.success(t('adminBooks.deleted'))
      setBookToDelete(null)
    } catch (deleteError) {
      toast.error(t(deleteError?.messageKey || 'adminBooks.deleteError'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('adminBooks.title')}
        actions={<Button onClick={openCreate}>{t('adminBooks.add')}</Button>}
      />

      <BookFilters filters={filters} categories={categories || []} onChange={setFilters} />

      {loading && <Loading />}
      {!loading && error && <ErrorState title={t('books.loadError')} error={error} onRetry={refresh} />}
      {!loading && !error && books.length === 0 && (
        <EmptyState
          title={t('books.empty')}
          action={<Button onClick={openCreate}>{t('adminBooks.add')}</Button>}
        />
      )}
      {!loading && !error && books.length > 0 && results.length === 0 && (
        <EmptyState icon="🔍" title={t('books.noResults')} />
      )}

      {!loading && !error && results.length > 0 && (
        <ul className="grid gap-4">
          {results.map((book) => (
            <li key={book.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <BookCover book={book} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-slate-900">{book.title}</h3>
                <p className="text-sm text-slate-600">{book.author}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone="info">{t(`books.${book.bookType}`)}</Badge>
                  {book.category && <Badge>{book.category}</Badge>}
                  <Badge tone={isBookAvailable(book) ? 'success' : 'danger'}>
                    {t(isBookAvailable(book) ? 'status.available' : 'status.unavailable')}
                  </Badge>
                  {book.bookType === 'hardcopy' && (
                    <span className="text-xs text-slate-500">
                      {book.availableQuantity}/{book.quantity} {t('books.copiesAvailable')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(book)}>
                  {t('action.edit')}
                </Button>
                <Button variant="danger" size="sm" onClick={() => setBookToDelete(book)}>
                  {t('action.delete')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={formOpen}
        size="lg"
        title={t(editing ? 'adminBooks.edit' : 'adminBooks.add')}
        onClose={() => setFormOpen(false)}
      >
        <BookForm
          key={editing?.id || 'new'}
          book={editing}
          categories={categories || []}
          submitting={submitting}
          progress={progress}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(bookToDelete)}
        title={t('adminBooks.deleteTitle')}
        description={t('adminBooks.deleteText')}
        confirmLabel={t('action.delete')}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setBookToDelete(null)}
      />
    </div>
  )
}
