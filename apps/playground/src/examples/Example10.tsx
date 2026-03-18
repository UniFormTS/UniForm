import { useRef, useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import type { AutoFormHandle } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const refSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
})

const refForm = createForm(refSchema)

export default function Example10() {
  const [data, setData] = useState<unknown>(null)
  const formRef = useRef<AutoFormHandle<typeof refSchema>>(null)
  return (
    <section id='ex10'>
      <h2>Example 10: Programmatic Control via Ref</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Use <code>ref</code> to control the form externally — reset, submit, set
        values, set/clear errors, and focus fields.
      </p>
      <AutoForm
        ref={formRef}
        form={refForm}
        defaultValues={{ name: '', email: '' }}
        onSubmit={(values) => setData(values)}
      />
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginTop: '0.75rem',
        }}
      >
        <button onClick={() => formRef.current?.reset()}>Reset</button>
        <button onClick={() => formRef.current?.submit()}>
          Submit (external)
        </button>
        <button
          onClick={() =>
            formRef.current?.setValues({
              name: 'Alice',
              email: 'alice@example.com',
            })
          }
        >
          Pre-fill Values
        </button>
        <button
          onClick={() =>
            alert(JSON.stringify(formRef.current?.getValues(), null, 2))
          }
        >
          Get Values
        </button>
        <button
          onClick={() =>
            formRef.current?.setErrors({
              name: 'Name is taken',
              email: 'Email already registered',
            })
          }
        >
          Set Errors
        </button>
        <button onClick={() => formRef.current?.clearErrors()}>
          Clear Errors
        </button>
        <button onClick={() => formRef.current?.focus('email')}>
          Focus Email
        </button>
      </div>
      <SubmittedData data={data} />
    </section>
  )
}
