import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  BookOpen, BookMarked, Bookmark, Check, ChevronRight, CircleUserRound, Clock3, Download,
  FileText, FolderOpen, Home as HomeIcon, Languages, Library, LogOut, Menu, Pencil, Plus, Search, Settings, ShieldCheck, Sparkles,
  UserRound, Users, X, ArrowLeft, ArrowUpRight, AlertCircle, LoaderCircle
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

type Lang = 'en' | 'am';
const LangContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({ lang: 'en', setLang: () => undefined });
const useLang = () => useContext(LangContext);
const words: Record<string, [string, string]> = {
  dashboard: ['Dashboard', 'ዳሽቦርድ'], books: ['Books', 'መጻሕፍት'], notes: ['Study notes', 'የጥናት ማስታወሻዎች'],
  borrowings: ['My borrowings', 'የተዋሱት'], profile: ['My profile', 'መገለጫዬ'], categories: ['Categories', 'ምድቦች'],
  members: ['Members', 'አባላት'], requests: ['Requests', 'ጥያቄዎች'], settings: ['Settings', 'ቅንብሮች'],
  signOut: ['Sign out', 'ውጣ'], search: ['Search', 'ፈልግ'], featured: ['Featured resources', 'ተለይተው የቀረቡ ምንጮች'],
  browse: ['Browse library', 'ቤተ መጻሕፍቱን ይዳስሱ'], welcome: ['Welcome back', 'እንኳን ደህና መጡ'],
  overview: ['Overview', 'አጠቃላይ እይታ'], newBook: ['Add a book', 'መጽሐፍ ጨምር'], newCategory: ['Add category', 'ምድብ ጨምር'],
  pending: ['Pending', 'በመጠባበቅ ላይ'], available: ['Available', 'ይገኛል'], request: ['Request to borrow', 'ለመዋስ ጠይቅ'],
  read: ['Read online', 'በመስመር ላይ አንብብ'], save: ['Save changes', 'ለውጦችን አስቀምጥ'],
  membersOnly: ['Members only', 'ለአባላት ብቻ'], library: ['Library', 'ቤተ መጻሕፍት'],
};
const t = (key: string, lang: Lang) => words[key]?.[lang === 'am' ? 1 : 0] ?? key;

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
  { id: -3, title: 'Celebration of Discipline', author: 'Richard J. Foster', type: 'softcopy', category: 'Christian Living', description: 'A sample book for dashboard layout previews.', year: 1978, available: 0, total: 2, featured: true },
];
const previewBorrowingRequests: BorrowingRequest[] = [
  { id: -1, book: previewBooks[0], member: { ...previewMember, id: -3, name: 'Mekdes Alemu', email: 'mekdes@example.test' }, status: 'pending', requestedAt: '2026-11-11T09:30:00.000Z', rejectionReason: null },
  { id: -2, book: previewBooks[1], member: { ...previewMember, id: -4, name: 'Dawit Bekele', email: 'dawit@example.test' }, status: 'pending', requestedAt: '2026-11-10T14:15:00.000Z', rejectionReason: null },
  { id: -3, book: previewBooks[2], member: { ...previewMember, id: -5, name: 'Hana Tesfaye', email: 'hana@example.test' }, status: 'pending', requestedAt: '2026-11-09T08:00:00.000Z', rejectionReason: null },
];
const previewMemberSummary: DashboardSummary = { books: 32, studyNotes: 9, activeBorrowings: 1, pendingRequests: 1 };
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
  const contentType = mimeByExtension[extension] || file.type || '';
  const maxSize = purpose === 'cover' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
  if (file.size > maxSize) throw new Error(purpose === 'cover' ? 'Cover images must be 10 MB or smaller.' : 'Files must be 50 MB or smaller.');
  const request = await fetch('/api/storage/uploads/request-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, size: file.size, contentType, purpose }),
  });
  if (!request.ok) throw new Error((await request.json().catch(() => ({}))).error ?? 'Could not prepare the file upload.');
  const { uploadURL, objectPath } = await request.json();
  const uploaded = await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });
  if (!uploaded.ok) throw new Error('The file could not be uploaded. Please try again.');
  return `/api/storage${objectPath}`;
}
const Logo = ({ dark = false }: { dark?: boolean }) => <Link href="/" data-testid="link-brand" className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-black/70 bg-white"><img src={logo} alt="HU Fellowship Library" className="block h-full w-full origin-center scale-125 object-contain object-center" /></span><span className={`font-serif text-sm font-bold leading-tight ${dark ? 'text-sidebar-foreground' : 'text-foreground'}`}>HU Fellowship<br /><span className="font-sans text-[10px] font-medium uppercase tracking-[.2em] opacity-70">Library</span></span></Link>;
const Status = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) => <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${tone === 'good' ? 'bg-emerald-100 text-emerald-700' : tone === 'warn' ? 'bg-amber-100 text-amber-700' : tone === 'bad' ? 'bg-red-100 text-red-700' : 'bg-secondary text-secondary-foreground'}`}>{children}</span>;
const Skeleton = ({ className = '' }: { className?: string }) => <div className={`skeleton rounded-lg ${className}`} />;
const EmptyState = ({ icon: Icon = Library, title, detail, action }: { icon?: typeof Library; title: string; detail: string; action?: ReactNode }) => <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 text-center"><span className="mb-4 rounded-full bg-secondary p-4 text-primary"><Icon size={24} /></span><h3 className="font-serif text-lg font-bold">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
const ErrorState = ({ retry }: { retry?: () => void }) => <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive"><div className="flex items-center gap-2 font-semibold"><AlertCircle size={17} />We couldn't load this page.</div>{retry && <Button variant="danger" className="mt-3" onClick={retry} data-testid="button-retry">Try again</Button>}</div>;

function PublicNav() {
  return <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 lg:px-10"><Logo /><nav className="flex items-center gap-3 text-sm font-semibold text-muted-foreground"><a href="#featured" data-testid="link-featured" className="hidden lg:inline">Featured</a><a href="#about" data-testid="link-about" className="hidden lg:inline">About the library</a>{import.meta.env.DEV && <><Link href="/__preview/member" data-testid="link-member-preview" className="hidden md:inline">Member preview</Link><Link href="/__preview/admin" data-testid="link-admin-preview" className="hidden md:inline">Admin preview</Link></>}<Link href="/login" data-testid="link-sign-in" className="inline-flex items-center gap-1 rounded-lg bg-primary px-3.5 py-2 text-primary-foreground">Sign in <ArrowUpRight size={14} /></Link></nav></header>;
}

function Home() {
  const booksQuery = useListBooks();
  const categoriesQuery = useListCategories();
  const books = Array.isArray(booksQuery.data) ? booksQuery.data : [];
  const featured = books.filter((book) => book.featured).slice(0, 4);
  return <div className="noise min-h-[100dvh] overflow-hidden">
    <PublicNav />
    <main>
      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.04fr_.96fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-16">
        <div className="animate-rise">
          <div className="mb-7 flex items-center gap-2 text-xs font-bold uppercase tracking-[.22em] text-primary"><span className="h-px w-8 bg-primary" />Study. Serve. Share.</div>
          <h1 className="max-w-2xl font-serif text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">A quiet place for <span className="text-primary">deep roots.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">The HU Fellowship Library brings books, Bible-study resources, and a growing community of learners into one welcoming home.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/login" data-testid="link-start-exploring" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/15">Start exploring <ChevronRight size={17} /></Link><a href="#featured" data-testid="link-view-featured" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-bold">View featured resources</a></div>
          <div className="mt-12 flex items-center gap-8 border-t border-border pt-6"><div><div className="font-mono text-2xl font-bold text-primary">{booksQuery.isLoading ? '—' : books.length}</div><div className="text-xs text-muted-foreground">books in the collection</div></div><div className="h-9 w-px bg-border" /><div><div className="font-mono text-2xl font-bold text-primary">{categoriesQuery.isLoading ? '—' : (categoriesQuery.data?.length ?? 0)}</div><div className="text-xs text-muted-foreground">ways to find your next study</div></div></div>
        </div>
         <div className="paper-grid relative mx-auto w-full max-w-lg animate-rise stagger-1"><div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent/10 blur-3xl" /><div className="relative rounded-[2rem] border border-primary/15 bg-secondary/45 p-5 shadow-2xl shadow-primary/10"><div className="rounded-[1.5rem] bg-sidebar p-8 text-sidebar-foreground"><div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.2em] text-sidebar-primary"><span>HU / 01</span><span>Est. 2004</span></div><div className="mt-16 max-w-xs font-serif text-3xl font-bold leading-tight">“Study to show yourself approved.”</div><div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-sidebar-primary">2 Timothy 2:15</div><div className="mt-12 flex items-end justify-between"><div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-sidebar-primary/40 p-1"><img src={logo} alt="" className="block h-full w-full origin-center scale-[1.25] object-contain object-center" /></div><div className="text-right text-xs text-sidebar-foreground/50">Fellowship<br />Library</div></div></div></div></div>
      </section>
      <section id="featured" className="border-y border-border bg-card/50 px-5 py-20 lg:px-10"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-5"><div><div className="text-xs font-bold uppercase tracking-[.2em] text-accent">From the shelves</div><h2 className="mt-2 font-serif text-3xl font-bold">Resources worth returning to.</h2></div><Link href="/login" data-testid="link-browse-all" className="text-sm font-bold text-primary">Browse the whole library <ArrowUpRight size={15} className="ml-1 inline" /></Link></div>{booksQuery.isLoading ? <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-72" />)}</div> : featured.length ? <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{featured.map(book => <BookCard key={book.id} book={book} publicCard />)}</div> : <div className="mt-10"><EmptyState icon={BookOpen} title="The shelves are being prepared" detail="Featured resources will appear here as the collection grows." /></div>}</div></section>
      <section id="about" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[.7fr_1fr] lg:px-10"><div><div className="text-xs font-bold uppercase tracking-[.2em] text-accent">A shared table</div><h2 className="mt-3 font-serif text-3xl font-bold leading-tight">Learning becomes richer when it is shared.</h2></div><div className="grid gap-8 text-sm leading-7 text-muted-foreground sm:grid-cols-2"><div><Sparkles size={20} className="mb-4 text-primary" /><p>Find the next book for your quiet hour, keep track of what you borrow, and return with a thought worth bringing to fellowship.</p></div><div><Users size={20} className="mb-4 text-primary" /><p>Members and stewards care for the same collection. Every shelf is kept useful, current, and open to thoughtful questions.</p></div></div></section>
    </main>
    <footer className="border-t border-border px-5 py-7 text-center text-xs text-muted-foreground lg:px-10">HU Fellowship Library · A home for study and community</footer>
  </div>;
}

function AuthShell({ children, eyebrow, title, detail }: { children: ReactNode; eyebrow: string; title: string; detail: string }) {
  return <div className="noise grid min-h-[100dvh] lg:grid-cols-[.9fr_1.1fr]"><div className="hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between"><Logo dark /><div className="max-w-md pb-12"><div className="mb-5 text-xs font-bold uppercase tracking-[.22em] text-sidebar-primary">HU Fellowship Library</div><h2 className="font-serif text-5xl font-bold leading-tight">Make room for the word.</h2><p className="mt-6 leading-7 text-sidebar-foreground/65">A trusted collection for the people who keep asking better questions.</p><div className="mt-12 border-l-2 border-sidebar-primary/60 pl-5 font-serif text-lg italic text-sidebar-foreground/85">“Let the word of Christ dwell in you richly.”<span className="mt-2 block font-sans text-xs not-italic text-sidebar-primary">Colossians 3:16</span></div></div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-sidebar-foreground/40">Study / Serve / Share</div></div><div className="flex items-center justify-center px-5 py-10"><div className="w-full max-w-md"><div className="mb-10 flex items-center justify-between lg:hidden"><Logo /><Link href="/" data-testid="link-auth-home" className="text-sm font-semibold text-muted-foreground">Back home</Link></div><div className="mb-8"><div className="text-xs font-bold uppercase tracking-[.2em] text-accent">{eyebrow}</div><h1 className="mt-3 font-serif text-4xl font-bold">{title}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p></div>{children}</div></div></div>;
}

function Login() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  return <AuthShell eyebrow="Welcome back" title="Sign in to the library." detail="Your next meaningful read is waiting. Sign in to continue."><form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); login.mutate({ data: { email, password } }, { onSuccess: (data) => setLocation(data.user.role === 'admin' ? '/admin/dashboard' : '/member/dashboard') }); }}><Field label="Email address" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@university.edu" required data-testid="input-email" /><Field label="Password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Enter your password" required data-testid="input-password" /><div className="flex justify-end"><Link href="/forgot-password" data-testid="link-forgot-password" className="text-sm font-semibold text-primary">Forgot password?</Link></div>{login.isError && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" data-testid="status-login-error">The email or password did not match our records.</div>}<Button type="submit" disabled={login.isPending} className="h-12 w-full" data-testid="button-login">{login.isPending ? <LoaderCircle size={17} className="animate-spin" /> : null}{login.isPending ? 'Signing in…' : 'Sign in'}</Button><p className="pt-2 text-center text-sm text-muted-foreground">New to the fellowship? <Link href="/register" data-testid="link-register" className="font-bold text-primary">Create a member account</Link></p></form></AuthShell>;
}

function Register() {
  const [, setLocation] = useLocation(); const register = useRegister();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', department: '', schoolYear: '' });
  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(current => ({ ...current, [key]: e.target.value }));
  return <AuthShell eyebrow="Join the fellowship" title="Create your member account." detail="A few details, then a whole collection of places to begin."><form className="grid gap-4" onSubmit={e => { e.preventDefault(); register.mutate({ data: form }, { onSuccess: () => setLocation('/login') }); }}><div className="grid gap-4 sm:grid-cols-2"><Field label="Full name" name="name" autoComplete="name" value={form.name} onChange={update('name')} required data-testid="input-register-name" /><Field label="Email address" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={form.email} onChange={update('email')} required data-testid="input-register-email" /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Phone number" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={update('phone')} required data-testid="input-register-phone" /><Field label="School year" name="schoolYear" autoComplete="off" value={form.schoolYear} onChange={update('schoolYear')} placeholder="e.g. 3rd year" required data-testid="input-register-year" /></div><Field label="Department" name="department" autoComplete="organization-title" value={form.department} onChange={update('department')} required data-testid="input-register-department" /><Field label="Password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={update('password')} minLength={8} required data-testid="input-register-password" />{register.isError && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">We couldn't create that account. Check your details and try again.</div>}<Button type="submit" disabled={register.isPending} className="mt-2 h-12 w-full" data-testid="button-register">{register.isPending ? 'Creating account…' : 'Create account'}</Button><p className="pt-2 text-center text-sm text-muted-foreground">Already a member? <Link href="/login" data-testid="link-existing-login" className="font-bold text-primary">Sign in</Link></p></form></AuthShell>;
}

function ForgotPassword() {
  const [email, setEmail] = useState(''); const [code, setCode] = useState(''); const [password, setPassword] = useState(''); const [stage, setStage] = useState<'email' | 'code' | 'done'>('email');
  const requestReset = useRequestPasswordReset(); const resetPassword = useResetPassword();
  const requestError = requestReset.error instanceof Error ? requestReset.error.message : 'We could not send the recovery code. Please try again.';
  const resetError = resetPassword.error instanceof Error ? resetPassword.error.message : 'That code could not be verified. Please try again.';
  return <AuthShell eyebrow="Account recovery" title="Find your way back in." detail={stage === 'email' ? 'Enter your email and we’ll send a six-digit recovery code.' : stage === 'code' ? 'Check your inbox and enter the code within 10 minutes.' : 'Your password has been updated.'}><form className="grid gap-5" onSubmit={e => { e.preventDefault(); if (stage === 'email') requestReset.mutate({ data: { email } }, { onSuccess: () => setStage('code') }); else if (stage === 'code') resetPassword.mutate({ data: { email, code, password } }, { onSuccess: () => setStage('done') }); }}>{stage === 'email' && <><Field label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu" autoComplete="email" required data-testid="input-recovery-email" />{requestReset.isError && <div className="rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive" data-testid="status-recovery-error">{requestError}</div>}<Button type="submit" disabled={requestReset.isPending} className="h-12 w-full" data-testid="button-send-recovery">{requestReset.isPending ? 'Sending code…' : 'Send recovery code'}</Button></>}{stage === 'code' && <><div className="rounded-lg bg-emerald-100 p-4 text-sm leading-6 text-emerald-800" data-testid="status-recovery-sent">A six-digit recovery code was sent to {email}.</div><Field label="Recovery code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" required data-testid="input-recovery-code" /><Field label="New password" type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required data-testid="input-new-password" />{resetPassword.isError && <div className="rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive" data-testid="status-reset-error">{resetError}</div>}<Button type="submit" disabled={resetPassword.isPending || code.length !== 6} className="h-12 w-full" data-testid="button-reset-password">{resetPassword.isPending ? 'Updating password…' : 'Reset password'}</Button></>}{stage === 'done' && <div className="rounded-lg bg-emerald-100 p-4 text-sm leading-6 text-emerald-800" data-testid="status-reset-success">Your password has been reset successfully. Sign in with your new password.</div>}<p className="pt-2 text-center text-sm text-muted-foreground"><Link href="/login" data-testid="link-back-login" className="font-bold text-primary">Return to sign in</Link></p></form></AuthShell>;
}

function BookCover({ book, large = false }: { book: Book; large?: boolean }) {
  return book.coverUrl ? <img src={book.coverUrl} alt={book.title} className={`book-spine w-full rounded-lg object-cover ${large ? 'h-80' : 'h-48'}`} /> : <div className={`book-spine flex w-full flex-col justify-between rounded-lg bg-secondary p-4 text-secondary-foreground ${large ? 'h-80' : 'h-48'}`}><span className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">{book.category}</span><BookOpen className="self-center text-primary/50" size={large ? 45 : 30} /><span className="font-serif text-lg font-bold leading-tight">{book.title}</span></div>;
}
function BookCard({ book, publicCard = false }: { book: Book; publicCard?: boolean }) {
  return <Link href={publicCard ? '/login' : `/member/books/${book.id}`} data-testid={`card-book-${book.id}`} className="group block"><div className="overflow-hidden rounded-xl border border-border bg-card p-2 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"><BookCover book={book} /><div className="p-3"><div className="mb-1 flex items-center justify-between gap-2"><Status tone={book.available > 0 ? 'good' : 'bad'}>{book.available > 0 ? 'Available' : 'On loan'}</Status><span className="font-mono text-[10px] text-muted-foreground">{book.type}</span></div><h3 className="line-clamp-2 min-h-11 font-serif text-base font-bold group-hover:text-primary">{book.title}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{book.author}</p></div></div></Link>;
}

const memberLinks = [{ href: '/member/dashboard', key: 'dashboard', icon: HomeIcon }, { href: '/member/books', key: 'books', icon: BookOpen }, { href: '/member/notes', key: 'notes', icon: FileText }, { href: '/member/borrowings', key: 'borrowings', icon: Bookmark }, { href: '/member/profile', key: 'profile', icon: UserRound }];
const adminLinks = [{ href: '/admin/dashboard', key: 'dashboard', icon: HomeIcon }, { href: '/admin/books', key: 'books', icon: BookOpen }, { href: '/admin/categories', key: 'categories', icon: FolderOpen }, { href: '/admin/members', key: 'members', icon: Users }, { href: '/admin/requests', key: 'requests', icon: Clock3 }, { href: '/admin/notes', key: 'notes', icon: FileText }, { href: '/admin/settings', key: 'settings', icon: Settings }];

function Sidebar({ admin, user, close, preview = false }: { admin: boolean; user?: User; close?: () => void; preview?: boolean }) {
  const { lang, setLang } = useLang(); const [, setLocation] = useLocation(); const logout = useLogout();
  const links = preview
    ? [{ href: admin ? '/__preview/admin' : '/__preview/member', key: 'dashboard', icon: HomeIcon }]
    : admin ? adminLinks : memberLinks;
  return <aside className="flex h-full w-72 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground"><div className="mb-9 px-3"><Logo dark /></div><div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-sidebar-foreground/40">{admin ? 'Steward desk' : 'Your library'}</div><nav className="grid gap-1">{links.map(({ href, key, icon: Icon }) => <Link key={href} href={href} onClick={close} data-testid={`link-${key}`} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${location.pathname === href ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-black/10' : ''}`}><Icon size={18} />{t(key, lang)}</Link>)}{preview && <Link href={admin ? '/__preview/member' : '/__preview/admin'} onClick={close} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">{admin ? 'Member preview' : 'Admin preview'}</Link>}</nav><div className="mt-auto grid gap-2"><button onClick={() => setLang(lang === 'en' ? 'am' : 'en')} data-testid="button-language" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><Languages size={18} />{lang === 'en' ? 'አማርኛ' : 'English'}</button><div className="flex items-center gap-3 border-t border-sidebar-border px-3 pb-2 pt-5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary font-bold text-sidebar-primary-foreground">{user?.name?.slice(0, 1) ?? 'H'}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{user?.name ?? 'Fellowship member'}</div><div className="truncate text-xs text-sidebar-foreground/45">{user?.email ?? 'Signed in'}</div></div>{!preview && <button onClick={() => logout.mutate(undefined, { onSuccess: () => setLocation('/login') })} title={t('signOut', lang)} data-testid="button-sign-out" className="text-sidebar-foreground/45 hover:text-sidebar-foreground"><LogOut size={17} /></button>}</div></div></aside>;
}

