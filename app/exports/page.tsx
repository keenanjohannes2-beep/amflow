'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function ExportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [date] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase.from('clients').select('*').eq('user_id', user.id)
      setClients(data || [])
      if (data && data.length > 0) setSelectedClient(data[0].id)
      setLoading(false)
    }
    init()
  }, [])

  const getClientName = () => clients.find(c => c.id === selectedClient)?.name || 'All Clients'

  const exportClientEODPDF = async () => {
    if (!selectedClient) return
    setGenerating('client-pdf')
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const [{ data: tasks }, { data: comms }, { data: issues }, { data: attendance }] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id).eq('client_id', selectedClient).neq('status', 'Done'),
      supabase.from('communications').select('*').eq('user_id', user.id).eq('client_id', selectedClient).order('date', { ascending: false }).limit(5),
      supabase.from('issues').select('*').eq('user_id', user.id).eq('client_id', selectedClient).eq('status', 'Open'),
      supabase.from('attendance').select('*').eq('user_id', user.id).eq('client_id', selectedClient).eq('date', date),
    ])

    const client = clients.find(c => c.id === selectedClient)
    const doc = new jsPDF()
    const green = [29, 158, 117] as [number, number, number]
    const dark = [44, 42, 37] as [number, number, number]

    // Header
    doc.setFillColor(...green)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('AMflow', 14, 12)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('End of Day Report', 14, 20)
    doc.text(`${client?.name} · ${new Date().toDateString()}`, 210 - 14, 20, { align: 'right' })

    let y = 36

    // Client info
    doc.setTextColor(...dark)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Client Overview', 14, y)
    y += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 104, 96)
    doc.text(`Industry: ${client?.industry || '—'}   Contact: ${client?.contact_person || '—'}   Status: ${client?.status || '—'}`, 14, y)
    y += 12

    // Open Tasks
    doc.setTextColor(...dark)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Open Tasks', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Task', 'Priority', 'Deadline', 'Status']],
      body: tasks && tasks.length > 0 ? tasks.map(t => [t.title, t.priority, t.deadline ? new Date(t.deadline).toLocaleDateString() : '—', t.status]) : [['No open tasks', '', '', '']],
      headStyles: { fillColor: green, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 244, 240] },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 10

    // Communications
    doc.setTextColor(...dark)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Recent Communications', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Channel', 'POC', 'Summary', 'Status']],
      body: comms && comms.length > 0 ? comms.map(c => [c.date ? new Date(c.date).toLocaleDateString() : '—', c.channel, c.poc || '—', c.summary?.slice(0, 40) + (c.summary?.length > 40 ? '...' : ''), c.status]) : [['No recent communications', '', '', '', '']],
      headStyles: { fillColor: green, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 244, 240] },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 10

    // Open Issues
    doc.setTextColor(...dark)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Open Issues', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Severity', 'Description', 'Status']],
      body: issues && issues.length > 0 ? issues.map(i => [i.date_logged ? new Date(i.date_logged).toLocaleDateString() : '—', i.severity, i.description?.slice(0, 50) + (i.description?.length > 50 ? '...' : ''), i.status]) : [['No open issues', '', '', '']],
      headStyles: { fillColor: green, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 244, 240] },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 10

    // Attendance
    doc.setTextColor(...dark)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Today's Attendance`, 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Employee', 'Status', 'Notes']],
      body: attendance && attendance.length > 0 ? attendance.map(a => [a.employee_id, a.status, a.notes || '—']) : [['No attendance logged today', '', '']],
      headStyles: { fillColor: green, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 244, 240] },
      margin: { left: 14, right: 14 },
    })

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(158, 155, 148)
      doc.text(`AMflow · Generated ${new Date().toLocaleString()} · Page ${i} of ${pageCount}`, 14, 290)
    }

    doc.save(`EOD_${client?.name}_${date}.pdf`)
    setGenerating(null)
  }

  const exportDirectorEODPDF = async () => {
    setGenerating('director-pdf')
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const [{ data: allTasks }, { data: allIssues }, { data: allComms }, { data: scorecards }] = await Promise.all([
      supabase.from('tasks').select('*, clients(name)').eq('user_id', user.id).neq('status', 'Done'),
      supabase.from('issues').select('*, clients(name)').eq('user_id', user.id).eq('status', 'Open'),
      supabase.from('communications').select('*, clients(name)').eq('user_id', user.id).order('date', { ascending: false }).limit(10),
      supabase.from('scorecards').select('*, clients(name)').eq('user_id', user.id),
    ])

    const doc = new jsPDF()
    const green = [29, 158, 117] as [number, number, number]
    const dark = [44, 42, 37] as [number, number, number]

    // Header
    doc.setFillColor(...green)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('AMflow', 14, 12)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Director EOD Report — All Accounts', 14, 20)
    doc.text(new Date().toDateString(), 210 - 14, 20, { align: 'right' })

    let y = 36

    // Account summary
    doc.setTextColor(...dark)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Account Summary', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Client', 'Industry', 'Status', 'Retainer']],
      body: clients.map(c => [c.name, c.industry || '—', c.status, `R${(c.monthly_retainer || 0).toLocaleString()}`]),
      headStyles: { fillColor: green, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 244, 240] },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 10

    // Open tasks across all accounts
    doc.setTextColor(...dark)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('All Open Tasks', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Client', 'Task', 'Priority', 'Deadline']],
      body: allTasks && allTasks.length > 0 ? allTasks.map((t: any) => [t.clients?.name || '—', t.title, t.priority, t.deadline ? new Date(t.deadline).toLocaleDateString() : '—']) : [['No open tasks', '', '', '']],
      headStyles: { fillColor: green, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 244, 240] },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 10

    // Open issues
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setTextColor(...dark)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('All Open Issues', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Client', 'Severity', 'Description', 'Status']],
      body: allIssues && allIssues.length > 0 ? allIssues.map((i: any) => [i.clients?.name || '—', i.severity, i.description?.slice(0, 45) + (i.description?.length > 45 ? '...' : ''), i.status]) : [['No open issues', '', '', '']],
      headStyles: { fillColor: green, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 244, 240] },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 10

    // Health scorecards
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setTextColor(...dark)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Account Health Scores', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Client', 'Satisfaction', 'Communication', 'Payment', 'Workload', 'Avg']],
      body: scorecards && scorecards.length > 0 ? scorecards.map((s: any) => {
        const avg = ((s.satisfaction + s.communication + s.payment_reliability + s.workload_balance) / 4).toFixed(1)
        return [s.clients?.name || '—', s.satisfaction, s.communication, s.payment_reliability, s.workload_balance, avg]
      }) : [['No scorecard data', '', '', '', '', '']],
      headStyles: { fillColor: green, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 244, 240] },
      margin: { left: 14, right: 14 },
    })

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(158, 155, 148)
      doc.text(`AMflow · Generated ${new Date().toLocaleString()} · Page ${i} of ${pageCount}`, 14, 290)
    }

    doc.save(`Director_EOD_${date}.pdf`)
    setGenerating(null)
  }

  const exportClientPPT = async () => {
    if (!selectedClient) return
    setGenerating('client-ppt')
    const pptxgen = (await import('pptxgenjs')).default
    const client = clients.find(c => c.id === selectedClient)

    const [{ data: tasks }, { data: comms }, { data: issues }, { data: scorecard }, { data: wbr }] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id).eq('client_id', selectedClient),
      supabase.from('communications').select('*').eq('user_id', user.id).eq('client_id', selectedClient).order('date', { ascending: false }).limit(5),
      supabase.from('issues').select('*').eq('user_id', user.id).eq('client_id', selectedClient),
      supabase.from('scorecards').select('*').eq('user_id', user.id).eq('client_id', selectedClient).order('created_at', { ascending: false }).limit(1),
      supabase.from('wbr').select('*').eq('user_id', user.id).eq('client_id', selectedClient).order('week_start', { ascending: false }).limit(1),
    ])

    const pptx = new pptxgen()
    pptx.layout = 'LAYOUT_WIDE'
    const GREEN = '1D9E75'
    const DARK = '2C2A25'
    const MUTED = '9E9B94'
    const WHITE = 'FFFFFF'
    const LIGHT = 'F7F6F2'

    const addHeader = (slide: any, title: string) => {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: GREEN } })
      slide.addText('AMflow', { x: 0.4, y: 0.15, w: 3, h: 0.4, fontSize: 14, bold: true, color: WHITE })
      slide.addText(title, { x: 0.4, y: 0.55, w: 8, h: 0.4, fontSize: 20, bold: true, color: WHITE })
      slide.addText(new Date().toDateString(), { x: 9, y: 0.75, w: 3.5, h: 0.3, fontSize: 9, color: WHITE, align: 'right' })
    }

    // Slide 1 — Cover
    const cover = pptx.addSlide()
    cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: GREEN } })
    cover.addText('AMflow', { x: 1, y: 1.5, w: 10, h: 0.8, fontSize: 32, bold: true, color: WHITE })
    cover.addText(client?.name || 'Client Report', { x: 1, y: 2.5, w: 10, h: 0.6, fontSize: 24, color: WHITE })
    cover.addText(`Account Review · ${new Date().toDateString()}`, { x: 1, y: 3.3, w: 10, h: 0.4, fontSize: 14, color: WHITE })

    // Slide 2 — Client Overview
    const overview = pptx.addSlide()
    addHeader(overview, 'Client Overview')
    const fields = [
      ['Industry', client?.industry || '—'],
      ['Contact', client?.contact_person || '—'],
      ['Email', client?.email || '—'],
      ['Contract', client?.contract_type || '—'],
      ['Retainer', `R${(client?.monthly_retainer || 0).toLocaleString()}`],
      ['Status', client?.status || '—'],
      ['Since', client?.start_date ? new Date(client.start_date).toLocaleDateString() : '—'],
      ['Services', client?.services || '—'],
    ]
    fields.forEach(([label, value], i) => {
      const col = i % 2 === 0 ? 0.4 : 6.5
      const row = 1.4 + Math.floor(i / 2) * 0.8
      overview.addText(label, { x: col, y: row, w: 2, h: 0.3, fontSize: 9, color: MUTED })
      overview.addText(value, { x: col, y: row + 0.3, w: 5.5, h: 0.35, fontSize: 12, bold: true, color: DARK })
    })

    // Slide 3 — Health Scorecard
    if (scorecard && scorecard.length > 0) {
      const sc = scorecard[0]
      const healthSlide = pptx.addSlide()
      addHeader(healthSlide, 'Health Scorecard')
      const avg = ((sc.satisfaction + sc.communication + sc.payment_reliability + sc.workload_balance) / 4).toFixed(1)
      healthSlide.addText(avg, { x: 0.4, y: 1.4, w: 2, h: 1.2, fontSize: 60, bold: true, color: GREEN })
      healthSlide.addText('Overall Score', { x: 0.4, y: 2.6, w: 2.5, h: 0.3, fontSize: 10, color: MUTED })
      const metrics = [
        { label: 'Satisfaction', value: sc.satisfaction },
        { label: 'Communication', value: sc.communication },
        { label: 'Payment Reliability', value: sc.payment_reliability },
        { label: 'Workload Balance', value: sc.workload_balance },
      ]
      metrics.forEach((m, i) => {
        const y = 1.5 + i * 0.85
        healthSlide.addText(m.label, { x: 3, y, w: 3, h: 0.3, fontSize: 11, color: DARK })
        healthSlide.addShape(pptx.ShapeType.rect, { x: 3, y: y + 0.32, w: 8, h: 0.22, fill: { color: 'E4E1D8' } })
        healthSlide.addShape(pptx.ShapeType.rect, { x: 3, y: y + 0.32, w: (m.value / 5) * 8, h: 0.22, fill: { color: m.value >= 4 ? GREEN : m.value >= 3 ? 'D4930A' : 'C0392B' } })
        healthSlide.addText(`${m.value}/5`, { x: 11.2, y, w: 0.8, h: 0.3, fontSize: 11, bold: true, color: DARK })
      })
    }

    // Slide 4 — Tasks
    const taskSlide = pptx.addSlide()
    addHeader(taskSlide, 'Tasks Summary')
    const openTasks = tasks?.filter(t => t.status !== 'Done') || []
    const doneTasks = tasks?.filter(t => t.status === 'Done') || []
    taskSlide.addText(`${openTasks.length} Open`, { x: 0.4, y: 1.4, w: 3, h: 0.5, fontSize: 28, bold: true, color: DARK })
    taskSlide.addText(`${doneTasks.length} Completed`, { x: 4, y: 1.4, w: 4, h: 0.5, fontSize: 28, bold: true, color: GREEN })
    if (openTasks.length > 0) {
      taskSlide.addText('Open Tasks', { x: 0.4, y: 2.2, w: 5, h: 0.3, fontSize: 11, bold: true, color: DARK })
      openTasks.slice(0, 6).forEach((t, i) => {
        taskSlide.addText(`• ${t.title}`, { x: 0.4, y: 2.6 + i * 0.45, w: 11, h: 0.35, fontSize: 10, color: DARK })
        taskSlide.addText(t.priority, { x: 10, y: 2.6 + i * 0.45, w: 1.5, h: 0.35, fontSize: 9, color: t.priority === 'High' ? 'C0392B' : t.priority === 'Medium' ? 'D4930A' : GREEN, align: 'right' })
      })
    }

    // Slide 5 — WBR Summary (reads new fields, falls back to legacy for old records)
    if (wbr && wbr.length > 0) {
      const w = wbr[0]
      const wbrSlide = pptx.addSlide()
      addHeader(wbrSlide, 'Latest Weekly Business Review')
      wbrSlide.addText(`Week of ${w.week_start ? new Date(w.week_start).toLocaleDateString() : '—'}`, { x: 0.4, y: 1.3, w: 8, h: 0.3, fontSize: 11, color: MUTED })
      // Use new structured fields if present, fall back to legacy fields for old records
      const sections = w.productivity_summary || w.tl_highlights ? [
        { label: 'Account Manager', value: w.am_name },
        { label: 'Attendance', value: w.attendance_summary },
        { label: 'Productivity', value: w.productivity_summary?.split('\n').slice(0,3).join(' · ') },
        { label: 'Utilization', value: w.utilization_summary?.split('\n').slice(0,2).join(' · ') },
        { label: 'Highlights', value: [w.tl_highlights, w.team_highlights].filter(Boolean).join(' | ')?.slice(0,120) },
        { label: 'Flags / Risks', value: w.flags_risks },
      ].filter(s => s.value) : [
        { label: 'Deliverables', value: w.deliverables },
        { label: 'Key Metrics', value: w.key_metrics },
        { label: 'Wins', value: w.wins },
        { label: 'Challenges', value: w.challenges },
        { label: 'Action Items', value: w.action_items },
        { label: 'Next Week Focus', value: w.next_week_focus },
      ].filter(s => s.value)
      sections.forEach((s, i) => {
        const col = i % 2 === 0 ? 0.4 : 6.5
        const row = 1.7 + Math.floor(i / 2) * 1.4
        wbrSlide.addText(s.label.toUpperCase(), { x: col, y: row, w: 5.5, h: 0.25, fontSize: 8, color: MUTED })
        wbrSlide.addText(s.value, { x: col, y: row + 0.28, w: 5.5, h: 0.9, fontSize: 10, color: DARK })
      })
    }

    // Slide 6 — Issues
    const issueSlide = pptx.addSlide()
    addHeader(issueSlide, 'Issues & Escalations')
    const openIssues = issues?.filter(i => i.status !== 'Resolved') || []
    issueSlide.addText(`${openIssues.length} Open Issue${openIssues.length !== 1 ? 's' : ''}`, { x: 0.4, y: 1.3, w: 5, h: 0.4, fontSize: 18, bold: true, color: openIssues.length > 0 ? 'C0392B' : GREEN })
    if (openIssues.length > 0) {
      openIssues.slice(0, 5).forEach((issue, i) => {
        const y = 1.9 + i * 0.9
        issueSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 12, h: 0.75, fill: { color: LIGHT }, line: { color: 'E4E1D8', width: 0.5 } })
        issueSlide.addText(issue.severity, { x: 0.5, y: y + 0.08, w: 1.2, h: 0.25, fontSize: 8, bold: true, color: issue.severity === 'High' ? 'C0392B' : issue.severity === 'Medium' ? 'D4930A' : GREEN })
        issueSlide.addText(issue.description?.slice(0, 80) || '', { x: 0.5, y: y + 0.35, w: 10, h: 0.3, fontSize: 9, color: DARK })
      })
    } else {
      issueSlide.addText('No open issues — all clear!', { x: 0.4, y: 2.2, w: 10, h: 0.4, fontSize: 14, color: GREEN })
    }

    pptx.writeFile({ fileName: `${client?.name}_Report_${date}.pptx` })
    setGenerating(null)
  }

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 24 }

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
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Exports</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>Generate PDF and PowerPoint reports</div>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* Client selector */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 12 }}>Select client for client-specific reports</div>
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} style={{ maxWidth: 300 }}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Export cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>

            {/* Client EOD PDF */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📄</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Client EOD Report</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF · Per client</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                End of day summary for <strong>{getClientName()}</strong> including open tasks, recent communications, issues and today's attendance.
              </div>
              <button className="primary" onClick={exportClientEODPDF} disabled={generating === 'client-pdf' || !selectedClient}
                style={{ width: '100%' }}>
                {generating === 'client-pdf' ? 'Generating...' : 'Download PDF'}
              </button>
            </div>

            {/* Director EOD PDF */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📊</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Director EOD Report</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF · All accounts</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Full overview of all accounts including tasks, issues, health scores and account summaries for internal review.
              </div>
              <button className="primary" onClick={exportDirectorEODPDF} disabled={generating === 'director-pdf'}
                style={{ width: '100%' }}>
                {generating === 'director-pdf' ? 'Generating...' : 'Download PDF'}
              </button>
            </div>

            {/* Client PowerPoint */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📑</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Client Presentation</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PowerPoint · Per client</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Professional slide deck for <strong>{getClientName()}</strong> covering overview, health scorecard, tasks, WBR highlights and open issues.
              </div>
              <button className="primary" onClick={exportClientPPT} disabled={generating === 'client-ppt' || !selectedClient}
                style={{ width: '100%' }}>
                {generating === 'client-ppt' ? 'Generating...' : 'Download PowerPoint'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
