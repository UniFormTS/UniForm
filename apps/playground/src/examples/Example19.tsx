import { useRef, useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform/core'
import type { AutoFormHandle } from '@uniform/core'
import { SubmittedData } from './shared'

const registrationSchema = z.object({
  username: z.string().min(3, 'At least 3 characters'),
  email: z.email('Invalid email'),
  plan: z.enum(['free', 'pro', 'enterprise']),
})

const registrationForm = createForm(registrationSchema)

/** Simulates a slow API call */
function saveRegistration(values: z.infer<typeof registrationSchema>) {
  return new Promise<void>((resolve) => setTimeout(resolve, 2000))
}

export default function Example19() {
  const [data, setData] = useState<unknown>(null)
  const formRef = useRef<AutoFormHandle<typeof registrationSchema>>(null)
  const [externalSubmitting, setExternalSubmitting] = useState(false)

  async function handleSubmit(values: z.infer<typeof registrationSchema>) {
    await saveRegistration(values)
    setData(values)
  }

  return (
    <section id='ex19'>
      <h2>Example 19: isSubmitting via Ref</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        The <code>ref</code> handle now exposes <code>isSubmitting</code>.
        Submit the form or use the external button — both show a live submitting
        state read directly from the ref without any extra component state.
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
          disabled={externalSubmitting}
          onClick={async () => {
            setExternalSubmitting(true)
            formRef.current?.submit()
            // Poll isSubmitting until the async submit finishes
            await new Promise<void>((resolve) => {
              const interval = setInterval(() => {
                if (!formRef.current?.isSubmitting) {
                  clearInterval(interval)
                  resolve()
                }
              }, 50)
            })
            setExternalSubmitting(false)
          }}
        >
          {externalSubmitting ? 'Submitting…' : 'External Submit'}
        </button>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.5rem' }}>
        <strong>isSubmitting (from ref):</strong>{' '}
        {formRef.current?.isSubmitting ? '⏳ true' : 'false'}
      </p>

      <SubmittedData data={data} />
    </section>
  )
}
