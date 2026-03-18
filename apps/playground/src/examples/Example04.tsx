import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import type { FieldWrapperProps } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const signupSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
})

const signupForm = createForm(signupSchema)

function CardFieldWrapper({ children, field, error }: FieldWrapperProps) {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        marginBottom: '0.75rem',
        background: error ? '#fff5f5' : '#fafafa',
      }}
    >
      <label
        htmlFor={field.name}
        style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}
      >
        {field.label}
        {field.required && <span style={{ color: 'red' }}> *</span>}
      </label>
      {children}
      {field.meta.description && (
        <p style={{ fontSize: '0.8rem', color: '#666', margin: '4px 0 0' }}>
          {String(field.meta.description)}
        </p>
      )}
      {error && (
        <span role='alert' style={{ color: 'red', fontSize: '0.8rem' }}>
          {error}
        </span>
      )}
    </div>
  )
}

export default function Example04() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex4'>
      <h2>Example 4: Custom fieldWrapper</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        A custom <code>fieldWrapper</code> renders each field in a card-style
        container with error highlighting.
      </p>
      <AutoForm
        form={signupForm}
        fieldWrapper={CardFieldWrapper}
        fields={{
          username: { description: 'Choose a unique username' },
          password: { description: 'Minimum 8 characters' },
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
