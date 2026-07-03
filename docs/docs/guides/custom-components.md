---
title: Custom Components
sidebar_position: 1
description: Replace any built-in field component with your own design system components.
---

# Custom Components

UniForm ships with `defaultRegistry` — a minimal set of field components that render a `<input>`, `<select>`, and `<input type="checkbox">`. In production you will almost always replace these with your own design-system components.

## The component registry

The registry maps a **type key** to a React component. The built-in keys are `string`, `number`, `boolean`, `date`, `select` (for `z.enum()` / `z.nativeEnum()`, or a string field with `meta.options`), and `textarea` (opt-in). You can add your own keys (e.g. `"slider"`, `"rating"`) and reference them via `fields={{ myField: { component: 'rating' } }}`.

## Select from a string field

You can render a `z.string()` field as a select by setting `meta.component: 'select'` and providing `meta.options`. UniForm will treat the field as type `"select"` during introspection and pass the options to your select component:

```ts
const schema = z.object({
  role: z.string().meta({
    component: 'select',
    options: [
      { label: 'User', value: 'user' },
      { label: 'Admin', value: 'admin' },
      { label: 'Editor', value: 'editor' },
    ],
  }),
})
```

This is an alternative to `z.enum(['user', 'admin', 'editor'])` — useful when the option list is defined at runtime, or when you want a plain `string` in the output type rather than a union literal.

You can override any key without replacing the others — your registry is merged with `defaultRegistry`. For the full type definition and resolution order see [`ComponentRegistry`](/docs/api/types#componentregistry) in the API reference.

## Writing a custom component

Every field component receives [`FieldProps`](/docs/api/types#fieldprops):

```tsx
import type { FieldProps } from '@uniform-ts/core'

export function StarRating({ value, onChange, error }: FieldProps<number>) {
  return (
    <div>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type='button'
          key={star}
          onClick={() => onChange(star)}
          style={{
            color: (Number(value) || 0) >= star ? 'gold' : 'gray',
            fontSize: 24,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ★
        </button>
      ))}
      {error && <p style={{ color: 'red', fontSize: 12 }}>{error}</p>}
    </div>
  )
}
```

Then register it and point the field at it:

```ts
const myRegistry = { rating: StarRating }

<AutoForm components={myRegistry} fields={{ score: { component: 'rating' } }} ... />
```

To replace a built-in type for **all** fields of that type in a form, register it under the type key:

```ts
// Every z.string() field now uses MyTextInput
<AutoForm components={{ string: MyTextInput }} ... />
```

To replace it for a **single field** only, pass the component directly in `fields`:

```ts
fields={{ bio: { component: MyTextarea } }}
```

## Rendering an object or array as a single field

By default a `z.object({ ... })` renders as a nested fieldset and a `z.array(z.object({ ... }))` renders as repeating rows. To treat one of them as a **single field** whose value is the whole object (or array) — a user picker, a tag input, a map coordinate widget — point it at a component override. The override can be a **direct component or a string registry key**:

```tsx
type UserRef = { value: string; label: string }

function UserSelect({ value, onChange }: FieldProps) {
  const current = value as UserRef | undefined
  return (
    <select
      value={current?.value ?? ''}
      onChange={(e) => onChange(lookupUser(e.target.value))}
    >
      {/* … */}
    </select>
  )
}

const schema = z.object({
  assignee: z.object({ value: z.string(), label: z.string() }),
})

// String registry key…
<AutoForm
  form={createForm(schema)}
  components={{ userSelect: UserSelect }}
  fields={{ assignee: { component: 'userSelect' } }}
  ...
/>

// …or the component itself:
<AutoForm
  form={createForm(schema)}
  fields={{ assignee: { component: UserSelect } }}
  ...
/>
```

The component receives the **entire object (or array)** as `value` and must call `onChange` with a full object/array — validation still runs against the complete schema on submit. If a string key does not resolve in the merged registry, the field falls back to its default nested rendering.

## Live Example

```jsx live noInline
const StarRating = ({ value, onChange, error }) => (
  <div>
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        type='button'
        key={star}
        onClick={() => onChange(star)}
        style={{
          color:
            (Number(value) || 0) >= star
              ? 'gold'
              : 'var(--ifm-color-emphasis-400)',
          fontSize: 28,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 2px',
        }}
      >
        ★
      </button>
    ))}
    {error && (
      <p
        style={{
          color: 'var(--ifm-color-danger)',
          fontSize: 12,
          margin: '4px 0 0',
        }}
      >
        {error}
      </p>
    )}
  </div>
)

const schema = z.object({
  productName: z.string().min(1, 'Required'),
  rating: z.number().min(1, 'Please rate the product').max(5),
  review: z.string().optional(),
})

const reviewForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 420 }}>
      <AutoForm
        form={reviewForm}
        components={{ rating: StarRating }}
        fields={{
          productName: { label: 'Product' },
          rating: { label: 'Your rating', component: 'rating' },
          review: { label: 'Written review' },
        }}
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
