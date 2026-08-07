---
title: Conditional Fields
sidebar_position: 5
description: Show or hide fields based on the current form values using setCondition.
---

# Conditional Fields

Use `form.setCondition(field, predicate)` to show or hide a field based on other form values. The predicate receives a snapshot of the current values and must return `true` (show) or `false` (hide).

```ts
const myForm = createForm(schema)

myForm.setCondition('vatNumber', (values) => values.isBusinessAccount === true)
myForm.setCondition(
  'companyName',
  (values) => values.isBusinessAccount === true,
)
```

## How it works

- When a field is hidden, it is **unregistered** from React Hook Form — its value is removed from the submitted object and its validation rules do not run.
- When a field becomes visible again, it is re-registered and its previous value is restored. This means switching a field off and back on does not lose the user's input.
- Conditions are evaluated reactively on every form value change.

:::tip Visibility is not the only runtime lever
`setCondition` decides whether a field is **shown**. To decide whether it is **required** — from a lookup matrix, a backend rule, or a sibling value — use `setRequired`, which drives the asterisk, `aria-required` and submit validation from one predicate. See the [Dynamic Requiredness guide](./dynamic-requiredness).
:::

## Inline condition (without `createForm`)

For simple cases you can skip `createForm` and pass a `condition` predicate directly in the `fields` prop:

```tsx
<AutoForm
  fields={{
    vatNumber: {
      condition: (values) => values.isBusinessAccount === true,
    },
    companyName: {
      condition: (values) => values.isBusinessAccount === true,
    },
  }}
  ...
/>
```

Use `setCondition` (via `createForm`) when the logic is shared across multiple `<AutoForm>` instances, or when you want to colocate all form behaviour in one place outside the component tree.

## Multiple conditions

You can call `setCondition` multiple times for different fields, or combine multiple checks in one predicate:

```ts
myForm.setCondition(
  'proFeature',
  (values) => values.plan === 'pro' || values.plan === 'enterprise',
)
```

## Conditions inside array rows

`setCondition` works inside array fields too. When the target key points into an
array (e.g. `"tasks.note"`), the predicate receives the **current row's values**
instead of the full form — so you can write natural sibling conditions without
knowing the row index:

```ts
const taskForm = createForm(schema)

// `row` is typed as the array item — { priority, note, ... }
taskForm.setCondition('tasks.note', (row) => row.priority === 'high')
```

Each row evaluates its condition independently, so different rows can show or
hide the same field at the same time based on their own values.

:::tip Hidden fields inside arrays
`hidden: true` in the `fields` prop also works for array item fields and is
evaluated per-row:

```tsx
<AutoForm
  fields={{ 'tasks.internal': { hidden: true } }}
  ...
/>
```

:::

## Per-row `setFieldMeta` in array onChange handlers

When you register a `setOnChange` handler for an array item field, `setFieldMeta` is automatically scoped to the row where the change occurred. This means you can dynamically override labels, placeholders, options, or visibility for a specific row without affecting other rows.

```ts
const schema = z.object({
  items: z.array(
    z.object({
      type: z.enum(['product', 'service']),
      description: z.string(),
      quantity: z.number().optional(),
    }),
  ),
})

const orderForm = createForm(schema)

// When "type" changes in any row, update that row's description placeholder
orderForm.setOnChange('items.type', (value, ctx) => {
  if (value === 'product') {
    ctx.setFieldMeta('items.description', {
      placeholder: 'Describe the product…',
    })
    ctx.setFieldMeta('items.quantity', { hidden: false })
  } else {
    ctx.setFieldMeta('items.description', {
      placeholder: 'Describe the service…',
    })
    ctx.setFieldMeta('items.quantity', { hidden: true })
  }
})
```

In this example, changing `type` in row 2 only updates the placeholder and visibility for row 2. Rows 0 and 1 keep their own independent state.

### How it works

- The handler fires once per row when that row's field changes.
- `ctx.getValues()` returns the **current row's values** (not the full form), so you can inspect sibling fields directly.
- `ctx.setFieldMeta('items.description', ...)` targets the sibling field `description` in the same row. Under the hood, the key is stored as `"items.2.description"` (for row 2).
- Each row maintains its own set of overrides — they never bleed across rows.

### Non-sibling fields apply globally

If you call `setFieldMeta` with a field name that is **not** a sibling of the array item, the override applies globally as usual:

```ts
orderForm.setOnChange('items.type', (value, ctx) => {
  // "items.description" is a sibling → scoped to this row
  ctx.setFieldMeta('items.description', { placeholder: 'Row-specific…' })

  // "notes" is a top-level field → applies globally
  ctx.setFieldMeta('notes', { label: 'Order Notes (updated)' })
})
```

:::tip Row mutations
When rows are added, removed, moved, or duplicated, per-row meta overrides are automatically re-indexed to stay associated with the correct row data.
:::

### Row-specific onChange handlers

You can also register a handler for a specific row index using `"arrayName.index.field"` syntax. This is useful when a particular row (e.g. the first row) needs special behavior:

```ts
const form = createForm(schema)

// Generic — fires for ALL rows when "role" changes
form.setOnChange('contacts.role', (value, ctx) => {
  ctx.setFieldMeta('contacts.email', {
    placeholder:
      value === 'billing' ? 'billing@company.com' : 'email@example.com',
  })
})

// Row-specific — fires ONLY for row 0
form.setOnChange('contacts.0.role', (value, ctx) => {
  ctx.setFieldMeta('contacts.name', {
    label: value === 'owner' ? 'Owner Name (required)' : 'Full Name',
  })
})
```

When row 0's `role` changes, both handlers fire. When any other row's `role` changes, only the generic handler fires.

:::note
Row-specific handlers use static indices. If the user reorders rows, the handler stays bound to the index position (not the logical row). Use this for cases where a fixed position has special meaning (e.g. "the first contact is always the primary").
:::

## Live Example

```jsx live noInline
const schema = z.object({
  accountType: z.enum(['personal', 'business']),
  fullName: z.string().min(1, 'Required'),
  // Business-only fields
  companyName: z.string().optional(),
  vatNumber: z.string().optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '200+']).optional(),
  // Personal-only fields
  dateOfBirth: z.string().optional(),
})

const accountForm = createForm(schema)

accountForm.setCondition('companyName', (v) => v.accountType === 'business')
accountForm.setCondition('vatNumber', (v) => v.accountType === 'business')
accountForm.setCondition('companySize', (v) => v.accountType === 'business')
accountForm.setCondition('dateOfBirth', (v) => v.accountType === 'personal')

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 440 }}>
      <AutoForm
        form={accountForm}
        defaultValues={{ accountType: 'personal' }}
        fields={{
          accountType: { label: 'Account Type' },
          fullName: { label: 'Full Name' },
          dateOfBirth: { label: 'Date of Birth' },
          companyName: { label: 'Company Name' },
          vatNumber: { label: 'VAT Number' },
          companySize: { label: 'Company Size' },
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
