'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function PocPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [pocList, setPocList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    director_name: '', director_email: '', director_phone: '',
    csm_name: '', csm_email: '', csm_phone: '', notes: '',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from('clients').select('id, name').eq('user_id', user.id),
        supabase.from('poc').select('*, clients(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])
      setClients(c || [])
      setPocList(p || [])
      setLoading(false)
    }
    init()
  }, [router])

  const loadEntry = (entry: any) => {
    setForm({
      director_name: entry.director_name || '',
      director_email: entry.director_email || '',
      director_phone: entry.director_phone || '',
      csm_name: entry.csm_name || '',
      csm_email: entry.csm_email || '',
      csm_phone: entry.csm_phone || '',
      notes: entry.notes || '',
    })
    setSelectedClient(entry.client_id)
    setEditingId(entry.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!selectedClient) { setError('Select a client'); return }
    setSaving(true); setError('')
    const payload = { ...form, client_id: selectedClient, user_id: user!.id }
    if (editingId) {
      const { error } = await supabase.from('poc').update(payload).eq('id', editingId)
      if (error) { setError(error.message) }
      else { setPocList(p => p.map(r => r.id === editingId ? { ...r, ...payload } : r)) }
    } else {
      const { data, error } = await supabase.from('poc').insert(payload).select().single()
      if (error) { setError(error.message) }
      else { setPocList(p => [data, ...p]) }
    }
    setSaving(false); setShowForm(false); setEditingId(null)
    setForm({ director_name: '', director_email: '', director_phone: '', csm_name: '', csm_email: '', csm_phone: '', notes: '' })
  }

  const deleteEntry = async (id: string) => {
    await supabase.from('poc').delete().eq('id', id)
    setPocList(p => p.filter(r => r.id !== id))
  }

  const getClientName = (entry: any) => entry.clients?.name || clients.find(c => c.id === entry.client_id)?.name || '—'
  const filtered = selectedClient ? pocList.filter(e => e.client_id === selectedClient) : pocList

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
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Points of Contact</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{pocList.length} entries</div>
          </div>
          <button className="primary" onClick={() => { setShowForm(true); setEditingId(null); setForm({ director_name: '', director_email: '', director_phone: '', csm_name: '', csm_email: '', csm_phone: '', notes: '' }) }}>+ New POC</button>
        </div>

        <div style={{ padding: 24 }}>
          {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}

          {showForm && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {editingId ? 'Edit' : 'New'} Point of Contact
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowForm(false); setEditingId(null) }}>Cancel</button>
                  <button className="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Save'}</button>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client</label>
                <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Select client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}>Director</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name</label>
                      <input value={form.director_name} onChange={e => setForm(f => ({ ...f, director_name: e.target.value }))} placeholder="Director name" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email</label>
                      <input value={form.director_email} onChange={e => setForm(f => ({ ...f, director_email: e.target.value }))} placeholder="email@example.com" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Phone</label>
                      <input value={form.director_phone} onChange={e => setForm(f => ({ ...f, director_phone: e.target.value }))} placeholder="+1 555-0123" />
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}>CSM</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name</label>
                      <input value={form.csm_name} onChange={e => setForm(f => ({ ...f, csm_name: e.target.value }))} placeholder="CSM name" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email</label>
                      <input value={form.csm_email} onChange={e => setForm(f => ({ ...f, csm_email: e.target.value }))} placeholder="csm@example.com" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Phone</label>
                      <input value={form.csm_phone} onChange={e => setForm(f => ({ ...f, csm_phone: e.target.value }))} placeholder="+1 555-4567" />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'system-ui, sans-serif', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
              </div>
            </div>
          )}

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

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>No POC entries yet</div>
          ) : filtered.map(entry => (
            <div key={entry.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#E3E8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#384B83' }}>P</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{getClientName(entry)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Created {new Date(entry.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => loadEntry(entry)}
                    style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: 'var(--bg-app)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>Edit</button>
                  <button onClick={() => deleteEntry(entry.id)}
                    style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: 'var(--danger-light)', color: 'var(--danger)', borderColor: 'var(--danger)' }}>Delete</button>
                </div>
              </div>
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Director</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{entry.director_name || '—'}</div>
                  {entry.director_email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.director_email}</div>}
                  {entry.director_phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.director_phone}</div>}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>CSM</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{entry.csm_name || '—'}</div>
                  {entry.csm_email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.csm_email}</div>}
                  {entry.csm_phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.csm_phone}</div>}
                </div>
              </div>
              {entry.notes && (
                <div style={{ padding: '0 16px 16px 16px' }}>
                  <div style={{ background: 'var(--bg-app)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Notes</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{entry.notes}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
