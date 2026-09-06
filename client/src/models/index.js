// Frontend data shapes shared by the services, hooks and components.
// They mirror the payloads the future backend is expected to return.

export const BOOK_TYPES = ['hardcopy', 'softcopy']
export const BORROWING_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'borrowed',
  'returned',
  'overdue',
]
export const NOTE_STATUSES = ['pending', 'approved', 'rejected']
export const USER_ROLES = ['member', 'admin']
export const USER_STATUSES = ['active', 'inactive']

export const emptyUser = {
  id: '',
  fullName: '',
  email: '',
  phone: '',
  schoolYear: '',
  department: '',
  role: 'member',
  status: 'active',
  emailVerified: false,
  createdAt: '',
}

export const emptyBook = {
  id: '',
  title: '',
  author: '',
  isbn: '',
  category: '',
  categoryId: '',
  bookType: 'hardcopy',
  description: '',
  publisher: '',
  publicationYear: '',
  quantity: 1,
  availableQuantity: 1,
  coverImage: '',
  fileUrl: '',
  location: '',
}

export const emptyCategory = { id: '', name: '', description: '' }

export const emptyBorrowing = {
  id: '',
  bookId: '',
  userId: '',
  name: '',
  phone: '',
  schoolYear: '',
  department: '',
  status: 'pending',
  requestedAt: '',
  borrowedAt: '',
  dueDate: '',
  returnedAt: '',
  rejectionReason: '',
}

export const emptyStudyNote = {
  id: '',
  title: '',
  description: '',
  fileUrl: '',
  fileName: '',
  createdAt: '',
}

export const emptyPersonalStudyNote = {
  ...emptyStudyNote,
  userId: '',
  uploaderName: '',
  status: 'pending',
  rejectionReason: '',
}

export const emptyDashboardStats = {
  totalBooks: 0,
  availableBooks: 0,
  borrowedBooks: 0,
  pendingRequests: 0,
  totalMembers: 0,
  studyNotes: 0,
  pendingPersonalNotes: 0,
}

export function isBookAvailable(book) {
  if (!book) return false
  if (book.bookType === 'softcopy') return Boolean(book.fileUrl)
  return Number(book.availableQuantity) > 0
}
