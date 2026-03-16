# UniForm — Docs Site Prompt

## Context

You are building the official documentation site for **UniForm**, a headless React + Zod V4 form library. The Docusaurus site already exists in `docs/` with the default template scaffolded. Your job is to fully replace the placeholder content with real UniForm documentation and configure live interactive examples throughout.

**Branch:** `feature/docs`  
**Docs directory:** `docs/` (relative to the repo root)  
**Library source:** `packages/core/src/`  
**Playground examples:** `apps/playground/src/examples/` (Example01.tsx – Example21.tsx)

---

## What Already Exists in `docs/`

- `docusaurus.config.ts` — configured with `@docusaurus/theme-live-codeblock` plugin already installed
- `src/pages/index.tsx` — default homepage (needs replacing)
- `docs/intro.md` — default tutorial page (needs replacing with real content)
- `docs/tutorial-basics/` and `docs/tutorial-extras/` — default content (delete entirely)
- `blog/` — default blog (delete entirely)
- `sidebars.ts` — default sidebar (needs rewriting)
- `src/components/HomepageFeatures/` — default feature cards (needs replacing)

---

## Step 0 — Swizzle `ReactLiveScope` for Live Examples

All live code examples on the site use `@docusaurus/theme-live-codeblock`. By default, the scope only contains `React`. You need to inject the `@uniform/core` exports.

**Create `docs/src/theme/ReactLiveScope/index.tsx`:**

```tsx
import React from 'react'
import {
  AutoForm,
  createForm,
  createAutoForm,
  defaultRegistry,
  mergeRegistries,
} from '@uniform/core'
import type {
  FieldProps,
  FieldWrapperProps,
  AutoFormHandle,
  FormMethods,
  SelectOption,
} from '@uniform/core'

const ReactLiveScope = {
  React,
  ...React,
  AutoForm,
  createForm,
  createAutoForm,
  defaultRegistry,
  mergeRegistries,
}

export default ReactLiveScope
```

This file is picked up automatically by Docusaurus's swizzle system.

> **Note:** Since the library is in a workspace, add `"@uniform/core": "workspace:*"` to `docs/package.json`'s `dependencies`. The docs dev server must be started after running `pnpm build` in the root so the library dist is available.

---

## Step 1 — Update `docusaurus.config.ts`

Replace all placeholder values:

```ts
const config: Config = {
  title: 'UniForm',
  tagline:
    'Headless React + Zod V4 forms. Zero styles — bring your own components.',
  favicon: 'img/favicon.ico',
  url: 'https://uniform-docs.example.com',
  baseUrl: '/',
  organizationName: 'your-org',
  projectName: 'generic-zod-form',
  onBrokenLinks: 'throw',
  // ... keep i18n as-is
}
```

Update the navbar:

```ts
navbar: {
  title: 'UniForm',
  items: [
    {
      type: 'docSidebar',
      sidebarId: 'docsSidebar',
      position: 'left',
      label: 'Docs',
    },
    {
      href: 'https://github.com/your-org/generic-zod-form',
      label: 'GitHub',
      position: 'right',
    },
  ],
},
```

Remove the blog from `presets` (set `blog: false`) and remove it from the navbar.

Set the footer:

```ts
footer: {
  style: 'dark',
  links: [
    {
      title: 'Docs',
      items: [
        { label: 'Getting Started', to: '/docs/intro' },
        { label: 'API Reference', to: '/docs/api/auto-form' },
        { label: 'Guides', to: '/docs/guides/custom-components' },
      ],
    },
    {
      title: 'More',
      items: [
        { label: 'GitHub', href: 'https://github.com/your-org/generic-zod-form' },
      ],
    },
  ],
  copyright: `Copyright © ${new Date().getFullYear()} UniForm. Built with Docusaurus.`,
},
```

---

## Step 2 — Rewrite `sidebars.ts`

Replace the entire file:

