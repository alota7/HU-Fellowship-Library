import { useCallback, useState } from 'react'
import { useToast } from '../context/ToastContext'
import { useTranslation } from '../context/LanguageContext'
import { saveBlob } from '../utils/format'

export function useDownload() {
  const { t } = useTranslation()
  const toast = useToast()
  const [downloadingId, setDownloadingId] = useState(null)

  const download = useCallback(
    async (id, loader) => {
      setDownloadingId(id)
      try {
        const { blob, fileName } = await loader()
        saveBlob(blob, fileName)
        toast.success(t('books.downloadStarted'))
      } catch (error) {
        toast.error(t(error?.status === 404 ? 'books.downloadUnavailable' : 'error.downloadFailed'))
      } finally {
        setDownloadingId(null)
      }
    },
    [t, toast],
  )

  return { download, downloadingId }
}
