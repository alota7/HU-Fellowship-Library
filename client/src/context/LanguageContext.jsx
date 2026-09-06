import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LANGUAGE, isSupportedLanguage, languages, translate } from '../i18n'

const STORAGE_KEY = 'hufl.language'

const LanguageContext = createContext(null)

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored && isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

export function LanguageProvider({ children }) {
  const [preferredLanguage, setPreferredLanguage] = useState(readStoredLanguage)
  // Authentication screens always render in English until the user signs in.
  const [override, setOverride] = useState(null)
  const language = override || preferredLanguage

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, preferredLanguage)
    } catch {
      // Storage is unavailable (private mode); the language stays for this session only.
    }
  }, [preferredLanguage])

  const setLanguage = useCallback((code) => {
    setPreferredLanguage(isSupportedLanguage(code) ? code : DEFAULT_LANGUAGE)
  }, [])

  const t = useCallback((key, values) => translate(language, key, values), [language])

  const value = useMemo(
    () => ({
      language,
      preferredLanguage,
      setLanguage,
      setOverride,
      isOverridden: Boolean(override),
      t,
      languages,
    }),
    [language, preferredLanguage, setLanguage, override, t],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside a LanguageProvider')
  return context
}

export function useTranslation() {
  return useLanguage()
}

export function useEnglishOnly() {
  const { setOverride } = useLanguage()
  useEffect(() => {
    setOverride(DEFAULT_LANGUAGE)
    return () => setOverride(null)
  }, [setOverride])
}
