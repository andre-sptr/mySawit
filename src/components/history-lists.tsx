import type { Expense, Harvest, Maintenance, Sale } from '@prisma/client'
import { deleteExpense, deleteHarvest, deleteMaintenance, deleteSale } from '@/app/actions'
import { ExpenseEditForm, HarvestEditForm, MaintenanceEditForm, SaleEditForm } from '@/components/forms'
import { ActionForm } from '@/components/action-form'
import { DeleteButton } from '@/components/delete-button'
import { formatCurrency, formatDate, formatKg } from '@/lib/date'

function PhotoLink({ path }: { path: string | null }) {
  if (!path) return null
  return <a href={path} className="text-sm font-semibold text-[var(--color-info)] underline">Lihat foto</a>
}

function Note({ value }: { value: string | null }) {
  if (!value) return null
  return <p className="text-sm text-[var(--color-muted)]">{value}</p>
}

export function HarvestHistory({ items }: { items: Harvest[] }) {
  if (items.length === 0) return <p className="text-sm text-[var(--color-muted)]">Belum ada panenan.</p>
  return items.map((item) => (
    <article key={item.id} className="grid gap-3 rounded-[14px] border border-[var(--color-border)] p-3">
      <div className="flex justify-between gap-3"><strong className="font-ledger font-semibold tabular-nums">{formatKg(item.weightKg)}</strong><span className="text-sm text-[var(--color-muted)]">{formatDate(item.harvestDate)}</span></div>
      <Note value={item.note} />
      <PhotoLink path={item.photoPath} />
      <HarvestEditForm item={item} />
      <ActionForm action={deleteHarvest}>
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="kaplingId" value={item.kaplingId} />
        <DeleteButton />
      </ActionForm>
    </article>
  ))
}

export function MaintenanceHistory({ items }: { items: Maintenance[] }) {
  if (items.length === 0) return <p className="text-sm text-[var(--color-muted)]">Belum ada perawatan.</p>
  return items.map((item) => (
    <article key={item.id} className="grid gap-3 rounded-[14px] border border-[var(--color-border)] p-3">
      <div className="flex justify-between gap-3"><strong>{item.type.toLowerCase()}</strong><span className="text-sm text-[var(--color-muted)]">{formatDate(item.activityDate)}</span></div>
      {item.cost === null ? null : <p className="font-ledger font-semibold tabular-nums">{formatCurrency(item.cost)}</p>}
      <Note value={item.note} />
      <PhotoLink path={item.photoPath} />
      <MaintenanceEditForm item={item} />
      <ActionForm action={deleteMaintenance}>
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="kaplingId" value={item.kaplingId} />
        <DeleteButton />
      </ActionForm>
    </article>
  ))
}

export function ExpenseHistory({ items }: { items: Expense[] }) {
  if (items.length === 0) return <p className="text-sm text-[var(--color-muted)]">Belum ada pengeluaran.</p>
  return items.map((item) => (
    <article key={item.id} className="grid gap-3 rounded-[14px] border border-[var(--color-border)] p-3">
      <div className="flex justify-between gap-3"><strong className="font-ledger font-semibold tabular-nums">{formatCurrency(item.amount)}</strong><span className="text-sm text-[var(--color-muted)]">{formatDate(item.expenseDate)}</span></div>
      <p className="text-sm text-[var(--color-muted)]">{item.category.toLowerCase().replace('_', ' ')}</p>
      <Note value={item.note} />
      <PhotoLink path={item.photoPath} />
      <ExpenseEditForm item={item} />
      <ActionForm action={deleteExpense}>
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="kaplingId" value={item.kaplingId} />
        <DeleteButton />
      </ActionForm>
    </article>
  ))
}

export function SaleHistory({ items }: { items: Sale[] }) {
  if (items.length === 0) return <p className="text-sm text-[var(--color-muted)]">Belum ada hasil panen.</p>
  return items.map((item) => (
    <article key={item.id} className="grid gap-3 rounded-[14px] border border-[var(--color-border)] p-3">
      <div className="flex justify-between gap-3"><strong className="font-ledger font-semibold tabular-nums">{formatCurrency(item.weightKg * item.pricePerKg)}</strong><span className="text-sm text-[var(--color-muted)]">{formatDate(item.saleDate)}</span></div>
      <p className="text-sm text-[var(--color-muted)]">{formatKg(item.weightKg)} x {formatCurrency(item.pricePerKg)}</p>
      <Note value={item.note} />
      <PhotoLink path={item.photoPath} />
      <SaleEditForm item={item} />
      <ActionForm action={deleteSale}>
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="kaplingId" value={item.kaplingId} />
        <DeleteButton />
      </ActionForm>
    </article>
  ))
}
