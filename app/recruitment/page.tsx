'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function RecruitmentPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState('')
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1)
    return d.toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    new_hires: '', onboarding_dates: '', todo_list: '', challenges: '', deliverables: '',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: c }, { data: e }] = await Promise.all([
        supabase.from('clients').select('id, name').eq('user_id', user.id),
        supabase.from('recruitment').select('*').eq('user_id', user.id).order('week_start', { ascending: false }),
      ])
      setClients(c || [])
      setEntries(e || [])
      setLoading(false)
    }
    init()
  }, [router])

  const loadEntry = (entry: any) => {
    setForm({
      new_hires: entry.new_hires || '',
      onboarding_dates: entry.onboarding_dates || '',
      todo_list: entry.todo_list || '',
      challenges: entry.challenges || '',
      deliverables: entry.deliverables || '',
    })
    setSelectedClient(entry.client_id)
    setWeekStart(entry.week_start)
    setEditingId(entry.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!selectedClient) { setError('Select a client'); return }
    setSaving(true); setError('')
    const payload = { ...form, client_id: selectedClient, week_start: weekStart, user_id: user!.id }
    if (editingId) {
      const { error } = await supabase.from('recruitment').update(payload).eq('id', editingId)
      if (error) { setError(error.message) }
      else { setEntries(e => e.map(r => r.id === editingId ? { ...r, ...payload } : r)) }
    } else {
      const { data, error } = await supabase.from('recruitment').insert(payload).select().single()
      if (error) { setError(error.message) }
      else { setEntries(e => [data, ...e]) }
    }
    setSaving(false); setShowForm(false); setEditingId(null)
    setForm({ new_hires: '', onboarding_dates: '', todo_list: '', challenges: '', deliverables: '' })
  }

  const deleteEntry = async (id: string) => {
    await supabase.from('recruitment').delete().eq('id', id)
    setEntries(e => e.filter(r => r.id !== id))
  }

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || '—'
  const filtered = selectedClient ? entries.filter(e => e.client_id === selectedClient) : entries

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
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Recruitment</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{entries.length} entries</div>
          </div>
          <button className="primary" onClick={() => { setShowForm(true); setEditingId(null); setForm({ new_hires: '', onboarding_dates: '', todo_list: '', challenges: '', deliverables: '' }) }}>+ New Entry</button>
        </div>

        <div style={{ padding: 24 }}>
          {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}

          {/* Form */}
          {showForm && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {editingId ? 'Edit' : 'New'} Recruitment Entry
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
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>New Hires</label>
                  <textarea value={form.new_hires} onChange={e => setForm(f => ({ ...f, new_hires: e.target.value }))} rows={4}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'system-ui, sans-serif', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Onboarding Dates</label>
                  <textarea value={form.onboarding_dates} onChange={e => setForm(f => ({ ...f, onboarding_dates: e.target.value }))} rows={4}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'system-ui, sans-serif', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>To-Do List</label>
                  <textarea value={form.todo_list} onChange={e => setForm(f => ({ ...f, todo_list: e.target.value }))} rows={5}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'system-ui, sans-serif', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Challenges</label>
                  <textarea value={form.challenges} onChange={e => setForm(f => ({ ...f, challenges: e.target.value }))} rows={5}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'system-ui, sans-serif', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Deliverables</label>
                <textarea value={form.deliverables} onChange={e => setForm(f => ({ ...f, deliverables: e.target.value }))} rows={4}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'system-ui, sans-serif', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
              </div>
            </div>
          )}

          {/* Filter */}
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

          {/* Entries */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>No recruitment entries yet</div>
          ) : filtered.map(entry => (
            <div key={entry.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#D6F0E7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#0A5C43' }}>R</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{getClientName(entry.client_id)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Week of {entry.week_start ? new Date(entry.week_start).toLocaleDateString() : '—'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => loadEntry(entry)}
                    style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: 'var(--bg-app)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>Edit</button>
                  <button onClick={() => deleteEntry(entry.id)}
                    style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: 'var(--danger-light)', color: 'var(--danger)', borderColor: 'var(--danger)' }}>Delete</button>
                </div>
              </div>
              {(entry.new_hires || entry.onboarding_dates || entry.todo_list || entry.challenges || entry.deliverables) && (
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'New Hires', value: entry.new_hires },
                    { label: 'Onboarding Dates', value: entry.onboarding_dates },
                    { label: 'To-Do List', value: entry.todo_list },
                    { label: 'Challenges', value: entry.challenges },
                    { label: 'Deliverables', value: entry.deliverables },
                  ].filter(f => f.value).map(f => (
                    <div key={f.label} style={{ background: 'var(--bg-app)', borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{f.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{f.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
