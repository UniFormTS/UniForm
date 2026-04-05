import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createAutoForm, createForm } from '@uniform-ts/core'
import { es } from '@uniform-ts/core/locales/es'
import { SubmittedData } from './shared'

// ---------------------------------------------------------------------------
// Sub-example A — Typed onChange in UniForm
// ---------------------------------------------------------------------------

const accessSchema = z.object({
  role: z.enum(['admin', 'user', 'viewer']),
  permissions: z.string().optional(),
  notes: z.string().optional(),
})

const accessForm = createForm(accessSchema).setOnChange(
  'role',
  (value, ctx) => {
    ctx.setFieldMeta('permissions', { hidden: value !== 'admin' })
    ctx.setFieldMeta('notes', {
      disabled: value === 'viewer',
      label: value === 'viewer' ? 'Notes (locked for viewers)' : 'Notes',
    })
  },
)

function SubExampleA() {
  const [data, setData] = useState<unknown>(null)
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>A — Typed onChange in UniForm</h3>
      <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
        The <code>onChange</code> callback on <code>UniForm</code> is fully
        typed — try <code>value.</code> in your editor to see autocomplete for{' '}
        <code>'admin' | 'user' | 'viewer'</code>. The <em>Permissions</em> field
        is hidden unless <code>role === 'admin'</code>; <em>Notes</em> is
        disabled for viewers.
      </p>
      <AutoForm
        form={accessForm}
        fields={{
          permissions: { placeholder: 'e.g. read:users write:posts' },
          notes: { placeholder: 'Optional notes for this user' },
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-example B — Spanish-language form via labels prop
// ---------------------------------------------------------------------------

const hobbiesSchema = z.object({
  name: z.string().min(1),
  hobbies: z
    .array(
      z.object({
        hobby: z.string().min(1),
        yearsActive: z.number().min(0),
      }),
    )
    .min(1)
    .max(5),
})

const hobbiesForm = createForm(hobbiesSchema)

function SubExampleB() {
  const [data, setData] = useState<unknown>(null)
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>
        B — Custom labels (i18n simulation: Spanish)
      </h3>
      <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
        All hard-coded button, submit, and aria text is replaced by importing
        the <code>es</code> locale pack from{' '}
        <code>@uniform-ts/core/locales/es</code> and passing it to the{' '}
        <code>labels</code> prop. Only the imported locale is included in the
        bundle.
      </p>
      <AutoForm
        form={hobbiesForm}
        onSubmit={(values) => setData(values)}
        defaultValues={{ name: '', hobbies: [{ hobby: '', yearsActive: 0 }] }}
        fields={{
          hobbies: {
            movable: true,
            duplicable: true,
            collapsible: true,
          },
        }}
        labels={es}
      />
      <SubmittedData data={data} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-example C — Factory-level labels overridden by per-instance prop
// ---------------------------------------------------------------------------

const SaveAutoForm = createAutoForm({
  labels: { submit: 'Save' },
})

const profileSchema = z.object({
  username: z.string().min(1),
  bio: z.string().optional(),
})

const profileForm = createForm(profileSchema)

function SubExampleC() {
  const [dataA, setDataA] = useState<unknown>(null)
  const [dataB, setDataB] = useState<unknown>(null)
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>
        C — Factory labels + per-instance override
      </h3>
      <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
        The factory is configured with{' '}
        <code>
          labels={'{'} submit: 'Save' {'}'}
        </code>
        . The first instance uses the factory default; the second overrides it
        with{' '}
        <code>
          labels={'{'} submit: 'Save & Close' {'}'}
        </code>
        .
      </p>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
            Factory default → <em>Save</em>
          </p>
          <SaveAutoForm
            form={profileForm}
            onSubmit={(values) => setDataA(values)}
          />
          <SubmittedData data={dataA} />
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
            Per-instance override → <em>Save & Close</em>
          </p>
          <SaveAutoForm
            form={profileForm}
            onSubmit={(values) => setDataB(values)}
            labels={{ submit: 'Save & Close' }}
          />
          <SubmittedData data={dataB} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function Example17() {
  return (
    <section id='ex17'>
      <h2>Example 17: Typed Dependencies &amp; Custom Labels</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Phase 8 adds two focused DX improvements:{' '}
        <strong>
          typed <code>onChange</code> callbacks
        </strong>{' '}
        in <code>UniForm</code> (full schema type safety) and a{' '}
        <strong>
          <code>labels</code> prop
        </strong>{' '}
        for replacing every piece of hard-coded UI text without touching layout
        slots.
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        <div
          style={{
            padding: '1.25rem',
            border: '1px solid #e0e0e0',
            borderRadius: 6,
          }}
        >
          <SubExampleA />
        </div>
        <div
          style={{
            padding: '1.25rem',
            border: '1px solid #e0e0e0',
            borderRadius: 6,
          }}
        >
          <SubExampleB />
        </div>
        <div
          style={{
            padding: '1.25rem',
            border: '1px solid #e0e0e0',
            borderRadius: 6,
          }}
        >
          <SubExampleC />
        </div>
      </div>
    </section>
  )
}
