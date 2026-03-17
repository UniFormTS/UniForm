---
title: Validation & Error Messages
sidebar_position: 7
description: Customise and internationalise Zod validation error messages.
---

# Validation & Error Messages

UniForm runs Zod validation through `zodResolver` from `@hookform/resolvers`. By default, Zod's own error messages are displayed. The `messages` prop lets you override them globally or per-field.

## The `messages` prop

`ValidationMessages` supports three levels of override:

```ts
type ValidationMessages = {
  /** Global override for any required-field error */
  required?: string
  /** Per-field overrides — string replaces all errors on that field,
   *  or an object maps Zod error codes to specific strings */
  [fieldName: string]: string | Record<string, string> | undefined
}
```

### Global required message

Override the message shown for any missing required value:

```tsx
<AutoForm
  messages={{ required: 'This field is required' }}
  ...
/>
```

This replaces errors for Zod's `too_small` (empty string, zero) and `invalid_type` (undefined on required field) codes.

### Per-field string override

Replace **all** error messages for a specific field with a single string:

```tsx
<AutoForm
  messages={{
    email: 'Please enter a valid email address',
    username: 'Username is invalid',
  }}
  ...
/>
```

### Per-field per-code override

Map Zod error codes to specific messages for fine-grained control:

```tsx
<AutoForm
  messages={{
    username: {
      too_small: 'Username must be at least 3 characters',
      too_big: 'Username cannot exceed 20 characters',
    },
    age: {
      too_small: 'You must be at least 13 years old',
      invalid_type: 'Age must be a number',
    },
  }}
  ...
/>
```

Common Zod error codes: `too_small`, `too_big`, `invalid_type`, `invalid_string`, `invalid_enum_value`.

## Resolution order

`messages[fieldName]` accepts **either** a `string` (replaces all errors on that field) **or** an object (maps individual Zod error codes to strings). These are two alternative shapes — you choose one per field.

For each field error, UniForm resolves the message in this priority:

1. **Per-field string** — if `messages[fieldName]` is a `string`, it replaces every error on that field regardless of error code
2. **Per-field per-code** — if `messages[fieldName]` is an object, the matching `messages[fieldName][error.code]` string is used
3. **Global `messages.required`** — when the error is a required-field error (`too_small` or `invalid_type`) and no per-field override matched
4. **Schema message** — the message passed directly in the schema (e.g. `z.string().min(3, 'Too short!')`)
5. **Zod's default English message**

## Using with `createAutoForm`

Bake messages into a factory so all forms in your app share the same wording:

```ts
export const MyForm = createAutoForm({
  messages: {
    required: 'Required',
    email: 'Invalid email address',
  },
})
```

## Live Example

```jsx live noInline
const schema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  age: z.number().min(13).max(120),
})

const registrationForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 420 }}>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: '1rem' }}>
        Try submitting with invalid values to see custom messages.
      </p>
      <AutoForm
        form={registrationForm}
        messages={{
          required: 'This field cannot be empty',
          email: "That doesn't look like a valid email",
          username: {
            too_small: 'Username needs at least 3 characters',
            too_big: 'Username cannot exceed 20 characters',
          },
          age: {
            too_small: 'Must be 13 or older',
            too_big: 'Must be 120 or younger',
          },
        }}
        fields={{
          username: { label: 'Username', description: '3–20 characters' },
          email: { label: 'Email address' },
          age: { label: 'Age' },
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
