# 07 — Select option identity

## Problem

`DefaultSelect` stringifies option values for the DOM and emits `e.target.value`. So:

- numeric and boolean option values come back as **strings**;
- object values (a composite key such as `{ col1, col2 }`) all become `"[object Object]"`, so every option collapses onto one key and selection breaks silently.

## API

- `SelectOption<TValue = string | number>` — generic value type.
- `meta.getOptionKey?: (option: SelectOption<never>) => string` — per field.
- `meta.isOptionEqual?: (formValue: unknown, optionValue: unknown) => boolean` — per field.
- The same two as form-wide defaults on `<AutoForm>` props and in `createAutoForm({ ... })`. Per-field meta wins over the form-wide default.
- Export `GetOptionKey`, `IsOptionEqual`.

## Requirements

- **Key vs value.** The key is used only for React keys and the DOM `value` attribute. `onChange` always emits the option's **raw** `value`.
- **Default key.** Strings, numbers and booleans → `String(value)`. `null` / `undefined` → `''`.
- **Object values without `getOptionKey`** throw a clear error naming the field and telling the user to provide `getOptionKey`.
- **Selected option lookup**, in order:
  1. `isOptionEqual(formValue, option.value)` when provided;
  2. `Object.is(option.value, formValue)`;
  3. key equality — values coming back from the store may be structural clones, so reference identity is not enough.
- **Duplicate keys** (two options with the same key):
  - development: throw, naming the field and the key;
  - production: `console.error` instead, so bad API data does not unmount the whole form.
  - Detect production with a literal `process.env.NODE_ENV === 'production'` inside `try`/`catch`, so bundlers can inline it and environments without `process` fall back to development behaviour.
- Works for enum selects inside primitive-array rows.
- Custom select components receive the same `meta.getOptionKey` / `meta.isOptionEqual` (form-wide defaults injected into every field's meta) so they can reuse the logic.

## Acceptance

- A composite `{ col1, col2 }` value round-trips unchanged through submit.
- The right option is re-selected after a re-render (value read back from the store).
- Scalar options behave exactly as before; numeric values submit as numbers.
- An object value without `getOptionKey` throws a message naming the field.
- Duplicate keys throw in development and `console.error` (no throw) in production.
- Form-wide `getOptionKey` via `createAutoForm` works; per-field meta wins over it.
