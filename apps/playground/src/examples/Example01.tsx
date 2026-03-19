import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
  age: z.number().min(0).max(150).optional(),
  role: z.enum(['user', 'admin', 'editor']),
  subscribe: z.boolean(),
})

const contactForm = createForm(contactSchema)

export default function Example01() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex1'>
      <h2>Example 1: classNames + span</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Uses <code>classNames</code> to apply CSS classes and <code>span</code>{' '}
        for grid column hints.
      </p>
      <style>{`
        .demo-form {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 0.75rem;
        }
        .demo-form > * {
          grid-column: span var(--field-span, 12);
        }
        .demo-field { padding: 0.5rem; background: #f5f5f5; border-radius: 4px; }
        .demo-label { font-weight: 600; display: block; margin-bottom: 2px; }
        .demo-error { color: red; font-size: 0.8rem; }
        .demo-desc { color: #888; font-size: 0.8rem; }
      `}</style>
      <AutoForm
        form={contactForm}
        defaultValues={{ role: 'user', subscribe: false }}
        classNames={{
          form: 'demo-form',
          fieldWrapper: 'demo-field',
          label: 'demo-label',
          error: 'demo-error',
          description: 'demo-desc',
        }}
        fields={{
          name: { span: 6 },
          email: { span: 6 },
          age: { span: 4 },
          role: { span: 4 },
          subscribe: { span: 4 },
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
