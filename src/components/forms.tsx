import type { Expense, Harvest, Maintenance, Sale } from '@prisma/client'
import {
  createExpense,
  createHarvest,
  createMaintenance,
  createSale,
  updateExpense,
  updateHarvest,
  updateMaintenance,
  updateSale,
} from '@/app/actions'
import { ActionButton } from '@/components/action-button'
import { ActionForm } from '@/components/action-form'
import { toDateInputValue } from '@/lib/date'
import { expenseCategories, maintenanceTypes } from '@/lib/types'

const input =
  'min-h-11 w-full min-w-0 rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]'
const label = 'grid min-w-0 gap-1 text-sm font-medium text-[var(--color-muted)]'
const createGrid = 'grid min-w-0 gap-3 rounded-[14px] bg-[var(--color-primary-soft)] p-3 sm:grid-cols-2'
const editGrid = 'grid min-w-0 gap-3 rounded-[14px] bg-[var(--color-warning-soft)] p-3 sm:grid-cols-2'

export function HarvestForm({ kaplingId }: { kaplingId: string }) {
  return (
    <ActionForm action={createHarvest} className={createGrid}>
      <input type="hidden" name="kaplingId" value={kaplingId} />
      <label className={label}>Tanggal panen<input className={input} type="date" name="harvestDate" required /></label>
      <label className={label}>Berat kg<input className={input} type="number" step="0.01" name="weightKg" required /></label>
      <label className={label}>Foto<input className={input} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
      <label className={`${label} sm:col-span-2`}>Note<textarea className={`${input} py-2`} name="note" rows={2} /></label>
      <div className="sm:col-span-2"><ActionButton>Simpan Panenan</ActionButton></div>
    </ActionForm>
  )
}

