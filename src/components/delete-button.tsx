'use client'

import { useFormStatus } from 'react-dom'

export function DeleteButton({
  label = 'Hapus',
  pendingLabel = 'Menghapus...',
  confirmMessage = 'Hapus data ini secara permanen?',
}: {
  label?: string
  pendingLabel?: string
  confirmMessage?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault()
        }
      }}
      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--color-danger)_30%,white)] px-3 py-2 text-sm font-semibold text-[var(--color-danger)] transition hover:bg-[color-mix(in_srgb,var(--color-danger)_8%,white)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}
