import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const orderSchema = z.object({
  orderId: z.string().min(1),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    zip: z.string().min(5),
  }),
  items: z.array(z.object({ name: z.string(), qty: z.number() })),
})

const orderForm = createForm(orderSchema)

export default function Example07() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex7'>
      <h2>Example 7: Deep Field Overrides</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Dot-notated <code>fields</code> overrides that target nested object and
        array item fields.
      </p>
      <AutoForm
        form={orderForm}
        defaultValues={{ items: [{ name: '', qty: 0 }] }}
        fields={{
          orderId: { label: 'Order #', placeholder: 'ORD-0001' },
          'address.street': {
            placeholder: '123 Main St',
            description: 'Include apartment number',
          },
          'address.city': { placeholder: 'City / Town' },
          'address.zip': { placeholder: '00000', span: 6 },
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
