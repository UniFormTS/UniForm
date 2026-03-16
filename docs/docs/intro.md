---
title: Getting Started
sidebar_position: 1
---

# Getting Started

UniForm is a headless React + Zod V4 form library. Give it a Zod schema and it renders a fully functional, fully typed form — inputs, labels, validation, error messages, sections, conditional fields, arrays, and more. You bring the styles and components.

## Features

- **Schema-driven** — define your form once with Zod V4, get inputs, labels, validation, and types for free
- **Headless** — zero CSS, zero opinions; bring your own design system
- **Full Zod V4 support** — scalars, enums, objects, arrays, optionals, nullables, defaults, pipes/transforms, unions, discriminated unions
- **react-hook-form** under the hood — performant, uncontrolled forms with `zodResolver`
- **`createForm()` / `UniForm`** — type-safe form definition object that lives outside React; attach typed `setOnChange` handlers per field with access to all form methods
- **Per-field `onChange` in `fields` prop** — react to individual field changes inline, with typed values and full form control methods
- **Per-field custom components** — pass any `React.ComponentType<FieldProps>` directly as `meta.component` or register under a custom string key
- **Layout hooks** — `classNames`, `fieldWrapper`, `layout.formWrapper`, `layout.sectionWrapper`, `layout.submitButton`
- **Section grouping** — group fields into named sections via `meta.section`
- **Conditional fields** — show/hide fields based on form values with `meta.condition`
- **Field ordering** — control render order with `meta.order`
- **`createAutoForm()` factory** — bake in your design system defaults once, use everywhere
- **Deep field overrides** — dot-notated `fields` prop for nested object/array overrides
- **Pluggable coercion** — automatic string→number, string→Date with customizable coercion map
- **Custom validation messages** — global, per-field, and per-field-per-error-code message overrides
- **Programmatic control via ref** — `reset()`, `submit()`, `setValues()`, `getValues()`, `setErrors()`, `clearErrors()`, `focus()`, `isSubmitting` via `AutoFormHandle`
- **Form state persistence** — auto-save form values to `localStorage` (or custom storage) with configurable debounce
- **Enhanced array fields** — opt-in row reordering, duplicate, collapsible rows, `minItems`/`maxItems` constraints
- **Value cascade** — `onValuesChange` fires on every change with the full form values
- **i18n / custom labels** — `labels` prop replaces every hard-coded UI string
- **Async `setOnChange`** — handlers can be `async`; fetch dependent data and apply results via `ctx.setFieldMeta`
- **Async `defaultValues`** — pass `() => Promise<Partial<TValues>>` to pre-fill from an API with a loading fallback
- **Tree-shakeable** — ESM + CJS builds via tsup with `sideEffects: false`

## Quick Start

First, [install the package](./installation).

Then define a schema and render a form:

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

UniForm introspects the schema, renders the right input for each field type, validates with Zod on submit, and calls `onSubmit` with fully typed values.

## Next Steps

- Read the [`<AutoForm>` Props reference](./api/auto-form) for the full API
- Learn about [`createForm()`](./api/create-form) for typed field dependencies
- Explore the [Guides](./guides/custom-components) for recipes and advanced patterns
