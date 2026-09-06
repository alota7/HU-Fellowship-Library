import { useState } from 'react'
import Input, { Textarea } from '../common/Input'
import FileInput from '../common/FileInput'
import Button from '../common/Button'
import { useTranslation } from '../../context/LanguageContext'
import {
  DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE,
  required,
  runValidators,
  validateFile,
} from '../../utils/validation'

export default function StudyNoteForm({
  note,
  onSubmit,
  onCancel,
  submitting,
  progress,
  fileRequired = false,
}) {
  const { t } = useTranslation()
  const [values, setValues] = useState({
    title: note?.title || '',
    description: note?.description || '',
  })
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})

  const setValue = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }))

  function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const nextErrors = runValidators(values, { title: [required], description: [required] })
    const fileError = validateFile(file, { types: DOCUMENT_TYPES, maxSize: MAX_DOCUMENT_SIZE })
    if (fileError) nextErrors.file = fileError
    if (fileRequired && !file && !note?.fileUrl) nextErrors.file = 'validation.required'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    onSubmit({ ...values, file })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <Input
        label={t('notes.noteTitle')}
        required
        value={values.title}
        onChange={setValue('title')}
        error={errors.title}
      />
      <Textarea
        label={t('notes.noteDescription')}
        required
        value={values.description}
        onChange={setValue('description')}
        error={errors.description}
      />
      <FileInput
        label={t('notes.file')}
        required={fileRequired}
        accept=".pdf,.epub,application/pdf,application/epub+zip"
        hint={t('file.acceptedDocuments')}
        error={errors.file}
        file={file}
        fileName={note?.fileName}
        progress={progress}
        onSelect={setFile}
        onRemove={() => setFile(null)}
        disabled={submitting}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
