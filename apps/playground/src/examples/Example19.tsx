import { useRef, useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import type { AutoFormHandle } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const registrationSchema = z.object({
  username: z.string().min(3, 'At least 3 characters'),
  email: z.email('Invalid email'),
  plan: z.enum(['free', 'pro', 'enterprise']),
})

const registrationForm = createForm(registrationSchema)

/** Simulates a slow API call */
function saveRegistration(values: z.infer<typeof registrationSchema>) {
  return new Promise<void>((resolve) => setTimeout(resolve, 1200))
}

export default function Example19() {
  const [data, setData] = useState<unknown>(null)
  const formRef = useRef<AutoFormHandle<typeof registrationSchema>>(null)

  async function handleSubmit(values: z.infer<typeof registrationSchema>) {
    await saveRegistration(values)
    setData(values)
  }

  return (
    <section id='ex19'>
      <h2>Example 19: Programmatic Ref Control</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Attach a <code>ref</code> to control the form imperatively — trigger
        submission, fill demo data, or clear values from outside the form tree.
      </p>

      <AutoForm
        ref={formRef}
        form={registrationForm}
        defaultValues={{ plan: 'free' }}
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
          onClick={() => formRef.current?.submit()}
          style={{ padding: '6px 14px', cursor: 'pointer' }}
        >
          External Submit
        </button>
        <button
          onClick={() =>
            formRef.current?.reset({
              username: 'jdoe',
              email: 'jane@example.com',
              plan: 'pro',
            })
          }
          style={{ padding: '6px 14px', cursor: 'pointer' }}
        >
          Fill Demo Data
        </button>
        <button
          onClick={() => formRef.current?.reset()}
          style={{ padding: '6px 14px', cursor: 'pointer', color: '#dc2626' }}
        >
          Clear
        </button>
      </div>

      <SubmittedData data={data} />
    </section>
  )
}
