import { type ReactNode, createContext, useContext, useEffect, useState, useMemo } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  BookOpen, BookMarked, Bookmark, Calendar, Check, ChevronRight, CircleUserRound, Clock3, Download, Eye, EyeOff,
  FileText, FolderOpen, HelpCircle, Home as HomeIcon, KeyRound, LayoutGrid, Library, Lock, LogOut, Mail, Menu, MessageSquare, Moon, Pencil, Plus, Search, Send, Settings, ShieldCheck, Sparkles, Sun,
  UserRound, Users, X, ArrowLeft, ArrowRight, ArrowUpRight, AlertCircle, LoaderCircle
} from 'lucide-react';
import {
  getGetCurrentUserQueryKey, getGetDashboardSummaryQueryKey, getListBooksQueryKey,
  getListBorrowingRequestsQueryKey, getListBorrowingsQueryKey, getListCategoriesQueryKey,
  getListStudyNotesQueryKey,
  useCreateBook, useCreateBorrowingRequest, useCreateCategory, useCreateStudyNote, useDeleteBook,
  useGetBook, useGetCurrentUser, useGetDashboardSummary, useListBooks, useListBorrowingRequests,
  useListBorrowings, useListCategories, useListStudyNotes, useLogin, useLogout, useRegister, useUpdateBook,
  useApproveBorrowingRequest, useRejectBorrowingRequest, useApproveStudyNote, useRejectStudyNote, useDeleteStudyNote,
  useRequestPasswordReset, useResetPassword,
} from '@workspace/api-client-react';
import type { Book, BorrowingRequest, DashboardSummary, StudyNote, User } from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation, useParams } from 'wouter';
import logoAsset from '@/assets/hu-logo.png';

const queryClient = new QueryClient();
const logo = logoAsset;

type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void; setTheme: (theme: Theme) => void }>({
  theme: 'dark',
  toggleTheme: () => undefined,
  setTheme: () => undefined,
});
const useTheme = () => useContext(ThemeContext);

function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`inline-flex items-center justify-center rounded-xl border border-border/80 bg-card p-2 text-foreground/80 hover:bg-secondary hover:text-foreground transition shadow-sm touch-target ${className}`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      data-testid="button-theme-toggle"
    >
      {theme === 'dark' ? <Sun size={18} className="text-foreground" /> : <Moon size={18} className="text-foreground" />}
    </button>
  );
}

const words: Record<string, string> = {
  dashboard: 'Dashboard', books: 'Books', notes: 'Study notes',
  borrowings: 'My borrowings', profile: 'My profile', categories: 'Categories',
  members: 'Members', requests: 'Requests', settings: 'Settings',
  questions: 'Bible Q&A', adminQuestions: 'Member Questions',
  signOut: 'Sign out', search: 'Search', featured: 'Featured resources',
  browse: 'Browse library', welcome: 'Welcome back',
  overview: 'Overview', newBook: 'Add a book', newCategory: 'Add category',
  pending: 'Pending', available: 'Available', request: 'Request to borrow',
  read: 'Read online', save: 'Save changes',
  membersOnly: 'Members only', library: 'Library',
};
const t = (key: string, _lang?: any) => words[key] ?? key;
const useLang = () => ({ lang: 'en', setLang: () => undefined });

const previewAdmin: User = {
  id: -1,
  name: 'Sample Steward',
  email: 'steward@example.test',
  role: 'admin',
  department: 'HU Fellowship',
  schoolYear: 'Alumni',
  emailVerified: true,
};
const previewMember: User = {
  id: -2,
  name: 'Sample Member',
  email: 'member@example.test',
  role: 'member',
  department: 'Theology',
  schoolYear: '3rd year',
  emailVerified: true,
};
const previewBooks: Book[] = [
  { id: -1, title: 'Knowing God', author: 'J. I. Packer', type: 'hardcopy', category: 'Christian Living', description: 'A sample book for dashboard layout previews.', year: 1973, available: 2, total: 4, featured: true },
  { id: -2, title: 'The Cost of Discipleship', author: 'Dietrich Bonhoeffer', type: 'hardcopy', category: 'Bible Study', description: 'A sample book for dashboard layout previews.', year: 1937, available: 1, total: 3, featured: true },
  { id: -3, title: 'Celebration of Discipline', author: 'Richard J. Foster', type: 'softcopy', category: 'Spiritual Formation', description: 'A sample book for dashboard layout previews.', year: 1978, available: 0, total: 2, featured: true },
  { id: -4, title: 'On the Incarnation', author: 'Athanasius of Alexandria', type: 'softcopy', category: 'Christology', description: 'A foundational theological reflection on Christ becoming man.', year: 400, available: 1, total: 1, featured: true },
];
const previewBorrowingRequests: BorrowingRequest[] = [
  { id: -1, book: previewBooks[0], member: { ...previewMember, id: -3, name: 'Mekdes Alemu', email: 'mekdes@example.test' }, status: 'pending', requestedAt: '2026-11-11T09:30:00.000Z', rejectionReason: null },
  { id: -2, book: previewBooks[1], member: { ...previewMember, id: -4, name: 'Dawit Bekele', email: 'dawit@example.test' }, status: 'pending', requestedAt: '2026-11-10T14:15:00.000Z', rejectionReason: null },
  { id: -3, book: previewBooks[2], member: { ...previewMember, id: -5, name: 'Hana Tesfaye', email: 'hana@example.test' }, status: 'pending', requestedAt: '2026-11-09T08:00:00.000Z', rejectionReason: null },
];
const previewMemberSummary: DashboardSummary = { books: 32, studyNotes: 9, activeBorrowings: 0, pendingRequests: 0 };
const previewAdminSummary: DashboardSummary = { books: 32, studyNotes: 9, activeBorrowings: 7, pendingRequests: 3 };

const Button = ({ children, variant = 'primary', className = '', ...props }: { children: ReactNode; variant?: 'primary' | 'soft' | 'outline' | 'ghost' | 'danger'; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const colors = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    soft: 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground',
    outline: 'border border-border bg-card text-foreground hover:border-primary hover:text-primary',
    ghost: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
    danger: 'border border-destructive/25 text-destructive hover:bg-destructive/10',
  };
  return <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${colors[variant]} ${className}`}>{children}</button>;
};

const Field = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="grid gap-2 text-sm font-semibold text-foreground">{label}<input {...props} className="h-11 w-full cursor-text touch-manipulation rounded-lg border border-input bg-card px-3.5 font-normal outline-none ring-primary/20 placeholder:text-muted-foreground focus-visible:ring-4 focus-visible:ring-primary/20" /></label>
);
const PasswordField = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => {
  const [show, setShow] = useState(false);
  return (
    <label className="grid gap-2 text-sm font-semibold text-foreground">
      {label}
      <div className="relative flex items-center">
        <input
          {...props}
          type={show ? 'text' : 'password'}
          className="h-11 w-full cursor-text touch-manipulation rounded-lg border border-input bg-card pl-3.5 pr-10 font-normal outline-none ring-primary/20 placeholder:text-muted-foreground focus-visible:ring-4 focus-visible:ring-primary/20"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-2 p-1.5 text-muted-foreground hover:text-foreground transition rounded-md"
          tabIndex={-1}
          title={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
};
const TextAreaField = ({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <label className="grid gap-2 text-sm font-semibold text-foreground">{label}<textarea {...props} className="min-h-28 rounded-lg border border-input bg-card px-3.5 py-3 font-normal outline-none ring-primary/20 placeholder:text-muted-foreground focus:ring-4" /></label>
);
type UploadPurpose = 'cover' | 'book' | 'study-note';
async function uploadLibraryFile(file: File, purpose: UploadPurpose) {
  const mimeByExtension: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
    pdf: 'application/pdf', epub: 'application/epub+zip', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain',
  };
  const extension = file.name.toLowerCase().split('.').pop() ?? '';
  const contentType = mimeByExtension[extension] || file.type || 'application/octet-stream';
  const maxCoverSize = 50 * 1024 * 1024;
  if (purpose === 'cover' && file.size > maxCoverSize) throw new Error('Cover images must be 50 MB or smaller.');
  const request = await fetch('/api/storage/uploads/request-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, size: file.size, contentType, purpose }),
  });
  if (!request.ok) throw new Error((await request.json().catch(() => ({}))).error ?? 'Could not prepare the file upload.');
  const { uploadURL, objectPath } = await request.json();
  const uploaded = await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });
  if (!uploaded.ok) throw new Error('The file could not be uploaded. Please try again.');
  return objectPath.startsWith('/api/storage') ? objectPath : `/api/storage${objectPath.startsWith('/') ? '' : '/'}${objectPath}`;
}
const Logo = ({ dark = false }: { dark?: boolean }) => (
  <Link href="/" data-testid="link-brand" className="flex items-center gap-3">
    <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-border bg-black shadow-xs p-1">
      <img src={logo} alt="LOGOS Library" className="block h-full w-full object-contain" />
    </span>
    <span className={`font-serif text-sm font-bold leading-tight ${dark ? 'text-sidebar-foreground' : 'text-foreground'}`}>
      LOGOS<br />
      <span className="font-sans text-[10px] font-medium uppercase tracking-[.2em] opacity-70">Library</span>
    </span>
  </Link>
);
const Status = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
    tone === 'good'
      ? 'bg-neutral-100 text-neutral-900 border border-neutral-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700'
      : tone === 'warn'
        ? 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700'
        : tone === 'bad'
          ? 'bg-neutral-950 text-white dark:bg-white dark:text-black border border-neutral-800 dark:border-neutral-200'
          : 'bg-secondary text-secondary-foreground border border-border'
  }`}>
    {children}
  </span>
);
const Skeleton = ({ className = '' }: { className?: string }) => <div className={`skeleton rounded-lg ${className}`} />;
const EmptyState = ({ icon: Icon = Library, title, detail, action }: { icon?: typeof Library; title: string; detail: string; action?: ReactNode }) => <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 text-center"><span className="mb-4 rounded-full bg-secondary p-4 text-primary"><Icon size={24} /></span><h3 className="font-serif text-lg font-bold">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
const ErrorState = ({ retry }: { retry?: () => void }) => <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive"><div className="flex items-center gap-2 font-semibold"><AlertCircle size={17} />We couldn't load this page.</div>{retry && <Button variant="danger" className="mt-3" onClick={retry} data-testid="button-retry">Try again</Button>}</div>;

