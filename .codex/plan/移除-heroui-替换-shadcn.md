# Task: Remove HeroUI and replace with shadcn/ui

## Context
- Goal: remove HeroUI usage, rebuild dashboard pages with shadcn/ui, modernize layout, and improve mobile UX.
- Scope: `app/(dashboard)` pages, shared components, docs, and dependencies.

## Plan Summary
1. Add shared components (`components/dashboard/*`): PageHeader, SectionHeader, ResponsiveTable, FormField.
2. Refactor channels, groups, logs, and models pages: replace HeroUI, add mobile card views and scrollable dialogs.
3. Delete `app/hero.ts` and remove `@heroui/react` dependency, update docs.
4. Global search to confirm no HeroUI references remain.
