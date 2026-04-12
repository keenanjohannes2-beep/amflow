'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', industry: '', contact_person: '', email: '',
    start_date: '', services: '', contract_type: 'Retainer', status: 'Active',
  })

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.name) { setError('Client name is required'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { error } = await supabase.from('clients').insert({
      ...form, user_id: user.id, archived: false,
    })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/clients')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span onClick={() => router.push('/clients')} style={{ fontSize: 13, color: 'var(--accent)', cursor: 'pointer' }}>← Clients</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Add new client</span>
        </div>
        <button className="primary" onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save client'}</button>
      </div>
      <div style={{ maxWidth: 600, margin: '32px auto', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 32 }}>
        {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 16 }}>{error}</p>}
        {[
          { label: 'Client name *', key: 'name', placeholder: 'e.g. ISTA Solutions' },
          { label: 'Industry', key: 'industry', placeholder: 'e.g. Healthcare' },
          { label: 'Contact person', key: 'contact_person', placeholder: 'e.g. Amanda Smith' },
          { label: 'Email', key: 'email', placeholder: 'contact@company.com', type: 'email' },
          { label: 'Start date', key: 'start_date', type: 'date' },
          { label: 'Services provided', key: 'services', placeholder: 'e.g. BPO, Medical Billing' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>{f.label}</label>
            <input type={f.type || 'text'} value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} />
          </div>
        ))}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Contract type</label>
          <select value={form.contract_type} onChange={e => set('contract_type', e.target.value)}>
            <option>Retainer</option><option>Project</option><option>Hourly</option>
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            <option>Active</option><option>Paused</option><option>Closed</option>
          </select>
        </div>
      </div>
    </div>
  )
}