function AuthenticatedLayout({ children, admin = false, preview = false }: { children: ReactNode; admin?: boolean; preview?: boolean }) {
  const [open, setOpen] = useState(false); const path = window.location.pathname;
  const current = useGetCurrentUser({ query: { enabled: !preview && (path.startsWith('/member') || path.startsWith('/admin')), queryKey: getGetCurrentUserQueryKey() } });
  const user = preview ? (admin ? previewAdmin : previewMember) : current.data;
  return <div className="min-h-[100dvh] bg-background"><div className={`fixed inset-y-0 left-0 z-40 hidden lg:block ${admin ? 'shadow-2xl shadow-primary/10' : ''}`}><Sidebar admin={admin} user={user} preview={preview} /></div>{open && <><button aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-sidebar/35 lg:hidden" data-testid="button-close-menu" /><div className="fixed inset-y-0 left-0 z-50 lg:hidden"><Sidebar admin={admin} user={user} preview={preview} close={() => setOpen(false)} /></div></>}<div className="lg:pl-72"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur lg:px-9"><button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-secondary lg:hidden" data-testid="button-open-menu"><Menu size={20} /></button><div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"><span className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">{admin ? 'Steward desk' : 'Member space'}</span><ChevronRight size={14} />{t('library', useLang().lang)}</div><div className="ml-auto flex items-center gap-3">{preview && <span data-testid="badge-sample-preview" className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">Sample preview · no real data</span>}<div className="hidden items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground sm:flex"><CircleUserRound size={14} />{user?.name ?? 'Signed in'}</div>{!preview && <span className="h-2 w-2 rounded-full bg-emerald-500" title="Connected" />}</div></header>{preview && <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-center text-xs font-medium text-amber-900 lg:px-9">Development sample data only. Preview controls are disabled and nothing is saved.</div>}<main className="mx-auto max-w-[1500px] px-5 py-7 lg:px-9 lg:py-10">{children}</main></div></div>;
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div>{eyebrow && <div className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-accent">{eyebrow}</div>}<h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>{detail && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{detail}</p>}</div>{action}</div>;
}
function Metric({ label, value, icon: Icon, accent = 'primary' }: { label: string; value: string | number; icon: typeof Library; accent?: 'primary' | 'accent' }) { return <div className="rounded-xl border border-border bg-card p-5"><div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-lg ${accent === 'accent' ? 'bg-accent/10 text-accent' : 'bg-secondary text-primary'}`}><Icon size={19} /></div><div className="font-mono text-3xl font-bold">{value}</div><div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div></div>; }

function MemberDashboard({ preview = false }: { preview?: boolean }) {
  const { lang } = useLang();
  const summary = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey(), enabled: !preview } });
  const books = useListBooks(undefined, { query: { queryKey: getListBooksQueryKey(), enabled: !preview } });
  const borrowings = useListBorrowings({ query: { queryKey: getListBorrowingsQueryKey(), enabled: !preview } });
  const notes = useListStudyNotes(undefined, { query: { queryKey: getListStudyNotesQueryKey(), enabled: !preview } });
  const data = preview ? previewMemberSummary : summary.data;
  const latest = preview ? previewBooks : (Array.isArray(books.data) ? books.data : []).slice(0, 3);
  const action = preview
    ? <Button disabled variant="soft" data-testid="button-preview-browse"><ChevronRight size={16} />Preview only</Button>
    : <Link href="/member/books" data-testid="link-dashboard-browse" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">{t('browse', lang)} <ChevronRight size={16} /></Link>;
  return <AuthenticatedLayout preview={preview}><PageHeading eyebrow={t('overview', lang)} title={`${t('welcome', lang)}.`} detail="A good study habit starts by knowing where to look." action={action} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{!preview && summary.isLoading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-36" />) : <><Metric label={lang === 'am' ? 'በስብስቡ ውስጥ መጻሕፍት' : 'Books in collection'} value={data?.books ?? 0} icon={BookOpen} /><Metric label={lang === 'am' ? 'የእኔ የነባር ውሰቶች' : 'Active borrowings'} value={data?.activeBorrowings ?? (preview ? 1 : borrowings.data?.length ?? 0)} icon={Bookmark} accent="accent" /><Metric label={lang === 'am' ? 'የጥናት ማስታወሻዎች' : 'Study notes'} value={data?.studyNotes ?? (preview ? 4 : notes.data?.length ?? 0)} icon={FileText} /><Metric label={lang === 'am' ? 'በመጠባበቅ ላይ ጥያቄዎች' : 'Pending requests'} value={data?.pendingRequests ?? 0} icon={Clock3} /></>}</div><div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-[.2em] text-accent">{t('featured', lang)}</div><h2 className="mt-1 font-serif text-2xl font-bold">Begin with a good question.</h2></div>{preview ? <span className="text-sm font-semibold text-muted-foreground">Sample shelf</span> : <Link href="/member/books" data-testid="link-dashboard-books" className="text-sm font-bold text-primary">See all</Link>}</div>{!preview && books.isLoading ? <div className="mt-6 grid gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div> : latest.length ? <div className="mt-6 grid gap-3">{latest.map(book => {
    const content = <><div className="h-16 w-12 shrink-0 overflow-hidden rounded-md"><BookCover book={book} /></div><div className="min-w-0 flex-1"><h3 className="truncate font-serif font-bold">{book.title}</h3><p className="truncate text-xs text-muted-foreground">{book.author} · {book.category}</p></div>{!preview && <ArrowUpRight size={17} className="text-muted-foreground" />}</>;
    return preview
      ? <div key={book.id} data-testid={`row-preview-book-${Math.abs(book.id)}`} className="flex items-center gap-4 rounded-xl border border-border/70 p-3">{content}</div>
      : <Link key={book.id} href={`/member/books/${book.id}`} data-testid={`row-dashboard-book-${book.id}`} className="flex items-center gap-4 rounded-xl border border-border/70 p-3 hover:border-primary/40 hover:bg-secondary/40">{content}</Link>;
  })}</div> : <div className="mt-6"><EmptyState icon={BookOpen} title="The shelves are quiet" detail="Newly added books will appear here." /></div>}</section><section className="relative overflow-hidden rounded-2xl bg-sidebar p-7 text-sidebar-foreground"><div className="absolute -right-14 -top-14 h-44 w-44 rounded-full border border-sidebar-primary/20" /><div className="absolute -right-4 -top-4 h-24 w-24 rounded-full border border-sidebar-primary/20" /><div className="relative"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-sidebar-primary">A verse for the week</div><p className="mt-12 font-serif text-2xl font-bold leading-relaxed">“Trust in the Lord with all your heart and lean not on your own understanding.”</p><p className="mt-5 text-xs text-sidebar-foreground/55">Proverbs 3:5</p><div className="mt-14 flex justify-end"><span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-black/70 bg-white opacity-80"><img src={logo} alt="" className="block h-full w-full origin-center scale-125 object-contain object-center" /></span></div></div></section></div></AuthenticatedLayout>;
}

function MemberBooks() {
  const { lang } = useLang(); const [search, setSearch] = useState(''); const [category, setCategory] = useState(''); const [type, setType] = useState('');
  const query = useListBooks({ search: search || undefined, category: category || undefined, type: (type || undefined) as any }); const cats = useListCategories();
  return <AuthenticatedLayout><PageHeading eyebrow={t('library', lang)} title={t('books', lang)} detail={lang === 'am' ? 'ለጥናትዎ ትክክለኛውን መጽሐፍ ያግኙ።' : 'Find the right book for your next hour of study.'} /><div className="mb-7 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1fr_180px_150px]"><label className="relative block"><Search size={17} className="absolute left-3 top-3.5 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t('search', lang)} books, authors…`} data-testid="input-book-search" className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus:ring-4 focus:ring-primary/15" /></label><select value={category} onChange={e => setCategory(e.target.value)} data-testid="select-book-category" className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none"><option value="">{lang === 'am' ? 'ሁሉም ምድቦች' : 'All categories'}</option>{(Array.isArray(cats.data) ? cats.data : []).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select><select value={type} onChange={e => setType(e.target.value)} data-testid="select-book-type" className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none"><option value="">All formats</option><option value="hardcopy">Hardcopy</option><option value="softcopy">Softcopy</option></select></div>{query.isError ? <ErrorState retry={() => query.refetch()} /> : query.isLoading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-80" />)}</div> : query.data?.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{query.data.map(book => <BookCard key={book.id} book={book} />)}</div> : <EmptyState icon={Search} title="No books found" detail="Try a different title, author, or category." action={<Button variant="soft" onClick={() => { setSearch(''); setCategory(''); setType(''); }} data-testid="button-clear-search">Clear filters</Button>} />}</AuthenticatedLayout>;
}

