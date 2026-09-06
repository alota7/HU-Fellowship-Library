import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import { useTranslation } from '../../context/LanguageContext'
import { formatDate } from '../../utils/format'
import { useLanguage } from '../../context/LanguageContext'

export default function StudyNoteCard({ note, actions, showStatus = false, meta }) {
  const { t } = useTranslation()
  const { language } = useLanguage()

  return (
    <article className="card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{note.title}</h3>
        {showStatus && <StatusBadge status={note.status} />}
      </div>

      <p className="text-sm text-slate-600">{note.description}</p>

      <dl className="grid gap-1 text-xs text-slate-500">
        <div className="flex gap-1">
          <dt>{t('notes.uploadedOn')}:</dt>
          <dd>{formatDate(note.createdAt, language)}</dd>
        </div>
        {meta}
      </dl>

      {note.status === 'rejected' && note.rejectionReason && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {t('notes.rejectionReasonLabel')}: {note.rejectionReason}
        </p>
      )}

      {note.status === 'pending' && (
        <p className="text-xs font-medium text-amber-700">{t('notes.pendingReview')}</p>
      )}

      {actions && <div className="mt-auto flex flex-wrap gap-2 pt-2">{actions}</div>}
    </article>
  )
}

export function DownloadNoteButton({ note, onDownload, downloading }) {
  const { t } = useTranslation()
  if (!note.fileUrl) {
    return (
      <Button variant="secondary" disabled>
        {t('books.noFile')}
      </Button>
    )
  }
  return (
    <Button
      variant="secondary"
      onClick={onDownload}
      loading={downloading}
      loadingLabel={t('status.downloading')}
    >
      {t('action.download')}
    </Button>
  )
}
