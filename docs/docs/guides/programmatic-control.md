---
title: Programmatic Control
sidebar_position: 9
description: Use the ref handle to imperatively control the form from outside its component tree.
---

# Programmatic Control

Attach a `ref` to `<AutoForm>` to get an `AutoFormHandle` — a superset of React Hook Form's `UseFormReturn` — that lets you read and set values, trigger validation, reset the form, and check submission state from anywhere in your component tree.

```tsx
import { useRef } from 'react'
import type { AutoFormHandle } from '@uniform/core'

const formRef = useRef<AutoFormHandle<typeof schema>>(null)

<AutoForm ref={formRef} ... />
```

## Available methods

All methods from React Hook Form's `UseFormReturn` are available, plus:

| Member         | Type                           | Description                                      |
| -------------- | ------------------------------ | ------------------------------------------------ |
| `isSubmitting` | `boolean`                      | `true` while the `onSubmit` handler is executing |
| `setValue`     | `(field, value) => void`       | Set a specific field value                       |
| `setValues`    | `(values: Partial<T>) => void` | Set multiple field values at once                |
| `getValues`    | `() => T`                      | Get all current values                           |
| `watch`        | `(field?) => T[field]`         | Subscribe to a field value (or all values)       |
| `reset`        | `(values?) => void`            | Reset the form, optionally to new default values |
| `resetField`   | `(field) => void`              | Reset a single field to its default value        |
| `setError`     | `(field, message) => void`     | Set a manual validation error                    |
| `setErrors`    | `(errors) => void`             | Set errors on multiple fields at once            |
| `clearErrors`  | `(fields?) => void`            | Clear one or all errors                          |
| `submit`       | `() => void`                   | Programmatically trigger form submission         |
| `focus`        | `(field) => void`              | Focus a specific field by name                   |

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
