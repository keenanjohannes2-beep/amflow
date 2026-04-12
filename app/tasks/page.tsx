'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function TasksPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('All')
  const [form, setForm] = useState({ title: '', client_id: '', priority: 'Medium', deadline: '', status: 'Not Started', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name').eq('user_id', user.id),
      ])
      setTasks(t || [])
      setClients(c || [])
      setLoading(false)
    }
    init()
  }, [])

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.title) { setError('Task title is required'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('tasks').insert({
      ...form, user_id: user!.id, client_id: form.client_id || null,
    }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else {
      setTasks(t => [data, ...t])
      setForm({ title: '', client_id: '', priority: 'Medium', deadline: '', status: 'Not Started', notes: '' })
      setShowForm(false); setSaving(false)
    }
  }

  const toggleDone = async (task: any) => {
    const newStatus = task.status === 'Done' ? 'Not Started' : 'Done'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const filtered = tasks.filter(t => {
    if (filter === 'All') return true
    if (filter === 'Open') return t.status !== 'Done'
    if (filter === 'Done') return t.status === 'Done'
    if (filter === 'Overdue') return t.status !== 'Done' && t.deadline && new Date(t.deadline) < new Date()
    return true
  })

  const priorityStyles: any = {
    High: { bg: 'var(--danger-light)', color: 'var(--danger)' },
    Medium: { bg: 'var(--warning-light)', color: 'var(--warning)' },
    Low: { bg: 'var(--accent-light)', color: 'var(--accent-text)' },
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
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Tasks</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{tasks.filter(t => t.status !== 'Done').length} open · {tasks.filter(t => t.status === 'Done').length} done</div>
          </div>
          <button className="primary" onClick={() => setShowForm(true)}>+ Add Task</button>
        </div>
        <div style={{ padding: 24 }}>
          {showForm && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: 'var(--text-primary)' }}>New task</div>
              {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Task title *</label>
                  <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Prepare WBR deck" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client</label>
                  <select value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                    <option value="">No client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Priority</label>
                  <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                    <option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Deadline</label>
                  <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)}>
                    <option>Not Started</option><option>In Progress</option><option>Done</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
                  <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)}>Cancel</button>
                <button className="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save task'}</button>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['All', 'Open', 'Overdue', 'Done'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, borderColor: filter === f ? 'var(--accent)' : 'var(--border)', background: filter === f ? 'var(--accent-light)' : 'var(--bg-card)', color: filter === f ? 'var(--accent-text)' : 'var(--text-secondary)', fontWeight: filter === f ? 500 : 400 }}>
                {f}
              </button>
            ))}
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No tasks found</div>
            ) : filtered.map(task => {
              const isOverdue = task.status !== 'Done' && task.deadline && new Date(task.deadline) < new Date()
              const isDone = task.status === 'Done'
              const p = priorityStyles[task.priority] || priorityStyles.Medium
              return (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <div onClick={() => toggleDone(task)}
                    style={{ width: 16, height: 16, borderRadius: 4, border: isDone ? 'none' : '1px solid var(--border)', background: isDone ? 'var(--accent)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isDone && <svg width="10" height="10" viewBox="0 0 10 10" fill="white"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none"/></svg>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: isDone ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}>{task.title}</div>
                    <div style={{ fontSize: 11, color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', marginTop: 2 }}>
                      {getClientName(task.client_id)}{task.deadline ? ` · Due ${new Date(task.deadline).toLocaleDateString()}` : ''}{isOverdue ? ' · Overdue' : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: p.bg, color: p.color }}>{task.priority}</span>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}