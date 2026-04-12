'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  const [user, setUser] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Data
  const [pocs, setPocs] = useState<any[]>([])
  const [requisitions, setRequisitions] = useState<any[]>([])
  const [jobSpecs, setJobSpecs] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [comms, setComms] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [scorecards, setScorecards] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [kpiTemplates, setKpiTemplates] = useState<any[]>([])
  const [kpiRecords, setKpiRecords] = useState<any[]>([])

  // Forms
  const [showPocForm, setShowPocForm] = useState(false)
  const [showReqForm, setShowReqForm] = useState(false)
  const [showJobForm, setShowJobForm] = useState(false)
  const [editingClient, setEditingClient] = useState(false)

  const [pocForm, setPocForm] = useState({ full_name: '', role: '', email: '', phone: '', notes: '' })
  const [reqForm, setReqForm] = useState({ title: '', department: '', headcount: '1', priority: 'Medium', status: 'Open', date_requested: '', date_needed: '', notes: '' })
  const [jobForm, setJobForm] = useState({ title: '', department: '', requirements: '', responsibilities: '', experience: '', salary_range: '', employment_type: 'Full Time', status: 'Active' })
  const [clientForm, setClientForm] = useState<any>({})

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [
        { data: cl }, { data: pc }, { data: rq }, { data: js },
        { data: tk }, { data: cm }, { data: is }, { data: sc },
        { data: em }, { data: kt }, { data: kr },
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).single(),
        supabase.from('poc').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('requisitions').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('job_specs').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('communications').select('*').eq('client_id', clientId).order('date', { ascending: false }),
        supabase.from('issues').select('*').eq('client_id', clientId).order('date_logged', { ascending: false }),
        supabase.from('scorecards').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('employees').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('kpi_templates').select('*').eq('client_id', clientId),
        supabase.from('kpi_records').select('*').eq('client_id', clientId).order('date', { ascending: false }),
      ])
      setClient(cl)
      setClientForm(cl)
      setPocs(pc || [])
      setRequisitions(rq || [])
      setJobSpecs(js || [])
      setTasks(tk || [])
      setComms(cm || [])
      setIssues(is || [])
      setScorecards(sc || [])
      setEmployees(em || [])
      setKpiTemplates(kt || [])
      setKpiRecords(kr || [])
      setLoading(false)
    }
    init()
  }, [clientId])

  const setP = useCallback((k: string) => (v: string) => setPocForm(f => ({ ...f, [k]: v })), [])
  const setR = useCallback((k: string) => (v: string) => setReqForm(f => ({ ...f, [k]: v })), [])
  const setJ = useCallback((k: string) => (v: string) => setJobForm(f => ({ ...f, [k]: v })), [])

  const savePoc = async () => {
    if (!pocForm.full_name) { setError('Name is required'); return }
    setSaving(true)
    const { data, error } = await supabase.from('poc').insert({ ...pocForm, client_id: clientId, user_id: user.id }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else { setPocs(p => [data, ...p]); setPocForm({ full_name: '', role: '', email: '', phone: '', notes: '' }); setShowPocForm(false); setSaving(false) }
  }

  const deletePoc = async (id: string) => {
    await supabase.from('poc').delete().eq('id', id)
    setPocs(p => p.filter(x => x.id !== id))
  }

  const saveReq = async () => {
    if (!reqForm.title) { setError('Title is required'); return }
    setSaving(true)
    const { data, error } = await supabase.from('requisitions').insert({ ...reqForm, headcount: parseInt(reqForm.headcount), client_id: clientId, user_id: user.id }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else { setRequisitions(r => [data, ...r]); setReqForm({ title: '', department: '', headcount: '1', priority: 'Medium', status: 'Open', date_requested: '', date_needed: '', notes: '' }); setShowReqForm(false); setSaving(false) }
  }

  const saveJob = async () => {
    if (!jobForm.title) { setError('Title is required'); return }
    setSaving(true)
    const { data, error } = await supabase.from('job_specs').insert({ ...jobForm, client_id: clientId, user_id: user.id }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else { setJobSpecs(j => [data, ...j]); setJobForm({ title: '', department: '', requirements: '', responsibilities: '', experience: '', salary_range: '', employment_type: 'Full Time', status: 'Active' }); setShowJobForm(false); setSaving(false) }
  }

  const saveClientEdit = async () => {
    setSaving(true)
    const { error } = await supabase.from('clients').update(clientForm).eq('id', clientId)
    if (error) { setError(error.message); setSaving(false) }
    else { setClient(clientForm); setEditingClient(false); setSaving(false) }
  }

  const archiveClient = async () => {
    const newVal = !client.archived
    await supabase.from('clients').update({ archived: newVal }).eq('id', clientId)
    setClient((c: any) => ({ ...c, archived: newVal }))
  }

  const deleteClient = async () => {
    if (!confirm('Permanently delete this client and all their data? This cannot be undone.')) return
    await supabase.from('clients').delete().eq('id', clientId)
    router.push('/clients')
  }

  const getAvgScore = () => {
    if (!scorecards.length) return null
    const sc = scorecards[0]
    return ((sc.satisfaction + sc.communication + sc.payment_reliability + sc.workload_balance) / 4).toFixed(1)
  }

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12 }
  const label = { fontSize: 11, color: 'var(--text-muted)', display: 'block' as const, marginBottom: 4 }
  const priorityColors: any = { High: { bg: 'var(--danger-light)', color: 'var(--danger)' }, Medium: { bg: 'var(--warning-light)', color: 'var(--warning)' }, Low: { bg: 'var(--accent-light)', color: 'var(--accent-text)' } }
  const statusColors: any = { Open: { bg: 'var(--danger-light)', color: 'var(--danger)' }, 'In Progress': { bg: 'var(--warning-light)', color: 'var(--warning)' }, Closed: { bg: 'var(--bg-app)', color: 'var(--text-muted)' }, Resolved: { bg: 'var(--accent-light)', color: 'var(--accent-text)' }, Active: { bg: 'var(--accent-light)', color: 'var(--accent-text)' } }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'poc', label: `POC (${pocs.length})` },
    { id: 'requisitions', label: `Requisitions (${requisitions.length})` },
    { id: 'jobspecs', label: `Job Specs (${jobSpecs.length})` },
    { id: 'tasks', label: `Tasks (${tasks.length})` },
    { id: 'comms', label: `Communications (${comms.length})` },
    { id: 'issues', label: `Issues (${issues.length})` },
    { id: 'scorecard', label: 'Scorecard' },
    { id: 'attendance', label: `Attendance (${employees.length})` },
    { id: 'kpis', label: 'KPIs' },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
    </div>
  )

  if (!client) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Client not found</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar userEmail={user?.email || ''} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Topbar */}
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span onClick={() => router.push('/clients')} style={{ fontSize: 13, color: 'var(--accent)', cursor: 'pointer' }}>← Clients</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{client.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{client.industry || '—'} · {client.status}</div>
            </div>
            {client.archived && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'var(--warning-light)', color: 'var(--warning)' }}>Archived</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={archiveClient}
              style={{ padding: '7px 14px', fontSize: 12, background: 'var(--warning-light)', color: 'var(--warning)', borderColor: 'var(--warning)' }}>
              {client.archived ? 'Restore' : 'Archive'}
            </button>
            <button onClick={deleteClient}
              style={{ padding: '7px 14px', fontSize: 12, background: 'var(--danger-light)', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
              Delete
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-light)', padding: '12px 24px', display: 'flex', gap: 24 }}>
          {[
            { label: 'Open tasks', value: tasks.filter(t => t.status !== 'Done').length },
            { label: 'Open issues', value: issues.filter(i => i.status !== 'Resolved').length },
            { label: 'Health score', value: getAvgScore() || '—' },
            { label: 'Employees', value: employees.length },
            { label: 'POC contacts', value: pocs.length },
            { label: 'Requisitions', value: requisitions.filter(r => r.status === 'Open').length },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '0 24px', display: 'flex', gap: 0, overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: '10px 14px', borderRadius: 0, border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent', background: 'transparent', fontSize: 12, color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)', fontWeight: activeTab === tab.id ? 500 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="primary" onClick={() => setEditingClient(!editingClient)}>
                  {editingClient ? 'Cancel' : 'Edit client'}
                </button>
              </div>
              {editingClient ? (
                <div style={{ ...card, padding: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {[
                      { label: 'Client name', key: 'name' },
                      { label: 'Industry', key: 'industry' },
                      { label: 'Contact person', key: 'contact_person' },
                      { label: 'Email', key: 'email', type: 'email' },
                      { label: 'Services', key: 'services' },
                      { label: 'Monthly retainer (R)', key: 'monthly_retainer', type: 'number' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={label}>{f.label}</label>
                        <input type={f.type || 'text'} value={clientForm[f.key] || ''} onChange={e => setClientForm((cf: any) => ({ ...cf, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                    <div>
                      <label style={label}>Contract type</label>
                      <select value={clientForm.contract_type || ''} onChange={e => setClientForm((cf: any) => ({ ...cf, contract_type: e.target.value }))}>
                        <option>Retainer</option><option>Project</option><option>Hourly</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Status</label>
                      <select value={clientForm.status || ''} onChange={e => setClientForm((cf: any) => ({ ...cf, status: e.target.value }))}>
                        <option>Active</option><option>Paused</option><option>Closed</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Start date</label>
                      <input type="date" value={clientForm.start_date || ''} onChange={e => setClientForm((cf: any) => ({ ...cf, start_date: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditingClient(false)}>Cancel</button>
                    <button className="primary" onClick={saveClientEdit} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
                  </div>
                </div>
              ) : (
                <div style={{ ...card, padding: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                    {[
                      { label: 'Client name', value: client.name },
                      { label: 'Industry', value: client.industry },
                      { label: 'Contact person', value: client.contact_person },
                      { label: 'Email', value: client.email },
                      { label: 'Contract type', value: client.contract_type },
                      { label: 'Monthly retainer', value: client.monthly_retainer ? `R${Number(client.monthly_retainer).toLocaleString()}` : '—' },
                      { label: 'Services', value: client.services },
                      { label: 'Start date', value: client.start_date ? new Date(client.start_date).toLocaleDateString() : '—' },
                      { label: 'Status', value: client.status },
                    ].map(f => (
                      <div key={f.label}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{f.value || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* POC TAB */}
          {activeTab === 'poc' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="primary" onClick={() => setShowPocForm(true)}>+ Add Contact</button>
              </div>
              {showPocForm && (
                <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Add point of contact</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {[
                      { label: 'Full name *', key: 'full_name', placeholder: 'e.g. Amanda Smith' },
                      { label: 'Role', key: 'role', placeholder: 'e.g. Operations Manager' },
                      { label: 'Email', key: 'email', placeholder: 'amanda@company.com', type: 'email' },
                      { label: 'Phone', key: 'phone', placeholder: '+27 82 000 0000' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={label}>{f.label}</label>
                        <input type={f.type || 'text'} value={(pocForm as any)[f.key]} onChange={e => setP(f.key)(e.target.value)} placeholder={f.placeholder} />
                      </div>
                    ))}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={label}>Notes</label>
                      <input value={pocForm.notes} onChange={e => setP('notes')(e.target.value)} placeholder="Optional notes" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowPocForm(false)}>Cancel</button>
                    <button className="primary" onClick={savePoc} disabled={saving}>{saving ? 'Saving...' : 'Save contact'}</button>
                  </div>
                </div>
              )}
              {pocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>No contacts yet</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {pocs.map(poc => (
                    <div key={poc.id} style={{ ...card, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--accent-text)' }}>
                          {poc.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{poc.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{poc.role || '—'}</div>
                        </div>
                        <button onClick={() => deletePoc(poc.id)} style={{ padding: '3px 8px', fontSize: 10, background: 'var(--danger-light)', color: 'var(--danger)', borderColor: 'var(--danger)' }}>Remove</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                        {poc.email && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>✉ {poc.email}</div>}
                        {poc.phone && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>✆ {poc.phone}</div>}
                        {poc.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{poc.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* REQUISITIONS TAB */}
          {activeTab === 'requisitions' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="primary" onClick={() => setShowReqForm(true)}>+ Add Requisition</button>
              </div>
              {showReqForm && (
                <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>New requisition</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={label}>Job title *</label>
                      <input value={reqForm.title} onChange={e => setR('title')(e.target.value)} placeholder="e.g. Senior ABA Therapist" />
                    </div>
                    <div>
                      <label style={label}>Department</label>
                      <input value={reqForm.department} onChange={e => setR('department')(e.target.value)} placeholder="e.g. Clinical" />
                    </div>
                    <div>
                      <label style={label}>Headcount</label>
                      <input type="number" value={reqForm.headcount} onChange={e => setR('headcount')(e.target.value)} />
                    </div>
                    <div>
                      <label style={label}>Priority</label>
                      <select value={reqForm.priority} onChange={e => setR('priority')(e.target.value)}>
                        <option>High</option><option>Medium</option><option>Low</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Status</label>
                      <select value={reqForm.status} onChange={e => setR('status')(e.target.value)}>
                        <option>Open</option><option>In Progress</option><option>Closed</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Date requested</label>
                      <input type="date" value={reqForm.date_requested} onChange={e => setR('date_requested')(e.target.value)} />
                    </div>
                    <div>
                      <label style={label}>Date needed</label>
                      <input type="date" value={reqForm.date_needed} onChange={e => setR('date_needed')(e.target.value)} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={label}>Notes</label>
                      <textarea value={reqForm.notes} onChange={e => setR('notes')(e.target.value)} placeholder="Additional notes" rows={2} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowReqForm(false)}>Cancel</button>
                    <button className="primary" onClick={saveReq} disabled={saving}>{saving ? 'Saving...' : 'Save requisition'}</button>
                  </div>
                </div>
              )}
              <div style={card}>
                {requisitions.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No requisitions yet</div>
                ) : requisitions.map(req => {
                  const p = priorityColors[req.priority] || priorityColors.Medium
                  const s = statusColors[req.status] || statusColors.Open
                  return (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{req.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {req.department || '—'} · Headcount: {req.headcount}
                          {req.date_needed ? ` · Needed by ${new Date(req.date_needed).toLocaleDateString()}` : ''}
                        </div>
                        {req.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{req.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: p.bg, color: p.color }}>{req.priority}</span>
                        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: s.bg, color: s.color }}>{req.status}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* JOB SPECS TAB */}
          {activeTab === 'jobspecs' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="primary" onClick={() => setShowJobForm(true)}>+ Add Job Spec</button>
              </div>
              {showJobForm && (
                <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>New job spec</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={label}>Job title *</label>
                      <input value={jobForm.title} onChange={e => setJ('title')(e.target.value)} placeholder="e.g. ABA Billing Specialist" />
                    </div>
                    <div>
                      <label style={label}>Department</label>
                      <input value={jobForm.department} onChange={e => setJ('department')(e.target.value)} placeholder="e.g. Billing" />
                    </div>
                    <div>
                      <label style={label}>Employment type</label>
                      <select value={jobForm.employment_type} onChange={e => setJ('employment_type')(e.target.value)}>
                        <option>Full Time</option><option>Part Time</option><option>Contract</option><option>Temporary</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Salary range</label>
                      <input value={jobForm.salary_range} onChange={e => setJ('salary_range')(e.target.value)} placeholder="e.g. R15,000 — R20,000" />
                    </div>
                    <div>
                      <label style={label}>Experience required</label>
                      <input value={jobForm.experience} onChange={e => setJ('experience')(e.target.value)} placeholder="e.g. 2+ years in medical billing" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={label}>Requirements</label>
                      <textarea value={jobForm.requirements} onChange={e => setJ('requirements')(e.target.value)} placeholder="List key requirements..." rows={3} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={label}>Responsibilities</label>
                      <textarea value={jobForm.responsibilities} onChange={e => setJ('responsibilities')(e.target.value)} placeholder="List key responsibilities..." rows={3} />
                    </div>
                    <div>
                      <label style={label}>Status</label>
                      <select value={jobForm.status} onChange={e => setJ('status')(e.target.value)}>
                        <option>Active</option><option>Draft</option><option>Closed</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowJobForm(false)}>Cancel</button>
                    <button className="primary" onClick={saveJob} disabled={saving}>{saving ? 'Saving...' : 'Save job spec'}</button>
                  </div>
                </div>
              )}
              {jobSpecs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>No job specs yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {jobSpecs.map(job => {
                    const s = statusColors[job.status] || statusColors.Active
                    return (
                      <div key={job.id} style={{ ...card, padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{job.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                              {job.department || '—'} · {job.employment_type}
                              {job.salary_range ? ` · ${job.salary_range}` : ''}
                            </div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: s.bg, color: s.color }}>{job.status}</span>
                        </div>
                        {job.experience && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Experience</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{job.experience}</div>
                          </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          {job.requirements && (
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Requirements</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{job.requirements}</div>
                            </div>
                          )}
                          {job.responsibilities && (
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Responsibilities</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{job.responsibilities}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <div style={card}>
              {tasks.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No tasks for this client</div>
              ) : tasks.map(task => {
                const p = priorityColors[task.priority] || priorityColors.Medium
                const isOverdue = task.status !== 'Done' && task.deadline && new Date(task.deadline) < new Date()
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, border: task.status === 'Done' ? 'none' : '1px solid var(--border)', background: task.status === 'Done' ? 'var(--accent)' : 'transparent', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: task.status === 'Done' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.status === 'Done' ? 'line-through' : 'none' }}>{task.title}</div>
                      <div style={{ fontSize: 11, color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {task.deadline ? `Due ${new Date(task.deadline).toLocaleDateString()}` : '—'}{isOverdue ? ' · Overdue' : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: p.bg, color: p.color }}>{task.priority}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* COMMUNICATIONS TAB */}
          {activeTab === 'comms' && (
            <div style={card}>
              {comms.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No communications logged</div>
              ) : comms.map(comm => (
                <div key={comm.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: 'var(--bg-app)', color: 'var(--text-muted)' }}>{comm.channel}</span>
                    {comm.poc && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>POC: {comm.poc}</span>}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{comm.date ? new Date(comm.date).toLocaleDateString() : '—'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{comm.summary}</div>
                </div>
              ))}
            </div>
          )}

          {/* ISSUES TAB */}
          {activeTab === 'issues' && (
            <div style={card}>
              {issues.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No issues logged</div>
              ) : issues.map(issue => {
                const sev = priorityColors[issue.severity] || priorityColors.Medium
                const stat = statusColors[issue.status] || statusColors.Open
                return (
                  <div key={issue.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: sev.bg, color: sev.color }}>{issue.severity}</span>
                      <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: stat.bg, color: stat.color }}>{issue.status}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{issue.date_logged ? new Date(issue.date_logged).toLocaleDateString() : '—'}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{issue.description}</div>
                    {issue.resolution && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Resolution: {issue.resolution}</div>}
                  </div>
                )
              })}
            </div>
          )}

          {/* SCORECARD TAB */}
          {activeTab === 'scorecard' && (
            <div>
              {scorecards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>No scorecard data yet</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {scorecards.map(sc => {
                    const avg = ((sc.satisfaction + sc.communication + sc.payment_reliability + sc.workload_balance) / 4)
                    return (
                      <div key={sc.id} style={{ ...card, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(sc.created_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: 22, fontWeight: 600, color: avg >= 4 ? 'var(--accent)' : avg >= 3 ? 'var(--warning)' : 'var(--danger)' }}>{avg.toFixed(1)}</div>
                        </div>
                        {[
                          { label: 'Satisfaction', value: sc.satisfaction },
                          { label: 'Communication', value: sc.communication },
                          { label: 'Payment', value: sc.payment_reliability },
                          { label: 'Workload', value: sc.workload_balance },
                        ].map(m => (
                          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 90, flexShrink: 0 }}>{m.label}</span>
                            <div style={{ flex: 1, height: 5, background: 'var(--bg-app)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${(m.value / 5) * 100}%`, height: '100%', borderRadius: 3, background: m.value >= 4 ? 'var(--accent)' : m.value >= 3 ? '#D4930A' : 'var(--danger)' }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>{m.value}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {employees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13, gridColumn: '1 / -1' }}>No employees for this client</div>
              ) : employees.map(emp => (
                <div key={emp.id} style={{ ...card, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--accent-text)' }}>
                      {emp.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{emp.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.role || '—'} · {emp.shift} shift</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* KPIs TAB */}
          {activeTab === 'kpis' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {kpiTemplates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13, gridColumn: '1 / -1' }}>No KPI metrics set up for this client</div>
              ) : kpiTemplates.map(tmpl => {
                const recs = kpiRecords.filter(r => r.template_id === tmpl.id)
                const total = recs.reduce((s, r) => s + r.value, 0)
                const avg = recs.length > 0 ? (total / recs.length).toFixed(1) : null
                return (
                  <div key={tmpl.id} style={{ ...card, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{tmpl.metric_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>{tmpl.frequency}{tmpl.unit ? ` · ${tmpl.unit}` : ''}</div>
                    {avg ? (
                      <>
                        <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>{total.toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>avg {avg} per {tmpl.frequency.toLowerCase()} · {recs.length} records</div>
                        {tmpl.target && (
                          <>
                            <div style={{ height: 4, background: 'var(--bg-app)', borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
                              <div style={{ width: `${Math.min((Number(avg) / tmpl.target) * 100, 100)}%`, height: '100%', borderRadius: 2, background: Number(avg) >= tmpl.target ? 'var(--accent)' : '#D4930A' }} />
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Target: {tmpl.target.toLocaleString()}{tmpl.unit ? ' ' + tmpl.unit : ''}</div>
                          </>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No data logged yet</div>
                    )}
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