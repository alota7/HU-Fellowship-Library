import { Link } from 'react-router-dom'
import BookCover from './BookCover'
import Badge from '../common/Badge'
import Button from '../common/Button'
import { useTranslation } from '../../context/LanguageContext'
import { isBookAvailable } from '../../models'

export default function BookCard({ book }) {
  const { t } = useTranslation()
  const available = isBookAvailable(book)

  return (
    <article className="card flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="aspect-[3/4] w-full overflow-hidden bg-slate-100">
        <BookCover book={book} />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{t(`books.${book.bookType}`)}</Badge>
          <Badge tone={available ? 'success' : 'danger'}>
            {t(available ? 'status.available' : 'status.unavailable')}
          </Badge>
        </div>

        <h3 className="line-clamp-2 text-base font-semibold text-slate-900">{book.title}</h3>
        <p className="text-sm text-slate-600">{book.author}</p>
        {book.category && <p className="text-xs text-slate-500">{book.category}</p>}
        <p className="line-clamp-2 text-sm text-slate-600">{book.description}</p>

        <div className="mt-auto pt-3">
          <Link to={`/books/${book.id}`} className="block">
            <Button variant="secondary" className="w-full">
              {t('action.viewDetails')}
            </Button>
          </Link>
        </div>
      </div>
    </article>
  )
}
