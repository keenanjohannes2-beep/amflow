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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'view' | 'export'>('view')
  const [selectedWBR, setSelectedWBR] = useState<any>(null)

  const [form, setForm] = useState({
    client_id: '', week_start: '',
    // Intro / Account Details
    am_name: 'Keenan Johannes', director_name: '', csm_name: '',
    total_tls: '', total_agents: '',
    // Recruitment
    new_hires: '', onboarding_dates: '', todo_list: '', recruitment_challenges: '', recruitment_deliverables: '',
    // Attendance / Adherence
    attendance_summary: '', attendance_breakdown: '',
    attendance_flags: '', schedule_amendments: '',
    // Attrition
    attrition_summary: '',
    // Productivity / Utilization
    productivity_summary: '', productivity_trends: '', productivity_wins_losses: '',
    utilization_summary: '', utilization_gaps: '', utilization_wins_losses: '',
    // Highlights
    tl_highlights: '', team_highlights: '', agent_highlights: '',
    flags_risks: '', engagement_summary: '', client_meeting_engagement: '',
    // Legacy fields — stored in DB for backward compat with exports/page.tsx Slide 5
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
      { data: recruitmentData }, { data: pocData },
      { data: winsLossesData }, { data: attritionData },
    ] = await Promise.all([
      supabase.from('employees').select('*').eq('user_id', user.id).eq('client_id', selectedClient),
      supabase.from('attendance').select('*').eq('user_id', user.id).eq('client_id', selectedClient).gte('date', weekStart).lte('date', weekEnd),
      supabase.from('scorecards').select('*').eq('user_id', user.id).eq('client_id', selectedClient).order('created_at', { ascending: false }).limit(1),
      supabase.from('kpi_templates').select('*').eq('user_id', user.id).eq('client_id', selectedClient),
      supabase.from('kpi_records').select('*').eq('user_id', user.id).eq('client_id', selectedClient).gte('date', weekStart).lte('date', weekEnd),
      supabase.from('issues').select('*').eq('user_id', user.id).eq('client_id', selectedClient).neq('status', 'Resolved'),
      supabase.from('recruitment').select('*').eq('user_id', user.id).eq('client_id', selectedClient).eq('week_start', weekStart).maybeSingle(),
      supabase.from('poc').select('*').eq('user_id', user.id).eq('client_id', selectedClient).maybeSingle(),
      supabase.from('wins_losses').select('*').eq('user_id', user.id).eq('client_id', selectedClient).gte('week_start', weekStart).lte('week_start', weekEnd),
      supabase.from('attrition_logs').select('*').eq('user_id', user.id).eq('client_id', selectedClient).eq('resolved', false),
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
    let productivitySummary = ''
    if (kpiTemplates && kpiTemplates.length > 0 && kpiRecords && kpiRecords.length > 0) {
      kpiSummary = kpiTemplates.map(tmpl => {
        const recs = kpiRecords.filter(r => r.template_id === tmpl.id)
        if (recs.length === 0) return `${tmpl.metric_name}: No data`
        const tot = recs.reduce((s, r) => s + r.value, 0)
        const avg = (tot / recs.length).toFixed(1)
        const target = tmpl.target ? ` (Target: ${tmpl.target}${tmpl.unit ? ' ' + tmpl.unit : ''})` : ''
        return `${tmpl.metric_name}: ${tot.toLocaleString()}${tmpl.unit ? ' ' + tmpl.unit : ''} | Avg: ${avg}${target}`
      }).join('\n')
      const prodMetrics = kpiTemplates.filter(t => !t.metric_name.toLowerCase().includes('util'))
      if (prodMetrics.length > 0) {
        productivitySummary = prodMetrics.map(tmpl => {
          const recs = kpiRecords.filter(r => r.template_id === tmpl.id)
          if (recs.length === 0) return `${tmpl.metric_name}: No data`
          const tot = recs.reduce((s, r) => s + r.value, 0)
          const avg = (tot / recs.length).toFixed(1)
          return `${tmpl.metric_name}: Total ${tot.toLocaleString()}${tmpl.unit ? ' ' + tmpl.unit : ''} (Avg ${avg}/day)`
        }).join('\n')
      }
    }
    let escalationsSummary = 'No open escalations'
    if (issues && issues.length > 0) {
      escalationsSummary = issues.map(i => `[${i.severity}] ${i.description?.slice(0, 80)}${i.description?.length > 80 ? '...' : ''} — ${i.status}`).join('\n')
    }
    const totalAgents = employees?.filter((e: any) => !(e.role?.toLowerCase().includes('lead') || e.role?.toLowerCase().includes('tl'))).length || 0
    const totalTLs = employees?.filter((e: any) => e.role?.toLowerCase().includes('lead') || e.role?.toLowerCase().includes('tl')).length || 0
    setForm(f => ({
      ...f,
      client_id: selectedClient, week_start: weekStart,
      total_agents: String(totalAgents),
      total_tls: String(totalTLs),
      attendance_summary: attSummary, attendance_breakdown: breakdown,
      health_summary: healthSummary, kpi_summary: kpiSummary,
      escalations_summary: escalationsSummary,
      productivity_summary: productivitySummary || f.productivity_summary,
      new_hires: recruitmentData?.new_hires || '',
      onboarding_dates: recruitmentData?.onboarding_dates || '',
      todo_list: recruitmentData?.todo_list || '',
      recruitment_challenges: recruitmentData?.challenges || '',
      recruitment_deliverables: recruitmentData?.deliverables || '',
      director_name: pocData?.director_name || f.director_name || '',
      csm_name: pocData?.csm_name || f.csm_name || '',
      productivity_wins_losses: winsLossesData?.filter((w: any) => w.type === 'win' && w.category === 'productivity').map((w: any) => w.description).join('\n') || f.productivity_wins_losses || '',
      utilization_wins_losses: winsLossesData?.filter((w: any) => w.type === 'win' && w.category === 'utilization').map((w: any) => w.description).join('\n') || f.utilization_wins_losses || '',
      attrition_summary: attritionData?.map((a: any) => `${a.employee_name} — ${a.reason || 'no reason'}`).join('\n') || f.attrition_summary || '',
      deliverables: '', key_metrics: '', wins: '',
      challenges: '', action_items: '', next_week_focus: '',
    }))
    setShowForm(true); setPulling(false)
  }

  const loadWBR = (wbr: any) => {
    setForm({
      client_id: wbr.client_id, week_start: wbr.week_start,
      am_name: wbr.am_name || '', director_name: wbr.director_name || '', csm_name: wbr.csm_name || '',
      total_tls: wbr.total_tls || '', total_agents: wbr.total_agents || '',
      new_hires: wbr.new_hires || '', onboarding_dates: wbr.onboarding_dates || '', todo_list: wbr.todo_list || '',
      recruitment_challenges: wbr.recruitment_challenges || '', recruitment_deliverables: wbr.recruitment_deliverables || '',
      attendance_summary: wbr.attendance_summary || '', attendance_breakdown: wbr.attendance_breakdown || '',
      attendance_flags: wbr.attendance_flags || '', schedule_amendments: wbr.schedule_amendments || '',
      attrition_summary: wbr.attrition_summary || '',
      productivity_summary: wbr.productivity_summary || '', productivity_trends: wbr.productivity_trends || '', productivity_wins_losses: wbr.productivity_wins_losses || '',
      utilization_summary: wbr.utilization_summary || '', utilization_gaps: wbr.utilization_gaps || '', utilization_wins_losses: wbr.utilization_wins_losses || '',
      tl_highlights: wbr.tl_highlights || '', team_highlights: wbr.team_highlights || '', agent_highlights: wbr.agent_highlights || '',
      flags_risks: wbr.flags_risks || '', engagement_summary: wbr.engagement_summary || '', client_meeting_engagement: wbr.client_meeting_engagement || '',
      health_summary: '', kpi_summary: '', escalations_summary: '',
      deliverables: '', key_metrics: '', wins: '', challenges: '', action_items: '', next_week_focus: '',
    })
    setEditingId(wbr.id)
    setShowForm(true)
    setError('')
  }

  const handleSave = async () => {
    if (!form.client_id) { setError('Please pull data first'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (editingId) {
      const { error } = await supabase.from('wbr').update(form).eq('id', editingId)
      if (error) { setError(error.message); setSaving(false) }
      else {
        setWbrs(w => w.map(r => r.id === editingId ? { ...r, ...form } : r))
        setShowForm(false); setEditingId(null); setSaving(false); setError('')
      }
    } else {
      const { data, error } = await supabase.from('wbr').insert({ ...form, user_id: user!.id, archived: false }).select().single()
      if (error) { setError(error.message); setSaving(false) }
      else { setWbrs(w => [data, ...w]); setShowForm(false); setSaving(false); setError('') }
    }
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

    // ─── Palette ───────────────────────────────────────────────────────
    const NAVY   = '0D1B2A'   // dominant dark
    const TEAL   = '0A7E6A'   // accent / header
    const ICE    = 'E8F4F1'   // card backgrounds
    const WHITE  = 'FFFFFF'
    const MUTED  = '7B8794'
    const DARK   = '1C2B36'
    const AMBER  = 'E09B1A'
    const RED    = 'C0392B'
    const GREEN  = '1D9E75'
    const BORDER = 'C8D6D2'

    const weekLabel = wbr.week_start ? new Date(wbr.week_start).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
    const reviewDate = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

    // ─── Helpers ───────────────────────────────────────────────────────
    const addHeader = (slide: any, title: string, subtitle?: string) => {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.25, fill: { color: NAVY } })
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 1.17, w: '100%', h: 0.08, fill: { color: TEAL } })
      slide.addText('AMflow  ·  Weekly Business Review', { x: 0.45, y: 0.1, w: 9, h: 0.32, fontSize: 9, color: TEAL, bold: false, charSpacing: 1 })
      slide.addText(title, { x: 0.45, y: 0.42, w: 10, h: 0.55, fontSize: 22, bold: true, color: WHITE })
      if (subtitle) slide.addText(subtitle, { x: 0.45, y: 0.93, w: 8, h: 0.24, fontSize: 9, color: MUTED })
      slide.addText(reviewDate, { x: 9.8, y: 0.93, w: 2.7, h: 0.24, fontSize: 9, color: MUTED, align: 'right' })
    }

    const addFooter = (slide: any) => {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.1, w: '100%', h: 0.4, fill: { color: NAVY } })
      slide.addText(`${client?.name || '—'}  ·  Week of ${weekLabel}  ·  AMflow`, { x: 0.4, y: 7.15, w: 12, h: 0.3, fontSize: 8, color: MUTED, align: 'center' })
    }

    const card = (slide: any, x: number, y: number, w: number, h: number) => {
      slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: ICE }, line: { color: BORDER, width: 0.5 }, shadow: { type: 'outer', color: '000000', blur: 4, offset: 1, angle: 135, opacity: 0.06 } })
    }

    const label = (slide: any, txt: string, x: number, y: number, w: number) =>
      slide.addText(txt.toUpperCase(), { x, y, w, h: 0.22, fontSize: 7.5, color: TEAL, bold: true, charSpacing: 1 })

    const val = (slide: any, txt: string, x: number, y: number, w: number, h: number, opts: any = {}) =>
      slide.addText(txt || '—', { x, y, w, h, fontSize: 11, color: DARK, ...opts })

    const bulletBlock = (slide: any, txt: string, x: number, y: number, w: number, h: number) => {
      const lines = (txt || '').split('\n').filter(Boolean)
      if (lines.length === 0) { val(slide, 'Nothing to report', x, y, w, h, { color: MUTED, italic: true }); return }
      const items = lines.map((t: string, i: number) => ({
        text: t,
        options: { bullet: true, breakLine: i < lines.length - 1, fontSize: 10, color: DARK }
      }))
      slide.addText(items, { x, y, w, h, paraSpaceAfter: 3 })
    }

    // ══════════════════════════════════════════════════════════════════
    // INTRO SLIDE — Cover
    // ══════════════════════════════════════════════════════════════════
    const cover = pptx.addSlide()
    cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: NAVY } })
    cover.addShape(pptx.ShapeType.rect, { x: 0, y: 5.8, w: '100%', h: 1.7, fill: { color: TEAL } })
    cover.addShape(pptx.ShapeType.rect, { x: 0, y: 5.72, w: '100%', h: 0.12, fill: { color: '0A6657' } })
    cover.addText('WEEKLY BUSINESS REVIEW', { x: 0.9, y: 0.9, w: 11, h: 0.45, fontSize: 11, color: TEAL, bold: true, charSpacing: 3 })
    cover.addText(client?.name || 'Client', { x: 0.9, y: 1.5, w: 11, h: 1.1, fontSize: 44, bold: true, color: WHITE })
    cover.addShape(pptx.ShapeType.rect, { x: 0.9, y: 2.82, w: 1.2, h: 0.06, fill: { color: TEAL } })

    const introLines = [
      { label: 'Account Manager', value: wbr.am_name || CREATOR_NAME },
      { label: 'Accounts', value: String(1) },
      { label: 'Date of Business Review', value: reviewDate },
      { label: 'Review Period', value: `Week of ${weekLabel}` },
    ]
    introLines.forEach(({ label: l, value: v }, i) => {
      cover.addText(l.toUpperCase(), { x: 0.9, y: 3.15 + i * 0.55, w: 4, h: 0.22, fontSize: 7.5, color: MUTED, charSpacing: 1 })
      cover.addText(v, { x: 0.9, y: 3.37 + i * 0.55, w: 6, h: 0.28, fontSize: 12, color: WHITE, bold: true })
    })
    cover.addText(`Created by ${CREATOR_NAME}  ·  ${CREATOR_EMAIL}`, { x: 0.9, y: 6.0, w: 11, h: 0.3, fontSize: 9, color: WHITE, italic: true })

    // ══════════════════════════════════════════════════════════════════
    // PAGE 1 — Account Details + Attendance + Attrition
    // ══════════════════════════════════════════════════════════════════
    const p1 = pptx.addSlide()
    addHeader(p1, 'Account Details & Attendance', `${client?.name || '—'}  ·  Week of ${weekLabel}`)

    // Account details — top bar
    const detailFields = [
      { l: 'Client', v: client?.name || '—' },
      { l: 'Director', v: wbr.director_name || '—' },
      { l: 'CSM', v: wbr.csm_name || '—' },
      { l: 'AM', v: wbr.am_name || CREATOR_NAME },
      { l: 'Total TLs', v: wbr.total_tls || '—' },
      { l: 'Total Agents', v: wbr.total_agents || '—' },
    ]
    detailFields.forEach(({ l, v }, i) => {
      const col = i % 3; const row = Math.floor(i / 3)
      const x = 0.4 + col * 4.25; const y = 1.38 + row * 0.85
      card(p1, x, y, 4.0, 0.72)
      p1.addText(l.toUpperCase(), { x: x + 0.14, y: y + 0.08, w: 3.7, h: 0.2, fontSize: 7, color: MUTED, charSpacing: 1 })
      p1.addText(v, { x: x + 0.14, y: y + 0.3, w: 3.7, h: 0.32, fontSize: 12, bold: true, color: DARK })
    })

    // Recruitment sub-section
    p1.addShape(pptx.ShapeType.rect, { x: 0.4, y: 3.18, w: 0.05, h: 0.22, fill: { color: TEAL } })
    p1.addText('RECRUITMENT UPDATES', { x: 0.55, y: 3.18, w: 5, h: 0.22, fontSize: 8, bold: true, color: TEAL, charSpacing: 1 })
    const recFields = [
      { l: 'New Hires', v: wbr.new_hires, x: 0.4, w: 3.9 },
      { l: 'Onboarding Dates', v: wbr.onboarding_dates, x: 4.5, w: 3.9 },
      { l: 'Challenges', v: wbr.recruitment_challenges, x: 8.6, w: 4.0 },
    ]
    recFields.forEach(({ l, v, x, w }) => {
      label(p1, l, x, 3.48, w)
      val(p1, v || '—', x, 3.7, w, 0.38, { fontSize: 10 })
    })

    label(p1, 'To-Do List / Deliverables', 0.4, 4.12, 6)
    bulletBlock(p1, (wbr.todo_list || '') + (wbr.recruitment_deliverables ? '\n' + wbr.recruitment_deliverables : ''), 0.4, 4.34, 12.2, 0.7)

    // Attendance / Adherence
    p1.addShape(pptx.ShapeType.rect, { x: 0.4, y: 5.1, w: 0.05, h: 0.22, fill: { color: AMBER } })
    p1.addText('ATTENDANCE / ADHERENCE', { x: 0.55, y: 5.1, w: 6, h: 0.22, fontSize: 8, bold: true, color: AMBER, charSpacing: 1 })
    const attParts = (wbr.attendance_summary || '').split('|').map((s: string) => s.trim()).slice(0, 5)
    attParts.forEach((part: string, i: number) => {
      const [lbl, vl] = part.split(':').map((s: string) => s.trim())
      const x = 0.4 + i * 2.52
      card(p1, x, 5.38, 2.35, 0.76)
      p1.addText(vl || '—', { x, y: 5.44, w: 2.35, h: 0.4, fontSize: 18, bold: true, color: TEAL, align: 'center' })
      p1.addText(lbl || '', { x, y: 5.84, w: 2.35, h: 0.24, fontSize: 8, color: MUTED, align: 'center' })
    })
    const flagsAmd = [wbr.attendance_flags, wbr.schedule_amendments].filter(Boolean).join('  ·  ')
    if (flagsAmd) p1.addText(`Flags / Amendments: ${flagsAmd}`, { x: 0.4, y: 6.22, w: 12.2, h: 0.3, fontSize: 9, color: RED, italic: true })

    // Attrition
    if (wbr.attrition_summary) {
      p1.addShape(pptx.ShapeType.rect, { x: 0.4, y: 6.56, w: 0.05, h: 0.22, fill: { color: RED } })
      p1.addText('ATTRITION', { x: 0.55, y: 6.56, w: 3, h: 0.22, fontSize: 8, bold: true, color: RED, charSpacing: 1 })
      p1.addText(wbr.attrition_summary, { x: 0.4, y: 6.78, w: 12.2, h: 0.3, fontSize: 9, color: DARK })
    }

    addFooter(p1)

    // ══════════════════════════════════════════════════════════════════
    // PAGE 2 — Productivity & Utilization
    // ══════════════════════════════════════════════════════════════════
    const p2 = pptx.addSlide()
    addHeader(p2, 'Productivity & Utilization', `${client?.name || '—'}  ·  Week of ${weekLabel}`)

    // Left column — Productivity
    p2.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.38, w: 0.05, h: 0.22, fill: { color: TEAL } })
    p2.addText('PRODUCTIVITY', { x: 0.55, y: 1.38, w: 5, h: 0.22, fontSize: 8, bold: true, color: TEAL, charSpacing: 1 })
    card(p2, 0.4, 1.68, 6.1, 2.15)
    p2.addText('Agent Performance (Daily / Weekly / Monthly)', { x: 0.58, y: 1.76, w: 5.7, h: 0.24, fontSize: 9, bold: true, color: DARK })
    bulletBlock(p2, wbr.productivity_summary, 0.58, 2.04, 5.7, 1.65)

    label(p2, 'Trends', 0.4, 3.92, 6.1)
    val(p2, wbr.productivity_trends, 0.4, 4.14, 6.1, 0.68, { fontSize: 10 })

    p2.addShape(pptx.ShapeType.rect, { x: 0.4, y: 4.9, w: 0.05, h: 0.22, fill: { color: GREEN } })
    p2.addText('WINS / LOSSES — PRODUCTIVITY', { x: 0.55, y: 4.9, w: 6, h: 0.22, fontSize: 8, bold: true, color: GREEN, charSpacing: 1 })
    card(p2, 0.4, 5.18, 6.1, 1.5)
    bulletBlock(p2, wbr.productivity_wins_losses, 0.58, 5.26, 5.7, 1.3)

    // Right column — Utilization
    p2.addShape(pptx.ShapeType.rect, { x: 7.0, y: 1.38, w: 0.05, h: 0.22, fill: { color: AMBER } })
    p2.addText('UTILIZATION', { x: 7.15, y: 1.38, w: 5, h: 0.22, fontSize: 8, bold: true, color: AMBER, charSpacing: 1 })
    card(p2, 7.0, 1.68, 6.1, 2.15)
    p2.addText('Agent Utilization % & Function Breakdown', { x: 7.18, y: 1.76, w: 5.7, h: 0.24, fontSize: 9, bold: true, color: DARK })
    bulletBlock(p2, wbr.utilization_summary, 7.18, 2.04, 5.7, 1.65)

    label(p2, 'Utilization Gaps', 7.0, 3.92, 6.1)
    val(p2, wbr.utilization_gaps, 7.0, 4.14, 6.1, 0.68, { fontSize: 10 })

    p2.addShape(pptx.ShapeType.rect, { x: 7.0, y: 4.9, w: 0.05, h: 0.22, fill: { color: RED } })
    p2.addText('WINS / LOSSES — UTILIZATION', { x: 7.15, y: 4.9, w: 6, h: 0.22, fontSize: 8, bold: true, color: RED, charSpacing: 1 })
    card(p2, 7.0, 5.18, 6.1, 1.5)
    bulletBlock(p2, wbr.utilization_wins_losses, 7.18, 5.26, 5.7, 1.3)

    addFooter(p2)

    // ══════════════════════════════════════════════════════════════════
    // PAGE 3 — Highlights
    // ══════════════════════════════════════════════════════════════════
    const p3 = pptx.addSlide()
    addHeader(p3, 'Highlights, Flags & Engagement', `${client?.name || '—'}  ·  Week of ${weekLabel}`)

    const hlPanels = [
      { lbl: 'TL Highlights', txt: wbr.tl_highlights, x: 0.4, y: 1.38, w: 4.0, h: 2.1 },
      { lbl: 'Team Highlights', txt: wbr.team_highlights, x: 4.65, y: 1.38, w: 4.0, h: 2.1 },
      { lbl: 'Agent Highlights', txt: wbr.agent_highlights, x: 8.9, y: 1.38, w: 4.2, h: 2.1 },
    ]
    hlPanels.forEach(({ lbl, txt, x, y, w, h }) => {
      label(p3, lbl, x, y, w)
      card(p3, x, y + 0.26, w, h)
      bulletBlock(p3, txt, x + 0.18, y + 0.36, w - 0.22, h - 0.2)
    })

    // Flags & Risks
    p3.addShape(pptx.ShapeType.rect, { x: 0.4, y: 3.85, w: 0.05, h: 0.22, fill: { color: RED } })
    p3.addText('FLAGS & RISKS', { x: 0.55, y: 3.85, w: 5, h: 0.22, fontSize: 8, bold: true, color: RED, charSpacing: 1 })
    card(p3, 0.4, 4.13, 12.7, 0.96)
    bulletBlock(p3, wbr.flags_risks, 0.58, 4.21, 12.3, 0.78)

    // Engagement
    p3.addShape(pptx.ShapeType.rect, { x: 0.4, y: 5.35, w: 0.05, h: 0.22, fill: { color: TEAL } })
    p3.addText('ENGAGEMENT', { x: 0.55, y: 5.35, w: 5, h: 0.22, fontSize: 8, bold: true, color: TEAL, charSpacing: 1 })
    label(p3, 'TL / Agent Engagement Level', 0.4, 5.63, 6.2)
    val(p3, wbr.engagement_summary, 0.4, 5.87, 6.2, 0.5, { fontSize: 10 })
    label(p3, 'Client Meeting Engagement', 6.8, 5.63, 6.3)
    val(p3, wbr.client_meeting_engagement, 6.8, 5.87, 6.3, 0.5, { fontSize: 10 })

    addFooter(p3)

    // ══════════════════════════════════════════════════════════════════
    // LAST PAGE — Outro
    // ══════════════════════════════════════════════════════════════════
    const outro = pptx.addSlide()
    outro.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: NAVY } })
    outro.addShape(pptx.ShapeType.rect, { x: 0, y: 5.5, w: '100%', h: 2.0, fill: { color: TEAL } })
    outro.addShape(pptx.ShapeType.rect, { x: 0, y: 5.43, w: '100%', h: 0.1, fill: { color: '0A6657' } })

    outro.addText('Thank You', { x: 0.9, y: 0.9, w: 11, h: 1.0, fontSize: 48, bold: true, color: WHITE, align: 'center' })
    outro.addText(`${client?.name || '—'}  ·  Week of ${weekLabel}`, { x: 0.9, y: 2.05, w: 11, h: 0.45, fontSize: 16, color: TEAL, align: 'center' })

    outro.addShape(pptx.ShapeType.rect, { x: 4.5, y: 2.65, w: 4.1, h: 0.06, fill: { color: TEAL } })

    outro.addText('We appreciate all stakeholders for their time and engagement.', { x: 0.9, y: 2.92, w: 11, h: 0.38, fontSize: 12, color: WHITE, align: 'center', italic: true })
    outro.addText('Questions, Follow-ups & Suggestions', { x: 0.9, y: 3.55, w: 11, h: 0.32, fontSize: 13, bold: true, color: TEAL, align: 'center' })
    outro.addText('Please raise any questions, follow-up items or suggestions — we are committed to continuous improvement.', { x: 1.2, y: 3.95, w: 10.7, h: 0.45, fontSize: 10.5, color: WHITE, align: 'center' })

    outro.addText(`Prepared by ${CREATOR_NAME}`, { x: 0.9, y: 5.62, w: 11, h: 0.3, fontSize: 9.5, color: WHITE, align: 'center' })
    outro.addText(CREATOR_EMAIL, { x: 0.9, y: 5.96, w: 11, h: 0.28, fontSize: 9, color: WHITE, italic: true, align: 'center' })
    outro.addText('AMflow  ·  Built for BPO Account Managers', { x: 0.9, y: 6.35, w: 11, h: 0.28, fontSize: 8.5, color: WHITE, align: 'center' })

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
                    {editingId ? 'Edit' : 'New'} WBR — {getClientName(form.client_id)} — Week of {form.week_start ? new Date(form.week_start).toLocaleDateString() : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>All fields are editable — review before saving</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowForm(false); setEditingId(null); setError('') }}>Cancel</button>
                  <button className="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update WBR' : 'Save WBR'}</button>
                </div>
              </div>
              {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 16 }}>{error}</p>}
              {/* INTRO */}
              <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 16, marginBottom: 16, borderLeft: '3px solid var(--accent)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Intro — AM & Account Info</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <WBRSection title="Account Manager (Full Name)" value={form.am_name} onChange={setField('am_name')} rows={1} />
                  <WBRSection title="Director" value={form.director_name} onChange={setField('director_name')} rows={1} />
                  <WBRSection title="CSM" value={form.csm_name} onChange={setField('csm_name')} rows={1} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <WBRSection title="Total TLs" value={form.total_tls} onChange={setField('total_tls')} rows={1} />
                    <WBRSection title="Total Agents" value={form.total_agents} onChange={setField('total_agents')} rows={1} />
                  </div>
                </div>
              </div>

              {/* RECRUITMENT */}
              <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 16, marginBottom: 16, borderLeft: '3px solid #1D9E75' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1D9E75', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recruitment Updates</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <WBRSection title="New Hires" value={form.new_hires} onChange={setField('new_hires')} rows={2} />
                  <WBRSection title="Onboarding Dates" value={form.onboarding_dates} onChange={setField('onboarding_dates')} rows={2} />
                  <WBRSection title="To-Do List" value={form.todo_list} onChange={setField('todo_list')} rows={3} />
                  <WBRSection title="Deliverables" value={form.recruitment_deliverables} onChange={setField('recruitment_deliverables')} rows={3} />
                </div>
                <WBRSection title="Challenges" value={form.recruitment_challenges} onChange={setField('recruitment_challenges')} rows={2} />
              </div>

              {/* ATTENDANCE */}
              <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 16, marginBottom: 16, borderLeft: '3px solid #E09B1A' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#E09B1A', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Attendance / Adherence</div>
                <WBRSection title="Weekly Attendance Summary (auto-filled)" value={form.attendance_summary} onChange={setField('attendance_summary')} rows={2} />
                <WBRSection title="Employee Breakdown (auto-filled)" value={form.attendance_breakdown} onChange={setField('attendance_breakdown')} rows={5} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <WBRSection title="Schedule Flags" value={form.attendance_flags} onChange={setField('attendance_flags')} rows={2} />
                  <WBRSection title="Schedule Amendments" value={form.schedule_amendments} onChange={setField('schedule_amendments')} rows={2} />
                </div>
              </div>

              {/* ATTRITION */}
              <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 16, marginBottom: 16, borderLeft: '3px solid #C0392B' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#C0392B', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Attrition</div>
                <WBRSection title="Offboarding / Attrition Details (who, reason)" value={form.attrition_summary} onChange={setField('attrition_summary')} rows={3} />
              </div>

              {/* PRODUCTIVITY */}
              <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 16, marginBottom: 16, borderLeft: '3px solid #0D1B2A' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0D1B2A', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Productivity / Utilization</div>
                <WBRSection title="Agent Productivity — Daily / Weekly / Monthly + Functions (one per line)" value={form.productivity_summary} onChange={setField('productivity_summary')} rows={6} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <WBRSection title="Productivity Trends" value={form.productivity_trends} onChange={setField('productivity_trends')} rows={3} />
                  <WBRSection title="Productivity Wins / Losses (one per line)" value={form.productivity_wins_losses} onChange={setField('productivity_wins_losses')} rows={3} />
                  <WBRSection title="Utilization % per Agent + Function Breakdown (one per line)" value={form.utilization_summary} onChange={setField('utilization_summary')} rows={5} />
                  <WBRSection title="Utilization Gaps" value={form.utilization_gaps} onChange={setField('utilization_gaps')} rows={3} />
                </div>
                <WBRSection title="Utilization Wins / Losses (one per line)" value={form.utilization_wins_losses} onChange={setField('utilization_wins_losses')} rows={3} />
              </div>

              {/* HIGHLIGHTS */}
              <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 16, borderLeft: '3px solid #4A3080' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#4A3080', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Highlights & Engagement</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <WBRSection title="TL Highlights (one per line)" value={form.tl_highlights} onChange={setField('tl_highlights')} rows={4} />
                  <WBRSection title="Team Highlights (one per line)" value={form.team_highlights} onChange={setField('team_highlights')} rows={4} />
                  <WBRSection title="Agent Highlights (one per line)" value={form.agent_highlights} onChange={setField('agent_highlights')} rows={4} />
                </div>
                <WBRSection title="Flags / Risks" value={form.flags_risks} onChange={setField('flags_risks')} rows={3} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <WBRSection title="TL / Agent Engagement Level" value={form.engagement_summary} onChange={setField('engagement_summary')} rows={3} />
                  <WBRSection title="Client Meeting Engagement" value={form.client_meeting_engagement} onChange={setField('client_meeting_engagement')} rows={3} />
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
                        onClick={() => loadWBR(wbr)}
                        style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, background: 'var(--bg-app)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                        Edit
                      </button>
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

                      {/* Account Details row */}
                      {(wbr.am_name || wbr.director_name || wbr.csm_name || wbr.total_tls || wbr.total_agents) && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Account Details</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {[
                              { label: 'AM', value: wbr.am_name },
                              { label: 'Director', value: wbr.director_name },
                              { label: 'CSM', value: wbr.csm_name },
                              { label: 'Total TLs', value: wbr.total_tls },
                              { label: 'Total Agents', value: wbr.total_agents },
                            ].filter(f => f.value).map(f => (
                              <div key={f.label} style={{ background: 'var(--bg-app)', borderRadius: 6, padding: '7px 10px' }}>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{f.label}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{f.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recruitment */}
                      {(wbr.new_hires || wbr.onboarding_dates || wbr.todo_list || wbr.recruitment_challenges || wbr.recruitment_deliverables) && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Recruitment Updates</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                              { label: 'New Hires', value: wbr.new_hires },
                              { label: 'Onboarding Dates', value: wbr.onboarding_dates },
                              { label: 'To-Do List', value: wbr.todo_list },
                              { label: 'Deliverables', value: wbr.recruitment_deliverables },
                              { label: 'Challenges', value: wbr.recruitment_challenges },
                            ].filter(f => f.value).map(f => (
                              <div key={f.label} style={{ background: 'var(--bg-app)', borderRadius: 6, padding: '7px 10px' }}>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{f.label}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{f.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Attendance */}
                      {(wbr.attendance_summary || wbr.attendance_breakdown || wbr.attendance_flags || wbr.schedule_amendments) && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#E09B1A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Attendance / Adherence</div>
                          {wbr.attendance_summary && <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 6, fontWeight: 500 }}>{wbr.attendance_summary}</div>}
                          {wbr.attendance_breakdown && <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line', background: 'var(--bg-app)', borderRadius: 6, padding: '8px 10px', marginBottom: 6 }}>{wbr.attendance_breakdown}</div>}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {wbr.attendance_flags && (
                              <div style={{ background: 'var(--bg-app)', borderRadius: 6, padding: '7px 10px' }}>
                                <div style={{ fontSize: 9, color: '#E09B1A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Flags</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{wbr.attendance_flags}</div>
                              </div>
                            )}
                            {wbr.schedule_amendments && (
                              <div style={{ background: 'var(--bg-app)', borderRadius: 6, padding: '7px 10px' }}>
                                <div style={{ fontSize: 9, color: '#E09B1A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Schedule Amendments</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{wbr.schedule_amendments}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Attrition */}
                      {wbr.attrition_summary && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Attrition</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line', background: 'var(--bg-app)', borderRadius: 6, padding: '8px 10px' }}>{wbr.attrition_summary}</div>
                        </div>
                      )}

                      {/* Productivity */}
                      {(wbr.productivity_summary || wbr.productivity_trends || wbr.productivity_wins_losses) && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Productivity</div>
                          {wbr.productivity_summary && <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line', background: 'var(--bg-app)', borderRadius: 6, padding: '8px 10px', marginBottom: 6 }}>{wbr.productivity_summary}</div>}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {wbr.productivity_trends && (
                              <div style={{ background: 'var(--bg-app)', borderRadius: 6, padding: '7px 10px' }}>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Trends</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{wbr.productivity_trends}</div>
                              </div>
                            )}
                            {wbr.productivity_wins_losses && (
                              <div style={{ background: 'var(--bg-app)', borderRadius: 6, padding: '7px 10px' }}>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Wins / Losses</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{wbr.productivity_wins_losses}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Utilization */}
                      {(wbr.utilization_summary || wbr.utilization_gaps || wbr.utilization_wins_losses) && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#E09B1A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Utilization</div>
                          {wbr.utilization_summary && <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line', background: 'var(--bg-app)', borderRadius: 6, padding: '8px 10px', marginBottom: 6 }}>{wbr.utilization_summary}</div>}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {wbr.utilization_gaps && (
                              <div style={{ background: 'var(--bg-app)', borderRadius: 6, padding: '7px 10px' }}>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Gaps</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{wbr.utilization_gaps}</div>
                              </div>
                            )}
                            {wbr.utilization_wins_losses && (
                              <div style={{ background: 'var(--bg-app)', borderRadius: 6, padding: '7px 10px' }}>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Wins / Losses</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{wbr.utilization_wins_losses}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Highlights */}
                      {(wbr.tl_highlights || wbr.team_highlights || wbr.agent_highlights) && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#4A3080', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Highlights</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                            {[
                              { label: 'TL Highlights', value: wbr.tl_highlights },
                              { label: 'Team Highlights', value: wbr.team_highlights },
                              { label: 'Agent Highlights', value: wbr.agent_highlights },
                            ].filter(f => f.value).map(f => (
                              <div key={f.label} style={{ background: 'var(--bg-app)', borderRadius: 6, padding: '7px 10px' }}>
                                <div style={{ fontSize: 9, color: '#4A3080', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{f.label}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{f.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Flags, Risks & Engagement */}
                      {(wbr.flags_risks || wbr.engagement_summary || wbr.client_meeting_engagement) && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Flags, Risks & Engagement</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                            {[
                              { label: 'Flags / Risks', value: wbr.flags_risks, color: '#C0392B' },
                              { label: 'TL / Agent Engagement', value: wbr.engagement_summary, color: 'var(--accent)' },
                              { label: 'Client Meeting Engagement', value: wbr.client_meeting_engagement, color: 'var(--accent)' },
                            ].filter(f => f.value).map(f => (
                              <div key={f.label} style={{ background: 'var(--bg-app)', borderRadius: 6, padding: '7px 10px' }}>
                                <div style={{ fontSize: 9, color: f.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{f.label}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{f.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Legacy fields — shown if present on old records */}
                      {(wbr.health_summary || wbr.kpi_summary || wbr.escalations_summary) && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legacy Data</div>
                          {[
                            { label: 'Health Scorecard', value: wbr.health_summary, color: '#1A4A7A' },
                            { label: 'Performance KPIs', value: wbr.kpi_summary, color: '#7A5200' },
                            { label: 'Escalations', value: wbr.escalations_summary, color: 'var(--danger)' },
                          ].filter(f => f.value).map(f => (
                            <div key={f.label} style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: f.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{f.label}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-line', background: 'var(--bg-app)', borderRadius: 6, padding: '8px 10px' }}>{f.value}</div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  )}

                  {/* Export Tab */}
                  {activeTab === 'export' && selectedWBR?.id === wbr.id && (
                    <div style={{ padding: 24 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Export WBR Presentation</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                        Generates a polished 5-slide PowerPoint deck covering Account Details, Recruitment, Attendance, Productivity, Utilization, Highlights and Engagement — structured exactly for a professional Business Review presentation.
                      </div>
                      <div style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Presentation includes:</div>
                        {[
                          { num: 'Intro', label: 'Cover — AM intro, accounts, date of business review', color: 'var(--accent)' },
                          { num: 'P1', label: 'Account Details · Recruitment Updates · Attendance & Adherence · Attrition', color: '#E09B1A' },
                          { num: 'P2', label: 'Productivity (daily/weekly/monthly, trends, wins/losses) · Utilization (%, gaps, wins/losses)', color: '#0D1B2A' },
                          { num: 'P3', label: 'Highlights (TL / Team / Agent) · Flags & Risks · Engagement', color: '#4A3080' },
                          { num: 'Outro', label: 'Thank stakeholders · Q&A & Follow-ups · Suggestions', color: 'var(--accent)' },
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
