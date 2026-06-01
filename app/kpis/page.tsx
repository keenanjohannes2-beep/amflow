'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function KPIsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('team')
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [tForm, setTForm] = useState({ client_id: '', metric_name: '', metric_type: 'number', unit: '', target: '', frequency: 'Daily' })
  const [rForm, setRForm] = useState({ template_id: '', employee_id: '', date: new Date().toISOString().split('T')[0], value: '', notes: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: cl }, { data: em }, { data: tp }, { data: rc }, { data: at }] = await Promise.all([
        supabase.from('clients').select('id, name').eq('user_id', user.id),
        supabase.from('employees').select('*').eq('user_id', user.id),
        supabase.from('kpi_templates').select('*').eq('user_id', user.id),
        supabase.from('kpi_records').select('*').eq('user_id', user.id),
        supabase.from('attendance').select('*').eq('user_id', user.id),
      ])
      setClients(cl || [])
      setEmployees(em || [])
      setTemplates(tp || [])
      setRecords(rc || [])
      setAttendanceData(at || [])
      if (cl && cl.length > 0) setSelectedClient(cl[0].id)
      setLoading(false)
    }
    init()
  }, [])

  const setT = (k: string, v: any) => setTForm(f => ({ ...f, [k]: v }))
  const setR = (k: string, v: any) => setRForm(f => ({ ...f, [k]: v }))

  const saveTemplate = async () => {
    if (!tForm.metric_name || !tForm.client_id) { setError('Metric name and client are required'); return }
    setSaving(true)
    const { data, error } = await supabase.from('kpi_templates').insert({
      ...tForm, target: tForm.target ? parseFloat(tForm.target) : null, user_id: user.id,
    }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else { setTemplates(t => [data, ...t]); setTForm({ client_id: '', metric_name: '', metric_type: 'number', unit: '', target: '', frequency: 'Daily' }); setShowTemplateForm(false); setSaving(false) }
  }

  const saveRecord = async () => {
    if (!rForm.template_id || !rForm.value) { setError('Metric and value are required'); return }
    setSaving(true)
    const tmpl = templates.find(t => t.id === rForm.template_id)
    const { data, error } = await supabase.from('kpi_records').insert({
      ...rForm, value: parseFloat(rForm.value), client_id: tmpl?.client_id, user_id: user.id,
      employee_id: rForm.employee_id || null,
    }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else { setRecords(r => [data, ...r]); setRForm({ template_id: '', employee_id: '', date: new Date().toISOString().split('T')[0], value: '', notes: '' }); setShowRecordForm(false); setSaving(false) }
  }

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || '—'
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.full_name || 'Team'
  const getTemplateName = (id: string) => templates.find(t => t.id === id)?.metric_name || '—'

  const filteredTemplates = selectedClient ? templates.filter(t => t.client_id === selectedClient) : templates
  const filteredEmployees = selectedClient ? employees.filter(e => e.client_id === selectedClient) : employees

  const filteredRecords = records.filter(r => {
    const clientMatch = selectedClient ? r.client_id === selectedClient : true
    const monthMatch = r.date?.startsWith(selectedMonth)
    return clientMatch && monthMatch
  })

  const getMetricStats = (templateId: string, employeeId?: string) => {
    const recs = filteredRecords.filter(r => r.template_id === templateId && (employeeId ? r.employee_id === employeeId : true))
    if (recs.length === 0) return null
    const total = recs.reduce((s, r) => s + (r.value || 0), 0)
    const avg = total / recs.length
    const max = Math.max(...recs.map(r => r.value))
    const min = Math.min(...recs.map(r => r.value))
    return { total, avg, max, min, count: recs.length }
  }

  const getTargetColor = (value: number, target: number) => {
    const pct = (value / target) * 100
    if (pct >= 100) return 'var(--accent)'
    if (pct >= 75) return '#D4930A'
    return 'var(--danger)'
  }

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12 }
  const label = { fontSize: 11, color: 'var(--text-muted)', display: 'block' as const, marginBottom: 4 }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar userEmail={user?.email || ''} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Topbar */}
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Performance KPIs</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{filteredTemplates.length} metrics · {filteredRecords.length} records this month</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} style={{ fontSize: 12, padding: '6px 10px', width: 'auto' }}>
              <option value="">All clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ fontSize: 12, padding: '6px 10px', width: 'auto' }} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '0 24px', display: 'flex' }}>
          {[
            { id: 'team', label: 'Team Performance' },
            { id: 'individual', label: 'Individual Performance' },
            { id: 'utilization', label: 'Utilization' },
            { id: 'metrics', label: 'Manage Metrics' },
            { id: 'log', label: 'Log Performance' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: '10px 16px', borderRadius: 0, border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent', background: 'transparent', fontSize: 13, color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)', fontWeight: activeTab === tab.id ? 500 : 400, cursor: 'pointer' }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}

          {/* TEAM PERFORMANCE TAB */}
          {activeTab === 'team' && (
            <>
              {filteredTemplates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>
                  No metrics set up yet —{' '}
                  <span onClick={() => setActiveTab('metrics')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>add metrics first</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                  {filteredTemplates.map(tmpl => {
                    const stats = getMetricStats(tmpl.id)
                    const hasTarget = tmpl.target > 0
                    return (
                      <div key={tmpl.id} style={{ ...card, padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{tmpl.metric_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{getClientName(tmpl.client_id)} · {tmpl.frequency}</div>
                          </div>
                          {tmpl.unit && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg-app)', color: 'var(--text-muted)' }}>{tmpl.unit}</span>}
                        </div>
                        {stats ? (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
                              {[
                                { label: 'Total', value: stats.total.toLocaleString() },
                                { label: 'Average', value: stats.avg.toFixed(1) },
                                { label: 'Best', value: stats.max.toLocaleString() },
                                { label: 'Records', value: stats.count },
                              ].map(s => (
                                <div key={s.label} style={{ background: 'var(--bg-app)', borderRadius: 8, padding: '8px 10px' }}>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
                                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{s.value}</div>
                                </div>
                              ))}
                            </div>
                            {hasTarget && (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs target ({tmpl.target.toLocaleString()})</span>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: getTargetColor(stats.avg, tmpl.target) }}>
                                    {Math.round((stats.avg / tmpl.target) * 100)}%
                                  </span>
                                </div>
                                <div style={{ height: 5, background: 'var(--bg-app)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.min((stats.avg / tmpl.target) * 100, 100)}%`, height: '100%', borderRadius: 3, background: getTargetColor(stats.avg, tmpl.target) }} />
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No data logged this month</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* INDIVIDUAL PERFORMANCE TAB */}
          {activeTab === 'individual' && (
            <>
              {filteredEmployees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>No employees found for this client</div>
              ) : filteredEmployees.map(emp => (
                <div key={emp.id} style={{ ...card, marginBottom: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--accent-text)' }}>
                      {emp.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{emp.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.role || '—'} · {getClientName(emp.client_id)}</div>
                    </div>
                  </div>
                  <div style={{ padding: 16 }}>
                    {filteredTemplates.filter(t => t.client_id === emp.client_id).length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No metrics set up for this client</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                        {filteredTemplates.filter(t => t.client_id === emp.client_id).map(tmpl => {
                          const stats = getMetricStats(tmpl.id, emp.id)
                          const hasTarget = tmpl.target > 0
                          return (
                            <div key={tmpl.id} style={{ background: 'var(--bg-app)', borderRadius: 8, padding: 12 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{tmpl.metric_name}</div>
                              {stats ? (
                                <>
                                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 4 }}>
                                    {stats.total.toLocaleString()}
                                    {tmpl.unit && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>{tmpl.unit}</span>}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: hasTarget ? 6 : 0 }}>avg {stats.avg.toFixed(1)} / {tmpl.frequency.toLowerCase()}</div>
                                  {hasTarget && (
                                    <>
                                      <div style={{ height: 4, background: 'var(--border-light)', borderRadius: 2, overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min((stats.avg / tmpl.target) * 100, 100)}%`, height: '100%', borderRadius: 2, background: getTargetColor(stats.avg, tmpl.target) }} />
                                      </div>
                                      <div style={{ fontSize: 10, color: getTargetColor(stats.avg, tmpl.target), marginTop: 3 }}>
                                        {Math.round((stats.avg / tmpl.target) * 100)}% of target
                                      </div>
                                    </>
                                  )}
                                </>
                              ) : (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No data</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* UTILIZATION TAB */}
          {activeTab === 'utilization' && (
            <>
              {!selectedClient ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>Select a client to view utilization</div>
              ) : (
                <>
                  {(() => {
                    const clientEmps = employees.filter(e => e.client_id === selectedClient)
                    const tls = clientEmps.filter(e => e.role?.toLowerCase().includes('lead') || e.role?.toLowerCase().includes('tl'))
                    const agents = clientEmps.filter(e => !(e.role?.toLowerCase().includes('lead') || e.role?.toLowerCase().includes('tl')))

                    const getUtil = (empId: string) => {
                      const recs = attendanceData.filter(a => a.employee_id === empId && a.date?.startsWith(selectedMonth))
                      if (recs.length === 0) return null
                      const present = recs.filter(a => a.status === 'Present').length
                      return { rate: Math.round((present / recs.length) * 100), present, total: recs.length }
                    }

                    const calcAvg = (emps: any[]) => {
                      const utils = emps.map(e => getUtil(e.id)).filter(Boolean) as { rate: number; present: number; total: number }[]
                      if (utils.length === 0) return null
                      const avgRate = Math.round(utils.reduce((s, u) => s + u.rate, 0) / utils.length)
                      const totalPresent = utils.reduce((s, u) => s + u.present, 0)
                      const totalDays = utils.reduce((s, u) => s + u.total, 0)
                      return { avgRate, totalPresent, totalDays, count: utils.length }
                    }

                    const teamAvg = calcAvg(clientEmps)
                    const tlAvg = calcAvg(tls)
                    const agentAvg = calcAvg(agents)

                    const renderUtilRow = (emp: any) => {
                      const u = getUtil(emp.id)
                      const pct = u ? u.rate : null
                      const pctColor = pct === null ? 'var(--text-muted)' : pct >= 90 ? 'var(--accent)' : pct >= 75 ? '#D4930A' : 'var(--danger)'
                      return (
                        <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-light)' }}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--accent-text)' }}>
                              {emp.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{emp.full_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.role || 'Agent'}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', width: 80 }}>
                            {pct !== null ? (
                              <>
                                <div style={{ fontSize: 18, fontWeight: 600, color: pctColor }}>{pct}%</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{u?.present || '?'}/{u?.total || '?'} days</div>
                              </>
                            ) : (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No data</div>
                            )}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <>
                        {/* Summary cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                          {[
                            { label: 'Team Average', value: teamAvg, color: 'var(--accent)' },
                            { label: 'TL Average', value: tlAvg, color: '#D4930A' },
                            { label: 'Agent Average', value: agentAvg, color: '#4A3080' },
                          ].map(s => (
                            <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 16 }}>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                              {s.value ? (
                                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value.avgRate}%</div>
                              ) : (
                                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>—</div>
                              )}
                              {s.value && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                  {s.value.totalPresent}/{s.value.totalDays} days · {s.value.count} {s.label.toLowerCase().includes('team') ? 'employees' : 'people'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* TLs */}
                        {tls.length > 0 && (
                          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
                            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-light)', fontSize: 13, fontWeight: 500, color: '#D4930A' }}>
                              Team Leads ({tls.length})
                            </div>
                            {tls.map(renderUtilRow)}
                          </div>
                        )}

                        {/* Agents */}
                        {agents.length > 0 && (
                          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden' }}>
                            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-light)', fontSize: 13, fontWeight: 500, color: '#4A3080' }}>
                              Agents ({agents.length})
                            </div>
                            {agents.map(renderUtilRow)}
                          </div>
                        )}

                        {clientEmps.length === 0 && (
                          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>No employees for this client</div>
                        )}
                      </>
                    )
                  })()}
                </>
              )}
            </>
          )}

          {/* MANAGE METRICS TAB */}
          {activeTab === 'metrics' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="primary" onClick={() => setShowTemplateForm(true)}>+ Add Metric</button>
              </div>
              {showTemplateForm && (
                <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Add KPI metric</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={label}>Client *</label>
                      <select value={tForm.client_id} onChange={e => setT('client_id', e.target.value)}>
                        <option value="">Select client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Metric name *</label>
                      <input value={tForm.metric_name} onChange={e => setT('metric_name', e.target.value)} placeholder="e.g. Total Calls, CSAT Score" />
                    </div>
                    <div>
                      <label style={label}>Unit</label>
                      <input value={tForm.unit} onChange={e => setT('unit', e.target.value)} placeholder="e.g. calls, %, mins" />
                    </div>
                    <div>
                      <label style={label}>Target</label>
                      <input type="number" value={tForm.target} onChange={e => setT('target', e.target.value)} placeholder="e.g. 100" />
                    </div>
                    <div>
                      <label style={label}>Frequency</label>
                      <select value={tForm.frequency} onChange={e => setT('frequency', e.target.value)}>
                        <option>Daily</option><option>Weekly</option><option>Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Type</label>
                      <select value={tForm.metric_type} onChange={e => setT('metric_type', e.target.value)}>
                        <option value="number">Number</option>
                        <option value="percentage">Percentage</option>
                        <option value="time">Time (mins)</option>
                        <option value="score">Score</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowTemplateForm(false)}>Cancel</button>
                    <button className="primary" onClick={saveTemplate} disabled={saving}>{saving ? 'Saving...' : 'Save metric'}</button>
                  </div>
                </div>
              )}
              <div style={card}>
                {filteredTemplates.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No metrics yet — add your first KPI metric</div>
                ) : filteredTemplates.map(tmpl => (
                  <div key={tmpl.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{tmpl.metric_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {getClientName(tmpl.client_id)} · {tmpl.frequency} · {tmpl.metric_type}
                        {tmpl.target ? ` · Target: ${tmpl.target.toLocaleString()}${tmpl.unit ? ' ' + tmpl.unit : ''}` : ''}
                      </div>
                    </div>
                    {tmpl.unit && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg-app)', color: 'var(--text-muted)' }}>{tmpl.unit}</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* LOG PERFORMANCE TAB */}
          {activeTab === 'log' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="primary" onClick={() => setShowRecordForm(true)}>+ Log Performance</button>
              </div>
              {showRecordForm && (
                <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Log performance entry</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={label}>Metric *</label>
                      <select value={rForm.template_id} onChange={e => setR('template_id', e.target.value)}>
                        <option value="">Select metric</option>
                        {filteredTemplates.map(t => <option key={t.id} value={t.id}>{t.metric_name} ({getClientName(t.client_id)})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Employee (optional)</label>
                      <select value={rForm.employee_id} onChange={e => setR('employee_id', e.target.value)}>
                        <option value="">Team (no specific employee)</option>
                        {filteredEmployees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Value *</label>
                      <input type="number" value={rForm.value} onChange={e => setR('value', e.target.value)} placeholder="e.g. 120" />
                    </div>
                    <div>
                      <label style={label}>Date</label>
                      <input type="date" value={rForm.date} onChange={e => setR('date', e.target.value)} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={label}>Notes</label>
                      <input value={rForm.notes} onChange={e => setR('notes', e.target.value)} placeholder="Optional notes" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowRecordForm(false)}>Cancel</button>
                    <button className="primary" onClick={saveRecord} disabled={saving}>{saving ? 'Saving...' : 'Save entry'}</button>
                  </div>
                </div>
              )}
              <div style={card}>
                {filteredRecords.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No performance data logged this month</div>
                ) : filteredRecords.map(rec => {
                  const tmpl = templates.find(t => t.id === rec.template_id)
                  return (
                    <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{getTemplateName(rec.template_id)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {getEmployeeName(rec.employee_id)} · {getClientName(rec.client_id)} · {rec.date ? new Date(rec.date).toLocaleDateString() : '—'}
                        </div>
                        {rec.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{rec.notes}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {rec.value.toLocaleString()}
                          {tmpl?.unit && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>{tmpl.unit}</span>}
                        </div>
                        {tmpl?.target && (
                          <div style={{ fontSize: 10, color: getTargetColor(rec.value, tmpl.target) }}>
                            {Math.round((rec.value / tmpl.target) * 100)}% of target
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}