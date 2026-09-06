import api from './api'

const studyNoteService = {
  async getSummerNotes() {
    const result = await api.get('/study-notes/summer')
    return result.notes || []
  },

  async createSummerNote(data, options) {
    const result = await api.post('/study-notes/summer', data, options)
    return result.note
  },

  async updateSummerNote(id, data, options) {
    const result = await api.put(`/study-notes/summer/${id}`, data, options)
    return result.note
  },

  deleteSummerNote(id) {
    return api.delete(`/study-notes/summer/${id}`)
  },

  downloadSummerNote(note) {
    return api.download(
      `/study-notes/summer/${note.id}/download`,
      note.fileName || `${note.title}.pdf`,
    )
  },

  async getMyPersonalNotes() {
    const result = await api.get('/study-notes/personal/me')
    return result.notes || []
  },

  async getPersonalNotes() {
    const result = await api.get('/study-notes/personal')
    return result.notes || []
  },

  async createPersonalNote(data, options) {
    const result = await api.post('/study-notes/personal', data, options)
    return result.note
  },

  async approvePersonalNote(id) {
    const result = await api.patch(`/study-notes/personal/${id}/approve`)
    return result.note
  },

  async rejectPersonalNote(id, reason) {
    const result = await api.patch(`/study-notes/personal/${id}/reject`, { reason })
    return result.note
  },

  deletePersonalNote(id) {
    return api.delete(`/study-notes/personal/${id}`)
  },

  downloadPersonalNote(note) {
    return api.download(
      `/study-notes/personal/${note.id}/download`,
      note.fileName || `${note.title}.pdf`,
    )
  },
}

export default studyNoteService
