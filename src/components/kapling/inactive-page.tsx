'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { reactivateKapling, deleteKaplingPermanent } from '@/app/actions'
import { useFormStatus } from 'react-dom'

/* ─── Submit Buttons ─── */
function ReactivateBtn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        height: 48,
        borderRadius: 12,
        border: 'none',
        background: 'var(--color-primary)',
        color: '#fff',
        fontSize: 'calc(14px * var(--text-scale, 1))',
        fontWeight: 700,
        cursor: pending ? 'not-allowed' : 'pointer',
        opacity: pending ? 0.6 : 1,
        transition: 'all 0.15s',
        boxShadow: '0 4px 14px rgba(22,163,74,0.35)',
      }}
    >
      {pending ? (
        <>
          <span style={{
            display: 'inline-block', width: 15, height: 15,
            border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
            borderRadius: '50%',
          }} className="animate-spin" />
          Mengaktifkan...
        </>
      ) : (
        <>✅ Aktifkan Kembali</>
      )}
    </button>
  )
}

function DeleteBtn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(
          '⚠️ HAPUS PERMANEN\n\nSemua data kapling ini akan DIHAPUS selamanya:\n• Riwayat panenan\n• Riwayat perawatan\n• Riwayat pengeluaran\n• Riwayat penjualan\n\nTindakan ini TIDAK DAPAT dibatalkan.\n\nApakah Anda yakin?'
        )) e.preventDefault()
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        height: 48,
        borderRadius: 12,
        border: '2px solid var(--color-danger-border)',
        background: 'transparent',
        color: 'var(--color-danger)',
        fontSize: 'calc(14px * var(--text-scale, 1))',
        fontWeight: 700,
        cursor: pending ? 'not-allowed' : 'pointer',
        opacity: pending ? 0.6 : 1,
        transition: 'all 0.15s',
      }}
    >
      {pending ? (
        <>
          <span style={{
            display: 'inline-block', width: 15, height: 15,
            border: '2px solid rgba(220,38,38,0.3)', borderTopColor: '#dc2626',
            borderRadius: '50%',
          }} className="animate-spin" />
          Menghapus...
        </>
      ) : (
        <>🗑️ Hapus Permanen</>
      )}
    </button>
  )
}

/* ─── Main Component ─── */
interface InactiveKaplingPageProps {
  kaplingId: string
  kaplingName: string
  harvestCount: number
  maintenanceCount: number
  expenseCount: number
  saleCount: number
}

export function InactiveKaplingPage({
  kaplingId,
  kaplingName,
  harvestCount,
  maintenanceCount,
  expenseCount,
  saleCount,
}: InactiveKaplingPageProps) {
  const router = useRouter()
  const [reactivateState, reactivateAction] = useActionState(reactivateKapling, null)
  const [deleteState, deleteAction] = useActionState(deleteKaplingPermanent, null)

  const totalRecords = harvestCount + maintenanceCount + expenseCount + saleCount

  // Redirect ke home setelah berhasil dihapus
  useEffect(() => {
    if (deleteState?.ok) {
      router.push('/')
      router.refresh()
    }
  }, [deleteState, router])

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      padding: '40px 20px 60px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
    }}>
      {/* Icon status */}
      <div
        style={{
          width: 80, height: 80,
          borderRadius: '50%',
          background: '#fef2f2',
          border: '3px solid var(--color-danger-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'calc(36px * var(--text-scale, 1))',
        }}
        className="animate-scale-in"
      >
        🚫
      </div>

      {/* Info kapling */}
      <div style={{ textAlign: 'center' }} className="animate-fade-up">
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          borderRadius: 99,
          background: '#f3f4f6',
          color: 'var(--color-muted)',
          fontSize: 'calc(11px * var(--text-scale, 1))',
          fontWeight: 700,
          letterSpacing: '0.06em',
          marginBottom: 10,
        }}>
          ○ NONAKTIF
        </div>
        <h1 style={{
          margin: 0,
          fontSize: 'calc(24px * var(--text-scale, 1))',
          fontWeight: 700,
          color: 'var(--color-ink)',
          lineHeight: 1.2,
        }}>
          {kaplingName}
        </h1>
        <p style={{
          margin: '10px 0 0',
          fontSize: 'calc(13px * var(--text-scale, 1))',
          color: 'var(--color-muted)',
          lineHeight: 1.6,
        }}>
          Kapling ini sedang nonaktif dan tidak dapat menerima aktivitas baru.
          Pilih tindakan yang ingin dilakukan.
        </p>
      </div>

      {/* Data summary */}
      {totalRecords > 0 && (
        <div
          style={{
            width: '100%',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            padding: 16,
          }}
          className="animate-fade-up"
        >
          <p style={{ margin: '0 0 12px', fontSize: 'calc(12px * var(--text-scale, 1))', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Data Tersimpan
          </p>
          <div className="grid-stats-4">
            {[
              { label: 'Panen', count: harvestCount, icon: '🌿', color: '#16a34a' },
              { label: 'Perawatan', count: maintenanceCount, icon: '🔧', color: '#d97706' },
              { label: 'Pengeluaran', count: expenseCount, icon: '💸', color: '#dc2626' },
              { label: 'Penjualan', count: saleCount, icon: '💰', color: '#92400e' },
            ].map(item => (
              <div key={item.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'calc(18px * var(--text-scale, 1))', marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 'calc(16px * var(--text-scale, 1))', fontWeight: 700, color: item.color }}>{item.count}</div>
                <div style={{ fontSize: 'calc(10px * var(--text-scale, 1))', color: 'var(--color-muted)' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success message reactivate */}
      {reactivateState?.ok && (
        <div style={{
          width: '100%', padding: '12px 16px',
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 10, fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 600,
          color: 'var(--color-success)', textAlign: 'center',
        }}>
          ✅ {reactivateState.message}
        </div>
      )}
      {reactivateState && !reactivateState.ok && (
        <div style={{
          width: '100%', padding: '12px 16px',
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 600,
          color: 'var(--color-danger)', textAlign: 'center',
        }}>
          ❌ {reactivateState.message}
        </div>
      )}

      {/* Delete error */}
      {deleteState && !deleteState.ok && (
        <div style={{
          width: '100%', padding: '12px 16px',
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, fontSize: 'calc(13px * var(--text-scale, 1))', fontWeight: 600,
          color: 'var(--color-danger)', textAlign: 'center',
        }}>
          ❌ {deleteState.message}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ width: '100%', display: 'grid', gap: 10 }} className="animate-fade-up">

        {/* Aktifkan Kembali */}
        <form action={reactivateAction}>
          <input type="hidden" name="id" value={kaplingId} />
          <ReactivateBtn />
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          color: 'var(--color-muted)', fontSize: 'calc(11px * var(--text-scale, 1))',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          atau
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        {/* Hapus Permanen */}
        <form action={deleteAction}>
          <input type="hidden" name="id" value={kaplingId} />
          <DeleteBtn />
        </form>

        {totalRecords > 0 && (
          <p style={{
            margin: 0, fontSize: 'calc(11px * var(--text-scale, 1))',
            color: 'var(--color-muted)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            ⚠️ Hapus permanen akan menghapus <strong>{totalRecords} record</strong> data historis secara permanen.
          </p>
        )}
      </div>
    </div>
  )
}