export function MaintenanceForm({ kaplingId }: { kaplingId: string }) {
  return (
    <ActionForm action={createMaintenance} className={createGrid}>
      <input type="hidden" name="kaplingId" value={kaplingId} />
      <label className={label}>Tanggal<input className={input} type="date" name="activityDate" required /></label>
      <label className={label}>Jenis<select className={input} name="type">{maintenanceTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className={label}>Biaya<input className={input} type="number" step="1" name="cost" /></label>
      <label className={label}>Foto<input className={input} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
      <label className={`${label} sm:col-span-2`}>Note<textarea className={`${input} py-2`} name="note" rows={2} /></label>
      <div className="sm:col-span-2"><ActionButton>Simpan Perawatan</ActionButton></div>
    </ActionForm>
  )
}

export function ExpenseForm({ kaplingId }: { kaplingId: string }) {
  return (
    <ActionForm action={createExpense} className={createGrid}>
      <input type="hidden" name="kaplingId" value={kaplingId} />
      <label className={label}>Tanggal<input className={input} type="date" name="expenseDate" required /></label>
      <label className={label}>Kategori<select className={input} name="category">{expenseCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className={label}>Nominal<input className={input} type="number" step="1" name="amount" required /></label>
      <label className={label}>Foto<input className={input} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
      <label className={`${label} sm:col-span-2`}>Note<textarea className={`${input} py-2`} name="note" rows={2} /></label>
      <div className="sm:col-span-2"><ActionButton>Simpan Pengeluaran</ActionButton></div>
    </ActionForm>
  )
}

export function SaleForm({ kaplingId }: { kaplingId: string }) {
  return (
    <ActionForm action={createSale} className={createGrid}>
      <input type="hidden" name="kaplingId" value={kaplingId} />
      <label className={label}>Tanggal jual<input className={input} type="date" name="saleDate" required /></label>
      <label className={label}>Berat kg<input className={input} type="number" step="0.01" name="weightKg" required /></label>
      <label className={label}>Harga/kg<input className={input} type="number" step="1" name="pricePerKg" required /></label>
      <label className={label}>Foto<input className={input} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
      <label className={`${label} sm:col-span-2`}>Note<textarea className={`${input} py-2`} name="note" rows={2} /></label>
      <div className="sm:col-span-2"><ActionButton>Simpan Hasil Panen</ActionButton></div>
    </ActionForm>
  )
}

export function HarvestEditForm({ item }: { item: Harvest }) {
  return (
    <ActionForm action={updateHarvest} className={editGrid}>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="kaplingId" value={item.kaplingId} />
      <label className={label}>Tanggal panen<input className={input} type="date" name="harvestDate" defaultValue={toDateInputValue(item.harvestDate)} required /></label>
      <label className={label}>Berat kg<input className={input} type="number" step="0.01" name="weightKg" defaultValue={item.weightKg} required /></label>
      <label className={label}>Ganti foto<input className={input} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
      <label className={`${label} sm:col-span-2`}>Note<textarea className={`${input} py-2`} name="note" rows={2} defaultValue={item.note ?? ''} /></label>
      <div className="sm:col-span-2"><ActionButton>Update Panenan</ActionButton></div>
    </ActionForm>
  )
}

export function MaintenanceEditForm({ item }: { item: Maintenance }) {
  return (
    <ActionForm action={updateMaintenance} className={editGrid}>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="kaplingId" value={item.kaplingId} />
      <label className={label}>Tanggal<input className={input} type="date" name="activityDate" defaultValue={toDateInputValue(item.activityDate)} required /></label>
      <label className={label}>Jenis<select className={input} name="type" defaultValue={item.type}>{maintenanceTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className={label}>Biaya<input className={input} type="number" step="1" name="cost" defaultValue={item.cost ?? ''} /></label>
      <label className={label}>Ganti foto<input className={input} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
      <label className={`${label} sm:col-span-2`}>Note<textarea className={`${input} py-2`} name="note" rows={2} defaultValue={item.note ?? ''} /></label>
      <div className="sm:col-span-2"><ActionButton>Update Perawatan</ActionButton></div>
    </ActionForm>
  )
}

export function ExpenseEditForm({ item }: { item: Expense }) {
  return (
    <ActionForm action={updateExpense} className={editGrid}>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="kaplingId" value={item.kaplingId} />
      <label className={label}>Tanggal<input className={input} type="date" name="expenseDate" defaultValue={toDateInputValue(item.expenseDate)} required /></label>
      <label className={label}>Kategori<select className={input} name="category" defaultValue={item.category}>{expenseCategories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className={label}>Nominal<input className={input} type="number" step="1" name="amount" defaultValue={item.amount} required /></label>
      <label className={label}>Ganti foto<input className={input} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
      <label className={`${label} sm:col-span-2`}>Note<textarea className={`${input} py-2`} name="note" rows={2} defaultValue={item.note ?? ''} /></label>
      <div className="sm:col-span-2"><ActionButton>Update Pengeluaran</ActionButton></div>
    </ActionForm>
  )
}

export function SaleEditForm({ item }: { item: Sale }) {
  return (
    <ActionForm action={updateSale} className={editGrid}>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="kaplingId" value={item.kaplingId} />
      <label className={label}>Tanggal jual<input className={input} type="date" name="saleDate" defaultValue={toDateInputValue(item.saleDate)} required /></label>
      <label className={label}>Berat kg<input className={input} type="number" step="0.01" name="weightKg" defaultValue={item.weightKg} required /></label>
      <label className={label}>Harga/kg<input className={input} type="number" step="1" name="pricePerKg" defaultValue={item.pricePerKg} required /></label>
      <label className={label}>Ganti foto<input className={input} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
      <label className={`${label} sm:col-span-2`}>Note<textarea className={`${input} py-2`} name="note" rows={2} defaultValue={item.note ?? ''} /></label>
      <div className="sm:col-span-2"><ActionButton>Update Hasil Panen</ActionButton></div>
    </ActionForm>
  )
}
