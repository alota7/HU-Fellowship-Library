import { useTranslation } from '../../context/LanguageContext'

// Books without a cover get a readable fallback instead of a broken image.
export default function BookCover({ book, className = '' }) {
  const { t } = useTranslation()

  if (book?.coverImage) {
    return (
      <img
        src={book.coverImage}
        alt={book.title}
        className={`size-full object-cover ${className}`}
        loading="lazy"
      />
    )
  }

  return (
    <div
      className={`flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-700 to-brand-900 p-4 text-center text-white ${className}`}
    >
      <span aria-hidden="true" className="text-3xl">
        📖
      </span>
      <span className="line-clamp-3 text-sm font-semibold">{book?.title}</span>
      <span className="sr-only">{t('books.noCover')}</span>
    </div>
  )
}
