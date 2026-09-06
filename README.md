# HU Fellowship Library

Frontend for the HU Fellowship Library: a bilingual (English / አማርኛ) library application for
browsing and borrowing books, sharing Summer Bible Study Notes and submitting personal study notes
for review.

This repository contains **the frontend only**. There is no backend, database or server-side code
here. Until a real API exists, the app runs against a browser-only mock adapter that stores data in
`localStorage`.

## Requirements

- Node.js 18 or newer
- npm

## Install and run

```bash
cd client
npm install
cp .env.example .env   # optional, the defaults work out of the box
npm run dev            # http://localhost:5173
```

Other scripts:

```bash
npm run build      # production build into client/dist
npm run preview    # serve the production build
npm run lint       # ESLint
```

## Environment variables

All frontend environment variables are public — never put secrets or credentials here.

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Base URL of the backend API. |
| `VITE_USE_MOCK_API` | `true` | `true` uses the in-browser mock adapter; `false` calls the real API. |
| `VITE_MOCK_ADMIN_EMAIL` | empty | Mock mode only: an account registered with this email gets the `admin` role. No password is stored anywhere in the frontend. |

The first account you register in mock mode is a member. To get an admin account, set
`VITE_MOCK_ADMIN_EMAIL` to the email you want to register with, restart the dev server, then
register that account and choose your own password.

## Project structure

```
client/
  src/
    components/
      books/        Book cover, card, grid, filters, admin book form
      borrowing/    Borrow request form and borrowing cards
      common/       Buttons, inputs, modal, toasts, badges, states
      layout/       Public / auth / member / admin layouts and sidebar
      notes/        Study note card and form
    context/        Auth, Language, Toast and shared Books state
    hooks/          useAsyncData, useDownload
    i18n/           en.js, am.js and the translate() helper
    models/         Shared data shapes and status constants
    pages/          admin/, auth/, member/, public/
    routes/         ProtectedRoute and AdminRoute
    services/       api.js + one service per domain, mock/ adapter
    utils/          formatting, validation, book filtering
```

## Language system

- Translations live in `src/i18n/en.js` and `src/i18n/am.js`; both files share the same keys.
- `LanguageContext` exposes `t(key, values)`, the current language and `setLanguage()`.
- Login and registration always render in English; the language selector appears in the
  authenticated layouts.
- The choice is applied immediately (no reload) and persisted in `localStorage`.

## Routes

Public: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`,
`/resend-verification`, `/books`, `/books/:id`, `/summer-bible-study-notes`

Member: `/member/dashboard`, `/member/borrowings`, `/member/history`, `/member/profile`,
`/member/personal-study-notes`

Admin: `/admin/dashboard`, `/admin/books`, `/admin/categories`, `/admin/members`, `/admin/requests`,
`/admin/borrowings`, `/admin/summer-study-notes`, `/admin/personal-study-notes`, `/admin/reports`,
`/admin/settings`

`ProtectedRoute` and `AdminRoute` guard the member and admin trees. They are a UX convenience only —
real authorization must be enforced by the backend.

## API architecture

Components never call HTTP directly. Every request goes through `src/services/api.js`, which wraps
Axios, attaches the bearer token, converts file payloads to `FormData`, reports upload progress and
maps failures to translated error keys (`src/services/apiError.js`). Domain modules
(`bookService`, `borrowingService`, `studyNoteService`, …) expose the endpoints each screen needs.

Endpoints the frontend expects:

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Books | `GET/POST /books`, `GET/PUT/DELETE /books/:id`, `GET /books/:id/download` |
| Categories | `GET/POST /categories`, `PUT/DELETE /categories/:id` |
| Borrowings | `GET /borrowings`, `GET /borrowings/me`, `POST /borrowings`, `PATCH /borrowings/:id/approve|reject|request-return|return` |
| Study notes | `GET/POST /study-notes/summer`, `PUT/DELETE /study-notes/summer/:id`, `GET /study-notes/summer/:id/download`, `GET /study-notes/personal`, `GET /study-notes/personal/me`, `POST /study-notes/personal`, `PATCH /study-notes/personal/:id/approve|reject`, `DELETE /study-notes/personal/:id`, `GET /study-notes/personal/:id/download` |
| Users | `GET /users`, `PATCH /users/me`, `PATCH /users/:id/status` |
| Dashboard | `GET /dashboard/member`, `GET /dashboard/admin` |

## Connecting a real backend

1. Implement the endpoints above; return JSON in the shapes described in `src/models/index.js`.
2. Set `VITE_API_BASE_URL` to the API URL and `VITE_USE_MOCK_API=false`.
3. Restart the dev server. No component changes are required — only the service layer talks to the
   API.
