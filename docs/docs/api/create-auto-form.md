---
title: createAutoForm()
sidebar_position: 3
---

# `createAutoForm()`

`createAutoForm(config)` creates a pre-configured `<AutoForm>` component that bakes in your design system's components, layout slots, class names, and other defaults. Consumer code only needs to supply `form`, `onSubmit`, and any per-instance overrides.

```ts
import { createAutoForm } from '@uniform-dev/core'

export const MyForm = createAutoForm({
  components: myRegistry,
  layout: { formWrapper: MyCard, submitButton: MyPrimaryButton },
  classNames: { form: 'space-y-6', fieldWrapper: 'flex flex-col gap-1' },
})
```

Then in any feature:

```tsx
<MyForm form={userForm} onSubmit={handleSubmit} />
```

## `AutoFormConfig` options

| Option         | Type                                     | Description                                                                                       |
| -------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `components`   | `ComponentRegistry`                      | Base component registry (merged with `defaultRegistry`)                                           |
| `fieldWrapper` | `React.ComponentType<FieldWrapperProps>` | Default field wrapper component                                                                   |
| `layout`       | `LayoutSlots`                            | Default layout slots (formWrapper, sectionWrapper, submitButton, arrayRowLayout, loadingFallback) |
| `classNames`   | `FormClassNames`                         | Default CSS class names                                                                           |
| `disabled`     | `boolean`                                | When `true`, all fields in every form instance are disabled by default                            |
| `messages`     | `ValidationMessages`                     | Default validation messages                                                                       |
| `coercions`    | `CoercionMap`                            | Default per-field coercions                                                                       |
| `labels`       | `FormLabels`                             | Default UI labels (submit, arrayAdd, arrayRemove, …)                                              |

### Merge behaviour

Per-instance props are **shallow-merged** on top of config defaults. This means any prop you pass at the call site wins. `components` registries are deep-merged using `mergeRegistries`, so you can override one field type without replacing the whole registry.

## Live Example

A design-system form where every text input has a blue left border and every field wrapper has a bottom line:

```jsx live noInline
const inputStyle = {
  borderLeft: '3px solid #4F46E5',
  paddingLeft: 8,
  borderTop: 'none',
  borderRight: 'none',
  borderBottom: '1px solid var(--ifm-color-emphasis-300)',
  outline: 'none',
  width: '100%',
  fontSize: 14,
  padding: '6px 8px',
}

const wrapperStyle = {
  borderBottom: '1px solid var(--ifm-color-emphasis-200)',
  paddingBottom: 12,
  marginBottom: 12,
}

const CustomInput = ({ value, onChange, onBlur, ref, placeholder, error }) => (
  <div style={wrapperStyle}>
    <input
      ref={ref}
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      style={inputStyle}
      placeholder={placeholder}
    />
    {error && (
      <span style={{ color: 'var(--ifm-color-danger)', fontSize: 12 }}>
        {error}
      </span>
    )}
  </div>
)

const BrandedForm = createAutoForm({
  components: { string: CustomInput },
  labels: { submit: 'Save Changes' },
})

const schema = z.object({
  username: z.string().min(3),
  bio: z.string().optional(),
})

const profileForm = createForm(schema)

function App() {
  const [saved, setSaved] = React.useState(false)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 380 }}>
      {saved && <p style={{ color: 'var(--ifm-color-success)' }}>Saved!</p>}
      <BrandedForm
        form={profileForm}
        fields={{
          username: { label: 'Username' },
          bio: { label: 'Short bio' },
        }}
        onSubmit={() => setSaved(true)}
      />
    </div>
  )
}

render(<App />)
```
