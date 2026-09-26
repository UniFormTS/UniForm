# Feature specs

Self-contained specifications for the next round of `@uniform-ts/core` work. Each spec describes the problem against the current `main`, the API, the behavioural rules and the acceptance tests — no other context is needed.

## Index and order

| Spec                                                                    | Depends on |
| ----------------------------------------------------------------------- | ---------- |
| [01 — Arrays](./01-arrays.md)                                           | —          |
| [02 — Container components and `<Field>`](./02-containers-and-field.md) | 01         |
| [03 — Runtime requiredness](./03-runtime-requiredness.md)               | 02         |
| [04 — Error tree](./04-error-tree.md)                                   | 03         |
| [05 — Write options and batched writes](./05-write-options.md)          | —          |
| [06 — `addOnChange`](./06-add-on-change.md)                             | —          |
| [07 — Select option identity](./07-option-identity.md)                  | —          |
| [08 — Persistence hardening](./08-persistence.md)                       | —          |
| [09 — Fixes to existing features](./09-existing-feature-fixes.md)       | —          |
| [10 — Zod `.meta()` augmentation](./10-zod-augmentation.md)             | —          |
| [11 — Docs and tooling](./11-docs-and-tooling.md)                       | —          |

## Every spec, every PR

- Write a failing test that reproduces the problem before the fix.
- Update the relevant guide in `docs/docs/guides/` and/or the API page in `docs/docs/api/`.
- Keep `README.md` and `packages/core/README.md` identical.
- Assertions that something did **not** happen (no validation, no write) must wait for pending work to settle first, or they pass vacuously.

## Out of scope

- Headless mode: a state hook above `<AutoForm>`, a provider, reading form values outside `<AutoForm>`, rendering `<AutoForm>` into an externally created store, drafts that outlive one `<AutoForm>`.
- A declarative dependency graph (`setDependency`).
- Async storage adapters.
- Exporting `useField`.
