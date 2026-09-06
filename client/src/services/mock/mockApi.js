import { ApiError } from '../apiError'
import { MOCK_ADMIN_EMAIL } from '../config'
import { db, persist, readFile, saveFile, saveImage, uid } from './mockDb'

const LATENCY = 250
const LOAN_DAYS = 14

const delay = () => new Promise((resolve) => setTimeout(resolve, LATENCY))

function fail(status, messageKey) {
  throw new ApiError({ status, messageKey })
}

async function digest(value) {
  const bytes = new TextEncoder().encode(`hufl::${value}`)
  const hash = await window.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function publicUser(user) {
  if (!user) return null
  const { passwordDigest: _passwordDigest, ...rest } = user
  return rest
}

function currentUser(token) {
  const state = db()
  const userId = token ? state.sessions[token] : null
  return state.users.find((user) => user.id === userId) || null
}

function requireUser(token) {
  const user = currentUser(token)
  if (!user) fail(401, 'error.unauthorized')
  return user
}

function requireAdmin(token) {
  const user = requireUser(token)
  if (user.role !== 'admin') fail(403, 'error.forbidden')
  return user
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result.toISOString()
}

function decorateBorrowing(borrowing) {
  const state = db()
  const book = state.books.find((item) => item.id === borrowing.bookId)
  const member = state.users.find((item) => item.id === borrowing.userId)
  const overdue =
    borrowing.status === 'borrowed' && borrowing.dueDate && new Date(borrowing.dueDate) < new Date()

  return {
    ...borrowing,
    status: overdue ? 'overdue' : borrowing.status,
    bookTitle: book?.title || '',
    bookAuthor: book?.author || '',
    memberName: member?.fullName || borrowing.name,
    memberEmail: member?.email || '',
  }
}

function decorateNote(note) {
  const state = db()
  const owner = state.users.find((item) => item.id === note.userId)
  return { ...note, uploaderName: owner?.fullName || '', uploaderEmail: owner?.email || '' }
}

async function toStoredBook(payload, existing) {
  const cover = payload.coverFile ? await saveImage(payload.coverFile) : null
  const file = payload.digitalFile ? saveFile(payload.digitalFile) : null
  const quantity = payload.bookType === 'hardcopy' ? Number(payload.quantity || 0) : 0
  const availableQuantity =
    payload.bookType === 'hardcopy'
      ? Math.min(Number(payload.availableQuantity ?? quantity), quantity)
      : 0

  return {
    id: existing?.id || uid('book'),
    title: payload.title.trim(),
    author: payload.author.trim(),
    isbn: payload.isbn?.trim() || '',
    categoryId: payload.categoryId,
    category:
      db().categories.find((category) => category.id === payload.categoryId)?.name || '',
    bookType: payload.bookType,
    description: payload.description.trim(),
    publisher: payload.publisher?.trim() || '',
    publicationYear: payload.publicationYear ? Number(payload.publicationYear) : null,
    location: payload.location?.trim() || '',
    quantity,
    availableQuantity,
    coverImage: cover?.url || existing?.coverImage || '',
    fileUrl: file?.url || existing?.fileUrl || '',
    fileName: file?.name || existing?.fileName || '',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

async function toStoredNote(payload, existing, extra = {}) {
  const file = payload.file ? saveFile(payload.file) : null
  return {
    id: existing?.id || uid('note'),
    title: payload.title.trim(),
    description: payload.description.trim(),
    fileUrl: file?.url || existing?.fileUrl || '',
    fileName: file?.name || existing?.fileName || '',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...extra,
  }
}

const routes = [
  // ---------------------------------------------------------------- auth
  {
    method: 'POST',
    pattern: /^\/auth\/register$/,
    handler: async ({ data }) => {
      const state = db()
      const email = data.email.trim().toLowerCase()
      if (state.users.some((user) => user.email === email)) fail(409, 'error.conflict')

      const user = {
        id: uid('user'),
        fullName: data.fullName.trim(),
        email,
        phone: data.phone.trim(),
        schoolYear: data.schoolYear.trim(),
        department: data.department.trim(),
        role: MOCK_ADMIN_EMAIL && email === MOCK_ADMIN_EMAIL ? 'admin' : 'member',
        status: 'active',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        passwordDigest: await digest(data.password),
      }

      state.users.push(user)
      state.verificationTokens[uid('verify')] = user.id
      persist()
      return { user: publicUser(user) }
    },
  },
  {
    method: 'POST',
    pattern: /^\/auth\/login$/,
    handler: async ({ data }) => {
      const state = db()
      const email = data.email.trim().toLowerCase()
      const user = state.users.find((item) => item.email === email)
      if (!user || user.passwordDigest !== (await digest(data.password))) {
        fail(401, 'error.loginFailed')
      }
      if (user.status !== 'active') fail(403, 'error.forbidden')

      const token = uid('token')
      state.sessions[token] = user.id
      persist()
      return { token, user: publicUser(user) }
    },
  },
  {
    method: 'POST',
    pattern: /^\/auth\/logout$/,
    handler: async ({ token }) => {
      const state = db()
      delete state.sessions[token]
      persist()
      return { success: true }
    },
  },
  {
    method: 'GET',
    pattern: /^\/auth\/me$/,
    handler: async ({ token }) => ({ user: publicUser(requireUser(token)) }),
  },
  {
    method: 'GET',
    pattern: /^\/auth\/verify-email$/,
    handler: async ({ params }) => {
      const state = db()
      const userId = state.verificationTokens[params?.token]
      if (!userId) fail(404, 'error.notFound')
      const user = state.users.find((item) => item.id === userId)
      if (!user) fail(404, 'error.notFound')
      user.emailVerified = true
      delete state.verificationTokens[params.token]
      persist()
      return { success: true }
    },
  },
  {
    method: 'POST',
    pattern: /^\/auth\/resend-verification$/,
    handler: async () => ({ success: true }),
  },
  {
    method: 'POST',
    pattern: /^\/auth\/forgot-password$/,
    handler: async ({ data }) => {
      const state = db()
      const user = state.users.find((item) => item.email === data.email.trim().toLowerCase())
      if (user) {
        state.resetTokens[uid('reset')] = user.id
        persist()
      }
      return { success: true }
    },
  },
  {
    method: 'POST',
    pattern: /^\/auth\/reset-password$/,
    handler: async ({ data }) => {
      const state = db()
      const userId = state.resetTokens[data.token]
      const user = state.users.find((item) => item.id === userId)
      if (!user) fail(404, 'error.notFound')
      user.passwordDigest = await digest(data.password)
      delete state.resetTokens[data.token]
      persist()
      return { success: true }
    },
  },

  // ------------------------------------------------------------ categories
  {
    method: 'GET',
    pattern: /^\/categories$/,
    handler: async () => {
      const state = db()
      return {
        categories: state.categories.map((category) => ({
          ...category,
          bookCount: state.books.filter((book) => book.categoryId === category.id).length,
        })),
      }
    },
  },
  {
    method: 'POST',
    pattern: /^\/categories$/,
    handler: async ({ token, data }) => {
      requireAdmin(token)
      const state = db()
      const name = data.name.trim()
      if (state.categories.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
        fail(409, 'error.conflict')
      }
      const category = { id: uid('cat'), name, description: data.description?.trim() || '' }
      state.categories.push(category)
      persist()
      return { category }
    },
  },
  {
    method: 'PUT',
    pattern: /^\/categories\/([^/]+)$/,
    handler: async ({ token, data, match }) => {
      requireAdmin(token)
      const state = db()
      const category = state.categories.find((item) => item.id === match[1])
      if (!category) fail(404, 'error.notFound')
      category.name = data.name.trim()
      category.description = data.description?.trim() || ''
      state.books
        .filter((book) => book.categoryId === category.id)
        .forEach((book) => {
          book.category = category.name
        })
      persist()
      return { category }
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/categories\/([^/]+)$/,
    handler: async ({ token, match }) => {
      requireAdmin(token)
      const state = db()
      state.categories = state.categories.filter((item) => item.id !== match[1])
      persist()
      return { success: true }
    },
  },

  // ----------------------------------------------------------------- books
  {
    method: 'GET',
    pattern: /^\/books$/,
    handler: async () => ({ books: db().books }),
  },
  {
    method: 'GET',
    pattern: /^\/books\/([^/]+)\/download$/,
    handler: async ({ match }) => {
      const book = db().books.find((item) => item.id === match[1])
      if (!book || !book.fileUrl) fail(404, 'error.notFound')
      const file = readFile(book.fileUrl)
      if (!file) fail(404, 'error.notFound')
      return { blob: file, fileName: book.fileName || `${book.title}.pdf` }
    },
  },
  {
    method: 'GET',
    pattern: /^\/books\/([^/]+)$/,
    handler: async ({ match }) => {
      const book = db().books.find((item) => item.id === match[1])
      if (!book) fail(404, 'error.notFound')
      return { book }
    },
  },
  {
    method: 'POST',
    pattern: /^\/books$/,
    handler: async ({ token, data }) => {
      requireAdmin(token)
      const state = db()
      const book = await toStoredBook(data)
      state.books.unshift(book)
      persist()
      return { book }
    },
  },
  {
    method: 'PUT',
    pattern: /^\/books\/([^/]+)$/,
    handler: async ({ token, data, match }) => {
      requireAdmin(token)
      const state = db()
      const index = state.books.findIndex((item) => item.id === match[1])
      if (index === -1) fail(404, 'error.notFound')
      const book = await toStoredBook(data, state.books[index])
      state.books[index] = book
      persist()
      return { book }
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/books\/([^/]+)$/,
    handler: async ({ token, match }) => {
      requireAdmin(token)
      const state = db()
      state.books = state.books.filter((item) => item.id !== match[1])
      persist()
      return { success: true }
    },
  },

  // ------------------------------------------------------------ borrowings
  {
    method: 'GET',
    pattern: /^\/borrowings\/me$/,
    handler: async ({ token }) => {
      const user = requireUser(token)
      return {
        borrowings: db()
          .borrowings.filter((item) => item.userId === user.id)
          .map(decorateBorrowing),
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/borrowings$/,
    handler: async ({ token }) => {
      requireAdmin(token)
      return { borrowings: db().borrowings.map(decorateBorrowing) }
    },
  },
  {
    method: 'POST',
    pattern: /^\/borrowings$/,
    handler: async ({ token, data }) => {
      const user = requireUser(token)
      const state = db()
      const book = state.books.find((item) => item.id === data.bookId)
      if (!book) fail(404, 'error.notFound')
      if (book.bookType !== 'hardcopy' || book.availableQuantity < 1) fail(409, 'error.conflict')

      const borrowing = {
        id: uid('borrow'),
        bookId: book.id,
        userId: user.id,
        name: data.name.trim(),
        phone: data.phone.trim(),
        schoolYear: data.schoolYear.trim(),
        department: data.department.trim(),
        status: 'pending',
        requestedAt: new Date().toISOString(),
        borrowedAt: null,
        dueDate: null,
        returnedAt: null,
        rejectionReason: '',
        returnRequested: false,
      }
      state.borrowings.unshift(borrowing)
      persist()
      return { borrowing: decorateBorrowing(borrowing) }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/borrowings\/([^/]+)\/approve$/,
    handler: async ({ token, match }) => {
      requireAdmin(token)
      const state = db()
      const borrowing = state.borrowings.find((item) => item.id === match[1])
      if (!borrowing) fail(404, 'error.notFound')
      const book = state.books.find((item) => item.id === borrowing.bookId)
      if (!book || book.availableQuantity < 1) fail(409, 'error.conflict')

      book.availableQuantity -= 1
      borrowing.status = 'borrowed'
      borrowing.borrowedAt = new Date().toISOString()
      borrowing.dueDate = addDays(new Date(), LOAN_DAYS)
      persist()
      return { borrowing: decorateBorrowing(borrowing) }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/borrowings\/([^/]+)\/reject$/,
    handler: async ({ token, data, match }) => {
      requireAdmin(token)
      const state = db()
      const borrowing = state.borrowings.find((item) => item.id === match[1])
      if (!borrowing) fail(404, 'error.notFound')
      borrowing.status = 'rejected'
      borrowing.rejectionReason = data?.reason?.trim() || ''
      persist()
      return { borrowing: decorateBorrowing(borrowing) }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/borrowings\/([^/]+)\/request-return$/,
    handler: async ({ token, match }) => {
      const user = requireUser(token)
      const state = db()
      const borrowing = state.borrowings.find(
        (item) => item.id === match[1] && item.userId === user.id,
      )
      if (!borrowing) fail(404, 'error.notFound')
      borrowing.returnRequested = true
      persist()
      return { borrowing: decorateBorrowing(borrowing) }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/borrowings\/([^/]+)\/return$/,
    handler: async ({ token, match }) => {
      requireAdmin(token)
      const state = db()
      const borrowing = state.borrowings.find((item) => item.id === match[1])
      if (!borrowing) fail(404, 'error.notFound')
      const book = state.books.find((item) => item.id === borrowing.bookId)
      if (book) book.availableQuantity = Math.min(book.quantity, book.availableQuantity + 1)
      borrowing.status = 'returned'
      borrowing.returnedAt = new Date().toISOString()
      borrowing.returnRequested = false
      persist()
      return { borrowing: decorateBorrowing(borrowing) }
    },
  },

  // ----------------------------------------------------------- study notes
  {
    method: 'GET',
    pattern: /^\/study-notes\/summer\/([^/]+)\/download$/,
    handler: async ({ match }) => {
      const note = db().summerNotes.find((item) => item.id === match[1])
      const file = note && readFile(note.fileUrl)
      if (!file) fail(404, 'error.notFound')
      return { blob: file, fileName: note.fileName || `${note.title}.pdf` }
    },
  },
  {
    method: 'GET',
    pattern: /^\/study-notes\/summer$/,
    handler: async () => ({ notes: db().summerNotes }),
  },
  {
    method: 'POST',
    pattern: /^\/study-notes\/summer$/,
    handler: async ({ token, data }) => {
      requireAdmin(token)
      const state = db()
      const note = await toStoredNote(data)
      state.summerNotes.unshift(note)
      persist()
      return { note }
    },
  },
  {
    method: 'PUT',
    pattern: /^\/study-notes\/summer\/([^/]+)$/,
    handler: async ({ token, data, match }) => {
      requireAdmin(token)
      const state = db()
      const index = state.summerNotes.findIndex((item) => item.id === match[1])
      if (index === -1) fail(404, 'error.notFound')
      state.summerNotes[index] = await toStoredNote(data, state.summerNotes[index])
      persist()
      return { note: state.summerNotes[index] }
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/study-notes\/summer\/([^/]+)$/,
    handler: async ({ token, match }) => {
      requireAdmin(token)
      const state = db()
      state.summerNotes = state.summerNotes.filter((item) => item.id !== match[1])
      persist()
      return { success: true }
    },
  },
  {
    method: 'GET',
    pattern: /^\/study-notes\/personal\/([^/]+)\/download$/,
    handler: async ({ token, match }) => {
      requireUser(token)
      const note = db().personalNotes.find((item) => item.id === match[1])
      const file = note && readFile(note.fileUrl)
      if (!file) fail(404, 'error.notFound')
      return { blob: file, fileName: note.fileName || `${note.title}.pdf` }
    },
  },
  {
    method: 'GET',
    pattern: /^\/study-notes\/personal\/me$/,
    handler: async ({ token }) => {
      const user = requireUser(token)
      return {
        notes: db()
          .personalNotes.filter((item) => item.userId === user.id)
          .map(decorateNote),
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/study-notes\/personal$/,
    handler: async ({ token }) => {
      requireAdmin(token)
      return { notes: db().personalNotes.map(decorateNote) }
    },
  },
  {
    method: 'POST',
    pattern: /^\/study-notes\/personal$/,
    handler: async ({ token, data }) => {
      const user = requireUser(token)
      const state = db()
      const note = await toStoredNote(data, null, {
        userId: user.id,
        status: 'pending',
        rejectionReason: '',
      })
      state.personalNotes.unshift(note)
      persist()
      return { note: decorateNote(note) }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/study-notes\/personal\/([^/]+)\/approve$/,
    handler: async ({ token, match }) => {
      requireAdmin(token)
      const state = db()
      const note = state.personalNotes.find((item) => item.id === match[1])
      if (!note) fail(404, 'error.notFound')
      note.status = 'approved'
      note.rejectionReason = ''
      persist()
      return { note: decorateNote(note) }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/study-notes\/personal\/([^/]+)\/reject$/,
    handler: async ({ token, data, match }) => {
      requireAdmin(token)
      const state = db()
      const note = state.personalNotes.find((item) => item.id === match[1])
      if (!note) fail(404, 'error.notFound')
      note.status = 'rejected'
      note.rejectionReason = data?.reason?.trim() || ''
      persist()
      return { note: decorateNote(note) }
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/study-notes\/personal\/([^/]+)$/,
    handler: async ({ token, match }) => {
      const user = requireUser(token)
      const state = db()
      const note = state.personalNotes.find((item) => item.id === match[1])
      if (!note) fail(404, 'error.notFound')
      if (user.role !== 'admin' && note.userId !== user.id) fail(403, 'error.forbidden')
      state.personalNotes = state.personalNotes.filter((item) => item.id !== note.id)
      persist()
      return { success: true }
    },
  },

  // ----------------------------------------------------------------- users
  {
    method: 'GET',
    pattern: /^\/users$/,
    handler: async ({ token }) => {
      requireAdmin(token)
      return { users: db().users.map(publicUser) }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/users\/me$/,
    handler: async ({ token, data }) => {
      const user = requireUser(token)
      const editable = ['fullName', 'phone', 'schoolYear', 'department']
      editable.forEach((field) => {
        if (typeof data[field] === 'string') user[field] = data[field].trim()
      })
      persist()
      return { user: publicUser(user) }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/users\/([^/]+)\/status$/,
    handler: async ({ token, data, match }) => {
      requireAdmin(token)
      const state = db()
      const user = state.users.find((item) => item.id === match[1])
      if (!user) fail(404, 'error.notFound')
      user.status = data.status === 'inactive' ? 'inactive' : 'active'
      persist()
      return { user: publicUser(user) }
    },
  },

  // ------------------------------------------------------------- dashboard
  {
    method: 'GET',
    pattern: /^\/dashboard\/member$/,
    handler: async ({ token }) => {
      const user = requireUser(token)
      const state = db()
      const mine = state.borrowings.filter((item) => item.userId === user.id)
      return {
        stats: {
          availableBooks: state.books.filter(
            (book) => book.bookType === 'softcopy' || book.availableQuantity > 0,
          ).length,
          myBorrowings: mine.filter((item) => item.status === 'borrowed').length,
          pendingRequests: mine.filter((item) => item.status === 'pending').length,
          studyNotes: state.summerNotes.length,
          personalNotes: state.personalNotes.filter((item) => item.userId === user.id).length,
        },
        recentActivity: mine.slice(0, 5).map(decorateBorrowing),
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/dashboard\/admin$/,
    handler: async ({ token }) => {
      requireAdmin(token)
      const state = db()
      return {
        stats: {
          totalBooks: state.books.length,
          availableBooks: state.books.filter(
            (book) => book.bookType === 'softcopy' || book.availableQuantity > 0,
          ).length,
          borrowedBooks: state.borrowings.filter((item) => item.status === 'borrowed').length,
          pendingRequests: state.borrowings.filter((item) => item.status === 'pending').length,
          totalMembers: state.users.filter((user) => user.role === 'member').length,
          studyNotes: state.summerNotes.length,
          pendingPersonalNotes: state.personalNotes.filter((item) => item.status === 'pending')
            .length,
        },
        recentActivity: state.borrowings.slice(0, 5).map(decorateBorrowing),
      }
    },
  },
]

export async function mockRequest({ method, url, data, params, token }) {
  await delay()
  const route = routes.find((item) => item.method === method && item.pattern.test(url))
  if (!route) fail(404, 'error.notFound')
  const match = url.match(route.pattern)
  return route.handler({ data, params, token, match })
}
