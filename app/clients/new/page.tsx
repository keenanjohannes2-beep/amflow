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
    start_date: '', monthly_retainer: '', services: '',
    contract_type: 'Retainer', status: 'Active',
  })

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.name) { setError('Client name is required'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { error } = await supabase.from('clients').insert({
      ...form,
      monthly_retainer: form.monthly_retainer ? parseFloat(form.monthly_retainer) : null,
      user_id: user.id,
    })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/clients')
  }

  const field = (label: string, key: string, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 5 }}>{label}</label>
      <input type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 14, outline: 'none' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f8', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', borderBottom: '0.5px solid #e5e5e5', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span onClick={() => router.push('/clients')} style={{ fontSize: 13, color: '#1D9E75', cursor: 'pointer' }}>← Clients</span>
          <span style={{ fontSize: 16, fontWeight: 500 }}>Add new client</span>
        </div>
        <button onClick={handleSave} disabled={loading}
          style={{ padding: '7px 16px', borderRadius: 8, background: '#1D9E75', color: 'white', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
          {loading ? 'Saving...' : 'Save client'}
        </button>
      </div>

      <div style={{ maxWidth: 600, margin: '32px auto', background: 'white', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: 32 }}>
        {error && <p style={{ fontSize: 12, color: '#E24B4A', marginBottom: 16 }}>{error}</p>}

        {field('Client name *', 'name', 'text', 'e.g. Acme Corp')}
        {field('Industry', 'industry', 'text', 'e.g. Technology')}
        {field('Contact person', 'contact_person', 'text', 'e.g. John Smith')}
        {field('Email', 'email', 'email', 'contact@company.com')}
        {field('Start date', 'start_date', 'date')}
        {field('Monthly retainer (R)', 'monthly_retainer', 'number', '0')}
        {field('Services provided', 'services', 'text', 'e.g. Web Development, SEO')}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 5 }}>Contract type</label>
          <select value={form.contract_type} onChange={e => set('contract_type', e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 14, outline: 'none', background: 'white' }}>
            <option>Retainer</option>
            <option>Project</option>
            <option>Hourly</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 5 }}>Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 14, outline: 'none', background: 'white' }}>
            <option>Active</option>
            <option>Paused</option>
            <option>Closed</option>
          </select>
        </div>
      </div>
    </div>
  )
}