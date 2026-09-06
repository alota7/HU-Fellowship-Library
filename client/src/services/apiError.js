export class ApiError extends Error {
  constructor({ status = 0, messageKey = 'error.generic', fieldErrors = null, details = null }) {
    super(messageKey)
    this.name = 'ApiError'
    this.status = status
    this.messageKey = messageKey
    this.fieldErrors = fieldErrors
    this.details = details
  }
}

const STATUS_MESSAGE_KEYS = {
  400: 'error.badRequest',
  401: 'error.unauthorized',
  403: 'error.forbidden',
  404: 'error.notFound',
  409: 'error.conflict',
  422: 'error.validation',
  429: 'error.tooManyRequests',
  500: 'error.server',
  502: 'error.server',
  503: 'error.server',
  504: 'error.server',
}

export function messageKeyForStatus(status) {
  if (!status) return 'error.network'
  if (STATUS_MESSAGE_KEYS[status]) return STATUS_MESSAGE_KEYS[status]
  if (status >= 500) return 'error.server'
  return 'error.generic'
}

// Technical transport errors never reach the UI; only translation keys do.
export function toApiError(error) {
  if (error instanceof ApiError) return error

  const status = error?.response?.status ?? 0
  const payload = error?.response?.data

  return new ApiError({
    status,
    messageKey: messageKeyForStatus(status),
    fieldErrors: payload?.errors ?? null,
    details: payload ?? null,
  })
}
