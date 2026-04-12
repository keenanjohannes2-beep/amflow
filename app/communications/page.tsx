'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function CommunicationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [comms, setComms] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('All')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    client_id: '', date: new Date().toISOString().split('T')[0],
    channel: 'Email', summary: '', action_required: false, owner: 'Me', status: 'Open', poc: '',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: c }, { data: cl }] = await Promise.all([
        supabase.from('communications').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('clients').select('id, name').eq('user_id', user.id),
      ])
      setComms(c || [])
      setClients(cl || [])
      setLoading(false)
    }
    init()
  }, [])

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.summary) { setError('Summary is required'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('communications').insert({
      ...form, user_id: user!.id, client_id: form.client_id || null,
    }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else {
      setComms(c => [data, ...c])
      setForm({ client_id: '', date: new Date().toISOString().split('T')[0], channel: 'Email', summary: '', action_required: false, owner: 'Me', status: 'Open', poc: '' })
      setShowForm(false); setSaving(false)
    }
  }

  const toggleStatus = async (comm: any) => {
    const newStatus = comm.status === 'Closed' ? 'Open' : 'Closed'
    await supabase.from('communications').update({ status: newStatus }).eq('id', comm.id)
    setComms(cs => cs.map(c => c.id === comm.id ? { ...c, status: newStatus } : c))
  }

  const filtered = comms.filter(c => {
    if (filter === 'All') return true
    if (filter === 'Open') return c.status === 'Open'
    if (filter === 'Closed') return c.status === 'Closed'
    if (filter === 'Action Required') return c.action_required
    return true
  })

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || '—'

  const channelColors: any = {
    Email: { bg: '#D6E8FA', color: '#1A4A7A' },
    Call: { bg: 'var(--accent-light)', color: 'var(--accent-text)' },
    Zoom: { bg: '#EDE9FA', color: '#4A3080' },
    WhatsApp: { bg: 'var(--accent-light)', color: 'var(--accent-text)' },
    'In Person': { bg: 'var(--warning-light)', color: 'var(--warning)' },
    Slack: { bg: '#EDE9FA', color: '#4A3080' },
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
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Communications</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{comms.filter(c => c.status === 'Open').length} open · {comms.filter(c => c.action_required).length} action required</div>
          </div>
          <button className="primary" onClick={() => setShowForm(true)}>+ Log Communication</button>
        </div>
        <div style={{ padding: 24 }}>
          {showForm && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: 'var(--text-primary)' }}>Log communication</div>
              {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client</label>
                  <select value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                    <option value="">No client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Point of Contact (POC)</label>
                  <input value={form.poc} onChange={e => set('poc', e.target.value)} placeholder="e.g. Jane Smith" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Date</label>
                  <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Channel</label>
                  <select value={form.channel} onChange={e => set('channel', e.target.value)}>
                    {['Email', 'Call', 'Zoom', 'WhatsApp', 'In Person', 'Slack'].map(ch => <option key={ch}>{ch}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Owner</label>
                  <select value={form.owner} onChange={e => set('owner', e.target.value)}>
                    <option>Me</option><option>Client</option><option>Team</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)}>
                    <option>Open</option><option>Closed</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Summary *</label>
                  <textarea value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="What was discussed?" rows={3} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="action_required" checked={form.action_required} onChange={e => set('action_required', e.target.checked)}
                    style={{ width: 14, height: 14, cursor: 'pointer' }} />
                  <label htmlFor="action_required" style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>Action required</label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)}>Cancel</button>
                <button className="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['All', 'Open', 'Closed', 'Action Required'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, borderColor: filter === f ? 'var(--accent)' : 'var(--border)', background: filter === f ? 'var(--accent-light)' : 'var(--bg-card)', color: filter === f ? 'var(--accent-text)' : 'var(--text-secondary)', fontWeight: filter === f ? 500 : 400 }}>
                {f}
              </button>
            ))}
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No communications logged yet</div>
            ) : filtered.map(comm => {
              const ch = channelColors[comm.channel] || { bg: 'var(--bg-app)', color: 'var(--text-muted)' }
              return (
                <div key={comm.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: ch.bg, color: ch.color }}>{comm.channel}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{getClientName(comm.client_id)}</span>
                      {comm.poc && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· POC: {comm.poc}</span>}
                      {comm.action_required && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--warning-light)', color: 'var(--warning)' }}>Action required</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>{comm.summary}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {comm.date ? new Date(comm.date).toLocaleDateString() : '—'} · Owner: {comm.owner}
                    </div>
                  </div>
                  <button onClick={() => toggleStatus(comm)}
                    style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, flexShrink: 0, borderColor: comm.status === 'Closed' ? 'var(--border)' : 'var(--accent)', background: comm.status === 'Closed' ? 'var(--bg-app)' : 'var(--accent-light)', color: comm.status === 'Closed' ? 'var(--text-muted)' : 'var(--accent-text)' }}>
                    {comm.status}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}