import AppShell from './AppShell'

const items = [
  { to: '/member/dashboard', labelKey: 'nav.dashboard', icon: '🏠' },
  { to: '/books', labelKey: 'nav.books', icon: '📚' },
  { to: '/summer-bible-study-notes', labelKey: 'nav.summerNotes', icon: '📖' },
  { to: '/member/personal-study-notes', labelKey: 'nav.personalNotes', icon: '📝' },
  { to: '/member/borrowings', labelKey: 'nav.myBorrowings', icon: '🔖' },
  { to: '/member/history', labelKey: 'nav.history', icon: '🕘' },
  { to: '/member/profile', labelKey: 'nav.profile', icon: '👤' },
]

export default function MemberLayout() {
  return <AppShell items={items} areaLabel="nav.memberArea" />
}
