const STORAGE_KEY = 'hufl.mockdb'

// Files selected in the browser are kept in memory for the current session only.
// The future backend is responsible for real storage.
const fileStore = new Map()

const initialState = () => ({
  users: [],
  sessions: {},
  categories: [
    { id: 'cat-summer', name: 'Summer Bible Study Notes', description: '' },
    { id: 'cat-general', name: 'General', description: '' },
  ],
  books: [],
  borrowings: [],
  summerNotes: [],
  personalNotes: [],
  resetTokens: {},
  verificationTokens: {},
})

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    return { ...initialState(), ...JSON.parse(raw) }
  } catch {
    return initialState()
  }
}

let state = load()

export function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded or storage disabled: the mock keeps working in memory.
  }
}

export function db() {
  return state
}

export function resetDb() {
  state = initialState()
  fileStore.clear()
  persist()
}

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function saveFile(file) {
  if (!file) return null
  const id = uid('file')
  fileStore.set(id, file)
  return {
    id,
    url: `mock://files/${id}`,
    name: file.name,
    size: file.size,
    type: file.type,
  }
}

export function readFile(url) {
  if (!url) return null
  const id = String(url).replace('mock://files/', '')
  return fileStore.get(id) || null
}

export async function saveImage(file) {
  const meta = saveFile(file)
  if (!meta) return null
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    return { ...meta, url: dataUrl }
  } catch {
    return meta
  }
}
