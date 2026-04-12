'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function ScorecardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [scorecards, setScorecards] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    client_id: '', satisfaction: 3, communication: 3,
    payment_reliability: 3, workload_balance: 3,
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase.from('scorecards').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name').eq('user_id', user.id),
      ])
      setScorecards(s || [])
      setClients(c || [])
      setLoading(false)
    }
    init()
  }, [])

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.client_id) { setError('Please select a client'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('scorecards').insert({
      ...form,
      satisfaction: Number(form.satisfaction),
      communication: Number(form.communication),
      payment_reliability: Number(form.payment_reliability),
      workload_balance: Number(form.workload_balance),
      user_id: user!.id,
    }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else {
      setScorecards(s => [data, ...s])
      setForm({ client_id: '', satisfaction: 3, communication: 3, payment_reliability: 3, workload_balance: 3 })
      setShowForm(false); setSaving(false)
    }
  }

  const getAvg = (s: any) => ((s.satisfaction + s.communication + s.payment_reliability + s.workload_balance) / 4)
  const getRisk = (avg: number) => {
    if (avg >= 4) return { label: 'Green', bg: 'var(--accent-light)', color: 'var(--accent-text)' }
    if (avg >= 3) return { label: 'Amber', bg: 'var(--warning-light)', color: 'var(--warning)' }
    return { label: 'At risk', bg: 'var(--danger-light)', color: 'var(--danger)' }
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
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Health Scorecard</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{scorecards.filter(s => getAvg(s) < 3).length} at risk · {scorecards.filter(s => getAvg(s) >= 4).length} healthy</div>
          </div>
          <button className="primary" onClick={() => setShowForm(true)}>+ Score Client</button>
        </div>
        <div style={{ padding: 24 }}>
          {showForm && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 24, marginBottom: 16, maxWidth: 500 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: 'var(--text-primary)' }}>Score a client</div>
              {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client *</label>
                <select value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                  <option value="">Select a client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {[
                { label: 'Satisfaction', key: 'satisfaction' },
                { label: 'Communication', key: 'communication' },
                { label: 'Payment reliability', key: 'payment_reliability' },
                { label: 'Workload balance', key: 'workload_balance' },
              ].map(({ label, key }) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</label>
                    <span style={{ fontSize: 12, fontWeight: 500, color: (form as any)[key] >= 4 ? 'var(--accent)' : (form as any)[key] >= 3 ? 'var(--warning)' : 'var(--danger)' }}>{(form as any)[key]} / 5</span>
                  </div>
                  <input type="range" min={1} max={5} step={1} value={(form as any)[key]}
                    onChange={e => set(key, Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)', border: 'none', padding: 0, background: 'transparent' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    {['1', '2', '3', '4', '5'].map(n => <span key={n} style={{ fontSize: 10, color: 'var(--text-muted)' }}>{n}</span>)}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setShowForm(false)}>Cancel</button>
                <button className="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save score'}</button>
              </div>
            </div>
          )}
          {scorecards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>No scores yet — score your first client</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {scorecards.map(s => {
                const avg = getAvg(s)
                const risk = getRisk(avg)
                return (
                  <div key={s.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{getClientName(s.client_id)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(s.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color: 'var(--text-primary)' }}>{avg.toFixed(1)}</div>
                        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: risk.bg, color: risk.color }}>{risk.label}</span>
                      </div>
                    </div>
                    {[
                      { label: 'Satisfaction', value: s.satisfaction },
                      { label: 'Communication', value: s.communication },
                      { label: 'Payment', value: s.payment_reliability },
                      { label: 'Workload', value: s.workload_balance },
                    ].map(metric => (
                      <div key={metric.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 90, flexShrink: 0 }}>{metric.label}</span>
                        <div style={{ flex: 1, height: 5, background: 'var(--bg-app)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${(metric.value / 5) * 100}%`, height: '100%', borderRadius: 3, background: metric.value >= 4 ? 'var(--accent)' : metric.value >= 3 ? '#D4930A' : 'var(--danger)' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 500, width: 16, textAlign: 'right', color: 'var(--text-primary)' }}>{metric.value}</span>
                      </div>
                    ))}
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