```ts
import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'installation',
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/auto-form',
        'api/create-form',
        'api/create-auto-form',
        'api/types',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/custom-components',
        'guides/field-overrides',
        'guides/layout',
        'guides/sections',
        'guides/conditional-fields',
        'guides/arrays',
        'guides/validation',
        'guides/persistence',
        'guides/programmatic-control',
        'guides/discriminated-unions',
        'guides/async',
      ],
    },
  ],
}

export default sidebars
```

---

## Step 3 — Replace the Homepage (`src/pages/index.tsx`)

Build a real landing page with:

- A hero section with the tagline and a "Get Started" CTA button (links to `/docs/intro`)
- A feature grid (3 columns) highlighting:
  1. **Schema-driven** — define once with Zod V4, get fully typed inputs, labels, and validation
  2. **Headless** — zero CSS, zero opinions; bring your own design system or Tailwind
  3. **Fully customizable** — swap any component, slot, wrapper, or field at every level
- A short "install in 30 seconds" code block
- A live example section showing the minimal usage (see live example below)

The live example for the homepage — copy this exactly into a ````jsx live noInline` block:

```jsx
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

> **Note:** Live codeblocks that use multi-statement module-level code must use `noInline` mode and end with `render(<App />)`.
> Because Zod is NOT in the swizzled scope, live examples cannot import `z` from `'zod/v4'`. Instead, add `* as z from 'zod/v4'` to the `ReactLiveScope` index so `z` is available globally in all live blocks. Do this in Step 0.

---

## Step 4 — Create the Docs Pages

### `docs/docs/intro.md`

**Title:** Getting Started  
**Sidebar position:** 1

Content:

- One-paragraph introduction to UniForm
- The feature list (from the README — all bullet points)
- A "Quick Start" sub-section with the minimal code example from the README (as a live codeblock — same schema as above but render as a live block)

---

### `docs/docs/installation.md`

**Title:** Installation  
**Sidebar position:** 2

Content:

- npm / pnpm / yarn install commands for `@uniform/core react react-hook-form zod`
- TypeScript note: requires `strict: true` and `moduleResolution: bundler`
- A note that the package ships both ESM and CJS with full `.d.ts` declarations

---

### `docs/docs/api/auto-form.md`

**Title:** `<AutoForm>` Props  
**Sidebar position:** 1

Content:

- Full props reference table (copy from README, all 18 rows)
- Brief prose intro explaining that `<AutoForm>` introspects the schema, renders fields, validates with `zodResolver`, and calls `onSubmit`
- Live example: a kitchen-sink AutoForm showing most props in action

Live example — ````jsx live noInline`:

```jsx
const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(0).max(150).optional(),
  role: z.enum(['viewer', 'editor', 'admin']),
  newsletter: z.boolean(),
})

const myForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 500 }}>
      <AutoForm
        form={myForm}
        defaultValues={{ role: 'viewer', newsletter: false }}
        fields={{
          firstName: { label: 'First Name', span: 6, section: 'Personal' },
          lastName: { label: 'Last Name', span: 6, section: 'Personal' },
          email: {
            section: 'Contact',
            description: 'We will never share your email',
          },
          age: { section: 'Contact' },
          role: { section: 'Preferences' },
          newsletter: {
            label: 'Subscribe to newsletter',
            section: 'Preferences',
          },
        }}
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

---

### `docs/docs/api/create-form.md`

**Title:** `createForm()` / `UniForm`  
**Sidebar position:** 2

Content:

- Explain what `createForm` does and why to use it over a bare schema
- Document `setOnChange(field, handler)` — what the handler receives (`value` typed, `ctx: UniFormContext`)
- Document `setCondition(field, predicate)`
- Document `UniFormContext` — all methods table (`setFieldMeta`, plus all `FormMethods`)
- Live example showing a country → state dependency:

Live example — ````jsx live noInline`:

```jsx
const schema = z.object({
  country: z.enum(['us', 'ca', 'gb']),
  region: z.string().min(1, 'Region is required'),
})

const regionsByCountry = {
  us: ['California', 'New York', 'Texas'],
  ca: ['Ontario', 'Quebec', 'British Columbia'],
  gb: ['England', 'Scotland', 'Wales'],
}

