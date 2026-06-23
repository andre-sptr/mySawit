# Telegram Transaction Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Saat penjualan/pengeluaran/perawatan dicatat (buat/edit/hapus) di mySawit, kirim notifikasi real-time ke sebuah grup Telegram; khusus penjualan, lampirkan PDF invoice.

**Architecture:** Tiga modul `src/lib` baru berlapis tanggung jawab — `telegram.ts` (transport Bot API), `invoice-pdf.ts` (render PDF), `notify.ts` (susun pesan domain) — lalu `src/app/actions.ts` memanggil `notify.ts` setelah penulisan DB sukses. Notifikasi bersifat best-effort: kegagalan/lambatnya Telegram tidak pernah menggagalkan transaksi.

**Tech Stack:** Next.js 16 (server actions), Prisma 7 + SQLite, TypeScript. Dependensi baru: `pdf-lib` (runtime), `vitest` (dev). HTTP & multipart memakai bawaan Node (`fetch`, `FormData`, `Blob`).

## Global Constraints

- Notifikasi **tidak boleh** menggagalkan pencatatan: DB ditulis & sukses lebih dulu; semua fungsi `notify*` aman internal (tidak pernah `throw`).
- Transport `telegram.ts` **no-op diam** bila `TELEGRAM_BOT_TOKEN` atau `TELEGRAM_CHAT_ID` kosong (dev tanpa konfigurasi tetap jalan).
- Timeout panggilan Telegram: **5000 ms** via `AbortController`. Kegagalan → `console.warn`, tidak `throw`.
- Env (server-only, tanpa prefix `NEXT_PUBLIC_`): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID=-5407313134`, `BUSINESS_NAME=Rekapal`.
- **PDF hanya untuk Penjualan.** Pengeluaran & Perawatan = notif teks. Panen = tidak ada notif.
- Edit penjualan → PDF revisi. Hapus penjualan → teks saja (tanpa PDF).
- Nomor invoice: `INV-YYYYMMDD-XXXX` (tanggal Jakarta + 4 char terakhir id, huruf besar). Tanpa ubah skema DB.
- Reuse formatter dari `src/lib/date.ts`: `formatDate`, `formatCurrency`, `formatKg`, `toDateInputValue`. Jangan buat formatter baru.
- Semua copy berbahasa Indonesia. `parse_mode` Telegram = `HTML`; escape input pengguna pada pesan teks.
- Token rahasia hanya di `.env.local` (gitignored). Jangan pernah commit token.

---

### Task 1: Vitest setup + Telegram transport client

**Files:**
- Modify: `package.json` (tambah devDep `vitest` + script `test`)
- Create: `vitest.config.ts`
- Create: `src/lib/telegram.ts`
- Test: `src/lib/telegram.test.ts`

**Interfaces:**
- Consumes: env `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- Produces:
  - `sendMessage(text: string): Promise<void>`
  - `sendDocument(bytes: Uint8Array, filename: string, caption: string): Promise<void>`

- [ ] **Step 1: Install deps & add test script**

Run:
```bash
npm install -D vitest
npm pkg set scripts.test="vitest run"
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Write the failing test** — `src/lib/telegram.test.ts`

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ENV = process.env

describe('telegram transport', () => {
  beforeEach(() => {
    process.env = { ...ENV }
    vi.restoreAllMocks()
  })
  afterEach(() => {
    process.env = ENV
  })

  it('no-op (fetch tidak dipanggil) saat env kosong', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { sendMessage } = await import('@/lib/telegram')
    await sendMessage('halo')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sendMessage POST ke endpoint benar saat env terisi', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }))
    const { sendMessage } = await import('@/lib/telegram')
    await sendMessage('halo dunia')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/botTOKEN/sendMessage')
    expect(JSON.parse(init.body as string)).toMatchObject({
      chat_id: '-100',
      text: 'halo dunia',
      parse_mode: 'HTML',
    })
  })

  it('menelan error jaringan tanpa throw', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))
    const { sendMessage } = await import('@/lib/telegram')
    await expect(sendMessage('x')).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- src/lib/telegram.test.ts`
Expected: FAIL — `Cannot find module '@/lib/telegram'`.

- [ ] **Step 5: Implement `src/lib/telegram.ts`**

