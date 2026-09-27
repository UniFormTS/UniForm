---
title: '<Field>'
sidebar_position: 5
---

# `<Field>`

`<Field>` renders one field exactly as `<AutoForm>` would, anywhere **inside** the `<AutoForm>` tree: container components, layout slots, custom wrappers. It uses the same registry, resolved config, field wrapper and error.

```tsx
import { Field } from '@uniform-ts/core'
;<Field
  name='address.city'
  component={MyInput}
  label='Town'
  disabled
  className='wide'
/>
```

## Props (`FieldComponentProps`)

| Name        | Type                                 | Description                                                                  |
| ----------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| `name`      | `string`                             | **Required.** Dot-notated path of the field (see [Paths](#paths))            |
| `component` | `string \| React.ComponentType<any>` | Component override for this instance (registry key or component)             |
| `label`     | `string`                             | Label override for this instance                                             |
| `disabled`  | `boolean`                            | Disabled override for this instance                                          |
| `className` | `string`                             | **Appended** to `meta.className`: both apply, the meta value is not replaced |

## Paths

- **Absolute by default:** `'address.city'`, `'lines.0.qty'`.
- **Inside a [container component](../guides/custom-components#container-components)**, names are relative to the container's path: `'0.qty'` inside the `lines` container is `lines.0.qty`.

A field inside an array row gets the same row binding as the built-in array renderer:

- Row-scoped `setOnChange('lines.title', …)` handlers get the row index. `ctx.getValues()` returns that row, and `ctx.setFieldMeta('lines.qty', …)` is scoped to that row.
- Per-row dynamic meta for that row applies.

## Visibility

`<Field>` follows every `condition` / `setCondition` on the path, **including its ancestors'**. Each one is evaluated in the scope the auto-rendered form uses: the row for fields inside array rows, otherwise the whole form. While any condition is false, `<Field>` renders nothing and its value is unregistered, just like a conditional field in `<AutoForm>`.

`<Field>` **ignores `meta.hidden`**. `hidden` is how you take a field out of the auto layout so you can place it yourself with `<Field>`:

```tsx
function FormLayout({ children }: FormWrapperProps) {
  return (
    <div className='two-columns'>
      <aside>
        <Field name='notes' />
      </aside>
      <main>{children}</main>
    </div>
  )
}

;<AutoForm
  form={form}
  fields={{ notes: { hidden: true } }}
  layout={{ formWrapper: FormLayout }}
  onSubmit={save}
/>
```

:::warning
Rendering the same path twice (once with `<Field>` and once in the auto layout) is a user error. Hide the field from the auto layout with `fields={{ x: { hidden: true } }}`.
:::

## Behaviour notes

- **Unknown path:** logs a warning once and renders nothing.
- **Cost:** `<Field>` subscribes to form values only when the path has a condition, and then re-renders only when its visibility flips. It is memoized, so a container re-rendering does not re-render its `<Field>` cells, and it re-renders only when its own error changes.
- The required marker follows the schema (`field.required`).
- Must be rendered under `<AutoForm>`.

See also: [Custom Components guide](../guides/custom-components) and [TypeScript API](./types#fieldcomponentprops).
