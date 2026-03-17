---
title: Form Persistence
sidebar_position: 8
description: Auto-save form values to sessionStorage or localStorage and restore them on remount.
---

# Form Persistence

Add `persistKey` to auto-save the form values to storage whenever they change. On remount, the form re-hydrates from the stored values.

```tsx
<AutoForm persistKey="my-form-draft" ... />
```

## How it works

1. On mount, UniForm looks for a value in storage under `persistKey`.
2. If found, those values are merged over `defaultValues` and passed to `reset()`.
3. On every field change (debounced by `persistDebounce` ms), the current values are written back.
4. After a successful submit, the stored value is **removed** automatically.

## Options

| Prop              | Default          | Description                                                                                         |
| ----------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `persistKey`      | `undefined`      | Storage key. Persistence is disabled unless this is set                                             |
| `persistDebounce` | `300`            | Debounce in ms. 0 = write on every change                                                           |
| `persistStorage`  | `sessionStorage` | Any object implementing `getItem / setItem / removeItem`. Pass `localStorage` to survive tab closes |

## Custom storage adapter

The adapter must be **synchronous** — `getItem` must return `string | null`, not a `Promise`. This is compatible with the browser's built-in `localStorage` and `sessionStorage`.

A common use case is namespacing keys or using an in-memory store during testing:

```ts
// Namespace all keys under a user-specific prefix
const userStorage = (userId: string) => ({
  getItem: (key: string) => localStorage.getItem(`user:${userId}:${key}`),
  setItem: (key: string, value: string) => localStorage.setItem(`user:${userId}:${key}`, value),
  removeItem: (key: string) => localStorage.removeItem(`user:${userId}:${key}`),
})

<AutoForm persistStorage={userStorage(currentUser.id)} persistKey="invoice-draft" ... />
```

## Live Example

Fill in the form, then **reload the page** — the values are restored from `sessionStorage`.

```jsx live noInline
const schema = z.object({
  subject: z.string().min(1, 'Required'),
  to: z.string().email('Invalid email'),
  body: z.string().min(10, 'Too short'),
  priority: z.enum(['low', 'normal', 'high']),
})

const draftForm = createForm(schema)

function App() {
  const [sent, setSent] = React.useState(false)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 460 }}>
      <p
        style={{
          fontSize: 13,
          color: 'var(--ifm-color-emphasis-600)',
          marginBottom: '1rem',
        }}
      >
        Values are auto-saved to <code>sessionStorage</code>. Unmount and
        remount the component to see persistence in action.
      </p>
      {sent ? (
        <p style={{ color: 'var(--ifm-color-success)', fontWeight: 600 }}>
          Message sent! Draft cleared.
        </p>
      ) : (
        <AutoForm
          form={draftForm}
          persistKey='compose-draft'
          persistDebounce={200}
          defaultValues={{ priority: 'normal' }}
          fields={{
            subject: { label: 'Subject' },
            to: { label: 'To' },
            body: { label: 'Message body' },
            priority: { label: 'Priority' },
          }}
          labels={{ submit: 'Send Message' }}
          onSubmit={() => setSent(true)}
        />
      )}
    </div>
  )
}

render(<App />)
```
