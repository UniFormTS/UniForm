---
title: useFieldError() / useFieldErrors()
sidebar_position: 11
---

# `useFieldError()` / `useFieldErrors()`

Read validation errors at **any** path — including paths that are not rendered fields.

Cross-field rules live in `superRefine` and are often anchored to an array element (`['lines', 0]`), a whole container, or the form itself (`[]`). None of those has a leaf field to render the message on. These hooks are where those issues become renderable, so you never have to validate twice.

```tsx
import { useFieldError } from '@uniform-ts/core'

function RowLayout({ children, index }: ArrayRowLayoutProps) {
  const error = useFieldError(`lines.${index}`)
  return (
    <div>
      {error && <p role='alert'>{error}</p>}
      {children}
    </div>
  )
}
```

## `useFieldError()`

```ts
function useFieldError(path: string): string | undefined
```

| Path        | Resolves to                                      |
| ----------- | ------------------------------------------------ |
| `'email'`   | A leaf field error                               |
| `'address'` | An error anchored to a whole object              |
| `'lines.0'` | An error anchored to an array element            |
| `''`        | The form root — cross-entity issues with no path |

Reactive, and the path does **not** have to be a rendered field. Inside a component registered for an object or array field, paths are relative to that field (see [`useFieldPath`](./use-field#usefieldpath)); `''` always means the form root.

## `useFieldErrors()`

```ts
function useFieldErrors(path?: string): FormIssue[]
```

Every issue at or beneath `path`, flattened — so a container component can render a summary for its own subtree. Pass `''` (the default) to collect the whole form.

```ts
type FormIssue = {
  /** Dot-notated path. `''` for the form root. */
  path: string
  message: string
  /** Error code, e.g. 'too_small', 'required', 'manual'. */
  code?: string
}
```

```tsx
const issues = useFieldErrors('lines.0')
// [{ path: 'lines.0.sku', message: 'SKU too short', code: 'too_small' }]
```

## `useFormErrors()`

```ts
function useFormErrors<TSchema>(form: {
  readonly schema: TSchema
}): FieldErrors<Values>
function useFormErrors<TValues>(): FieldErrors<TValues>
```

The whole typed error tree, reactively. Prefer the scoped hooks above when you only care about one path — this one re-renders on every error change.

## Setting issues yourself

`formMethods.setIssues(issues)` pushes an arbitrary list into the same tree, including non-field paths and the root — shaped for backend `/validate` responses, which rarely arrive as a flat map keyed by field name.

```ts
formMethods.setIssues([
  { path: 'lines.0', message: 'Duplicate SKU in this order' },
  { path: '', message: 'Order exceeds the customer credit limit' },
])
```

`setError` / `setErrors` continue to work for the flat, field-keyed case.

## `<FormErrorSummary>`

Lists exactly the issues that no field renders, so nothing is silently swallowed.

```tsx
<FormErrorSummary title='Please fix the following' />
```

| Prop             | Type                                 | Description                                                    |
| ---------------- | ------------------------------------ | -------------------------------------------------------------- |
| `path`           | `string`                             | Collect at or beneath this path (default: the whole form)      |
| `unanchoredOnly` | `boolean`                            | Default `true` — list only issues with no field to render them |
| `title`          | `string`                             | Heading rendered when there is at least one issue              |
| `className`      | `string`                             | Class for the wrapper                                          |
| `children`       | `(issues: FormIssue[]) => ReactNode` | Render your own markup instead of the default list             |

Renders `null` when there is nothing to report.

:::note Why not `errors` on the context?
The error tree is **not** placed on `AutoFormContextValue`. Doing so would change the context object's identity on every error change and re-render every consumer — including application chrome under `<UniFormProvider>`. These hooks subscribe through `useFormState`, which is both reactive and scoped.
:::

## Requirements

Must be called under `<AutoForm>` or [`<UniFormProvider>`](./uniform-provider).

See also: [Validation guide](/docs/guides/validation), [Dynamic Requiredness guide](/docs/guides/dynamic-requiredness).
