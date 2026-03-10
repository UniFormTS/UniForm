import { useAutoFormContext } from '../../context/AutoFormContext'

type DefaultSubmitButtonProps = {
  isSubmitting: boolean
}

export function DefaultSubmitButton({
  isSubmitting,
}: DefaultSubmitButtonProps) {
  const { labels } = useAutoFormContext()
  return (
    <button
      type='submit'
      disabled={isSubmitting}
      data-submitting={isSubmitting || undefined}
    >
      {labels.submit ?? 'Submit'}
    </button>
  )
}
