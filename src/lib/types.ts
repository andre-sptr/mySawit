export const maintenanceTypes = [
  { value: 'SEMPROT', label: 'Semprot' },
  { value: 'BABAT', label: 'Babat' },
  { value: 'PUPUK', label: 'Pupuk' },
] as const

export const expenseCategories = [
  { value: 'GAJI_KARYAWAN', label: 'Gaji karyawan' },
  { value: 'LAIN_LAIN', label: 'Lain-lain' },
] as const

export type Summary = {
  totalHarvestKg: number
  totalRevenue: number
  totalDirectExpenses: number
  totalMaintenanceExpenses: number
  totalExpenses: number
  netProfit: number
}

export type ActionResult = {
  ok: boolean
  message: string
}
