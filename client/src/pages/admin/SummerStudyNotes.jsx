import { useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import SearchInput from '../../components/common/SearchInput'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import StudyNoteForm from '../../components/notes/StudyNoteForm'
import StudyNoteCard, { DownloadNoteButton } from '../../components/notes/StudyNoteCard'
import { useTranslation } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDownload } from '../../hooks/useDownload'
import studyNoteService from '../../services/studyNoteService'

export default function AdminSummerStudyNotes() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, loading, error, reload } = useAsyncData(() => studyNoteService.getSummerNotes(), [])
  const { download, downloadingId } = useDownload()

  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const notes = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return data || []
    return (data || []).filter((note) =>
      [note.title, note.description].some((value) => value?.toLowerCase().includes(term)),
    )
  }, [data, query])

  function open(note) {
    setEditing(note)
    setFormOpen(true)
  }

  async function handleSubmit(values) {
    setSubmitting(true)
    setProgress(0)
    const options = { onUploadProgress: (event) => setProgress(event.percent) }
    try {
      if (editing) {
        await studyNoteService.updateSummerNote(editing.id, values, options)
        toast.success(t('notes.updated'))
      } else {
        await studyNoteService.createSummerNote(values, options)
        toast.success(t('notes.created'))
      }
      setFormOpen(false)
      setEditing(null)
      await reload()
    } catch (saveError) {
      toast.error(t(saveError?.messageKey || 'notes.saveError'))
    } finally {
      setSubmitting(false)
      setProgress(null)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await studyNoteService.deleteSummerNote(toDelete.id)
      toast.success(t('notes.deleted'))
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
        title={t('notes.summerTitle')}
        subtitle={t('notes.summerSubtitle')}
        actions={<Button onClick={() => open(null)}>{t('action.addNote')}</Button>}
      />

      <div className="max-w-md">
        <SearchInput value={query} onChange={setQuery} placeholder={t('notes.searchPlaceholder')} />
      </div>

      {loading && <Loading />}
      {!loading && error && (
        <ErrorState title={t('notes.loadError')} error={error} onRetry={reload} />
      )}
      {!loading && !error && notes.length === 0 && (
        <EmptyState icon="📖" title={t('notes.emptySummer')} />
      )}
      {!loading && !error && notes.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <StudyNoteCard
              key={note.id}
              note={note}
              actions={
                <>
                  <DownloadNoteButton
                    note={note}
                    downloading={downloadingId === note.id}
                    onDownload={() =>
                      download(note.id, () => studyNoteService.downloadSummerNote(note))
                    }
                  />
                  <Button variant="secondary" onClick={() => open(note)}>
                    {t('action.edit')}
                  </Button>
                  <Button variant="danger" onClick={() => setToDelete(note)}>
                    {t('action.delete')}
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        title={t(editing ? 'action.edit' : 'action.addNote')}
        onClose={() => setFormOpen(false)}
      >
        <StudyNoteForm
          key={editing?.id || 'new'}
          note={editing}
          submitting={submitting}
          progress={progress}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('notes.deleteTitle')}
        description={t('notes.deleteText')}
        confirmLabel={t('action.delete')}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
