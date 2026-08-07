---
title: Dynamic Requiredness
sidebar_position: 15
description: Decide at runtime whether a field is required — with one rule that drives both the asterisk and submit validation.
---

# Dynamic Requiredness

Some fields are required only in certain states: a reason code demanded by an `(action × sector)` matrix, an approver needed only for disposals, a field a backend marks `REQUIRE` at runtime.

A Zod schema is static, so the usual workaround is to mark every such field `.optional()` and re-implement the real rule in a top-level `superRefine`. That works for submit — and leaves the UI with **no asterisk and no `aria-required`**, because nothing tells the render layer the field is required. You end up with two rules that can drift.

`setRequired` collapses them into one.

## The supported pattern

Mark the field `.optional()` in the schema, and put the real rule in `setRequired`:

```ts
const requisitionSchema = z.object({
  action: z.enum(['view', 'transfer', 'dispose']),
  sector: z.enum(['hardware', 'software', 'service']),
  orderReason: z.string().optional(),
})

const requisitionForm = createForm(requisitionSchema).setRequired(
  'orderReason',
  (values) => REASON_REQUIRED[values.action]?.[values.sector] ?? false,
)
```

The predicate drives **all three** at once:

- the asterisk in the field wrapper,
- `aria-required` (and `required`) on the input,
- submit validation — an empty value blocks submission with the required message.

That last point is the whole idea. A required marker that does not block submit re-creates the duplicated-rules problem.

## Inside array rows

Use the same `"arrayName.fieldName"` key convention as [`setCondition`](./conditional-fields#conditions-inside-array-rows). The predicate receives the **row**, so row-local rules read naturally; the second argument is always the full form values, for rules that need cross-form context.

```ts
const orderForm = createForm(orderSchema).setRequired(
  'lines.spec',
  (row, values) => row.kind === 'custom' && values.contractType === 'fixed',
)
```

The predicate is evaluated per row, so row 2 can be required while row 1 is not, and the submit error lands on `lines.1.spec` — the row that actually failed.

## Through the `fields` prop

`requiredWhen` is the per-field equivalent, alongside `condition`:

```tsx
<AutoForm
  form={myForm}
  fields={{
    orderReason: {
      requiredWhen: (values) => values.action === 'transfer',
    },
  }}
  onSubmit={save}
/>
```

Use `setRequired` when the rule belongs to the form definition and should travel with it; use `requiredWhen` for a one-off at the render site.

## From an onChange handler

`setFieldMeta` accepts `required` too, for rules that are easier to express imperatively:

```ts
const form = createForm(schema).setOnChange('trigger', (value, ctx) => {
  ctx.setFieldMeta('note', { required: value === 'on' })
})
```

**Precedence:** `setFieldMeta({ required })` is applied last and wins over both `setRequired` and the schema. `setRequired` and `requiredWhen` target the same slot — registering both for one path keeps the last one registered.

## What counts as empty

Explicitly, and this is the whole rule:

| Value               | Empty?                                           |
| ------------------- | ------------------------------------------------ |
| `undefined`         | ✅ yes                                           |
| `null`              | ✅ yes                                           |
| `''`                | ✅ yes                                           |
| `[]`                | ✅ yes                                           |
| `false`             | ❌ no — it is a value                            |
| `0`                 | ❌ no — it is a value                            |
| `'  '` (whitespace) | ❌ no — trim in the schema if you want otherwise |

The same predicate is exported as `isEmptyValue` if you need to match the behaviour elsewhere.

## The message

The required error uses `messages.required` when you set it, and falls back to `"This field is required"`:

```tsx
<AutoForm messages={{ required: 'Cannot be blank' }} ... />
```

Per-field overrides work as usual — `messages['orderReason']` wins over the global one. See the [Validation guide](./validation).

## Errors the schema already reported win

If Zod already produced an error at a path, `setRequired` does not overwrite it. A `.min(5)` failure keeps its own message rather than being replaced by "This field is required".

## Live example

The playground's **Runtime Requiredness** example drives `orderReason` from an `action × sector` lookup matrix — flip the selects and watch the asterisk follow, then submit with the field empty.
