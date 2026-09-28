# InsightsIQ — Static Demo Build

A backend-free copy of the InsightsIQ frontend, built to be deployed to GitHub
Pages and clicked through as a live demo. Same screens, same styling, same
flows as the real application — but no FastAPI service, no Postgres, and no
network calls of any kind.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Sign in with either demo account (both are pre-filled on the login screen):

| Account                  | Role    | Password   | What it can do                  |
| ------------------------ | ------- | ---------- | ------------------------------- |
| `demo@insightsiq.com`    | Planner | `demo123`  | Full edit access to the plan    |
| `manager@insightsiq.com` | Manager | `demo123`  | Read-only, same as in production |

---

## Deploying to GitHub Pages

The build is portable: it uses a **relative asset base** and a **hash router**,
so the same `dist/` works at a domain root, under
`https://<username>.github.io/<repository-name>/`, or even opened from disk.
You never have to configure the repository name.

### Option A — GitHub Actions (recommended)

1. Push this folder to a GitHub repository.
2. **Settings → Pages → Build and deployment → Source: _GitHub Actions_**.

That's it. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs
the tests, builds, and publishes on every push to `main`.

### Option B — manual

```bash
npm run build          # outputs to dist/
npm run preview        # sanity-check the built output locally
```

Publish the contents of `dist/` to your `gh-pages` branch or `/docs` folder.

### Why hash routing

GitHub Pages serves static files and cannot rewrite `/modules/pempal` back to
`index.html`, so a path-based router 404s on refresh or on a shared deep link.
Hash routes (`#/modules/pempal`) are resolved entirely in the browser. URLs look
like:

```
https://<username>.github.io/<repository-name>/#/modules/pempal
```

---

## How the mock works

Only two files from the original frontend were replaced. Every page, tab,
component, chart and context is untouched.

| File                     | What changed                                                                    |
| ------------------------ | ------------------------------------------------------------------------------- |
| `src/services/api.js`    | Same exports (`authApi`, `pempalApi`, `chatApi`, `refreshAccessToken`) — resolves against the local store instead of `fetch` |
| `src/hooks/useWebSocket.js` | Same hook signature — subscribes to a local event bus instead of a socket     |

Everything behind them lives in **`src/mocks/`**:

| Module            | Responsibility                                                                         |
| ----------------- | -------------------------------------------------------------------------------------- |
| `seedData.js`     | Catalog, promo periods, MF/LY/LLY benchmarks, demo users, and the rules that expand into a pre-filled working plan |
| `store.js`        | Stands in for Postgres. Reference data in code, the mutable plan in `localStorage`, plus the event bus |
| `pempalEngine.js` | JavaScript port of the FastAPI service layer — audit, summary, rollups, dashboards      |
| `authEngine.js`   | Sign-in, token round-trip, and the Planner/Manager role gate                            |
| `chatEngine.js`   | Port of the keyword assistant behind the chat endpoint                                  |

### Derived, not canned

The aggregates are **recomputed from the plan on every call** rather than
returned as fixed JSON. That is what keeps the demo convincing: change an offer
in Promo Details and the Summary metrics, GM% health grid, audit flags,
marketed rollup, fiscal timeline and heatmaps all move with it — including the
compliance rules. Make a standard offer deeper than its TOD offer and the
"TOD Not Deeper" flag appears, exactly as the real service would raise it.

### What persists

Your edits are saved to `localStorage` and survive a page reload, the same way
the real backend persisted them. Open the demo in two browser tabs and they
stay in sync — the event bus mirrors changes across tabs, standing in for the
WebSocket broadcast.

Nothing leaves the browser. Clearing site data returns everything to the seed.

---

## Starting state

The seeded plan is deliberately shaped so no screen is empty and the Audit tab
has something to show, while staying **submittable out of the box**:

- ~185 offers across 16 products × 3 channels × 5 periods, using all six offer types
- Deeper markdowns on slow movers (high weeks-on-hand), full ticket on fast sellers
- Department GM% health spans on-target, watching, and off-target
- **0 blocking issues** — Submit succeeds immediately
- A handful of advisory flags: one unplanned style, two fast sellers on promo,
  and deep TOD events sitting under the 52.5% PCF floor

To see the blocked-submission path, type an invalid percentage (say `95`) into
any `% OFF` cell and hit Submit.

---

## Resetting

"Reset All" on the Audit tab behaves as it did in production: it clears the
working plan and keeps the periods. To get the full demo dataset back, run this
in the browser console:

```js
insightsiqMock.reseed()   // then reload
```

Also available: `insightsiqMock.snapshot()` to inspect current plan state, and
`insightsiqMock.signOut()`.

---

## Tests

```bash
npm run test:run     # 111 unit tests (Vitest) — mock engine, auth, chat, UI components
npx playwright test  # end-to-end (starts the dev server automatically)
```

The Playwright suite now runs without a backend, since sign-in resolves
locally.

---

## Keeping the mock up to date

When the real frontend changes, copy the changed files across as-is. You only
need to revisit `src/mocks/` if the **API contract** changed:

- New endpoint → add a method to `pempalApi` and a function in `pempalEngine.js`
- New field on a response → extend the matching builder in `pempalEngine.js`
- Different demo data → edit the tables at the top of `seedData.js`

Two things must stay as they are for GitHub Pages to keep working: the
`HashRouter` in `src/App.jsx`, and the relative `base` in `vite.config.js`. Any
new runtime reference to a file in `public/` should be prefixed with
`import.meta.env.BASE_URL`.