function BookDetail() {
  const params = useParams<{ id: string }>(); const id = Number(params.id); const { lang } = useLang(); const book = useGetBook(id); const request = useCreateBorrowingRequest(); const [sent, setSent] = useState(false);
  if (book.isLoading) return <AuthenticatedLayout><div className="grid gap-6 md:grid-cols-[260px_1fr]"><Skeleton className="h-80" /><div className="grid gap-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-28" /></div></div></AuthenticatedLayout>;
  if (book.isError || !book.data) return <AuthenticatedLayout><ErrorState retry={() => book.refetch()} /></AuthenticatedLayout>;
  const item = book.data;
  return <AuthenticatedLayout><Link href="/member/books" data-testid="link-back-books" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"><ArrowLeft size={16} /> {t('books', lang)}</Link><div className="grid gap-10 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr]"><div><BookCover book={item} large /></div><div className="max-w-3xl"><div className="flex flex-wrap items-center gap-2"><Status tone={item.available > 0 ? 'good' : 'bad'}>{item.available > 0 ? `${item.available} available` : 'Currently unavailable'}</Status><Status>{item.type}</Status></div><h1 className="mt-4 font-serif text-4xl font-bold leading-tight sm:text-5xl">{item.title}</h1><p className="mt-3 text-lg text-muted-foreground">by {item.author}</p><div className="mt-8 grid gap-5 border-y border-border py-6 sm:grid-cols-3"><div><div className="text-xs uppercase tracking-wider text-muted-foreground">Category</div><div className="mt-1 font-semibold">{item.category}</div></div><div><div className="text-xs uppercase tracking-wider text-muted-foreground">Published</div><div className="mt-1 font-semibold">{item.year ?? '—'}</div></div><div><div className="text-xs uppercase tracking-wider text-muted-foreground">Copies</div><div className="mt-1 font-semibold">{item.available} of {item.total}</div></div></div><p className="mt-7 max-w-2xl leading-7 text-muted-foreground">{item.description}</p><div className="mt-9 flex flex-wrap gap-3">{item.type === 'softcopy' && item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noreferrer" download data-testid="link-read-book" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"><Download size={17} />{lang === 'am' ? 'PDF ያውርዱ / ያንብቡ' : 'Download & Read PDF'}</a>}{item.available > 0 && <Button disabled={request.isPending || sent} onClick={() => request.mutate({ data: { bookId: item.id } }, { onSuccess: () => setSent(true) })} data-testid="button-request-book">{sent ? <><Check size={17} />Request sent</> : request.isPending ? 'Sending…' : <><Bookmark size={17} />{t('request', lang)}</>}</Button>}{item.available === 0 && <Button variant="soft" disabled data-testid="button-unavailable">Currently unavailable</Button>}</div></div></div></AuthenticatedLayout>;
}

