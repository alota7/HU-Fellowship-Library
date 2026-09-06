import { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Input, { Textarea } from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import { useTranslation } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import categoryService from '../../services/categoryService'
import { required, runValidators } from '../../utils/validation'

export default function AdminCategories() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, loading, error, reload } = useAsyncData(() => categoryService.getCategories(), [])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [values, setValues] = useState({ name: '', description: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  function open(category) {
    setEditing(category)
    setValues({ name: category?.name || '', description: category?.description || '' })
    setErrors({})
    setFormOpen(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const nextErrors = runValidators(values, { name: [required] })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      if (editing) {
        await categoryService.updateCategory(editing.id, values)
        toast.success(t('categories.updated'))
      } else {
        await categoryService.createCategory(values)
        toast.success(t('categories.created'))
      }
      setFormOpen(false)
      await reload()
    } catch (saveError) {
      toast.error(t(saveError?.messageKey || 'error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await categoryService.deleteCategory(toDelete.id)
      toast.success(t('categories.deleted'))
      setToDelete(null)
      await reload()
    } catch (deleteError) {
      toast.error(t(deleteError?.messageKey || 'error.generic'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('categories.title')}
        actions={<Button onClick={() => open(null)}>{t('categories.add')}</Button>}
      />

      {loading && <Loading />}
      {!loading && error && (
        <ErrorState title={t('categories.loadError')} error={error} onRetry={reload} />
      )}
      {!loading && !error && (data || []).length === 0 && (
        <EmptyState icon="🏷️" title={t('categories.empty')} />
      )}
      {!loading && !error && (data || []).length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((category) => (
            <li key={category.id} className="card flex flex-col gap-2 p-5">
              <h3 className="text-base font-semibold text-slate-900">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-slate-600">{category.description}</p>
              )}
              <p className="text-xs text-slate-500">
                {t('categories.bookCount')}: {category.bookCount ?? 0}
              </p>
              <div className="mt-auto flex gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => open(category)}>
                  {t('action.edit')}
                </Button>
                <Button variant="danger" size="sm" onClick={() => setToDelete(category)}>
                  {t('action.delete')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={formOpen}
        title={t(editing ? 'categories.edit' : 'categories.add')}
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <Input
            label={t('categories.name')}
            required
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            error={errors.name}
          />
          <Textarea
            label={t('categories.descriptionField')}
            value={values.description}
            hint={t('ui.optional')}
            onChange={(event) =>
              setValues((current) => ({ ...current, description: event.target.value }))
            }
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={submitting}>
              {t('action.cancel')}
            </Button>
            <Button type="submit" loading={submitting} loadingLabel={t('status.saving')}>
              {t('action.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('categories.deleteTitle')}
        description={t('categories.deleteText')}
        confirmLabel={t('action.delete')}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
