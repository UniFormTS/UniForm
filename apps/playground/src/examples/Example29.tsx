import { useState } from 'react'
import * as z from 'zod/v4'
import {
  AutoForm,
  createForm,
  useUniForm,
  useFormValue,
  UniFormProvider,
  Field,
} from '@uniform-ts/core'
import { SubmittedData } from './shared'

const ticketSchema = z.object({
  title: z.string().min(1, 'Required'),
  priority: z.enum(['low', 'normal', 'urgent']),
  assignee: z.string().min(1, 'Required'),
  notes: z.string().optional(),
})

const ticketForm = createForm(ticketSchema)

// Page chrome rendered *outside* <AutoForm> — no layout.formWrapper smuggling.
function PageHeader({ onSave, busy }: { onSave: () => void; busy: boolean }) {
  // Typed with zero casts — inferred from the schema.
  const title = useFormValue(ticketForm, 'title')
  const priority = useFormValue(ticketForm, 'priority')

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        background: '#0f172a',
        color: '#f8fafc',
        borderRadius: 6,
      }}
    >
      <div>
        <strong>{title || 'Untitled ticket'}</strong>
        <span style={{ marginInlineStart: 8, opacity: 0.7, fontSize: 13 }}>
          {priority}
        </span>
      </div>
      <button
        type='button'
        disabled={busy}
        onClick={onSave}
        style={{
          padding: '6px 14px',
          borderRadius: 4,
          border: 'none',
          background: busy ? '#475569' : '#6366f1',
          color: '#fff',
          cursor: busy ? 'wait' : 'pointer',
        }}
      >
        {busy ? 'Saving…' : 'Save ticket'}
      </button>
    </header>
  )
}

export default function Example29() {
  const [data, setData] = useState<unknown>(null)

  const form = useUniForm(ticketForm, {
    defaultValues: { title: '', priority: 'normal', assignee: '', notes: '' },
    onSubmit: (values) => setData(values),
  })

  return (
    <section id='ex29'>
      <h2>
        Example 29: Headless mode with <code>useUniForm</code>
      </h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        The form store lives above <code>&lt;AutoForm&gt;</code>. The header
        reads state with <code>useFormValue</code> and submits with{' '}
        <code>form.submit()</code>, and the notes field is rendered on its own
        with <code>&lt;Field&gt;</code> — all outside the form element.
      </p>

      <UniFormProvider form={form}>
        <PageHeader onSave={form.submit} busy={form.isSubmitting} />

        <AutoForm
          form={form}
          fields={{ notes: { hidden: true } }}
          layout={{ submitButton: null }}
          onSubmit={(values) => setData(values)}
        />

        <div style={{ marginTop: '1rem' }}>
          <Field name='notes' label='Internal notes' />
        </div>
      </UniFormProvider>

      <SubmittedData data={data} />
    </section>
  )
}