function MemberNotes() {
  const { lang } = useLang();
  const query = useListStudyNotes();
  const [showForm, setShowForm] = useState(false);
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const create = useCreateStudyNote();
  const [form, setForm] = useState({ title: '', description: '', type: 'personal', fileUrl: '' });
  const isSummer = form.type === 'summer';
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteFile) {
      setUploadError(
        isSummer
          ? 'Summer study notes require a file attachment. Please upload your study document before submitting.'
          : 'Please attach a study note file before submitting.'
      );
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const fileUrl = await uploadLibraryFile(noteFile, 'study-note');
      create.mutate({ data: { ...form, fileUrl } as any }, {
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
  return <AuthenticatedLayout>
    <PageHeading eyebrow={t('membersOnly', lang)} title={t('notes', lang)} detail="Approved reflections and study guides from the fellowship." action={<Button onClick={() => setShowForm(!showForm)} data-testid="button-new-note"><Plus size={17} />Submit a note</Button>} />
    {showForm && <form className="mb-7 grid gap-4 rounded-2xl border border-primary/20 bg-secondary/35 p-5 md:grid-cols-2" onSubmit={submit}>
      <Field label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required data-testid="input-note-title" />
      <label className="grid gap-2 text-sm font-semibold">Type
        <select value={form.type} onChange={e => { setForm({ ...form, type: e.target.value }); setNoteFile(null); setUploadError(''); }} className="h-11 rounded-lg border border-input bg-card px-3" data-testid="select-note-type"><option value="personal">Personal study</option><option value="summer">Summer study</option></select>
      </label>
      <div className="md:col-span-2"><TextAreaField label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required data-testid="textarea-note-description" /></div>
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">
        {isSummer ? 'Attach study document (required for Summer studies) *' : 'Attach a study note file (required) *'}
        <input type="file" accept=".pdf,.epub,.doc,.docx,.txt,application/pdf,application/epub+zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={e => setNoteFile(e.target.files?.[0] ?? null)} required className="block h-11 rounded-lg border border-input bg-card px-3 py-2 text-sm font-normal" data-testid="input-note-file-upload" />
        <span className="text-xs font-normal text-muted-foreground">
          {noteFile?.name ?? (isSummer ? 'Summer study notes must include a file — PDF, EPUB, Word document, or text file · max 50 MB' : 'PDF, EPUB, Word document, or text file · max 50 MB')}
        </span>
      </label>
      {uploadError && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive md:col-span-2" data-testid="status-note-upload-error">{uploadError}</div>}
      {create.isError && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive md:col-span-2" data-testid="status-note-submit-error">The note could not be submitted. Check your connection and try again.</div>}
      <div className="flex gap-3 md:col-span-2">
        <Button type="submit" disabled={uploading || create.isPending} data-testid="button-submit-note">{uploading ? 'Uploading…' : create.isPending ? 'Submitting…' : 'Submit for review'}</Button>
        <Button type="button" variant="ghost" onClick={() => setShowForm(false)} data-testid="button-cancel-note">Cancel</Button>
      </div>
    </form>}
    {query.isLoading ? <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40" />)}</div> : query.data?.length ? <div className="grid gap-4 md:grid-cols-2">{query.data.map(note => <NoteCard key={note.id} note={note} />)}</div> : <EmptyState icon={FileText} title="No approved notes yet" detail="Your submitted reflections can become part of this shared shelf." action={<Button variant="soft" onClick={() => setShowForm(true)} data-testid="button-empty-note">Submit a study note</Button>} />}
  </AuthenticatedLayout>;
}
function NoteCard({ note }: { note: StudyNote }) { return <article className="rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"><div className="flex items-center justify-between gap-3"><Status tone={note.status === 'approved' ? 'good' : note.status === 'pending' ? 'warn' : 'bad'}>{note.status}</Status><span className="font-mono text-[10px] uppercase text-muted-foreground">{note.type === 'summer' ? 'Summer Bible Study' : 'Personal Study'}</span></div><h3 className="mt-4 font-serif text-xl font-bold">{note.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{note.description}</p><div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground"><span>by {note.author}</span>{note.fileUrl && <a href={note.fileUrl} target="_blank" rel="noreferrer" download data-testid={`link-note-file-${note.id}`} className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"><Download size={13} /> Download & Read PDF <ArrowUpRight size={13} className="inline" /></a>}</div></article>; }

function MemberBorrowings() {
  const { lang } = useLang(); const borrowings = useListBorrowings(); const requests = useListBorrowingRequests();
  return <AuthenticatedLayout><PageHeading eyebrow={t('membersOnly', lang)} title={t('borrowings', lang)} detail="Keep an eye on what is with you and what is on its way." /><div className="grid gap-8 xl:grid-cols-[1.2fr_.8fr]"><section><div className="mb-4 flex items-center justify-between"><h2 className="font-serif text-2xl font-bold">Currently with me</h2><Status tone="good">{borrowings.data?.length ?? 0} active</Status></div>{borrowings.isLoading ? <Skeleton className="h-52" /> : borrowings.data?.length ? <div className="grid gap-3">{borrowings.data.map(item => <div key={item.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"><div className="h-16 w-12 shrink-0 overflow-hidden rounded-md"><BookCover book={item.book} /></div><div className="min-w-0 flex-1"><h3 className="truncate font-serif font-bold">{item.book.title}</h3><p className="text-xs text-muted-foreground">Due {new Date(item.dueDate).toLocaleDateString()}</p></div><Status tone={item.status === 'overdue' ? 'bad' : 'good'}>{item.status}</Status></div>)}</div> : <EmptyState icon={Bookmark} title="Nothing borrowed yet" detail="When you borrow a book, its due date and status will live here." action={<Link href="/member/books" data-testid="link-empty-borrowings" className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Browse books</Link>} />}</section><section><h2 className="mb-4 font-serif text-2xl font-bold">Request history</h2>{requests.isLoading ? <Skeleton className="h-52" /> : requests.data?.length ? <div className="grid gap-3">{requests.data.map(item => <div key={item.id} className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><h3 className="truncate font-semibold">{item.book.title}</h3><Status tone={item.status === 'approved' ? 'good' : item.status === 'pending' ? 'warn' : 'bad'}>{item.status}</Status></div><p className="mt-2 text-xs text-muted-foreground">Requested {new Date(item.requestedAt).toLocaleDateString()}</p>{item.rejectionReason && <p className="mt-2 text-xs text-destructive">{item.rejectionReason}</p>}</div>)}</div> : <EmptyState icon={Clock3} title="No requests yet" detail="Borrowing requests you make will appear here." />}</section></div></AuthenticatedLayout>;
}

function Profile() {
  const { lang } = useLang(); const user = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } });
  const profile = user.data; return <AuthenticatedLayout><PageHeading eyebrow={t('membersOnly', lang)} title={t('profile', lang)} detail="Your fellowship details, kept in one place." /><div className="grid max-w-3xl gap-6 md:grid-cols-[180px_1fr]"><div className="flex flex-col items-center rounded-2xl border border-border bg-sidebar p-7 text-center text-sidebar-foreground"><span className="flex h-24 w-24 items-center justify-center rounded-full bg-sidebar-primary font-serif text-4xl font-bold text-sidebar-primary-foreground">{profile?.name?.slice(0, 1) ?? 'H'}</span><div className="mt-4 font-serif text-xl font-bold">{profile?.name ?? 'Your name'}</div><Status tone="good">Verified</Status></div><div className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">{profile ? <><div><div className="text-xs uppercase tracking-wider text-muted-foreground">Email</div><div className="mt-1 font-semibold">{profile.email}</div></div><div><div className="text-xs uppercase tracking-wider text-muted-foreground">Phone</div><div className="mt-1 font-semibold">{profile.phone ?? 'Not added'}</div></div><div><div className="text-xs uppercase tracking-wider text-muted-foreground">Department</div><div className="mt-1 font-semibold">{profile.department ?? 'Not added'}</div></div><div><div className="text-xs uppercase tracking-wider text-muted-foreground">School year</div><div className="mt-1 font-semibold">{profile.schoolYear ?? 'Not added'}</div></div></> : <div className="sm:col-span-2"><Skeleton className="h-40" /></div>}</div></div></AuthenticatedLayout>;
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
  return <AuthenticatedLayout admin preview={preview}><PageHeading eyebrow="Steward desk" title={`${t('welcome', lang)}, steward.`} detail="Keep the collection useful, current, and ready for the next question." action={action} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{!preview && summary.isLoading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-36" />) : <><Metric label="Total books" value={data?.books ?? 0} icon={BookOpen} /><Metric label="Approved notes" value={data?.studyNotes ?? 0} icon={FileText} accent="accent" /><Metric label="Active borrowings" value={data?.activeBorrowings ?? 0} icon={Bookmark} /><Metric label="Pending requests" value={data?.pendingRequests ?? requestItems.filter(r => r.status === 'pending').length} icon={Clock3} /></>}</div><div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><h2 className="font-serif text-2xl font-bold">Needs your attention</h2>{preview ? <span className="text-sm font-semibold text-muted-foreground">Sample queue</span> : <Link href="/admin/requests" data-testid="link-dashboard-requests" className="text-sm font-bold text-primary">Review all</Link>}</div>{requestItems.filter(r => r.status === 'pending').slice(0, 3).map(r => <div key={r.id} data-testid={preview ? `row-preview-request-${Math.abs(r.id)}` : undefined} className="mt-4 flex items-center gap-3 rounded-lg bg-secondary/50 p-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Clock3 size={16} /></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{r.book.title}</div><div className="text-xs text-muted-foreground">{r.member.name} · {new Date(r.requestedAt).toLocaleDateString()}</div></div><Status tone="warn">Pending</Status></div>)}{!preview && !requests.isLoading && !requestItems.some(r => r.status === 'pending') && <div className="mt-5"><EmptyState icon={Check} title="All clear for now" detail="New requests will appear here." /></div>}</section><section className="rounded-2xl bg-primary p-7 text-primary-foreground"><ShieldCheck size={25} /><h2 className="mt-10 font-serif text-3xl font-bold">A healthy shelf is a living one.</h2><p className="mt-4 max-w-md leading-7 text-primary-foreground/75">Review requests, welcome new members, and keep study notes moving from submission to shared wisdom.</p><div className="mt-8 flex flex-wrap gap-3">{preview ? <><Button disabled variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground" data-testid="button-preview-moderate">Moderate notes</Button><Button disabled variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground" data-testid="button-preview-members">View members</Button></> : <><Link href="/admin/notes" data-testid="link-dashboard-notes" className="rounded-lg bg-primary-foreground px-4 py-2.5 text-sm font-bold text-primary">Moderate notes</Link><Link href="/admin/members" data-testid="link-dashboard-members" className="rounded-lg border border-primary-foreground/30 px-4 py-2.5 text-sm font-bold">View members</Link></>}</div></section></div></AuthenticatedLayout>;
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
        <span className="text-xs font-normal text-muted-foreground">{coverFile?.name ?? (form.coverUrl ? 'Current cover will be kept unless replaced.' : 'PNG, JPG, or WebP · max 10 MB')}</span>
      </label>
      {form.type === 'softcopy' && <label className="grid gap-2 text-sm font-semibold">Book file
        <input type="file" accept=".pdf,application/pdf,.epub,application/epub+zip,.doc,application/msword,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required={!form.fileUrl} onChange={e => setBookFile(e.target.files?.[0] ?? null)} className="block h-11 rounded-lg border border-input bg-card px-3 py-2 text-sm font-normal" data-testid="input-book-file-upload" />
        <span className="text-xs font-normal text-muted-foreground">{bookFile?.name ?? (form.fileUrl ? 'A softcopy is already attached; select a file to replace it.' : 'PDF, EPUB, or Word document · max 50 MB')}</span>
      </label>}
      {(uploadError || saveError) && <div className="md:col-span-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" data-testid="status-book-upload-error">{uploadError || saveError}</div>}
      <div className="flex gap-3 md:col-span-2">
        <Button type="submit" variant="primary" className="min-w-28 whitespace-nowrap !text-white" disabled={busy} data-testid="button-save-book"><span className="text-white">{busy ? 'Uploading & saving…' : 'Save book'}</span></Button>
        <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} data-testid="button-cancel-book">Cancel</Button>
      </div>
    </form>}
    {query.isLoading ? <div className="grid gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div> : query.data?.length ? <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="hidden grid-cols-[1fr_160px_130px_110px_90px] gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:grid"><span>Title</span><span>Category</span><span>Format</span><span>Availability</span><span /></div>
      {query.data.map(book => <div key={book.id} className="grid gap-3 border-b border-border p-4 last:border-0 sm:grid-cols-[1fr_160px_130px_110px_90px] sm:items-center sm:gap-4 sm:px-5">
        <div className="flex items-center gap-3"><div className="h-12 w-9 shrink-0 overflow-hidden rounded"><BookCover book={book} /></div><div className="min-w-0"><div className="truncate font-serif font-bold">{book.title}</div><div className="truncate text-xs text-muted-foreground">{book.author}</div></div></div>
        <span className="text-sm text-muted-foreground">{book.category}</span><span className="text-xs font-mono uppercase">{book.type}</span><Status tone={book.available ? 'good' : 'bad'}>{book.available}/{book.total}</Status>
        <div className="flex gap-1">{book.type === 'softcopy' && book.fileUrl && <a href={book.fileUrl} target="_blank" rel="noreferrer" download title="Download softcopy PDF" className="rounded p-2 text-primary hover:bg-primary/10" data-testid={`link-book-file-${book.id}`}><Download size={16} /></a>}<button onClick={() => openForm(book)} title="Edit book" data-testid={`button-edit-book-${book.id}`} className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-primary"><Pencil size={16} /></button><button onClick={() => { if (window.confirm('Remove this book from the collection?')) del.mutate({ id: book.id }, { onSuccess: () => client.invalidateQueries({ queryKey: getListBooksQueryKey() }) }); }} title="Delete book" data-testid={`button-delete-book-${book.id}`} className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X size={16} /></button></div>
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
  const query = useListBorrowingRequests(); const approve = useApproveBorrowingRequest(); const reject = useRejectBorrowingRequest();
  const refresh = () => query.refetch();
  return <AuthenticatedLayout admin><PageHeading eyebrow="Steward desk" title="Borrowing requests" detail="Review the requests waiting for a thoughtful yes." />{query.isLoading ? <div className="grid gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div> : query.data?.length ? <div className="grid gap-3">{query.data.map(r => <div key={r.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-primary"><BookMarked size={20} /></div><div className="min-w-0 flex-1"><div className="truncate font-serif font-bold">{r.book.title}</div><div className="text-xs text-muted-foreground">{r.member.name} · {r.member.email} · {new Date(r.requestedAt).toLocaleDateString()}</div></div><Status tone={r.status === 'approved' ? 'good' : r.status === 'pending' ? 'warn' : 'bad'}>{r.status}</Status>{r.status === 'pending' && <div className="flex gap-2"><Button variant="soft" disabled={approve.isPending} onClick={() => approve.mutate({ id: r.id }, { onSuccess: refresh })} data-testid={`button-approve-request-${r.id}`}><Check size={15} />Approve</Button><Button variant="danger" disabled={reject.isPending} onClick={() => reject.mutate({ id: r.id, data: { reason: 'Not available at this time.' } }, { onSuccess: refresh })} data-testid={`button-reject-request-${r.id}`}><X size={15} />Reject</Button></div>}</div>)}</div> : <EmptyState icon={Check} title="No borrowing requests" detail="The queue is clear." />}</AuthenticatedLayout>;
}

function AdminNotes() {
  const query = useListStudyNotes(); const approve = useApproveStudyNote(); const reject = useRejectStudyNote(); const remove = useDeleteStudyNote();
  const refresh = () => query.refetch();
  return <AuthenticatedLayout admin><PageHeading eyebrow="Steward desk" title="Study-note moderation" detail="Help thoughtful contributions find their way to the shared shelf." />{query.isLoading ? <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40" />)}</div> : query.data?.length ? <div className="grid gap-4 md:grid-cols-2">{query.data.map(note => <div key={note.id} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><Status tone={note.status === 'approved' ? 'good' : note.status === 'pending' ? 'warn' : 'bad'}>{note.status}</Status><span className="text-xs text-muted-foreground">{new Date(note.submittedAt).toLocaleDateString()}</span></div><h3 className="mt-4 font-serif text-xl font-bold">{note.title}</h3><p className="mt-1 text-xs text-muted-foreground">submitted by {note.author} · <span className="uppercase font-mono">{note.type}</span></p><p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{note.description}</p>{note.fileUrl && <div className="mt-3"><a href={note.fileUrl} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline" data-testid={`link-admin-note-file-${note.id}`}><FileText size={14} /> Review attached PDF / document <ArrowUpRight size={12} /></a></div>}<div className="mt-5 flex gap-2">{note.status === 'pending' && <><Button variant="soft" disabled={approve.isPending} onClick={() => approve.mutate({ id: note.id }, { onSuccess: refresh })} data-testid={`button-approve-note-${note.id}`}><Check size={15} />Approve</Button><Button variant="danger" disabled={reject.isPending} onClick={() => reject.mutate({ id: note.id, data: { reason: 'Needs another review before sharing.' } }, { onSuccess: refresh })} data-testid={`button-reject-note-${note.id}`}><X size={15} />Reject</Button></>}{note.status !== 'pending' && <Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate({ id: note.id }, { onSuccess: refresh })} data-testid={`button-delete-note-${note.id}`}>Delete</Button>}</div></div>)}</div> : <EmptyState icon={FileText} title="No notes to review" detail="New member submissions will appear here." />}</AuthenticatedLayout>;
}

