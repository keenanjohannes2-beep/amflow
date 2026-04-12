'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setClients(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.industry?.toLowerCase().includes(search.toLowerCase())
  )

  const getInitials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const avatarColors = ['#D6F0E7', '#D6E8FA', '#FDF3D6', '#FBEAE8', '#EDE9FA']
  const textColors = ['#0A5C43', '#1A4A7A', '#7A5200', '#8B2A1E', '#4A3080']

  const statusStyles: any = {
    Active: { bg: 'var(--accent-light)', color: 'var(--accent-text)' },
    Paused: { bg: 'var(--warning-light)', color: 'var(--warning)' },
    Closed: { bg: 'var(--bg-app)', color: 'var(--text-muted)' },
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar userEmail={user?.email || ''} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Clients</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{clients.length} total · {clients.filter(c => c.status === 'Active').length} active</div>
          </div>
          <button className="primary" onClick={() => router.push('/clients/new')}>+ Add Client</button>
        </div>
        <div style={{ padding: 24 }}>
          <input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 16 }} />
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>
              {search ? 'No clients match your search' : 'No clients yet — add your first client'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {filtered.map((client, i) => {
                const s = statusStyles[client.status] || statusStyles.Active
                return (
                  <div key={client.id} onClick={() => router.push(`/clients/${client.id}`)}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColors[i % 5], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: textColors[i % 5], flexShrink: 0 }}>
                        {getInitials(client.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{client.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{client.industry || '—'}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: s.bg, color: s.color, flexShrink: 0 }}>{client.status}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Contact', value: client.contact_person },
                        { label: 'Retainer', value: `R${(client.monthly_retainer || 0).toLocaleString()}` },
                        { label: 'Contract', value: client.contract_type },
                        { label: 'Since', value: client.start_date ? new Date(client.start_date).toLocaleDateString() : '—' },
                      ].map(f => (
                        <div key={f.label}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{f.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.value || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}