---
title: Layout & Styling
sidebar_position: 3
description: Replace structural chrome components and add CSS classes to every layer of the form.
---

# Layout & Styling

UniForm separates field rendering from structural chrome — you can swap out the form wrapper, section wrapper, submit button, and array row layout without touching field components.

## `LayoutSlots`

Pass a `layout` object to `<AutoForm>` (or `createAutoForm`) to override any slot:

| Slot              | Default                 | Renders                                               |
| ----------------- | ----------------------- | ----------------------------------------------------- |
| `formWrapper`     | `DefaultFormWrapper`    | `<form>` element + children                           |
| `sectionWrapper`  | `DefaultSectionWrapper` | `<fieldset>` + `<legend>` around grouped fields       |
| `submitButton`    | `DefaultSubmitButton`   | `<button type="submit">`                              |
| `arrayRowLayout`  | `DefaultArrayRowLayout` | Row with add/remove/reorder controls for array fields |
| `loadingFallback` | `<p>Loading…</p>`       | Shown while async `defaultValues` resolves            |

### Slot prop types

```ts
// formWrapper
type FormWrapperProps = { children: React.ReactNode; onSubmit: () => void }

// sectionWrapper
type SectionWrapperProps = { title: string; children: React.ReactNode }

// submitButton
type SubmitButtonProps = {
  isSubmitting: boolean
  label: string
  disabled?: boolean
}

// arrayRowLayout
type ArrayRowLayoutProps = {
  children: React.ReactNode
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDuplicate?: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  index: number
}
```

## `classNames`

Add CSS classes to structural elements without replacing the whole component:

```tsx
<AutoForm
  classNames={{
    form: 'space-y-6',
    fieldWrapper: 'flex flex-col gap-1',
    label: 'text-sm font-medium text-gray-700',
    error: 'text-xs text-red-600 mt-1',
    description: 'text-xs text-gray-500',
    section: 'border border-gray-200 rounded-lg p-4',
    sectionTitle: 'text-sm font-semibold text-gray-800 mb-3',
  }}
  ...
/>
```

## CSS custom properties

The default components expose these CSS custom properties so you can theme without creating custom components:

```css
:root {
  --uniform-input-border: #d1d5db;
  --uniform-input-radius: 6px;
  --uniform-input-focus: #4f46e5;
  --uniform-button-bg: #4f46e5;
  --uniform-button-color: #fff;
  --uniform-error-color: #dc2626;
}
```

## Live Example

A card-style form wrapper with a custom submit button:

```jsx live noInline
// Custom card form wrapper
const CardForm = ({ children, onSubmit }) => (
  <form
    onSubmit={onSubmit}
    style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
      padding: '1.5rem',
      maxWidth: 420,
    }}
  >
    {children}
  </form>
)

// Custom section with accent bar
const AccentSection = ({ title, children }) => (
  <div
    style={{
      borderLeft: '3px solid #4F46E5',
      paddingLeft: '1rem',
      marginBottom: '1.25rem',
    }}
  >
    <p
      style={{
        fontWeight: 600,
        color: '#4F46E5',
        marginBottom: '0.75rem',
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 1,
      }}
    >
      {title}
    </p>
    {children}
  </div>
)

// Gradient submit button
const GradientButton = ({ isSubmitting, label, disabled }) => (
  <button
    type='submit'
    disabled={disabled || isSubmitting}
    style={{
      background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      padding: '10px 24px',
      fontWeight: 600,
      cursor: disabled || isSubmitting ? 'not-allowed' : 'pointer',
      opacity: disabled || isSubmitting ? 0.6 : 1,
      width: '100%',
    }}
  >
    {isSubmitting ? 'Saving…' : label}
  </button>
)

const schema = z.object({
  fullName: z.string().min(1, 'Required'),
  email: z.string().email(),
  department: z.enum(['engineering', 'design', 'product', 'marketing']),
  startDate: z.string().optional(),
})

const employeeForm = createForm(schema)

function App() {
  const [saved, setSaved] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', padding: '1rem' }}>
      <AutoForm
        form={employeeForm}
        layout={{
          formWrapper: CardForm,
          sectionWrapper: AccentSection,
          submitButton: GradientButton,
        }}
        fields={{
          fullName: { label: 'Full Name', section: 'Identity' },
          email: { section: 'Identity' },
          department: { section: 'Role' },
          startDate: { label: 'Start Date', section: 'Role' },
        }}
        labels={{ submit: 'Add Employee' }}
        onSubmit={(v) => setSaved(v)}
      />
      {saved && (
        <pre
          style={{
            marginTop: '1rem',
            background: '#f5f5f5',
            padding: '1rem',
            borderRadius: 6,
          }}
        >
          {JSON.stringify(saved, null, 2)}
        </pre>
      )}
    </div>
  )
}

render(<App />)
```
