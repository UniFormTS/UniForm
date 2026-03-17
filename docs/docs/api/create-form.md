---
title: createForm()
sidebar_position: 2
---

# `createForm()`

`createForm(schema)` creates a `UniForm` instance that binds a Zod schema to a reactive `setOnChange` / `setCondition` pipeline. Pass the resulting object to `<AutoForm form={...}>`.

```ts
import { createForm } from '@uniform/core'
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

| Property       | Type                                                    | Description                                                  |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| `setValue`     | `(field, value) => void`                                | Set another field's value programmatically                   |
| `setValues`    | `(values: Partial<T>) => void`                          | Set multiple field values at once                            |
| `getValues`    | `() => z.infer<TSchema>`                                | Snapshot of all current values                               |
| `resetField`   | `(field) => void`                                       | Reset a single field to its default value                    |
| `reset`        | `(values?) => void`                                     | Reset the entire form                                        |
| `setError`     | `(field, message) => void`                              | Set a validation error                                       |
| `setErrors`    | `(errors) => void`                                      | Set errors on multiple fields at once                        |
| `clearErrors`  | `(fields?) => void`                                     | Clear errors                                                 |
| `submit`       | `() => void`                                            | Programmatically trigger form submission                     |
| `focus`        | `(field) => void`                                       | Focus a specific field by name                               |
| `watch`        | `(field?) => value`                                     | Subscribe to a field (or all values)                         |
| `setFieldMeta` | `(field, meta: Partial<FieldDependencyResult>) => void` | Dynamically override a field's label/options/disabled/hidden |

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
