'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function AttendancePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [shiftChanges, setShiftChanges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('attendance')
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [showAttendanceForm, setShowAttendanceForm] = useState(false)
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [empForm, setEmpForm] = useState({ full_name: '', role: '', shift: 'Morning', client_id: '', status: 'Active' })
  const [attForm, setAttForm] = useState({ employee_id: '', client_id: '', date: new Date().toISOString().split('T')[0], status: 'Present', notes: '' })
  const [leaveForm, setLeaveForm] = useState({ employee_id: '', client_id: '', start_date: '', end_date: '', type: 'Annual', reason: '', status: 'Pending' })
  const [shiftForm, setShiftForm] = useState({ employee_id: '', client_id: '', date: '', original_shift: '', requested_shift: '', reason: '', status: 'Pending' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: cl }, { data: em }, { data: at }, { data: lv }, { data: sh }] = await Promise.all([
        supabase.from('clients').select('id, name').eq('user_id', user.id),
        supabase.from('employees').select('*').eq('user_id', user.id),
        supabase.from('attendance').select('*').eq('user_id', user.id),
        supabase.from('leave_requests').select('*').eq('user_id', user.id),
        supabase.from('shift_changes').select('*').eq('user_id', user.id),
      ])
      setClients(cl || [])
      setEmployees(em || [])
      setAttendance(at || [])
      setLeaveRequests(lv || [])
      setShiftChanges(sh || [])
      if (cl && cl.length > 0) setSelectedClient(cl[0].id)
      setLoading(false)
    }
    init()
  }, [])

  const setE = (k: string, v: any) => setEmpForm(f => ({ ...f, [k]: v }))
  const setA = (k: string, v: any) => setAttForm(f => ({ ...f, [k]: v }))
  const setL = (k: string, v: any) => setLeaveForm(f => ({ ...f, [k]: v }))
  const setS = (k: string, v: any) => setShiftForm(f => ({ ...f, [k]: v }))

  const saveEmployee = async () => {
    if (!empForm.full_name || !empForm.client_id) { setError('Name and client are required'); return }
    setSaving(true)
    const { data, error } = await supabase.from('employees').insert({ ...empForm, user_id: user.id }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else { setEmployees(e => [data, ...e]); setEmpForm({ full_name: '', role: '', shift: 'Morning', client_id: '', status: 'Active' }); setShowEmployeeForm(false); setSaving(false) }
  }

  const saveAttendance = async () => {
    if (!attForm.employee_id || !attForm.date) { setError('Employee and date are required'); return }
    setSaving(true)
    const emp = employees.find(e => e.id === attForm.employee_id)
    const { data, error } = await supabase.from('attendance').insert({ ...attForm, client_id: emp?.client_id, user_id: user.id }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else { setAttendance(a => [data, ...a]); setAttForm({ employee_id: '', client_id: '', date: new Date().toISOString().split('T')[0], status: 'Present', notes: '' }); setShowAttendanceForm(false); setSaving(false) }
  }

  const saveLeave = async () => {
    if (!leaveForm.employee_id || !leaveForm.start_date) { setError('Employee and start date are required'); return }
    setSaving(true)
    const emp = employees.find(e => e.id === leaveForm.employee_id)
    const { data, error } = await supabase.from('leave_requests').insert({ ...leaveForm, client_id: emp?.client_id, user_id: user.id }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else { setLeaveRequests(l => [data, ...l]); setLeaveForm({ employee_id: '', client_id: '', start_date: '', end_date: '', type: 'Annual', reason: '', status: 'Pending' }); setShowLeaveForm(false); setSaving(false) }
  }

  const saveShift = async () => {
    if (!shiftForm.employee_id || !shiftForm.date) { setError('Employee and date are required'); return }
    setSaving(true)
    const emp = employees.find(e => e.id === shiftForm.employee_id)
    const { data, error } = await supabase.from('shift_changes').insert({ ...shiftForm, client_id: emp?.client_id, user_id: user.id }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else { setShiftChanges(s => [data, ...s]); setShiftForm({ employee_id: '', client_id: '', date: '', original_shift: '', requested_shift: '', reason: '', status: 'Pending' }); setShowShiftForm(false); setSaving(false) }
  }

  const updateLeaveStatus = async (id: string, status: string) => {
    await supabase.from('leave_requests').update({ status }).eq('id', id)
    setLeaveRequests(l => l.map(r => r.id === id ? { ...r, status } : r))
  }

  const updateShiftStatus = async (id: string, status: string) => {
    await supabase.from('shift_changes').update({ status }).eq('id', id)
    setShiftChanges(s => s.map(r => r.id === id ? { ...r, status } : r))
  }

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || '—'
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.full_name || '—'

  const filteredEmployees = selectedClient ? employees.filter(e => e.client_id === selectedClient) : employees

  const getAttendanceStats = (employeeId: string) => {
    const month = selectedMonth
    const records = attendance.filter(a => a.employee_id === employeeId && a.date?.startsWith(month))
    const total = records.length
    const present = records.filter(a => a.status === 'Present').length
    const absent = records.filter(a => a.status === 'Absent').length
    const late = records.filter(a => a.status === 'Late').length
    const score = total > 0 ? Math.round((present / total) * 100) : null
    return { total, present, absent, late, score }
  }

  const filteredAttendance = attendance.filter(a => {
    const clientMatch = selectedClient ? a.client_id === selectedClient : true
    const monthMatch = a.date?.startsWith(selectedMonth)
    return clientMatch && monthMatch
  })

  const filteredLeave = selectedClient ? leaveRequests.filter(l => l.client_id === selectedClient) : leaveRequests
  const filteredShifts = selectedClient ? shiftChanges.filter(s => s.client_id === selectedClient) : shiftChanges

  const statusColors: any = {
    Present: { bg: 'var(--accent-light)', color: 'var(--accent-text)' },
    Absent: { bg: 'var(--danger-light)', color: 'var(--danger)' },
    Late: { bg: 'var(--warning-light)', color: 'var(--warning)' },
    'Half Day': { bg: '#EDE9FA', color: '#4A3080' },
    Pending: { bg: 'var(--warning-light)', color: 'var(--warning)' },
    Approved: { bg: 'var(--accent-light)', color: 'var(--accent-text)' },
    Declined: { bg: 'var(--danger-light)', color: 'var(--danger)' },
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
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Attendance Tracker</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{filteredEmployees.length} employees · {filteredAttendance.filter(a => a.status === 'Absent').length} absent this month</div>
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
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '0 24px', display: 'flex', gap: 0 }}>
          {[
            { id: 'attendance', label: 'Daily Attendance' },
            { id: 'employees', label: 'Employees' },
            { id: 'leave', label: 'Leave Requests' },
            { id: 'shifts', label: 'Shift Changes' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: '10px 16px', borderRadius: 0, border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent', background: 'transparent', fontSize: 13, color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)', fontWeight: activeTab === tab.id ? 500 : 400, cursor: 'pointer' }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="primary" onClick={() => setShowAttendanceForm(true)}>+ Log Attendance</button>
              </div>
              {showAttendanceForm && (
                <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Log attendance</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={label}>Employee</label>
                      <select value={attForm.employee_id} onChange={e => setA('employee_id', e.target.value)}>
                        <option value="">Select employee</option>
                        {filteredEmployees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Date</label>
                      <input type="date" value={attForm.date} onChange={e => setA('date', e.target.value)} />
                    </div>
                    <div>
                      <label style={label}>Status</label>
                      <select value={attForm.status} onChange={e => setA('status', e.target.value)}>
                        <option>Present</option><option>Absent</option><option>Late</option><option>Half Day</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Notes</label>
                      <input value={attForm.notes} onChange={e => setA('notes', e.target.value)} placeholder="Optional notes" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowAttendanceForm(false)}>Cancel</button>
                    <button className="primary" onClick={saveAttendance} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                  </div>
                </div>
              )}
              <div style={card}>
                {filteredAttendance.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No attendance logged for this period</div>
                ) : filteredAttendance.map(record => {
                  const s = statusColors[record.status] || statusColors.Present
                  return (
                    <div key={record.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{getEmployeeName(record.employee_id)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{getClientName(record.client_id)} · {record.date ? new Date(record.date).toLocaleDateString() : '—'}</div>
                      </div>
                      {record.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{record.notes}</div>}
                      <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: s.bg, color: s.color }}>{record.status}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* EMPLOYEES TAB */}
          {activeTab === 'employees' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="primary" onClick={() => setShowEmployeeForm(true)}>+ Add Employee</button>
              </div>
              {showEmployeeForm && (
                <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Add employee</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={label}>Full name *</label>
                      <input value={empForm.full_name} onChange={e => setE('full_name', e.target.value)} placeholder="e.g. John Smith" />
                    </div>
                    <div>
                      <label style={label}>Client *</label>
                      <select value={empForm.client_id} onChange={e => setE('client_id', e.target.value)}>
                        <option value="">Select client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Role</label>
                      <input value={empForm.role} onChange={e => setE('role', e.target.value)} placeholder="e.g. Agent" />
                    </div>
                    <div>
                      <label style={label}>Shift</label>
                      <select value={empForm.shift} onChange={e => setE('shift', e.target.value)}>
                        <option>Morning</option><option>Afternoon</option><option>Night</option><option>Flexible</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Status</label>
                      <select value={empForm.status} onChange={e => setE('status', e.target.value)}>
                        <option>Active</option><option>Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowEmployeeForm(false)}>Cancel</button>
                    <button className="primary" onClick={saveEmployee} disabled={saving}>{saving ? 'Saving...' : 'Save employee'}</button>
                  </div>
                </div>
              )}

              {/* Employee cards with attendance stats */}
              {filteredEmployees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>No employees yet — add your first employee</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {filteredEmployees.map(emp => {
                    const stats = getAttendanceStats(emp.id)
                    return (
                      <div key={emp.id} style={{ ...card, padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--accent-text)', flexShrink: 0 }}>
                            {emp.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{emp.full_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.role || '—'} · {emp.shift} shift</div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: emp.status === 'Active' ? 'var(--accent-light)' : 'var(--bg-app)', color: emp.status === 'Active' ? 'var(--accent-text)' : 'var(--text-muted)' }}>{emp.status}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{getClientName(emp.client_id)}</div>
                        {stats.total > 0 ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Attendance score</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: (stats.score || 0) >= 90 ? 'var(--accent)' : (stats.score || 0) >= 75 ? 'var(--warning)' : 'var(--danger)' }}>{stats.score}%</span>
                            </div>
                            <div style={{ height: 5, background: 'var(--bg-app)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                              <div style={{ width: `${stats.score}%`, height: '100%', borderRadius: 3, background: (stats.score || 0) >= 90 ? 'var(--accent)' : (stats.score || 0) >= 75 ? '#D4930A' : 'var(--danger)' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                              {[
                                { label: 'Present', value: stats.present, color: 'var(--accent-text)', bg: 'var(--accent-light)' },
                                { label: 'Absent', value: stats.absent, color: 'var(--danger)', bg: 'var(--danger-light)' },
                                { label: 'Late', value: stats.late, color: 'var(--warning)', bg: 'var(--warning-light)' },
                              ].map(stat => (
                                <div key={stat.label} style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 8, background: stat.bg }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: stat.color }}>{stat.value}</div>
                                  <div style={{ fontSize: 10, color: stat.color }}>{stat.label}</div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>No attendance logged this month</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* LEAVE REQUESTS TAB */}
          {activeTab === 'leave' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="primary" onClick={() => setShowLeaveForm(true)}>+ Add Leave Request</button>
              </div>
              {showLeaveForm && (
                <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>New leave request</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={label}>Employee</label>
                      <select value={leaveForm.employee_id} onChange={e => setL('employee_id', e.target.value)}>
                        <option value="">Select employee</option>
                        {filteredEmployees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Leave type</label>
                      <select value={leaveForm.type} onChange={e => setL('type', e.target.value)}>
                        <option>Annual</option><option>Sick</option><option>Unpaid</option><option>Family</option><option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Start date</label>
                      <input type="date" value={leaveForm.start_date} onChange={e => setL('start_date', e.target.value)} />
                    </div>
                    <div>
                      <label style={label}>End date</label>
                      <input type="date" value={leaveForm.end_date} onChange={e => setL('end_date', e.target.value)} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={label}>Reason</label>
                      <textarea value={leaveForm.reason} onChange={e => setL('reason', e.target.value)} placeholder="Optional reason" rows={2} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowLeaveForm(false)}>Cancel</button>
                    <button className="primary" onClick={saveLeave} disabled={saving}>{saving ? 'Saving...' : 'Save request'}</button>
                  </div>
                </div>
              )}
              <div style={card}>
                {filteredLeave.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No leave requests yet</div>
                ) : filteredLeave.map(req => {
                  const s = statusColors[req.status] || statusColors.Pending
                  return (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{getEmployeeName(req.employee_id)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {req.type} · {req.start_date} → {req.end_date || 'TBD'}
                        </div>
                        {req.reason && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{req.reason}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                        <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: s.bg, color: s.color }}>{req.status}</span>
                        <select value={req.status} onChange={e => updateLeaveStatus(req.id, e.target.value)} style={{ fontSize: 11, padding: '3px 6px', width: 'auto' }}>
                          <option>Pending</option><option>Approved</option><option>Declined</option>
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* SHIFT CHANGES TAB */}
          {activeTab === 'shifts' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="primary" onClick={() => setShowShiftForm(true)}>+ Add Shift Change</button>
              </div>
              {showShiftForm && (
                <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Shift change request</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={label}>Employee</label>
                      <select value={shiftForm.employee_id} onChange={e => setS('employee_id', e.target.value)}>
                        <option value="">Select employee</option>
                        {filteredEmployees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Date</label>
                      <input type="date" value={shiftForm.date} onChange={e => setS('date', e.target.value)} />
                    </div>
                    <div>
                      <label style={label}>Original shift</label>
                      <select value={shiftForm.original_shift} onChange={e => setS('original_shift', e.target.value)}>
                        <option value="">Select shift</option>
                        <option>Morning</option><option>Afternoon</option><option>Night</option><option>Flexible</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Requested shift</label>
                      <select value={shiftForm.requested_shift} onChange={e => setS('requested_shift', e.target.value)}>
                        <option value="">Select shift</option>
                        <option>Morning</option><option>Afternoon</option><option>Night</option><option>Flexible</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={label}>Reason</label>
                      <textarea value={shiftForm.reason} onChange={e => setS('reason', e.target.value)} placeholder="Why the shift change?" rows={2} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowShiftForm(false)}>Cancel</button>
                    <button className="primary" onClick={saveShift} disabled={saving}>{saving ? 'Saving...' : 'Save request'}</button>
                  </div>
                </div>
              )}
              <div style={card}>
                {filteredShifts.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No shift change requests yet</div>
                ) : filteredShifts.map(req => {
                  const s = statusColors[req.status] || statusColors.Pending
                  return (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{getEmployeeName(req.employee_id)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {req.date} · {req.original_shift} → {req.requested_shift}
                        </div>
                        {req.reason && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{req.reason}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                        <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: s.bg, color: s.color }}>{req.status}</span>
                        <select value={req.status} onChange={e => updateShiftStatus(req.id, e.target.value)} style={{ fontSize: 11, padding: '3px 6px', width: 'auto' }}>
                          <option>Pending</option><option>Approved</option><option>Declined</option>
                        </select>
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