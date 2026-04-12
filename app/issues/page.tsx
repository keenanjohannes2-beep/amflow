'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function IssuesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [issues, setIssues] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('All')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    client_id: '', date_logged: new Date().toISOString().split('T')[0],
    severity: 'Medium', description: '', resolution: '', status: 'Open',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: i }, { data: c }] = await Promise.all([
        supabase.from('issues').select('*').eq('user_id', user.id).order('date_logged', { ascending: false }),
        supabase.from('clients').select('id, name').eq('user_id', user.id),
      ])
      setIssues(i || [])
      setClients(c || [])
      setLoading(false)
    }
    init()
  }, [])

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.description) { setError('Description is required'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('issues').insert({
      ...form, user_id: user!.id, client_id: form.client_id || null,
    }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else {
      setIssues(i => [data, ...i])
      setForm({ client_id: '', date_logged: new Date().toISOString().split('T')[0], severity: 'Medium', description: '', resolution: '', status: 'Open' })
      setShowForm(false); setSaving(false)
    }
  }

  const updateStatus = async (issue: any, newStatus: string) => {
    await supabase.from('issues').update({ status: newStatus }).eq('id', issue.id)
    setIssues(is => is.map(i => i.id === issue.id ? { ...i, status: newStatus } : i))
  }

  const filtered = issues.filter(i => {
    if (filter === 'All') return true
    if (filter === 'Open') return i.status === 'Open'
    if (filter === 'In Progress') return i.status === 'In Progress'
    if (filter === 'Resolved') return i.status === 'Resolved'
    if (filter === 'High') return i.severity === 'High'
    return true
  })

  const severityStyles: any = {
    High: { bg: 'var(--danger-light)', color: 'var(--danger)' },
    Medium: { bg: 'var(--warning-light)', color: 'var(--warning)' },
    Low: { bg: 'var(--accent-light)', color: 'var(--accent-text)' },
  }

  const statusStyles: any = {
    Open: { bg: 'var(--danger-light)', color: 'var(--danger)' },
    'In Progress': { bg: 'var(--warning-light)', color: 'var(--warning)' },
    Resolved: { bg: 'var(--accent-light)', color: 'var(--accent-text)' },
  }

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || '—'

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
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Escalations & Issues</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{issues.filter(i => i.status === 'Open').length} open · {issues.filter(i => i.severity === 'High').length} high severity</div>
          </div>
          <button className="primary" onClick={() => setShowForm(true)}>+ Log Issue</button>
        </div>
        <div style={{ padding: 24 }}>
          {showForm && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: 'var(--text-primary)' }}>Log issue</div>
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
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Date logged</label>
                  <input type="date" value={form.date_logged} onChange={e => set('date_logged', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Severity</label>
                  <select value={form.severity} onChange={e => set('severity', e.target.value)}>
                    <option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)}>
                    <option>Open</option><option>In Progress</option><option>Resolved</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Description *</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the issue..." rows={3} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Resolution</label>
                  <textarea value={form.resolution} onChange={e => set('resolution', e.target.value)} placeholder="How was it resolved? (optional)" rows={2} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)}>Cancel</button>
                <button className="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save issue'}</button>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['All', 'Open', 'In Progress', 'Resolved', 'High'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, borderColor: filter === f ? 'var(--accent)' : 'var(--border)', background: filter === f ? 'var(--accent-light)' : 'var(--bg-card)', color: filter === f ? 'var(--accent-text)' : 'var(--text-secondary)', fontWeight: filter === f ? 500 : 400 }}>
                {f}
              </button>
            ))}
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No issues logged yet</div>
            ) : filtered.map((issue, idx) => {
              const sev = severityStyles[issue.severity] || severityStyles.Medium
              const stat = statusStyles[issue.status] || statusStyles.Open
              return (
                <div key={issue.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>ISS-{String(issues.length - idx).padStart(3, '0')}</span>
                        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: sev.bg, color: sev.color }}>{issue.severity}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{getClientName(issue.client_id)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>{issue.description}</div>
                      {issue.resolution && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-app)', borderRadius: 6, padding: '6px 10px', marginBottom: 6 }}>
                          Resolution: {issue.resolution}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{issue.date_logged ? new Date(issue.date_logged).toLocaleDateString() : '—'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: stat.bg, color: stat.color }}>{issue.status}</span>
                      <select value={issue.status} onChange={e => updateStatus(issue, e.target.value)}
                        style={{ fontSize: 11, padding: '3px 6px', width: 'auto' }}>
                        <option>Open</option>
                        <option>In Progress</option>
                        <option>Resolved</option>
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}