const myForm = createForm(schema).setOnChange('country', (value, ctx) => {
  const opts = (regionsByCountry[value] || []).map((r) => ({
    label: r,
    value: r,
  }))
  ctx.setFieldMeta('region', {
    options: opts,
    label: value === 'us' ? 'State' : value === 'ca' ? 'Province' : 'Region',
  })
  ctx.setValue('region', opts[0]?.value ?? '')
})

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 420 }}>
      <AutoForm
        form={myForm}
        defaultValues={{ country: 'us', region: 'California' }}
        fields={{
          country: { label: 'Country' },
          region: {
            options: regionsByCountry.us.map((r) => ({ label: r, value: r })),
          },
        }}
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

---

### `docs/docs/api/create-auto-form.md`

**Title:** `createAutoForm()` Factory  
**Sidebar position:** 3

Content:

- Explain the factory pattern — bake in design system defaults once, use everywhere
- The `AutoFormConfig` type with all keys and their merge behavior (table from README)
- Prose on when to use factory vs per-instance props
- Live example registering custom components and `fieldWrapper`:

Live example — ````jsx live noInline`:

```jsx
function MyInput(props) {
  return (
    <input
      style={{
        border: '2px solid #6366f1',
        borderRadius: 6,
        padding: '0.4rem 0.6rem',
        width: '100%',
        boxSizing: 'border-box',
        outline: 'none',
      }}
      value={String(props.value ?? '')}
      onChange={(e) => props.onChange(e.target.value)}
      onBlur={props.onBlur}
      ref={props.ref}
      placeholder={props.placeholder}
      disabled={props.disabled}
    />
  )
}

function MyWrapper({ children, field, error }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
        {field.label}
        {field.required && ' *'}
      </label>
      {children}
      {error && (
        <p style={{ color: 'crimson', fontSize: '0.8rem', margin: '2px 0 0' }}>
          {error}
        </p>
      )}
    </div>
  )
}

const PurpleAutoForm = createAutoForm({
  components: { string: MyInput },
  fieldWrapper: MyWrapper,
})

const schema = z.object({
  username: z.string().min(3, 'At least 3 characters'),
  email: z.string().email('Invalid email'),
})

const myForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 420 }}>
      <PurpleAutoForm form={myForm} onSubmit={(v) => setResult(v)} />
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

---

### `docs/docs/api/types.md`

**Title:** TypeScript Types  
**Sidebar position:** 4

Content:

- All types from the README Types section, verbatim code blocks:
  - `FieldMeta`
  - `FieldOverride<TSchema, TValue>`
  - `FieldProps`
  - `FieldWrapperProps`
  - `FormMethods<TValues>`
  - `AutoFormHandle<TSchema>`
  - `LayoutSlots`
  - `ArrayRowLayoutProps`
  - `FieldDependencyResult`
  - `ComponentRegistry`
  - `FormClassNames`
  - `CoercionMap`
  - `ValidationMessages`
  - `PersistStorage`
  - `FormLabels`

No live examples needed on this page — it's a pure reference.

---

### `docs/docs/guides/custom-components.md`

**Title:** Custom Components  
**Sidebar position:** 1

Content:

- How the component resolution chain works (5-step priority list from README)
- Section: **Global via `components` prop** — replace all inputs of a type
- Section: **Direct component on a single field** — `meta.component: MyComponent` or `fields.rating.component`
- Section: **Registry key** — register under a string key, reference by name
- Section: **Array fields with a direct component** — custom multi-value widget note

Live example — Replace all string inputs with a custom styled one and use a direct component for a star rating field. Use ````jsx live noInline`:

```jsx
function TextInput(props) {
  return (
    <input
      style={{
        border: '1px solid #ccc',
        borderRadius: 4,
        padding: '0.4rem 0.6rem',
        width: '100%',
        boxSizing: 'border-box',
      }}
      value={String(props.value ?? '')}
      onChange={(e) => props.onChange(e.target.value)}
      onBlur={props.onBlur}
      ref={props.ref}
      placeholder={props.placeholder}
      disabled={props.disabled}
    />
  )
}

