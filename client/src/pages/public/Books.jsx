import { useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import BookFilters from '../../components/books/BookFilters'
import BookGrid from '../../components/books/BookGrid'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import Pagination from '../../components/common/Pagination'
import { SkeletonGrid } from '../../components/common/Loading'
import { useTranslation } from '../../context/LanguageContext'
import { useBooks } from '../../context/BooksContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import categoryService from '../../services/categoryService'
import { defaultBookFilters, filterBooks } from '../../utils/books'

const PAGE_SIZE = 12

export default function Books() {
  const { t } = useTranslation()
  const { books, loading, error, refresh } = useBooks()
  const { data: categories } = useAsyncData(() => categoryService.getCategories(), [])
  const [filters, setFilters] = useState(defaultBookFilters)
  const [page, setPage] = useState(1)

  const results = useMemo(() => filterBooks(books, filters), [books, filters])
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function handleFilters(next) {
    setFilters(next)
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <PageHeader title={t('books.title')} subtitle={t('books.subtitle')} />

      <div className="mt-6">
        <BookFilters filters={filters} categories={categories || []} onChange={handleFilters} />
      </div>

      <div className="mt-8">
        {loading && <SkeletonGrid />}

        {!loading && error && <ErrorState title={t('books.loadError')} error={error} onRetry={refresh} />}

        {!loading && !error && books.length === 0 && <EmptyState title={t('books.empty')} />}

        {!loading && !error && books.length > 0 && results.length === 0 && (
          <EmptyState icon="🔍" title={t('books.noResults')} />
        )}

        {!loading && !error && visible.length > 0 && (
          <>
            <p className="mb-4 text-sm text-slate-600">
              {results.length} {t('books.resultCount')}
            </p>
            <BookGrid books={visible} />
            <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
