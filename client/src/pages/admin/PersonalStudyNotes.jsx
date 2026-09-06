import { useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import SearchInput from '../../components/common/SearchInput'
import { Select } from '../../components/common/Input'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import RejectDialog from '../../components/common/RejectDialog'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import StudyNoteCard, { DownloadNoteButton } from '../../components/notes/StudyNoteCard'
import { useTranslation } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDownload } from '../../hooks/useDownload'
import studyNoteService from '../../services/studyNoteService'
import { NOTE_STATUSES } from '../../models'

export default function AdminPersonalStudyNotes() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, loading, error, reload } = useAsyncData(
    () => studyNoteService.getPersonalNotes(),
    [],
  )
  const { download, downloadingId } = useDownload()

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [toApprove, setToApprove] = useState(null)
  const [toReject, setToReject] = useState(null)
  const [working, setWorking] = useState(false)

  const notes = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (data || []).filter((note) => {
      if (status && note.status !== status) return false
      if (!term) return true
      return [note.title, note.description, note.uploaderName].some((value) =>
        value?.toLowerCase().includes(term),
      )
    })
  }, [data, query, status])

  async function runAction(action) {
    setWorking(true)
    try {
      await action()
      await reload()
    } catch (actionError) {
      toast.error(t(actionError?.messageKey || 'notes.saveError'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('notes.personalTitle')} />

      <div className="grid gap-3 sm:grid-cols-2">
        <SearchInput value={query} onChange={setQuery} placeholder={t('notes.searchPlaceholder')} />
        <Select
          label={t('ui.status')}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: '', label: t('ui.all') },
            ...NOTE_STATUSES.map((value) => ({ value, label: t(`status.${value}`) })),
          ]}
        />
      </div>

      {loading && <Loading />}
      {!loading && error && (
        <ErrorState title={t('notes.loadError')} error={error} onRetry={reload} />
      )}
      {!loading && !error && notes.length === 0 && (
        <EmptyState icon="📝" title={t('notes.emptyPersonal')} />
      )}
      {!loading && !error && notes.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <StudyNoteCard
              key={note.id}
              note={note}
              showStatus
              meta={
                <div className="flex gap-1">
                  <dt>{t('notes.uploadedBy')}:</dt>
                  <dd>{note.uploaderName}</dd>
                </div>
              }
              actions={
                <>
                  <DownloadNoteButton
                    note={note}
                    downloading={downloadingId === note.id}
                    onDownload={() =>
                      download(note.id, () => studyNoteService.downloadPersonalNote(note))
                    }
                  />
                  {note.status !== 'approved' && (
                    <Button variant="success" onClick={() => setToApprove(note)}>
                      {t('action.approve')}
                    </Button>
                  )}
                  {note.status !== 'rejected' && (
                    <Button variant="danger" onClick={() => setToReject(note)}>
                      {t('action.reject')}
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toApprove)}
        variant="success"
        title={t('action.approve')}
        description={toApprove?.title}
        confirmLabel={t('action.approve')}
        loading={working}
        onCancel={() => setToApprove(null)}
        onConfirm={() =>
          runAction(async () => {
            await studyNoteService.approvePersonalNote(toApprove.id)
            toast.success(t('notes.approved'))
            setToApprove(null)
          })
        }
      />

      <RejectDialog
        open={Boolean(toReject)}
        title={t('notes.rejectTitle')}
        loading={working}
        onCancel={() => setToReject(null)}
        onConfirm={(reason) =>
          runAction(async () => {
            await studyNoteService.rejectPersonalNote(toReject.id, reason)
            toast.success(t('notes.rejected'))
            setToReject(null)
          })
        }
      />
    </div>
  )
}