function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
      <Logo />
      
      {/* Desktop Navigation */}
      <nav className="hidden items-center gap-4 text-sm font-semibold text-muted-foreground md:flex">
        <a href="#featured" data-testid="link-featured" className="hover:text-foreground transition">Featured</a>
        <a href="#about" data-testid="link-about" className="hover:text-foreground transition">About the library</a>
        {import.meta.env.DEV && (
          <>
            <Link href="/__preview/member" data-testid="link-member-preview" className="hover:text-foreground transition">Member preview</Link>
            <Link href="/__preview/admin" data-testid="link-admin-preview" className="hover:text-foreground transition">Admin preview</Link>
          </>
        )}
        <ThemeToggle />
        <Link href="/login" data-testid="link-sign-in" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow hover:opacity-95 transition touch-target">
          Sign in <ArrowUpRight size={14} />
        </Link>
      </nav>

      {/* Mobile Controls */}
      <div className="flex items-center gap-2 md:hidden">
        <ThemeToggle />
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          className="rounded-xl border border-border/70 p-2 text-foreground hover:bg-secondary touch-target flex items-center justify-center"
          data-testid="button-mobile-nav"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="absolute left-4 right-4 top-16 z-50 rounded-2xl border border-border bg-card p-4 shadow-2xl md:hidden animate-rise">
          <div className="flex flex-col gap-2 text-sm font-semibold">
            <a href="#featured" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-secondary">Featured</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-secondary">About the library</a>
            {import.meta.env.DEV && (
              <>
                <Link href="/__preview/member" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-secondary">Member preview</Link>
                <Link href="/__preview/admin" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-secondary">Admin preview</Link>
              </>
            )}
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-center font-bold text-primary-foreground touch-target">
              Sign in <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function Home() {
  const booksQuery = useListBooks();
  const categoriesQuery = useListCategories();
  const books = Array.isArray(booksQuery.data) ? booksQuery.data : [];

  const popularBooks = useMemo(() => {
    if (!books.length) return [];
    const selected: Book[] = [];
    const seenIds = new Set<number>();

    // 1. First add books marked as featured
    for (const b of books.filter(b => b.featured)) {
      if (!seenIds.has(b.id)) {
        seenIds.add(b.id);
        selected.push(b);
      }
    }
    // 2. Add more books to ensure at least 4-6 diverse books appear
    for (const b of books) {
      if (!seenIds.has(b.id)) {
        seenIds.add(b.id);
        selected.push(b);
      }
      if (selected.length >= 6) break;
    }
    return selected;
  }, [books]);

  return (
    <div className="noise min-h-[100dvh] overflow-x-hidden">
      <PublicNav />
      <main>
        <section className="relative mx-auto grid max-w-7xl gap-8 sm:gap-12 px-4 py-8 sm:px-6 sm:py-16 lg:grid-cols-[1.04fr_.96fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-16">
          <div className="animate-rise">
            <div className="mb-4 sm:mb-7 flex items-center gap-2 text-xs font-bold uppercase tracking-[.22em] text-primary">
              <span className="h-px w-8 bg-primary" />Study. Serve. Share.
            </div>
            <h1 className="max-w-2xl font-serif text-2xl sm:text-4xl lg:text-5xl font-bold leading-[1.12] tracking-tight">
              A quiet place for <span className="text-primary">deep roots.</span>
            </h1>
            <p className="mt-4 sm:mt-7 max-w-xl text-base sm:text-lg leading-7 sm:leading-8 text-muted-foreground">
              The LOGOS Library brings books, Bible-study resources, and a growing community of learners into one welcoming home.
            </p>
            <div className="mt-6 sm:mt-9 flex flex-col sm:flex-row flex-wrap gap-3">
              <Link href="/login" data-testid="link-start-exploring" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/15 touch-target">
                Start exploring <ChevronRight size={17} />
              </Link>
              <a href="#featured" data-testid="link-view-featured" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold touch-target">
                View featured resources
              </a>
            </div>
            <div className="mt-8 sm:mt-12 flex flex-wrap items-center gap-4 sm:gap-8 border-t border-border pt-6">
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-primary">{booksQuery.isLoading ? '—' : books.length}</div>
                <div className="text-xs text-muted-foreground">books in collection</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-primary">{categoriesQuery.isLoading ? '—' : (categoriesQuery.data?.length ?? 0)}</div>
                <div className="text-xs text-muted-foreground">categories to explore</div>
              </div>
            </div>
          </div>

          <div className="paper-grid relative mx-auto w-full max-w-lg animate-rise stagger-1">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative rounded-2xl sm:rounded-[2rem] border border-primary/15 bg-secondary/45 p-3.5 sm:p-5 shadow-2xl shadow-primary/10">
              <div className="rounded-xl sm:rounded-[1.5rem] bg-sidebar p-5 sm:p-8 text-sidebar-foreground">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.2em] text-sidebar-primary">
                  <span>HU / 01</span>
                  <span>Est. 2004</span>
                </div>
                <div className="mt-8 sm:mt-16 max-w-xs font-serif text-2xl sm:text-3xl font-bold leading-tight">
                  “Study to show yourself approved.”
                </div>
                <div className="mt-2.5 sm:mt-3 font-mono text-[10px] uppercase tracking-widest text-sidebar-primary">
                  2 Timothy 2:15
                </div>
                <div className="mt-8 sm:mt-12 flex items-end justify-between">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center overflow-hidden rounded-xl border border-sidebar-border bg-black p-1">
                    <img src={logo} alt="" className="block h-full w-full object-contain" />
                  </div>
                  <div className="text-right text-xs text-sidebar-foreground/50">LOGOS<br />Library</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="featured" className="border-y border-border bg-card/40 dark:bg-[#0d0e11] px-4 py-12 sm:px-6 sm:py-20 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[.2em] text-muted-foreground">From the shelves</div>
                <h2 className="mt-1 font-serif text-xl sm:text-2xl font-bold text-foreground">Popular books</h2>
              </div>
              <Link href="/login" data-testid="link-browse-all" className="text-xs sm:text-sm font-semibold text-foreground hover:underline transition flex items-center gap-1">
                Browse the whole library <ArrowUpRight size={15} className="ml-1 inline" />
              </Link>
            </div>
            {booksQuery.isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3.5 md:gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 sm:h-72 rounded-2xl bg-neutral-900/10 dark:bg-neutral-900" />)}
              </div>
            ) : popularBooks.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3.5 md:gap-4">
                {popularBooks.map(book => <ModernBookCard key={book.id} book={book} publicCard />)}
              </div>
            ) : (
              <div className="mt-10"><EmptyState icon={BookOpen} title="The shelves are being prepared" detail="Featured resources will appear here as the collection grows." /></div>
            )}
          </div>
        </section>

        <section id="about" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-10">
          <div className="mb-8 max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-[.2em] text-accent">About the library</div>
            <h2 className="mt-2 font-serif text-xl sm:text-2xl lg:text-3xl font-bold leading-snug">Welcome to LOGOS Library</h2>
            <p className="mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-muted-foreground">
              Rooted in biblical study, theology, and discipleship, LOGOS Library serves university students, leaders, and fellowship members. Explore physical hardcopies available to borrow, softcopy theological classics available for immediate reading and download, peer study notes, and an active Bible Q&A community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-border/80">
            <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <BookOpen size={20} />
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground">Curated Library Shelves</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Spanning biblical commentaries, Christology, Christian living, biographies, and theology in both physical loans and softcopy formats.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <FileText size={20} />
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground">Notes & Summer Studies</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Access sermon notes, summer study guides, research outlines, and fellowship group study materials shared by members and leaders.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <HelpCircle size={20} />
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground">Fellowship Bible Q&A</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                A shared, moderated space to ask thoughtful biblical questions, find biblically grounded answers, and learn together as one community.
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-border/60 bg-secondary/30 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-[.2em] text-accent">A shared table</div>
              <h4 className="mt-1 font-serif text-xl sm:text-2xl font-bold">Learning becomes richer when it is shared.</h4>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-6">
                Find the next book for your quiet hour, keep track of what you borrow, and return with a thought worth bringing to fellowship.
              </p>
            </div>
            <Link href="/login" className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-md hover:opacity-90 transition touch-target">
              Start exploring <ChevronRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-border/80 bg-card/60 px-4 py-8 text-xs text-muted-foreground lg:px-10 safe-bottom">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-foreground">LOGOS Library</span>
            <span>·</span>
            <span>A home for study and community</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <span className="text-muted-foreground/80">Contact builder:</span>
            <a
              href="mailto:samakms77@gmail.com"
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline transition"
              title="Send email to builder"
            >
              <Mail size={13} /> samakms77@gmail.com
            </a>
            <span className="text-border">·</span>
            <a
              href="https://t.me/alota_7"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline transition"
              title="Telegram builder"
            >
              <Send size={13} /> Telegram: @alota_7
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AuthShell({ children, eyebrow, title, detail }: { children: ReactNode; eyebrow: string; title: string; detail: string }) {
  return (
    <div className="noise min-h-[100dvh] bg-background">
      <div className="mx-auto grid min-h-[100dvh] max-w-6xl xl:max-w-7xl lg:grid-cols-2">
        <div className="hidden bg-sidebar p-8 lg:p-12 xl:p-14 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between border-r border-border/40">
          <Logo dark />
          <div className="max-w-md pb-12">
            <div className="mb-5 text-xs font-bold uppercase tracking-[.22em] text-sidebar-primary">LOGOS Library</div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">Make room for the word.</h2>
            <p className="mt-6 leading-7 text-sidebar-foreground/75">The LOGOS Library brings books, Bible-study resources, and a growing community of learners into one welcoming home. A trusted collection for the people who keep asking better questions.</p>
            <div className="mt-12 border-l-2 border-sidebar-primary/60 pl-5 font-serif text-lg italic text-sidebar-foreground/85">
              “Let the word of Christ dwell in you richly.”
              <span className="mt-2 block font-sans text-xs not-italic text-sidebar-primary">Colossians 3:16</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sidebar-foreground/45 border-t border-sidebar-border pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[.2em]">Study / Serve / Share</div>
            <ThemeToggle className="text-sidebar-foreground/70 hover:text-sidebar-foreground border-sidebar-border/40 bg-sidebar-accent/50" />
          </div>
        </div>
        
        <div className="flex items-center justify-center lg:justify-start px-6 py-8 sm:px-10 lg:pl-12 lg:pr-14 xl:pl-16 xl:pr-24 safe-bottom">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Logo />
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Link href="/" data-testid="link-auth-home" className="text-sm font-semibold text-muted-foreground hover:text-primary">Back home</Link>
              </div>
            </div>
            <div className="mb-6 sm:mb-8">
              <div className="text-xs font-bold uppercase tracking-[.2em] text-accent">{eyebrow}</div>
              <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleAuthButton({ prefillEmail }: { prefillEmail?: string }) {
  const [, setLocation] = useLocation();
  const [showInput, setShowInput] = useState(false);
  const [googleEmail, setGoogleEmail] = useState(prefillEmail || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitGoogleAuth = async (targetEmail: string) => {
    const clean = targetEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setError('Please enter a valid Google email address.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to authenticate with Google.');
      setLocation(data.user.role === 'admin' ? '/admin/dashboard' : '/member/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    if (prefillEmail && prefillEmail.includes('@')) {
      submitGoogleAuth(prefillEmail);
    } else {
      setShowInput(prev => !prev);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={loading}
        className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl border border-border bg-card hover:bg-secondary/70 active:scale-[0.99] transition font-medium text-xs sm:text-sm text-foreground shadow-xs touch-target cursor-pointer"
        data-testid="button-google-auth"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        {loading ? 'Connecting Google Account…' : 'Continue with Google'}
      </button>

      {showInput && (
        <div className="rounded-xl border border-primary/30 bg-secondary/40 p-3 space-y-2 animate-in fade-in duration-200">
          <label className="text-xs font-semibold text-muted-foreground block">
            Enter your Google email address:
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={googleEmail}
              onChange={e => setGoogleEmail(e.target.value)}
              placeholder="e.g. samakms77@gmail.com"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <button
              type="button"
              onClick={() => submitGoogleAuth(googleEmail)}
              disabled={loading || !googleEmail.includes('@')}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Sign in
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive text-center">
          {error}
        </div>
      )}
    </div>
  );
}

function Login() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    login.mutate(
      { data: { email: cleanEmail, password } },
      {
        onSuccess: (data) => {
          setLocation(data.user.role === 'admin' ? '/admin/dashboard' : '/member/dashboard');
        },
      }
    );
  };

  const loginErrorMsg = (login.error as any)?.response?.data?.error || (login.error as any)?.message || 'The email or password did not match our records.';

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in to the library." detail="Your next meaningful read is waiting. Sign in to continue.">
      <form className="grid gap-4 sm:gap-5" onSubmit={handleSubmit}>
        <Field
          label="Email address"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          placeholder="you@university.edu"
          required
          data-testid="input-email"
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          data-testid="input-password"
        />
        <div className="flex justify-end">
          <Link href="/forgot-password" data-testid="link-forgot-password" className="text-sm font-semibold text-primary hover:underline">Forgot password?</Link>
        </div>
        {login.isError && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2" data-testid="status-login-error">
            <AlertCircle size={16} className="shrink-0" />
            <span>{loginErrorMsg}</span>
          </div>
        )}
        <Button type="submit" disabled={login.isPending} className="h-12 w-full touch-target text-base shadow-md shadow-primary/20" data-testid="button-login">
          {login.isPending ? <LoaderCircle size={18} className="animate-spin" /> : null}
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-semibold">Or</span></div>
        </div>
        <GoogleAuthButton />
        <p className="pt-2 text-center text-sm text-muted-foreground">New to the fellowship? <Link href="/register" data-testid="link-register" className="font-bold text-primary hover:underline">Create a member account</Link></p>
      </form>
    </AuthShell>
  );
}

function Register() {
  const [, setLocation] = useLocation();
  const register = useRegister();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', department: '', schoolYear: '' });
  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(current => ({ ...current, [key]: e.target.value }));

  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    const cleanData = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      phone: form.phone.trim(),
      department: form.department.trim(),
      schoolYear: form.schoolYear.trim(),
    };

    if (!/^\d{10}$/.test(cleanData.phone)) {
      setValidationError('Phone number must be exactly 10 digits (e.g. 0987654321).');
      return;
    }

    if (cleanData.department.length > 30) {
      setValidationError('Department must be at most 30 characters.');
      return;
    }

    register.mutate(
      { data: cleanData },
      {
        onSuccess: (data: any) => {
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          setLocation(data?.user?.role === 'admin' ? '/admin/dashboard' : '/member/dashboard');
        },
      }
    );
  };

  const regErrorMsg = validationError || (register.error as any)?.response?.data?.error || (register.error as any)?.message || "We couldn't create that account. Check your details and try again.";

  return (
    <AuthShell eyebrow="Join the fellowship" title="Create your member account." detail="A few details, then a whole collection of places to begin.">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Field label="Full name" name="name" autoComplete="name" value={form.name} onChange={update('name')} required data-testid="input-register-name" />
          <Field label="Email address" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={form.email} onChange={update('email')} required data-testid="input-register-email" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Field
            label="Phone number (10 digits)"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            value={form.phone}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              setForm(current => ({ ...current, phone: val }));
            }}
            placeholder="0987654321"
            required
            data-testid="input-register-phone"
          />
          <Field label="School year" name="schoolYear" autoComplete="off" value={form.schoolYear} onChange={update('schoolYear')} placeholder="e.g. 3rd year" required data-testid="input-register-year" />
        </div>
        <Field
          label="Department (max 30 characters)"
          name="department"
          autoComplete="organization-title"
          maxLength={30}
          value={form.department}
          onChange={e => {
            const val = e.target.value.slice(0, 30);
            setForm(current => ({ ...current, department: val }));
          }}
          placeholder="e.g. Computer Science"
          required
          data-testid="input-register-department"
        />
        <PasswordField label="Password" name="password" autoComplete="new-password" value={form.password} onChange={update('password')} minLength={8} required data-testid="input-register-password" />
        {(register.isError || validationError) && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{regErrorMsg}</span>
          </div>
        )}
        <Button type="submit" disabled={register.isPending} className="mt-2 h-12 w-full touch-target text-base" data-testid="button-register">
          {register.isPending ? <LoaderCircle size={18} className="animate-spin" /> : null}
          {register.isPending ? 'Creating account…' : 'Create account & enter library'}
        </Button>
        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-semibold">Or</span></div>
        </div>
        <GoogleAuthButton prefillEmail={form.email} />
        <p className="pt-2 text-center text-sm text-muted-foreground">Already a member? <Link href="/login" data-testid="link-existing-login" className="font-bold text-primary hover:underline">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [devCode, setDevCode] = useState('');
  const [emailDelivered, setEmailDelivered] = useState(true);
  const [stage, setStage] = useState<'email' | 'code' | 'done'>('email');
  const requestReset = useRequestPasswordReset();
  const resetPassword = useResetPassword();

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    requestReset.mutate(
      { data: { email: cleanEmail } },
      {
        onSuccess: (res: any) => {
          if (res?.devCode) {
            setDevCode(res.devCode);
          }
          if (res?.emailDelivered !== undefined) {
            setEmailDelivered(res.emailDelivered);
          }
          setStage('code');
        },
      }
    );
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    resetPassword.mutate(
      { data: { email: cleanEmail, code: code.trim(), password } },
      {
        onSuccess: () => {
          setStage('done');
        },
      }
    );
  };

  const requestError = (requestReset.error as any)?.response?.data?.error || (requestReset.error as any)?.message || 'We could not generate the recovery code. Please try again.';
  const resetError = (resetPassword.error as any)?.response?.data?.error || (resetPassword.error as any)?.message || 'That code could not be verified. Please try again.';

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Find your way back in."
      detail={
        stage === 'email'
          ? 'Enter your account email to receive your six-digit verification code.'
          : stage === 'code'
          ? 'Enter the 6-digit code sent to your email and set your new password.'
          : 'Your password has been updated successfully.'
      }
    >
      <form className="grid gap-5" onSubmit={stage === 'email' ? handleRequest : handleReset}>
        {stage === 'email' && (
          <>
            <Field
              label="Email address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@university.edu"
              autoComplete="email"
              required
              data-testid="input-recovery-email"
            />
            {requestReset.isError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive flex items-center gap-2" data-testid="status-recovery-error">
                <AlertCircle size={16} className="shrink-0" />
                <span>{requestError}</span>
              </div>
            )}
            <Button type="submit" disabled={requestReset.isPending} className="h-12 w-full touch-target" data-testid="button-send-recovery">
              {requestReset.isPending ? <LoaderCircle size={18} className="animate-spin" /> : null}
              {requestReset.isPending ? 'Sending recovery code…' : 'Send recovery code to my email'}
            </Button>
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-semibold">Or sign in directly</span></div>
            </div>
            <GoogleAuthButton prefillEmail={email} />
          </>
        )}
        {stage === 'code' && (
          <>
            {emailDelivered ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-foreground space-y-1.5" data-testid="status-recovery-sent">
                <div className="flex items-center gap-2 font-bold text-primary">
                  <Mail size={18} /> Verification code sent to inbox
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We sent a 6-digit recovery code to your registered account email: <span className="font-semibold text-foreground">{email}</span>. Please check your inbox and spam folder.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-foreground space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
                  <AlertCircle size={18} /> Outgoing Email Not Connected Yet
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Google/Gmail SMTP is not yet configured in <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">.env</code> with an App Password. For testing right now, your code is:
                </p>
                <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5">
                  <span className="font-mono text-xl font-bold tracking-widest text-primary">{devCode}</span>
                  <button
                    type="button"
                    onClick={() => setCode(devCode)}
                    className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                  >
                    Auto-fill
                  </button>
                </div>
              </div>
            )}
            <Field
              label="6-Digit Verification Code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              required
              autoFocus
              data-testid="input-recovery-code"
            />
            <PasswordField
              label="New password"
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
              data-testid="input-new-password"
            />
            {resetPassword.isError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive flex items-center gap-2" data-testid="status-reset-error">
                <AlertCircle size={16} className="shrink-0" />
                <span>{resetError}</span>
              </div>
            )}
            <Button type="submit" disabled={resetPassword.isPending || code.length !== 6 || password.length < 8} className="h-12 w-full touch-target" data-testid="button-reset-password">
              {resetPassword.isPending ? <LoaderCircle size={18} className="animate-spin" /> : null}
              {resetPassword.isPending ? 'Updating password…' : 'Reset password'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStage('email');
                setCode('');
              }}
              className="text-xs text-muted-foreground hover:text-foreground text-center transition underline-offset-2 hover:underline"
            >
              Didn&apos;t get the code? Change email or try again
            </button>
          </>
        )}
        {stage === 'done' && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-sm text-foreground space-y-3" data-testid="status-reset-success">
            <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 text-base">
              <Check size={20} /> Password Reset Successfully
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Your account password has been updated. You can now sign in to your LOGOS Library account with your new password.
            </p>
            <Link href="/login" className="inline-flex w-full items-center justify-center rounded-lg bg-primary py-2.5 font-bold text-primary-foreground text-sm hover:opacity-90 transition">
              Sign in now
            </Link>
          </div>
        )}
        <p className="pt-2 text-center text-sm text-muted-foreground"><Link href="/login" data-testid="link-back-login" className="font-bold text-primary hover:underline">Return to sign in</Link></p>
      </form>
    </AuthShell>
  );
}

