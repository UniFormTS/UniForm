---
title: Getting Started
sidebar_position: 1
---

# Getting Started

UniForm is a headless React + Zod V4 form library. Give it a Zod schema and it renders a fully functional, fully typed form — inputs, labels, validation, error messages, sections, conditional fields, arrays, and more. You bring the styles and components.

## Quick Start

[Install the package](./installation), then define a schema and render a form:

```jsx live noInline
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['user', 'admin', 'editor']),
  subscribe: z.boolean(),
})

const myForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 480 }}>
      <AutoForm
        form={myForm}
        defaultValues={{ role: 'user', subscribe: false }}
        onSubmit={(values) => setResult(values)}
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

UniForm introspects the schema, renders the right input for each field type (`z.string()` → text input, `z.enum()` → select, `z.boolean()` → checkbox), validates with Zod on submit, and calls `onSubmit` with fully typed values.

## Key features

- **Schema-driven** — define your form once with Zod V4; inputs, labels, validation, and TypeScript types are derived automatically
- **Headless** — zero CSS, zero opinions; bring your own design system via the component registry and layout slots
- **`createForm()` / `<AutoForm>`** — a type-safe form object lives outside React; attach typed `setOnChange` and `setCondition` handlers per field
- **Per-field overrides** — customise labels, descriptions, ordering, column span, and components via the `fields` prop without changing the schema
- **Conditional fields** — show/hide fields based on form values; hidden fields are unregistered from validation and excluded from submit
- **Array fields** — `z.array(z.object(...))` renders a repeating group with add/remove/reorder controls
- **Async everywhere** — async `onSubmit`, async `setOnChange` handlers, and async `defaultValues` with a loading fallback
- **Programmatic control** — `reset()`, `submit()`, `setValues()`, `getValues()`, `setErrors()`, `focus()` via a `ref`
- **Persistence** — auto-save form values to `sessionStorage` (or any custom storage) with configurable debounce
- **`createAutoForm()`** — bake in your design system defaults once; use everywhere

## Next Steps

New to UniForm? Work through the [tutorial](./tutorial) for a step-by-step walkthrough.

Want to understand how everything fits together? Read [How UniForm Works](./concepts).

Ready to explore specific features? Jump into the [Guides](./guides/custom-components) or the [`<AutoForm>` Props reference](./api/auto-form).
