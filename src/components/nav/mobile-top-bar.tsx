'use client'

import { useSidebar } from '@/components/nav/sidebar-provider'

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <line x1="4" y1="18" x2="20" y2="18"/>
    </svg>
  )
}

function PalmIconSmall() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21V12M12 12C12 12 8 10 6 6C10 6 12 9 12 12ZM12 12C12 12 16 10 18 6C14 6 12 9 12 12Z" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 21H15" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function MobileTopBar({ title }: { title?: string }) {
  const { toggle } = useSidebar()

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 'var(--topbar-height)',
        padding: '0 16px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        gap: 12,
      }}
      className="mobile-only"
    >
      <button
        onClick={toggle}
        id="hamburger-menu-btn"
        aria-label="Buka menu navigasi"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 9,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-ink)',
          cursor: 'pointer',
          transition: 'background 0.15s',
          flexShrink: 0,
        }}
      >
        <MenuIcon />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <PalmIconSmall />
        <span style={{
          fontWeight: 700,
          fontSize: 'calc(15px * var(--text-scale, 1))',
          color: 'var(--color-ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title || 'mySawit'}
        </span>
      </div>
    </header>
  )
}
