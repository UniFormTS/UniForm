# 05 — Write options and batched writes

## Problem

`formMethods.setValue` always validates and dirties, and `setValues(values)` validates once per key. A container component pushing values on every keystroke, or a twenty-key programmatic update, runs the whole schema far too often.

## API

```ts
type SetValueOptions = {
  shouldValidate?: boolean // default true
  shouldDirty?: boolean // default true
  shouldTouch?: boolean
}

setValue(name, value, options?: SetValueOptions): void
setValues(values: Partial<Values>, options?: SetValueOptions): void
```

Export `SetValueOptions`. Available on the `ref` handle, the context `formMethods`, and the `ctx` passed to `setOnChange` handlers.

## Requirements

- `setValue` passes the options through to react-hook-form, with the defaults above.
- `setValues` is one logical update:
  - writes every key with `shouldValidate: false` (other options honoured);
  - then, if `shouldValidate`, runs **one** validation pass over **only the written keys** — untouched fields must not start showing errors;
  - `shouldValidate: false` → no validation at all.

## Acceptance

Every "zero / exactly one" assertion waits for pending validation to settle (e.g. a short timer inside `act`) before counting.

- `setValue(k, v, { shouldValidate: false })` → zero validation passes.
- `setValue(k, v)` → validates and marks dirty.
- `setValues({ a, b, c })` → exactly one validation pass.
- `setValues({ a, b }, { shouldValidate: false })` → zero passes.
- With `a` required and empty, `setValues({ b: 'x' })` does not show `a`'s error; `setValues({ a: '' })` does.
