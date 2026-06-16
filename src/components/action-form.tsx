'use client'

import { useActionState } from 'react'
import type { ActionResult } from '@/lib/types'

type FormAction = (
  prevState: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>

export function ActionForm({
  action,
  children,
  className,
}: {
  action: FormAction
  children: React.ReactNode
  className?: string
}) {
  const [state, formAction] = useActionState(action, null)

  return (
    <form action={formAction} className={className}>
      {children}
      {state ? (
        <p
          aria-live="polite"
          className={`text-sm font-medium ${state.ok ? 'text-[var(--color-primary)]' : 'text-[var(--color-danger)]'}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
