---
title: Async Patterns
sidebar_position: 11
description: Async onSubmit, async setOnChange handlers, and async default values with loading fallback.
---

# Async Patterns

UniForm has first-class support for async workflows at every layer — submitting, reacting to field changes, and loading initial values.

---

## Async `onSubmit`

`onSubmit` may return a `Promise`. UniForm tracks its resolution via `formState.isSubmitting` (and the `isSubmitting` member on the `AutoFormHandle` ref), which you can use to disable the UI or show a spinner.

```tsx
<AutoForm
  form={myForm}
  onSubmit={async (values) => {
    await api.save(values)
    router.push('/success')
  }}
/>
```

While the returned promise is pending, the submit button receives `isSubmitting={true}` as a prop.

```jsx live noInline
const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email(),
})

const contactForm = createForm(schema)

const SpinnerButton = ({ isSubmitting, label, disabled }) => (
  <button
    type='submit'
    disabled={disabled || isSubmitting}
    style={{
      padding: '8px 20px',
      background: '#4F46E5',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      cursor: isSubmitting ? 'wait' : 'pointer',
      opacity: isSubmitting ? 0.7 : 1,
    }}
  >
    {isSubmitting ? '⏳ Saving…' : label}
  </button>
)

function App() {
  const [saved, setSaved] = React.useState(false)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 380 }}>
      {saved ? (
        <p style={{ color: 'var(--ifm-color-success)' }}>
          ✅ Saved successfully!
        </p>
      ) : (
        <AutoForm
          form={contactForm}
          layout={{ submitButton: SpinnerButton }}
          labels={{ submit: 'Save Contact' }}
          onSubmit={async (values) => {
            await new Promise((r) => setTimeout(r, 2000))
            setSaved(true)
          }}
        />
      )}
    </div>
  )
}

render(<App />)
```

---

## Async `setOnChange`

Handlers registered via `form.setOnChange()` can be async. A common use-case is loading dependent values from an API when a parent field changes.

```ts
orderForm.setOnChange('sku', async (sku, ctx) => {
  const product = await api.lookupSKU(sku)
  ctx.setValue('productName', product.name)
  ctx.setValue('unitPrice', product.price)
})
```

```jsx live noInline
const catalog = {
  'E-001': { name: 'Ergonomic Chair', price: 349 },
  'E-002': { name: 'Standing Desk', price: 599 },
  'B-001': { name: 'Laptop Stand', price: 79 },
}

const schema = z.object({
  sku: z.enum(['E-001', 'E-002', 'B-001']),
  productName: z.string(),
  unitPrice: z.number(),
  quantity: z.number().min(1),
})

const orderForm = createForm(schema)

orderForm.setOnChange('sku', async (sku, ctx) => {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 500))
  const product = catalog[sku]
  if (product) {
    ctx.setValue('productName', product.name)
    ctx.setValue('unitPrice', product.price)
  }
})

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 420 }}>
      <p
        style={{
          fontSize: 13,
          color: 'var(--ifm-color-emphasis-600)',
          marginBottom: '0.75rem',
        }}
      >
        Change the SKU — product name and price update automatically after a 500
        ms simulated fetch.
      </p>
      <AutoForm
        form={orderForm}
        defaultValues={{
          sku: 'E-001',
          productName: 'Ergonomic Chair',
          unitPrice: 349,
          quantity: 1,
        }}
        fields={{
          sku: { label: 'Product SKU' },
          productName: { label: 'Product Name', disabled: true },
          unitPrice: { label: 'Unit Price ($)', disabled: true },
          quantity: { label: 'Quantity' },
        }}
        labels={{ submit: 'Place Order' }}
        onSubmit={(v) => setResult(v)}
      />
      {result && (
        <pre
          style={{
            marginTop: '1rem',
            background: 'var(--ifm-color-emphasis-200)',
            padding: '1rem',
            borderRadius: 6,
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}

render(<App />)
```

---

## Async `defaultValues`

Pass a function that returns a `Promise` to `defaultValues` to load initial values from an API. While the promise is pending, the `layout.loadingFallback` is displayed.

```tsx
<AutoForm
  form={myForm}
  defaultValues={() => api.getUserProfile()}
  layout={{
    loadingFallback: <ProfileSkeleton />,
  }}
  onSubmit={handleSubmit}
/>
```

```jsx live noInline
const fetchProfile = () =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          displayName: 'Jane Doe',
          email: 'jane@example.com',
          timezone: 'UTC',
          bio: 'Product designer & coffee lover ☕',
        }),
      1500,
    ),
  )

const Skeleton = () => (
  <div style={{ padding: '1rem' }}>
    {[140, 200, 160, 100].map((w, i) => (
      <div
        key={i}
        style={{
          height: 36,
          background:
            'linear-gradient(90deg, var(--ifm-color-emphasis-200) 25%, var(--ifm-color-emphasis-100) 50%, var(--ifm-color-emphasis-200) 75%)',
          backgroundSize: '200% 100%',
          borderRadius: 6,
          marginBottom: 12,
          width: w,
          animation: 'shimmer 1.4s infinite',
        }}
      />
    ))}
    <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
  </div>
)

const schema = z.object({
  displayName: z.string().min(1, 'Required'),
  email: z.string().email(),
  timezone: z.string(),
  bio: z.string().optional(),
})

const profileForm = createForm(schema)

function App() {
  const [key, setKey] = React.useState(0)
  const [saved, setSaved] = React.useState(false)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 440 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        <button
          type='button'
          onClick={() => {
            setKey((k) => k + 1)
            setSaved(false)
          }}
          style={{
            padding: '6px 14px',
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          ↺ Reload (re-fetch)
        </button>
      </div>
      {saved && (
        <p style={{ color: 'var(--ifm-color-success)' }}>Profile saved!</p>
      )}
      <AutoForm
        key={key}
        form={profileForm}
        defaultValues={fetchProfile}
        layout={{ loadingFallback: <Skeleton /> }}
        labels={{ submit: 'Save Profile' }}
        onSubmit={() => setSaved(true)}
      />
    </div>
  )
}

render(<App />)
```
