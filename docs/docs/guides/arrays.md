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

The collapse toggle uses [`ArrayCollapseButtonProps`](/docs/api/types#arraycollapsedbuttonprops) which adds `isCollapsed: boolean`. Strip it before forwarding to a DOM element:

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

## Labels

Override the Add / Remove button labels via the `labels` prop for i18n:

```tsx
<AutoForm labels={{ arrayAdd: '+ Add member', arrayRemove: 'Remove' }} ... />
```

## Minimum / maximum items

UniForm respects `.min(n)` and `.max(n)` on `z.array(...)`:

```ts
z.array(memberSchema)
  .min(1, 'At least 1 member required')
  .max(10, 'Maximum 10 members')
```

The **Add** button is hidden when the max is reached.

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
