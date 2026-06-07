---
description: 'Create an agent skill that captures UniForm (@uniform-ts/core) best practices. Use when the user wants to package UniForm conventions, schema-first form patterns, component-registry usage, or AutoForm guidance into a reusable SKILL.md.'
name: 'Create UniForm Best Practices Skill'
argument-hint: 'Optionally name the skill or list extra topics to cover'
agent: 'agent'
---

Create a new agent skill that teaches an AI agent how to build forms with **UniForm** (`@uniform-ts/core`) correctly and idiomatically. This is a single focused task: author one skill, grounded in this repository's source of truth.

## Execution sequence

Perform these steps in order. Do not interleave reading and writing.

1. **Read all source-of-truth files** listed below. If any cannot be read, stop and tell the user which file is missing before proceeding — do not infer or invent API details for unread files.
2. **Draft each mandated topic section** (the 10 topics below, plus any extra topics the user named) with imperative guidance and code examples.
3. **Validate every code example** against the playground examples in `apps/playground/src/examples` so they compile against the real API.
4. **Assemble `SKILL.md`**, then apply the file-splitting rule under "Output".
5. **Verify the frontmatter** (see "Frontmatter requirements").
6. **Deliver the closing summary** (see "Before finishing").

## Output

Create the skill at `.agents/skills/uniform-best-practices/SKILL.md` (this repo's skills live under `.agents/skills/`).

If `.agents/skills/uniform-best-practices/SKILL.md` already exists, show the user a diff of the changes you intend to make and ask for confirmation before overwriting.

Structure the skill for progressive disclosure: keep the core workflow and shared guidance in `SKILL.md`, and move per-topic deep detail into `references/<topic>.md` files. Split a topic's detail into a `references/*.md` file when `SKILL.md` prose + code examples together exceed 500 non-blank lines measured in the raw markdown file. Reference each split file clearly from `SKILL.md` with a note on when to read it.

Follow the structure defined by the `skill-creator` skill: YAML frontmatter (`name`, `description`) plus markdown instructions.

## Frontmatter requirements

- `name: uniform-best-practices` (must match the folder name).
- `description`: state what it does AND when to trigger it. Write the description so it instructs the agent to trigger this skill whenever the user mentions any of the listed trigger phrases, even if the request seems partial or exploratory — e.g., "Trigger this skill when the user mentions any of: [list]. Prefer triggering over skipping when uncertain." Trigger phrases to include: building a React form, rendering a form from a Zod schema, `AutoForm`, `createForm`, `createAutoForm`, `useArrayField`, component registry, field overrides, conditional fields, form validation/persistence/i18n with UniForm.

## Source of truth — extract best practices from these (do not invent APIs)

Read these in step 1, and base every recommendation on them:

- [README.md](../../README.md) — public API surface, core props, key concepts.
- [CLAUDE.md](../../CLAUDE.md) — repo conventions and the workflow for library changes.
- [packages/core/src/UniForm.ts](../../packages/core/src/UniForm.ts) — `UniForm`, `createForm`, `setOnChange`, `setCondition`.
- The guides in [docs/docs/guides](../../docs/docs/guides) — one file per topic (validation, conditional-fields, arrays, async, custom-components, discriminated-unions, field-overrides, layout, localization, persistence, plain-unions, programmatic-control, sections).
- The runnable examples in [apps/playground/src/examples](../../apps/playground/src/examples) — verify patterns compile against the real API.

If any source-of-truth file cannot be read, stop and tell the user which file is missing before proceeding. Do not infer or invent API details for unread files.

If anything in the docs conflicts with the actual source in `packages/core/src/`, trust the source. Record every such conflict and report them all in the closing summary (see "Before finishing").

## Topics the skill must cover

Write imperative, "why it matters" guidance (not just rules) for each of these as a numbered section, with at least one code example each:

1. **Schema-first design** — define a Zod V4 schema as the single source of truth; let UniForm introspect it rather than hand-wiring inputs.
2. **`createForm` vs `createAutoForm`** — when to wrap a schema with `createForm`, and when to bake design-system defaults once with `createAutoForm`.
3. **Component registry & overrides** — map Zod types via `components`; use `fields` for one-off per-field overrides; type custom components with `FieldProps<Value>`.
4. **Field overrides** — labels, descriptions, ordering, sections, and conditions via dot-notated paths without touching the schema.
5. **Conditional fields** — `condition` / `setCondition`, including row-local sibling conditions inside array rows.
6. **Array fields** — `useArrayField`, `minItems`/`maxItems` from the schema, external array controls.
7. **Validation** — Zod messages, async validation, and `setErrors`.
8. **Programmatic control** — the imperative handle (`reset`, `submit`, `setValues`, `getValues`, `focus`).
9. **Persistence** — `persistKey` and custom storage.
10. **Localization** — the `labels` prop and the locale packs under `@uniform-ts/core/locales/{en,he,es}`.

If the user names additional topics via the argument-hint, add each as a new numbered section after section 10 in `SKILL.md`, following the same imperative format with at least one code example.

## Writing style for the generated skill

- Imperative voice; explain the reasoning behind each practice instead of heavy-handed "MUST" lists.
- Include short, correct code examples that match the real API (validate against the playground examples).
- Keep examples copy-pasteable and minimal.

## Before finishing

Complete these closing actions in order:

1. Confirm the file is at `.agents/skills/uniform-best-practices/SKILL.md` with valid YAML frontmatter (quote any `description` that contains a colon), and that `name` matches the folder name.
2. If you detected any doc-vs-source conflicts while reading, list them all in a `## ⚠️ Doc Discrepancies Found` section at the end of your response (outside `SKILL.md`), with the conflicting doc text, the correct source text, and the affected `SKILL.md` section. If none were found, state that explicitly.
3. Briefly summarize the topics covered and ask the user whether they want test cases (`evals/`) set up via the `skill-creator` workflow to verify triggering and output quality.
