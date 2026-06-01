'use client'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const nav = [
  { label: 'Dashboard', icon: '▦', href: '/dashboard' },
  { label: 'Clients', icon: '◉', href: '/clients' },
  { label: 'Weekly Reviews', icon: '▤', href: '/wbr' },
  { label: 'Recruitment', icon: '⊕', href: '/recruitment' },
  { label: 'POC', icon: '◉', href: '/poc' },
  { label: 'Tasks', icon: '✓', href: '/tasks' },
  { label: 'Communications', icon: '◈', href: '/communications' },
  { label: 'Escalations', icon: '⚠', href: '/issues' },
  { label: 'Health Scorecard', icon: '◎', href: '/scorecard' },
  { label: 'Attendance', icon: '◷', href: '/attendance' },
  { label: 'Performance KPIs', icon: '◈', href: '/kpis' },
  { label: 'Exports', icon: '↓', href: '/exports' },
  { label: 'Attrition', icon: '▲', href: '/attrition' },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
      setDark(true)
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : '')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const getInitials = (email: string) => email?.slice(0, 2).toUpperCase()

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--sidebar-border)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--sidebar-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src="/logo.svg" alt="AMflow" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>AMflow</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Account Management Toolkit</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: 10, flex: 1, overflowY: 'auto' }}>
        {nav.map(item => {
          const active = pathname === item.href
          return (
            <div key={item.label} onClick={() => router.push(item.href)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
                fontSize: 13, marginBottom: 1,
                background: active ? 'var(--accent-light)' : 'transparent',
                color: active ? 'var(--accent-text)' : 'var(--text-secondary)',
                fontWeight: active ? 500 : 400,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--border-light)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 11, opacity: 0.8 }}>{item.icon}</span>
              {item.label}
            </div>
          )
        })}
      </nav>

      {/* Dark mode toggle */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--sidebar-border)' }}>
        <button onClick={toggleTheme}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-card)', cursor: 'pointer', fontSize: 12,
            color: 'var(--text-secondary)',
          }}>
          <span>{dark ? '☀ Light mode' : '☾ Dark mode'}</span>
          <div style={{
            width: 32, height: 18, borderRadius: 9,
            background: dark ? 'var(--accent)' : 'var(--border)',
            position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 3,
              left: dark ? 17 : 3,
              transition: 'left 0.2s',
            }} />
          </div>
        </button>
      </div>

     {/* Watermark */}
      <div style={{ padding: '8px 14px', textAlign: 'center' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Created by Keenan Johannes
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
          keenanjohannes2@gmail.com
        </div>
      </div>

      {/* User */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--accent-text)', flexShrink: 0 }}>
          {getInitials(userEmail)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{userEmail}</div>
          <div style={{ fontSize: 10, color: 'var(--accent)', cursor: 'pointer' }}
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}>
            Sign out
          </div>
        </div>
      </div>
    </aside>
  )
}