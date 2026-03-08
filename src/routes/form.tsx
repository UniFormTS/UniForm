import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Field } from '@base-ui/react/field'
import { Send, User, Mail, MessageSquare } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

type FormValues = z.infer<typeof formSchema>

export const Route = createFileRoute('/form')({
  component: FormPage,
})

function FormPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = (data: FormValues) => {
    console.log('Form submitted:', data)
    reset()
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Contact Form</h1>

      {isSubmitSuccessful && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
            color: '#166534',
            marginBottom: '1.5rem',
          }}
        >
          Form submitted successfully!
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Name field */}
        <Field.Root invalid={!!errors.name}>
          <Field.Label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem', fontWeight: 500 }}>
            <User size={16} />
            Name
          </Field.Label>
          <input
            {...register('name')}
            placeholder="Your name"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: `1px solid ${errors.name ? '#f87171' : '#cbd5e1'}`,
              borderRadius: '6px',
              fontSize: '1rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {errors.name && (
            <Field.Error style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.name.message}
            </Field.Error>
          )}
        </Field.Root>

        {/* Email field */}
        <Field.Root invalid={!!errors.email}>
          <Field.Label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem', fontWeight: 500 }}>
            <Mail size={16} />
            Email
          </Field.Label>
          <input
            {...register('email')}
            type="email"
            placeholder="your@email.com"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: `1px solid ${errors.email ? '#f87171' : '#cbd5e1'}`,
              borderRadius: '6px',
              fontSize: '1rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {errors.email && (
            <Field.Error style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.email.message}
            </Field.Error>
          )}
        </Field.Root>

        {/* Message field */}
        <Field.Root invalid={!!errors.message}>
          <Field.Label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem', fontWeight: 500 }}>
            <MessageSquare size={16} />
            Message
          </Field.Label>
          <textarea
            {...register('message')}
            rows={4}
            placeholder="Your message..."
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: `1px solid ${errors.message ? '#f87171' : '#cbd5e1'}`,
              borderRadius: '6px',
              fontSize: '1rem',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          {errors.message && (
            <Field.Error style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.message.message}
            </Field.Error>
          )}
        </Field.Root>

        <button
          type="submit"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Send size={16} />
          Submit
        </button>
      </form>
    </div>
  )
}
