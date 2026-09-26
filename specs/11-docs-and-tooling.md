# 11 — Docs and tooling

## 11.1 Docs TypeScript config

`docs/tsconfig.json` extends `@docusaurus/tsconfig`, so `@theme/*`, `@docusaurus/*` and CSS-module types resolve. Override only what is needed on top. `pnpm -r exec tsc --noEmit` must pass for `docs`.

## 11.2 Vendored agent skills

- Commit a third-party skill **once** — not in both `.agents/skills/` and `.claude/skills/`. Either symlink one location to the other, or gitignore the installed copies and restore them from `skills-lock.json`.
- The first-party `uniform-best-practices` skill lives in `skills/`; the installed copy is refreshed with the skills tool (its hash is pinned in `skills-lock.json`), not edited by hand.
- Fix the `.gitignore` entry `./claude/settings.local.json` → `.claude/settings.local.json`.

## 11.3 README sync

Every feature PR updates its guide / API page and keeps `README.md` and `packages/core/README.md` identical (`diff README.md packages/core/README.md` is empty). Consider a CI step that enforces it.

## 11.4 Tests on Node 25+

Node 25 ships a built-in global `localStorage` that shadows jsdom's inside Vitest, so storage tests fail with `localStorage.getItem is not a function`. Either:

- disable it for the test workers on Node versions that support the flag (`--no-webstorage`), or
- document running tests with `NODE_OPTIONS=--no-webstorage`.

CI's Node 22 / 24 matrix is unaffected.

## 11.5 Test hygiene

- Restore spies and clear storage in `afterEach` (or `restoreMocks: true` in the Vitest config) so a failing assertion cannot leak state into later tests.
- Test names describe behaviour; no internal ticket or work-item identifiers.
