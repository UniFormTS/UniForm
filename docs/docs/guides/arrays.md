---
title: Array Fields
sidebar_position: 6
description: Render and manage repeating groups of fields from z.array() schemas.
---

# Array Fields

Any `z.array(z.object(...))` field is automatically rendered as a repeating group. Each row is an independent nested form segment rendered below an **Add** button.

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

You can add **Duplicate** by setting `arrayRowLayout` in `layout`:

```tsx
const MyRowLayout = ({
  children,
  onRemove,
  onDuplicate,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}) => (
  <div className='array-row'>
    {children}
    <div className='row-controls'>
      <button type='button' onClick={onMoveUp} disabled={!canMoveUp}>
        ↑
      </button>
      <button type='button' onClick={onMoveDown} disabled={!canMoveDown}>
        ↓
      </button>
      <button type='button' onClick={onDuplicate}>
        ⊕ Duplicate
      </button>
      <button type='button' onClick={onRemove}>
        ✕ Remove
      </button>
    </div>
  </div>
)
```

## Labels

Override the Add / Remove button labels via the `labels` prop for i18n:

```tsx
<AutoForm labels={{ addItem: '+ Add member', removeItem: 'Remove' }} ... />
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
        labels={{ addItem: '+ Add member', submit: 'Create Team' }}
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
