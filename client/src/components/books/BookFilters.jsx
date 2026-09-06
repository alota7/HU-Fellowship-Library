import SearchInput from '../common/SearchInput'
import { Select } from '../common/Input'
import { useTranslation } from '../../context/LanguageContext'

export default function BookFilters({ filters, categories, onChange }) {
  const { t } = useTranslation()

  const update = (key) => (event) => onChange({ ...filters, [key]: event.target.value })

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="sm:col-span-2 xl:col-span-2">
        <SearchInput
          value={filters.query}
          onChange={(value) => onChange({ ...filters, query: value })}
          placeholder={t('books.searchPlaceholder')}
        />
      </div>

      <Select
        label={t('books.category')}
        value={filters.categoryId}
        onChange={update('categoryId')}
        options={[
          { value: '', label: t('books.allCategories') },
          ...categories.map((category) => ({ value: category.id, label: category.name })),
        ]}
      />

      <Select
        label={t('books.bookType')}
        value={filters.bookType}
        onChange={update('bookType')}
        options={[
          { value: '', label: t('books.allTypes') },
          { value: 'hardcopy', label: t('books.hardcopy') },
          { value: 'softcopy', label: t('books.softcopy') },
        ]}
      />

      <Select
        label={t('ui.status')}
        value={filters.availability}
        onChange={update('availability')}
        options={[
          { value: '', label: t('books.allAvailability') },
          { value: 'available', label: t('status.available') },
          { value: 'unavailable', label: t('status.unavailable') },
        ]}
      />

      <Select
        label={t('books.sortBy')}
        value={filters.sort}
        onChange={update('sort')}
        options={[
          { value: 'newest', label: t('books.sortNewest') },
          { value: 'title-asc', label: t('books.sortTitleAsc') },
          { value: 'title-desc', label: t('books.sortTitleDesc') },
          { value: 'author-asc', label: t('books.sortAuthorAsc') },
        ]}
      />
    </div>
  )
}
