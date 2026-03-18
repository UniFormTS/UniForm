import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const persistSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
})

const persistForm = createForm(persistSchema)

export default function Example11() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex11'>
      <h2>Example 11: Form State Persistence</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Form values auto-save to <code>localStorage</code> under the given{' '}
        <code>persistKey</code>. Reload the page to see values restored.
        Submitting clears the persisted data.
      </p>
      <AutoForm
        form={persistForm}
        defaultValues={{ priority: 'medium' }}
        persistKey='playground-persist-demo'
        persistDebounce={500}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