function BookCover({ book, large = false, className = '' }: { book: Book; large?: boolean; className?: string }) {
  const [imgError, setImgError] = useState(false);
  const normalizedCoverUrl = book.coverUrl
    ? book.coverUrl.replace(/^\/api\/storage\/api\/storage\//, '/api/storage/')
    : null;
  const appliedClass = className || (large ? 'h-72 sm:h-96' : 'h-36 sm:h-48');

  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-lg bg-neutral-950/80 p-0.5 ${className?.includes('h-') ? className : ''}`}>
      {normalizedCoverUrl && !imgError ? (
        <img
          src={normalizedCoverUrl}
          alt={book.title}
          onError={() => setImgError(true)}
          className={`w-full rounded-lg object-contain ${appliedClass}`}
        />
      ) : (
        <div className={`book-spine flex w-full flex-col justify-between rounded-lg bg-secondary p-3 sm:p-4 text-secondary-foreground ${appliedClass}`}>
          <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[.2em] text-primary truncate">{book.category}</span>
          <BookOpen className="self-center text-primary/50 shrink-0" size={large ? 40 : 26} />
          <span className="font-serif text-sm sm:text-lg font-bold leading-tight line-clamp-2">{book.title}</span>
        </div>
      )}
      <div className="book-crease-overlay" />
      <div className="book-pages-side" />
    </div>
  );
}

function ModernBookCard({ book, publicCard = false }: { book: Book; publicCard?: boolean }) {
  const detailLink = publicCard ? '/login' : `/member/books/${book.id}`;
  const [imgError, setImgError] = useState(false);
  const normalizedCoverUrl = book.coverUrl
    ? book.coverUrl.replace(/^\/api\/storage\/api\/storage\//, '/api/storage/')
    : null;

  return (
    <Link
      href={detailLink}
      className="group relative flex flex-col justify-between rounded-xl sm:rounded-2xl bg-card border border-border p-1.5 sm:p-2.5 md:p-3 shadow-xs hover:shadow-lg hover:border-primary/40 transition duration-200 cursor-pointer"
      data-testid={`card-book-${book.id}`}
    >
      <div className="relative flex items-center justify-center aspect-[2/3] max-h-36 min-[440px]:max-h-40 sm:max-h-64 w-full overflow-hidden rounded-lg sm:rounded-xl bg-neutral-950/80 dark:bg-black/90 p-0.5 shadow-xs">
        {normalizedCoverUrl && !imgError ? (
          <img
            src={normalizedCoverUrl}
            alt={book.title}
            onError={() => setImgError(true)}
            className="h-full w-full object-contain rounded-md sm:rounded-lg transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between p-2 sm:p-3.5 bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950 text-white rounded-md sm:rounded-lg">
            <div className="text-[8px] sm:text-[10px] font-mono uppercase tracking-wider text-neutral-300 truncate">{book.category}</div>
            <BookOpen className="self-center text-white/30" size={20} />
            <div>
              <div className="font-serif font-bold text-[10px] sm:text-xs leading-tight line-clamp-2 text-white">{book.title}</div>
              <div className="text-[8px] sm:text-[10px] text-neutral-400 truncate mt-0.5">{book.author}</div>
            </div>
          </div>
        )}

        <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-10">
          <span className="inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[7px] sm:text-[9px] font-bold uppercase tracking-wider shadow bg-black/85 text-white ring-1 ring-white/20 backdrop-blur-sm">
            {book.type === 'softcopy' ? 'Softcopy' : 'Hardcopy'}
          </span>
        </div>
      </div>

      <div className="mt-2 text-center">
        <h4 className="font-serif font-bold text-[11px] sm:text-xs leading-tight line-clamp-1 group-hover:text-primary transition-colors text-foreground">
          {book.title}
        </h4>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate mt-0.5">
          {book.author}
        </p>
        <div className="mt-1 text-[8px] sm:text-[10px] font-semibold text-foreground/80 tracking-wide truncate">
          {book.type === 'softcopy' ? 'Digital Edition' : (book.available > 0 ? `${book.available} available` : 'On loan')}
        </div>
      </div>
    </Link>
  );
}

function StudyNoteStoreCard({
  note,
  onSelect,
}: {
  note: StudyNote;
  onSelect: (note: StudyNote) => void;
}) {
  const isSummer = note.type === 'summer';

  return (
    <div
      onClick={() => onSelect(note)}
      className="group relative flex flex-col justify-between rounded-xl sm:rounded-2xl bg-card border border-border p-1.5 sm:p-2.5 md:p-3 shadow-xs hover:shadow-lg hover:border-primary/40 transition duration-200 cursor-pointer"
      data-testid={`card-note-${note.id}`}
    >
      <div className="relative flex items-center justify-center aspect-[2/3] max-h-36 min-[440px]:max-h-40 sm:max-h-64 w-full overflow-hidden rounded-lg sm:rounded-xl bg-neutral-950/80 dark:bg-black/90 p-0.5 shadow-xs transition duration-300 group-hover:scale-[1.02]">
        <div className="relative h-full w-full flex flex-col justify-between p-2 sm:p-3 text-white bg-gradient-to-br from-neutral-800 via-neutral-900 to-black rounded-md sm:rounded-lg">
          <div className="book-crease-overlay" />

          <div className="flex items-center justify-between z-10">
            <span className="text-[7px] sm:text-[9px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white ring-1 ring-white/20">
              {isSummer ? 'Summer' : 'Personal'}
            </span>
            <span className="text-[8px] sm:text-[9px] font-mono text-white/50">HU</span>
          </div>

          <div className="my-auto py-1 text-center z-10">
            <div className="mx-auto mb-1 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
              {isSummer ? <BookOpen size={13} /> : <FileText size={13} />}
            </div>
            <h4 className="font-serif text-[10px] sm:text-xs font-bold leading-tight line-clamp-2 sm:line-clamp-3 text-white">
              {note.title}
            </h4>
          </div>

          <div className="z-10 text-center border-t border-white/10 pt-1">
            <div className="text-[8px] sm:text-[9px] text-white/60 truncate">by {note.author}</div>
          </div>
        </div>
      </div>

      <div className="mt-2 text-center">
        <h4 className="font-serif font-bold text-[11px] sm:text-xs leading-tight line-clamp-1 group-hover:text-primary transition-colors text-foreground">
          {note.title}
        </h4>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate mt-0.5">
          by {note.author}
        </p>
        <div className="mt-1 text-[8px] sm:text-[10px] font-semibold text-foreground/80 tracking-wide truncate">
          Free Guide
        </div>
      </div>
    </div>
  );
}

function ShelfBookCard({ book, publicCard = false }: { book: Book; publicCard?: boolean }) {
  const detailLink = publicCard ? '/login' : `/member/books/${book.id}`;
  const cleanFileUrl = book.fileUrl?.replace(/^\/api\/storage\/api\/storage\//, '/api/storage/');

  return (
    <div className="standing-book group flex flex-col justify-end w-44 sm:w-52 shrink-0 select-none pb-1" data-testid={`shelf-book-${book.id}`}>
      <Link href={detailLink} className="relative block">
        <div className="relative overflow-hidden rounded-lg shadow-lg transition duration-300 group-hover:shadow-2xl">
          <div className="absolute top-2.5 right-2.5 z-20">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-md bg-black/85 text-white ring-1 ring-white/20 backdrop-blur-sm">
              {book.type === 'softcopy' ? 'Softcopy' : 'Hardcopy'}
            </span>
          </div>

          <BookCover book={book} className="h-64 sm:h-72 w-full object-cover" />

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3.5 z-30">
            <div className="text-white text-xs font-serif font-bold line-clamp-2 mb-1">{book.title}</div>
            <div className="text-white/75 text-[11px] truncate mb-2.5">by {book.author}</div>
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="inline-flex items-center gap-1 rounded bg-primary/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                View book <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>

        <div className="book-plank-shadow" />
      </Link>

      <div className="mt-3.5 px-1 text-center">
        <Link href={detailLink} className="block group-hover:text-primary transition-colors">
          <h4 className="font-serif text-sm font-bold leading-snug line-clamp-1">{book.title}</h4>
        </Link>
        <p className="text-[11px] text-muted-foreground truncate">{book.author}</p>
        <div className="mt-1 flex items-center justify-center gap-1.5">
          {book.type !== 'softcopy' && (
            <Status tone={book.available > 0 ? 'good' : 'bad'}>
              {book.available > 0 ? `${book.available} available` : 'On loan'}
            </Status>
          )}
        </div>
      </div>
    </div>
  );
}

function BookshelfRow({ title, eyebrow, books, publicShelf = false }: { title?: string; eyebrow?: string; books: Book[]; publicShelf?: boolean }) {
  if (!books.length) return null;
  return (
    <div className="bookshelf-shelf">
      {(title || eyebrow) && (
        <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-2 px-2">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Library size={16} />
            </span>
            <div>
              {eyebrow && <div className="text-[10px] font-bold uppercase tracking-[.2em] text-accent">{eyebrow}</div>}
              {title && <h3 className="font-serif text-xl font-bold">{title}</h3>}
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-secondary/60 rounded-full px-2.5 py-0.5">
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </span>
        </div>
      )}
      
      <div className="flex items-end gap-6 overflow-x-auto pb-1 px-4 sm:px-6 pt-6 scrollbar-thin">
        {books.map(book => (
          <ShelfBookCard key={book.id} book={book} publicCard={publicShelf} />
        ))}
      </div>

      <div className="wood-shelf-plank">
        <div className="wood-shelf-edge" />
        <div className="wood-shelf-shadow" />
      </div>
    </div>
  );
}

function BookCard({ book, publicCard = false }: { book: Book; publicCard?: boolean }) {
  return <ModernBookCard book={book} publicCard={publicCard} />;
}

const memberLinks = [
  { href: '/member/dashboard', key: 'dashboard', icon: HomeIcon },
  { href: '/member/books', key: 'books', icon: BookOpen },
  { href: '/member/notes', key: 'notes', icon: FileText },
  { href: '/member/questions', key: 'questions', icon: HelpCircle },
  { href: '/member/borrowings', key: 'borrowings', icon: Bookmark },
];
const adminLinks = [
  { href: '/admin/dashboard', key: 'dashboard', icon: HomeIcon },
  { href: '/admin/books', key: 'books', icon: BookOpen },
  { href: '/admin/categories', key: 'categories', icon: FolderOpen },
  { href: '/admin/members', key: 'members', icon: Users },
  { href: '/admin/requests', key: 'requests', icon: Clock3 },
  { href: '/admin/notes', key: 'notes', icon: FileText },
  { href: '/admin/questions', key: 'adminQuestions', icon: HelpCircle },
  { href: '/admin/settings', key: 'settings', icon: Settings }
];

function AccountSecuritySection({ user }: { user?: User }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }
      setSuccess('Password updated successfully! Your account is secured.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error modifying password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500" /> Account Status</span>
          <span className="font-semibold text-emerald-500">Verified & Active</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5"><Lock size={14} className="text-primary" /> Security Standard</span>
          <span className="font-mono text-[11px] text-foreground">Scrypt-64 encrypted</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5"><KeyRound size={14} className="text-amber-500" /> Member Identity</span>
          <span className="font-medium text-foreground">{user?.email}</span>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-3 pt-1">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <KeyRound size={13} className="text-primary" /> Modify Security / Change Password
        </div>
        <PasswordField
          label="Current password"
          placeholder="Enter current password (if set)"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
        />
        <PasswordField
          label="New password"
          placeholder="At least 8 characters"
          minLength={8}
          required
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
        />
        <PasswordField
          label="Confirm new password"
          placeholder="Repeat new password"
          minLength={8}
          required
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
        />

        {error && (
          <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-1.5">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Check size={14} className="shrink-0" /> {success}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full text-xs h-10 mt-1">
          {loading ? 'Updating security…' : 'Update password'}
        </Button>
      </form>
    </div>
  );
}

function ProfileModal({ user, open, onOpenChange }: { user?: User; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [, setLocation] = useLocation();
  const logout = useLogout();
  const [tab, setTab] = useState<'profile' | 'security'>('profile');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
        <DialogTitle className="font-serif text-xl font-bold flex items-center gap-2">
          <CircleUserRound className="text-primary" size={22} />
          About My Profile
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Your LOGOS Library member details, security, and account standing.
        </DialogDescription>

        <div className="flex border-b border-border/80 mt-2">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
              tab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Profile Info
          </button>
          <button
            type="button"
            onClick={() => setTab('security')}
            className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center justify-center gap-1.5 ${
              tab === 'security' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck size={14} /> Security & Password
          </button>
        </div>

        {tab === 'profile' ? (
          <>
            <div className="mt-4 flex flex-col items-center p-4 rounded-2xl bg-secondary/40 border border-border/60 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary font-serif text-2xl font-bold text-primary-foreground shadow-sm">
                {user?.name?.slice(0, 1) ?? 'H'}
              </span>
              <div className="mt-3 font-serif text-lg font-bold text-foreground">{user?.name ?? 'Fellowship Member'}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <Status tone="good">Verified Member</Status>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">{user?.role ?? 'member'}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Email</span>
                <span className="font-medium text-foreground">{user?.email ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Phone</span>
                <span className="font-medium text-foreground">{user?.phone || 'Not added'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Department</span>
                <span className="font-medium text-foreground">{user?.department || 'Not added'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">School Year</span>
                <span className="font-medium text-foreground">{user?.schoolYear || 'Not added'}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <AccountSecuritySection user={user} />
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 pt-2 border-t border-border/50">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              logout.mutate(undefined, { onSuccess: () => setLocation('/login') });
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-destructive hover:underline py-2 px-3 rounded-lg hover:bg-destructive/10 transition"
          >
            <LogOut size={14} /> Sign out
          </button>
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const getNavLinks = (admin: boolean, preview: boolean) => (
  preview
    ? [{ href: admin ? '/__preview/admin' : '/__preview/member', key: 'dashboard', icon: HomeIcon, label: 'Home' }]
    : admin
    ? [
        { href: '/admin/dashboard', key: 'dashboard', icon: HomeIcon, label: 'Home' },
        { href: '/admin/books', key: 'books', icon: BookOpen, label: 'Books' },
        { href: '/admin/requests', key: 'requests', icon: Clock3, label: 'Requests' },
        { href: '/admin/notes', key: 'notes', icon: FileText, label: 'Notes' },
        { href: '/admin/questions', key: 'adminQuestions', icon: HelpCircle, label: 'Q&A' },
        { href: '/admin/members', key: 'members', icon: Users, label: 'Members' },
        { href: '/admin/settings', key: 'settings', icon: Settings, label: 'Settings' },
      ]
    : [
        { href: '/member/dashboard', key: 'dashboard', icon: HomeIcon, label: 'Home' },
        { href: '/member/books', key: 'books', icon: BookOpen, label: 'Books' },
        { href: '/member/notes', key: 'notes', icon: FileText, label: 'Notes' },
        { href: '/member/questions', key: 'questions', icon: HelpCircle, label: 'Q&A' },
        { href: '/member/borrowings', key: 'borrowings', icon: Bookmark, label: 'My Loans' },
      ]
);

function BottomTabBar({ admin, preview = false }: { admin: boolean; preview?: boolean }) {
  const [location] = useLocation();
  const links = getNavLinks(admin, preview);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 dark:bg-black/95 backdrop-blur-lg border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.18)] safe-bottom"
      data-testid="bottom-tab-bar"
    >
      <div className="mx-auto flex max-w-xl items-center justify-around px-1 py-1 sm:py-1.5">
        {links.map(({ href, key, icon: Icon, label }) => {
          const isActive = location === href || (href !== '/member/dashboard' && href !== '/admin/dashboard' && location.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              data-testid={`tab-${key}`}
              className={`flex flex-1 flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 rounded-xl transition-all touch-target ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div
                className={`relative flex items-center justify-center p-1 sm:p-1.5 rounded-full transition-transform ${
                  isActive ? 'scale-110 bg-primary/10 text-primary ring-1 ring-primary/20' : ''
                }`}
              >
                <Icon size={18} className="sm:w-5 sm:h-5 shrink-0" />
              </div>
              <span
                className={`text-[9px] min-[400px]:text-[10px] sm:text-[11px] truncate tracking-tight transition-colors ${
                  isActive ? 'font-bold text-foreground' : 'font-medium'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AuthenticatedLayout({ children, admin = false, preview = false }: { children: ReactNode; admin?: boolean; preview?: boolean }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const path = window.location.pathname;
  const current = useGetCurrentUser({ query: { enabled: !preview && (path.startsWith('/member') || path.startsWith('/admin')), queryKey: getGetCurrentUserQueryKey() } });
  const user = preview ? (admin ? previewAdmin : previewMember) : current.data;
  const logout = useLogout();
  const [location, setLocation] = useLocation();
  const links = getNavLinks(admin, preview);

  return (
    <div className="min-h-[100dvh] bg-background">
      <ProfileModal user={user} open={profileOpen} onOpenChange={setProfileOpen} />

      <div className="flex min-h-[100dvh] flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 sm:px-6 lg:px-9 backdrop-blur">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-border/60">
              <span className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">
                {admin ? 'Steward desk' : 'Library'}
              </span>
            </div>

            {/* Desktop Navigation Bar (Only on md: and above) */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 ml-2 lg:ml-5">
              {links.map(({ href, key, icon: Icon, label }) => {
                const isActive = location === href || (href !== '/member/dashboard' && href !== '/admin/dashboard' && location.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    data-testid={`desktop-nav-${key}`}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs lg:text-sm font-semibold transition ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {preview && (
              <span data-testid="badge-sample-preview" className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                Sample preview
              </span>
            )}
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 rounded-full bg-secondary hover:bg-secondary/80 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition cursor-pointer shadow-xs border border-border/40 touch-target"
              title="Click to view about my profile"
              data-testid="button-header-profile"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-[10px]">
                {user?.name?.slice(0, 1) ?? 'H'}
              </span>
              <span className="hidden sm:inline font-medium">{user?.name ?? 'Fellowship member'}</span>
            </button>
            {!preview && (
              <button
                type="button"
                onClick={() => logout.mutate(undefined, { onSuccess: () => setLocation('/login') })}
                title="Sign out"
                data-testid="button-sign-out"
                className="text-muted-foreground hover:text-foreground p-2 rounded-lg transition hover:bg-secondary touch-target"
              >
                <LogOut size={16} />
              </button>
            )}
            {!preview && <span className="h-2 w-2 rounded-full bg-emerald-500" title="Connected" />}
          </div>
        </header>

        {preview && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-center text-xs font-medium text-amber-900 lg:px-9">
            Development sample data only. Preview controls are disabled and nothing is saved.
          </div>
        )}

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 pb-24 md:pb-10 sm:px-6 sm:py-8 lg:px-9 lg:py-10">
          {children}
        </main>

        <footer className="mt-auto border-t border-border/80 bg-card/60 px-4 py-5 mb-16 md:mb-0 lg:px-9 safe-bottom">
          <div className="mx-auto flex max-w-[1500px] flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-foreground">LOGOS Library</span>
              <span>·</span>
              <span>A home for study & community</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <span className="text-muted-foreground/80">Contact builder:</span>
              <a
                href="mailto:samakms77@gmail.com"
                className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline transition"
                title="Send email to builder"
              >
                <Mail size={13} /> samakms77@gmail.com
              </a>
              <span className="text-border">·</span>
              <a
                href="https://t.me/alota_7"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline transition"
                title="Open Telegram"
              >
                <Send size={13} /> Telegram: @alota_7
              </a>
            </div>
          </div>
        </footer>

        {/* Bottom Tab Bar (Only on mobile users) */}
        <BottomTabBar admin={admin} preview={preview} />
      </div>
    </div>
  );
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <div className="mb-1.5 text-xs font-bold uppercase tracking-[.2em] text-accent">{eyebrow}</div>}<h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>{detail && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{detail}</p>}</div>{action}</div>;
}
function Metric({ label, value, icon: Icon, accent = 'primary' }: { label: string; value: string | number; icon: typeof Library; accent?: 'primary' | 'accent' }) { return <div className="rounded-xl border border-border bg-card p-5"><div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-lg ${accent === 'accent' ? 'bg-accent/10 text-accent' : 'bg-secondary text-primary'}`}><Icon size={19} /></div><div className="font-mono text-3xl font-bold">{value}</div><div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div></div>; }

function MemberDashboard({ preview = false }: { preview?: boolean }) {
  const { lang } = useLang();
  const summary = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey(), enabled: !preview } });
  const books = useListBooks(undefined, { query: { queryKey: getListBooksQueryKey(), enabled: !preview } });
  const notes = useListStudyNotes(undefined, { query: { queryKey: getListStudyNotesQueryKey(), enabled: !preview } });
  const categories = useListCategories({ query: { queryKey: getListCategoriesQueryKey(), enabled: !preview } });
  const data = preview ? previewMemberSummary : summary.data;

  // Pick at least 4 popular books ensuring different categories
  const allBooks: Book[] = preview ? previewBooks : (Array.isArray(books.data) ? books.data : []);
  const popularBooks: Book[] = [];
  const seenCategories = new Set<string>();

  for (const b of allBooks) {
    const cat = b.category || 'General';
    if (!seenCategories.has(cat)) {
      seenCategories.add(cat);
      popularBooks.push(b);
    }
  }

  if (popularBooks.length < 4) {
    for (const b of allBooks) {
      if (!popularBooks.some(p => p.id === b.id)) {
        popularBooks.push(b);
        if (popularBooks.length >= 4) break;
      }
    }
  }

  const latest = popularBooks.slice(0, 6);
  const totalCategories = preview ? 6 : (Array.isArray(categories.data) ? categories.data.length : 0);
  const action = preview
    ? <Button disabled variant="soft" data-testid="button-preview-browse"><ChevronRight size={16} />Preview only</Button>
    : <Link href="/member/books" data-testid="link-dashboard-browse" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">{t('browse', lang)} <ChevronRight size={16} /></Link>;

  return (
    <AuthenticatedLayout preview={preview}>
      <PageHeading
        title={`${t('welcome', lang)}.`}
        detail="The LOGOS Library brings books, Bible-study resources, and a growing community of learners into one welcoming home."
        action={action}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!preview && summary.isLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-36" />)
        ) : (
          <>
            <Metric label={lang === 'am' ? 'በስብስቡ ውስጥ መጻሕፍት' : 'Books in collection'} value={data?.books ?? 0} icon={BookOpen} />
            <Metric label={lang === 'am' ? 'የጥናት ማስታወሻዎች' : 'Study notes & guides'} value={data?.studyNotes ?? (preview ? 9 : notes.data?.length ?? 0)} icon={FileText} />
            <Metric label={lang === 'am' ? 'የመጽሐፍ ምድቦች' : 'Book categories'} value={totalCategories} icon={FolderOpen} />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[.2em] text-accent">Diverse Categories</div>
              <h2 className="mt-1 font-serif text-xl sm:text-2xl font-bold">Popular books</h2>
            </div>
            {preview ? (
              <span className="text-sm font-semibold text-muted-foreground">Sample shelf</span>
            ) : (
              <Link href="/member/books" data-testid="link-dashboard-books" className="text-sm font-bold text-primary hover:underline">
                See all books
              </Link>
            )}
          </div>
          {!preview && books.isLoading ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : latest.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {latest.map(book => {
                const content = (
                  <>
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md bg-secondary">
                      <BookCover book={book} className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-serif font-bold text-sm sm:text-base">{book.title}</h3>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">{book.author}</p>
                      <span className="inline-block mt-1 text-[10px] font-mono font-semibold uppercase text-primary bg-primary/10 rounded px-1.5 py-0.5">
                        {book.category}
                      </span>
                    </div>
                    {!preview && <ArrowUpRight size={16} className="text-muted-foreground shrink-0" />}
                  </>
                );
                return preview ? (
                  <div key={book.id} data-testid={`row-preview-book-${Math.abs(book.id)}`} className="flex items-center gap-3.5 rounded-xl border border-border/70 p-3 bg-secondary/20">
                    {content}
                  </div>
                ) : (
                  <Link key={book.id} href={`/member/books/${book.id}`} data-testid={`row-dashboard-book-${book.id}`} className="flex items-center gap-3.5 rounded-xl border border-border/70 p-3 hover:border-primary/40 hover:bg-secondary/40 transition">
                    {content}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState icon={BookOpen} title="The shelves are quiet" detail="Newly added books will appear here." />
            </div>
          )}
        </section>

        <section className="relative overflow-hidden rounded-2xl bg-sidebar p-7 text-sidebar-foreground flex flex-col justify-between">
          <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full border border-sidebar-primary/20" />
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full border border-sidebar-primary/20" />
          <div className="relative">
            <div className="font-mono text-[10px] uppercase tracking-[.2em] text-sidebar-primary">A verse for the week</div>
            <p className="mt-8 font-serif text-2xl font-bold leading-relaxed">“Trust in the Lord with all your heart and lean not on your own understanding.”</p>
            <p className="mt-4 text-xs text-sidebar-foreground/55">Proverbs 3:5</p>
          </div>
          <div className="mt-10 flex justify-end">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-sidebar-border bg-black p-1">
              <img src={logo} alt="" className="block h-full w-full object-contain" />
            </span>
          </div>
        </section>
      </div>
    </AuthenticatedLayout>
  );
}

function MemberBooks() {
  const { lang } = useLang();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [viewMode, setViewMode] = useState<'store' | 'grid'>('store');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useListBooks(
    {
      search: debouncedSearch.trim() || undefined,
      category: category || undefined,
      type: (type || undefined) as any,
    },
    {
      query: {
        queryKey: getListBooksQueryKey({
          search: debouncedSearch.trim() || undefined,
          category: category || undefined,
          type: (type || undefined) as any,
        }),
        placeholderData: (prev: any) => prev,
      },
    }
  );
  const cats = useListCategories();
  const books = Array.isArray(query.data) ? query.data : [];
  const categoriesList = Array.isArray(cats.data) ? cats.data : [];

  const booksByCategory: Record<string, Book[]> = {};
  if (category) {
    booksByCategory[category] = books;
  } else {
    for (const b of books) {
      const cat = b.category || 'General Collection';
      if (!booksByCategory[cat]) booksByCategory[cat] = [];
      booksByCategory[cat].push(b);
    }
  }

  const popularBooks = books.filter(b => b.featured).length > 0
    ? books.filter(b => b.featured)
    : books.slice(0, 6);

  return (
    <AuthenticatedLayout>
      <PageHeading
        eyebrow={t('library', lang)}
        title={t('books', lang)}
        detail={lang === 'am' ? 'ለጥናትዎ ትክክለኛውን መጽሐፍ ያግኙ።' : 'Find the right book for your next hour of study.'}
        action={
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
            <button
              onClick={() => setViewMode('store')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === 'store' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="button-view-shelf"
            >
              <Library size={15} /> Store Shelf
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="button-view-grid"
            >
              <LayoutGrid size={15} /> Grid
            </button>
          </div>
        }
      />

      <div className="mb-8 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1fr_180px_150px]">
        <label className="relative block">
          <Search size={17} className="absolute left-3 top-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`${t('search', lang)} books, authors…`}
            data-testid="input-book-search"
            className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
          />
          {query.isFetching && !query.isLoading && (
            <LoaderCircle size={16} className="absolute right-3 top-3.5 animate-spin text-muted-foreground" />
          )}
        </label>
        <select value={category} onChange={e => setCategory(e.target.value)} data-testid="select-book-category" className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none">
          <option value="">{lang === 'am' ? 'ሁሉም ምድቦች' : 'All categories'}</option>
          {categoriesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)} data-testid="select-book-type" className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none">
          <option value="">All formats</option>
          <option value="hardcopy">Hardcopy</option>
          <option value="softcopy">Softcopy</option>
        </select>
      </div>

      {query.isError ? (
        <ErrorState retry={() => query.refetch()} />
      ) : (query.isLoading && !query.data) ? (
        <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-44 sm:h-72 rounded-xl sm:rounded-2xl" />)}
        </div>
      ) : books.length ? (
        viewMode === 'store' ? (
          <div className="space-y-8 sm:space-y-10">
            {category || search ? (
              <div>
                <div className="mb-3 sm:mb-4 flex items-center justify-between">
                  <h3 className="font-serif text-lg sm:text-2xl font-bold text-foreground">
                    {category || 'Search Results'}
                  </h3>
                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                    {books.length} {books.length === 1 ? 'book' : 'books'}
                  </span>
                </div>
                <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                  {books.map(book => <ModernBookCard key={book.id} book={book} />)}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="mb-3 sm:mb-4 flex items-center justify-between">
                    <h3 className="font-serif text-lg sm:text-2xl font-bold text-foreground">Popular books</h3>
                    <span className="text-xs sm:text-sm font-semibold text-foreground hover:underline cursor-pointer">
                      View all
                    </span>
                  </div>
                  <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                    {popularBooks.map(book => <ModernBookCard key={book.id} book={book} />)}
                  </div>
                </div>

                {Object.entries(booksByCategory).map(([catName, catBooks]) => (
                  <div key={catName}>
                    <div className="mb-3 sm:mb-4 flex items-center justify-between">
                      <h3 className="font-serif text-lg sm:text-2xl font-bold text-foreground">{catName}</h3>
                      <button
                        onClick={() => setCategory(catName)}
                        className="text-xs sm:text-sm font-semibold text-foreground hover:underline transition"
                      >
                        View all ({catBooks.length})
                      </button>
                    </div>
                    <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                      {catBooks.map(book => <ModernBookCard key={book.id} book={book} />)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {books.map(book => <ModernBookCard key={book.id} book={book} />)}
          </div>
        )
      ) : (
        <EmptyState
          icon={Search}
          title="No books found"
          detail="Try a different title, author, or category."
          action={<Button variant="soft" onClick={() => { setSearch(''); setCategory(''); setType(''); }} data-testid="button-clear-search">Clear filters</Button>}
        />
      )}
    </AuthenticatedLayout>
  );
}

function BookDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { lang } = useLang();
  const book = useGetBook(id);
  const requestsQuery = useListBorrowingRequests();
  const request = useCreateBorrowingRequest();
  const client = useQueryClient();
  const [cancelling, setCancelling] = useState(false);

  if (book.isLoading) return <AuthenticatedLayout><div className="grid gap-6 md:grid-cols-[260px_1fr]"><Skeleton className="h-80" /><div className="grid gap-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-28" /></div></div></AuthenticatedLayout>;
  if (book.isError || !book.data) return <AuthenticatedLayout><ErrorState retry={() => book.refetch()} /></AuthenticatedLayout>;
  const item = book.data;

  const pendingReq = Array.isArray(requestsQuery.data)
    ? requestsQuery.data.find(r => r.book?.id === id && r.status === 'pending')
    : undefined;

  const handleCancelRequest = async () => {
    if (!pendingReq) return;
    if (!window.confirm('Cancel your borrowing request for this book?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/borrowing-requests/${pendingReq.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 404) {
        throw new Error('Failed to cancel request');
      }
      await requestsQuery.refetch();
      await book.refetch();
      void client.invalidateQueries({ queryKey: getListBorrowingRequestsQueryKey() });
      void client.invalidateQueries({ queryKey: getListBooksQueryKey() });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not cancel request');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <Link href="/member/books" data-testid="link-back-books" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={16} /> {t('books', lang)}
      </Link>
      <div className="grid gap-10 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr]">
        <div>
          <BookCover book={item} large />
        </div>
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            {item.type !== 'softcopy' && (
              <Status tone={item.available > 0 ? 'good' : 'bad'}>
                {item.available > 0 ? `${item.available} available` : 'Currently unavailable'}
              </Status>
            )}
            <Status>{item.type}</Status>
            {pendingReq && <Status tone="warn">Request pending</Status>}
          </div>
          <h1 className="mt-3 font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-snug">{item.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">by {item.author}</p>
          <div className="mt-8 grid gap-5 border-y border-border py-6 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Category</div>
              <div className="mt-1 font-semibold">{item.category}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Published</div>
              <div className="mt-1 font-semibold">{item.year ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{item.type === 'softcopy' ? 'Format' : 'Copies'}</div>
              <div className="mt-1 font-semibold">{item.type === 'softcopy' ? 'Digital (Softcopy)' : `${item.available} of ${item.total}`}</div>
            </div>
          </div>
          <p className="mt-7 max-w-2xl leading-7 text-muted-foreground">{item.description}</p>
          <div className="mt-9 flex flex-wrap gap-3 items-center">
            {item.type === 'softcopy' ? (
              item.fileUrl ? (
                <>
                  <a
                    href={item.fileUrl.replace(/^\/api\/storage\/api\/storage\//, '/api/storage/')}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="link-read-online-book"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-95"
                  >
                    <Eye size={17} />{lang === 'am' ? 'በመስመር ላይ ክፈት' : 'Open online'}
                  </a>
                  <a
                    href={`${item.fileUrl.replace(/^\/api\/storage\/api\/storage\//, '/api/storage/')}?download=1`}
                    target="_blank"
                    rel="noreferrer"
                    download
                    data-testid="link-download-book"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-bold text-foreground shadow-sm hover:bg-secondary"
                  >
                    <Download size={17} />{lang === 'am' ? 'ያውርዱ' : 'Download file'}
                  </a>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Softcopy file is being prepared.</span>
              )
            ) : (
              <>
                {pendingReq ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/60 dark:border-amber-700/60 px-4 py-2.5 text-xs font-bold text-amber-800 dark:text-amber-200">
                      <Clock3 size={15} /> Request waiting for steward approval
                    </span>
                    <Button
                      variant="danger"
                      disabled={cancelling}
                      onClick={handleCancelRequest}
                      data-testid="button-cancel-request"
                    >
                      <X size={15} /> {cancelling ? 'Cancelling…' : 'Cancel request'}
                    </Button>
                  </div>
                ) : item.available > 0 ? (
                  <Button
                    disabled={request.isPending}
                    onClick={() => {
                      request.mutate(
                        { data: { bookId: item.id } },
                        {
                          onSuccess: () => {
                            requestsQuery.refetch();
                            book.refetch();
                            void client.invalidateQueries({ queryKey: getListBorrowingRequestsQueryKey() });
                            void client.invalidateQueries({ queryKey: getListBooksQueryKey() });
                          },
                        }
                      );
                    }}
                    data-testid="button-request-book"
                  >
                    {request.isPending ? 'Sending…' : <><Bookmark size={17} />{t('request', lang)}</>}
                  </Button>
                ) : (
                  <Button variant="soft" disabled data-testid="button-unavailable">
                    Currently unavailable
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

function MemberNotes() {
  const { lang } = useLang();
  const query = useListStudyNotes();
  const [showForm, setShowForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null);
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const create = useCreateStudyNote();
  const [form, setForm] = useState({ title: '', description: '', type: 'personal', fileUrl: '' });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteFile) {
      setUploadError('Please attach a study note file before submitting.');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const fileUrl = await uploadLibraryFile(noteFile, 'study-note');
      create.mutate({ data: { ...form, type: 'personal', fileUrl } as any }, {
        onSuccess: () => {
          setShowForm(false);
          setNoteFile(null);
          setForm({ title: '', description: '', type: 'personal', fileUrl: '' });
          query.refetch();
        },
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'The attachment could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  const notes = Array.isArray(query.data) ? query.data : [];
  const summerNotes = notes.filter(n => n.type === 'summer');
  const personalNotes = notes.filter(n => n.type === 'personal');

  return (
    <AuthenticatedLayout>
      <PageHeading
        eyebrow={t('membersOnly', lang)}
        title={t('notes', lang)}
        detail="Approved reflections and study guides from the fellowship."
        action={<Button onClick={() => setShowForm(!showForm)} data-testid="button-new-note"><Plus size={17} />Submit a personal note</Button>}
      />

      {showForm && (
        <form className="mb-7 grid gap-4 rounded-2xl border border-primary/20 bg-secondary/35 p-5 md:grid-cols-2" onSubmit={submit}>
          <div className="md:col-span-2 flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold">Submit Personal Study Note</h2>
            <button type="button" onClick={() => setShowForm(false)} data-testid="button-close-member-note-form"><X size={18} /></button>
          </div>
          <Field label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required data-testid="input-note-title" />
          <div className="grid gap-2 text-sm font-semibold">
            <span>Type</span>
            <div className="flex h-11 items-center rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground">
              Personal Study Note
            </div>
            <span className="text-xs font-normal text-muted-foreground">Members can submit personal study notes. Summer study guides are managed and published by administrators.</span>
          </div>
          <div className="md:col-span-2"><TextAreaField label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required data-testid="textarea-note-description" /></div>
          <label className="grid gap-2 text-sm font-semibold md:col-span-2">
            Attach a study note file (required) *
            <input type="file" accept=".pdf,.epub,.doc,.docx,.txt,application/pdf,application/epub+zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={e => setNoteFile(e.target.files?.[0] ?? null)} required className="block h-11 rounded-lg border border-input bg-card px-3 py-2 text-sm font-normal" data-testid="input-note-file-upload" />
            <span className="text-xs font-normal text-muted-foreground">
              {noteFile?.name ?? 'PDF, EPUB, Word document, or text file (no size limit)'}
            </span>
          </label>
          {uploadError && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive md:col-span-2" data-testid="status-note-upload-error">{uploadError}</div>}
          {create.isError && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive md:col-span-2" data-testid="status-note-submit-error">The note could not be submitted. Check your connection and try again.</div>}
          <div className="flex gap-3 md:col-span-2">
            <Button type="submit" disabled={uploading || create.isPending} data-testid="button-submit-note">{uploading ? 'Uploading…' : create.isPending ? 'Submitting…' : 'Submit for review'}</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)} data-testid="button-cancel-note">Cancel</Button>
          </div>
        </form>
      )}

      {query.isLoading ? (
        <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 sm:h-72 rounded-2xl" />)}
        </div>
      ) : notes.length ? (
        <div className="space-y-12">
          {/* Summer Bible Studies section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground mb-0.5">Fellowship Curated</div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground">Summer Bible Studies</h3>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                View all ({summerNotes.length})
              </span>
            </div>
            {summerNotes.length ? (
              <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                {summerNotes.map(note => (
                  <StudyNoteStoreCard key={note.id} note={note} onSelect={setSelectedNote} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground bg-card/40">
                No summer Bible studies have been published yet.
              </div>
            )}
          </div>

          {/* Personal Study Notes section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground mb-0.5">Member Contributions</div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground">Personal Study Notes</h3>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                View all ({personalNotes.length})
              </span>
            </div>
            {personalNotes.length ? (
              <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                {personalNotes.map(note => (
                  <StudyNoteStoreCard key={note.id} note={note} onSelect={setSelectedNote} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground bg-card/40">
                No personal study notes shared yet. Share your reflections using the button above.
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No approved notes yet"
          detail="Your submitted reflections can become part of this shared shelf."
          action={<Button variant="soft" onClick={() => setShowForm(true)} data-testid="button-empty-note">Submit a study note</Button>}
        />
      )}

      {/* Note Detail Dialog / Modal */}
      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground p-6 rounded-2xl">
          {selectedNote && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-secondary text-secondary-foreground border border-border">
                  {selectedNote.type === 'summer' ? 'Summer Bible Study' : 'Personal Study Note'}
                </span>
                <Status tone={selectedNote.status === 'approved' ? 'good' : selectedNote.status === 'pending' ? 'warn' : 'bad'}>
                  {selectedNote.status}
                </Status>
              </div>

              <DialogTitle className="font-serif text-2xl font-bold text-foreground mb-2 leading-tight">
                {selectedNote.title}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mb-4">
                By <span className="text-foreground font-medium">{selectedNote.author}</span>
              </p>

              <div className="rounded-xl bg-secondary/50 border border-border p-4 mb-6 text-sm text-foreground/90 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                {selectedNote.description}
              </div>

              {selectedNote.fileUrl ? (
                <div className="flex flex-col gap-2.5">
                  <a
                    href={selectedNote.fileUrl.replace(/^\/api\/storage\/api\/storage\//, '/api/storage/')}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground text-background hover:opacity-90 py-3 text-sm font-bold shadow-md transition"
                  >
                    <Eye size={16} /> Open online (PDF/Doc)
                  </a>
                  <a
                    href={`${selectedNote.fileUrl.replace(/^\/api\/storage\/api\/storage\//, '/api/storage/')}?download=1`}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-secondary py-3 text-sm font-bold text-foreground shadow-sm transition"
                  >
                    <Download size={16} /> Download document
                  </a>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center">No document attached to this study note.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
function NoteCard({ note }: { note: StudyNote }) { return <StudyNoteStoreCard note={note} onSelect={() => {}} />; }

function MemberBorrowings() {
  const { lang } = useLang();
  const borrowings = useListBorrowings();
  const requestsQuery = useListBorrowingRequests();
  const client = useQueryClient();
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [returningId, setReturningId] = useState<number | null>(null);

  const pendingRequests = Array.isArray(requestsQuery.data)
    ? requestsQuery.data.filter((r) => r.status === 'pending')
    : [];

  const allBorrowings = Array.isArray(borrowings.data) ? borrowings.data : [];
  const activeBorrowings = allBorrowings.filter((b) => b.status === 'borrowed' || (b.status as string) === 'return_pending');
  const returnedBorrowings = allBorrowings.filter((b) => b.status === 'returned');

  const handleCancelRequest = async (requestId: number) => {
    if (!window.confirm('Cancel this borrowing request?')) return;
    setCancellingId(requestId);
    try {
      const res = await fetch(`/api/borrowing-requests/${requestId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 404) {
        throw new Error('Failed to cancel request');
      }
      await requestsQuery.refetch();
      void client.invalidateQueries({ queryKey: getListBorrowingRequestsQueryKey() });
      void client.invalidateQueries({ queryKey: getListBooksQueryKey() });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not cancel request');
    } finally {
      setCancellingId(null);
    }
  };

  const handleReturnBook = async (borrowingId: number) => {
    if (!window.confirm('Submit return for this book? The steward will confirm receipt and restore availability.')) return;
    setReturningId(borrowingId);
    try {
      const res = await fetch(`/api/borrowings/${borrowingId}/return`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit return request');
      }
      await borrowings.refetch();
      void client.invalidateQueries({ queryKey: getListBorrowingsQueryKey() });
      void client.invalidateQueries({ queryKey: getListBooksQueryKey() });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not return book');
    } finally {
      setReturningId(null);
    }
  };

  return (
    <AuthenticatedLayout>
      <PageHeading
        eyebrow={t('membersOnly', lang)}
        title={lang === 'am' ? 'የተዋሷቸው መጻሕፍት' : 'My Books & Borrowings'}
        detail="Keep track of books currently in your care, return records, and pending borrowing requests."
      />
      <div className="max-w-4xl space-y-10">
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2">
                <Clock3 size={20} className="text-amber-500" /> Pending Borrowing Requests
              </h2>
              <span className="text-xs font-mono text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
                {pendingRequests.length} {pendingRequests.length === 1 ? 'request' : 'requests'}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {pendingRequests.map((r) => (
                <div key={r.id} className="flex items-center gap-4 rounded-xl border border-amber-300/40 bg-card p-4 shadow-xs">
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md">
                    <BookCover book={r.book} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-serif font-bold">{r.book.title}</h3>
                    <p className="text-xs text-muted-foreground">Requested {new Date(r.requestedAt).toLocaleDateString()}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Status tone="warn">Pending Steward</Status>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    disabled={cancellingId === r.id}
                    onClick={() => handleCancelRequest(r.id)}
                    className="py-1.5 px-3 text-xs"
                    data-testid={`button-cancel-request-${r.id}`}
                  >
                    <X size={13} /> {cancellingId === r.id ? '…' : 'Cancel'}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Currently in my care (Active Reading) */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2">
              <BookOpen size={20} className="text-primary" /> Currently Reading (In My Care)
            </h2>
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
              {activeBorrowings.length} {activeBorrowings.length === 1 ? 'book' : 'books'}
            </span>
          </div>
          {borrowings.isLoading ? (
            <Skeleton className="h-40" />
          ) : activeBorrowings.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeBorrowings.map((item) => (
                <div key={item.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
                  <div className="h-20 w-14 shrink-0 overflow-hidden rounded-md">
                    <BookCover book={item.book} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-serif font-bold text-base">{item.book.title}</h3>
                    <p className="truncate text-xs text-muted-foreground">by {item.book.author}</p>
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                      <Calendar size={13} className="text-primary" /> Due {item.dueDate}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {(item.status as string) === 'return_pending' ? (
                        <Status tone="warn">Return Pending Steward Confirmation</Status>
                      ) : (
                        <Button
                          variant="soft"
                          disabled={returningId === item.id}
                          onClick={() => handleReturnBook(item.id)}
                          className="py-1 px-3 text-xs"
                          data-testid={`button-return-book-${item.id}`}
                        >
                          <Check size={13} /> {returningId === item.id ? 'Submitting…' : 'Return book'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              You currently have no physical books checked out. When you borrow a book and it is approved, it will appear here.
            </div>
          )}
        </section>

        {/* Returned Books (History) */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2 text-muted-foreground">
              <Check size={20} className="text-emerald-500" /> Returned Books (History)
            </h2>
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
              {returnedBorrowings.length} {returnedBorrowings.length === 1 ? 'book' : 'books'}
            </span>
          </div>
          {borrowings.isLoading ? (
            <Skeleton className="h-28" />
          ) : returnedBorrowings.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {returnedBorrowings.map((item) => (
                <div key={item.id} className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/60 p-4 opacity-85">
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md grayscale-30">
                    <BookCover book={item.book} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-serif font-bold">{item.book.title}</h3>
                    <p className="truncate text-xs text-muted-foreground">by {item.book.author}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.returnedAt ? `Returned on ${new Date(item.returnedAt).toLocaleDateString()}` : 'Returned'}
                    </p>
                    <div className="mt-1.5">
                      <Status tone="good">Returned & Restocked</Status>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 p-5 text-center text-xs text-muted-foreground">
              No previous returned books in your history.
            </div>
          )}
        </section>
      </div>
    </AuthenticatedLayout>
  );
}

function Profile() {
  const { lang } = useLang();
  const user = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } });
  const profile = user.data;

  return (
    <AuthenticatedLayout>
      <PageHeading
        eyebrow={t('membersOnly', lang)}
        title={t('profile', lang)}
        detail="Your fellowship details and account security, kept in one place."
      />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <div className="flex flex-col items-center rounded-2xl border border-border bg-sidebar p-7 text-center text-sidebar-foreground">
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-sidebar-primary font-serif text-4xl font-bold text-sidebar-primary-foreground">
              {profile?.name?.slice(0, 1) ?? 'H'}
            </span>
            <div className="mt-4 font-serif text-xl font-bold">{profile?.name ?? 'Your name'}</div>
            <div className="mt-1 flex items-center gap-2">
              <Status tone="good">Verified Member</Status>
              <span className="text-xs text-sidebar-foreground/60 uppercase font-mono">{profile?.role ?? 'member'}</span>
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-border bg-card p-6">
            <h3 className="font-serif text-lg font-bold border-b border-border/60 pb-2">Member Details</h3>
            {profile ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Email</div>
                  <div className="mt-1 font-semibold">{profile.email}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Phone</div>
                  <div className="mt-1 font-semibold">{profile.phone ?? 'Not added'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Department</div>
                  <div className="mt-1 font-semibold">{profile.department ?? 'Not added'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">School year</div>
                  <div className="mt-1 font-semibold">{profile.schoolYear ?? 'Not added'}</div>
                </div>
              </div>
            ) : (
              <Skeleton className="h-40" />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <h3 className="font-serif text-lg font-bold border-b border-border/60 pb-2 flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" /> Account Security & Settings
          </h3>
          <div className="mt-4">
            <AccountSecuritySection user={profile} />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

function AdminDashboard({ preview = false }: { preview?: boolean }) {
  const { lang } = useLang();
  const summary = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey(), enabled: !preview } });
  const requests = useListBorrowingRequests({ query: { queryKey: getListBorrowingRequestsQueryKey(), enabled: !preview } });
  const notes = useListStudyNotes(undefined, { query: { queryKey: getListStudyNotesQueryKey(), enabled: !preview } });
  const data = preview ? previewAdminSummary : summary.data;
  const requestItems = preview ? previewBorrowingRequests : (Array.isArray(requests.data) ? requests.data : []);
  const action = preview
    ? <Button disabled variant="soft" data-testid="button-preview-add-book"><Plus size={17} />Preview only</Button>
    : <Link href="/admin/books" data-testid="link-admin-add-book" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"><Plus size={17} />{t('newBook', lang)}</Link>;
  return <AuthenticatedLayout admin preview={preview}><PageHeading eyebrow="Steward desk" title={`${t('welcome', lang)}, steward.`} detail="Keep the collection useful, current, and ready for the next question." action={action} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{!preview && summary.isLoading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-36" />) : <><Metric label="Total books" value={data?.books ?? 0} icon={BookOpen} /><Metric label="Approved notes" value={data?.studyNotes ?? 0} icon={FileText} accent="accent" /><Metric label="Active borrowings" value={data?.activeBorrowings ?? 0} icon={Bookmark} /><Metric label="Pending requests" value={data?.pendingRequests ?? requestItems.filter(r => r.status === 'pending').length} icon={Clock3} /></>}</div><div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><h2 className="font-serif text-lg sm:text-xl font-bold">Needs your attention</h2>{preview ? <span className="text-sm font-semibold text-muted-foreground">Sample queue</span> : <Link href="/admin/requests" data-testid="link-dashboard-requests" className="text-sm font-bold text-primary">Review all</Link>}</div>{requestItems.filter(r => r.status === 'pending').slice(0, 3).map(r => <div key={r.id} data-testid={preview ? `row-preview-request-${Math.abs(r.id)}` : undefined} className="mt-4 flex items-center gap-3 rounded-lg bg-secondary/50 p-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Clock3 size={16} /></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{r.book.title}</div><div className="text-xs text-muted-foreground">{r.member.name} · {new Date(r.requestedAt).toLocaleDateString()}</div></div><Status tone="warn">Pending</Status></div>)}{!preview && !requests.isLoading && !requestItems.some(r => r.status === 'pending') && <div className="mt-5"><EmptyState icon={Check} title="All clear for now" detail="New requests will appear here." /></div>}</section><section className="rounded-2xl bg-primary p-7 text-primary-foreground"><ShieldCheck size={25} /><h2 className="mt-8 font-serif text-xl sm:text-2xl font-bold">A healthy shelf is a living one.</h2><p className="mt-4 max-w-md leading-7 text-primary-foreground/75">Review requests, welcome new members, and keep study notes moving from submission to shared wisdom.</p><div className="mt-8 flex flex-wrap gap-3">{preview ? <><Button disabled variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground" data-testid="button-preview-moderate">Moderate notes</Button><Button disabled variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground" data-testid="button-preview-members">View members</Button></> : <><Link href="/admin/notes" data-testid="link-dashboard-notes" className="rounded-lg bg-primary-foreground px-4 py-2.5 text-sm font-bold text-primary">Moderate notes</Link><Link href="/admin/members" data-testid="link-dashboard-members" className="rounded-lg border border-primary-foreground/30 px-4 py-2.5 text-sm font-bold">View members</Link></>}</div></section></div></AuthenticatedLayout>;
}

function AdminBooks() {
  const query = useListBooks();
  const cats = useListCategories();
  const create = useCreateBook();
  const update = useUpdateBook();
  const del = useDeleteBook();
  const client = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const saveError = create.error instanceof Error
    ? create.error.message
    : update.error instanceof Error
      ? update.error.message
      : '';
  const empty = { title: '', author: '', type: 'hardcopy', category: '', description: '', total: '1', year: '', coverUrl: '', fileUrl: '' };
  const [form, setForm] = useState(empty);

  const handleUpdateAvailability = async (bookId: number, target: number, total: number) => {
    const clamped = Math.max(0, Math.min(total, target));
    try {
      const res = await fetch(`/api/books/${bookId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: clamped }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update availability');
      await query.refetch();
      void client.invalidateQueries({ queryKey: getListBooksQueryKey() });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not update availability');
    }
  };

  const openForm = (book?: Book) => {
    setEditing(book ?? null);
    setCoverFile(null);
    setBookFile(null);
    setUploadError('');
    setForm(book ? {
      title: book.title,
      author: book.author,
      type: book.type,
      category: book.category,
      description: book.description,
      total: String(book.total),
      year: book.year ? String(book.year) : '',
      coverUrl: book.coverUrl ?? '',
      fileUrl: book.fileUrl ?? '',
    } : empty);
    setFormOpen(true);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    setUploading(true);
    try {
      if (form.type === 'softcopy' && !bookFile && !form.fileUrl) {
        throw new Error('A softcopy book requires a file. Please upload the book file (PDF, EPUB, or Word document) before saving.');
      }
      const coverUrl = coverFile ? await uploadLibraryFile(coverFile, 'cover') : form.coverUrl || null;
      const fileUrl = form.type === 'softcopy'
        ? (bookFile ? await uploadLibraryFile(bookFile, 'book') : form.fileUrl || null)
        : null;
      const data = {
        ...form,
        total: Number(form.total),
        year: form.year ? Number(form.year) : null,
        coverUrl,
        fileUrl,
        featured: editing?.featured ?? false,
      } as any;
      const done = () => {
        setFormOpen(false);
        setCoverFile(null);
        setBookFile(null);
        query.refetch();
      };
      if (editing) update.mutate({ id: editing.id, data }, { onSuccess: done });
      else create.mutate({ data }, { onSuccess: done });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'The selected file could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };
  const busy = uploading || create.isPending || update.isPending;
  return <AuthenticatedLayout admin>
    <PageHeading eyebrow="Collection management" title="Books" detail="Add, update, and care for the collection." action={<Button onClick={() => openForm()} data-testid="button-add-book"><Plus size={17} />Add a book</Button>} />
    {formOpen && <form onSubmit={submit} className="mb-7 grid gap-4 rounded-2xl border border-primary/20 bg-secondary/35 p-5 md:grid-cols-2">
      <div className="md:col-span-2 flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold">{editing ? 'Edit book' : 'Add a book'}</h2>
        <button type="button" onClick={() => setFormOpen(false)} data-testid="button-close-book-form"><X size={18} /></button>
      </div>
      <Field label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required data-testid="input-book-title" />
      <Field label="Author" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} required data-testid="input-book-author" />
      <label className="grid gap-2 text-sm font-semibold">Format
        <select value={form.type} onChange={e => { setForm({ ...form, type: e.target.value }); if (e.target.value !== 'softcopy') setBookFile(null); }} className="h-11 rounded-lg border border-input bg-card px-3" data-testid="select-admin-book-type">
          <option value="hardcopy">Hardcopy</option><option value="softcopy">Softcopy</option>
        </select>
        <span className="text-xs font-normal text-muted-foreground">Choose Softcopy to attach the full book as a PDF or eBook file.</span>
      </label>
      <label className="grid gap-2 text-sm font-semibold">Category
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required className="h-11 rounded-lg border border-input bg-card px-3" data-testid="select-admin-book-category">
          <option value="">Choose a category</option>{(Array.isArray(cats.data) ? cats.data : []).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </label>
      <Field label="Total copies" type="number" min="0" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} required data-testid="input-book-total" />
      <Field label="Year" type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} data-testid="input-book-year" />
      <div className="md:col-span-2"><TextAreaField label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required data-testid="textarea-book-description" /></div>
      <label className="grid gap-2 text-sm font-semibold">Cover image
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setCoverFile(e.target.files?.[0] ?? null)} className="block h-11 rounded-lg border border-input bg-card px-3 py-2 text-sm font-normal" data-testid="input-book-cover-upload" />
        <span className="text-xs font-normal text-muted-foreground">{coverFile?.name ?? (form.coverUrl ? 'Current cover will be kept unless replaced.' : 'PNG, JPG, or WebP · up to 50 MB')}</span>
        {(coverFile || form.coverUrl) && <div className="mt-1 flex items-center gap-3"><img src={coverFile ? URL.createObjectURL(coverFile) : form.coverUrl.replace(/^\/api\/storage\/api\/storage\//, '/api/storage/')} alt="Cover preview" className="h-16 w-12 rounded object-cover border border-border" /><span className="text-xs text-muted-foreground">Cover preview</span></div>}
      </label>
      {form.type === 'softcopy' && <label className="grid gap-2 text-sm font-semibold">Book file
        <input type="file" accept=".pdf,application/pdf,.epub,application/epub+zip,.doc,application/msword,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required={!form.fileUrl} onChange={e => setBookFile(e.target.files?.[0] ?? null)} className="block h-11 rounded-lg border border-input bg-card px-3 py-2 text-sm font-normal" data-testid="input-book-file-upload" />
        <span className="text-xs font-normal text-muted-foreground">{bookFile?.name ?? (form.fileUrl ? 'A softcopy is already attached; select a file to replace it.' : 'PDF, EPUB, or Word document (no file size limit)')}</span>
      </label>}
      {(uploadError || saveError) && <div className="md:col-span-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" data-testid="status-book-upload-error">{uploadError || saveError}</div>}
      <div className="flex gap-3 md:col-span-2">
        <Button type="submit" className="min-w-28 whitespace-nowrap" disabled={busy} data-testid="button-save-book">{busy ? 'Uploading & saving…' : 'Save book'}</Button>
        <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} data-testid="button-cancel-book">Cancel</Button>
      </div>
    </form>}
    {query.isLoading ? <div className="grid gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div> : query.data?.length ? <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="hidden grid-cols-[1fr_160px_130px_110px_90px] gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:grid"><span>Title</span><span>Category</span><span>Format</span><span>Availability</span><span /></div>
      {query.data.map(book => <div key={book.id} className="grid gap-3 border-b border-border p-4 last:border-0 sm:grid-cols-[1fr_160px_130px_110px_90px] sm:items-center sm:gap-4 sm:px-5">
        <div className="flex items-center gap-3"><div className="h-12 w-9 shrink-0 overflow-hidden rounded"><BookCover book={book} className="h-full w-full" /></div><div className="min-w-0"><div className="truncate font-serif font-bold">{book.title}</div><div className="truncate text-xs text-muted-foreground">{book.author}</div></div></div>
        <span className="text-sm text-muted-foreground">{book.category}</span><span className="text-xs font-mono uppercase">{book.type}</span>{book.type === 'softcopy' ? <span className="text-xs font-mono text-muted-foreground">—</span> : <div className="flex items-center gap-1.5"><button type="button" onClick={() => handleUpdateAvailability(book.id, book.available - 1, book.total)} disabled={book.available <= 0} className="h-6 w-6 rounded border border-border bg-secondary hover:bg-secondary/80 text-xs font-bold disabled:opacity-30 flex items-center justify-center cursor-pointer shadow-xs" title="Decrease available copies (-1)">-</button><Status tone={book.available ? 'good' : 'bad'}>{book.available}/{book.total}</Status><button type="button" onClick={() => handleUpdateAvailability(book.id, book.available + 1, book.total)} disabled={book.available >= book.total} className="h-6 w-6 rounded border border-border bg-secondary hover:bg-secondary/80 text-xs font-bold disabled:opacity-30 flex items-center justify-center cursor-pointer shadow-xs" title="Increase available copies (+1)">+</button></div>}
        <div className="flex gap-1">{book.type === 'softcopy' && book.fileUrl && <><a href={book.fileUrl.replace(/^\/api\/storage\/api\/storage\//, '/api/storage/')} target="_blank" rel="noreferrer" title="Open online" className="rounded p-2 text-primary hover:bg-primary/10" data-testid={`link-book-open-${book.id}`}><Eye size={16} /></a><a href={`${book.fileUrl.replace(/^\/api\/storage\/api\/storage\//, '/api/storage/')}?download=1`} target="_blank" rel="noreferrer" download title="Download file" className="rounded p-2 text-primary hover:bg-primary/10" data-testid={`link-book-file-${book.id}`}><Download size={16} /></a></>}<button onClick={() => openForm(book)} title="Edit book" data-testid={`button-edit-book-${book.id}`} className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-primary"><Pencil size={16} /></button><button onClick={() => { if (window.confirm('Remove this book from the collection?')) del.mutate({ id: book.id }, { onSuccess: () => client.invalidateQueries({ queryKey: getListBooksQueryKey() }) }); }} title="Delete book" data-testid={`button-delete-book-${book.id}`} className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X size={16} /></button></div>
      </div>)}
    </div> : <EmptyState icon={BookOpen} title="Your collection is empty" detail="Add the first book to give members somewhere to begin." action={<Button onClick={() => openForm()} data-testid="button-empty-add-book"><Plus size={17} />Add a book</Button>} />}
  </AuthenticatedLayout>;
}

function AdminCategories() {
  const query = useListCategories();
  const create = useCreateCategory();
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState('');
  const requestError = create.error instanceof Error ? create.error.message : '';
  const errorMessage = requestError.includes('HTTP 401')
    ? 'Your administrator sign-in expired. Sign in again, then try adding the category.'
    : requestError.includes('HTTP 403')
      ? 'Only an administrator can add categories.'
      : requestError || 'The category could not be added. Please try again.';

  return <AuthenticatedLayout admin>
    <PageHeading eyebrow="Collection management" title="Categories" detail="Give members clear paths through the shelves." />
    <form className="mb-7 flex max-w-xl flex-wrap gap-3" onSubmit={e => {
      e.preventDefault();
      const categoryName = name.trim();
      if (categoryName.length < 2) {
        setValidationError('Enter a category name with at least two characters.');
        return;
      }
      setValidationError('');
      create.mutate({ data: { name: categoryName } }, {
        onSuccess: () => {
          setName('');
          void client.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        },
      });
    }}>
      <input value={name} onChange={e => { setName(e.target.value); setValidationError(''); }} placeholder="New category name" required minLength={2} maxLength={80} data-testid="input-category-name" className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3.5 text-sm outline-none focus:ring-4 focus:ring-primary/15" />
      <Button type="submit" disabled={create.isPending} data-testid="button-add-category"><Plus size={17} />{t('newCategory', useLang().lang)}</Button>
      {(validationError || create.isError) && <p role="alert" className="w-full text-sm text-destructive">{validationError || errorMessage}</p>}
    </form>
    {query.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div> : query.data?.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{query.data.map(category => <div key={category.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-5"><div><div className="font-serif text-lg font-bold">{category.name}</div><div className="mt-1 text-xs text-muted-foreground">{category.bookCount} books</div></div><FolderOpen className="text-primary/50" size={20} /></div>)}</div> : <EmptyState icon={FolderOpen} title="No categories yet" detail="Add a category to make the library easier to navigate." />}
  </AuthenticatedLayout>;
}

function AdminMembers() {
  const user = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } });
  return <AuthenticatedLayout admin><PageHeading eyebrow="Community" title="Members" detail="A quick view of the people learning with this library." /><div className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-xl font-bold text-primary">{user.data?.name?.slice(0, 1) ?? 'H'}</span><div><div className="font-serif text-xl font-bold">{user.data?.name ?? 'Current member'}</div><div className="text-sm text-muted-foreground">{user.data?.email ?? 'Member directory is available to administrators.'}</div></div><Status tone="good">Active</Status></div><div className="mt-7 grid gap-4 border-t border-border pt-6 sm:grid-cols-3"><div><div className="text-xs uppercase tracking-wider text-muted-foreground">Role</div><div className="mt-1 font-semibold">{user.data?.role ?? 'member'}</div></div><div><div className="text-xs uppercase tracking-wider text-muted-foreground">Department</div><div className="mt-1 font-semibold">{user.data?.department ?? 'Not set'}</div></div><div><div className="text-xs uppercase tracking-wider text-muted-foreground">School year</div><div className="mt-1 font-semibold">{user.data?.schoolYear ?? 'Not set'}</div></div></div></div><div className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground"><Users size={18} className="mb-2 text-primary" />Member directory actions will appear here as the stewardship API grows.</div></AuthenticatedLayout>;
}

function AdminRequests() {
  const query = useListBorrowingRequests();
  const borrowingsQuery = useListBorrowings();
  const reject = useRejectBorrowingRequest();
  const client = useQueryClient();
  const [approvingRequest, setApprovingRequest] = useState<BorrowingRequest | null>(null);
  const [loanDays, setLoanDays] = useState<number>(14);
  const [approving, setApproving] = useState<boolean>(false);
  const [approveError, setApproveError] = useState<string>('');
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const activeLoans = Array.isArray(borrowingsQuery.data)
    ? borrowingsQuery.data.filter((b) => b.status === 'borrowed' || (b.status as string) === 'return_pending')
    : [];

  const refresh = () => {
    query.refetch();
    borrowingsQuery.refetch();
    void client.invalidateQueries({ queryKey: getListBorrowingRequestsQueryKey() });
    void client.invalidateQueries({ queryKey: getListBorrowingsQueryKey() });
    void client.invalidateQueries({ queryKey: getListBooksQueryKey() });
  };

  const handleConfirmReturn = async (borrowingId: number) => {
    if (!window.confirm('Confirm return for this book? This will mark the record as returned and automatically restore the book availability (+1) for other members.')) return;
    setConfirmingId(borrowingId);
    try {
      const res = await fetch(`/api/borrowings/${borrowingId}/confirm-return`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to confirm return');
      }
      await borrowingsQuery.refetch();
      void client.invalidateQueries({ queryKey: getListBorrowingsQueryKey() });
      void client.invalidateQueries({ queryKey: getListBooksQueryKey() });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error confirming return');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleOpenApproveModal = (req: BorrowingRequest) => {
    setApprovingRequest(req);
    setLoanDays(14);
    setApproveError('');
  };

  const handleConfirmApproval = async () => {
    if (!approvingRequest) return;
    const days = Math.max(1, Math.min(365, Number(loanDays) || 14));
    setApproving(true);
    setApproveError('');
    try {
      const res = await fetch(`/api/borrowing-requests/${approvingRequest.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to approve borrowing request');
      }
      setApprovingRequest(null);
      refresh();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : 'Error approving request');
    } finally {
      setApproving(false);
    }
  };

  const getDueDateString = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + Number(days || 0));
    return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <AuthenticatedLayout admin>
      <PageHeading
        eyebrow="Steward desk"
        title="Borrowing requests"
        detail="Review requests waiting for steward approval and define lending duration."
      />
      {query.isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : query.data?.length ? (
        <div className="grid gap-3">
          {query.data.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 transition shadow-xs"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-primary">
                <BookMarked size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-serif font-bold text-base">{r.book.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-medium text-foreground">{r.member.name}</span> · {r.member.email} · Requested {new Date(r.requestedAt).toLocaleDateString()}
                </div>
              </div>
              <Status tone={r.status === 'approved' ? 'good' : r.status === 'pending' ? 'warn' : 'bad'}>
                {r.status}
              </Status>
              {r.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    variant="soft"
                    onClick={() => handleOpenApproveModal(r)}
                    data-testid={`button-approve-request-${r.id}`}
                  >
                    <Check size={15} /> Approve loan
                  </Button>
                  <Button
                    variant="danger"
                    disabled={reject.isPending}
                    onClick={() =>
                      reject.mutate(
                        { id: r.id, data: { reason: 'Not available at this time.' } },
                        { onSuccess: refresh }
                      )
                    }
                    data-testid={`button-reject-request-${r.id}`}
                  >
                    <X size={15} /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Check} title="No borrowing requests" detail="The queue is clear." />
      )}

      {/* Admin Approval with Reading Duration Dialog */}
      <Dialog open={!!approvingRequest} onOpenChange={(open) => !open && setApprovingRequest(null)}>
        <DialogContent className="sm:max-w-md bg-card border border-border text-foreground p-6 rounded-2xl shadow-2xl">
          <DialogTitle className="font-serif text-xl font-bold flex items-center gap-2">
            <Calendar size={20} className="text-primary" /> Set Loan Period & Approve
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Specify the reading time limit (in days) granted to the member before this book must be returned.
          </DialogDescription>

          {approvingRequest && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-secondary/30 p-3.5 text-xs space-y-1">
                <div className="font-serif font-bold text-sm text-foreground">{approvingRequest.book.title}</div>
                <div className="text-muted-foreground">Borrower: <span className="text-foreground font-medium">{approvingRequest.member.name}</span> ({approvingRequest.member.email})</div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Loan Duration (Days to Read)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={loanDays}
                    onChange={(e) => setLoanDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                    className="h-11 w-28 rounded-lg border border-input bg-card px-3 text-center text-base font-bold outline-none focus:ring-2 focus:ring-primary"
                    data-testid="input-loan-days"
                  />
                  <span className="text-sm font-medium text-foreground">days</span>
                </div>

                {/* Quick preset chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[7, 14, 21, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setLoanDays(d)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${
                        loanDays === d
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-border hover:bg-secondary'
                      }`}
                    >
                      {d} days {d === 7 ? '(1 wk)' : d === 14 ? '(2 wks)' : d === 21 ? '(3 wks)' : '(1 mo)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/10 p-3.5 flex items-center justify-between text-xs">
                <div className="text-muted-foreground">Calculated Due Date:</div>
                <div className="font-mono font-bold text-foreground text-sm flex items-center gap-1.5">
                  <Clock3 size={15} className="text-primary" />
                  {getDueDateString(loanDays)}
                </div>
              </div>

              {approveError && (
                <p role="alert" className="text-xs text-destructive font-medium">
                  {approveError}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setApprovingRequest(null)}
                  disabled={approving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmApproval}
                  disabled={approving || loanDays < 1}
                  data-testid="button-confirm-approve-loan"
                >
                  <Check size={16} />
                  {approving ? 'Approving…' : `Confirm (${loanDays} days)`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Active Book Loans & Steward Return Confirmation */}
      <div className="mt-12 pt-8 border-t border-border">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2">
              <BookOpen size={20} className="text-primary" /> Active Loans & Return Confirmation
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Confirm receipt when a member returns a book to immediately restock it for other members.
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
            {activeLoans.length} active
          </span>
        </div>

        {borrowingsQuery.isLoading ? (
          <Skeleton className="h-32" />
        ) : activeLoans.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeLoans.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md">
                  <BookCover book={item.book} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-serif font-bold text-base">{item.book.title}</h3>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Borrower: <span className="font-medium text-foreground">{(item as any).member?.name}</span> ({(item as any).member?.email})
                  </div>
                  <div className="text-xs font-mono text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Clock3 size={13} className="text-primary" /> Due {item.dueDate}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {(item.status as string) === 'return_pending' && (
                      <Status tone="warn">Member Reported Returned</Status>
                    )}
                    <Button
                      variant="soft"
                      disabled={confirmingId === item.id}
                      onClick={() => handleConfirmReturn(item.id)}
                      className="py-1 px-3 text-xs"
                      data-testid={`button-confirm-return-${item.id}`}
                    >
                      <Check size={14} /> {confirmingId === item.id ? 'Restocking…' : 'Confirm Return (+1 Restock)'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No active book loans. All borrowed books have been returned and restocked.
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

function AdminNotes() {
  const query = useListStudyNotes();
  const approve = useApproveStudyNote();
  const reject = useRejectStudyNote();
  const remove = useDeleteStudyNote();
  const create = useCreateStudyNote();
  const client = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', description: '', type: 'summer', fileUrl: '' });

  const refresh = () => {
    query.refetch();
    void client.invalidateQueries({ queryKey: getListStudyNotesQueryKey() });
    setShowForm(false);
    setNoteFile(null);
    setUploadError('');
    setForm({ title: '', description: '', type: 'summer', fileUrl: '' });
  };

  const handleDeleteNote = async (id: number) => {
    if (!window.confirm('Delete this study note and its attached document permanently?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/study-notes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 404) {
        throw new Error('Failed to delete study note');
      }
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete study note');
    } finally {
      setDeletingId(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteFile) {
      setUploadError('Please attach a study note document (PDF, EPUB, Word, or text).');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const fileUrl = await uploadLibraryFile(noteFile, 'study-note');
      create.mutate({ data: { ...form, fileUrl } as any }, {
        onSuccess: refresh,
        onError: (err) => setUploadError(err instanceof Error ? err.message : 'Could not publish study note.'),
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'The file could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  return <AuthenticatedLayout admin>
    <PageHeading
      eyebrow="Steward desk"
      title="Study-note moderation & Summer studies"
      detail="Publish official summer studies and moderate member submissions."
      action={<Button onClick={() => setShowForm(!showForm)} data-testid="button-admin-add-note"><Plus size={17} />{showForm ? 'Close form' : 'Add summer study note'}</Button>}
    />
    {showForm && <form className="mb-7 grid gap-4 rounded-2xl border border-primary/20 bg-secondary/35 p-5 md:grid-cols-2" onSubmit={submit}>
      <div className="md:col-span-2 flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold">Publish Summer Study Note</h2>
        <button type="button" onClick={() => setShowForm(false)} data-testid="button-close-admin-note-form"><X size={18} /></button>
      </div>
      <Field label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. 2026 Fellowship Summer Bible Study" required data-testid="input-admin-note-title" />
      <label className="grid gap-2 text-sm font-semibold">Type
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="h-11 rounded-lg border border-input bg-card px-3" data-testid="select-admin-note-type">
          <option value="summer">Summer Bible Study (Admin only)</option>
          <option value="personal">Personal Study</option>
        </select>
        <span className="text-xs font-normal text-muted-foreground">Summer study notes are published directly for member download.</span>
      </label>
      <div className="md:col-span-2"><TextAreaField label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the study objectives, scripture references, or summer guide..." required data-testid="textarea-admin-note-description" /></div>
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">
        Attach study document (PDF, EPUB, Word, or text file) *
        <input type="file" accept=".pdf,.epub,.doc,.docx,.txt,application/pdf,application/epub+zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={e => setNoteFile(e.target.files?.[0] ?? null)} required className="block h-11 rounded-lg border border-input bg-card px-3 py-2 text-sm font-normal" data-testid="input-admin-note-file" />
        <span className="text-xs font-normal text-muted-foreground">{noteFile?.name ?? 'PDF, EPUB, Word document, or text file (no size limit)'}</span>
      </label>
      {uploadError && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive md:col-span-2" data-testid="status-admin-note-error">{uploadError}</div>}
      <div className="flex gap-3 md:col-span-2">
        <Button type="submit" disabled={uploading || create.isPending} data-testid="button-publish-admin-note">{uploading ? 'Uploading…' : create.isPending ? 'Publishing…' : 'Publish study note'}</Button>
        <Button type="button" variant="ghost" onClick={() => setShowForm(false)} data-testid="button-cancel-admin-note">Cancel</Button>
      </div>
    </form>}
    {query.isLoading ? <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40" />)}</div> : query.data?.length ? <div className="grid gap-4 md:grid-cols-2">{query.data.map(note => <div key={note.id} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><Status tone={note.status === 'approved' ? 'good' : note.status === 'pending' ? 'warn' : 'bad'}>{note.status}</Status><span className="text-xs text-muted-foreground">{new Date(note.submittedAt).toLocaleDateString()}</span></div><h3 className="mt-4 font-serif text-xl font-bold">{note.title}</h3><p className="mt-1 text-xs text-muted-foreground">submitted by {note.author} · <span className="uppercase font-mono">{note.type}</span></p><p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{note.description}</p>{note.fileUrl && <div className="mt-3"><a href={note.fileUrl.replace(/^\/api\/storage\/api\/storage\//, '/api/storage/')} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline" data-testid={`link-admin-note-file-${note.id}`}><FileText size={14} /> Review attached PDF / document <ArrowUpRight size={12} /></a></div>}<div className="mt-5 flex flex-wrap gap-2">{note.status === 'pending' && <><Button variant="soft" disabled={approve.isPending} onClick={() => approve.mutate({ id: note.id }, { onSuccess: refresh })} data-testid={`button-approve-note-${note.id}`}><Check size={15} />Approve</Button><Button variant="danger" disabled={reject.isPending} onClick={() => reject.mutate({ id: note.id, data: { reason: 'Needs another review before sharing.' } }, { onSuccess: refresh })} data-testid={`button-reject-note-${note.id}`}><X size={15} />Reject</Button></>}<Button variant="danger" disabled={deletingId === note.id} onClick={() => handleDeleteNote(note.id)} data-testid={`button-delete-note-${note.id}`}>{deletingId === note.id ? <LoaderCircle size={15} className="animate-spin" /> : <X size={15} />}Delete</Button></div></div>)}</div> : <EmptyState icon={FileText} title="No notes to review" detail="New member submissions and summer study materials will appear here." />}
  </AuthenticatedLayout>;
}

function AdminSettings() {
  const { lang } = useLang(); const [saved, setSaved] = useState(false); const [name, setName] = useState('LOGOS Library'); const [email, setEmail] = useState('library@logos-library.edu');
  return <AuthenticatedLayout admin><PageHeading eyebrow={t('settings', lang)} title={t('settings', lang)} detail="The small details that keep the library trustworthy." /><form className="grid max-w-2xl gap-5 rounded-2xl border border-border bg-card p-6" onSubmit={e => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2400); }}><div className="flex items-center gap-3 border-b border-border pb-5"><Settings className="text-primary" /><div><div className="font-serif text-xl font-bold">Library identity</div><div className="text-sm text-muted-foreground">Shown across member communications.</div></div></div><Field label="Library name" value={name} onChange={e => setName(e.target.value)} data-testid="input-library-name" /><Field label="Contact email" type="email" value={email} onChange={e => setEmail(e.target.value)} data-testid="input-library-email" /><div className="flex items-center gap-3"><Button type="submit" data-testid="button-save-settings">{saved ? <><Check size={16} />Saved</> : t('save', lang)}</Button>{saved && <span className="text-sm text-emerald-700">Your settings are up to date.</span>}</div></form></AuthenticatedLayout>;
}

interface QuestionItem {
  id: number;
  memberId: number;
  memberName: string;
  memberEmail: string;
  category: string;
  question: string;
  details?: string | null;
  answer?: string | null;
  answeredBy?: string | null;
  status: 'pending' | 'answered';
  createdAt: string;
  answeredAt?: string | null;
}

function useListQuestions() {
  return useQuery<QuestionItem[]>({
    queryKey: ['questions'],
    queryFn: async () => {
      const res = await fetch('/api/questions', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load questions');
      return res.json();
    },
  });
}

function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { category?: string; question: string; details?: string }) => {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit question');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

function useReplyQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, answer }: { id: number; answer: string }) => {
      const res = await fetch(`/api/questions/${id}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answer }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit answer');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete question');
      }
      return res.status === 204 ? null : res.json().catch(() => null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

function MemberQuestions() {
  const currentUser = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } });
  const questionsQuery = useListQuestions();
  const createQuestion = useCreateQuestion();
  const deleteQuestion = useDeleteQuestion();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [form, setForm] = useState({
    question: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const questions = Array.isArray(questionsQuery.data) ? questionsQuery.data : [];
  const myQuestions = questions.filter(q => q.memberId === currentUser.data?.id);
  const answeredQuestions = questions.filter(q => q.status === 'answered');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question.trim()) {
      setErrorMsg('Please write your question.');
      return;
    }
    setErrorMsg('');
    createQuestion.mutate({
      question: form.question.trim(),
      category: 'Bible Question',
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ question: '' });
      },
      onError: (err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Could not submit your question.');
      },
    });
  };

  const displayedList = activeTab === 'my' ? myQuestions : answeredQuestions;

  return (
    <AuthenticatedLayout>
      <PageHeading
        eyebrow="Fellowship Guidance & Bible Study"
        title="Bible & Spiritual Q&A"
        detail="Have a question about a scripture passage, faith, or fellowship life? Ask our stewards and mentors."
        action={
          <Button onClick={() => setDialogOpen(true)} data-testid="button-ask-question">
            <Plus size={17} /> Ask a question
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('my')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition touch-target ${
            activeTab === 'my'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground border border-border'
          }`}
          data-testid="tab-my-questions"
        >
          <HelpCircle size={16} /> My Questions
          <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs text-inherit">
            {myQuestions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition touch-target ${
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground border border-border'
          }`}
          data-testid="tab-all-questions"
        >
          <MessageSquare size={16} /> Answered Fellowship Q&A
          <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs text-inherit">
            {answeredQuestions.length}
          </span>
        </button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border border-border p-6 rounded-2xl shadow-2xl">
          <DialogTitle className="font-serif text-2xl font-bold">Ask a Question</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Your question will be sent directly to the fellowship stewards. Once answered, you'll find the response here.
          </DialogDescription>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <TextAreaField
              label="Question"
              placeholder="Include any verses, specific situations, or background details..."
              value={form.question}
              onChange={e => setForm({ question: e.target.value })}
              required
              data-testid="textarea-question-text"
            />

            {errorMsg && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" data-testid="status-question-error">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={createQuestion.isPending}
                data-testid="button-submit-question"
              >
                {createQuestion.isPending ? 'Sending…' : (
                  <>
                    <Send size={15} /> Send to Stewards
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {questionsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : displayedList.length > 0 ? (
        <div className="space-y-4">
          {displayedList.map(q => (
            <div
              key={q.id}
              className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm transition hover:shadow-md"
              data-testid={`card-question-${q.id}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {q.category || 'Bible Q&A'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Asked {new Date(q.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Status tone={q.status === 'answered' ? 'good' : 'warn'}>
                    {q.status === 'answered' ? 'Answered' : 'Waiting for Steward Reply'}
                  </Status>
                  {q.memberId === currentUser.data?.id && (
                    <button
                      type="button"
                      disabled={deleteQuestion.isPending}
                      onClick={() => {
                        if (window.confirm('Delete this question and answer history?')) {
                          deleteQuestion.mutate(q.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition shadow-sm"
                      title="Delete question and answer history"
                      data-testid={`button-delete-question-${q.id}`}
                    >
                      <X size={14} /> Delete
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">
                  {q.question}
                </h3>
                {q.details && (
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {q.details}
                  </p>
                )}
              </div>

              {q.status === 'answered' && q.answer && (
                <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <ShieldCheck size={16} /> Answer from Steward ({q.answeredBy ?? 'Fellowship Steward'})
                    {q.answeredAt && (
                      <span className="font-normal text-muted-foreground">
                        · {new Date(q.answeredAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm sm:text-base text-foreground/90 whitespace-pre-line leading-relaxed font-sans">
                    {q.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={HelpCircle}
          title={activeTab === 'my' ? 'No questions submitted yet' : 'No answered Q&A yet'}
          detail={
            activeTab === 'my'
              ? 'Have something on your mind? Submit a question and our stewards will provide a biblical answer.'
              : 'Answered fellowship questions and scripture insights will appear here.'
          }
          action={
            activeTab === 'my' ? (
              <Button onClick={() => setDialogOpen(true)} data-testid="button-empty-ask-question">
                <Plus size={17} /> Ask a question
              </Button>
            ) : undefined
          }
        />
      )}
    </AuthenticatedLayout>
  );
}

function AdminQuestions() {
  const questionsQuery = useListQuestions();
  const replyQuestion = useReplyQuestion();
  const deleteQuestion = useDeleteQuestion();

  const [activeTab, setActiveTab] = useState<'pending' | 'answered'>('pending');
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');

  const questions = Array.isArray(questionsQuery.data) ? questionsQuery.data : [];
  const pending = questions.filter(q => q.status === 'pending');
  const answered = questions.filter(q => q.status === 'answered');

  const openReply = (q: QuestionItem) => {
    setSelectedQuestion(q);
    setReplyText(q.answer || '');
    setReplyError('');
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion) return;
    if (!replyText.trim()) {
      setReplyError('Please write your biblical or spiritual response.');
      return;
    }
    setReplyError('');
    replyQuestion.mutate(
      { id: selectedQuestion.id, answer: replyText },
      {
        onSuccess: () => {
          setSelectedQuestion(null);
          setReplyText('');
          questionsQuery.refetch();
        },
        onError: (err) => {
          setReplyError(err instanceof Error ? err.message : 'Could not submit answer.');
        },
      }
    );
  };

  const displayedList = activeTab === 'pending' ? pending : answered;

  return (
    <AuthenticatedLayout admin>
      <PageHeading
        eyebrow="Steward Desk"
        title="Member Questions & Bible Q&A"
        detail="Guide fellowship members by answering their spiritual and Biblical inquiries."
      />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition touch-target ${
            activeTab === 'pending'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground border border-border'
          }`}
          data-testid="tab-admin-pending-questions"
        >
          <Clock3 size={16} /> Needs Reply
          <span className="rounded-full bg-secondary text-foreground border border-border px-2 py-0.5 text-xs font-bold">
            {pending.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('answered')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition touch-target ${
            activeTab === 'answered'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground border border-border'
          }`}
          data-testid="tab-admin-answered-questions"
        >
          <Check size={16} /> Answered Questions
          <span className="rounded-full bg-secondary text-foreground border border-border px-2 py-0.5 text-xs font-bold">
            {answered.length}
          </span>
        </button>
      </div>

      <Dialog open={!!selectedQuestion} onOpenChange={open => { if (!open) setSelectedQuestion(null); }}>
        <DialogContent className="sm:max-w-xl bg-card border border-border p-6 rounded-2xl shadow-2xl">
          <DialogTitle className="font-serif text-2xl font-bold">
            {selectedQuestion?.answer ? 'Edit Response' : 'Reply to Member Question'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Provide a pastoral, biblically sound answer for {selectedQuestion?.memberName}.
          </DialogDescription>

          {selectedQuestion && (
            <div className="mt-3 rounded-xl bg-secondary/50 p-4 text-sm border border-border/60">
              <div className="text-xs font-semibold text-primary">{selectedQuestion.category} · {selectedQuestion.memberName} ({selectedQuestion.memberEmail})</div>
              <div className="mt-1 font-serif font-bold text-foreground text-base">{selectedQuestion.question}</div>
              {selectedQuestion.details && <div className="mt-1 text-xs text-muted-foreground">{selectedQuestion.details}</div>}
            </div>
          )}

          <form onSubmit={handleSendReply} className="mt-4 space-y-4">
            <TextAreaField
              label="Your Answer / Spiritual Guidance"
              placeholder="Provide scripture references, practical explanation, or words of encouragement..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              required
              rows={6}
              data-testid="textarea-reply-answer"
            />

            {replyError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" data-testid="status-reply-error">
                {replyError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setSelectedQuestion(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={replyQuestion.isPending}
                data-testid="button-submit-reply"
              >
                {replyQuestion.isPending ? 'Saving…' : (
                  <>
                    <Send size={15} /> Publish Answer
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {questionsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : displayedList.length > 0 ? (
        <div className="space-y-4">
          {displayedList.map(q => (
            <div
              key={q.id}
              className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm transition hover:shadow-md"
              data-testid={`card-admin-question-${q.id}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {q.category}
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {q.memberName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({q.memberEmail}) · {new Date(q.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Status tone={q.status === 'answered' ? 'good' : 'warn'}>
                    {q.status === 'answered' ? 'Answered' : 'Needs Reply'}
                  </Status>
                  <Button
                    variant={q.status === 'answered' ? 'outline' : 'primary'}
                    className="text-xs py-1.5 px-3"
                    onClick={() => openReply(q)}
                    data-testid={`button-reply-question-${q.id}`}
                  >
                    <MessageSquare size={14} /> {q.status === 'answered' ? 'Edit Answer' : 'Reply'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this question?')) deleteQuestion.mutate(q.id);
                    }}
                    className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition"
                    title="Delete question"
                    data-testid={`button-admin-delete-question-${q.id}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">
                  {q.question}
                </h3>
                {q.details && (
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {q.details}
                  </p>
                )}
              </div>

              {q.status === 'answered' && q.answer && (
                <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <ShieldCheck size={16} /> Steward Answer ({q.answeredBy ?? 'Steward'})
                    {q.answeredAt && (
                      <span className="font-normal text-muted-foreground">
                        · {new Date(q.answeredAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm sm:text-base text-foreground/90 whitespace-pre-line leading-relaxed font-sans">
                    {q.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Check}
          title={activeTab === 'pending' ? 'All caught up' : 'No answered questions'}
          detail={
            activeTab === 'pending'
              ? 'There are currently no unanswered questions in the queue.'
              : 'Answered questions will show up here.'
          }
        />
      )}
    </AuthenticatedLayout>
  );
}

function ProtectedArea({ role, children }: { role: User['role']; children: ReactNode }) {
  const current = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (current.isError) setLocation('/login');
    else if (current.data && current.data.role !== role) {
      setLocation(current.data.role === 'admin' ? '/admin/dashboard' : '/member/dashboard');
    }
  }, [current.data, current.isError, role, setLocation]);
  if (current.isLoading || current.isError || !current.data || current.data.role !== role) {
    return <div className="flex min-h-[100dvh] items-center justify-center px-5 text-sm text-muted-foreground" data-testid="status-auth-check">Checking your account…</div>;
  }
  return <>{children}</>;
}

function NotFoundPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center"><EmptyState icon={AlertCircle} title="Page not found" detail="The page you’re looking for has moved or does not exist." action={<Link href="/" data-testid="link-not-found-home" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Return home</Link>} /></div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
function Router() { return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route path="/login" component={Login} /><Route path="/register" component={Register} /><Route path="/forgot-password" component={ForgotPassword} />
  <Route path="/__preview/member" component={() => import.meta.env.DEV ? <MemberDashboard preview /> : <NotFoundPage />} />
  <Route path="/__preview/admin" component={() => import.meta.env.DEV ? <AdminDashboard preview /> : <NotFoundPage />} />
  <Route path="/member/dashboard" component={() => <ProtectedArea role="member"><MemberDashboard /></ProtectedArea>} />
  <Route path="/member/books" component={() => <ProtectedArea role="member"><MemberBooks /></ProtectedArea>} />
  <Route path="/member/books/:id" component={() => <ProtectedArea role="member"><BookDetail /></ProtectedArea>} />
  <Route path="/member/notes" component={() => <ProtectedArea role="member"><MemberNotes /></ProtectedArea>} />
  <Route path="/member/questions" component={() => <ProtectedArea role="member"><MemberQuestions /></ProtectedArea>} />
  <Route path="/member/borrowings" component={() => <ProtectedArea role="member"><MemberBorrowings /></ProtectedArea>} />
  <Route path="/member/profile" component={() => <ProtectedArea role="member"><Profile /></ProtectedArea>} />
  <Route path="/admin/dashboard" component={() => <ProtectedArea role="admin"><AdminDashboard /></ProtectedArea>} />
  <Route path="/admin/books" component={() => <ProtectedArea role="admin"><AdminBooks /></ProtectedArea>} />
  <Route path="/admin/categories" component={() => <ProtectedArea role="admin"><AdminCategories /></ProtectedArea>} />
  <Route path="/admin/members" component={() => <ProtectedArea role="admin"><AdminMembers /></ProtectedArea>} />
  <Route path="/admin/requests" component={() => <ProtectedArea role="admin"><AdminRequests /></ProtectedArea>} />
  <Route path="/admin/notes" component={() => <ProtectedArea role="admin"><AdminNotes /></ProtectedArea>} />
  <Route path="/admin/questions" component={() => <ProtectedArea role="admin"><AdminQuestions /></ProtectedArea>} />
  <Route path="/admin/settings" component={() => <ProtectedArea role="admin"><AdminSettings /></ProtectedArea>} />
  <Route component={NotFoundPage} />
</Switch></RoutedErrorBoundary>; }

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hu_theme') as Theme | null;
      if (stored === 'light' || stored === 'dark') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('hu_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}
export default App;