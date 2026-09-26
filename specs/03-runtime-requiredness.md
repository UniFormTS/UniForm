# 03 — Runtime requiredness

Depends on [02 — Container components and `<Field>`](./02-containers-and-field.md) (for the `<Field>` marker and the path/visibility resolution it introduces).

## Problem

Whether a field is required often depends on other values (a lookup matrix, a backend flag, a sibling in the same array row). With Zod alone the rule has to be written twice — once in `superRefine` for submit, once more for the asterisk — and the two drift.

## API

- `form.setRequired(path, predicate)` — chainable, on the `UniForm` / `createForm` definition. `predicate(scope, allValues) => boolean`.
- `fields={{ x: { requiredWhen: predicate } }}` — the same slot, per field. When both are registered for one path, the last registration wins.
- `ctx.setFieldMeta(path, { required: true | false })` — imperative, from `setOnChange` handlers. Overrides both, for the marker **and** for submit.
- Export `FieldRequirement` (the predicate type) and `isEmptyValue`.

## Requirements

- **One source of truth.** The same rule drives the asterisk, `aria-required`, and submit validation. The schema field should be `.optional()`; document this.
- **Array item paths.** `'lines.reason'` is evaluated per row, with the row as `scope` — the same convention as `setCondition`. Indexed paths (`'lines.0.reason'`) are also accepted. `allValues` is always the whole form.
- **Empty** means `undefined`, `null`, `''` or `[]`. `false` and `0` are values. Whitespace-only strings are values (trim in the schema if needed).
- **Error.** Type `'required'`. Message precedence: per-field `messages[path]`, then `messages.required`, then `'This field is required'`. The existing "is this a required-type error" check must include `'required'`.
- **Zod wins.** An error Zod already reported at the same path is never overwritten.
- **Blocks submit.** When a dynamic required error is added, the resolver returns no values.
- **Only enforceable fields.** Skip the requirement when the field:
  - is hidden by a false `condition` — its own or an ancestor's, evaluated in the correct scope (row vs whole form); or
  - belongs to an inactive discriminated-union variant; or
  - has been made optional with `setFieldMeta(path, { required: false })`.

  `meta.hidden` does **not** skip (hidden fields may be placed with `<Field>`).

- **Fresh state.** Requirements, dynamic meta, conditions and the active variant are read at validation time — the resolver must not need rebuilding when they change.

## Acceptance

- The asterisk and `aria-required` flip live as a sibling value changes.
- Submit is blocked when the predicate is true and the value empty; allowed when the predicate is false or the value is filled.
- `false` and `0` count as filled.
- `messages.required` overrides the default message.
- A `.min(5)` Zod failure keeps its own message.
- Per-row predicates fire per row and anchor the error at `lines.N.reason`.
- `requiredWhen` via the `fields` prop behaves like `setRequired`.
- A required field hidden by `setCondition` does not block submit; it blocks again once shown.
- `setFieldMeta(path, { required: true })` blocks submit; `{ required: false }` lifts a `setRequired`.
