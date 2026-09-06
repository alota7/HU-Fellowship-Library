import { useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import SearchInput from '../../components/common/SearchInput'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import Loading from '../../components/common/Loading'
import StudyNoteCard, { DownloadNoteButton } from '../../components/notes/StudyNoteCard'
import { useTranslation } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDownload } from '../../hooks/useDownload'
import studyNoteService from '../../services/studyNoteService'

export default function SummerBibleStudyNotes() {
  const { t } = useTranslation()
  const { data, loading, error, reload } = useAsyncData(() => studyNoteService.getSummerNotes(), [])
  const { download, downloadingId } = useDownload()
  const [query, setQuery] = useState('')

  const notes = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return data || []
    return (data || []).filter((note) =>
      [note.title, note.description].some((value) => value?.toLowerCase().includes(term)),
    )
  }, [data, query])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <PageHeader title={t('notes.summerTitle')} subtitle={t('notes.summerSubtitle')} />

      <div className="mt-6 max-w-md">
        <SearchInput value={query} onChange={setQuery} placeholder={t('notes.searchPlaceholder')} />
      </div>

      <div className="mt-8">
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
                  <DownloadNoteButton
                    note={note}
                    downloading={downloadingId === note.id}
                    onDownload={() =>
                      download(note.id, () => studyNoteService.downloadSummerNote(note))
                    }
                  />
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
