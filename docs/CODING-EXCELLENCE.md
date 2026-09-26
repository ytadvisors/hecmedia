# Coding Excellence Standard

This standard is required for changes to the HEC Media frontend. It turns the
failure modes we have encountered into repeatable engineering and review gates.

## Definition of done

A change is complete only when all applicable items below are true:

1. The bug is reproduced or the intended behavior is captured by a failing
   automated test before the implementation is accepted.
2. The implementation has one clear source of truth for shared behavior. Do not
   duplicate breakpoints, media precedence, GraphQL fallbacks, or URL rules in
   multiple components without a test that keeps them aligned.
3. Unit/contract tests, lint, and a production build pass. A focused Jest run may
   report global coverage failures; the full test suite is the required gate.
4. User-visible changes are exercised against the MBA Docker CMS and frontend,
   not only mocked data. Capture screenshots at the affected viewport sizes.
5. The branch is reviewed through a PR. Do not deploy from an unreviewed branch.

## CMS and GraphQL contracts

- Treat `hectv-wp` as the content system of record. GraphQL query changes must
  have matching CMS contract evidence and frontend query/component tests.
- Prefer direct, scoped queries over fetching an entire taxonomy or post
  collection and filtering in the browser.
- A missing optional field may degrade only the feature it owns. It must not
  blank unrelated page content.
- Preserve intentional provider behavior: when both video IDs exist, YouTube is
  preferred and Vimeo remains the fallback.
- Preserve media roles: `postHero` is article-page-only; `videoImage` and
  `postHeader` are shared card/search/Trending/related thumbnails.

## Responsive UI

- Put behavioral breakpoints behind a named helper or variable and test the
  boundary on both sides. The homepage mobile contract is inclusive through
  769px; required checks are 500, 501, 600, 768, 769, and 770px.
- Use explicit image dimensions plus `object-fit` to prevent layout shift,
  stretching, and overlap.
- Components that represent the same UI role must consume a shared sizing
  contract. Trending Now and Spotlight rail thumbnails are one such pair.
- Review the rendered page at the target widths in MBA Docker and retain
  screenshots with the PR evidence.

## Refactoring discipline

- Add characterization tests before changing legacy behavior.
- Extract pure helpers for decisions; keep rendering components focused on
  composition and presentation.
- Keep diffs narrow. Separate unrelated cleanup unless it is required to make
  the requested change safe.
- Remove temporary logging, feature probes, generated screenshots, and local QA
  overrides before committing.
- Comments must explain the constraint or failure mode, not restate the code.

## Review checklist

- [ ] Reproduction and regression test are linked to the issue.
- [ ] Data/provider/media precedence is explicit and tested.
- [ ] Responsive boundary and no-overlap checks pass where relevant.
- [ ] `npm test`, `npm run lint`, and `npm run build` pass.
- [ ] MBA Docker screenshots and save/reopen evidence are attached.
- [ ] No secrets, production writes, temporary diagnostics, or deploy artifacts
      are included.
