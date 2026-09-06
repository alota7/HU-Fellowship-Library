import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BookCover from '../../components/books/BookCover'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import ErrorState from '../../components/common/ErrorState'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import BorrowForm from '../../components/borrowing/BorrowForm'
import { useTranslation } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDownload } from '../../hooks/useDownload'
import { useBooks } from '../../context/BooksContext'
import bookService from '../../services/bookService'
import borrowingService from '../../services/borrowingService'
import { isBookAvailable } from '../../models'

export default function BookDetails() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { refresh: refreshBooks } = useBooks()
  const { download, downloadingId } = useDownload()

  const { data: book, loading, error, reload } = useAsyncData(() => bookService.getBook(id), [id])
  const [borrowOpen, setBorrowOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <Loading className="min-h-[50vh]" />
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState
          title={t(error.status === 404 ? 'books.notFound' : 'books.loadOneError')}
          error={error}
          onRetry={error.status === 404 ? undefined : reload}
        />
      </div>
    )
  }

  const available = isBookAvailable(book)

  function openBorrow() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/books/${id}` } } })
      return
    }
    setBorrowOpen(true)
  }

  async function submitBorrow(values) {
    setSubmitting(true)
    try {
      await borrowingService.requestBorrow(values)
      toast.success(t('borrow.submitted'))
      setBorrowOpen(false)
      await Promise.all([reload(), refreshBooks()])
    } catch (submitError) {
      toast.error(t(submitError?.messageKey || 'borrow.submitError'))
    } finally {
      setSubmitting(false)
    }
  }

  const facts = [
    { label: t('books.author'), value: book.author },
    { label: t('books.category'), value: book.category },
    { label: t('books.bookType'), value: t(`books.${book.bookType}`) },
    { label: t('books.isbn'), value: book.isbn },
    { label: t('books.publisher'), value: book.publisher },
    { label: t('books.publicationYear'), value: book.publicationYear },
    { label: t('books.location'), value: book.location },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Link to="/books" className="text-sm font-medium text-brand-800 hover:underline">
        ← {t('nav.books')}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <div className="aspect-[3/4]">
            <BookCover book={book} />
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{t(`books.${book.bookType}`)}</Badge>
            <Badge tone={available ? 'success' : 'danger'}>
              {t(available ? 'status.available' : 'status.unavailable')}
            </Badge>
            {book.bookType === 'hardcopy' && (
              <span className="text-sm text-slate-600">
                {book.availableQuantity} {t('books.copiesAvailable')}
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">{book.title}</h1>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {facts
              .filter((fact) => fact.value)
              .map((fact) => (
                <div key={fact.label} className="rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {fact.label}
                  </dt>
                  <dd className="text-sm font-medium text-slate-800">{fact.value}</dd>
                </div>
              ))}
          </dl>

          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t('books.description')}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {book.description}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {book.bookType === 'hardcopy' && (
              <Button onClick={openBorrow} disabled={!available}>
                {t('action.borrow')}
              </Button>
            )}

            {book.bookType === 'softcopy' &&
              (book.fileUrl ? (
                <Button
                  onClick={() => download(book.id, () => bookService.downloadBook(book))}
                  loading={downloadingId === book.id}
                  loadingLabel={t('status.downloading')}
                >
                  {t('action.download')}
                </Button>
              ) : (
                <p className="text-sm font-medium text-slate-600">{t('books.noFile')}</p>
              ))}
          </div>
        </div>
      </div>

      <Modal
        open={borrowOpen}
        title={t('borrow.requestTitle')}
        onClose={() => setBorrowOpen(false)}
      >
        <p className="mb-4 text-sm text-slate-600">{t('borrow.requestSubtitle')}</p>
        <BorrowForm
          book={book}
          user={user}
          submitting={submitting}
          onSubmit={submitBorrow}
          onCancel={() => setBorrowOpen(false)}
        />
      </Modal>
    </div>
  )
}