```ts
const API_BASE = 'https://api.telegram.org'
const TIMEOUT_MS = 5000

function config() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return null
  return { token, chatId }
}

async function post(token: string, method: string, body: BodyInit, headers?: HeadersInit) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
      method: 'POST',
      body,
      headers,
      signal: controller.signal,
    })
    if (!res.ok) {
      console.warn(`[telegram] ${method} HTTP ${res.status}`)
    }
  } catch (error) {
    console.warn(`[telegram] ${method} gagal:`, error instanceof Error ? error.message : error)
  } finally {
    clearTimeout(timer)
  }
}

export async function sendMessage(text: string): Promise<void> {
  const cfg = config()
  if (!cfg) return
  const body = JSON.stringify({
    chat_id: cfg.chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  })
  await post(cfg.token, 'sendMessage', body, { 'Content-Type': 'application/json' })
}

export async function sendDocument(
  bytes: Uint8Array,
  filename: string,
  caption: string,
): Promise<void> {
  const cfg = config()
  if (!cfg) return
  const form = new FormData()
  form.append('chat_id', cfg.chatId)
  form.append('caption', caption)
  form.append('parse_mode', 'HTML')
  form.append('document', new Blob([bytes], { type: 'application/pdf' }), filename)
  await post(cfg.token, 'sendDocument', form)
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/lib/telegram.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/telegram.ts src/lib/telegram.test.ts
git commit -m "feat: add Telegram transport client with vitest setup"
```

---

### Task 2: Sale invoice PDF generator

**Files:**
- Modify: `package.json` (tambah dep `pdf-lib`)
- Create: `src/lib/invoice-pdf.ts`
- Test: `src/lib/invoice-pdf.test.ts`

**Interfaces:**
- Consumes: `formatCurrency`, `formatDate`, `formatKg` dari `@/lib/date`.
- Produces:
  - `type SaleInvoiceInput = { invoiceNumber: string; businessName: string; kaplingName: string; saleDate: Date; weightKg: number; pricePerKg: number; total: number; note?: string | null; isRevision: boolean }`
  - `buildSaleInvoicePdf(input: SaleInvoiceInput): Promise<Uint8Array>`

- [ ] **Step 1: Install dependency**

Run: `npm install pdf-lib`

- [ ] **Step 2: Write the failing test** — `src/lib/invoice-pdf.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { buildSaleInvoicePdf } from '@/lib/invoice-pdf'

const base = {
  invoiceNumber: 'INV-20260623-ABCD',
  businessName: 'Rekapal',
  kaplingName: 'Kapling 1',
  saleDate: new Date('2026-06-23T03:00:00Z'),
  weightKg: 100,
  pricePerKg: 2500,
  total: 250000,
  note: null as string | null,
  isRevision: false,
}

describe('buildSaleInvoicePdf', () => {
  it('menghasilkan byte PDF valid', async () => {
    const bytes = await buildSaleInvoicePdf(base)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(500)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('varian revisi + catatan + nama non-latin tidak error', async () => {
    const bytes = await buildSaleInvoicePdf({
      ...base,
      isRevision: true,
      note: 'lunas tunai ✅',
      kaplingName: 'Kebun Émas 🌴',
    })
    expect(bytes).toBeInstanceOf(Uint8Array)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/lib/invoice-pdf.test.ts`
Expected: FAIL — `Cannot find module '@/lib/invoice-pdf'`.

- [ ] **Step 4: Implement `src/lib/invoice-pdf.ts`**

```ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatCurrency, formatDate, formatKg } from '@/lib/date'

export type SaleInvoiceInput = {
  invoiceNumber: string
  businessName: string
  kaplingName: string
  saleDate: Date
  weightKg: number
  pricePerKg: number
  total: number
  note?: string | null
  isRevision: boolean
}

// Helvetica (WinAnsi) tidak bisa encode char di luar 0x00–0xFF (mis. emoji).
// Ganti dengan '?' agar render tidak pernah crash.
const winAnsiSafe = (s: string) => s.replace(/[^\x00-\xFF]/g, '?')

export async function buildSaleInvoicePdf(input: SaleInvoiceInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89]) // A4 portrait (points)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()
  const margin = 50
  const dark = rgb(0.1, 0.1, 0.1)
  const muted = rgb(0.4, 0.4, 0.4)
  const valueX = width - margin - 140

  let y = height - margin
  const line = (
    text: string,
    opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {},
  ) => {
    page.drawText(winAnsiSafe(text), {
      x: opts.x ?? margin,
      y,
      size: opts.size ?? 11,
      font: opts.bold ? bold : font,
      color: opts.color ?? dark,
    })
  }
  const gap = (n = 18) => {
    y -= n
  }
  const rule = () =>
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: muted,
    })

  // Header
  line(input.businessName, { size: 20, bold: true })
  gap(26)
  line('INVOICE PENJUALAN', { size: 13, bold: true, color: muted })
  if (input.isRevision) {
    page.drawText('REVISI', {
      x: width - margin - 70,
      y,
      size: 13,
      font: bold,
      color: rgb(0.8, 0.2, 0.2),
    })
  }
  gap(30)

  // Meta
  line(`No. Invoice : ${input.invoiceNumber}`)
  gap()
  line(`Tanggal     : ${formatDate(input.saleDate)}`)
  gap(30)

  // Table
  line('Keterangan', { bold: true })
  line('Jumlah', { bold: true, x: valueX })
  gap(8)
  rule()
  gap(18)
  const row = (label: string, value: string) => {
    line(label)
    line(value, { x: valueX })
    gap()
  }
  row('Kapling', input.kaplingName)
  row('Berat panen', formatKg(input.weightKg))
  row('Harga per kg', formatCurrency(input.pricePerKg))
  gap(6)
  rule()
  gap(22)
  line('TOTAL', { bold: true, size: 13 })
  line(formatCurrency(input.total), { bold: true, size: 13, x: valueX })
  gap(34)

  if (input.note) {
    line('Catatan:', { bold: true })
    gap()
    line(input.note, { color: muted })
  }

  // Footer
  y = margin
  line('Dokumen dibuat otomatis oleh mySawit.', { size: 9, color: muted })

  return doc.save()
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/lib/invoice-pdf.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/invoice-pdf.ts src/lib/invoice-pdf.test.ts
git commit -m "feat: add sale invoice PDF generator"
```

---

### Task 3: Notification domain layer

**Files:**
- Create: `src/lib/notify.ts`
- Test: `src/lib/notify.test.ts`

**Interfaces:**
- Consumes: `sendMessage`, `sendDocument` (`@/lib/telegram`); `buildSaleInvoicePdf`, `SaleInvoiceInput` (`@/lib/invoice-pdf`); `formatCurrency`, `formatDate`, `formatKg`, `toDateInputValue` (`@/lib/date`); `expenseCategories`, `maintenanceTypes` (`@/lib/types`).
- Produces:
  - `type SaleInput = { id: string; kaplingName: string; saleDate: Date; weightKg: number; pricePerKg: number; note?: string | null }`
  - `type ExpenseInput = { kaplingName: string; expenseDate: Date; category: string; amount: number }`
  - `type MaintenanceInput = { kaplingName: string; activityDate: Date; type: string; cost?: number | null }`
  - `buildInvoiceNumber(record: { id: string; saleDate: Date }): string`
  - `notifySaleCreated(sale: SaleInput): Promise<void>`
  - `notifySaleUpdated(sale: SaleInput): Promise<void>`
  - `notifySaleDeleted(sale: SaleInput): Promise<void>`
  - `notifyExpenseCreated(e: ExpenseInput): Promise<void>`
  - `notifyExpenseUpdated(e: ExpenseInput): Promise<void>`
  - `notifyExpenseDeleted(e: ExpenseInput): Promise<void>`
  - `notifyMaintenanceCreated(m: MaintenanceInput): Promise<void>`
  - `notifyMaintenanceUpdated(m: MaintenanceInput): Promise<void>`
  - `notifyMaintenanceDeleted(m: MaintenanceInput): Promise<void>`

- [ ] **Step 1: Write the failing test** — `src/lib/notify.test.ts`

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/telegram', () => ({
  sendMessage: vi.fn(async () => {}),
  sendDocument: vi.fn(async () => {}),
}))
vi.mock('@/lib/invoice-pdf', () => ({
  buildSaleInvoicePdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46])),
}))

import * as telegram from '@/lib/telegram'
import { buildSaleInvoicePdf } from '@/lib/invoice-pdf'
import {
  buildInvoiceNumber,
  notifyExpenseCreated,
  notifyMaintenanceCreated,
  notifySaleCreated,
  notifySaleDeleted,
} from '@/lib/notify'

const sale = {
  id: 'clxyzabcd',
  kaplingName: 'Kapling 1',
  saleDate: new Date('2026-06-23T03:00:00Z'),
  weightKg: 100,
  pricePerKg: 2500,
  note: null,
}

describe('buildInvoiceNumber', () => {
  it('format INV-YYYYMMDD-XXXX dari tanggal Jakarta + 4 char id', () => {
    expect(buildInvoiceNumber(sale)).toBe('INV-20260623-ABCD')
  })
})

