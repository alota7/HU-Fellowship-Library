import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import { Textarea } from './Input'
import { useTranslation } from '../../context/LanguageContext'

export default function RejectDialog({ open, title, loading, onConfirm, onCancel }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)

  function handleConfirm() {
    if (!reason.trim()) {
      setError('validation.required')
      return
    }
    onConfirm(reason.trim())
  }

  function handleCancel() {
    setReason('')
    setError(null)
    onCancel()
  }

  return (
    <Modal
      open={open}
      title={title}
      size="sm"
      onClose={loading ? () => {} : handleCancel}
      footer={
        <>
          <Button variant="ghost" onClick={handleCancel} disabled={loading}>
            {t('action.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={loading}
            loadingLabel={t('status.processing')}
          >
            {t('action.reject')}
          </Button>
        </>
      }
    >
      <Textarea
        label={t('notes.rejectionReason')}
        required
        value={reason}
        error={error}
        onChange={(event) => {
          setReason(event.target.value)
          setError(null)
        }}
      />
    </Modal>
  )
}
