import PageHeader from '../../components/common/PageHeader'
import LanguageSelector from '../../components/common/LanguageSelector'
import Badge from '../../components/common/Badge'
import { useTranslation } from '../../context/LanguageContext'
import { API_BASE_URL, USE_MOCK_API } from '../../services/config'

export default function AdminSettings() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <section className="card space-y-3 p-6">
        <h2 className="text-base font-semibold text-slate-900">{t('settings.languageSection')}</h2>
        <LanguageSelector />
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="text-base font-semibold text-slate-900">{t('settings.apiSection')}</h2>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('settings.apiBaseUrl')}
          </p>
          <p className="font-mono text-sm text-slate-800">{API_BASE_URL}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('settings.mockMode')}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone={USE_MOCK_API ? 'warning' : 'success'}>
              {t(USE_MOCK_API ? 'ui.yes' : 'ui.no')}
            </Badge>
            <span className="text-sm text-slate-600">
              {t(USE_MOCK_API ? 'settings.mockOn' : 'settings.mockOff')}
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
