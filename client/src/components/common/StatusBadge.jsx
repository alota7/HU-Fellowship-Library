import Badge from './Badge'
import { useTranslation } from '../../context/LanguageContext'

const TONES = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  borrowed: 'info',
  returned: 'neutral',
  overdue: 'danger',
  active: 'success',
  inactive: 'neutral',
  available: 'success',
  unavailable: 'danger',
  verified: 'success',
  unverified: 'warning',
}

export default function StatusBadge({ status }) {
  const { t } = useTranslation()
  if (!status) return null
  return <Badge tone={TONES[status] || 'neutral'}>{t(`status.${status}`)}</Badge>
}
