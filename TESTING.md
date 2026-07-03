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
npm test           # runs `jest` once, with coverage
npm run test:watch # jest --watch
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

`.github/workflows/ci.yml` runs on every push/PR to `master`:

- **`test` job** (blocking) — `yarn install --frozen-lockfile && yarn test`. This is the merge gate.
- **`lint` job** (`continue-on-error: true`, non-blocking) — `yarn lint`. Non-blocking today because
  `master` already has 6 pre-existing eslint errors (curly-brace/`prefer-const`/
  `no-use-before-define` issues in `BottomNav`, `ReactForm/SelectMenu`, `SinglePost`) unrelated to
  Phase 1 testing-infra work. **Follow-up recommended:** a small lint-cleanup task to fix those,
  then flip `lint` to blocking.

**No automated preview/prod deploy step.** Per Phase 0 D3 (`phase0-D3-access-and-preview.md`):
deploy-capable AWS credentials (`hecadmin`) are intentionally human-gated (passphrase-unlocked,
not self-service for an agent) and any deploy requires explicit Yomi approval regardless of
credential access. Two existing staging URLs (`development.hecmedia.org`, `develop.hecmedia.org`)
are recommended as shared manual preview targets for Jayne's review in the near term; true
per-branch ephemeral previews are a separate, larger project blocked on an unresolved ACM
wildcard-certificate question (see D3 §2/§5) and are out of scope here.

## Known gaps (left for T3 — critical-path coverage)

- Three components have tests today (`Footer`, `SocialLinks`, `SideNavigation`) — all
  presentational, prop-in/markup-out. This task's scope was standing up the harness and CI, not
  full coverage of the ~35-component tree.
- Components wired to Redux (`redux-form`), Apollo (`@apollo/react-hooks`), or `next/router` will
  need a test wrapper (mock store / mock Apollo provider / mock router) — none of the current
  components exercise that path yet, so no wrapper utility exists. Add one under
  `__mocks__/testUtils.js` (or similar) when the first such component gets a test, rather than
  building it speculatively now.
