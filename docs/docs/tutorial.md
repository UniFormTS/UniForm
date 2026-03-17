---
title: Build Your First Form
sidebar_position: 2
description: A step-by-step tutorial that takes you from a blank file to a working, validated, styled form.
---

# Build Your First Form

In this tutorial you will build a user registration form step by step. By the end you will have a fully working form with:

- Schema-driven field rendering
- Zod validation with custom error messages
- A reactive field that shows only when relevant
- Your own input component replacing the default

**Prerequisites:** UniForm is [installed](./installation), and you have a React app running.

---

## Step 1 — Define the schema

Start with a Zod schema that describes your form's data. UniForm introspects this schema to decide which fields to render and how to validate them.

```ts
import { z } from 'zod/v4'

const registrationSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['user', 'moderator', 'admin']),
  agreeToTerms: z.boolean(),
})
```

The schema is the single source of truth. UniForm derives field types, required/optional status, and validation rules from it — you do not need to repeat any of this in the component.

---

## Step 2 — Create a form object

Call `createForm` with the schema. This creates a `UniForm` instance that you will pass to `<AutoForm>`.

```ts
import { createForm } from '@uniform/core'

const registrationForm = createForm(registrationSchema)
```

Define `registrationForm` at module scope — outside any React component. It is a stable, re-render-safe object.

---

## Step 3 — Render the form

Pass the form object to `<AutoForm>` along with an `onSubmit` handler. UniForm renders an input for each field and validates on submit.

```tsx
import { AutoForm } from '@uniform/core'

function RegistrationPage() {
  return (
    <AutoForm
      form={registrationForm}
      onSubmit={(values) => {
        // values is fully typed: { username, email, password, role, agreeToTerms }
        console.log(values)
      }}
    />
  )
}
```

At this point the form renders five fields — a text input for `username`, `email`, and `password`; a select for `role`; and a checkbox for `agreeToTerms`. Submitting with invalid data shows Zod's default error messages.

---

## Step 4 — Add labels and default values

The `fields` prop lets you customise how each field is presented without touching the schema.

```tsx
<AutoForm
  form={registrationForm}
  defaultValues={{ role: 'user', agreeToTerms: false }}
  fields={{
    username: { label: 'Username', placeholder: 'e.g. jane_doe' },
    email: { label: 'Email address' },
    password: { label: 'Password', description: 'Minimum 8 characters' },
    role: { label: 'Account type' },
    agreeToTerms: { label: 'I agree to the Terms of Service' },
  }}
  onSubmit={handleSubmit}
/>
```

`defaultValues` pre-fills the form. The `description` on `password` appears as help text below the input.

---

## Step 5 — Customise validation messages

Replace Zod's default English strings with copy that fits your product.

```tsx
<AutoForm
  form={registrationForm}
  messages={{
    required: 'This field is required',
    username: {
      too_small: 'Username must be at least 3 characters',
    },
    email: 'Enter a valid email address',
    password: {
      too_small: 'Password must be at least 8 characters',
    },
  }}
  ...
/>
```

The `messages` prop supports three levels: a global `required` fallback, a per-field string that replaces all errors on that field, and a per-field object that maps individual Zod error codes to strings. See [Validation & Error Messages](./guides/validation) for the full reference.

---

## Step 6 — Add a conditional field

Show an extra field only when the user selects a privileged role. Call `setCondition` on the form object — once, at module scope.

```ts
registrationForm.setCondition(
  'adminCode',
  (values) => values.role === 'admin' || values.role === 'moderator',
)
```

Then add the field to the schema and to `fields`:

```ts
const registrationSchema = z.object({
  // …existing fields…
  adminCode: z.string().optional(),
})
```

```tsx
fields={{
  // …existing fields…
  adminCode: { label: 'Admin access code', description: 'Required for privileged roles' },
}}
```

When the user changes `role` to `admin` or `moderator`, `adminCode` appears. When they switch back to `user`, the field disappears and its value is removed from the submitted object.

---

## Step 7 — Replace the default input

UniForm's built-in inputs are intentionally minimal. Here is how to swap the `string` type for a styled component from your design system.

```tsx
import type { FieldProps } from '@uniform/core'

function MyTextInput({ value, onChange, onBlur, ref, placeholder, error, disabled }: FieldProps) {
  return (
    <input
      ref={ref}
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={error ? 'input input-error' : 'input'}
    />
  )
}
```

Register it under the `string` key to replace all text inputs in this form:

```tsx
<AutoForm
  components={{ string: MyTextInput }}
  ...
/>
```

Or register it in a `createAutoForm` factory to apply it across every form in your application. See [Custom Components](./guides/custom-components) and [`createAutoForm()`](./api/create-auto-form).

---

## What you built

You now have a form that:

- Derives fields, types, and validation from a Zod schema
- Renders with your own labels, descriptions, and default values
- Shows custom error messages
- Conditionally reveals a field based on another field's value
- Uses a custom input component

### Next steps

- Read [Field Overrides](./guides/field-overrides) to learn about column span, sections, ordering, and more
- Read [Layout & Styling](./guides/layout) to replace the form wrapper and submit button
- Read [How UniForm Works](./concepts) for a deeper explanation of the rendering pipeline
