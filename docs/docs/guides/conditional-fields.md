---
title: Conditional Fields
sidebar_position: 5
description: Show or hide fields based on the current form values using setCondition.
---

# Conditional Fields

Use `form.setCondition(field, predicate)` to show or hide a field based on other form values. The predicate receives a snapshot of the current values and must return `true` (show) or `false` (hide).

```ts
const myForm = createForm(schema)

myForm.setCondition('vatNumber', (values) => values.isBusinessAccount === true)
myForm.setCondition(
  'companyName',
  (values) => values.isBusinessAccount === true,
)
```

## How it works

- When a field is hidden, it is **unregistered** from React Hook Form — its value is removed from the submitted object and its validation rules do not run.
- When a field becomes visible again, it is re-registered and its previous value is restored.
- Conditions are evaluated reactively on every form value change.

## Multiple conditions

You can call `setCondition` multiple times for different fields, or combine multiple checks in one predicate:

```ts
myForm.setCondition(
  'proFeature',
  (values) => values.plan === 'pro' || values.plan === 'enterprise',
)
```

## Live Example

```jsx live noInline
const schema = z.object({
  accountType: z.enum(['personal', 'business']),
  fullName: z.string().min(1, 'Required'),
  // Business-only fields
  companyName: z.string().optional(),
  vatNumber: z.string().optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '200+']).optional(),
  // Personal-only fields
  dateOfBirth: z.string().optional(),
})

const accountForm = createForm(schema)

accountForm.setCondition('companyName', (v) => v.accountType === 'business')
accountForm.setCondition('vatNumber', (v) => v.accountType === 'business')
accountForm.setCondition('companySize', (v) => v.accountType === 'business')
accountForm.setCondition('dateOfBirth', (v) => v.accountType === 'personal')

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 440 }}>
      <AutoForm
        form={accountForm}
        defaultValues={{ accountType: 'personal' }}
        fields={{
          accountType: { label: 'Account Type' },
          fullName: { label: 'Full Name' },
          dateOfBirth: { label: 'Date of Birth' },
          companyName: { label: 'Company Name' },
          vatNumber: { label: 'VAT Number' },
          companySize: { label: 'Company Size' },
        }}
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