function StarRating(props) {
  const val = Number(props.value) || 0
  return (
    <div>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => props.onChange(n)}
          style={{
            cursor: 'pointer',
            fontSize: '1.5rem',
            color: n <= val ? '#f59e0b' : '#d1d5db',
          }}
        >
          ★
        </span>
      ))}
      {props.error && (
        <p style={{ color: 'crimson', fontSize: '0.8rem' }}>{props.error}</p>
      )}
    </div>
  )
}

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  rating: z.number().min(1, 'Pick a rating').max(5),
  comment: z.string().optional(),
})

const myForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 420 }}>
      <AutoForm
        form={myForm}
        components={{ string: TextInput }}
        fields={{ rating: { component: StarRating, label: 'Your Rating' } }}
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

---

### `docs/docs/guides/field-overrides.md`

**Title:** Field Overrides (`fields` prop)  
**Sidebar position:** 2

Content:

- What `FieldMeta` / `FieldOverride` provides (table of all keys with types and descriptions)
- How dot-notation targeting works for nested object fields and array sub-fields
- `onChange` inline versus `setOnChange` on the `UniForm` — comparison table
- Note on `section`, `order`, `span`, `hidden`, `disabled`, `description`, `placeholder`, `options`, `condition`, `component`

Live example — ````jsx live noInline`:

```jsx
const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  bio: z.string().optional(),
  plan: z.enum(['free', 'pro', 'enterprise']),
  newsletter: z.boolean(),
})
const myForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 500 }}>
      <AutoForm
        form={myForm}
        defaultValues={{ plan: 'free', newsletter: false }}
        fields={{
          firstName: {
            label: 'First Name',
            placeholder: 'Alice',
            span: 6,
            order: 1,
          },
          lastName: {
            label: 'Last Name',
            placeholder: 'Smith',
            span: 6,
            order: 2,
          },
          bio: {
            label: 'Bio',
            description: 'Tell us about yourself',
            order: 3,
          },
          plan: {
            label: 'Subscription Plan',
            order: 4,
            description: 'Choose your plan',
          },
          newsletter: { label: 'Email newsletter', order: 5 },
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

---

### `docs/docs/guides/layout.md`

**Title:** Layout Customization  
**Sidebar position:** 3

Content:

- Explain `LayoutSlots` — `formWrapper`, `sectionWrapper`, `submitButton`, `arrayRowLayout`, `loadingFallback`
- Explain `fieldWrapper` prop
- Explain `classNames` — all keys with what element they target
- CSS custom properties: `--field-span`, `--field-index`, `--field-depth`
- Tip about `loadingFallback` being factory-settable

Live example showing a custom `formWrapper`, custom `submitButton`, and classNames grid:

```jsx
function MyFormWrapper({ children }) {
  return (
    <div
      style={{
        border: '2px solid #6366f1',
        borderRadius: 12,
        padding: '1.5rem',
      }}
    >
      {children}
    </div>
  )
}

function MySubmitButton({ isSubmitting }) {
  return (
    <button
      type='submit'
      disabled={isSubmitting}
      style={{
        background: '#6366f1',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '0.6rem 1.5rem',
        cursor: 'pointer',
        opacity: isSubmitting ? 0.6 : 1,
        marginTop: 8,
      }}
    >
      {isSubmitting ? 'Saving…' : 'Save Profile'}
    </button>
  )
}

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['user', 'admin']),
})

const myForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 480 }}>
      <AutoForm
        form={myForm}
        layout={{ formWrapper: MyFormWrapper, submitButton: MySubmitButton }}
        onSubmit={async (v) => {
          await new Promise((r) => setTimeout(r, 1200))
          setResult(v)
        }}
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

---

### `docs/docs/guides/sections.md`

**Title:** Section Grouping  
**Sidebar position:** 4

Content:

- How `meta.section` groups fields
- How `meta.order` controls render order within and across sections
- Ungrouped fields render first
- Custom `sectionWrapper` to replace the default `<fieldset>`

Live example — ````jsx live noInline`:

```jsx
const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  street: z.string().min(1, 'Required'),
  city: z.string().min(1, 'Required'),
  country: z.enum(['us', 'ca', 'gb']),
})

const myForm = createForm(schema)

function SectionCard({ children, title }) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '1rem',
        marginBottom: '1rem',
      }}
    >
      <h3
        style={{
          margin: '0 0 0.75rem',
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          color: '#6366f1',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 500 }}>
      <AutoForm
        form={myForm}
        fields={{
          firstName: { section: 'Personal', order: 1, span: 6 },
          lastName: { section: 'Personal', order: 2, span: 6 },
          email: { section: 'Contact', order: 3 },
          phone: {
            section: 'Contact',
            order: 4,
            placeholder: '+1 555 000 0000',
          },
          street: { section: 'Address', order: 5 },
          city: { section: 'Address', order: 6, span: 6 },
          country: { section: 'Address', order: 7, span: 6 },
        }}
        layout={{ sectionWrapper: SectionCard }}
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

---

### `docs/docs/guides/conditional-fields.md`

**Title:** Conditional Fields  
**Sidebar position:** 5

Content:

- Two ways to attach conditions: `fields.prop.condition` and `createForm().setCondition()`
- UniForm condition takes precedence over `fields` prop condition
- The condition function receives the full typed form values
- Hidden fields are not validated and not included in `onSubmit` values (they're stripped by Zod)

Live example (based on Example15 in playground) — ````jsx live noInline`:

```jsx
const schema = z.object({
  accountType: z.enum(['personal', 'business']),
  companyName: z.string().optional(),
  vatNumber: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
})

const myForm = createForm(schema)
  .setCondition('companyName', (v) => v.accountType === 'business')
  .setCondition('vatNumber', (v) => v.accountType === 'business')

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 460 }}>
      <p style={{ color: '#666', fontSize: '0.85rem' }}>
        Switch the account type to see fields appear/disappear.
      </p>
      <AutoForm
        form={myForm}
        defaultValues={{ accountType: 'personal' }}
        fields={{
          accountType: { label: 'Account Type' },
          companyName: { label: 'Company Name', placeholder: 'Acme Corp' },
          vatNumber: { label: 'VAT Number', placeholder: 'GB123456789' },
          name: { label: 'Your Name' },
          email: { label: 'Email Address' },
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

---

### `docs/docs/guides/arrays.md`

**Title:** Array Fields  
**Sidebar position:** 6

Content:

- Array fields are rendered with Add/Remove row buttons by default
- `minItems` / `maxItems` from Zod `.min()` / `.max()` are respected
- Opt-in features via `FieldMeta` flags:
  - `movable: true` — add move-up/move-down buttons
  - `duplicable: true` — add a duplicate-row button
  - `collapsible: true` — make object rows collapsible with auto-generated summary
- `classNames.arrayAdd`, `arrayRemove`, `arrayMove`, `arrayDuplicate`, `arrayCollapse`
- `layout.arrayRowLayout` for full button placement control
- Custom multi-value widget via `meta.component` — bypasses default row-by-row UI entirely

Live example (based on Example12 in playground) — ````jsx live noInline`:

```jsx
const schema = z.object({
  teamName: z.string().min(1, 'Required'),
  members: z
    .array(
      z.object({
        name: z.string().min(1, 'Name required'),
        role: z.enum(['dev', 'design', 'pm']),
      }),
    )
    .min(1, 'Add at least one member')
    .max(5),
})

const myForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 500 }}>
      <AutoForm
        form={myForm}
        defaultValues={{ teamName: '', members: [{ name: '', role: 'dev' }] }}
        fields={{
          teamName: { label: 'Team Name' },
          members: {
            label: 'Team Members',
            movable: true,
            duplicable: true,
          },
          'members.name': { label: 'Name', span: 7 },
          'members.role': { label: 'Role', span: 5 },
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

---

### `docs/docs/guides/validation.md`

**Title:** Validation & Error Messages  
**Sidebar position:** 7

Content:

- UniForm uses `zodResolver` — Zod schema drives all validation
- Custom message resolution order: per-field per-code → per-field string → global `required` → Zod's original message
- `messages` prop reference with code examples for each level
- Note: validation runs on submit and on blur by default (react-hook-form defaults)

Live example — ````jsx live noInline`:

```jsx
const schema = z.object({
  username: z.string().min(3, 'min_length').max(20, 'max_length'),
  email: z.string().email('invalid_email'),
  age: z.number().min(18, 'too_young').max(120),
})

const myForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 420 }}>
      <p style={{ color: '#666', fontSize: '0.85rem' }}>
        Submit with empty/invalid fields to see custom error messages.
      </p>
      <AutoForm
        form={myForm}
        messages={{
          required: 'This field cannot be blank',
          username: {
            min_length: 'Username must be at least 3 characters',
            max_length: 'Username is too long',
          },
          email: { invalid_email: 'Please enter a valid email address' },
          age: { too_young: 'You must be at least 18 years old' },
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

---

### `docs/docs/guides/persistence.md`

**Title:** Form Persistence  
**Sidebar position:** 8

Content:

- `persistKey` enables auto-save to `sessionStorage` (default) on every change (debounced)
- `persistDebounce` controls the debounce interval (default `300ms`)
- `persistStorage` accepts any `PersistStorage`-compatible adapter (localStorage, IndexedDB wrapper, etc.)
- Data is restored on mount and cleared on successful submit
- `PersistStorage` interface

Live example (based on Example11) — ````jsx live noInline`:

```jsx
const schema = z.object({
  name: z.string().min(1, 'Required'),
  notes: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
})

const myForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 460 }}>
      <p style={{ color: '#666', fontSize: '0.85rem' }}>
        Type something, then refresh the page — your draft is restored from{' '}
        <code>sessionStorage</code>. Submitting clears the saved draft.
      </p>
      <AutoForm
        form={myForm}
        persistKey='docs-persistence-example'
        persistDebounce={200}
        defaultValues={{ priority: 'medium' }}
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

---

### `docs/docs/guides/programmatic-control.md`

**Title:** Programmatic Control  
**Sidebar position:** 9

Content:

- `ref` prop gives you an `AutoFormHandle`
- Full `AutoFormHandle` type (from README)
- All methods listed: `reset`, `submit`, `setValue`, `setValues`, `getValues`, `watch`, `resetField`, `setError`, `setErrors`, `clearErrors`, `focus`, `isSubmitting`
- `isSubmitting` — `true` while an async `onSubmit` is in flight; useful for external submit buttons and disabled states
- `onValuesChange` — fires on every field change; combine with `ref.setValues()` for imperatively-driven cascade

Live example (based on Example10 + Example19) — ````jsx live noInline`:

```jsx
const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['user', 'admin']),
})

const myForm = createForm(schema)

function App() {
  const formRef = React.useRef(null)
  const [result, setResult] = React.useState(null)

  async function handleSubmit(values) {
    await new Promise((r) => setTimeout(r, 1500))
    setResult(values)
  }

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 480 }}>
      <AutoForm
        ref={formRef}
        form={myForm}
        defaultValues={{ role: 'user' }}
        onSubmit={handleSubmit}
      />
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginTop: '0.75rem',
        }}
      >
        <button
          onClick={() =>
            formRef.current?.setValues({
              name: 'Alice',
              email: 'alice@example.com',
              role: 'admin',
            })
          }
        >
          Pre-fill
        </button>
        <button onClick={() => formRef.current?.reset()}>Reset</button>
        <button
          onClick={() => formRef.current?.setError('email', 'Email taken')}
        >
          Set Error
        </button>
        <button onClick={() => formRef.current?.clearErrors()}>
          Clear Errors
        </button>
        <button onClick={() => formRef.current?.focus('name')}>
          Focus Name
        </button>
        <button
          onClick={() =>
            alert(JSON.stringify(formRef.current?.getValues(), null, 2))
          }
        >
          Get Values
        </button>
      </div>
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

---

### `docs/docs/guides/discriminated-unions.md`

**Title:** Discriminated Unions  
**Sidebar position:** 10

Content:

- Pass `z.discriminatedUnion(...)` directly to `createForm`
- How the discriminator renders as a select
- How variant fields swap when the discriminator changes
- Shared fields across variants persist their values
- Validation runs on the active variant only

Live example (based on Example18) — ````jsx live noInline`:

```jsx
const schema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('email'),
    to: z.string().email('Invalid email'),
    subject: z.string().min(1, 'Subject required'),
  }),
  z.object({
    channel: z.literal('sms'),
    phone: z.string().min(7, 'Invalid phone'),
    body: z.string().min(1).max(160, 'Max 160 chars'),
  }),
  z.object({
    channel: z.literal('webhook'),
    url: z.string().url('Invalid URL'),
    secret: z.string().min(16, 'Min 16 characters'),
  }),
])

const myForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 480 }}>
      <p style={{ color: '#666', fontSize: '0.85rem' }}>
        Change the Channel field to swap variant fields.
      </p>
      <AutoForm
        form={myForm}
        defaultValues={{ channel: 'email' }}
        fields={{ channel: { label: 'Notification Channel' } }}
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

---

### `docs/docs/guides/async.md`

**Title:** Async Features  
**Sidebar position:** 11

Content (three separate sections):

#### Section 1 — Async `onSubmit`

- `onSubmit` can return a `Promise<void>` — the form tracks this via `formState.isSubmitting` (from react-hook-form)
- The submit button receives `isSubmitting: true` while the promise is in flight
- It's also exposed on the `AutoFormHandle` ref as `isSubmitting`
- After the promise resolves, persisted data is cleared automatically

Live example — show a 2-second fake submit with the button showing "Saving…":

```jsx
const schema = z.object({
  title: z.string().min(1, 'Required'),
  body: z.string().min(10, 'At least 10 characters'),
})

const myForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 460 }}>
      <p style={{ color: '#666', fontSize: '0.85rem' }}>
        Submit to see the 2-second async delay — the button disables
        automatically.
      </p>
      <AutoForm
        form={myForm}
        onSubmit={async (v) => {
          await new Promise((r) => setTimeout(r, 2000))
          setResult(v)
        }}
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

