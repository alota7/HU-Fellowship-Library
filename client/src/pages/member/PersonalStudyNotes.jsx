import { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
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

export default function MemberPersonalStudyNotes() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, loading, error, reload } = useAsyncData(
    () => studyNoteService.getMyPersonalNotes(),
    [],
  )
  const { download, downloadingId } = useDownload()

  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(null)
  const [noteToDelete, setNoteToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function handleCreate(values) {
    setSubmitting(true)
    setProgress(0)
    try {
      await studyNoteService.createPersonalNote(values, {
        onUploadProgress: (event) => setProgress(event.percent),
      })
      toast.success(t('notes.created'))
      setFormOpen(false)
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
      await studyNoteService.deletePersonalNote(noteToDelete.id)
      toast.success(t('notes.deleted'))
      setNoteToDelete(null)
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
        title={t('notes.personalTitle')}
        subtitle={t('notes.personalSubtitle')}
        actions={<Button onClick={() => setFormOpen(true)}>{t('action.addNote')}</Button>}
      />

      {loading && <Loading />}
      {!loading && error && (
        <ErrorState title={t('notes.loadError')} error={error} onRetry={reload} />
      )}
      {!loading && !error && (data || []).length === 0 && (
        <EmptyState icon="📝" title={t('notes.emptyPersonal')} />
      )}
      {!loading && !error && (data || []).length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((note) => (
            <StudyNoteCard
              key={note.id}
              note={note}
              showStatus
              actions={
                <>
                  <DownloadNoteButton
                    note={note}
                    downloading={downloadingId === note.id}
                    onDownload={() =>
                      download(note.id, () => studyNoteService.downloadPersonalNote(note))
                    }
                  />
                  <Button variant="danger" onClick={() => setNoteToDelete(note)}>
                    {t('action.delete')}
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}

      <Modal open={formOpen} title={t('action.addNote')} onClose={() => setFormOpen(false)}>
        <StudyNoteForm
          fileRequired
          submitting={submitting}
          progress={progress}
          onSubmit={handleCreate}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(noteToDelete)}
        title={t('notes.deleteTitle')}
        description={t('notes.deleteText')}
        confirmLabel={t('action.delete')}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setNoteToDelete(null)}
      />
    </div>
  )
}
