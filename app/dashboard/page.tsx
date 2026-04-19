'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [scorecards, setScorecards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: c }, { data: t }, { data: s }] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('scorecards').select('*').eq('user_id', user.id),
      ])
      setClients(c || [])
      setTasks(t || [])
      setScorecards(s || [])
      setLoading(false)
    }
    init()
  }, [])

  const activeClients = clients.filter(c => c.status === 'Active')
  const monthlyRevenue = activeClients.reduce((sum, c) => sum + (c.monthly_retainer || 0), 0)
  const openTasks = tasks.filter(t => t.status !== 'Done')
  const overdueTasks = tasks.filter(t => t.status !== 'Done' && t.deadline && new Date(t.deadline) < new Date())
  const completedTasks = tasks.filter(t => t.status === 'Done')
  const getClientScore = (clientId: string) => {
    const s = scorecards.find(sc => sc.client_id === clientId)
    if (!s) return null
    return (s.satisfaction + s.communication + s.payment_reliability + s.workload_balance) / 4
  }
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 100
  const atRiskClients = activeClients.filter(c => {
    const score = getClientScore(c.id)
    return score !== null && score < 3
  })

  const getHealthScoreTrend = () => {
    if (scorecards.length === 0) return null
    const weeks = []
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const weekStart = d
      const weekScores = scorecards.filter(sc => {
        if (!sc.created_at) return false
        const scDate = new Date(sc.created_at)
        return scDate >= weekStart
      }).map(sc => (sc.satisfaction + sc.communication + sc.payment_reliability + sc.workload_balance) / 4)
      weeks.push(weekScores.length > 0 ? weekScores.reduce((a, b) => a + b, 0) / weekScores.length : null)
    }
    const validWeeks = weeks.filter(w => w !== null)
    if (validWeeks.length === 0) return null
    const avg = validWeeks.reduce((a, b) => a + b, 0) / validWeeks.length
    const trend = weeks[7] !== null && weeks[0] !== null ? weeks[7] - weeks[0] : 0
    return { weeks, avg, trend }
  }
  const healthTrend = getHealthScoreTrend()

  const getRevenueTrend = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const currentMonth = new Date().getMonth()
    const trend: number[] = []
    
    for (let i = 5; i >= 0; i--) {
      const monthIdx = (currentMonth - i + 12) % 12
      const monthClients = clients.filter(c => {
        if (!c.start_date) return false
        const start = new Date(c.start_date)
        return start.getMonth() === monthIdx && c.status === 'Active'
      })
      const revenue = monthClients.reduce((sum, c) => sum + (c.monthly_retainer || 0), 0)
      trend.push(revenue || (monthIdx === currentMonth ? monthlyRevenue : 0))
    }
    
    const maxRev = Math.max(...trend, 1)
    const avgRev = trend.reduce((a, b) => a + b, 0) / trend.length
    const trendDir = trend[5] >= trend[0] ? 'up' : 'down'
    const pctChange = trend[0] > 0 ? ((trend[5] - trend[0]) / trend[0] * 100).toFixed(0) : 0
    
    return { months, trend, maxRev, avgRev, trendDir, pctChange }
  }
  
  const revenueTrend = getRevenueTrend()

  const getInitials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const avatarColors = ['#D6F0E7', '#D6E8FA', '#FDF3D6', '#FBEAE8', '#EDE9FA']
  const textColors = ['#0A5C43', '#1A4A7A', '#7A5200', '#8B2A1E', '#4A3080']

  const getHealthPill = (score: number) => {
    if (score >= 4) return { label: 'Green', bg: 'var(--accent-light)', color: 'var(--accent-text)' }
    if (score >= 3) return { label: 'Amber', bg: 'var(--warning-light)', color: 'var(--warning)' }
    return { label: 'At risk', bg: 'var(--danger-light)', color: 'var(--danger)' }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
    </div>
  )

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12 }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar userEmail={user?.email || ''} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Topbar */}
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Dashboard</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{new Date().toDateString()}</div>
          </div>
          <button className="primary" onClick={() => router.push('/clients/new')}>+ Add Client</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Active clients', value: activeClients.length, sub: `${clients.length} total`, warn: false, badge: atRiskClients.length > 0 ? `${atRiskClients.length} at risk` : null, badgeWarn: atRiskClients.length > 0 },
              { 
                label: 'Monthly revenue', 
                value: `R${monthlyRevenue.toLocaleString()}`, 
                sub: revenueTrend.trendDir === 'up' ? `+${revenueTrend.pctChange}% vs 6mo ago` : `${revenueTrend.pctChange}% vs 6mo ago`,
                warn: revenueTrend.trendDir === 'down',
                chart: revenueTrend.trend,
                chartColor: revenueTrend.trendDir === 'up' ? 'var(--accent)' : 'var(--danger)'
              },
              { label: 'Tasks Completion', value: `${taskCompletionRate}%`, sub: `${completedTasks.length}/${tasks.length} done`, warn: taskCompletionRate < 50 },
              { label: 'Avg health score', value: scorecards.length ? (scorecards.reduce((s, sc) => s + (sc.satisfaction + sc.communication + sc.payment_reliability + sc.workload_balance) / 4, 0) / scorecards.length).toFixed(1) : '—', sub: 'across all clients', warn: false },
            ].map(m => (
              <div key={m.label} style={{ ...card, padding: '14px 16px' }}>
                {m.badge && (
                  <span style={{ fontSize: 9, fontWeight: 500, padding: '2px 6px', borderRadius: 4, background: m.badgeWarn ? 'var(--danger-light)' : 'var(--accent-light)', color: m.badgeWarn ? 'var(--danger)' : 'var(--accent)', marginBottom: 4, display: 'inline-block' }}>
                    {m.badge}
                  </span>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: 11, marginTop: 5, color: m.warn ? 'var(--danger)' : 'var(--accent)' }}>{m.sub}</div>
                {m.chart && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32, marginTop: 8 }}>
                    {(m.chart as number[]).map((v, i) => {
                      const h = m.chart ? (v / Math.max(...m.chart as number[], 1)) * 28 + 4 : 4
                      return (
                        <div key={i} style={{ 
                          flex: 1, 
                          height: h, 
                          background: m.chartColor, 
                          borderRadius: 2,
                          opacity: i === 5 ? 1 : 0.4,
                          transition: 'height 0.2s'
                        }} 
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 16, marginBottom: 16 }}>
            {/* Client Overview */}
            <div style={card}>
              <div style={{ padding: '13px 16px 10px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Client overview</span>
                <span onClick={() => router.push('/clients')} style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer' }}>View all</span>
              </div>
              {clients.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No clients yet —{' '}
                  <span onClick={() => router.push('/clients/new')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>add your first</span>
                </div>
              ) : clients.slice(0, 5).map((client, i) => {
                const score = getClientScore(client.id)
                const pill = score ? getHealthPill(score) : null
                return (
                  <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColors[i % 5], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: textColors[i % 5], flexShrink: 0 }}>
                      {getInitials(client.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{client.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{client.industry}</div>
                    </div>
                    {pill && <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: pill.bg, color: pill.color }}>{pill.label}</span>}
                    {!pill && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'var(--bg-app)', color: 'var(--text-muted)' }}>{client.status}</span>}
                  </div>
                )
              })}
            </div>

            {/* Health Scorecard */}
            <div style={card}>
              <div style={{ padding: '13px 16px 10px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Health scorecard</span>
                <span onClick={() => router.push('/scorecard')} style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer' }}>Details</span>
              </div>
              {scorecards.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No scorecard data yet</div>
              ) : ['satisfaction', 'communication', 'payment_reliability', 'workload_balance'].map(key => {
                const avg = scorecards.reduce((s, sc) => s + (sc[key] || 0), 0) / scorecards.length
                const label: any = { satisfaction: 'Satisfaction', communication: 'Communication', payment_reliability: 'Payment', workload_balance: 'Workload' }[key]
                const color = avg >= 4 ? 'var(--accent)' : avg >= 3 ? '#D4930A' : 'var(--danger)'
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 100, flexShrink: 0 }}>{label}</span>
                    <div style={{ flex: 1, height: 5, background: 'var(--bg-app)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(avg / 5) * 100}%`, height: '100%', background: color, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500, width: 22, textAlign: 'right', color: 'var(--text-primary)' }}>{avg.toFixed(1)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Open Tasks */}
          <div style={card}>
            <div style={{ padding: '13px 16px 10px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Open tasks</span>
              <span onClick={() => router.push('/tasks')} style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer' }}>View all</span>
            </div>
            {openTasks.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No open tasks</div>
            ) : openTasks.slice(0, 5).map(task => {
              const client = clients.find(c => c.id === task.client_id)
              const isOverdue = task.deadline && new Date(task.deadline) < new Date()
              const pColors: any = { High: { bg: 'var(--danger-light)', color: 'var(--danger)' }, Medium: { bg: 'var(--warning-light)', color: 'var(--warning)' }, Low: { bg: 'var(--accent-light)', color: 'var(--accent-text)' } }
              const p = pColors[task.priority] || pColors.Medium
              return (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, border: '1px solid var(--border)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{task.title}</div>
                    <div style={{ fontSize: 11, color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {client?.name}{task.deadline ? ` · Due ${new Date(task.deadline).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: p.bg, color: p.color }}>{task.priority}</span>
                </div>
              )
            })}
          </div>

          {scorecards.length > 0 && (
            <div style={card}>
              <div style={{ padding: '13px 16px 10px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Health Score Breakdown</span>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Overall Score Distribution</div>
                    {['satisfaction', 'communication', 'payment_reliability', 'workload_balance'].map(key => {
                      const labelMap: any = { satisfaction: 'Satisfaction', communication: 'Communication', payment_reliability: 'Payment', workload_balance: 'Workload' }
                      const avg = scorecards.reduce((sum, s) => sum + (s[key] || 0), 0) / scorecards.length
                      const lowCount = scorecards.filter(s => s[key] < 3).length
                      const lowPercent = scorecards.length > 0 ? lowCount / scorecards.length : 0
                      const gradientDeg = lowPercent < 0.5 ? 180 : Math.min(360, lowPercent * 360)
                      const getColor = (v: number) => v >= 4 ? 'var(--accent)' : v >= 3 ? '#D4930A' : 'var(--danger)'
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{ width: 60, height: 60, borderRadius: '50%', position: 'relative', background: `conic-gradient(var(--danger) 0deg ${gradientDeg}deg, #D4930A 0deg 180deg, var(--accent) 180deg 360deg)`, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{labelMap[key]}</div>
                            <div style={{ fontSize: 18, fontWeight: 600, color: getColor(avg) }}>{avg.toFixed(1)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {clients.filter(c => scorecards.some(s => s.client_id === c.id)).map(client => {
                    const s = scorecards.find(sc => sc.client_id === client.id)
                    if (!s) return null
                    const avg = (s.satisfaction + s.communication + s.payment_reliability + s.workload_balance) / 4
                    const getColor = (v: number) => v >= 4 ? 'var(--accent)' : v >= 3 ? '#D4930A' : 'var(--danger)'
                    return (
                      <div key={s.id} style={{ flex: 1, minWidth: 280, padding: 12, background: 'var(--bg-app)', borderRadius: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>{client.name}</div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ width: 60, height: 60, borderRadius: '50%', background: `conic-gradient(var(--danger) 0deg ${s.payment_reliability < 3 ? 90 : 180}deg, #D4930A 0deg 180deg, var(--accent) 180deg 360deg)`, flexShrink: 0 }} />
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 16px' }}>
                            <div><span style={{ fontSize: 10 }}>Sat</span><div style={{ fontSize: 14, fontWeight: 600, color: getColor(s.satisfaction) }}>{s.satisfaction}</div></div>
                            <div><span style={{ fontSize: 10 }}>Comms</span><div style={{ fontSize: 14, fontWeight: 600, color: getColor(s.communication) }}>{s.communication}</div></div>
                            <div><span style={{ fontSize: 10 }}>Pay</span><div style={{ fontSize: 14, fontWeight: 600, color: getColor(s.payment_reliability) }}>{s.payment_reliability}</div></div>
                            <div><span style={{ fontSize: 10 }}>Wkld</span><div style={{ fontSize: 14, fontWeight: 600, color: getColor(s.workload_balance) }}>{s.workload_balance}</div></div>
                          </div>
                          <div style={{ marginLeft: 'auto', textAlign: 'center', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 8 }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Avg</div>
                            <div style={{ fontSize: 18, fontWeight: 600, color: getColor(avg) }}>{avg.toFixed(1)}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}