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

## Cross-field and array-index errors

Cross-field rules belong in `superRefine`, and their issues are often anchored somewhere no leaf field can render them — an array element, a whole container, or the form as a whole.

You do **not** need to validate twice. Read the issue where it was anchored:

```tsx
const orderSchema = z
  .object({ customer: z.string(), lines: z.array(lineSchema) })
  .superRefine((value, ctx) => {
    value.lines.forEach((line, index) => {
      if (isDuplicate(value.lines, index)) {
        ctx.addIssue({
          code: 'custom',
          path: ['lines', index], // an array element — no leaf owns it
          message: 'Duplicate SKU in this order',
        })
      }
    })
    if (overCreditLimit(value)) {
      ctx.addIssue({
        code: 'custom',
        path: [], // the form as a whole
        message: 'Order exceeds the customer credit limit',
      })
    }
  })
```

```tsx
import { useFieldError } from '@uniform-ts/core'

// Render the row-level issue from the array row layout:
function RowLayout({ children, index }: ArrayRowLayoutProps) {
  const error = useFieldError(`lines.${index}`)
  return (
    <div>
      {error && <p role='alert'>{error}</p>}
      {children}
    </div>
  )
}

// Render the form-level issue anywhere:
const rootError = useFieldError('')
```

| Hook                                             | Returns                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [`useFieldError(path)`](../api/use-field-error)  | The message at any path — leaf, container, array element, or `''` for the form root |
| [`useFieldErrors(path)`](../api/use-field-error) | Every issue at or beneath `path`, as `{ path, message, code }[]`                    |
| [`useFormErrors()`](../api/use-field-error)      | The whole typed error tree                                                          |

All three are reactive, and none require the path to be a rendered field.

### Issues with nowhere to sit

`<FormErrorSummary>` lists exactly the issues that no field renders — the form root and container/array-element paths — so nothing is silently swallowed:

```tsx
<FormErrorSummary title='Please fix the following' />
```

Pass `unanchoredOnly={false}` to list every issue in the subtree, `path` to scope it, or a render function for custom markup.

### Backend validation responses

`setIssues` pushes an arbitrary list of issues into the same tree, including paths that are not fields:

```ts
const { issues } = await api.validate(values)
formMethods.setIssues(issues)
// [{ path: 'lines.0', message: '…' }, { path: '', message: '…' }]
```

`setError` / `setErrors` continue to work for the flat, field-keyed case.

## Requiredness decided at runtime

When whether a field is required depends on the current values, do **not** encode the rule twice. Mark the field `.optional()` in the schema and use `setRequired`, which drives the asterisk, `aria-required` **and** submit validation from one predicate. See the [Dynamic Requiredness guide](./dynamic-requiredness).

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
