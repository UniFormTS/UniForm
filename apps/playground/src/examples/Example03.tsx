import { useState } from 'react'
import type { ReactNode } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const teamSchema = z.object({
  teamName: z.string().min(1, 'Team name is required'),
  members: z.array(
    z.object({
      name: z.string().min(1, 'Member name required'),
      email: z.email('Invalid email'),
    }),
  ),
  tags: z.array(z.string()),
})

const teamForm = createForm(teamSchema)

function StyledFormWrapper({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: '#f8f9fa',
        padding: '1.5rem',
        borderRadius: 12,
        border: '1px solid #e0e0e0',
      }}
    >
      {children}
    </div>
  )
}

function StyledSectionWrapper({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <div
      style={{
        background: '#fff',
        padding: '1rem',
        borderRadius: 8,
        marginBottom: '1rem',
        border: '1px solid #e8e8e8',
      }}
    >
      <h3 style={{ margin: '0 0 0.75rem', color: '#333' }}>{title}</h3>
      {children}
    </div>
  )
}

function StyledSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <button
      type='submit'
      disabled={isSubmitting}
      style={{
        background: '#4f46e5',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '0.6rem 1.5rem',
        fontSize: '1rem',
        cursor: isSubmitting ? 'not-allowed' : 'pointer',
        opacity: isSubmitting ? 0.6 : 1,
      }}
    >
      {isSubmitting ? 'Saving...' : 'Save Team'}
    </button>
  )
}

export default function Example03() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex3'>
      <h2>Example 3: Custom Layout Slots</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Custom <code>formWrapper</code>, <code>sectionWrapper</code>, and{' '}
        <code>submitButton</code> via the <code>layout</code> prop.
      </p>
      <AutoForm
        form={teamForm}
        defaultValues={{ members: [{ name: '', email: '' }], tags: [] }}
        fields={{
          teamName: { section: 'Team Info' },
          members: { section: 'Members' },
          tags: { section: 'Tags' },
        }}
        layout={{
          formWrapper: StyledFormWrapper,
          sectionWrapper: StyledSectionWrapper,
          submitButton: StyledSubmitButton,
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
