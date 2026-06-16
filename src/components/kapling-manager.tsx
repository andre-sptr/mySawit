import Link from 'next/link'
import type { Kapling } from '@prisma/client'
import { createKapling, deactivateKapling, updateKapling } from '@/app/actions'
import { ActionButton } from '@/components/action-button'
import { ActionForm } from '@/components/action-form'
import { DeleteButton } from '@/components/delete-button'

export function KaplingManager({ kaplings }: { kaplings: Kapling[] }) {
  return (
    <section className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        {kaplings.map((kapling) => (
          <article
            key={kapling.id}
            className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          >
            <Link
              href={`/kapling/${kapling.id}`}
              className="block break-words font-ledger text-[17px] font-semibold leading-tight text-[var(--color-primary)]"
            >
              {kapling.name}
            </Link>
            <div className="mt-4 grid gap-3">
              <ActionForm action={updateKapling} className="grid gap-2">
                <input type="hidden" name="id" value={kapling.id} />
                <label className="sr-only" htmlFor={`kapling-name-${kapling.id}`}>
                  Nama kapling
                </label>
                <input
                  id={`kapling-name-${kapling.id}`}
                  name="name"
                  defaultValue={kapling.name}
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink)]"
                />
                <ActionButton>Ubah</ActionButton>
              </ActionForm>
              <ActionForm action={deactivateKapling}>
                <input type="hidden" name="id" value={kapling.id} />
                <DeleteButton
                  label="Nonaktifkan"
                  pendingLabel="Menonaktifkan..."
                  confirmMessage="Nonaktifkan kapling ini? Data historis tetap tersimpan."
                />
              </ActionForm>
            </div>
          </article>
        ))}
      </div>

      <ActionForm
        action={createKapling}
        className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      >
        <h2 className="font-ledger text-[17px] font-semibold text-[var(--color-ink)]">Tambah Kapling</h2>
        <label className="sr-only" htmlFor="new-kapling-name">
          Nama kapling baru
        </label>
        <input
          id="new-kapling-name"
          name="name"
          placeholder="Nama kapling"
          className="mt-3 min-h-11 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink)]"
        />
        <div className="mt-3">
          <ActionButton>Tambah</ActionButton>
        </div>
      </ActionForm>
    </section>
  )
}
