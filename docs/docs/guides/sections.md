---
title: Sections
sidebar_position: 4
description: Group related fields into named sections using the section field override.
---

# Sections

Adding `section: 'SectionName'` to one or more field overrides causes UniForm to group those fields under a shared section wrapper. Fields without a `section` render first (or in `order` order), then sections render in first-encounter order.

```tsx
<AutoForm
  form={myForm}
  fields={{
    firstName: { section: 'Personal' },
    lastName: { section: 'Personal' },
    email: { section: 'Contact' },
    phone: { section: 'Contact' },
  }}
/>
```

## Default section wrapper

The default `sectionWrapper` renders a `<fieldset>` with a `<legend>` containing the section title. Override it via the `layout.sectionWrapper` slot.

## Custom section card wrapper

Replace the wrapper for **all** sections at once with `layout.sectionWrapper`:

```tsx
const SectionCard = ({ title, children, className }) => (
  <div className={className}>
    <h3>{title}</h3>
    <div>{children}</div>
  </div>
)

<AutoForm layout={{ sectionWrapper: SectionCard }} ... />
```

## Per-section styling

Use `layout.sections` to apply a `className` or swap the wrapper component for **individual** sections, without touching the others:

```tsx
<AutoForm
  layout={{
    sections: {
      Personal: { className: 'bg-blue-50 p-4 rounded' },
      Address: { className: 'bg-green-50 p-4 rounded' },
    },
  }}
  ...
/>
```

### Per-section component override

For complete control over a single section, provide a `component`:

```tsx
const HighlightedSection = ({ title, children, className }) => (
  <div className={`highlighted-section ${className ?? ''}`}>
    <h2>{title}</h2>
    {children}
  </div>
)

<AutoForm
  layout={{
    sections: {
      Personal: { component: HighlightedSection, className: 'vip' },
      Address: { className: 'secondary' },
    },
  }}
  ...
/>
```

When `component` is provided it replaces the `sectionWrapper` for that section only. The `className` is forwarded to both the per-section `component` and the global `sectionWrapper`.

### With `createAutoForm`

Factory-level and instance-level `sections` are merged — instance wins on conflicts:

```tsx
const AppForm = createAutoForm({
  layout: {
    sections: {
      Personal: { className: 'card' },
    },
  },
})

// Inherits factory 'Personal' class; adds 'Address' class on top
<AppForm
  layout={{ sections: { Address: { className: 'card card--secondary' } } }}
  ...
/>
```

## `SectionConfig` type

```ts
type SectionConfig = {
  /** CSS class name forwarded to the section wrapper. */
  className?: string
  /** Replace the section wrapper component for this section only. */
  component?: React.ComponentType<SectionWrapperProps>
}
```

## Live Example

```jsx live noInline
const SectionCard = ({ title, children }) => (
  <div
    style={{
      border: '1px solid var(--ifm-color-emphasis-300)',
      borderRadius: 10,
      marginBottom: '1rem',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        background: 'var(--ifm-color-emphasis-200)',
        borderBottom: '1px solid var(--ifm-color-emphasis-300)',
        padding: '0.6rem 1rem',
        fontWeight: 600,
        fontSize: 13,
        color: 'var(--ifm-font-color-base)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {title}
    </div>
    <div style={{ padding: '1rem' }}>{children}</div>
  </div>
)

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email(),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  country: z.enum(['US', 'CA', 'GB', 'AU']).optional(),
  newsletter: z.boolean(),
  smsAlerts: z.boolean(),
})

const profileForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 480 }}>
      <AutoForm
        form={profileForm}
        layout={{ sectionWrapper: SectionCard }}
        fields={{
          firstName: { label: 'First Name', span: 6, section: 'Personal' },
          lastName: { label: 'Last Name', span: 6, section: 'Personal' },
          email: { section: 'Contact' },
          phone: { section: 'Contact' },
          addressLine1: { label: 'Address', section: 'Address' },
          city: { section: 'Address' },
          country: { section: 'Address' },
          newsletter: { label: 'Email newsletter', section: 'Notifications' },
          smsAlerts: { label: 'SMS alerts', section: 'Notifications' },
        }}
        defaultValues={{ newsletter: false, smsAlerts: false }}
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
