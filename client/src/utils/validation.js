export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const DOCUMENT_TYPES = ['application/pdf', 'application/epub+zip']
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024
export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024

export function required(value) {
  if (value === null || value === undefined) return 'validation.required'
  if (typeof value === 'string' && !value.trim()) return 'validation.required'
  if (typeof value === 'boolean' && !value) return 'validation.required'
  return null
}

export function email(value) {
  if (!value) return null
  return EMAIL_PATTERN.test(value.trim()) ? null : 'validation.email'
}

export function minPassword(value) {
  if (!value) return null
  return value.length >= 8 ? null : 'validation.passwordLength'
}

export function matches(value, other) {
  if (!value) return null
  return value === other ? null : 'validation.passwordMatch'
}

export function numeric(value) {
  if (value === '' || value === null || value === undefined) return null
  return Number.isFinite(Number(value)) ? null : 'validation.number'
}

export function validateFile(file, { types, maxSize }) {
  if (!file) return null
  if (types && !types.includes(file.type)) return 'validation.fileType'
  if (maxSize && file.size > maxSize) return 'validation.fileSize'
  return null
}

export function runValidators(values, rules) {
  const errors = {}
  Object.entries(rules).forEach(([field, validators]) => {
    for (const validator of validators) {
      const error = validator(values[field], values)
      if (error) {
        errors[field] = error
        break
      }
    }
  })
  return errors
}