function AdminSettings() {
  const { lang } = useLang(); const [saved, setSaved] = useState(false); const [name, setName] = useState('HU Fellowship Library'); const [email, setEmail] = useState('library@hu-fellowship.edu');
  return <AuthenticatedLayout admin><PageHeading eyebrow={t('settings', lang)} title={t('settings', lang)} detail="The small details that keep the library trustworthy." /><form className="grid max-w-2xl gap-5 rounded-2xl border border-border bg-card p-6" onSubmit={e => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2400); }}><div className="flex items-center gap-3 border-b border-border pb-5"><Settings className="text-primary" /><div><div className="font-serif text-xl font-bold">Library identity</div><div className="text-sm text-muted-foreground">Shown across member communications.</div></div></div><Field label="Library name" value={name} onChange={e => setName(e.target.value)} data-testid="input-library-name" /><Field label="Contact email" type="email" value={email} onChange={e => setEmail(e.target.value)} data-testid="input-library-email" /><div className="flex items-center gap-3"><Button type="submit" data-testid="button-save-settings">{saved ? <><Check size={16} />Saved</> : t('save', lang)}</Button>{saved && <span className="text-sm text-emerald-700">Your settings are up to date.</span>}</div></form></AuthenticatedLayout>;
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
  <Route path="/member/borrowings" component={() => <ProtectedArea role="member"><MemberBorrowings /></ProtectedArea>} />
  <Route path="/member/profile" component={() => <ProtectedArea role="member"><Profile /></ProtectedArea>} />
  <Route path="/admin/dashboard" component={() => <ProtectedArea role="admin"><AdminDashboard /></ProtectedArea>} />
  <Route path="/admin/books" component={() => <ProtectedArea role="admin"><AdminBooks /></ProtectedArea>} />
  <Route path="/admin/categories" component={() => <ProtectedArea role="admin"><AdminCategories /></ProtectedArea>} />
  <Route path="/admin/members" component={() => <ProtectedArea role="admin"><AdminMembers /></ProtectedArea>} />
  <Route path="/admin/requests" component={() => <ProtectedArea role="admin"><AdminRequests /></ProtectedArea>} />
  <Route path="/admin/notes" component={() => <ProtectedArea role="admin"><AdminNotes /></ProtectedArea>} />
  <Route path="/admin/settings" component={() => <ProtectedArea role="admin"><AdminSettings /></ProtectedArea>} />
  <Route component={NotFoundPage} />
</Switch></RoutedErrorBoundary>; }
function App() { const [lang, setLang] = useState<Lang>('en'); return <QueryClientProvider client={queryClient}><TooltipProvider><LangContext.Provider value={{ lang, setLang }}><Router /></LangContext.Provider><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;