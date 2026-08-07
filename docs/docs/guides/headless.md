---
title: Headless Mode
sidebar_position: 14
description: Own the page layout while UniForm owns the store, registration, validation and errors.
---

# Headless Mode

`<AutoForm>` renders everything. That is the right default, and for most forms it is all you need.

But sometimes the application owns the page: a header that shows live form state, a sticky footer with the save button, a dialog, a bespoke table for one array field. Headless mode is the supported middle ground — **UniForm keeps the state container, registration, the resolver and the component registry; you render whatever you like.**

:::tip No more `formWrapper` smuggling
You do **not** need to host application chrome inside `layout.formWrapper` to reach the form. `layout.formWrapper` is a styling slot. Use `useUniForm` + `<UniFormProvider>` instead.
:::

## The three pieces

| API                                                                           | What it gives you                                                                                  |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`useUniForm(form, options)`](../api/use-uniform)                             | The form store, resolver, field configs, registry and persistence — created **above** `<AutoForm>` |
| [`<UniFormProvider form={...}>`](../api/uniform-provider)                     | Publishes that instance so every UniForm hook resolves in the subtree                              |
| [`<Field name="..." />`](../api/field) / [`useField(path)`](../api/use-field) | Render one field anywhere, exactly as `<AutoForm>` would                                           |

## Creating the store yourself

```tsx
import {
  AutoForm,
  createForm,
  useUniForm,
  UniFormProvider,
} from '@uniform-ts/core'

const ticketForm = createForm(ticketSchema)

function TicketPage() {
  const form = useUniForm(ticketForm, {
    defaultValues,
    onSubmit: (values) => save(values),
  })

  return (
    <UniFormProvider form={form}>
      <PageHeader onSave={form.submit} busy={form.isSubmitting} />
      <AutoForm form={form} onSubmit={save} />
      <StickyFooter />
    </UniFormProvider>
  )
}
```

`<AutoForm form={instance}>` **does not create a second store** — it renders into the one you already made. Values written from the header are visible in the form and vice versa.

`useUniForm` accepts the state-level `<AutoForm>` props: `defaultValues`, `onSubmit`, `components`, `fields`, `fieldWrapper`, `layout`, `classNames`, `disabled`, `coercions`, `messages`, `labels`, `persistKey`, `persistDebounce`, `persistStorage` and `onValuesChange`.

### No `<AutoForm>` at all

`<UniFormProvider>` works on its own. Render only the fields you want, where you want them:

```tsx
function CheckoutPage() {
  const form = useUniForm(checkoutForm, { defaultValues, onSubmit: pay })

  return (
    <UniFormProvider form={form}>
      <h1>Checkout</h1>
      <div className='grid'>
        <Field name='email' />
        <Field name='address.city' />
        <Field name='address.postcode' />
      </div>
      <button type='button' onClick={form.submit}>
        Pay
      </button>
    </UniFormProvider>
  )
}
```

Validation, coercion, the component registry and error rendering behave exactly as they do inside `<AutoForm>`.

## Reading form state

`useFormValue` and `useFormValues` are typed, reactive reads. Pass the form as the first argument and the value type is inferred from the schema — **no casts, and no need to import anything from `react-hook-form`**.

```tsx
import { useFormValue, useFormValues } from '@uniform-ts/core'

function PageHeader() {
  const title = useFormValue(ticketForm, 'title') // string
  const priority = useFormValue(ticketForm, 'priority') // 'low' | 'normal' | 'urgent'
  const firstLine = useFormValue(ticketForm, 'lines.0') // index paths work

  return (
    <h1>
      {title || 'Untitled'} — {priority}
    </h1>
  )
}
```

`useFormValue` re-renders only when the watched path changes. `useFormValues(form)` reads the whole object and therefore re-renders on every change — prefer the single-path hook.

Both hooks also accept the **live instance** as the first argument, which lets them work in the component that called `useUniForm`, above the provider:

```tsx
function TicketPage() {
  const form = useUniForm(ticketForm, { defaultValues })
  const title = useFormValue(form, 'title') // works here too
  ...
}
```

For imperative reads and writes use `form.methods` (or [`useAutoFormContext(form)`](../api/use-auto-form-context) deeper in the tree), which is the same typed `FormMethods` object the `ref` handle exposes.

## Own the layout, keep the plumbing

When one field needs bespoke UI, you do not have to take everything below it out of the library.

Register a component for the field as usual. For an **object** or **array** field it receives the container props superset — the path, the row operations, and a `setPath` writer — and any `<Field>` rendered inside it resolves **relative to that field's path**.

```tsx
import { Field, type ArrayContainerProps } from '@uniform-ts/core'

function LinesTable({ rows, canAdd, append, remove }: ArrayContainerProps) {
  return (
    <table>
      <tbody>
        {rows.map((row, index) => (
          <tr key={String(row.id)}>
            {/* relative to `lines` → registers at lines.0.sku */}
            <td>
              <Field name={`${index}.sku`} />
            </td>
            <td>
              <Field name={`${index}.qty`} />
            </td>
            <td>
              <button type='button' onClick={() => remove(index)}>
                ✕
              </button>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>
            <button
              type='button'
              disabled={!canAdd}
              onClick={() => append({ sku: '', qty: 1 })}
            >
              Add line
            </button>
          </td>
        </tr>
      </tfoot>
    </table>
  )
}

;<AutoForm
  form={orderForm}
  components={{ linesTable: LinesTable }}
  fields={{ lines: { component: 'linesTable' } }}
  onSubmit={save}
/>
```

Each cell is still a real UniForm field: it registers with the store, uses the registered component for its type, honours item-level schema constraints, and shows its own validation error. Typing in a cell writes **only that path** — the container's `onChange` is never called, so a keystroke does not rebuild the whole array.

Use `setPath(subPath, value, options)` for a targeted write from the container:

```tsx
setPath('0.qty', 3) // writes lines.0.qty
setPath('0.qty', 3, { shouldValidate: false }) // …without re-running the schema
```

### Container props

`ArrayContainerProps` extends `FieldProps` with `path`, `setPath`, `itemConfig`, `rows`, `rowCount`, `canAdd`, `atMin` and the row operations (`append`, `prepend`, `insert`, `remove`, `move`, `swap`, `update`, `replace`).

`ObjectContainerProps` extends `FieldProps` with `path`, `setPath` and `fields` (the child configs).

:::note Build fields with `<Field>`, not `FieldConfig`
`FieldConfig` is an introspection detail, not the extension point. To render something UniForm knows about, use `<Field>` or `useField`.
:::

## Wiring your own input

`useField(path)` returns the fully resolved field props — value, handlers, ref, label, error, required, options, meta and schema — so you can render any input you like while UniForm keeps registration and validation.

```tsx
import { useField } from '@uniform-ts/core'

function CityInput() {
  const { value, onChange, onBlur, ref, label, error, required } =
    useField<string>('address.city')

  return (
    <label>
      {label}
      {required && ' *'}
      <input
        ref={ref}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required}
        aria-invalid={Boolean(error)}
      />
      {error && <span role='alert'>{error}</span>}
    </label>
  )
}
```

Paths are absolute by default and relative inside a container component. `useFieldPath()` returns the current base path when you need it explicitly.

## Array controls from anywhere

[`useArrayField(path)`](../api/use-array-field) works under `<UniFormProvider>` too, and drives the rendered rows — see the [Arrays guide](./arrays#external-controls-with-usearrayfield).

## Dev-mode diagnostics

`<Field>`, `useField` and `useArrayField` all warn in the console when the path does not exist in the schema, instead of silently rendering nothing.
