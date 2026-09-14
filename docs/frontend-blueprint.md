# Frontend blueprint — reconciled against the repo

**This is the proposed frontend blueprint, audited against what is on disk.** The proposal's *shape*
— phases, a definition of done, explicit non-negotiables — is worth keeping. Its *state summary* and
several of its "non-negotiable" rules describe an earlier version of this app, and two of them would
undo decisions already made deliberately. This document says what is already done, what genuinely
remains, and in what order.

The backend half is answered separately: `docs/backend-blueprint.md` records the architecture of the
reference implementation and the build order, and the backend will **port ECCLESIA** rather than be
re-derived. §4 below reconciles the proposed backend document against that decision.

Rule of evidence throughout: every status below was measured on the working tree, not recalled.

---

## 1. The proposal, item by item

| Proposed item | Status | Evidence |
| --- | --- | --- |
| "Use **Lucide React** for icons" (rule 2, non-negotiable) | **Reject — reverses an earlier decision** | `lucide-react` is absent from `package.json` (it was removed on request, with its imports). **41 files** draw icons from self-hosted Material Symbols ligatures (`src/assets/material-symbols-outlined.woff2`, inlined into the single-file build). Adopting Lucide re-adds the dependency and rewrites every call site. |
| "Finalize Warm Ember design tokens" / create `src/styles/design-tokens.css` (F1.1) | **Already done, in the idiomatic form** | `src/index.css` carries a Tailwind 4 `@theme` block declaring **all 15 tokens with exactly the hex values the proposal lists** — `--color-warm-canvas: #FDF8F3`, `--color-warm-sidebar: #F8F1E9`, `--color-primary: #C2410C`, `--color-action-hover: #F59E0B`, `--color-border-strong: #D6D3D1`, and so on — plus the two font families. A `:root` block would be a *second* token system beside it. |
| "…and enforced" | **Real work, and mechanical** | The tokens exist as utilities (`bg-warm-canvas`, `text-primary`), but the app styles itself with **5,587 hex-valued Tailwind utilities** drawing on **76 distinct hex values**. That is the gap — the palette is right, the indirection is missing. |
| "Build `src/components/ui/`" (F1.2) | **Genuinely missing — the highest-value item in the proposal** | No such directory. The only shared UI primitive is `dialog.ts` (the `useDialog` hook that all 87 dialogs use). This is what makes token adoption mechanical instead of a 5,587-site sweep. |
| "Complete `ChurchSidebar.tsx` with all 10 panels" | **Stale count** | `ParishNavTab` has **14** sections. |
| "Complete `ChurchHeader.tsx`" | **Exists, with one known defect** | The global search box is inert: `ChurchSystemApp` holds `searchTerm`, passes it to the header, and nothing consumes it. |
| "Make `ChurchSystemApp.tsx` route between all views" | **Exists** | `ParishNavTab` union plus a switch in `ChurchSystemApp.tsx` (415 lines); sub-tab unions per section. |
| Phase F2 — split-screen Authentication page | **Already done, to that exact spec** | `AuthScreen.tsx`: branding panel left (uploaded mark + wordmark), centring card right, no sidebar. Restored to this specification on request two turns ago. |
| F3.1–F3.4 Home / Members / Services / Finances | **Screens exist** | `HomeDashboardView` (1,076 lines) with KPI cards and activity; Members 4 sub-tabs; Services & Worship 4; Giving & Stewardship 5. Every one is reachable and in the accessibility audit's screen list. |
| F4.5–F4.10 Communications / Ministries / Reports / Governance / Settings / Admin | **Screens exist; several are decorative** | All present. But only **ten** of the **36** view files read the live store; Communications, Governance, Settings, Admin and most finance sub-tabs render static mock arrays with no handler. |
| F5 — command palette (`Cmd/Ctrl + K`) | **Missing** | **0** files reference `metaKey` or `ctrlKey`. |
| F5 — toast system | **Exists** | 6 files. |
| F5 — empty states "for every list/table" | **Largely missing** | **2** sites carry a "No <thing>" message. |
| F5 — loading states | **Partial** | 5 files. |
| F5 — data density toggle | **Partial** | 2 files. |
| "Prefer composition over large monolithic components" (rule 2) | **Legitimate finding** | `GovernanceView` **1,489** lines, `AdminSecurityView` **1,406**, `HomeDashboardView` **1,076**; ~19,000 lines across the church components. |
| "TypeScript strictly (no `any`)" (rule 2) | **Mostly true** | **17** sites use `any`. |
| "Make tables sortable and filterable where data is listed" (rule 6) | **Largely missing** | **2** views reference sorting; filtering exists on the members register and inventory only. |
| Proposed file tree — `views/members/AddMemberView.tsx`, `HomeView.tsx`, `views/finances/`… | **Recommend against** | Today: flat `views/` plus `views/services/`, `views/communications/`, `views/settings/`, and names like `HomeDashboardView.tsx`, `FindChristianView.tsx`. Moving 36 view files buys tidiness only. |
| "Use a simple global store (**Zustand** recommended)" (rule 8) | **New dependency for no gain yet** | Neither Zustand nor React Query is installed. `demoStore.tsx` already holds exactly the slice listed — current role and user, the register, the trash, the ledger, the inventory — and `permissions.tsx` gates by role. |
| "Mock data: `src/data/churchMockData.ts`" (state summary) | **Half the picture** | That file holds the seed arrays; the live state lives in `src/data/demoStore.tsx`, which the summary doesn't mention. |

