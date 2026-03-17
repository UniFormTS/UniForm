---
title: Field Overrides
sidebar_position: 2
description: Customise labels, descriptions, ordering, column span, and more per-field without changing the schema.
---

# Field Overrides

The `fields` prop on `<AutoForm>` accepts a map of field paths to `FieldOverride` objects. This lets you customise presentation and behaviour of any field without touching the Zod schema.

## `FieldOverride` reference

| Property      | Type                      | Description                                         |
| ------------- | ------------------------- | --------------------------------------------------- |
| `label`       | `string`                  | Override auto-derived label                         |
| `description` | `string`                  | Help text shown below the field                     |
| `placeholder` | `string`                  | Placeholder for text inputs                         |
| `order`       | `number`                  | Render order (lower = first)                        |
| `span`        | `number`                  | Column span (1–12) in a 12-column grid              |
| `section`     | `string`                  | Group field into a named section                    |
| `hidden`      | `boolean`                 | Hard-hide (never renders, never validates)          |
| `disabled`    | `boolean`                 | Disable just this field                             |
| `component`   | `string`                  | Registry key override (`"textarea"`, `"rating"`, …) |
| `options`     | `Array<{ label, value }>` | Override select options for enum fields             |

## Nested fields

Use dot notation to override deeply nested fields:

```tsx
fields={{
  'address.street': { label: 'Street address', span: 12 },
  'address.city': { label: 'City', span: 7 },
  'address.zip': { label: 'ZIP code', span: 5 },
}}
```

## Custom `options`

For `z.enum` fields you can override the displayed labels without changing the schema:

```tsx
const schema = z.object({ plan: z.enum(['free', 'pro', 'enterprise']) })

fields={{
  plan: {
    options: [
      { value: 'free', label: 'Free — $0/mo' },
      { value: 'pro', label: 'Pro — $12/mo' },
      { value: 'enterprise', label: 'Enterprise — contact us' },
    ]
  }
}}
```

## Live Example

```jsx live noInline
const schema = z.object({
  title: z.string().min(1, 'Required'),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email(),
  bio: z.string().optional(),
  plan: z.enum(['free', 'pro', 'enterprise']),
  agreeToTerms: z.boolean(),
})

const signupForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 500 }}>
      <AutoForm
        form={signupForm}
        defaultValues={{ plan: 'free', agreeToTerms: false }}
        fields={{
          title: {
            label: 'Title',
            order: 1,
            span: 3,
            options: [
              { value: 'Mr', label: 'Mr' },
              { value: 'Ms', label: 'Ms' },
              { value: 'Dr', label: 'Dr' },
            ],
            component: 'enum',
          },
          firstName: { label: 'First name', order: 2, span: 5 },
          lastName: { label: 'Last name', order: 3, span: 4 },
          email: {
            label: 'Email address',
            order: 4,
            description: 'Used for login',
            span: 12,
          },
          plan: {
            order: 5,
            options: [
              { value: 'free', label: 'Free — $0/mo' },
              { value: 'pro', label: 'Pro — $12/mo' },
              { value: 'enterprise', label: 'Enterprise — contact us' },
            ],
          },
          bio: {
            label: 'Short bio',
            order: 6,
            description: 'Optional, shown on your profile',
          },
          agreeToTerms: { label: 'I agree to the Terms of Service', order: 7 },
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