#### Section 2 — Async `setOnChange`

- `setOnChange` handlers can be `async` — useful for server-side lookups
- Handlers are fire-and-forget (field value is committed to RHF before async work runs)
- Use `ctx.setFieldMeta` to show disabled/loading state while awaiting

Live example (based on Example20 in playground) — ````jsx live noInline`:

```jsx
const catalog = {
  'E-001': { name: 'Wireless Headphones', stock: 42 },
  'E-002': { name: 'USB-C Hub', stock: 8 },
  'B-001': { name: 'TypeScript Deep Dive', stock: 200 },
}

const schema = z.object({
  sku: z.string().min(1, 'SKU required'),
  productName: z.string().optional(),
  stock: z.number().optional(),
})

const myForm = createForm(schema).setOnChange('sku', async (sku, ctx) => {
  ctx.setFieldMeta('productName', {
    disabled: true,
    placeholder: 'Looking up…',
  })
  await new Promise((r) => setTimeout(r, 800))
  const item = catalog[sku.toUpperCase()]
  if (item) {
    ctx.setValue('productName', item.name)
    ctx.setValue('stock', item.stock)
  } else {
    ctx.setValue('productName', undefined)
    ctx.setValue('stock', undefined)
  }
  ctx.setFieldMeta('productName', { disabled: false, placeholder: '' })
})

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 440 }}>
      <p style={{ color: '#666', fontSize: '0.85rem' }}>
        Try SKUs: <strong>E-001</strong>, <strong>E-002</strong>,{' '}
        <strong>B-001</strong>
      </p>
      <AutoForm
        form={myForm}
        fields={{
          sku: { label: 'Product SKU', placeholder: 'E-001' },
          productName: { label: 'Product Name (auto)', disabled: true },
          stock: { label: 'Stock (auto)', disabled: true },
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

#### Section 3 — Async `defaultValues`

- Pass `() => Promise<Partial<TValues>>` as `defaultValues`
- The form shows `layout.loadingFallback` while the promise is in flight
- On resolve, the form resets with the loaded values
- Set a global loading UI via `createAutoForm({ layout: { loadingFallback: <Spinner /> } })`
- To replay the loading state, change the `key` prop on `<AutoForm>`

Live example (based on Example21 in playground) — ````jsx live noInline`:

```jsx
async function loadProfile() {
  await new Promise((r) => setTimeout(r, 1500))
  return {
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    role: 'editor',
  }
}

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['viewer', 'editor', 'admin']),
})

