import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .meta({ section: 'Account', order: 1 }),
  street: z.string().meta({ section: 'Address', order: 2 }),
  city: z.string().meta({ section: 'Address', order: 3 }),
  zip: z
    .string()
    .min(5, 'ZIP must be 5 digits')
    .meta({ section: 'Address', order: 4 }),
  newsletter: z.boolean().meta({ section: 'Preferences', order: 5 }),
  notifications: z.boolean().meta({ section: 'Preferences', order: 6 }),
})

const profileForm = createForm(profileSchema)

export default function Example02() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex2'>
      <h2>Example 2: Section Grouping</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Fields grouped into sections via <code>meta.section</code>. Each section
        renders inside a <code>layout.sectionWrapper</code>.
      </p>
      <AutoForm
        form={profileForm}
        defaultValues={{ newsletter: false, notifications: true }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
