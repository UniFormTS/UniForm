---
title: Build Your First Form
sidebar_position: 2
description: A step-by-step tutorial that takes you from a blank file to a working, validated, styled form.
---

# Build Your First Form

In this tutorial you will build a user registration form step by step. By the end you will have a fully working form with:

- Schema-driven field rendering
- Labels and placeholders embedded in the schema
- Zod validation with custom error messages
- A reactive field that shows only when relevant
- Your own input component replacing the default

**Prerequisites:** UniForm is [installed](./installation), and you have a React app running.

---

## Step 1 — Define the schema

Start with a Zod schema that describes your form's data. UniForm introspects this schema to decide which fields to render and how to validate them.

You can embed labels, placeholders, and descriptions directly on each field using `.meta()` — keeping all field presentation co-located with the field definition.

```ts
import { z } from 'zod/v4'

const registrationSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .meta({ label: 'Username', placeholder: 'e.g. jane_doe' }),
  email: z
    .string()
    .email('Enter a valid email address')
    .meta({ label: 'Email address' }),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .meta({ label: 'Password', description: 'Minimum 8 characters' }),
  role: z.enum(['user', 'moderator', 'admin']).meta({ label: 'Account type' }),
  agreeToTerms: z.boolean().meta({ label: 'I agree to the Terms of Service' }),
})
```

The schema is the single source of truth. UniForm derives field types, required/optional status, validation rules, labels, and placeholders from it — you do not need to repeat any of this in the component.

---

## Step 2 — Create a form object

Call `createForm` with the schema. This creates a `UniForm` instance that you will pass to `<AutoForm>`.

```ts
import { createForm } from '@uniform-ts/core'

const registrationForm = createForm(registrationSchema)
```

Define `registrationForm` at module scope — outside any React component. It is a stable, re-render-safe object.

---

## Step 3 — Render the form

Pass the form object to `<AutoForm>` along with an `onSubmit` handler. UniForm renders an input for each field and validates on submit.

```tsx
import { AutoForm } from '@uniform-ts/core'

function RegistrationPage() {
  return (
    <AutoForm
      form={registrationForm}
      defaultValues={{ role: 'user', agreeToTerms: false }}
      onSubmit={(values) => {
        // values is fully typed: { username, email, password, role, agreeToTerms }
        console.log(values)
      }}
    />
  )
}
```

The labels and placeholders you set in `.meta()` are picked up automatically. `defaultValues` pre-fills specific fields without touching the schema.

---

## Step 4 — Customise validation messages

Replace Zod's default English strings with copy that fits your product.

```tsx
<AutoForm
  form={registrationForm}
  defaultValues={{ role: 'user', agreeToTerms: false }}
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
  onSubmit={handleSubmit}
/>
```

The `messages` prop supports three levels: a global `required` fallback, a per-field string that replaces all errors on that field, and a per-field object that maps individual Zod error codes to strings. See [Validation & Error Messages](./guides/validation) for the full reference.

---

## Step 5 — Add a conditional field

Show an extra field only when the user selects a privileged role. Add the field to the schema with its label in `.meta()`, then call `setCondition` on the form object — once, at module scope.

```ts
const registrationSchema = z.object({
  // …existing fields…
  adminCode: z.string().optional().meta({
    label: 'Admin access code',
    description: 'Required for privileged roles',
  }),
})
```

```ts
registrationForm.setCondition(
  'adminCode',
  (values) => values.role === 'admin' || values.role === 'moderator',
)
```

When the user changes `role` to `admin` or `moderator`, `adminCode` appears. When they switch back to `user`, the field disappears and its value is removed from the submitted object.

---

## Step 6 — Replace the default input

UniForm's built-in inputs are intentionally minimal. Here is how to swap the `string` type for a styled component from your design system.

```tsx
import type { FieldProps } from '@uniform-ts/core'

function MyTextInput({
  value,
  onChange,
  onBlur,
  ref,
  placeholder,
  error,
  disabled,
}: FieldProps) {
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

The `placeholder` prop is passed through from the `.meta()` on the schema field — no extra wiring needed. Register the component under the `string` key to replace all text inputs in this form:

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
- Carries labels, placeholders, and descriptions in the schema via `.meta()`
- Shows custom error messages
- Conditionally reveals a field based on another field's value
- Uses a custom input component

### Next steps

- Read [Field Overrides](./guides/field-overrides) to learn about overriding `.meta()` values at the call site, and about column span, sections, and ordering
- Read [Layout & Styling](./guides/layout) to replace the form wrapper and submit button
- Read [How UniForm Works](./concepts) for a deeper explanation of the rendering pipeline
