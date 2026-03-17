---
title: Validation & Error Messages
sidebar_position: 7
description: Customise and internationalise Zod validation error messages.
---

# Validation & Error Messages

UniForm runs Zod validation through `zodResolver` from `@hookform/resolvers`. By default, Zod's own error messages are displayed. The `messages` prop lets you override them globally or per-type.

## The `messages` prop

```tsx
<AutoForm
  messages={{
    required: 'This field is required',
    minLength: (min) => `Must be at least ${min} characters`,
    maxLength: (max) => `Must be no more than ${max} characters`,
    min: (min) => `Must be at least ${min}`,
    max: (max) => `Must be at most ${max}`,
    email: 'Please enter a valid email address',
    url: 'Please enter a valid URL',
    custom: (msg) => msg,
  }}
  ...
/>
```

All properties are optional — only provide the ones you want to override.

## Resolution order

For each field error, UniForm resolves the message in this order:

1. The `messages` override for the matching Zod issue code
2. The message from the Zod schema itself (e.g. `z.string().min(3, 'Too short!')`)
3. Zod's default English message

## Using with `createAutoForm`

Bake messages into a factory so all forms in your app share the same wording:

```ts
export const MyForm = createAutoForm({
  messages: {
    required: 'Required',
    email: 'Invalid email',
    minLength: (n) => `${n}+ characters required`,
  },
})
```

## Live Example

```jsx live noInline
const schema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  website: z.string().url().optional().or(z.literal('')),
  age: z.number().min(13).max(120),
})

const registrationForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 420 }}>
      <p
        style={{
          fontSize: 13,
          color: 'var(--ifm-color-emphasis-600)',
          marginBottom: '1rem',
        }}
      >
        Try submitting with invalid values to see custom messages.
      </p>
      <AutoForm
        form={registrationForm}
        messages={{
          required: 'This field cannot be empty',
          username: {
            too_small: 'Username needs at least 3 characters',
            too_big: 'Username cannot exceed 20 characters',
          },
          email: "That doesn't look like a valid email",
          website: 'Please enter a full URL (https://…)',
          age: {
            too_small: 'You must be at least 13 years old',
            too_big: 'Age cannot exceed 120',
            invalid_type: 'Please enter a valid age',
          },
        }}
        fields={{
          username: { label: 'Username', description: '3–20 characters' },
          email: { label: 'Email address' },
          website: { label: 'Personal website (optional)' },
          age: { label: 'Age' },
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
