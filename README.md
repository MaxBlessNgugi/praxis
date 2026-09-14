# Praxis Church OS

A front-end prototype of a church office console, built for **Destiny Sanctuary Int'L, Nyahururu** —
and the clickable blueprint for the real system, [`ecclesia-church-management-system`](https://github.com/MaxBlessNgugi/ecclesia-church-management-system).

There is **no backend**. Everything runs in the browser against mock data, and the sign-in screen is a
demo transition rather than authentication. What the screens, vocabulary, figures and service times
describe is real; the records are not.

## Stack

React 19 · TypeScript · Vite 6 · Tailwind 4 · Material Symbols (self-hosted). No state library, no
router, no data-fetching library — the console is one shell with a section switcher.

## Layout

```
src/
  App.tsx                     sign-in gate → console, and the permission provider
  components/
    auth/AuthScreen.tsx       the entry gate (no backend: a demo transition)
    church/
      ChurchSystemApp.tsx     the shell: navigation, section routing, quick actions
      ChurchSidebar.tsx       eleven sections
      ChurchHeader.tsx        search, role, reset, quick action
      views/                  one component per screen, grouped by section
      dialog.ts               the shared dialog hook (focus, Escape, restore)
  data/
    demoStore.tsx             the editable demo data — one source per fact
    churchDomain.ts           the church's own facts: identity, service times, departments
    churchMockData.ts         the seed arrays the store starts from
  lib/
    export.ts                 CSV / Excel / print-to-PDF, dependency-free
    permissions.tsx           panel + action rights per role
  types.ts                    the domain types
```

### One source per fact

`demoStore.tsx` owns the members roll, the trash queue, the tithe ledger and the role being viewed.
Every count, ratio and KPI in the console derives from those arrays — the Home dashboard, the register
census, the ledger totals, the attendance and roster pickers. If a figure disagrees with the rows
underneath it, the derivation is the bug: fix that, never the literal.

It persists to `localStorage`, so a visitor's edits survive a reload. **Reset demo data** in the header
puts the original data back.

### Roles and permissions

Ported from ECCLESIA, which resolves rights the same way on both sides of the wire: nine panel keys ×
three actions (`view` / `edit` / `delete`) × four roles (`super_admin`, `admin`, `staff`, `viewer`),
with `super_admin` bypassing every check. The header's role selector switches which role you are
viewing the console as — a `viewer` keeps the read-only screens and loses the write controls, exactly
as ECCLESIA's `requireModule(panel)` middleware would refuse them.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on **port 3000** (the audits assume it) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build to `dist/` |
| `npm run build:share` | **One** self-contained `dist-share/index.html` — JS, CSS, fonts and the brand artwork inlined, for handing the demo to someone as a single file |
| `npm run audit:a11y` | Assistive-tech audit of every screen (a real browser) |
| `npm run audit:dialogs` | Keyboard audit of every dialog: naming, focus containment, Escape, focus restore |

The two audits need the dev server running, and Chrome installed — `CHROME=/path/to/chrome` overrides
the lookup. Both exit non-zero when their report holds a failure, and `.github/workflows/check.yml`
runs them with the typecheck and the build on every pull request.

## Reading further

- [`docs/backend-blueprint.md`](docs/backend-blueprint.md) — what a real backend needs, grounded in
  ECCLESIA's actual schema, routes, auth, permissions and backup design.
- The shareable demo and its landing page live in a separate repository, `praxis-mockup`.
