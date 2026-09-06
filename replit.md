# HU Fellowship Library

HU Fellowship Library is a bilingual library and Bible-study resource platform for fellowship members and stewards.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env for the shared API: `SESSION_SECRET` is available through the workspace secrets manager.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/hu-fellowship-library/src/App.tsx` — routed member/admin experience and shared UI
- `artifacts/hu-fellowship-library/src/index.css` — visual tokens, typography, and motion
- `artifacts/hu-fellowship-library/src/assets/hu-logo.png` — provided HU Fellowship logo
- `artifacts/api-server/src/routes/library.ts` — auth, books, categories, borrowing, and study-note API
- `lib/api-spec/openapi.yaml` — source of truth for API contracts

## Architecture decisions

- The provided HU Fellowship mark is the primary brand asset and is reused across public, auth, member, and admin surfaces.
- The public landing page intentionally reflects the empty initial library state instead of inventing sample books.
- Auth uses one shared login page and redirects by the returned role.
- English is the initial auth language; signed-in navigation exposes English/Amharic switching.

## Product

Members can browse and search books, view details, request hardcopy books, access study notes, submit personal notes, view borrowings, and manage their profile. Stewards can manage books and categories, review borrowing requests, moderate notes, and see collection totals.

## User preferences

- Use the uploaded HU Fellowship logo rather than a generic replacement.

## Gotchas

- Re-run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI change.
- Restart both managed app workflows after backend or frontend code changes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
