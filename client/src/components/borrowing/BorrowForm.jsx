import { useState } from 'react'
import Input, { Checkbox } from '../common/Input'
import Button from '../common/Button'
import { useTranslation } from '../../context/LanguageContext'
import { required, runValidators } from '../../utils/validation'

export default function BorrowForm({ book, user, onSubmit, onCancel, submitting }) {
  const { t } = useTranslation()
  const [values, setValues] = useState({
    name: user?.fullName || '',
    phone: user?.phone || '',
    schoolYear: user?.schoolYear || '',
    department: user?.department || '',
    confirmation: false,
  })
  const [errors, setErrors] = useState({})

  const setValue = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }))

  function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const nextErrors = runValidators(values, {
      name: [required],
      phone: [required],
      schoolYear: [required],
      department: [required],
      confirmation: [required],
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    onSubmit({ bookId: book.id, ...values })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <div>
        <p className="field-label">{t('borrow.book')}</p>
        <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">
          {book.title}
        </p>
      </div>

      <Input
        label={t('borrow.name')}
        required
        value={values.name}
        onChange={setValue('name')}
        error={errors.name}
      />
      <Input
        label={t('borrow.phone')}
        required
        value={values.phone}
        onChange={setValue('phone')}
        error={errors.phone}
      />
      <Input
        label={t('borrow.schoolYear')}
        required
        value={values.schoolYear}
        onChange={setValue('schoolYear')}
        error={errors.schoolYear}
      />
      <Input
        label={t('borrow.department')}
        required
        value={values.department}
        onChange={setValue('department')}
        error={errors.department}
      />
      <Checkbox
        label={t('borrow.confirmation')}
        checked={values.confirmation}
        onChange={(event) =>
          setValues((current) => ({ ...current, confirmation: event.target.checked }))
        }
        error={errors.confirmation}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          {t('action.cancel')}
        </Button>
        <Button type="submit" loading={submitting} loadingLabel={t('status.processing')}>
          {t('borrow.submit')}
        </Button>
      </div>
    </form>
  )
}
