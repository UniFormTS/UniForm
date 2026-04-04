---
title: Layout & Styling
sidebar_position: 3
description: Replace structural chrome components and add CSS classes to every layer of the form.
---

# Layout & Styling

UniForm separates field rendering from structural chrome — you can swap out the form wrapper, section wrapper, submit button, and array row layout without touching field components.

## `LayoutSlots`

Pass a `layout` object to `<AutoForm>` (or `createAutoForm`) to override any slot:

| Slot               | Default                   | Renders                                                 |
| ------------------ | ------------------------- | ------------------------------------------------------- |
| `formWrapper`      | `DefaultFormWrapper`      | `<form>` element + children                             |
| `sectionWrapper`   | `DefaultSectionWrapper`   | `<fieldset>` + `<legend>` around grouped fields         |
| `submitButton`     | `DefaultSubmitButton`     | `<button type="submit">`                                |
| `objectWrapper`    | `DefaultObjectWrapper`    | `<fieldset>` + `<legend>` around nested object fields   |
| `arrayWrapper`     | `DefaultArrayWrapper`     | `<fieldset>` + `<legend>` around array fields           |
| `arrayRowLayout`   | `DefaultArrayRowLayout`   | Layout for a single array row (fields + action buttons) |
| `arrayFieldLayout` | `DefaultArrayFieldLayout` | Layout for the whole array (all rows + Add button)      |
| `arrayButtons`     | `DefaultArrayButton` × 6  | Button components for Add / Remove / Move / Duplicate   |
| `loadingFallback`  | `<p>Loading…</p>`         | Shown while async `defaultValues` resolves              |

### Slot prop types

```ts
// formWrapper — receives only children; the <form> element is managed by AutoForm
interface FormWrapperProps {
  children: React.ReactNode
}

// sectionWrapper
interface SectionWrapperProps {
  title: string
  children: React.ReactNode
  className?: string
}

// submitButton
interface SubmitButtonProps {
  isSubmitting: boolean
  label: string
}

// objectWrapper — replaces <fieldset>/<legend> around nested object fields
interface ObjectWrapperProps {
  children: React.ReactNode
  label: string | undefined // field label used as the heading
  className?: string // forwarded from classNames.objectFieldset
  labelClassName?: string // forwarded from classNames.objectLegend
}

// arrayWrapper — replaces <fieldset>/<legend> around array fields
interface ArrayWrapperProps {
  children: React.ReactNode
  label: string | undefined // field label used as the heading
  className?: string // forwarded from classNames.arrayFieldset
  labelClassName?: string // forwarded from classNames.arrayLegend
}
```

:::tip Per-field override
You can override the wrapper for a **single field** without affecting all others by passing `wrapper` in the `fields` prop. It takes precedence over the global slot:

```tsx
fields={{
  address: { wrapper: CardObjectWrapper },  // only this object gets the card
  phones:  { wrapper: AccordionArrayWrapper }, // only this array gets the accordion
}}
```

Resolution order: **`fields[name].wrapper` → `layout.objectWrapper` / `layout.arrayWrapper` → built-in default**.
:::

// arrayRowLayout — buttons are pre-rendered nodes, not callbacks
interface ArrayRowLayoutProps {
children: React.ReactNode
buttons: {
moveUp: React.ReactNode | null // null when already first row
moveDown: React.ReactNode | null // null when already last row
duplicate: React.ReactNode | null // null when at maxItems
remove: React.ReactNode
collapse: React.ReactNode | null // null when collapsible is disabled
}
index: number // zero-based row index
rowCount: number // total number of rows
}

// arrayFieldLayout — controls where the Add button sits relative to the rows
interface ArrayFieldLayoutProps {
rows: React.ReactNode
addButton: React.ReactNode
rowCount: number
canAdd: boolean // false when maxItems is reached
}

