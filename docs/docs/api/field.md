---
title: '<Field>'
sidebar_position: 9
---

# `<Field>`

Renders one field at `name` exactly as `<AutoForm>` would — same registry, same resolved config, same wrapper, same error — but wherever you want it.

```tsx
import { Field, UniFormProvider, useUniForm } from '@uniform-ts/core'

function CheckoutPage() {
  const form = useUniForm(checkoutForm, { defaultValues, onSubmit: pay })

  return (
    <UniFormProvider form={form}>
      <div className='grid'>
        <Field name='email' />
        <Field name='address.city' label='Town' />
      </div>
    </UniFormProvider>
  )
}
```

## Props

| Prop        | Type                            | Description                                                                                                       |
| ----------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `name`      | `string`                        | Dot-notated path. Absolute by default; relative to the enclosing container inside a custom object/array component |
| `component` | `string \| React.ComponentType` | Override the component for this instance only                                                                     |
| `label`     | `string`                        | Override the resolved label                                                                                       |
| `disabled`  | `boolean`                       | Force this instance disabled                                                                                      |
| `className` | `string`                        | Merged onto the field's meta                                                                                      |

## Paths

Absolute paths address the form root, including array indexes:

```tsx
<Field name='address.city' />
<Field name='lines.0.sku' />
<Field name='groups.0.emails.1' />
```

Inside a component registered for an object or array field, paths are **relative to that field**:

```tsx
function LinesTable({ rows }: ArrayContainerProps) {
  return rows.map((row, i) => <Field key={String(row.id)} name={`${i}.sku`} />)
  //                                       resolves to lines.0.sku, lines.1.sku…
}
```

Use [`useFieldPath()`](./use-field#usefieldpath) to read the current base path explicitly.

## Behaviour

- Works for every field type — scalars, selects, booleans, nested objects and arrays.
- The leaf registers with react-hook-form, so validation and errors work normally.
- Rendering a field with `<Field>` **and** letting `<AutoForm>` render it too would register the same path twice; hide it from the auto-rendered form with `fields={{ notes: { hidden: true } }}` when you place it yourself.
- An unknown path logs a `console.warn` naming the path and renders nothing.

See also: [`useField()`](./use-field), [`<UniFormProvider>`](./uniform-provider), [Headless Mode guide](/docs/guides/headless).
