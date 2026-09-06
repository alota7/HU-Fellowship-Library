import { Navigate, Route, Routes } from 'react-router-dom'

import PublicLayout from './components/layout/PublicLayout'
import AuthLayout from './components/layout/AuthLayout'
import MemberLayout from './components/layout/MemberLayout'
import AdminLayout from './components/layout/AdminLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoute from './routes/AdminRoute'

import Home from './pages/public/Home'
import Books from './pages/public/Books'
import BookDetails from './pages/public/BookDetails'
import SummerBibleStudyNotes from './pages/public/SummerBibleStudyNotes'
import NotFound from './pages/public/NotFound'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import VerifyEmail from './pages/auth/VerifyEmail'
import ResendVerification from './pages/auth/ResendVerification'

import MemberDashboard from './pages/member/Dashboard'
import MemberBorrowings from './pages/member/Borrowings'
import MemberHistory from './pages/member/History'
import MemberProfile from './pages/member/Profile'
import MemberPersonalStudyNotes from './pages/member/PersonalStudyNotes'

import AdminDashboard from './pages/admin/Dashboard'
import AdminBooks from './pages/admin/Books'
import AdminCategories from './pages/admin/Categories'
import AdminMembers from './pages/admin/Members'
import AdminRequests from './pages/admin/Requests'
import AdminBorrowings from './pages/admin/Borrowings'
import AdminSummerStudyNotes from './pages/admin/SummerStudyNotes'
import AdminPersonalStudyNotes from './pages/admin/PersonalStudyNotes'
import AdminReports from './pages/admin/Reports'
import AdminSettings from './pages/admin/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="books" element={<Books />} />
        <Route path="books/:id" element={<BookDetails />} />
        <Route path="summer-bible-study-notes" element={<SummerBibleStudyNotes />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="resend-verification" element={<ResendVerification />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="member" element={<MemberLayout />}>
          <Route index element={<Navigate to="/member/dashboard" replace />} />
          <Route path="dashboard" element={<MemberDashboard />} />
          <Route path="borrowings" element={<MemberBorrowings />} />
          <Route path="history" element={<MemberHistory />} />
          <Route path="profile" element={<MemberProfile />} />
          <Route path="personal-study-notes" element={<MemberPersonalStudyNotes />} />
        </Route>
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="books" element={<AdminBooks />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="borrowings" element={<AdminBorrowings />} />
          <Route path="summer-study-notes" element={<AdminSummerStudyNotes />} />
          <Route path="personal-study-notes" element={<AdminPersonalStudyNotes />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
