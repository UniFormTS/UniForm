# Reactivity — `setOnChange`, `setFieldMeta`, discriminated unions

Read this when a field must react to another field's value: cascading dropdowns, async lookups, dynamic labels/options/visibility, or variant-switching forms.

## Table of contents

- [`setOnChange` — react to a field change](#setonchange--react-to-a-field-change)
- [`setFieldMeta` — dynamic field metadata](#setfieldmeta--dynamic-field-metadata)
- [Per-row `setFieldMeta` in arrays](#per-row-setfieldmeta)
- [Row-specific handlers](#row-specific-handlers)
- [Inline `onChange` via the `fields` prop](#inline-onchange-via-the-fields-prop)
- [Discriminated unions](#discriminated-unions)

## `setOnChange` — react to a field change

Register a typed handler on a `createForm` definition. It fires when that field's value changes and receives the new value plus a `ctx` (`FormMethods` + `setFieldMeta`). Only one handler is kept per field, so registering again replaces it — this prevents accidental handler accumulation across renders. Handlers may be **async**.

```ts
const orderForm = createForm(schema).setOnChange('sku', async (sku, ctx) => {
  const product = await api.lookupSKU(sku) // async lookup
  ctx.setValue('productName', product.name)
  ctx.setValue('unitPrice', product.price)
})
```

A classic cascading-dropdown pattern — repopulate a dependent select when its parent changes:

```ts
const shippingForm = createForm(schema).setOnChange('country', (value, ctx) => {
  const opts = optionsByCountry[value] ?? []
  ctx.setFieldMeta('region', { options: opts })
  const current = ctx.getValues().region
  if (!opts.some((o) => o.value === current) && opts[0]) {
    ctx.setValue('region', opts[0].value)
  }
})
```

## `setFieldMeta` — dynamic field metadata

`ctx.setFieldMeta(field, partialMeta)` overrides per-field UI properties at runtime (`hidden`, `disabled`, `options`, `label`, `placeholder`, `description`). Changes apply synchronously and re-render. Use it for behaviour that depends on values but is richer than show/hide:

```ts
form.setOnChange('expressAvailable', (value, ctx) => {
  ctx.setFieldMeta('shippingMethod', {
    disabled: !value,
    description: value ? 'Choose your delivery speed' : 'Express not available',
  })
  if (!value) ctx.setValue('shippingMethod', 'standard')
})
```

## Per-row `setFieldMeta`

When a `setOnChange` handler is registered for an **array item** field (e.g. `'items.type'`), `setFieldMeta` is automatically scoped to the row where the change happened. `ctx.getValues()` returns that **row's** values, so you inspect siblings directly. Other rows are untouched.

```ts
orderForm.setOnChange('items.type', (value, ctx) => {
  // sibling → scoped to this row only:
  ctx.setFieldMeta('items.description', {
    placeholder:
      value === 'product' ? 'Describe the product…' : 'Describe the service…',
  })
  ctx.setFieldMeta('items.quantity', { hidden: value !== 'product' })

  // non-sibling (top-level) → applies globally:
  ctx.setFieldMeta('notes', { label: 'Order Notes (updated)' })
})
```

Row meta is automatically re-indexed when rows are added, removed, moved, or duplicated.

## Row-specific handlers

Register a handler for a fixed row index with `'arrayName.index.field'` — useful when a position has special meaning (e.g. the first contact is always primary). The generic handler still fires for every row.

```ts
// Generic — fires for ALL rows:
form.setOnChange('contacts.role', (value, ctx) => {
  ctx.setFieldMeta('contacts.email', {
    placeholder:
      value === 'billing' ? 'billing@company.com' : 'email@example.com',
  })
})

// Row-specific — fires ONLY for row 0:
form.setOnChange('contacts.0.role', (value, ctx) => {
  ctx.setFieldMeta('contacts.name', {
    label: value === 'owner' ? 'Owner Name (required)' : 'Full Name',
  })
})
```

Row-specific handlers bind to the index position, not the logical row — they do not follow a row if the user reorders.

## Inline `onChange` via the `fields` prop

For a one-off reaction without `createForm`, pass `onChange` in `fields`. It receives the value and a `FormMethods` object:

```tsx
<AutoForm
  fields={{
    country: {
      onChange: async (value, form) => {
        const regions = await fetchRegions(value)
        form.setValue('region', regions[0])
      },
    },
  }}
  ...
/>
```

Prefer `createForm().setOnChange()` when the logic is shared, needs row-scoped `setFieldMeta`, or you want all behaviour colocated outside the component.

## Discriminated unions

`z.discriminatedUnion(discriminant, variants)` describes a form whose required fields depend on one discriminant value. UniForm has first-class support — pass the union straight to `createForm` and it flattens the variants, renders the discriminant first, and shows only the active variant's fields (inactive fields are hidden, unregistered, and excluded from submit). No manual conditions needed.

```ts
const schema = z.discriminatedUnion('channel', [
  z.object({ channel: z.literal('email'), email: z.email() }),
  z.object({ channel: z.literal('sms'), phone: z.string().min(10) }),
  z.object({ channel: z.literal('webhook'), url: z.url() }),
])

const notifyForm = createForm(schema)

<AutoForm
  form={notifyForm}
  defaultValues={{ channel: 'email' }}
  onSubmit={save}
/>
```

The full union is used by `zodResolver`, so each variant validates strictly on submit. On variant switch, the now-active fields reset to their schema defaults. You can still layer extra `setCondition` rules on top when a field within a variant has further conditional logic.
