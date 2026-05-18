import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const schema = z.object({
  contacts: z.array(
    z.object({
      name: z.string().min(1, 'Required'),
      role: z.enum(['owner', 'billing', 'technical', 'other']),
      email: z.string().email(),
    }),
  ),
})

const contactForm = createForm(schema)
  // Generic handler — fires for ALL rows
  .setOnChange('contacts.role', (value, ctx) => {
    ctx.setFieldMeta('contacts.email', {
      placeholder:
        value === 'billing' ? 'billing@company.com' : 'email@example.com',
    })
  })
  // Row-specific handler — fires ONLY for row 0 (the primary contact)
  .setOnChange('contacts.0.role', (value, ctx) => {
    ctx.setFieldMeta('contacts.name', {
      label:
        value === 'owner'
          ? 'Owner Name (required for compliance)'
          : 'Full Name',
    })
  })

export default function Example26() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex26'>
      <h2>Example 26: Row-Specific onChange</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        The first row (primary contact) has a <strong>row-specific</strong>{' '}
        handler on <code>contacts.0.role</code> that changes the Name label when
        role is "owner". All rows share a generic handler on{' '}
        <code>contacts.role</code> that updates the email placeholder based on
        role. Only row 0 gets both behaviors.
      </p>
      <AutoForm
        form={contactForm}
        defaultValues={{
          contacts: [
            { name: '', role: 'owner', email: '' },
            { name: '', role: 'billing', email: '' },
            { name: '', role: 'technical', email: '' },
          ],
        }}
        fields={{
          contacts: { label: 'Contact List' },
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
