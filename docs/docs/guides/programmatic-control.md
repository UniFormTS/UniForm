---
title: Programmatic Control
sidebar_position: 9
description: Use the ref handle to imperatively control the form from outside its component tree.
---

# Programmatic Control

Attach a `ref` to `<AutoForm>` to get an `AutoFormHandle` — equivalent to [`FormMethods`](../api/types#formmethods) — that lets you read and set values, trigger submission, and reset the form from anywhere in your component tree.

For array-specific actions from inside the `<AutoForm>` tree (for example, external Add/Remove controls), use [`useArrayField()`](../api/use-array-field) instead of `ref` methods.

```tsx
import { useRef } from 'react'
import type { AutoFormHandle } from '@uniform-ts/core'

const formRef = useRef<AutoFormHandle<typeof schema>>(null)

<AutoForm ref={formRef} ... />
```

## Available methods

`AutoFormHandle` is exactly [`FormMethods`](../api/types#formmethods):

| Member               | Type                                     | Description                                      |
| -------------------- | ---------------------------------------- | ------------------------------------------------ |
| `setValue`           | `(field, value, options?) => void`       | Set a specific field value                       |
| `setValues`          | `(values: Partial<T>, options?) => void` | Set multiple field values in one update          |
| `getValues`          | `() => T`                                | Get all current values                           |
| `watch`              | `(field?) => T[field]`                   | Subscribe to a field value (or all values)       |
| `reset`              | `(values?) => void`                      | Reset the form, optionally to new default values |
| `resetField`         | `(field) => void`                        | Reset a single field to its default value        |
| `setError`           | `(field, message) => void`               | Set a manual validation error                    |
| `setErrors`          | `(errors) => void`                       | Set errors on multiple fields at once            |
| `setIssues`          | `({ path, message }[]) => void`          | Anchor issues at any path, including non-fields  |
| `clearErrors`        | `(fields?) => void`                      | Clear one or all errors                          |
| `submit`             | `() => void`                             | Programmatically trigger form submission         |
| `focus`              | `(field) => void`                        | Focus a specific field by name                   |
| `clearPersistedData` | `() => void`                             | Discard the persisted draft                      |
| `hasPersistedDraft`  | `() => boolean`                          | Whether a draft was restored on mount            |

## Write options and batching

`setValue` and `setValues` accept `SetValueOptions`:

```ts
type SetValueOptions = {
  shouldValidate?: boolean // default: true
  shouldDirty?: boolean // default: true
  shouldTouch?: boolean
}
```

Validation runs the **whole** schema, so for high-frequency writes — a container component pushing on every keystroke, a bulk import — skip it:

```ts
formRef.current?.setValue('lineItems', next, { shouldValidate: false })
```

`setValues` is a single logical update: it writes every key without validating, then revalidates **once**. Twenty keys means one schema pass, not twenty.

```ts
// One validation, not three
formRef.current?.setValues({
  firstName: 'Ada',
  lastName: 'Lovelace',
  role: 'admin',
})

// No validation at all
formRef.current?.setValues(draft, { shouldValidate: false })
```

Programmatic writes also participate in the [dependency graph](./dependencies) — a `setValue` on a field others depend on re-resolves them.

## Live Example

An external control panel linked to the form via `ref`:

```jsx live noInline
const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email(),
  role: z.enum(['viewer', 'editor', 'admin']),
})

const userForm = createForm(schema)

function App() {
  const formRef = React.useRef(null)
  const [info, setInfo] = React.useState('')

  const handleShowValues = () => {
    const values = formRef.current?.getValues()
    setInfo(JSON.stringify(values, null, 2))
  }

  const handleFill = () => {
    formRef.current?.reset({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      role: 'editor',
    })
    setInfo('Form filled with demo data')
  }

  const handleClear = () => {
    formRef.current?.reset()
    setInfo('Form cleared')
  }

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 520 }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type='button'
          onClick={handleFill}
          style={{
            padding: '6px 14px',
            background: '#4F46E5',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Fill Demo Data
        </button>
        <button
          type='button'
          onClick={handleShowValues}
          style={{
            padding: '6px 14px',
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Show Values
        </button>
        <button
          type='button'
          onClick={handleClear}
          style={{
            padding: '6px 14px',
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: 6,
            cursor: 'pointer',
            color: 'var(--ifm-color-danger)',
          }}
        >
          Clear
        </button>
      </div>
      <AutoForm
        ref={formRef}
        form={userForm}
        fields={{
          firstName: { label: 'First Name', span: 6 },
          lastName: { label: 'Last Name', span: 6 },
          email: { label: 'Email' },
          role: { label: 'Role' },
        }}
        onSubmit={(v) => setInfo(JSON.stringify(v, null, 2))}
      />
      {info && (
        <pre
          style={{
            marginTop: '1rem',
            background: 'var(--ifm-color-emphasis-200)',
            padding: '1rem',
            borderRadius: 6,
            fontSize: 12,
            overflow: 'visible',
            whiteSpace: 'pre-wrap',
          }}
        >
          {info}
        </pre>
      )}
    </div>
  )
}

render(<App />)
```
