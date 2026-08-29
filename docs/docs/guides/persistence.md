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
| `persistVersion`  | `0`              | Schema version stamped onto the draft. Bump it when the shape of the values changes                 |
| `persistMigrate`  | `undefined`      | Upgrade a draft saved at an older version. Return `undefined` to discard it                         |

## Versioning and migrations

Drafts are written inside a versioned envelope, so a draft saved before a schema change is **migrated rather than half-restored**.

```tsx
<AutoForm
  form={checkoutForm}
  persistKey='checkout-draft'
  persistVersion={2}
  persistMigrate={(persisted, fromVersion) => {
    if (fromVersion !== 1) return undefined // anything older: start fresh
    const old = persisted as { fullName?: string }
    const [firstName = '', lastName = ''] = (old.fullName ?? '').split(' ')
    return { firstName, lastName }
  }}
  onSubmit={save}
/>
```

- When the stored version matches `persistVersion`, the draft is restored as-is.
- When it differs and `persistMigrate` returns values, those are restored.
- When it differs and there is no `persistMigrate`, or the migration returns `undefined`, the draft is **discarded with a console warning** and the form starts from `defaultValues`.
- Corrupt or unreadable data is discarded the same way — never silently swallowed.
- Drafts written before versioning existed are read as version `0`.

## Custom storage adapter

The adapter may be **synchronous or asynchronous** — every method can return a promise, so IndexedDB and AsyncStorage adapters are first-class. While an async adapter is being read, the form reports `isLoading` and renders `layout.loadingFallback`, so nothing flashes the defaults before the draft arrives. Synchronous adapters never show the fallback.

```ts
// Namespace all keys under a user-specific prefix
const userStorage = (userId: string) => ({
  getItem: (key: string) => localStorage.getItem(`user:${userId}:${key}`),
  setItem: (key: string, value: string) => localStorage.setItem(`user:${userId}:${key}`, value),
  removeItem: (key: string) => localStorage.removeItem(`user:${userId}:${key}`),
})

<AutoForm persistStorage={userStorage(currentUser.id)} persistKey="invoice-draft" ... />
```

```ts
// Async adapter — IndexedDB via idb-keyval
const idbStorage = {
  getItem: (key: string) => idbGet<string>(key).then((v) => v ?? null),
  setItem: (key: string, value: string) => idbSet(key, value),
  removeItem: (key: string) => idbDel(key),
}
```

## Multi-step flows across routes

`persistKey` on `<AutoForm>` ties the draft's lifetime to that component. For a flow that spans routes, create the store once with [`useUniForm`](../api/use-uniform) and keep it mounted above the routes — the draft then lives as long as the **instance**, not as long as any one `<AutoForm>`:

```tsx
function CheckoutFlow() {
  const form = useUniForm(checkoutForm, {
    persistKey: 'checkout-draft',
    persistVersion: 2,
    persistMigrate,
    onSubmit: placeOrder,
  })

  return (
    <UniFormProvider form={form}>
      <Routes>
        <Route
          path='details'
          element={<AutoForm form={form} onSubmit={placeOrder} />}
        />
        <Route path='payment' element={<PaymentStep />} />
        <Route path='review' element={<ReviewStep onConfirm={form.submit} />} />
      </Routes>
    </UniFormProvider>
  )
}
```

## Reading and clearing the draft

Both are on the form methods (and therefore on the `ref` handle and `useUniForm().methods`):

```ts
form.methods.hasPersistedDraft() // was a draft restored on mount?
form.methods.clearPersistedData() // discard it (also done automatically on submit)
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
