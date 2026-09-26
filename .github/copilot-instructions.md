# UniForm — Copilot Guidance

## Superpowers skills (mandatory)

Superpowers skills are installed in `.agents/skills/`. **Before any response or action** — including clarifying questions, exploring the codebase, or reading files — read `.agents/skills/using-superpowers/SKILL.md` and follow it exactly:

- If there is even a 1% chance a skill applies, invoke it (read its `SKILL.md`) and follow it. This is not optional.
- Announce `Using [skill] to [purpose]`, and create a todo per checklist item the skill defines.
- Process skills come first, then implementation skills:
  - New features / behavior changes → `brainstorming` (then `writing-plans`).
  - Bugs, test failures, unexpected behavior → `systematic-debugging`.
  - Any implementation code → `test-driven-development`.
  - Before claiming work is done or passing → `verification-before-completion`.
- Explicit user instructions override skills; skip a skill workflow only when the user says so.

## Repo structure

```text
packages/core/       — library source (published as @uniform-ts/core)
apps/playground/     — Vite dev app with live examples (Example1.tsx … ExampleN.tsx)
docs/                — Docusaurus site (uniformts.github.io/UniForm)
README.md            — root README (source of truth — kept in sync with packages/core/README.md)
```

## Commands

| Task             | Command                                                             |
| ---------------- | ------------------------------------------------------------------- |
| Run tests        | `pnpm test` (from root) or `pnpm test:watch` inside `packages/core` |
| Build library    | `pnpm build`                                                        |
| Start playground | `pnpm dev`                                                          |
| Start docs site  | `pnpm docs:dev`                                                     |

Tests use **Vitest + @testing-library/react** (`packages/core`).

## Workflow for any change to the library

1. **Implement** the fix/feature in `packages/core/src/`.
2. **Add tests** in the relevant test file. Run `pnpm test` and confirm all pass.
3. **Update docs** — relevant guide(s) in `docs/docs/guides/` and/or the API reference.
4. **Sync both READMEs** — `README.md` (root) and `packages/core/README.md` must always be **identical**. `packages/core/README.md` is the one published to npm (`prepack` copies the root README, but keep both files in sync manually so editors see the right content).

## Key files

- `packages/core/src/UniForm.ts` — `UniForm` class, `createForm`, `setCondition`, `setOnChange`
- `packages/core/src/types/utils.ts` — `DeepKeys`, `DeepFieldValue`, `ConditionValues` utility types
- `packages/core/src/hooks/` — custom hooks
- `packages/core/src/components/fields/` — per-type field renderers
