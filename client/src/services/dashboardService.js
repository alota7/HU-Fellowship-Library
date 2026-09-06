import api from './api'

const dashboardService = {
  getMemberDashboard() {
    return api.get('/dashboard/member')
  },

  getAdminDashboard() {
    return api.get('/dashboard/admin')
  },
}

export default dashboardService
