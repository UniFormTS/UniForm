import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, UniForm } from '@uniform/core'
import { SubmittedData } from './shared'

const shippingSchema = z.object({
  country: z.enum(['us', 'ca', 'gb']),
  region: z.enum([
    'ca',
    'ny',
    'tx', // US states
    'on',
    'qc',
    'bc', // Canadian provinces
    'eng',
    'sct',
    'wls', // UK regions
  ]),
  expressAvailable: z.boolean(),
  shippingMethod: z.enum(['standard', 'express']),
})

type ShippingSchema = z.infer<typeof shippingSchema>

const optionsByCountry: Record<string, { label: string; value: string }[]> = {
  us: [
    { label: 'California', value: 'ca' },
    { label: 'New York', value: 'ny' },
    { label: 'Texas', value: 'tx' },
  ],
  ca: [
    { label: 'Ontario', value: 'on' },
    { label: 'Quebec', value: 'qc' },
    { label: 'British Columbia', value: 'bc' },
  ],
  gb: [
    { label: 'England', value: 'eng' },
    { label: 'Scotland', value: 'sct' },
    { label: 'Wales', value: 'wls' },
  ],
}

const shippingForm = new UniForm(shippingSchema)
  .onChange('country', (value, ctx) => {
    const opts = optionsByCountry[value] ?? []
    const currentRegion = ctx.getValues().region
    const isCurrentValid = opts.some((o) => o.value === currentRegion)
    const label =
      value === 'us' ? 'State' : value === 'ca' ? 'Province' : 'Region'
    ctx.setFieldMeta('region', { options: opts, label })

    if (!isCurrentValid && opts[0]) {
      ctx.setValue('region', opts[0].value as ShippingSchema['region'])
    }
  })
  .onChange('expressAvailable', (value, ctx) => {
    const available = value === true
    ctx.setFieldMeta('shippingMethod', {
      disabled: !available,
      description: available
        ? 'Choose your delivery speed'
        : 'Express shipping is not available for this order',
    })
    if (!available) {
      ctx.setValue('shippingMethod', 'standard')
    }
  })

export default function Example15() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex15'>
      <h2>Example 15: Field Dependencies</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Use <code>UniForm.onChange</code> to reactively update a field's{' '}
        <strong>options</strong>, <strong>value</strong>,{' '}
        <strong>visibility</strong>, <strong>disabled state</strong>, or{' '}
        <strong>label</strong> based on other field values — without any
        imperative code.
      </p>
      <AutoForm
        form={shippingForm}
        defaultValues={{
          country: 'us',
          region: 'ca',
          expressAvailable: true,
          shippingMethod: 'standard',
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
