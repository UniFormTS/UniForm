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

```tsx
const SectionCard = ({ title, children }) => (
  <div className="section-card">
    <h3 className="section-title">{title}</h3>
    <div className="section-body">{children}</div>
  </div>
)

<AutoForm layout={{ sectionWrapper: SectionCard }} ... />
```

## Live Example

```jsx live noInline
const SectionCard = ({ title, children }) => (
  <div
    style={{
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      marginBottom: '1rem',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        padding: '0.6rem 1rem',
        fontWeight: 600,
        fontSize: 13,
        color: '#374151',
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
            background: '#f5f5f5',
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
