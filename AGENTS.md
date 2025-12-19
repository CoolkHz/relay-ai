# Repository Guidelines

## Project Structure and Module Organization
- `app/` contains Next.js App Router routes, including `(auth)` and `(dashboard)` route groups plus `app/api` for server endpoints.
- `components/` holds shared UI pieces, currently dashboard-specific.
- `lib/` holds domain logic and helpers (auth, balancer, cache, db, llm, stats, utils).
- `public/` stores static assets, while `globals.css` holds app-wide styling and theme tokens.
- `drizzle.config.ts` and `.env.example` describe database setup.

## Build, Test, and Development Commands
Prefer `pnpm` because `pnpm-lock.yaml` is tracked; use npm equivalents if needed.
- `pnpm dev` start local dev server with Turbopack.
- `pnpm build` create a production build.
- `pnpm start` serve the production build.
- `pnpm lint` run ESLint (Next core-web-vitals + TypeScript).
- `pnpm typecheck` run TypeScript without emitting.
- `pnpm db:generate|db:migrate|db:push|db:studio` manage Drizzle schema and migrations.
- `pnpm db:create|db:seed|db:reset` provision or reset the local database.

## Coding Style and Naming Conventions
- TypeScript + React, ES modules, 2-space indentation, semicolons, double quotes.
- Components and types use PascalCase; hooks use `useX`; route folders stay lowercase (route groups in parentheses).
- Keep UI composition in `components/` and business logic in `lib/`; avoid mixing concerns.
- No formatter configured; keep changes consistent with existing files.

## Testing Guidelines
- No automated test suite is configured yet. Use `pnpm lint` and `pnpm typecheck` as baseline checks.
- If adding tests, document the framework and add npm scripts; keep naming consistent (e.g., `*.test.tsx`) and colocate near the target module.

## Commit and Pull Request Guidelines
- Commit messages in history are short, imperative statements (e.g., "Fix build failures"). Follow that pattern and keep scope clear.
- PRs should include a concise description, linked issues, and screenshots for UI changes; call out any schema or migration impact.

## Security and Configuration Tips
- Copy `.env.example` to `.env.local` and never commit secrets.
- Run Drizzle migrations after any schema changes in `lib/db`.
