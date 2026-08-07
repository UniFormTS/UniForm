# Headless mode — deep detail

Read this when the application owns the page layout, when one field needs bespoke UI, or when you are tempted to import `useWatch` / `Control` / `useFieldArray` from `react-hook-form`.

## Table of contents

- [When to go headless](#when-to-go-headless)
- [`useUniForm` and `<UniFormProvider>`](#useuniform-and-uniformprovider)
- [Reading state: `useFormValue` / `useFormValues`](#reading-state-useformvalue--useformvalues)
- [Rendering one field: `<Field>` and `useField`](#rendering-one-field-field-and-usefield)
- [Container components and relative paths](#container-components-and-relative-paths)
- [Anti-patterns](#anti-patterns)

## When to go headless

Stay with plain `<AutoForm>` when the form is the page. Go headless when **any** of these is true:

- Page chrome (header, sidebar, sticky footer, dialog actions) needs to read or write form state.
- The submit button lives outside the `<form>` element.
- One array or object field needs a bespoke layout, but its leaves should stay UniForm fields.
- The form spans components that cannot all live inside `<AutoForm>`.

Headless mode is **additive**: nothing about `<AutoForm>`'s default behaviour changes.

## `useUniForm` and `<UniFormProvider>`

```tsx
const form = useUniForm(ticketForm, {
  defaultValues,
  onSubmit: (values) => save(values),
  persistKey: 'ticket-draft',
})
```

Returns `{ schema, control, methods, submit, isSubmitting, isLoading, clearPersistedData }`.

Options mirror the state-level `<AutoForm>` props: `defaultValues`, `onSubmit`, `components`, `fields`, `fieldWrapper`, `layout`, `classNames`, `disabled`, `coercions`, `messages`, `labels`, `persistKey`, `persistDebounce`, `persistStorage`, `onValuesChange`.

```tsx
<UniFormProvider form={form}>
  <PageHeader onSave={form.submit} busy={form.isSubmitting} />
  <AutoForm form={form} onSubmit={save} />
</UniFormProvider>
```

- `<AutoForm form={instance}>` renders **into** the instance's store. It never creates a second one.
- When both `useUniForm({ onSubmit })` and `<AutoForm onSubmit>` are given, the `<AutoForm>` prop wins — so an external button and the rendered one always run the same handler.
- In instance mode `<AutoForm>` still honours `fields`, `layout`, `classNames`, `fieldWrapper`, `components`, `disabled`, `labels`, `messages`, `coercions`, merging them over the instance's config. Register `condition` predicates on the `UniForm` definition (or in `useUniForm`'s `fields`) so they run before defaults are computed.
- Persistence belongs to the **instance**, not to a mounted `<AutoForm>`.
- While `form.isLoading` is `true`, an async `defaultValues` loader is still pending — render your own placeholder.

You can render **no `<AutoForm>` at all**:

```tsx
<UniFormProvider form={form}>
  <h1>Checkout</h1>
  <Field name='email' />
  <Field name='address.city' />
  <button type='button' onClick={form.submit}>Pay</button>
</UniFormProvider>
```

## Reading state: `useFormValue` / `useFormValues`

```tsx
const title = useFormValue(ticketForm, 'title')       // string
const priority = useFormValue(ticketForm, 'priority') // 'low' | 'normal' | 'urgent'
const firstSku = useFormValue(ticketForm, 'lines.0.sku')
const all = useFormValues(ticketForm)                 // whole object
```

- Pass the form first for inference — **zero casts**. An unknown path is a compile error.
- `useFormValue` re-renders only when its own path changes; `useFormValues` re-renders on every change, so prefer the single-path hook.
- Passing the live `useUniForm()` result instead of the definition also works **above** the provider, in the component that created the instance.
- For imperative reads/writes use `form.methods` or `useAutoFormContext(form).formMethods`.

## Rendering one field: `<Field>` and `useField`

```tsx
<Field name='address.city' />
<Field name='lines.0.sku' label='Item code' />
<Field name='status' component='segmentedControl' />
```

`<Field>` uses the same registry, resolved config, wrapper and error resolution `<AutoForm>` uses, and works for every field type (scalars, selects, booleans, nested objects, arrays). Per-instance overrides: `component`, `label`, `disabled`, `className`.

When you need to own the markup entirely, `useField(path)` returns the resolved `FieldProps` (plus `config`):

```tsx
const { value, onChange, onBlur, ref, label, error, required } =
  useField<string>('address.city')
```

`onChange` applies the same coercion `<AutoForm>` applies and fires the field's registered `onChange` handler.

If you render a field yourself **and** `<AutoForm>` also renders it, the path registers twice. Hide it from the auto-rendered form: `fields={{ notes: { hidden: true } }}`.

## Container components and relative paths

A component registered for an `object` or `array` field receives a **superset** of `FieldProps`:

| Prop | Available on | Description |
| --- | --- | --- |
| `path` | object + array | Absolute path of the container |
| `setPath(subPath, value, options?)` | object + array | Targeted write relative to the container |
| `fields` | object | Child field configs |
| `itemConfig` | array | Field config for a single row |
| `rows` / `rowCount` | array | Current rows (each with an `id`) and their count |
| `canAdd` / `atMin` | array | Schema `.max()` / `.min()` gates |
| `append` `prepend` `insert` `remove` `move` `swap` `update` `replace` | array | Row operations |

Inside it, `<Field>` paths are **relative to the container**:

```tsx
function LinesTable({ rows, canAdd, append, remove }: ArrayContainerProps) {
  return (
    <table>
      <tbody>
        {rows.map((row, index) => (
          <tr key={String(row.id)}>
            <td><Field name={`${index}.sku`} /></td>{/* → lines.0.sku */}
            <td><Field name={`${index}.qty`} /></td>
            <td>
              <button type='button' onClick={() => remove(index)}>✕</button>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr><td>
          <button
            type='button'
            disabled={!canAdd}
            onClick={() => append({ sku: '', qty: 1 })}
          >
            Add line
          </button>
        </td></tr>
      </tfoot>
    </table>
  )
}
```

Key rows by `row.id` (not by index) so removal does not reshuffle inputs.

Typing in a cell writes **only that path** — the container's `onChange` is never called, so a keystroke does not rebuild the whole array. Use `setPath` for programmatic targeted writes:

```tsx
setPath('0.qty', 3)
setPath('0.qty', 3, { shouldValidate: false }) // skip re-running the schema
```

`useFieldPath()` returns the current base path when a component needs it explicitly.

> `FieldConfig` is an introspection detail, not the extension point. To render something UniForm knows about, use `<Field>` or `useField`.

## Anti-patterns

- ❌ Hosting application chrome inside `layout.formWrapper` to reach the form context. ✅ `useUniForm` + `<UniFormProvider>`.
- ❌ `control as unknown as Control<MyValues>`. ✅ `useAutoFormContext(form)` / `useFormValue(form, path)`.
- ❌ `import { useWatch, useFieldArray } from 'react-hook-form'` in application code. ✅ `useFormValue` / `useArrayField`.
- ❌ Rebuilding a whole array value on every keystroke inside a custom component. ✅ Delegate cells to `<Field>`, or write with `setPath`.
- ❌ Rendering the same path with both `<Field>` and `<AutoForm>`. ✅ Mark it `hidden` in `fields`.
