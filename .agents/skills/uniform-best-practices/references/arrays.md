# Array fields — deep detail

Read this when customising how array rows render, where the Add button sits, which button components are used, or working with nested arrays.

## Table of contents

- [Row controls and `fields` flags](#row-controls-and-fields-flags)
- [Custom row layout (`arrayRowLayout`)](#custom-row-layout-arrayrowlayout)
- [Add-button position (`arrayFieldLayout`)](#add-button-position-arrayfieldlayout)
- [Swapping array buttons (`arrayButtons`)](#swapping-array-buttons-arraybuttons)
- [External controls with `useArrayField`](#external-controls-with-usearrayfield)
- [Conditional fields inside rows](#conditional-fields-inside-rows)

## Row controls and `fields` flags

Every row gets Remove and Move Up / Move Down by default. Enable Duplicate and Collapse per array via the `fields` prop:

```tsx
<AutoForm
  fields={{ members: { movable: true, duplicable: true, collapsible: true } }}
  ...
/>
```

`.min(n)` / `.max(n)` on the array drive the UI: the Add button hides at max, and Remove is suppressed below min. Keep these bounds in the **schema** so validation and UI stay in agreement.

## Custom row layout (`arrayRowLayout`)

Replace the whole row layout via `layout.arrayRowLayout`. The component receives `children` (the row's fields) and a `buttons` object of **pre-rendered nodes** — place them wherever you like. A button node is `null` when not applicable (e.g. `moveUp` on the first row, `duplicate` at max).

```tsx
import type { ArrayRowLayoutProps } from '@uniform-ts/core'

const CompactRow = ({ children, buttons, index }: ArrayRowLayoutProps) => (
  <div className="array-row">
    {buttons.collapse}
    {children}
    <div className="row-controls">
      {buttons.moveUp}
      {buttons.moveDown}
      {buttons.duplicate}
      {buttons.remove}
    </div>
  </div>
)

<AutoForm layout={{ arrayRowLayout: CompactRow }} ... />
```

## Add-button position (`arrayFieldLayout`)

By default the Add button renders below the rows. Override `layout.arrayFieldLayout` to move it (or omit it entirely, e.g. when driving Add from an external toolbar):

```tsx
import type { ArrayFieldLayoutProps } from '@uniform-ts/core'

const AddFirst = ({ rows, addButton }: ArrayFieldLayoutProps) => (
  <div>{addButton}{rows}</div>
)

// Rows only — suppress the built-in Add button:
const RowsOnly = ({ rows }: ArrayFieldLayoutProps) => <>{rows}</>

<AutoForm layout={{ arrayFieldLayout: RowsOnly }} ... />
```

## Swapping array buttons (`arrayButtons`)

Swap the button component for every array action at once with `layout.arrayButtons`. Set `base` as the fallback and override individual slots as needed. Resolution: **specific slot → `base` → built-in default**. `undefined` means "use fallback/default"; `null` means "omit this button".

```tsx
import { Button } from 'my-design-system'

// One button for every array action:
<AutoForm layout={{ arrayButtons: { base: Button } }} ... />

// Override just Remove:
<AutoForm layout={{ arrayButtons: { base: Button, remove: DangerButton } }} ... />

// Omit the Remove button:
<AutoForm layout={{ arrayButtons: { remove: null } }} ... />
```

The collapse toggle uses `ArrayCollapseButtonProps` (adds `isCollapsed`). Strip it before spreading onto a DOM element:

```tsx
import type { ArrayCollapseButtonProps } from '@uniform-ts/core'

const MyCollapse = ({ isCollapsed, ...props }: ArrayCollapseButtonProps) => (
  <Button variant={isCollapsed ? 'outline' : 'ghost'} {...props} />
)
```

## External controls with `useArrayField`

Call `useArrayField(path)` from any component rendered inside `<AutoForm>` to drive array actions from outside the array block (a toolbar, a sticky footer). It returns every `useFieldArray` action (`append`, `remove`, `move`, `swap`, `replace`, …) plus:

- `rowCount` — current number of rows
- `canAdd` — `false` when the array reached its `.max(...)`
- `atMin` — `true` when at or below `.min(...)`

```tsx
import { AutoForm, createForm, useArrayField } from '@uniform-ts/core'
import type { FormWrapperProps, ArrayFieldLayoutProps } from '@uniform-ts/core'

const schema = z.object({
  lineItems: z.array(z.object({ name: z.string() })).min(1).max(5),
})
const form = createForm(schema)

function Toolbar() {
  const { append, canAdd, rowCount } = useArrayField('lineItems')
  return (
    <button type="button" disabled={!canAdd} onClick={() => append({ name: '' })}>
      Add item ({rowCount}/5)
    </button>
  )
}

const FormWithToolbar = ({ children }: FormWrapperProps) => (
  <><Toolbar />{children}</>
)
const RowsOnly = ({ rows }: ArrayFieldLayoutProps) => <>{rows}</>

<AutoForm
  form={form}
  defaultValues={{ lineItems: [{ name: '' }] }}
  layout={{ formWrapper: FormWithToolbar, arrayFieldLayout: RowsOnly }}
  onSubmit={console.log}
/>
```

Use dot paths for nested arrays too, e.g. `useArrayField('profile.contacts')`.

## Conditional fields inside rows

Fields inside a row support the same `hidden` and `condition` options as top-level fields. With `setCondition` and an `'arrayName.fieldName'` key, the predicate receives the **current row's values**, so sibling conditions are natural and index-free:

```ts
const taskForm = createForm(schema)
taskForm.setCondition('tasks.note', (row) => row.priority === 'high')
```

Each row evaluates independently. To permanently suppress a field across all rows, set `hidden: true`:

```tsx
<AutoForm fields={{ 'tasks.internal': { hidden: true } }} ... />
```

See [reactivity.md](reactivity.md#per-row-setfieldmeta) for dynamic per-row metadata via `setOnChange`.
