import { useState } from 'react'
import Input, { Select, Textarea } from '../common/Input'
import FileInput from '../common/FileInput'
import Button from '../common/Button'
import { useTranslation } from '../../context/LanguageContext'
import {
  DOCUMENT_TYPES,
  IMAGE_TYPES,
  MAX_DOCUMENT_SIZE,
  MAX_IMAGE_SIZE,
  numeric,
  required,
  runValidators,
  validateFile,
} from '../../utils/validation'

function initialValues(book, categories) {
  return {
    title: book?.title || '',
    author: book?.author || '',
    bookType: book?.bookType || 'hardcopy',
    categoryId: book?.categoryId || categories[0]?.id || '',
    description: book?.description || '',
    isbn: book?.isbn || '',
    publisher: book?.publisher || '',
    publicationYear: book?.publicationYear || '',
    location: book?.location || '',
    quantity: book?.quantity ?? 1,
    availableQuantity: book?.availableQuantity ?? 1,
  }
}

export default function BookForm({ book, categories, onSubmit, onCancel, submitting, progress }) {
  const { t } = useTranslation()
  const [values, setValues] = useState(() => initialValues(book, categories))
  const [coverFile, setCoverFile] = useState(null)
  const [digitalFile, setDigitalFile] = useState(null)
  const [errors, setErrors] = useState({})

  const setValue = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }))

  function validate() {
    const rules = {
      title: [required],
      author: [required],
      bookType: [required],
      categoryId: [required],
      description: [required],
      publicationYear: [numeric],
    }
    if (values.bookType === 'hardcopy') {
      rules.quantity = [required, numeric]
      rules.availableQuantity = [required, numeric]
    }

    const nextErrors = runValidators(values, rules)
    const coverError = validateFile(coverFile, { types: IMAGE_TYPES, maxSize: MAX_IMAGE_SIZE })
    const fileError = validateFile(digitalFile, {
      types: DOCUMENT_TYPES,
      maxSize: MAX_DOCUMENT_SIZE,
    })
    if (coverError) nextErrors.coverFile = coverError
    if (fileError) nextErrors.digitalFile = fileError

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (submitting || !validate()) return
    onSubmit({ ...values, coverFile, digitalFile })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Input
        label={t('books.detailsTitle')}
        required
        value={values.title}
        onChange={setValue('title')}
        error={errors.title}
      />
      <Input
        label={t('books.author')}
        required
        value={values.author}
        onChange={setValue('author')}
        error={errors.author}
      />
      <Select
        label={t('books.bookType')}
        required
        value={values.bookType}
        onChange={setValue('bookType')}
        error={errors.bookType}
        options={[
          { value: 'hardcopy', label: t('books.hardcopy') },
          { value: 'softcopy', label: t('books.softcopy') },
        ]}
      />
      <Select
        label={t('books.category')}
        required
        value={values.categoryId}
        onChange={setValue('categoryId')}
        error={errors.categoryId}
        options={categories.map((category) => ({ value: category.id, label: category.name }))}
      />

      <div className="sm:col-span-2">
        <Textarea
          label={t('books.description')}
          required
          value={values.description}
          onChange={setValue('description')}
          error={errors.description}
        />
      </div>

      <Input
        label={t('books.isbn')}
        value={values.isbn}
        onChange={setValue('isbn')}
        hint={t('ui.optional')}
      />
      <Input
        label={t('books.publisher')}
        value={values.publisher}
        onChange={setValue('publisher')}
        hint={t('ui.optional')}
      />
      <Input
        label={t('books.publicationYear')}
        value={values.publicationYear}
        onChange={setValue('publicationYear')}
        error={errors.publicationYear}
        inputMode="numeric"
        hint={t('ui.optional')}
      />
      <Input
        label={t('books.location')}
        value={values.location}
        onChange={setValue('location')}
        hint={t('ui.optional')}
      />

      {values.bookType === 'hardcopy' && (
        <>
          <Input
            label={t('books.quantity')}
            required
            type="number"
            min="0"
            value={values.quantity}
            onChange={setValue('quantity')}
            error={errors.quantity}
          />
          <Input
            label={t('books.availableQuantity')}
            required
            type="number"
            min="0"
            value={values.availableQuantity}
            onChange={setValue('availableQuantity')}
            error={errors.availableQuantity}
          />
        </>
      )}

      <FileInput
        label={t('books.cover')}
        accept={IMAGE_TYPES.join(',')}
        hint={t('file.acceptedImages')}
        error={errors.coverFile}
        file={coverFile}
        fileName={book?.coverImage ? t('books.cover') : ''}
        progress={progress}
        onSelect={setCoverFile}
        onRemove={() => setCoverFile(null)}
        disabled={submitting}
      />

      <FileInput
        label={t('books.file')}
        accept=".pdf,.epub,application/pdf,application/epub+zip"
        hint={t('file.acceptedDocuments')}
        error={errors.digitalFile}
        file={digitalFile}
        fileName={book?.fileName}
        progress={progress}
        onSelect={setDigitalFile}
        onRemove={() => setDigitalFile(null)}
        disabled={submitting}
      />

      <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          {t('action.cancel')}
        </Button>
        <Button type="submit" loading={submitting} loadingLabel={t('status.saving')}>
          {t('action.save')}
        </Button>
      </div>
    </form>
  )
}