const myForm = createForm(schema)

function Skeleton() {
  return (
    <div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div
            style={{
              height: 12,
              width: 120,
              background: '#e5e7eb',
              borderRadius: 4,
              marginBottom: 6,
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />
          <div
            style={{
              height: 36,
              background: '#f3f4f6',
              borderRadius: 4,
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  )
}

function App() {
  const [key, setKey] = React.useState(0)
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 460 }}>
      <button
        onClick={() => setKey((k) => k + 1)}
        style={{ marginBottom: '1rem' }}
      >
        ↺ Reload (replay loading)
      </button>
      <AutoForm
        key={key}
        form={myForm}
        defaultValues={loadProfile}
        layout={{ loadingFallback: <Skeleton /> }}
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

---

## Step 5 — Delete Default Content

Delete these paths entirely from `docs/`:

- `docs/tutorial-basics/`
- `docs/tutorial-extras/`
- `blog/` (and disable in `docusaurus.config.ts`)
- `src/components/HomepageFeatures/` (replace with new homepage component)

---

## Step 6 — Live Codeblock Conventions

All live examples follow these rules:

1. Use `\`\`\`jsx live noInline` for multi-component or module-level variable examples
2. End every `noInline` block with `render(<App />)`
3. Never use `import` statements — all APIs are injected via `ReactLiveScope`
4. `React` and all React hooks (`useState`, `useRef`, etc.) are available globally via spread
5. `z` is available as a Zod v4 instance (added to scope in Step 0)
6. `AutoForm`, `createForm`, `createAutoForm` are available globally
7. Never define `createForm(schema)` inside the `App` function — always at module level to keep the reference stable

---

## Step 7 — Page Metadata (Frontmatter)

Every docs page should have:

```md
---
title: Page Title
sidebar_position: N
---
```

Every guide page should additionally have a short 1-2 sentence `description` in the frontmatter for SEO.

---

## Summary of Files to Create / Modify

| File                                      | Action                                            |
| ----------------------------------------- | ------------------------------------------------- |
| `docs/src/theme/ReactLiveScope/index.tsx` | **Create** — inject UniForm + Zod into live scope |
| `docusaurus.config.ts`                    | **Modify** — title, navbar, disable blog, footer  |
| `sidebars.ts`                             | **Replace** — full sidebar config                 |
| `src/pages/index.tsx`                     | **Replace** — hero, feature grid, live example    |
| `docs/intro.md`                           | **Replace** — Getting Started                     |
| `docs/installation.md`                    | **Create**                                        |
| `docs/api/auto-form.md`                   | **Create**                                        |
| `docs/api/create-form.md`                 | **Create**                                        |
| `docs/api/create-auto-form.md`            | **Create**                                        |
| `docs/api/types.md`                       | **Create**                                        |
| `docs/guides/custom-components.md`        | **Create**                                        |
| `docs/guides/field-overrides.md`          | **Create**                                        |
| `docs/guides/layout.md`                   | **Create**                                        |
| `docs/guides/sections.md`                 | **Create**                                        |
| `docs/guides/conditional-fields.md`       | **Create**                                        |
| `docs/guides/arrays.md`                   | **Create**                                        |
| `docs/guides/validation.md`               | **Create**                                        |
| `docs/guides/persistence.md`              | **Create**                                        |
| `docs/guides/programmatic-control.md`     | **Create**                                        |
| `docs/guides/discriminated-unions.md`     | **Create**                                        |
| `docs/guides/async.md`                    | **Create**                                        |
| `docs/tutorial-basics/`                   | **Delete**                                        |
| `docs/tutorial-extras/`                   | **Delete**                                        |
| `blog/`                                   | **Delete**                                        |

All paths are relative to the `docs/` folder.