Two further corrections the proposal should carry:

- **`src/index.css` cites a tool that isn't here.** Its focus-policy comment says the rule is
  "Verified by `tools/audit-focus.mjs`". No such file exists in this repo (`tools/` holds
  `audit-a11y.mjs`, `audit-dialogs.mjs`, `lib/`). The focus policy is real; the cited verifier is not.
  Either the audit should be restored or the claim softened — as written it promises evidence that
  isn't being produced.
- **The two audits are the definition of done that already works.** `npm run typecheck`,
  `audit:a11y` (36 screens, 269 controls) and `audit:dialogs` (87 dialogs) run on every pull request
  and exit non-zero on any finding. Anything new below has to keep them green.

---

## 2. What genuinely remains

Ordered. Each item is scoped to what it needs, and nothing here is a rename for its own sake.

**Step 1 — a component layer, built on the tokens that already exist.**
`src/components/ui/`: `Button`, `Input`, `Select`, `Card`, `Badge`, `Table` (sortable + empty state
built in), `EmptyState`, `Tabs`. Every one takes its colour from the existing `@theme` utilities, so
the kit *is* the enforcement mechanism. This is the proposal's F1.2 and the only item worth doing
first.

**Step 2 — convert the screens the kit touches.**
Sweep each screen's controls onto the kit as it is visited, rather than rewriting 5,587 class strings
in one pass. The hex-utility count falls as a by-product; the audits catch every regression. A
mechanical global rename is possible but is a large diff with no user-visible result.

**Step 3 — the states the proposal is right to demand.**
Empty, loading and error states for every list. Today two sites have an empty message and five have a
loading state. This is visible in a demo and takes a fraction of the token work.

**Step 4 — make the decorative panels honest, or make them work.**
Communications, Governance, Settings, Admin and the charity/offerings/welfare/project-funding tabs
currently accept input and discard it. Either bind each to `demoStore` (the mechanism exists — the
members register and inventory show how) or mark the screen unmistakably as a preview. A form that
silently drops a church's details is the worst of both.

**Step 5 — the two small global features worth having.**
A command palette (`Cmd/Ctrl + K`) is self-contained and demo-visible; it is the proposal's best F5
item. The header search is the opposite: it is already *shown* and does nothing, so it either filters
the current screen or comes out.

**Step 6 — sorting and filtering on the tables that list data.**
The proposal's rule 6. Only 2 views sort today.

