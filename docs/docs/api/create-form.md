---
title: createForm()
sidebar_position: 2
---

# `createForm()`

`createForm(schema)` creates a `UniForm` instance that binds a Zod schema to a reactive `setOnChange` / `setCondition` pipeline. Pass the resulting object to `<AutoForm form={...}>`.

```ts
import { createForm } from '@uniform-ts/core'
import { z } from 'zod'

const myForm = createForm(schema)
```

## `setOnChange(field, handler)`

Register a reactive handler that fires whenever `field` changes. The handler receives the new `value` and a `UniFormContext` with full form control methods.

```ts
myForm.setOnChange('country', async (value, ctx) => {
  const regions = await fetchRegions(value)
  ctx.setValue('region', regions[0])
})
```

Only **one** handler per field is supported. Calling `setOnChange` again for the same field replaces the previous handler. `setOnChange` returns `this` for fluent chaining.

### `UniFormContext<TSchema>`

`UniFormContext` extends all [`FormMethods`](/docs/api/types#formmethods) and adds one extra method:

| Property       | Type                                                    | Description                                                                                                          |
| -------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `setValue`     | `(field, value) => void`                                | Set another field's value programmatically                                                                           |
| `setValues`    | `(values: Partial<T>) => void`                          | Set multiple field values at once                                                                                    |
| `getValues`    | `() => z.infer<TSchema>`                                | Snapshot of all current values (returns row values inside array item handlers)                                       |
| `resetField`   | `(field) => void`                                       | Reset a single field to its default value                                                                            |
| `reset`        | `(values?) => void`                                     | Reset the entire form                                                                                                |
| `setError`     | `(field, message) => void`                              | Set a validation error                                                                                               |
| `setErrors`    | `(errors) => void`                                      | Set errors on multiple fields at once                                                                                |
| `clearErrors`  | `(fields?) => void`                                     | Clear errors                                                                                                         |
| `submit`       | `() => void`                                            | Programmatically trigger form submission                                                                             |
| `focus`        | `(field) => void`                                       | Focus a specific field by name                                                                                       |
| `watch`        | `(field?) => value`                                     | Subscribe to a field (or all values)                                                                                 |
| `setFieldMeta` | `(field, meta: Partial<FieldDependencyResult>) => void` | Dynamically override a field's label/options/disabled/hidden (auto-scopes to current row inside array item handlers) |

### Array Item onChange Handlers

When `setOnChange` is registered for a field inside an array (e.g. `"items.type"`), the handler receives a third parameter — the **row index** — indicating which row triggered the change:

```ts
myForm.setOnChange('items.type', (value, ctx, rowIndex) => {
  // rowIndex is the zero-based index of the array row that changed
  console.log(`Row ${rowIndex} type changed to ${value}`)
})
```

Inside an array item handler, the context methods are **automatically scoped to the current row**:

| Method                          | Behavior inside array item handler                                   |
| ------------------------------- | -------------------------------------------------------------------- |
| `ctx.getValues()`               | Returns the current **row's** values (not the full form)             |
| `ctx.setFieldMeta(field, meta)` | Auto-scopes to the current row when `field` is a sibling item field  |
| `ctx.setValue(field, value)`    | Sets a value on the full form (use the full path for sibling fields) |

#### Row-scoped `setFieldMeta`

When you call `ctx.setFieldMeta('items.fieldName', meta)` targeting a sibling field within the same array, the override is automatically scoped to the row where the change occurred. You don't need to manually include the row index in the field path.

```ts
const schema = z.object({
  items: z.array(
    z.object({
      type: z.enum(['physical', 'digital']),
      weight: z.string(),
    }),
  ),
})

const form = createForm(schema)

form.setOnChange('items.type', (value, ctx, rowIndex) => {
  // This only affects the "weight" field in the SAME row
  ctx.setFieldMeta('items.weight', {
    disabled: value === 'digital',
    placeholder: value === 'digital' ? 'N/A' : 'Enter weight',
  })
})
```

If the field name does **not** match a sibling item field, the override applies globally (same as top-level handlers):

```ts
form.setOnChange('items.type', (value, ctx, rowIndex) => {
  // "items.weight" is a sibling → scoped to current row
  ctx.setFieldMeta('items.weight', { disabled: true })

  // "notes" is NOT a sibling → applied globally
  ctx.setFieldMeta('notes', { placeholder: 'Updated from array handler' })
})
```

#### Row-scoped `getValues`

Inside an array item handler, `ctx.getValues()` returns the values for the current row rather than the entire form:

```ts
form.setOnChange('items.type', (value, ctx, rowIndex) => {
  const rowValues = ctx.getValues()
  // rowValues = { type: 'physical', weight: '2kg' }  (just this row)
})
```

This is consistent with how `setCondition` predicates receive row-scoped values for array item fields.

#### Row-specific handlers

You can register a handler for a specific row index using `"arrayName.index.field"` syntax:

```ts
// Fires only when row 0's type changes
form.setOnChange('items.0.type', (value, ctx, rowIndex) => {
  ctx.setFieldMeta('items.weight', { label: 'Primary item weight' })
})
```

When that row's field changes, both the generic handler (`"items.type"`) and the row-specific handler (`"items.0.type"`) fire. Other rows only trigger the generic handler.

## `setCondition(field, predicate)`

Show/hide a field based on the current form values. `predicate` receives the current values and returns `true` (show) or `false` (hide).

```ts
myForm.setCondition('vatNumber', (values) => values.isBusinessAccount === true)
```

Hidden fields are **unregistered** from React Hook Form validation and excluded from the submitted values.

## Live Example

Selecting a country triggers an async lookup of matching regions:

```jsx live noInline
const schema = z.object({
  country: z.enum(['US', 'CA', 'GB']),
  region: z.string().min(1, 'Required'),
  zip: z.string().min(5, 'Min 5 chars'),
})

const regionMap = {
  US: ['California', 'Texas', 'New York', 'Florida'],
  CA: ['Ontario', 'Quebec', 'Alberta', 'British Columbia'],
  GB: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
}

const locationForm = createForm(schema)

locationForm.setOnChange('country', async (value, ctx) => {
  // Simulate API latency
  await new Promise((r) => setTimeout(r, 400))
  const regions = regionMap[value] || []
  ctx.setValue('region', regions[0] || '')
})

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 400 }}>
      <AutoForm
        form={locationForm}
        defaultValues={{ country: 'US', region: 'California' }}
        fields={{
          country: { label: 'Country' },
          region: { label: 'State / Province' },
          zip: { label: 'Postal Code' },
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
