import { Link } from 'react-router-dom'
import Button from '../../components/common/Button'
import { useTranslation } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'

const sections = [
  { icon: '📚', titleKey: 'home.browseBooksTitle', textKey: 'home.browseBooksText', to: '/books' },
  {
    icon: '📖',
    titleKey: 'home.summerNotesTitle',
    textKey: 'home.summerNotesText',
    to: '/summer-bible-study-notes',
  },
  { icon: '📝', titleKey: 'home.personalNotesTitle', textKey: 'home.personalNotesText' },
  { icon: '🔖', titleKey: 'home.borrowTitle', textKey: 'home.borrowText' },
  { icon: '⬇️', titleKey: 'home.digitalTitle', textKey: 'home.digitalText' },
]

export default function Home() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-800 to-brand-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{t('home.heroTitle')}</h1>
            <p className="mt-4 text-base text-brand-100 sm:text-lg">{t('home.heroSubtitle')}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/books">
                <Button size="lg" className="w-full sm:w-auto">
                  {t('home.heroPrimary')}
                </Button>
              </Link>
              <Link to="/summer-bible-study-notes">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  {t('home.heroSecondary')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <figure className="card border-brand-100 bg-brand-50 p-6">
          <figcaption className="text-sm font-semibold uppercase tracking-wide text-brand-800">
            {t('home.verseTitle')}
          </figcaption>
          <blockquote className="mt-2 text-base italic text-slate-700">
            “{t('home.verse')}”
          </blockquote>
          <p className="mt-2 text-sm font-semibold text-slate-700">{t('home.verseReference')}</p>
        </figure>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {t('home.sectionsTitle')}
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const body = (
              <>
                <span aria-hidden="true" className="text-2xl">
                  {section.icon}
                </span>
                <h3 className="mt-3 text-base font-semibold text-slate-900">
                  {t(section.titleKey)}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{t(section.textKey)}</p>
              </>
            )
            return section.to ? (
              <Link
                key={section.titleKey}
                to={section.to}
                className="card p-6 transition-shadow hover:shadow-md"
              >
                {body}
              </Link>
            ) : (
              <div key={section.titleKey} className="card p-6">
                {body}
              </div>
            )
          })}
        </div>
      </section>

      {!isAuthenticated && (
        <section className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{t('home.ctaTitle')}</h2>
              <p className="mt-1 text-sm text-slate-600">{t('home.ctaText')}</p>
            </div>
            <div className="flex gap-3">
              <Link to="/register">
                <Button>{t('nav.register')}</Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary">{t('nav.login')}</Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
