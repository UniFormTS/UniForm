import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import { SubmittedData } from './shared'

// Storage shape stays flat — no z.object({ value }) wrapper needed.
const articleSchema = z.object({
  title: z.string().min(1, 'Required'),
  tags: z.array(z.string().min(2, 'At least 2 characters')).min(1).max(5),
  scores: z.array(z.number().min(0).max(10)).max(3),
  audiences: z.array(z.enum(['public', 'members', 'staff'])).max(3),
})

const articleForm = createForm(articleSchema)

export default function Example28() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex28'>
      <h2>Example 28: Arrays of primitives</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        <code>z.array(z.string())</code>, <code>z.array(z.number())</code> and{' '}
        <code>z.array(z.enum([...]))</code> render as repeating rows with one
        input each. Item-level validation reports on the failing row, and{' '}
        <code>itemLabel</code> opts into a per-row label.
      </p>
      <AutoForm
        form={articleForm}
        defaultValues={{
          title: '',
          tags: ['zod'],
          scores: [5],
          audiences: ['public'],
        }}
        fields={{
          tags: { label: 'Tags', movable: true },
          scores: { label: 'Scores', itemLabel: 'Score' },
          audiences: { label: 'Audiences' },
        }}
        labels={{ submit: 'Publish' }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
