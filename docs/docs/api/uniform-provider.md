---
title: '<UniFormProvider>'
sidebar_position: 7
---

# `<UniFormProvider>`

Publishes a [`useUniForm()`](./use-uniform) instance to the tree, so every UniForm hook resolves in the subtree — with no `<AutoForm>` rendered anywhere.

```tsx
import { UniFormProvider, useUniForm, Field } from '@uniform-ts/core'

function CheckoutPage() {
  const form = useUniForm(checkoutForm, { defaultValues, onSubmit: pay })

  return (
    <UniFormProvider form={form}>
      <h1>Checkout</h1>
      <Field name='email' />
      <Field name='address.city' />
      <button type='button' onClick={form.submit}>
        Pay
      </button>
    </UniFormProvider>
  )
}
```

## Props

| Prop       | Type              | Description                          |
| ---------- | ----------------- | ------------------------------------ |
| `form`     | `UniFormInstance` | The `useUniForm()` result            |
| `children` | `React.ReactNode` | The subtree that should see the form |

## What it enables

Every hook works under the provider: `useAutoFormContext`, `useFormValue`, `useFormValues`, `useField`, `useFieldPath` and `useArrayField`, plus the `<Field>` component.

`<AutoForm>` renders this provider internally. Nesting an `<AutoForm>` that was given the **same instance** re-provides the same store rather than creating a second one:

```tsx
<UniFormProvider form={form}>
  <PageHeader />
  <AutoForm form={form} onSubmit={save} /> {/* same store */}
</UniFormProvider>
```

See also: [`useUniForm()`](./use-uniform), [Headless Mode guide](/docs/guides/headless).
