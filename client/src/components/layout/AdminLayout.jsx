import AppShell from './AppShell'

const items = [
  { to: '/admin/dashboard', labelKey: 'nav.dashboard', icon: '📊' },
  { to: '/admin/books', labelKey: 'nav.books', icon: '📚' },
  { to: '/admin/categories', labelKey: 'nav.categories', icon: '🏷️' },
  { to: '/admin/members', labelKey: 'nav.members', icon: '👥' },
  { to: '/admin/requests', labelKey: 'nav.requests', icon: '📥' },
  { to: '/admin/borrowings', labelKey: 'nav.borrowings', icon: '🔖' },
  { to: '/admin/summer-study-notes', labelKey: 'nav.summerNotes', icon: '📖' },
  { to: '/admin/personal-study-notes', labelKey: 'nav.personalNotes', icon: '📝' },
  { to: '/admin/reports', labelKey: 'nav.reports', icon: '📈' },
  { to: '/admin/settings', labelKey: 'nav.settings', icon: '⚙️' },
]

export default function AdminLayout() {
  return <AppShell items={items} areaLabel="nav.adminArea" />
}
