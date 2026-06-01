'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function AttritionPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [attritionLogs, setAttritionLogs] = useState<any[]>([])
  const [wbrEntries, setWbrEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1)
    return d.toISOString().split('T')[0]
  })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    client_id: '', employee_name: '', reason: '', type: 'flagged' as 'voluntary' | 'involuntary' | 'flagged', notes: '', resolved: false,
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: c }, { data: a }, { data: w }] = await Promise.all([
        supabase.from('clients').select('id, name').eq('user_id', user.id),
        supabase.from('attrition_logs').select('*, clients(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('wbr').select('id, client_id, flags_risks, utilization_gaps, challenges, week_start').eq('user_id', user.id).order('week_start', { ascending: false }).limit(50),
      ])
      setClients(c || [])
      setAttritionLogs(a || [])
      setWbrEntries(w || [])
      setLoading(false)
    }
    init()
  }, [router])

  const loadEntry = (entry: any) => {
    setForm({
      client_id: entry.client_id || '',
      employee_name: entry.employee_name || '',
      reason: entry.reason || '',
      type: entry.type || 'flagged',
      notes: entry.notes || '',
      resolved: entry.resolved || false,
    })
    setSelectedClient(entry.client_id || '')
    setEditingId(entry.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.employee_name) { setError('Employee name required'); return }
    setSaving(true); setError('')
    const payload = { ...form, user_id: user!.id, week_start: weekStart, client_id: selectedClient || null }
    if (editingId) {
      const { error } = await supabase.from('attrition_logs').update(payload).eq('id', editingId)
      if (error) { setError(error.message) }
      else { setAttritionLogs(a => a.map(r => r.id === editingId ? { ...r, ...payload } : r)) }
    } else {
      const { data, error } = await supabase.from('attrition_logs').insert(payload).select().single()
      if (error) { setError(error.message) }
      else { setAttritionLogs(a => [data, ...a]) }
    }
    setSaving(false); setShowForm(false); setEditingId(null)
    setForm({ client_id: '', employee_name: '', reason: '', type: 'flagged', notes: '', resolved: false })
  }

  const deleteEntry = async (id: string) => {
    await supabase.from('attrition_logs').delete().eq('id', id)
    setAttritionLogs(a => a.filter(r => r.id !== id))
  }

  const pushToWbr = async (entry: any) => {
    const latestWbr = wbrEntries.find(w => w.client_id === entry.client_id)
    if (!latestWbr) { setError(`No WBR draft found for ${clients.find(c => c.id === entry.client_id)?.name || 'this client'}`); return }
    const note = `${entry.employee_name} - ${entry.type} (${entry.reason || 'no reason'})`
    const existing = latestWbr.flags_risks || ''
    const updated = existing ? existing + '\n' + note : note
    const { error } = await supabase.from('wbr').update({ flags_risks: updated }).eq('id', latestWbr.id)
    if (error) { setError(error.message) }
    else {
      setWbrEntries(w => w.map(x => x.id === latestWbr.id ? { ...x, flags_risks: updated } : x))
      setError('')
    }
  }

  const getClientName = (entry: any) => entry.clients?.name || clients.find(c => c.id === entry.client_id)?.name || '—'

  const unresolvedFlags = wbrEntries.filter(w => w.flags_risks && w.flags_risks.trim())
  const flaggedAttrition = attritionLogs.filter(a => !a.resolved)

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
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Attrition & Flags</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              {flaggedAttrition.length} unresolved · {attritionLogs.length} total
            </div>
          </div>
          <button className="primary" onClick={() => { setShowForm(true); setEditingId(null); setForm({ client_id: '', employee_name: '', reason: '', type: 'flagged', notes: '', resolved: false }) }}>+ New Flag</button>
        </div>

        <div style={{ padding: 24 }}>
          {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}

          {showForm && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {editingId ? 'Edit' : 'New'} Attrition Flag
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowForm(false); setEditingId(null) }}>Cancel</button>
                  <button className="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Save'}</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client</label>
                  <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Week starting</label>
                  <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Employee name</label>
                  <input value={form.employee_name} onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} placeholder="Employee name" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                    <option value="flagged">Flagged (at risk)</option>
                    <option value="voluntary">Voluntary Resignation</option>
                    <option value="involuntary">Involuntary Termination</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Reason</label>
                  <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'system-ui, sans-serif', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'system-ui, sans-serif', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="resolved" checked={form.resolved} onChange={e => setForm(f => ({ ...f, resolved: e.target.checked }))}
                    style={{ width: 14, height: 14, cursor: 'pointer' }} />
                  <label htmlFor="resolved" style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>Resolved</label>
                </div>
              </div>
            </div>
          )}

          {/* WBR Flags overview */}
          {unresolvedFlags.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', marginBottom: 8 }}>
                Unresolved flags from WBRs ({unresolvedFlags.length})
              </div>
              {unresolvedFlags.map(w => (
                <div key={w.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 14px', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {clients.find(c => c.id === w.client_id)?.name || '—'} · Week of {w.week_start ? new Date(w.week_start).toLocaleDateString() : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{w.flags_risks}</div>
                </div>
              ))}
            </div>
          )}

          {/* Attrition Logs list */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={() => setSelectedClient('')}
              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, borderColor: !selectedClient ? 'var(--accent)' : 'var(--border)', background: !selectedClient ? 'var(--accent-light)' : 'var(--bg-card)', color: !selectedClient ? 'var(--accent-text)' : 'var(--text-secondary)', fontWeight: !selectedClient ? 500 : 400 }}>
              All clients
            </button>
            {clients.map(c => (
              <button key={c.id} onClick={() => setSelectedClient(c.id)}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, borderColor: selectedClient === c.id ? 'var(--accent)' : 'var(--border)', background: selectedClient === c.id ? 'var(--accent-light)' : 'var(--bg-card)', color: selectedClient === c.id ? 'var(--accent-text)' : 'var(--text-secondary)', fontWeight: selectedClient === c.id ? 500 : 400 }}>
                {c.name}
              </button>
            ))}
          </div>

          {(selectedClient ? attritionLogs.filter(a => a.client_id === selectedClient) : attritionLogs).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>No attrition logs yet</div>
          ) : (selectedClient ? attritionLogs.filter(a => a.client_id === selectedClient) : attritionLogs).map(entry => {
            const typeColors: any = {
              flagged: { bg: '#FFF3D6', color: '#8A6100' },
              voluntary: { bg: '#FCE4E4', color: '#B83A3A' },
              involuntary: { bg: '#FCE4E4', color: '#B83A3A' },
            }
            const tc = typeColors[entry.type] || { bg: 'var(--bg-app)', color: 'var(--text-muted)' }
            const typeLabel = entry.type === 'flagged' ? 'Flagged' : entry.type === 'voluntary' ? 'Voluntary' : 'Involuntary'
            return (
              <div key={entry.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: tc.color, flexShrink: 0 }}>A</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{getClientName(entry)}</span>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: tc.bg, color: tc.color }}>{typeLabel}</span>
                        {entry.resolved && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: '#D6F0E7', color: '#0A5C43' }}>Resolved</span>}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{entry.employee_name}</div>
                      {entry.reason && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{entry.reason}</div>}
                      {entry.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>{entry.notes}</div>}
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        {entry.week_start ? `Week of ${new Date(entry.week_start).toLocaleDateString()}` : ''} · {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => pushToWbr(entry)}
                      style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, background: 'var(--accent-light)', color: 'var(--accent-text)', border: '1px solid var(--accent)' }}>→ WBR</button>
                    <button onClick={() => loadEntry(entry)}
                      style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, background: 'var(--bg-app)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Edit</button>
                    <button onClick={() => deleteEntry(entry.id)}
                      style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>✕</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
