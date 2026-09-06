import en from './en'
import am from './am'

export const DEFAULT_LANGUAGE = 'en'

export const dictionaries = { en, am }

export const languages = [
  { code: 'en', label: en.languageName },
  { code: 'am', label: am.languageName },
]

export function isSupportedLanguage(code) {
  return Object.prototype.hasOwnProperty.call(dictionaries, code)
}

export function translate(language, key, values) {
  const dictionary = dictionaries[language] || dictionaries[DEFAULT_LANGUAGE]
  const fallback = dictionaries[DEFAULT_LANGUAGE]
  const template = dictionary[key] ?? fallback[key] ?? key

  if (!values) return template

  return Object.keys(values).reduce(
    (text, name) => text.replaceAll(`{${name}}`, String(values[name])),
    template,
  )
}