**Step 7 — decomposition, alongside the kit, not before it.**
Split `GovernanceView`, `AdminSecurityView` and `HomeDashboardView` as their sections move onto the
kit. Splitting them first means moving code twice.

**Step 8 — file renames and directory moves.** Only if you want them. Deferrable indefinitely; they
serve the reader of the repo, not the user of the app.

---

## 3. Definition of done, reconciled

The proposal's list, made checkable against this repo:

1. Uses the existing Warm Ember tokens — `bg-warm-canvas`-style utilities, not new hex literals.
2. Has empty, loading and error states where it lists anything.
3. `npx tsc --noEmit` clean.
4. `node tools/audit-a11y.mjs` and `node tools/audit-dialogs.mjs` exit 0 and audit one more screen
   than before.
5. `npm run build:share` still emits exactly one `index.html`.
6. No new dependency without a sentence explaining what it replaces.

---

## 4. The backend proposal, against the decision to port ECCLESIA

The proposed backend document describes **the stack ECCLESIA already runs** — Express, Prisma,
PostgreSQL, bcrypt, JWT — so most of it is a description of the thing being ported, not new work. What
differs is worth being precise about, because two of its rules would cost real effort:

| Proposed rule | Reality |
| --- | --- |
| Stack: Express + TS + Prisma + Postgres | ECCLESIA: Express `^4.21.0`, Prisma `5.22.0`, TypeScript `^5.6.2`. Confirmed in `backend/package.json`. |
| "Validate all inputs with Zod" | **Already satisfied** — zod is imported in **12** backend source files. |
| Response shape `{ success, data, message, meta }` | **Contradicts the live contract.** ECCLESIA returns resources bare and failures as `{ "error": "human readable message" }`; `API.md` and `src/services/api.ts` match it 1:1 (`docs/backend-blueprint.md` §5). Adopting an envelope means rewriting every route, the client dispatch layer and the written contract — for no capability. |
| PostgreSQL (production), **SQLite (development)** | The 28-model schema uses `Decimal` money, enums and JSON columns, and the deployment is Docker + Postgres on the parish LAN. A second dialect means a second migration path and two sets of type quirks. Recommend Postgres only. |
| "Create complete `schema.prisma`" with a minimum of 24 models | **The third derivation of one model.** ECCLESIA implements **28** models; `docs/backend-blueprint.md` §2 already maps Praxis's sections onto them. Port and reshape; don't re-derive. |
| "JWT + optional refresh token" | Neither system has refresh tokens. `docs/backend-blueprint.md` §3 notes the consequence: a 7-day JWT cannot be withdrawn before it expires. Add only when revocation is actually required. |
| Phases B1–B7 (foundation → auth → members → services → finances → comms) | The *frontend* order. Keep the backend doc's §10 order instead: Phase 0 replaces the notebook (users, roles, auth, `pg_dump` backups with one rehearsed restore, data export), then the domains ECCLESIA proves out. |
| "Seed data must include Bishop Sammy and Rev. Alice as users + members" | Already the mockup's data. The seed script is a port target, not a new design. |

Two structural facts the proposal doesn't account for, both from the backend doc:

- **Three of Praxis's sections have no ECCLESIA counterpart** — Services & Worship, Church Council,
  Groups & Fellowships. Porting gives you the other seven; these three are *new backend domains*.
- **Two ECCLESIA areas still have no mockup** — Ledgers and HR/Payroll. Inventory is now built; these
  two remain the largest gaps on the console side.

---

## 5. Left to the church and to you

- Whether the 5,587 hex utilities get migrated in a sweep or strangled by the kit (Step 2).
- Whether the decorative panels are wired to the store or labelled as previews (Step 4).
- Whether the proposed file renames are wanted at all (Step 8).
- Whether the response envelope is worth adopting over ECCLESIA's live contract (§4).
- The existing backend gap analysis — data-protection obligations under Kenya's Data Protection Act
  2019 (consent, retention, erasure) — needs the church's accountant and leadership, not an engineer's
  guess. `docs/backend-blueprint.md` §7 keeps that flag.