describe('notify orchestrators', () => {
  beforeEach(() => vi.clearAllMocks())

  it('penjualan baru → kirim dokumen PDF dengan caption berisi nominal', async () => {
    await notifySaleCreated(sale)
    expect(buildSaleInvoicePdf).toHaveBeenCalledTimes(1)
    expect(telegram.sendDocument).toHaveBeenCalledTimes(1)
    const [, filename, caption] = (telegram.sendDocument as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(filename).toBe('INV-20260623-ABCD.pdf')
    expect(caption).toContain('Penjualan baru')
    expect(caption).toContain('Rp250.000')
  })

  it('penjualan dihapus → kirim teks, bukan dokumen', async () => {
    await notifySaleDeleted(sale)
    expect(telegram.sendMessage).toHaveBeenCalledTimes(1)
    expect(telegram.sendDocument).not.toHaveBeenCalled()
    expect((telegram.sendMessage as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('Penjualan dihapus')
  })

  it('pengeluaran → teks dengan label kategori', async () => {
    await notifyExpenseCreated({
      kaplingName: 'Kapling 1',
      expenseDate: new Date('2026-06-23T03:00:00Z'),
      category: 'GAJI_KARYAWAN',
      amount: 200000,
    })
    const msg = (telegram.sendMessage as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(msg).toContain('Pengeluaran baru')
    expect(msg).toContain('Gaji karyawan')
    expect(msg).toContain('Rp200.000')
  })

  it('perawatan tanpa biaya → teks "tanpa biaya"', async () => {
    await notifyMaintenanceCreated({
      kaplingName: 'Kapling 1',
      activityDate: new Date('2026-06-23T03:00:00Z'),
      type: 'PUPUK',
      cost: null,
    })
    const msg = (telegram.sendMessage as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(msg).toContain('Perawatan baru')
    expect(msg).toContain('Pupuk')
    expect(msg).toContain('tanpa biaya')
  })

  it('tidak pernah throw walau transport gagal', async () => {
    ;(telegram.sendMessage as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'))
    await expect(notifySaleDeleted(sale)).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/notify.test.ts`
Expected: FAIL — `Cannot find module '@/lib/notify'`.

- [ ] **Step 3: Implement `src/lib/notify.ts`**

```ts
import { sendDocument, sendMessage } from '@/lib/telegram'
import { buildSaleInvoicePdf } from '@/lib/invoice-pdf'
import { formatCurrency, formatDate, formatKg, toDateInputValue } from '@/lib/date'
import { expenseCategories, maintenanceTypes } from '@/lib/types'

const BUSINESS_NAME = process.env.BUSINESS_NAME ?? 'Rekapal'

export type SaleInput = {
  id: string
  kaplingName: string
  saleDate: Date
  weightKg: number
  pricePerKg: number
  note?: string | null
}

export type ExpenseInput = {
  kaplingName: string
  expenseDate: Date
  category: string
  amount: number
}

export type MaintenanceInput = {
  kaplingName: string
  activityDate: Date
  type: string
  cost?: number | null
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function categoryLabel(value: string) {
  return expenseCategories.find((c) => c.value === value)?.label ?? value
}

function typeLabel(value: string) {
  return maintenanceTypes.find((t) => t.value === value)?.label ?? value
}

export function buildInvoiceNumber(record: { id: string; saleDate: Date }) {
  const ymd = toDateInputValue(record.saleDate).replaceAll('-', '')
  const suffix = record.id.slice(-4).toUpperCase()
  return `INV-${ymd}-${suffix}`
}

// ── pure message builders ────────────────────────────────────────────
export function saleCaption(sale: SaleInput, invoiceNumber: string, kind: 'baru' | 'revisi') {
  const total = sale.weightKg * sale.pricePerKg
  const name = escapeHtml(sale.kaplingName)
  const head = kind === 'baru' ? '💰 <b>Penjualan baru</b>' : '✏️ <b>Penjualan diperbarui</b>'
  const tail =
    kind === 'baru'
      ? `📄 Invoice ${invoiceNumber} terlampir`
      : `📄 Invoice ${invoiceNumber} (revisi) terlampir`
  return (
    `${head} — ${name}\n` +
    `${formatKg(sale.weightKg)} × ${formatCurrency(sale.pricePerKg)}/kg = <b>${formatCurrency(total)}</b> · ${formatDate(sale.saleDate)}\n` +
    tail
  )
}

export function saleDeletedText(sale: SaleInput) {
  const total = sale.weightKg * sale.pricePerKg
  return `🗑️ <b>Penjualan dihapus</b> — ${escapeHtml(sale.kaplingName)}: ${formatKg(sale.weightKg)} (${formatCurrency(total)}), ${formatDate(sale.saleDate)}`
}

export function expenseTextMessage(e: ExpenseInput, action: 'baru' | 'diperbarui' | 'dihapus') {
  const icon = action === 'dihapus' ? '🗑️' : action === 'diperbarui' ? '✏️' : '🧾'
  const amount = action === 'dihapus' ? formatCurrency(e.amount) : `<b>${formatCurrency(e.amount)}</b>`
  return `${icon} <b>Pengeluaran ${action}</b> (${categoryLabel(e.category)}) — ${escapeHtml(e.kaplingName)}: ${amount} · ${formatDate(e.expenseDate)}`
}

export function maintenanceTextMessage(m: MaintenanceInput, action: 'baru' | 'diperbarui' | 'dihapus') {
  const icon = action === 'dihapus' ? '🗑️' : action === 'diperbarui' ? '✏️' : '🛠️'
  const cost =
    m.cost == null
      ? 'tanpa biaya'
      : action === 'dihapus'
        ? formatCurrency(m.cost)
        : `<b>${formatCurrency(m.cost)}</b>`
  return `${icon} <b>Perawatan ${action}</b> (${typeLabel(m.type)}) — ${escapeHtml(m.kaplingName)}: ${cost} · ${formatDate(m.activityDate)}`
}

// ── safety wrapper: notify must never throw ──────────────────────────
async function guard(label: string, fn: () => Promise<void>) {
  try {
    await fn()
  } catch (error) {
    console.warn(`[notify] ${label} gagal:`, error instanceof Error ? error.message : error)
  }
}

async function sendSaleInvoice(sale: SaleInput, kind: 'baru' | 'revisi') {
  const invoiceNumber = buildInvoiceNumber(sale)
  const total = sale.weightKg * sale.pricePerKg
  const pdf = await buildSaleInvoicePdf({
    invoiceNumber,
    businessName: BUSINESS_NAME,
    kaplingName: sale.kaplingName,
    saleDate: sale.saleDate,
    weightKg: sale.weightKg,
    pricePerKg: sale.pricePerKg,
    total,
    note: sale.note ?? null,
    isRevision: kind === 'revisi',
  })
  await sendDocument(pdf, `${invoiceNumber}.pdf`, saleCaption(sale, invoiceNumber, kind))
}

// ── orchestrators (consumed by server actions) ───────────────────────
export async function notifySaleCreated(sale: SaleInput) {
  await guard('sale.created', () => sendSaleInvoice(sale, 'baru'))
}
export async function notifySaleUpdated(sale: SaleInput) {
  await guard('sale.updated', () => sendSaleInvoice(sale, 'revisi'))
}
export async function notifySaleDeleted(sale: SaleInput) {
  await guard('sale.deleted', () => sendMessage(saleDeletedText(sale)))
}
export async function notifyExpenseCreated(e: ExpenseInput) {
  await guard('expense.created', () => sendMessage(expenseTextMessage(e, 'baru')))
}
export async function notifyExpenseUpdated(e: ExpenseInput) {
  await guard('expense.updated', () => sendMessage(expenseTextMessage(e, 'diperbarui')))
}
export async function notifyExpenseDeleted(e: ExpenseInput) {
  await guard('expense.deleted', () => sendMessage(expenseTextMessage(e, 'dihapus')))
}
export async function notifyMaintenanceCreated(m: MaintenanceInput) {
  await guard('maintenance.created', () => sendMessage(maintenanceTextMessage(m, 'baru')))
}
export async function notifyMaintenanceUpdated(m: MaintenanceInput) {
  await guard('maintenance.updated', () => sendMessage(maintenanceTextMessage(m, 'diperbarui')))
}
export async function notifyMaintenanceDeleted(m: MaintenanceInput) {
  await guard('maintenance.deleted', () => sendMessage(maintenanceTextMessage(m, 'dihapus')))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/notify.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notify.ts src/lib/notify.test.ts
git commit -m "feat: add notification domain layer"
```

---

### Task 4: Wire notifications into server actions

**Files:**
- Modify: `src/app/actions.ts` (9 fungsi: sale/expense/maintenance × create/update/delete)

**Interfaces:**
- Consumes: semua `notify*` dari `@/lib/notify` (Task 3).
- Produces: tidak ada interface baru. Harvest & Kapling actions tidak berubah.

**Catatan teknik:** `create`/`update` memakai `include: { kapling: { select: { name: true } } }` untuk dapat nama kapling tanpa query tambahan. `delete` memakai *read-before-delete* (findUnique + include) agar detail bisa masuk pesan. Pemanggilan `await notify*()` diletakkan setelah tulis DB sukses & sebelum `revalidateKaplingPages`. `notify*` sudah aman internal (tidak pernah throw).

- [ ] **Step 1: Add import**

Tambah setelah baris `import { ExpenseCategory, MaintenanceType } from '@prisma/client'`:

```ts
import {
  notifyExpenseCreated,
  notifyExpenseDeleted,
  notifyExpenseUpdated,
  notifyMaintenanceCreated,
  notifyMaintenanceDeleted,
  notifyMaintenanceUpdated,
  notifySaleCreated,
  notifySaleDeleted,
  notifySaleUpdated,
} from '@/lib/notify'
```

- [ ] **Step 2: Replace `createSale`**

```ts
export async function createSale(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const sale = await prisma.sale.create({
      data: {
        kaplingId,
        saleDate: requiredDate(formData, 'saleDate', 'Tanggal penjualan'),
        weightKg: requiredNumber(formData, 'weightKg', 'Berat jual'),
        pricePerKg: requiredNumber(formData, 'pricePerKg', 'Harga per kg'),
        photoPath,
        note: text(formData, 'note') || null,
      },
      include: { kapling: { select: { name: true } } },
    })
    await notifySaleCreated({
      id: sale.id,
      kaplingName: sale.kapling.name,
      saleDate: sale.saleDate,
      weightKg: sale.weightKg,
      pricePerKg: sale.pricePerKg,
      note: sale.note,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Hasil panen berhasil disimpan.' }
  } catch (error) {
    return actionError(error)
  }
}
```

- [ ] **Step 3: Replace `updateSale`**

```ts
export async function updateSale(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const sale = await prisma.sale.update({
      where: { id: requiredText(formData, 'id', 'Hasil panen') },
      data: {
        saleDate: requiredDate(formData, 'saleDate', 'Tanggal penjualan'),
        weightKg: requiredNumber(formData, 'weightKg', 'Berat jual'),
        pricePerKg: requiredNumber(formData, 'pricePerKg', 'Harga per kg'),
        ...(photoPath ? { photoPath } : {}),
        note: text(formData, 'note') || null,
      },
      include: { kapling: { select: { name: true } } },
    })
    await notifySaleUpdated({
      id: sale.id,
      kaplingName: sale.kapling.name,
      saleDate: sale.saleDate,
      weightKg: sale.weightKg,
      pricePerKg: sale.pricePerKg,
      note: sale.note,
    })
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Hasil panen berhasil diubah.' }
  } catch (error) {
    return actionError(error)
  }
}
```

- [ ] **Step 4: Replace `deleteSale`**

```ts
export async function deleteSale(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const id = requiredText(formData, 'id', 'Hasil panen')
    const existing = await prisma.sale.findUnique({
      where: { id },
      include: { kapling: { select: { name: true } } },
    })
    await prisma.sale.delete({ where: { id } })
    if (existing) {
      await notifySaleDeleted({
        id: existing.id,
        kaplingName: existing.kapling.name,
        saleDate: existing.saleDate,
        weightKg: existing.weightKg,
        pricePerKg: existing.pricePerKg,
        note: existing.note,
      })
    }
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Hasil panen berhasil dihapus.' }
  } catch (error) {
    return actionError(error)
  }
}
```

- [ ] **Step 5: Replace `createExpense`**

```ts
export async function createExpense(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const expense = await prisma.expense.create({
      data: {
        kaplingId,
        expenseDate: requiredDate(formData, 'expenseDate', 'Tanggal pengeluaran'),
        category: requiredText(formData, 'category', 'Kategori') as ExpenseCategory,
        amount: requiredNumber(formData, 'amount', 'Nominal'),
        photoPath,
        note: text(formData, 'note') || null,
      },
      include: { kapling: { select: { name: true } } },
    })
    await notifyExpenseCreated({
      kaplingName: expense.kapling.name,
      expenseDate: expense.expenseDate,
      category: expense.category,
      amount: expense.amount,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Pengeluaran berhasil disimpan.' }
  } catch (error) {
    return actionError(error)
  }
}
```

- [ ] **Step 6: Replace `updateExpense`**

```ts
export async function updateExpense(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const expense = await prisma.expense.update({
      where: { id: requiredText(formData, 'id', 'Pengeluaran') },
      data: {
        expenseDate: requiredDate(formData, 'expenseDate', 'Tanggal pengeluaran'),
        category: requiredText(formData, 'category', 'Kategori') as ExpenseCategory,
        amount: requiredNumber(formData, 'amount', 'Nominal'),
        ...(photoPath ? { photoPath } : {}),
        note: text(formData, 'note') || null,
      },
      include: { kapling: { select: { name: true } } },
    })
    await notifyExpenseUpdated({
      kaplingName: expense.kapling.name,
      expenseDate: expense.expenseDate,
      category: expense.category,
      amount: expense.amount,
    })
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Pengeluaran berhasil diubah.' }
  } catch (error) {
    return actionError(error)
  }
}
```

- [ ] **Step 7: Replace `deleteExpense`**

```ts
export async function deleteExpense(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const id = requiredText(formData, 'id', 'Pengeluaran')
    const existing = await prisma.expense.findUnique({
      where: { id },
      include: { kapling: { select: { name: true } } },
    })
    await prisma.expense.delete({ where: { id } })
    if (existing) {
      await notifyExpenseDeleted({
        kaplingName: existing.kapling.name,
        expenseDate: existing.expenseDate,
        category: existing.category,
        amount: existing.amount,
      })
    }
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Pengeluaran berhasil dihapus.' }
  } catch (error) {
    return actionError(error)
  }
}
```

- [ ] **Step 8: Replace `createMaintenance`**

```ts
export async function createMaintenance(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const maintenance = await prisma.maintenance.create({
      data: {
        kaplingId,
        activityDate: requiredDate(formData, 'activityDate', 'Tanggal perawatan'),
        type: requiredText(formData, 'type', 'Jenis perawatan') as MaintenanceType,
        cost: optionalNumber(formData, 'cost', 'Biaya perawatan'),
        photoPath,
        note: text(formData, 'note') || null,
      },
      include: { kapling: { select: { name: true } } },
    })
    await notifyMaintenanceCreated({
      kaplingName: maintenance.kapling.name,
      activityDate: maintenance.activityDate,
      type: maintenance.type,
      cost: maintenance.cost,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Perawatan berhasil disimpan.' }
  } catch (error) {
    return actionError(error)
  }
}
```

- [ ] **Step 9: Replace `updateMaintenance`**

```ts
export async function updateMaintenance(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const maintenance = await prisma.maintenance.update({
      where: { id: requiredText(formData, 'id', 'Perawatan') },
      data: {
        activityDate: requiredDate(formData, 'activityDate', 'Tanggal perawatan'),
        type: requiredText(formData, 'type', 'Jenis perawatan') as MaintenanceType,
        cost: optionalNumber(formData, 'cost', 'Biaya perawatan'),
        ...(photoPath ? { photoPath } : {}),
        note: text(formData, 'note') || null,
      },
      include: { kapling: { select: { name: true } } },
    })
    await notifyMaintenanceUpdated({
      kaplingName: maintenance.kapling.name,
      activityDate: maintenance.activityDate,
      type: maintenance.type,
      cost: maintenance.cost,
    })
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Perawatan berhasil diubah.' }
  } catch (error) {
    return actionError(error)
  }
}
```

- [ ] **Step 10: Replace `deleteMaintenance`**

```ts
export async function deleteMaintenance(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const id = requiredText(formData, 'id', 'Perawatan')
    const existing = await prisma.maintenance.findUnique({
      where: { id },
      include: { kapling: { select: { name: true } } },
    })
    await prisma.maintenance.delete({ where: { id } })
    if (existing) {
      await notifyMaintenanceDeleted({
        kaplingName: existing.kapling.name,
        activityDate: existing.activityDate,
        type: existing.type,
        cost: existing.cost,
      })
    }
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Perawatan berhasil dihapus.' }
  } catch (error) {
    return actionError(error)
  }
}
```

- [ ] **Step 11: Typecheck + full test suite**

Run: `npx tsc --noEmit -p tsconfig.json && npm test`
Expected: tsc tanpa error; semua test PASS (11 total dari Task 1–3). Jika prisma type belum ter-generate, jalankan `npx prisma generate` lalu ulangi.

- [ ] **Step 12: Commit**

```bash
git add src/app/actions.ts
git commit -m "feat: send Telegram notifications from sale/expense/maintenance actions"
```

---

### Task 5: Environment config + end-to-end smoke test

**Files:**
- Modify: `.gitignore` (kecualikan `.env.example` dari pola `.env*`)
- Create: `.env.example` (committed, tanpa rahasia)
- Create: `.env.local` (LOKAL, gitignored — tidak di-commit)

**Interfaces:** tidak ada kode baru. Tugas ini mengaktifkan & memverifikasi end-to-end dengan bot/grup nyata.

- [ ] **Step 1: Allow `.env.example` to be committed**

Tambah baris berikut di `.gitignore` tepat setelah baris `.env*`:

```
!.env.example
```

- [ ] **Step 2: Create `.env.example`**

```
# Telegram bot — notifikasi transaksi (server-only)
# Dapatkan token dari @BotFather (JANGAN commit token asli).
TELEGRAM_BOT_TOKEN=
# ID grup tujuan (umumnya angka negatif).
TELEGRAM_CHAT_ID=-5407313134
# Nama usaha untuk kop invoice PDF.
BUSINESS_NAME=Rekapal
```

- [ ] **Step 3: Create local `.env.local` (tidak di-commit)**

Isi `TELEGRAM_BOT_TOKEN` dengan token BARU hasil `/revoke` @BotFather:

```
TELEGRAM_BOT_TOKEN=PASTE_TOKEN_BARU_DI_SINI
TELEGRAM_CHAT_ID=-5407313134
BUSINESS_NAME=Rekapal
```

- [ ] **Step 4: Verify `.env.local` tidak ter-track git**

Run: `git status --porcelain .env.local`
Expected: output KOSONG (file diabaikan). `.env.example` boleh muncul sebagai untracked.

- [ ] **Step 5: Persiapan grup Telegram**

Tambahkan bot ke grup tujuan (`-5407313134`), kirim minimal satu pesan di grup agar bot punya akses. (Untuk bot non-admin, matikan privacy mode via @BotFather → /setprivacy → Disable, bila diperlukan agar bot bisa diundang/berfungsi di grup.)

- [ ] **Step 6: Jalankan app & smoke test manual**

Run: `npm run dev`

Lakukan di UI lalu cek grup Telegram:
1. Buat **penjualan** baru → grup menerima **PDF** `INV-…pdf` + caption "Penjualan baru …".
2. Edit penjualan itu → grup menerima PDF baru, caption "Penjualan diperbarui … (revisi)".
3. Hapus penjualan itu → grup menerima **teks** "Penjualan dihapus …" (tanpa PDF).
4. Buat **pengeluaran** → teks "Pengeluaran baru (…) …".
5. Buat **perawatan** tanpa biaya → teks "Perawatan baru (…) … tanpa biaya".
6. Buat **panen** → **tidak ada** notifikasi (benar).

- [ ] **Step 7: Verify ketahanan (tanpa token)**

Sementara kosongkan `TELEGRAM_BOT_TOKEN` di `.env.local`, restart `npm run dev`, buat satu penjualan.
Expected: transaksi tetap tersimpan & tampil di dashboard; tidak ada error/crash (notif di-skip diam). Kembalikan token setelah uji.

- [ ] **Step 8: Commit**

```bash
git add .gitignore .env.example
git commit -m "chore: document Telegram env vars via .env.example"
```

---

## Self-Review (sudah dijalankan saat penyusunan)

**Spec coverage:**
- Pemicu Sale/Expense/Maintenance × create/update/delete → Task 4 (9 fungsi). ✓
- PDF hanya Sale; edit=revisi; hapus=teks → `notify.ts` (Task 3) + Task 4. ✓
- Tujuan satu grup, parse_mode HTML, timeout 5s, no-op tanpa env → Task 1. ✓
- Nomor invoice `INV-YYYYMMDD-XXXX` tanpa ubah skema → `buildInvoiceNumber` (Task 3). ✓
- Reuse formatter `date.ts`, tidak ubah Harvest/Kapling → Task 3 & 4. ✓
- Non-blocking / tidak pernah throw → `guard()` (Task 3) + transport swallow (Task 1). ✓
- Env `BUSINESS_NAME=Rekapal`, `TELEGRAM_CHAT_ID=-5407313134`, token via `.env.local` → Task 5. ✓
- Pengujian unit + smoke → Task 1–3 (otomatis), Task 5 (manual). ✓
- Dependensi hanya `pdf-lib` (+ `vitest` dev) → Task 1 & 2. ✓

**Placeholder scan:** Tidak ada TBD/TODO/“handle edge cases”. Semua step berisi kode lengkap atau perintah konkret. ✓

**Type consistency:** `SaleInput/ExpenseInput/MaintenanceInput` dipakai konsisten antara Task 3 (definisi) & Task 4 (pemanggilan). `buildSaleInvoicePdf`/`SaleInvoiceInput` cocok antara Task 2 & 3. `sendMessage`/`sendDocument` cocok antara Task 1 & 3. ✓
