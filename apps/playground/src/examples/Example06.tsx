import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const registrationSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  age: z.number().min(18).max(120),
  website: z.url().optional(),
})

const registrationForm = createForm(registrationSchema)

export default function Example06() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex6'>
      <h2>Example 6: Custom Validation Messages</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Custom error messages at three levels: global <code>required</code>{' '}
        override, per-field catch-all, and per-field per-error-code.
      </p>
      <AutoForm
        form={registrationForm}
        onSubmit={(values) => setData(values)}
        messages={{
          required: 'This field is required',
          email: {
            invalid_format: 'Please enter a valid email address',
          },
          age: 'Please enter a valid age (18–120)',
        }}
      />
      <SubmittedData data={data} />
    </section>
  )
}
