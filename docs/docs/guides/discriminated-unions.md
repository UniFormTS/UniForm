---
title: Discriminated Unions
sidebar_position: 10
description: Render forms that switch their fields based on a discriminant using z.discriminatedUnion().
---

# Discriminated Unions

`z.discriminatedUnion(discriminant, variants)` lets you define a schema where the set of required fields depends on the value of a single **discriminant** field. UniForm automatically introspects the active variant and shows only the fields for that variant.

```ts
const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('email'), address: z.string().email() }),
  z.object({ type: z.literal('sms'), phone: z.string().min(10) }),
  z.object({ type: z.literal('push'), deviceToken: z.string() }),
])
```

## How it works

1. UniForm renders the `discriminant` field first.
2. It watches the discriminant value and activates the matching variant.
3. Fields from inactive variants are hidden and unregistered (no validation, excluded from submit).
4. On variant switch, active fields reset to their schema defaults.

## Combining with `setCondition`

You can layer additional `setCondition` calls on top of discriminated union variants:

```ts
const notifyForm = createForm(schema)

// Only show "digest" option during business hours
notifyForm.setCondition(
  'digestInterval',
  (values) => values.type === 'email' && values.emailType === 'digest',
)
```

## Live Example

A notification channel configurator — each channel type reveals its own fields:

```jsx live noInline
const schema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('email'),
    emailAddress: z.string().email('Invalid email'),
    emailFormat: z.enum(['html', 'plain']),
  }),
  z.object({
    channel: z.literal('sms'),
    phoneNumber: z.string().min(10, 'Enter a valid phone number'),
    includeName: z.boolean(),
  }),
  z.object({
    channel: z.literal('webhook'),
    webhookUrl: z.string().url('Must be a valid URL'),
    secret: z.string().optional(),
  }),
])

const notifyForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 440 }}>
      <AutoForm
        form={notifyForm}
        defaultValues={{
          channel: 'email',
          emailFormat: 'html',
          includeName: false,
        }}
        fields={{
          channel: { label: 'Notification channel' },
          emailAddress: { label: 'Email address' },
          emailFormat: { label: 'Format' },
          phoneNumber: { label: 'Phone number' },
          includeName: { label: 'Include recipient name in SMS' },
          webhookUrl: { label: 'Webhook URL' },
          secret: { label: 'Signing secret (optional)' },
        }}
        labels={{ submit: 'Save Channel' }}
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
