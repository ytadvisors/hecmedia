# Testing

Unit test harness: **Jest 24 + React Testing Library**, run against the components in this repo.

## Setup (one-time, already committed)

- `babel.config.js` — added so Jest can transpile JSX/ES modules. It just re-exports the
  `next/babel` preset Next.js already uses internally, so build behavior is unchanged.
- `jest.setup.js` — loads `@testing-library/jest-dom` matchers (`toBeInTheDocument()`, etc.) for
  every test file, wired via `jest.setupFilesAfterEnv` in `package.json`.
- `package.json` `jest` block (pre-existing) mocks `.scss`/`.css` imports and static assets
  (`__mocks__/jest/styleMock.js`, `__mocks__/jest/fileMock.js`), and turns on coverage collection
  for `components/**/*.js`.
- Devdependencies added: `@testing-library/react@9.5.0`, `@testing-library/jest-dom@5.11.9`
  (versions chosen for compatibility with React 16.8 / Jest 24, matching the rest of this repo's
  pinned toolchain).

## Running tests

```shell
yarn install       # or npm install
yarn test          # runs `jest` once, with coverage
yarn test:watch    # jest --watch
yarn test:e2e      # read-only live WPGraphQL + WP REST contract suite
yarn smoke         # checks the shared development site
```

Coverage output is written to `coverage/` (gitignored) and printed as a table in the terminal.

## Writing a test

Test files live next to the component they cover, named `<name>.test.js` (matches the existing
`testRegex` in `package.json`). Example: `components/Footer/index.test.js`.

```js
import React from "react";
import { render, screen } from "@testing-library/react";
import Footer from "./index";

it("renders without crashing", () => {
  render(<Footer />);
  expect(screen.getByAltText("logo")).toBeInTheDocument();
});
```

Prefer React Testing Library's `render`/`screen` queries (by role, text, label, alt text) over
snapshot tests or reaching into component internals — this repo's components are mostly simple
props-in/markup-out functions, which RTL's queries suit well.

## CI

`.github/workflows/ci.yml` runs on every push/PR to `master` and `develop`:

- **`lint` job** (blocking) — `yarn install --frozen-lockfile --ignore-scripts && yarn lint`.
- **`test` job** (blocking) — `yarn install --frozen-lockfile --ignore-scripts && yarn test`.
- **`preview-deploy` job** runs after tests for pull requests and `develop`; it safely exits with a
  warning until human-gated deploy secrets are configured.

**CI installs run with `--ignore-scripts`.** `node-sass@7.0.1` (its last-ever release; the package
is deprecated in favor of Dart Sass) cannot build its native V8 binding on Node 22 — confirmed both
on macOS/arm64 locally and on GitHub Actions' `ubuntu-latest`/x64 runners, same root cause: the
binding's `SetAccessor` call uses a V8 API signature Node 22 removed, so it fails identically
whether a prebuilt binary would be fetched or a from-source build is attempted (no prebuilt exists
for this Node/arch combo). This is a **pre-existing repo/toolchain gap**, unrelated to Phase 1 —
skipping install scripts in CI is safe only because neither `yarn lint` (pure JS) nor `yarn test`
(Jest mocks all `.scss`/`.css` imports via `jest.moduleNameMapper`) ever load node-sass's native
binding. Local `next build`/`next dev` still need a working node-sass — if that breaks for someone
on Node 22, the fix is either pinning local dev to Node ≤17 (last version node-sass 7 has prebuilt
binaries for) or migrating the app off node-sass to Dart Sass (`sass` package), which is a separate,
larger follow-up outside this task's scope.

**Preview deployment remains human-gated.** Per Phase 0 D3 (`phase0-D3-access-and-preview.md`):
deploy-capable AWS credentials (`hecadmin`) are intentionally human-gated (passphrase-unlocked,
not self-service for an agent) and any deploy requires explicit Yomi approval regardless of
credential access. Two existing staging URLs (`development.hecmedia.org`, `develop.hecmedia.org`)
are recommended as shared manual preview targets for Jayne's review in the near term; true
per-branch ephemeral previews are a separate, larger project blocked on an unresolved ACM
wildcard-certificate question (see D3 §2/§5) and are out of scope here.

## Coverage policy: the ratchet