// arrayButtons — swap in your design system's button for all array actions
type ArrayButtonSlots = {
base?: React.ComponentType<ArrayButtonProps> // fallback for un-overridden slots
add?: React.ComponentType<ArrayButtonProps>
remove?: React.ComponentType<ArrayButtonProps>
moveUp?: React.ComponentType<ArrayButtonProps>
moveDown?: React.ComponentType<ArrayButtonProps>
duplicate?: React.ComponentType<ArrayButtonProps>
collapse?: React.ComponentType<ArrayCollapseButtonProps>
}

interface ArrayButtonProps {
onClick?: React.MouseEventHandler<HTMLButtonElement>
disabled?: boolean
type?: 'button' | 'submit' | 'reset'
'aria-label'?: string
className?: string
children?: React.ReactNode
}

interface ArrayCollapseButtonProps extends ArrayButtonProps {
isCollapsed: boolean
}

````

See the [TypeScript API](/docs/api/types) for full type details.

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
    // Nested object fieldset/legend
    objectFieldset: 'border border-indigo-200 rounded-lg p-4',
    objectLegend: 'text-sm font-semibold text-indigo-700 px-1',
    // Array fieldset/legend
    arrayFieldset: 'border border-dashed border-gray-300 rounded-lg p-4',
    arrayLegend: 'text-sm font-semibold text-gray-600 px-1',
  }}
  ...
/>
  }}
  ...
/>
````

## Field wrapper CSS variables

The default field wrapper sets three CSS custom properties on each field's container element. Use these in your `fieldWrapper` class to build grid or stacked layouts without a custom wrapper component.

| Variable        | Value            | Description                                                                |
| --------------- | ---------------- | -------------------------------------------------------------------------- |
| `--field-span`  | `1`–`12`         | Column span from `meta.span` (or `fields[name].span`), falling back to `1` |
| `--field-index` | `0`, `1`, `2`, … | Zero-based render index of the field within its section                    |
| `--field-depth` | `0`, `1`, `2`, … | Nesting depth (`0` = top-level, `1` = inside an array row, etc.)           |

Example — 12-column grid driven entirely by CSS:

```css
.field-wrapper {
  grid-column: span var(--field-span);
}
```

```tsx
<AutoForm classNames={{ form: 'grid grid-cols-12 gap-4', fieldWrapper: 'field-wrapper' }} ... />
```

## Field wrapper data attributes

The default field wrapper also sets `data-*` attributes on the container element. These are useful for CSS selectors and for testing.

| Attribute              | Present when                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `data-field-name`      | Always — value is the field's dot-notated name                                                      |
| `data-field-type`      | Always — value is the resolved type key (`"string"`, `"number"`, `"boolean"`, `"date"`, `"select"`) |
| `data-required`        | Field is required (not optional/nullable in the schema)                                             |
| `data-disabled`        | Field is disabled (via `meta.disabled`, `fields[name].disabled`, or the global `disabled` prop)     |
| `data-has-error`       | A validation error is currently shown on this field                                                 |
| `data-has-description` | The field has a `description` set                                                                   |

Example — style required fields and error states with plain CSS:

```css
[data-required]::after {
  content: ' *';
  color: #dc2626;
}

[data-has-error] label {
  color: #dc2626;
}

[data-field-type='boolean'] {
  flex-direction: row;
  align-items: center;
}
```

## Live Example

A card-style form wrapper with a custom submit button:

```jsx live noInline
// Custom card form wrapper
const CardForm = ({ children }) => (
  <div
    style={{
      background: 'var(--ifm-background-color)',
      border: '1px solid var(--ifm-color-emphasis-300)',
      borderRadius: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
      padding: '1.5rem',
      maxWidth: 420,
    }}
  >
    {children}
  </div>
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
const GradientButton = ({ isSubmitting, label }) => (
  <button
    type='submit'
    disabled={isSubmitting}
    style={{
      background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      padding: '10px 24px',
      fontWeight: 600,
      cursor: isSubmitting ? 'not-allowed' : 'pointer',
      opacity: isSubmitting ? 0.6 : 1,
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
            background: 'var(--ifm-color-emphasis-200)',
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
