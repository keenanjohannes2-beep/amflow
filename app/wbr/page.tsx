'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const taStyle: any = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: 13, outline: 'none',
  resize: 'vertical', fontFamily: 'system-ui, sans-serif',
  background: 'var(--bg-input)', color: 'var(--text-primary)', lineHeight: 1.6,
}

interface SectionProps {
  title: string; value: string; onChange: (v: string) => void; rows?: number
}
function WBRSection({ title, value, onChange, rows = 3 }: SectionProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>{title}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} style={taStyle} />
    </div>
  )
}

const CREATOR_NAME = 'Keenan Johannes'
const CREATOR_EMAIL = 'keenanjohannes2@gmail.com'

export default function WBRPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [wbrs, setWbrs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1)
    return d.toISOString().split('T')[0]
  })
  const [pulling, setPulling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'view' | 'export'>('view')
  const [selectedWBR, setSelectedWBR] = useState<any>(null)

  const [form, setForm] = useState({
    client_id: '', week_start: '',
    attendance_summary: '', attendance_breakdown: '',
    health_summary: '', kpi_summary: '', escalations_summary: '',
    deliverables: '', key_metrics: '', wins: '',
    challenges: '', action_items: '', next_week_focus: '',
  })

  const setField = useCallback((key: string) => (value: string) => {
    setForm(f => ({ ...f, [key]: value }))
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: w }, { data: c }] = await Promise.all([
        supabase.from('wbr').select('*').eq('user_id', user.id).order('week_start', { ascending: false }),
        supabase.from('clients').select('id, name').eq('user_id', user.id),
      ])
      setWbrs(w || [])
      setClients(c || [])
      setLoading(false)
    }
    init()
  }, [])

  const getWeekEnd = (start: string) => {
    const d = new Date(start); d.setDate(d.getDate() + 6)
    return d.toISOString().split('T')[0]
  }

  const pullData = async () => {
    if (!selectedClient || !weekStart) { setError('Please select a client and week'); return }
    setPulling(true); setError('')
    const weekEnd = getWeekEnd(weekStart)
    const [
      { data: employees }, { data: attendance }, { data: scorecard },
      { data: kpiTemplates }, { data: kpiRecords }, { data: issues },
    ] = await Promise.all([
      supabase.from('employees').select('*').eq('user_id', user.id).eq('client_id', selectedClient),
      supabase.from('attendance').select('*').eq('user_id', user.id).eq('client_id', selectedClient).gte('date', weekStart).lte('date', weekEnd),
      supabase.from('scorecards').select('*').eq('user_id', user.id).eq('client_id', selectedClient).order('created_at', { ascending: false }).limit(1),
      supabase.from('kpi_templates').select('*').eq('user_id', user.id).eq('client_id', selectedClient),
      supabase.from('kpi_records').select('*').eq('user_id', user.id).eq('client_id', selectedClient).gte('date', weekStart).lte('date', weekEnd),
      supabase.from('issues').select('*').eq('user_id', user.id).eq('client_id', selectedClient).neq('status', 'Resolved'),
    ])
    const present = attendance?.filter(a => a.status === 'Present').length || 0
    const absent = attendance?.filter(a => a.status === 'Absent').length || 0
    const late = attendance?.filter(a => a.status === 'Late').length || 0
    const halfDay = attendance?.filter(a => a.status === 'Half Day').length || 0
    const total = attendance?.length || 0
    const score = total > 0 ? Math.round((present / total) * 100) : 0
    const attSummary = `Present: ${present} | Absent: ${absent} | Late: ${late} | Half Day: ${halfDay} | Attendance Score: ${score}%`
    const breakdown = employees?.map(emp => {
      const r = attendance?.filter(a => a.employee_id === emp.id) || []
      const p = r.filter(a => a.status === 'Present').length
      const ab = r.filter(a => a.status === 'Absent').length
      const la = r.filter(a => a.status === 'Late').length
      const sc = r.length > 0 ? Math.round((p / r.length) * 100) : 0
      return `${emp.full_name} (${emp.role || 'Agent'}): Present ${p}, Absent ${ab}, Late ${la} — ${sc}%`
    }).join('\n') || 'No employee data available'
    let healthSummary = 'No scorecard data available'
    if (scorecard && scorecard.length > 0) {
      const sc = scorecard[0]
      const avg = ((sc.satisfaction + sc.communication + sc.payment_reliability + sc.workload_balance) / 4).toFixed(1)
      healthSummary = `Overall: ${avg}/5\nSatisfaction: ${sc.satisfaction}/5 | Communication: ${sc.communication}/5 | Payment Reliability: ${sc.payment_reliability}/5 | Workload Balance: ${sc.workload_balance}/5`
    }
    let kpiSummary = 'No KPI data for this week'
    if (kpiTemplates && kpiTemplates.length > 0 && kpiRecords && kpiRecords.length > 0) {
      kpiSummary = kpiTemplates.map(tmpl => {
        const recs = kpiRecords.filter(r => r.template_id === tmpl.id)
        if (recs.length === 0) return `${tmpl.metric_name}: No data`
        const tot = recs.reduce((s, r) => s + r.value, 0)
        const avg = (tot / recs.length).toFixed(1)
        const target = tmpl.target ? ` (Target: ${tmpl.target}${tmpl.unit ? ' ' + tmpl.unit : ''})` : ''
        return `${tmpl.metric_name}: ${tot.toLocaleString()}${tmpl.unit ? ' ' + tmpl.unit : ''} | Avg: ${avg}${target}`
      }).join('\n')
    }
    let escalationsSummary = 'No open escalations'
    if (issues && issues.length > 0) {
      escalationsSummary = issues.map(i => `[${i.severity}] ${i.description?.slice(0, 80)}${i.description?.length > 80 ? '...' : ''} — ${i.status}`).join('\n')
    }
    setForm({
      client_id: selectedClient, week_start: weekStart,
      attendance_summary: attSummary, attendance_breakdown: breakdown,
      health_summary: healthSummary, kpi_summary: kpiSummary,
      escalations_summary: escalationsSummary,
      deliverables: '', key_metrics: '', wins: '',
      challenges: '', action_items: '', next_week_focus: '',
    })
    setShowForm(true); setPulling(false)
  }

  const handleSave = async () => {
    if (!form.client_id) { setError('Please pull data first'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('wbr').insert({ ...form, user_id: user!.id, archived: false }).select().single()
    if (error) { setError(error.message); setSaving(false) }
    else { setWbrs(w => [data, ...w]); setShowForm(false); setSaving(false); setError('') }
  }

  const archiveWBR = async (id: string) => {
    await supabase.from('wbr').update({ archived: true }).eq('id', id)
    setWbrs(w => w.map(r => r.id === id ? { ...r, archived: true } : r))
  }

  const restoreWBR = async (id: string) => {
    await supabase.from('wbr').update({ archived: false }).eq('id', id)
    setWbrs(w => w.map(r => r.id === id ? { ...r, archived: false } : r))
  }

  const exportWBRPPT = async (wbr: any) => {
    setExportingId(wbr.id)
    const pptxgen = (await import('pptxgenjs')).default
    const client = clients.find(c => c.id === wbr.client_id)
    const pptx = new pptxgen()
    pptx.layout = 'LAYOUT_WIDE'
    const GREEN = '1D9E75'
    const DARK = '2C2A25'
    const MUTED = '9E9B94'
    const WHITE = 'FFFFFF'
    const LIGHT = 'F0EEE8'
    const weekLabel = wbr.week_start ? new Date(wbr.week_start).toLocaleDateString() : '—'

    const addHeader = (slide: any, title: string, accent: string = GREEN) => {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.1, fill: { color: accent } })
      slide.addText('AMflow — Weekly Business Review', { x: 0.4, y: 0.12, w: 8, h: 0.35, fontSize: 9, color: WHITE, bold: false })
      slide.addText(title, { x: 0.4, y: 0.48, w: 9, h: 0.45, fontSize: 20, bold: true, color: WHITE })
      slide.addText(`${client?.name || '—'} · Week of ${weekLabel}`, { x: 0.4, y: 0.82, w: 9, h: 0.22, fontSize: 9, color: WHITE })
      slide.addText(new Date().toDateString(), { x: 9.5, y: 0.82, w: 3, h: 0.22, fontSize: 9, color: WHITE, align: 'right' })
    }

    const addWatermark = (slide: any) => {
      slide.addText(`Created by ${CREATOR_NAME} · ${CREATOR_EMAIL}`, {
        x: 0, y: 6.8, w: '100%', h: 0.3,
        fontSize: 8, color: MUTED, align: 'center', italic: true,
      })
    }

    const addFooter = (slide: any) => {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.0, w: '100%', h: 0.1, fill: { color: GREEN } })
    }

    // Slide 1 — Cover (with watermark)
    const cover = pptx.addSlide()
    cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: GREEN } })
    cover.addShape(pptx.ShapeType.rect, { x: 0, y: 5.5, w: '100%', h: 2.0, fill: { color: '178a63' } })
    cover.addText('AMflow', { x: 1, y: 1.0, w: 10, h: 0.6, fontSize: 13, color: WHITE, bold: false })
    cover.addText('Weekly Business Review', { x: 1, y: 1.7, w: 10, h: 0.9, fontSize: 36, bold: true, color: WHITE })
    cover.addText(client?.name || '—', { x: 1, y: 2.8, w: 10, h: 0.6, fontSize: 24, color: WHITE })
    cover.addText(`Week of ${weekLabel}`, { x: 1, y: 3.5, w: 10, h: 0.4, fontSize: 14, color: WHITE })
    cover.addText(new Date().toDateString(), { x: 1, y: 4.0, w: 10, h: 0.35, fontSize: 12, color: WHITE })
    cover.addText(`Created by ${CREATOR_NAME}`, { x: 1, y: 5.7, w: 10, h: 0.3, fontSize: 10, color: WHITE, italic: true })
    cover.addText(CREATOR_EMAIL, { x: 1, y: 6.05, w: 10, h: 0.3, fontSize: 10, color: WHITE, italic: true })

    // Slide 2 — Attendance Summary
    const attSlide = pptx.addSlide()
    addHeader(attSlide, '1 · Attendance', GREEN)
    if (wbr.attendance_summary) {
      const parts = wbr.attendance_summary.split('|').map((s: string) => s.trim())
      parts.forEach((part: string, i: number) => {
        const [label, val] = part.split(':').map((s: string) => s.trim())
        const col = i % 3
        const row = Math.floor(i / 3)
        const x = 0.4 + col * 4.2
        const y = 1.3 + row * 1.4
        attSlide.addShape(pptx.ShapeType.rect, { x, y, w: 3.8, h: 1.1, fill: { color: LIGHT }, line: { color: 'D8D5CC', width: 0.5 } })
        attSlide.addText(val || '—', { x, y: y + 0.1, w: 3.8, h: 0.55, fontSize: 28, bold: true, color: GREEN, align: 'center' })
        attSlide.addText(label || '', { x, y: y + 0.65, w: 3.8, h: 0.3, fontSize: 10, color: MUTED, align: 'center' })
      })
    }
    if (wbr.attendance_breakdown) {
      attSlide.addText('Employee Breakdown', { x: 0.4, y: 4.2, w: 12, h: 0.3, fontSize: 11, bold: true, color: DARK })
      const lines = wbr.attendance_breakdown.split('\n').slice(0, 6)
      lines.forEach((line: string, i: number) => {
        attSlide.addText(`• ${line}`, { x: 0.4, y: 4.6 + i * 0.38, w: 12, h: 0.32, fontSize: 10, color: DARK })
      })
    }
    addFooter(attSlide)

    // Slide 3 — Health Scorecard
    const healthSlide = pptx.addSlide()
    addHeader(healthSlide, '2 · Health Scorecard', '1A4A7A')
    if (wbr.health_summary) {
      const lines = wbr.health_summary.split('\n')
      const overall = lines[0] || ''
      const details = lines[1] || ''
      healthSlide.addText(overall, { x: 0.4, y: 1.3, w: 12, h: 0.6, fontSize: 22, bold: true, color: '1A4A7A' })
      const metrics = details.split('|').map((s: string) => s.trim())
      metrics.forEach((metric: string, i: number) => {
        const [label, val] = metric.split(':').map((s: string) => s.trim())
        const score = parseFloat(val) || 0
        const x = 0.4 + (i % 2) * 6.3
        const y = 2.1 + Math.floor(i / 2) * 1.5
        healthSlide.addShape(pptx.ShapeType.rect, { x, y, w: 5.8, h: 1.1, fill: { color: LIGHT }, line: { color: 'D8D5CC', width: 0.5 } })
        healthSlide.addText(label || '', { x: x + 0.15, y: y + 0.1, w: 4, h: 0.3, fontSize: 10, color: MUTED })
        healthSlide.addText(val || '—', { x: x + 0.15, y: y + 0.42, w: 2, h: 0.4, fontSize: 18, bold: true, color: score >= 4 ? GREEN : score >= 3 ? 'D4930A' : 'C0392B' })
        healthSlide.addShape(pptx.ShapeType.rect, { x: x + 0.15, y: y + 0.82, w: 5.4, h: 0.14, fill: { color: 'D8D5CC' } })
        healthSlide.addShape(pptx.ShapeType.rect, { x: x + 0.15, y: y + 0.82, w: Math.min((score / 5) * 5.4, 5.4), h: 0.14, fill: { color: score >= 4 ? GREEN : score >= 3 ? 'D4930A' : 'C0392B' } })
      })
    }
    addFooter(healthSlide)

    // Slide 4 — Performance KPIs
    const kpiSlide = pptx.addSlide()
    addHeader(kpiSlide, '3 · Performance KPIs', '7A5200')
    if (wbr.kpi_summary && wbr.kpi_summary !== 'No KPI data for this week') {
      const lines = wbr.kpi_summary.split('\n')
      lines.forEach((line: string, i: number) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const x = 0.4 + col * 6.3
        const y = 1.3 + row * 1.4
        if (y > 6.5) return
        const [name, rest] = line.split(':').map((s: string) => s.trim())
        kpiSlide.addShape(pptx.ShapeType.rect, { x, y, w: 5.8, h: 1.1, fill: { color: LIGHT }, line: { color: 'D8D5CC', width: 0.5 } })
        kpiSlide.addText(name || '', { x: x + 0.15, y: y + 0.08, w: 5.4, h: 0.28, fontSize: 10, color: MUTED })
        kpiSlide.addText(rest || '—', { x: x + 0.15, y: y + 0.38, w: 5.4, h: 0.55, fontSize: 11, bold: false, color: DARK })
      })
    } else {
      kpiSlide.addText('No KPI data logged for this week', { x: 0.4, y: 2.5, w: 12, h: 0.4, fontSize: 14, color: MUTED, align: 'center' })
    }
    addFooter(kpiSlide)

    // Slide 5 — Escalations
    const escSlide = pptx.addSlide()
    addHeader(escSlide, '4 · Escalations & Issues', 'C0392B')
    if (wbr.escalations_summary && wbr.escalations_summary !== 'No open escalations') {
      const lines = wbr.escalations_summary.split('\n')
      lines.slice(0, 5).forEach((line: string, i: number) => {
        const y = 1.3 + i * 1.0
        escSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 12.2, h: 0.8, fill: { color: 'FBEAE8' }, line: { color: 'F5C4B3', width: 0.5 } })
        escSlide.addText(line, { x: 0.6, y: y + 0.15, w: 11.8, h: 0.5, fontSize: 10, color: DARK })
      })
    } else {
      escSlide.addShape(pptx.ShapeType.rect, { x: 2, y: 2.5, w: 9, h: 1.2, fill: { color: 'D6F0E7' }, line: { color: '9FE1CB', width: 0.5 } })
      escSlide.addText('No open escalations — all clear!', { x: 2, y: 2.85, w: 9, h: 0.5, fontSize: 16, bold: true, color: GREEN, align: 'center' })
    }
    addFooter(escSlide)

    // Slide 6 — Deliverables & Wins
    const outSlide = pptx.addSlide()
    addHeader(outSlide, '5 · Deliverables & Wins', '4A3080')
    const leftItems = [
      { label: 'Deliverables Completed', value: wbr.deliverables },
      { label: 'Key Metrics', value: wbr.key_metrics },
    ]
    const rightItems = [
      { label: 'Wins', value: wbr.wins },
      { label: 'Challenges', value: wbr.challenges },
    ]
    leftItems.forEach(({ label, value }, i) => {
      if (!value) return
      const y = 1.3 + i * 2.5
      outSlide.addText(label.toUpperCase(), { x: 0.4, y, w: 5.8, h: 0.25, fontSize: 8, color: MUTED })
      outSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y: y + 0.28, w: 5.8, h: 1.9, fill: { color: LIGHT }, line: { color: 'D8D5CC', width: 0.5 } })
      outSlide.addText(value, { x: 0.55, y: y + 0.38, w: 5.5, h: 1.7, fontSize: 10, color: DARK })
    })
    rightItems.forEach(({ label, value }, i) => {
      if (!value) return
      const y = 1.3 + i * 2.5
      outSlide.addText(label.toUpperCase(), { x: 6.8, y, w: 5.8, h: 0.25, fontSize: 8, color: MUTED })
      outSlide.addShape(pptx.ShapeType.rect, { x: 6.8, y: y + 0.28, w: 5.8, h: 1.9, fill: { color: LIGHT }, line: { color: 'D8D5CC', width: 0.5 } })
      outSlide.addText(value, { x: 6.95, y: y + 0.38, w: 5.5, h: 1.7, fontSize: 10, color: DARK })
    })
    addFooter(outSlide)

    // Slide 7 — Action Items & Next Week
    const actionSlide = pptx.addSlide()
    addHeader(actionSlide, '6 · Action Items & Next Steps', '4A3080')
    if (wbr.action_items) {
      actionSlide.addText('ACTION ITEMS', { x: 0.4, y: 1.3, w: 12, h: 0.25, fontSize: 8, color: MUTED })
      const actions = wbr.action_items.split('\n')
      actions.slice(0, 6).forEach((action: string, i: number) => {
        actionSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.65 + i * 0.65, w: 12.2, h: 0.5, fill: { color: LIGHT }, line: { color: 'D8D5CC', width: 0.5 } })
        actionSlide.addText(`• ${action}`, { x: 0.6, y: 1.72 + i * 0.65, w: 11.8, h: 0.36, fontSize: 10, color: DARK })
      })
    }
    if (wbr.next_week_focus) {
      const startY = wbr.action_items ? 5.6 : 1.5
      actionSlide.addText('NEXT WEEK FOCUS', { x: 0.4, y: startY, w: 12, h: 0.25, fontSize: 8, color: MUTED })
      actionSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y: startY + 0.28, w: 12.2, h: 0.8, fill: { color: 'D6F0E7' }, line: { color: '9FE1CB', width: 0.5 } })
      actionSlide.addText(wbr.next_week_focus, { x: 0.6, y: startY + 0.42, w: 11.8, h: 0.52, fontSize: 11, color: '0A5C43', bold: true })
    }
    addFooter(actionSlide)

    // Slide 8 — Closing (with watermark)
    const closing = pptx.addSlide()
    closing.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: GREEN } })
    closing.addShape(pptx.ShapeType.rect, { x: 0, y: 5.2, w: '100%', h: 2.5, fill: { color: '178a63' } })
    closing.addText('Thank you', { x: 1, y: 1.5, w: 10, h: 0.8, fontSize: 40, bold: true, color: WHITE, align: 'center' })
    closing.addText(`${client?.name || '—'} · Week of ${weekLabel}`, { x: 1, y: 2.5, w: 10, h: 0.4, fontSize: 16, color: WHITE, align: 'center' })
    closing.addText('Prepared by AMflow', { x: 1, y: 3.2, w: 10, h: 0.35, fontSize: 12, color: WHITE, align: 'center' })
    closing.addText(`Created by ${CREATOR_NAME}`, { x: 1, y: 5.4, w: 10, h: 0.3, fontSize: 10, color: WHITE, italic: true, align: 'center' })
    closing.addText(`Contact: ${CREATOR_EMAIL}`, { x: 1, y: 5.75, w: 10, h: 0.3, fontSize: 10, color: WHITE, italic: true, align: 'center' })
    closing.addText('For support, suggestions or troubleshooting — reach out anytime.', { x: 1, y: 6.15, w: 10, h: 0.3, fontSize: 9, color: WHITE, italic: true, align: 'center' })

    const clientName = client?.name?.replace(/\s+/g, '_') || 'Client'
    pptx.writeFile({ fileName: `WBR_${clientName}_${wbr.week_start}.pptx` })
    setExportingId(null)
  }

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || '—'
  const getInitials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const avatarColors = ['#D6F0E7', '#D6E8FA', '#FDF3D6', '#FBEAE8', '#EDE9FA']
  const textColors = ['#0A5C43', '#1A4A7A', '#7A5200', '#8B2A1E', '#4A3080']

  const activeWBRs = wbrs.filter(w => !w.archived)
  const archivedWBRs = wbrs.filter(w => w.archived)
  const displayWBRs = showArchived ? archivedWBRs : activeWBRs
  const filtered = displayWBRs.filter(w => filter ? w.client_id === filter : true)

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
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Weekly Business Reviews</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{activeWBRs.length} active · {archivedWBRs.length} archived</div>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* Pull Data Panel */}
          {!showForm && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Create New WBR</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Select a client and week — AMflow will automatically pull attendance, health scores, KPIs and escalations.</div>
              {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
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
                <button className="primary" onClick={pullData} disabled={pulling} style={{ whiteSpace: 'nowrap', padding: '9px 20px' }}>
                  {pulling ? 'Pulling data...' : '⬇ Pull Data'}
                </button>
              </div>
            </div>
          )}

          {/* WBR Form */}
          {showForm && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {getClientName(form.client_id)} — Week of {form.week_start ? new Date(form.week_start).toLocaleDateString() : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>All fields are editable — review before saving</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
                  <button className="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save WBR'}</button>
                </div>
              </div>
              {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 16 }}>{error}</p>}
              <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 16, marginBottom: 16, borderLeft: '3px solid var(--accent)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>1 · Attendance</div>
                <WBRSection title="Weekly Summary" value={form.attendance_summary} onChange={setField('attendance_summary')} rows={2} />
                <WBRSection title="Employee Breakdown" value={form.attendance_breakdown} onChange={setField('attendance_breakdown')} rows={5} />
              </div>
              <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 16, marginBottom: 16, borderLeft: '3px solid #1A4A7A' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1A4A7A', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>2 · Health Scorecard</div>
                <WBRSection title="Scorecard Summary" value={form.health_summary} onChange={setField('health_summary')} rows={3} />
              </div>
              <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 16, marginBottom: 16, borderLeft: '3px solid #7A5200' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#7A5200', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>3 · Performance KPIs</div>
                <WBRSection title="KPI Results" value={form.kpi_summary} onChange={setField('kpi_summary')} rows={4} />
              </div>
              <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 16, marginBottom: 16, borderLeft: '3px solid var(--danger)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>4 · Escalations & Issues</div>
                <WBRSection title="Open Issues" value={form.escalations_summary} onChange={setField('escalations_summary')} rows={3} />
              </div>
              <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 16, borderLeft: '3px solid #4A3080' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#4A3080', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>5 · Outcomes & Actions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <WBRSection title="Deliverables Completed" value={form.deliverables} onChange={setField('deliverables')} rows={3} />
                  <WBRSection title="Key Metrics" value={form.key_metrics} onChange={setField('key_metrics')} rows={3} />
                  <WBRSection title="Wins" value={form.wins} onChange={setField('wins')} rows={3} />
                  <WBRSection title="Challenges" value={form.challenges} onChange={setField('challenges')} rows={3} />
                  <WBRSection title="Action Items" value={form.action_items} onChange={setField('action_items')} rows={3} />
                  <WBRSection title="Next Week Focus" value={form.next_week_focus} onChange={setField('next_week_focus')} rows={3} />
                </div>
              </div>
            </div>
          )}

          {/* Filters & Archive toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setFilter('')}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, borderColor: filter === '' ? 'var(--accent)' : 'var(--border)', background: filter === '' ? 'var(--accent-light)' : 'var(--bg-card)', color: filter === '' ? 'var(--accent-text)' : 'var(--text-secondary)', fontWeight: filter === '' ? 500 : 400 }}>
                All clients
              </button>
              {clients.map(c => (
                <button key={c.id} onClick={() => setFilter(c.id)}
                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, borderColor: filter === c.id ? 'var(--accent)' : 'var(--border)', background: filter === c.id ? 'var(--accent-light)' : 'var(--bg-card)', color: filter === c.id ? 'var(--accent-text)' : 'var(--text-secondary)', fontWeight: filter === c.id ? 500 : 400 }}>
                  {c.name}
                </button>
              ))}
            </div>
            <button onClick={() => setShowArchived(!showArchived)}
              style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, borderColor: showArchived ? 'var(--warning)' : 'var(--border)', background: showArchived ? 'var(--warning-light)' : 'var(--bg-card)', color: showArchived ? 'var(--warning)' : 'var(--text-secondary)' }}>
              {showArchived ? '← Active WBRs' : `📦 Archived (${archivedWBRs.length})`}
            </button>
          </div>

          {/* WBR List */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>
              {showArchived ? 'No archived WBRs yet' : 'No reviews yet — create your first WBR above'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((wbr, i) => (
                <div key={wbr.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColors[i % 5], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: textColors[i % 5], flexShrink: 0 }}>
                      {getInitials(getClientName(wbr.client_id))}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{getClientName(wbr.client_id)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Week of {wbr.week_start ? new Date(wbr.week_start).toLocaleDateString() : '—'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => { setSelectedWBR(wbr); setActiveTab('export') }}
                        style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, background: 'var(--accent-light)', color: 'var(--accent-text)', borderColor: 'var(--accent)' }}>
                        ↓ Export PPT
                      </button>
                      {wbr.archived ? (
                        <button onClick={() => restoreWBR(wbr.id)}
                          style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, background: 'var(--accent-light)', color: 'var(--accent-text)', borderColor: 'var(--accent)' }}>
                          Restore
                        </button>
                      ) : (
                        <button onClick={() => archiveWBR(wbr.id)}
                          style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, background: 'var(--warning-light)', color: 'var(--warning)', borderColor: 'var(--warning)' }}>
                          Archive
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-app)' }}>
                    {(['view', 'export'] as const).map(tab => (
                      <button key={tab} onClick={() => { setActiveTab(tab); setSelectedWBR(wbr) }}
                        style={{ padding: '8px 16px', borderRadius: 0, border: 'none', borderBottom: (activeTab === tab && selectedWBR?.id === wbr.id) ? '2px solid var(--accent)' : '2px solid transparent', background: 'transparent', fontSize: 12, color: (activeTab === tab && selectedWBR?.id === wbr.id) ? 'var(--accent)' : 'var(--text-muted)', fontWeight: (activeTab === tab && selectedWBR?.id === wbr.id) ? 500 : 400, cursor: 'pointer' }}>
                        {tab === 'view' ? 'View' : 'Export'}
                      </button>
                    ))}
                  </div>

                  {/* View Tab */}
                  {(activeTab === 'view' || selectedWBR?.id !== wbr.id) && (
                    <div style={{ padding: 20 }}>
                      {(wbr.attendance_summary || wbr.attendance_breakdown) && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Attendance</div>
                          {wbr.attendance_summary && <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4, fontWeight: 500 }}>{wbr.attendance_summary}</div>}
                          {wbr.attendance_breakdown && <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line', background: 'var(--bg-app)', borderRadius: 6, padding: '8px 10px' }}>{wbr.attendance_breakdown}</div>}
                        </div>
                      )}
                      {wbr.health_summary && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#1A4A7A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Health Scorecard</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line', background: 'var(--bg-app)', borderRadius: 6, padding: '8px 10px' }}>{wbr.health_summary}</div>
                        </div>
                      )}
                      {wbr.kpi_summary && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#7A5200', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Performance KPIs</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line', background: 'var(--bg-app)', borderRadius: 6, padding: '8px 10px' }}>{wbr.kpi_summary}</div>
                        </div>
                      )}
                      {wbr.escalations_summary && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Escalations</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line', background: 'var(--bg-app)', borderRadius: 6, padding: '8px 10px' }}>{wbr.escalations_summary}</div>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                          { label: 'Deliverables', value: wbr.deliverables },
                          { label: 'Key Metrics', value: wbr.key_metrics },
                          { label: 'Wins', value: wbr.wins },
                          { label: 'Challenges', value: wbr.challenges },
                          { label: 'Action Items', value: wbr.action_items },
                          { label: 'Next Week Focus', value: wbr.next_week_focus },
                        ].filter(f => f.value).map(field => (
                          <div key={field.label}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field.label}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{field.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Export Tab */}
                  {activeTab === 'export' && selectedWBR?.id === wbr.id && (
                    <div style={{ padding: 24 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Export WBR Presentation</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                        Generates a full 8-slide PowerPoint covering attendance, health scorecard, KPIs, escalations, deliverables, wins, action items and next steps. Includes creator watermark on first and last slide.
                      </div>
                      <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Presentation includes:</div>
                        {[
                          { num: '1', label: 'Cover slide', color: 'var(--accent)' },
                          { num: '2', label: 'Attendance summary & employee breakdown', color: 'var(--accent)' },
                          { num: '3', label: 'Health scorecard with score bars', color: '#1A4A7A' },
                          { num: '4', label: 'Performance KPIs', color: '#7A5200' },
                          { num: '5', label: 'Escalations & issues', color: 'var(--danger)' },
                          { num: '6', label: 'Deliverables & wins', color: '#4A3080' },
                          { num: '7', label: 'Action items & next week focus', color: '#4A3080' },
                          { num: '8', label: 'Closing slide with creator watermark', color: 'var(--accent)' },
                        ].map(slide => (
                          <div key={slide.num} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: slide.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'white', flexShrink: 0 }}>{slide.num}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{slide.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: 'var(--accent-light)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 11, color: 'var(--accent-text)' }}>
                        Watermark: Created by {CREATOR_NAME} · {CREATOR_EMAIL}
                      </div>
                      <button className="primary" onClick={() => exportWBRPPT(wbr)} disabled={exportingId === wbr.id}
                        style={{ width: '100%', padding: '11px', fontSize: 13 }}>
                        {exportingId === wbr.id ? 'Generating presentation...' : '↓ Download PowerPoint'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}