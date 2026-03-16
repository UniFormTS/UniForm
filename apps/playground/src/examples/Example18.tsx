import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform/core'
import { SubmittedData } from './shared'

const notificationUnion = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('email'),
    recipientEmail: z.email('Must be a valid email'),
    subject: z.string().min(1, 'Subject is required'),
    ccList: z.string().optional(),
  }),
  z.object({
    channel: z.literal('sms'),
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{7,14}$/, 'Must be a valid phone number'),
    messageBody: z.string().min(1).max(160, 'SMS body must be ≤ 160 chars'),
  }),
  z.object({
    channel: z.literal('webhook'),
    endpointUrl: z.url('Must be a valid URL'),
    secret: z.string().min(16, 'Secret must be at least 16 characters'),
    retries: z.number().int().min(0).max(5).optional(),
  }),
])

type NotificationPayload = z.infer<typeof notificationUnion>

const notificationForm = createForm(notificationUnion)

export default function Example18() {
  const [data, setData] = useState<NotificationPayload | null>(null)

  return (
    <section id='ex18'>
      <h2>Example 18: Discriminated Union</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Pass a <code>z.discriminatedUnion</code> directly to{' '}
        <code>createForm</code>. Fields are flattened automatically and{' '}
        <code>condition</code> predicates are derived from the discriminator —
        no manual schema mirroring or <code>.setCondition()</code> calls needed.
      </p>
      <AutoForm
        form={notificationForm}
        defaultValues={{ channel: 'email' }}
        fields={{
          channel: { label: 'Notification Channel' },
          recipientEmail: {
            label: 'Recipient Email',
            placeholder: 'user@example.com',
          },
          subject: { label: 'Subject', placeholder: 'Your subject line…' },
          ccList: {
            label: 'CC (optional)',
            placeholder: 'comma-separated emails',
            description: 'Additional recipients',
          },
          phoneNumber: { label: 'Phone Number', placeholder: '+15550001234' },
          messageBody: {
            label: 'Message Body',
            placeholder: 'Up to 160 characters',
            description: 'SMS messages are limited to 160 characters',
          },
          endpointUrl: { label: 'Endpoint URL', placeholder: 'https://…' },
          secret: {
            label: 'Signing Secret',
            placeholder: 'min 16 characters',
            description: 'Used to sign payloads (HMAC-SHA256)',
          },
          retries: {
            label: 'Retry Attempts',
            description: 'Number of retries on failure (0–5)',
          },
        }}
        onSubmit={(values) => setData(values as NotificationPayload)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
