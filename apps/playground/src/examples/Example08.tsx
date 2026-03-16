import { useState } from 'react'
import * as z from 'zod/v4'
import { createAutoForm, createForm } from '@uniform/core'
import {
  BrandedInput,
  BrandedFieldWrapper,
  BrandedSubmitButton,
  SubmittedData,
} from './shared'

const kitchenSinkSchema = z.object({
  fullName: z.string().min(1),
  email: z.email(),
  age: z.number().min(0).max(150),
  role: z.enum(['user', 'admin', 'editor']),
  bio: z.string().optional(),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    zip: z.string().min(5),
  }),
  tags: z.array(z.object({ value: z.string().min(1) })),
  hasNotes: z.boolean(),
  notes: z.string().optional(),
})

const kitchenSinkForm = createForm(kitchenSinkSchema).setCondition(
  'notes',
  (values) => values.hasNotes,
)

const KitchenSinkAutoForm = createAutoForm({
  components: {
    string: BrandedInput,
    number: BrandedInput,
  },
  fieldWrapper: BrandedFieldWrapper,
  layout: { submitButton: BrandedSubmitButton },
  classNames: { form: 'demo-form' },
})

export default function Example08() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex8'>
      <h2>Example 8: Kitchen Sink</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Everything combined: <code>createAutoForm</code> factory, sections,
        conditional fields, deep overrides, custom messages, grid layout, nested
        objects, and arrays.
      </p>
      <KitchenSinkAutoForm
        form={kitchenSinkForm}
        defaultValues={{
          role: 'user',
          hasNotes: false,
          tags: [{ value: '' }],
        }}
        fields={{
          fullName: { section: 'Personal', order: 1, span: 6 },
          email: { section: 'Personal', order: 2, span: 6 },
          age: { section: 'Personal', order: 3, span: 6 },
          role: { section: 'Personal', order: 4, span: 6 },
          bio: { section: 'Personal', order: 5 },
          'address.street': { placeholder: '123 Main St' },
          'address.city': { placeholder: 'City / Town' },
          'address.zip': { placeholder: '00000', span: 6 },
          hasNotes: { order: 90 },
          notes: { order: 91 },
        }}
        messages={{
          required: 'This field is required',
          email: { invalid_format: 'Please enter a valid email' },
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