Full-repo coverage (`components/`, `containers/`, `pages/`, `lib/`, `store/`) lands in
**reviewable batches** — one PR per directory group — rather than one giant PR. Each batch:

1. Adds real tests for its directory group.
2. Raises `coverageThreshold` in `package.json`'s `jest` block to match (or sit just under) the
   coverage the new tests actually achieve, so a regression fails CI (`yarn test` exits non-zero
   when a threshold is missed) but the bar never resets backward.
3. Never chases 100% on trivial glue (default-constructor params, `combineReducers` root files,
   pass-through no-op reducer branches) at the expense of meaningful branch coverage elsewhere.

Final target once every batch has landed: **global >=80% lines/statements, >=70% branches**,
per the Phase 2 frontend-coverage task.

**Batch 1 — `store/` (this PR):** reducers (pure unit tests over every action type, including the
error and no-op branches), action creators (every exported creator, defaults and overrides), and
`store/api/*` clients (axios mocked, asserting exact URL/params/payload shapes per call — not just
"was called"). `store/sagas/**` and the `combineReducers`/store-setup glue (`store/index.js`,
`store/reducers/index.js`) are intentionally excluded from `collectCoverageFrom` — sagas are async
orchestration best covered when a saga-testing approach is chosen, which is out of this batch's
scope; the glue files have no branches or logic of their own to test.

Current thresholds:

| Scope                                           | statements/lines | branches | functions |
| ----------------------------------------------- | ---------------- | -------- | --------- |
| `store/actions/**`                              | 100%             | 100%     | 100%      |
| `store/api/**`                                  | 100%             | 0%\*     | 100%      |
| `store/reducers/*Reducers.js`                   | 80%              | 70%      | 100%      |
| global (all 5 directories, most still untested) | 22%              | 12%      | 14%       |

\* `store/api/**` branch coverage floors at 0% because the only branches in these files are
default-constructor parameters (`constructor(props = {}) { super(props); }`) that every real
caller always supplies explicitly — not meaningful logic to cover.

**Planned follow-up batches:** components A–M, components N–Z, containers + pages, lib. Each
raises the global threshold and adds its own directory-scoped threshold in the same style as the
table above.

## API e2e contracts

`yarn test:e2e` is a separate Jest project (`jest.e2e.config.js`). It executes the 18 named
documents exported from `lib/graphql.js`, plus the read-only REST clients used by `store/api/`.
Assertions are deliberately shape-based: lists may be empty and nullable WP fields may be null,
but an unexpected response shape, GraphQL error, HTTP failure, or missing field fails the suite.

By default, the suite reads the live public endpoints only:

| Variable            | Default                             | Purpose            |
| ------------------- | ----------------------------------- | ------------------ |
| `APOLLO_CLIENT_URI` | `https://prod-wp.hectv.org/graphql` | WPGraphQL endpoint |
| `GATSBY_WP_HOST`    | `https://prod-wp.hectv.org`         | WP REST host       |

Override both variables to point to the approved staging endpoint for CI or staging verification.
CI receives them from protected `HECMEDIA_E2E_APOLLO_CLIENT_URI` and
`HECMEDIA_E2E_WP_HOST` secrets. If either secret is unavailable (including fork PRs), the `e2e`
job exits successfully with a warning instead of using the public defaults.

The e2e suite contains no write call. Any future add-comment, donation, or account mutation test
must call `writesAllowed()` from `tests/e2e/support/writeGuard.js`; it only returns true when
`E2E_ALLOW_WRITES=1` **and** every target is visibly a staging/local host. Production and unknown
hosts are denied in code regardless of the opt-in, so production remains read-only.

## Known gaps

- Tested today: `store/` (batch 1, this PR) plus the pre-existing `Footer`, `SocialLinks`,
  `SideNavigation`, `Header`, `Forms/NewsLetterForm`, and the home page from Phase 1. This is not
  yet full coverage of the ~114-component tree, the 15 containers, the other 13 pages, or `lib/`.
- Components wired to Redux (`redux-form`), Apollo (`@apollo/react-hooks`), or `next/router` will
  need a test wrapper (mock store / mock Apollo provider / mock router) — none of the current
  components exercise that path yet, so no wrapper utility exists. Add one under
  `__mocks__/testUtils.js` (or similar) when the first such component gets a test, rather than
  building it speculatively now.
