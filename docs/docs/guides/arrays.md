---
title: Array Fields
sidebar_position: 6
description: Render and manage repeating groups of fields from z.array() schemas.
---

# Array Fields

`z.array(z.object(...))` fields are automatically rendered as a repeating group. Each row is an independent nested form segment rendered below an **Add** button.

:::note Object arrays only
UniForm renders array fields whose item schema is a `z.object(...)`. Arrays of primitives (e.g. `z.array(z.string())`) are not rendered as repeating fields — use a custom component for those cases.
:::

```ts
const schema = z.object({
  members: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(['owner', 'member', 'guest']),
    }),
  ),
})
```

## Row controls

By default each row gets:

| Control             | Behaviour                       |
| ------------------- | ------------------------------- |
| Remove              | Removes that row from the array |
| Move Up / Move Down | Reorders rows                   |

Enable **Duplicate** and **Collapse** per-row via the `fields` prop:

```tsx
<AutoForm
  fields={{
    members: { duplicable: true, collapsible: true },
  }}
  ...
/>
```

You can also replace the entire row layout via `layout.arrayRowLayout`. The component receives `children` (the row's fields) and a `buttons` object containing pre-rendered button nodes — place them wherever you like:

```tsx
const MyRowLayout = ({ children, buttons, index }) => (
  <div className='array-row'>
    {buttons.collapse}
    {children}
    <div className='row-controls'>
      {buttons.moveUp}
      {buttons.moveDown}
      {buttons.duplicate}
      {buttons.remove}
    </div>
  </div>
)
```

See [`ArrayRowLayoutProps`](/docs/api/types#arrayrowlayoutprops) for the full type.

## Button components

Swap the button components for all array actions in one shot by passing `layout.arrayButtons`. Set `base` as the fallback for every slot, then override individual actions as needed.

```tsx
import { Button } from 'my-design-system'

// Use your DS button for every array action
<AutoForm
  layout={{ arrayButtons: { base: Button } }}
  ...
/>

// Or override slots individually
<AutoForm
  layout={{
    arrayButtons: {
      base: Button,
      remove: DangerButton, // only the Remove button uses DangerButton
    },
  }}
  ...
/>
```

Resolution order: **specific slot → `base` → built-in default**.

The collapse toggle uses [`ArrayCollapseButtonProps`](/docs/api/types#arraycollapsebuttonprops) which adds `isCollapsed: boolean`. Strip it before forwarding to a DOM element:

```tsx
const MyCollapseBtn = ({ isCollapsed, ...props }: ArrayCollapseButtonProps) => (
  <Button variant={isCollapsed ? 'outline' : 'ghost'} {...props} />
)

<AutoForm layout={{ arrayButtons: { collapse: MyCollapseBtn } }} ... />
```

## Add button position

By default the Add button appears below the rows. Override `layout.arrayFieldLayout` to change this:

```tsx
const AddFirstLayout = ({ rows, addButton }: ArrayFieldLayoutProps) => (
  <div>
    {addButton}
    {rows}
  </div>
)

<AutoForm layout={{ arrayFieldLayout: AddFirstLayout }} ... />
```

See [`ArrayFieldLayoutProps`](/docs/api/types#arrayfieldlayoutprops) for the full type.

## External controls with `useArrayField`

When you need array actions outside the array field block (for example in a toolbar above the form), use `useArrayField(fieldName)` inside any component rendered under `<AutoForm>`.

The hook returns all `useFieldArray` actions (`append`, `remove`, `move`, `swap`, `replace`, etc.) plus:

- `rowCount` — current number of rows
- `canAdd` — `false` when the array reached Zod `.max(...)`
- `atMin` — `true` when row count is at or below Zod `.min(...)`

```tsx
import { AutoForm, createForm, useArrayField } from '@uniform-ts/core'

const schema = z.object({
  lineItems: z.array(z.object({ name: z.string() })).min(1).max(5),
})

const form = createForm(schema)

function Toolbar() {
  const { append, canAdd, rowCount } = useArrayField('lineItems')
  return (
    <button
      type='button'
      disabled={!canAdd}
      onClick={() => append({ name: '' })}
    >
      Add item ({rowCount}/5)
    </button>
  )
}

const FormWithToolbar = ({ children }: FormWrapperProps) => (
  <>
    <Toolbar />
    {children}
  </>
)

const RowsOnly = ({ rows }: ArrayFieldLayoutProps) => <>{rows}</>

<AutoForm
  form={form}
  defaultValues={{ lineItems: [{ name: '' }] }}
  layout={{ formWrapper: FormWithToolbar, arrayFieldLayout: RowsOnly }}
  onSubmit={console.log}
/>
```

Use dot paths for nested arrays too (for example `"profile.contacts"`).

See [`useArrayField()` API](/docs/api/use-array-field) for the full contract.

## Labels

Override individual button labels via the `labels` prop, or import a ready-made locale pack that covers all strings at once — including accessible aria labels:

```tsx
// Individual overrides
<AutoForm labels={{ arrayAdd: '+ Add member', arrayRemove: 'Remove' }} ... />

// Full locale pack (only the imported locale is included in your bundle)
import { es } from '@uniform-ts/core/locales/es'

<AutoForm labels={es} ... />

// Locale with per-instance overrides
<AutoForm labels={{ ...es, arrayAdd: '+ Nueva fila' }} ... />
```

See the [Localization guide](./localization) for the full list of available keys and all bundled locales.

## Minimum / maximum items

UniForm respects `.min(n)` and `.max(n)` on `z.array(...)`:

```ts
z.array(memberSchema)
  .min(1, 'At least 1 member required')
  .max(10, 'Maximum 10 members')
```

The **Add** button is hidden when the max is reached.

## Conditional fields inside rows

Fields within each row support the same `hidden` and `condition` options as
top-level fields. Use `setCondition` with an `"arrayField.fieldName"` key — the
predicate receives the current **row's values**, making sibling conditions
straightforward:

```ts
const taskForm = createForm(schema)

taskForm.setCondition(
  'tasks.note',
  (row) => row.priority === 'high', // `row` is typed as the item shape
)
```

Each row evaluates its own condition independently. You can also set `hidden:
true` via the `fields` prop to permanently suppress a field across all rows:

```tsx
<AutoForm fields={{ 'tasks.internal': { hidden: true } }} ... />
```

See the [Conditional Fields guide](./conditional-fields#conditions-inside-array-rows) for more detail.

## Live Example

```jsx live noInline
const memberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['owner', 'member', 'guest']),
})

const teamSchema = z.object({
  teamName: z.string().min(1, 'Required'),
  members: z.array(memberSchema).min(1, 'Add at least one member'),
})

const teamForm = createForm(teamSchema)

const CompactRowLayout = ({ children, buttons, index }) => (
  <div
    style={{
      border: '1px solid var(--ifm-color-emphasis-300)',
      borderRadius: 8,
      padding: '0.75rem',
      marginBottom: '0.5rem',
      background:
        index % 2 === 0
          ? 'var(--ifm-color-emphasis-100)'
          : 'var(--ifm-background-color)',
    }}
  >
    {children}
    <div
      style={{
        display: 'flex',
        gap: 8,
        marginTop: 8,
        justifyContent: 'flex-end',
      }}
    >
      {buttons.moveUp}
      {buttons.moveDown}
      {buttons.duplicate}
      {buttons.remove}
    </div>
  </div>
)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 480 }}>
      <style>{`.ar-dup { color: var(--ifm-color-primary) } .ar-rm { color: var(--ifm-color-danger) }`}</style>
      <AutoForm
        form={teamForm}
        defaultValues={{ members: [{ name: '', email: '', role: 'member' }] }}
        fields={{
          teamName: { label: 'Team Name' },
          members: { label: 'Team Members', movable: true, duplicable: true },
        }}
        classNames={{ arrayDuplicate: 'ar-dup', arrayRemove: 'ar-rm' }}
        layout={{ arrayRowLayout: CompactRowLayout }}
        labels={{ arrayAdd: '+ Add member', submit: 'Create Team' }}
        onSubmit={(v) => setResult(v)}
      />
      {result && (
        <pre
          style={{
            marginTop: '1rem',
            background: 'var(--ifm-color-emphasis-200)',
            padding: '1rem',
            borderRadius: 6,
            fontSize: 12,
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
