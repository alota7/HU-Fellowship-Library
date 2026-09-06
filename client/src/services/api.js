import axios from 'axios'
import { API_BASE_URL, TOKEN_STORAGE_KEY, USE_MOCK_API } from './config'
import { toApiError } from './apiError'
import { mockRequest } from './mock/mockApi'

const http = axios.create({ baseURL: API_BASE_URL, timeout: 20000 })

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Storage unavailable: the session lives for this page load only.
  }
}

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function containsFile(data) {
  return Boolean(data) && Object.values(data).some((value) => value instanceof File)
}

function toFormData(data) {
  const form = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    form.append(key, value)
  })
  return form
}

async function request({ method, url, data, params, responseType, onUploadProgress }) {
  try {
    if (USE_MOCK_API) {
      if (onUploadProgress) onUploadProgress({ loaded: 0, total: 100, percent: 0 })
      const result = await mockRequest({ method, url, data, params, token: getToken() })
      if (onUploadProgress) onUploadProgress({ loaded: 100, total: 100, percent: 100 })
      return result
    }

    const payload = containsFile(data) ? toFormData(data) : data
    const response = await http.request({
      method,
      url,
      data: payload,
      params,
      responseType,
      onUploadProgress: onUploadProgress
        ? (event) => {
            const total = event.total || 0
            onUploadProgress({
              loaded: event.loaded,
              total,
              percent: total ? Math.round((event.loaded / total) * 100) : 0,
            })
          }
        : undefined,
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

const api = {
  get: (url, options = {}) => request({ method: 'GET', url, ...options }),
  post: (url, data, options = {}) => request({ method: 'POST', url, data, ...options }),
  put: (url, data, options = {}) => request({ method: 'PUT', url, data, ...options }),
  patch: (url, data, options = {}) => request({ method: 'PATCH', url, data, ...options }),
  delete: (url, options = {}) => request({ method: 'DELETE', url, ...options }),

  // Downloads resolve to a Blob in both mock and API mode.
  download: async (url, fallbackName) => {
    const result = await request({ method: 'GET', url, responseType: 'blob' })
    if (result instanceof Blob) return { blob: result, fileName: fallbackName }
    return { blob: result.blob, fileName: result.fileName || fallbackName }
  },
}

export default api
