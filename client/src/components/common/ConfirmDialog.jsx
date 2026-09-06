import Modal from './Modal'
import Button from './Button'
import { useTranslation } from '../../context/LanguageContext'

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
  children,
}) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      title={title}
      onClose={loading ? () => {} : onCancel}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {t('action.cancel')}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            loading={loading}
            loadingLabel={t('status.processing')}
          >
            {confirmLabel || t('action.confirm')}
          </Button>
        </>
      }
    >
      {description && <p className="text-sm text-slate-600">{description}</p>}
      {children}
    </Modal>
  )
}
