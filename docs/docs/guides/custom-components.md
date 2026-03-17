---
title: Custom Components
sidebar_position: 1
description: Replace any built-in field component with your own design system components.
---

# Custom Components

UniForm ships with `defaultRegistry` — a minimal set of field components that render a `<input>`, `<select>`, and `<input type="checkbox">`. In production you will almost always replace these with your own design-system components.

## The component registry

The registry maps a **type key** to a React component. The built-in keys are `string`, `number`, `boolean`, `date`, `select` (for `z.enum()` / `z.nativeEnum()`), and `textarea` (opt-in). You can add your own keys (e.g. `"slider"`, `"rating"`) and reference them via `fields={{ myField: { component: 'rating' } }}`.

You can override any key without replacing the others — your registry is merged with `defaultRegistry`. For the full type definition and resolution order see [`ComponentRegistry`](/docs/api/types#componentregistry) in the API reference.

## Writing a custom component

Every field component receives [`FieldProps`](/docs/api/types#fieldprops):

```tsx
import type { FieldProps } from '@uniform/core'

export function StarRating({ value, onChange, error }: FieldProps) {
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
          color: (Number(value) || 0) >= star ? 'gold' : '#ccc',
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
      <p style={{ color: 'red', fontSize: 12, margin: '4px 0 0' }}>{error}</p>
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
            background: '#f5f5f5',
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
