import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'


// Appointment types (mirrors mobile app)
const APPOINTMENT_TYPES = [
  { value: 'checkup', label: 'Regular Checkup' },
  { value: 'cleaning', label: 'Teeth Cleaning' },
  { value: 'filling', label: 'Filling' },
  { value: 'extraction', label: 'Tooth Extraction' },
  { value: 'root_canal', label: 'Root Canal' },
  { value: 'crown', label: 'Crown' },
  { value: 'orthodontics', label: 'Orthodontics' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'followup', label: 'Follow-up' },
]

function StatusPill({ status }) {
  const { bg, text } = useMemo(() => {
    const map = {
      scheduled: { bg: 'bg-slate-200', text: 'text-slate-800' },
      confirmed: { bg: 'bg-blue-600', text: 'text-white' },
      completed: { bg: 'bg-green-600', text: 'text-white' },
      cancelled: { bg: 'bg-red-600', text: 'text-white' },
      'no-show': { bg: 'bg-orange-500', text: 'text-white' },
    }
    return map[status] || { bg: 'bg-slate-200', text: 'text-slate-800' }
  }, [status])
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      {status}
    </span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg border w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filters
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dentistId, setDentistId] = useState('')
  const [qPatient, setQPatient] = useState('')
  const [qDentist, setQDentist] = useState('')

  // View mode
  const [view, setView] = useState('list') // list | day | week
  const [calendarDate, setCalendarDate] = useState('') // for day/week base date

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [total, setTotal] = useState(0)

  // Data for selects
  const [dentists, setDentists] = useState([])

  // Name cache for users (patients/dentists) by id
  const [userNameMap, setUserNameMap] = useState({})

  function nameForId(id, fallbackName) {
    if (fallbackName) return fallbackName
    const u = userNameMap[id]
    return (u?.name || u?.email || id || '')
  }

  // Conflict state
  const [conflict, setConflict] = useState(false)
  const [conflictMsg, setConflictMsg] = useState('')


  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  // Helpers to derive Type from notes and present clean values
  function titleCase(s){
    return s.split(' ').map(w=> w? (w[0].toUpperCase()+w.slice(1).toLowerCase()) : w).join(' ')
  }
  function parseTypeFromNotes(notes){
    if(!notes) return { type:null, cleaned: '' }
    const s = String(notes)
    const re = /(type)\s*[:\-]?\s*([A-Za-z0-9_\- ]+)/i
    const m = s.match(re)
    if(!m) return { type:null, cleaned: s.trim() }
    const raw = (m[2]||'').trim()
    const type = raw.replaceAll('_',' ').replace(/\s+/g,' ').trim()
    const cleaned = s.replace(m[0], '').replace(/^\s*[\-,:]\s*/,'').trim()
    return { type, cleaned }
  }
  function displayType(a){
    const { type } = parseTypeFromNotes(a?.notes)
    const base = type || a?.appointment_type || ''
    return titleCase(String(base).replaceAll('_',' ').replace(/\s+/g,' ').trim())
  }
  function cleanedNotes(a){
    const { cleaned, type } = parseTypeFromNotes(a?.notes)
    // If notes only had Type and nothing else, show empty
    const txt = (type && (!cleaned || cleaned === type)) ? '' : cleaned
    return txt
  }

  function isValidEmail(s) { return emailRe.test(s) }






  // Modal state
  const emptyForm = {
    id: null,
    appointment_date: '',
    appointment_time: '10:00',
    patient_id: '',
    patient_name: '',
    patient_phone: '',
    dentist_id: '',
    appointment_type: 'checkup',
    status: 'scheduled',
    notes: '',
  }
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const isEditing = !!form.id

  function startOfWeek(dateStr) {
    const d = new Date(dateStr)
    const day = d.getDay() // 0 Sun..6 Sat
    const diff = (day === 0 ? -6 : 1) - day // Monday as start
    d.setDate(d.getDate() + diff)
    return d
  }

  function fmt(d) { return d.toISOString().slice(0,10) }

  async function loadDentists() {
    // Load users with either 'dentist' or 'doctor' role
    const { data } = await supabase.from('users').select('id,name,role').in('role', ['dentist', 'doctor'])
    setDentists(data || [])
  }

  async function load() {
    try {
      setLoading(true)
      setError('')
      let query = supabase
        .from('appointments')
        .select('*', { count: 'exact' })

      if (status) query = query.eq('status', status)
      if (fromDate) query = query.gte('appointment_date', fromDate)
      if (toDate) query = query.lte('appointment_date', toDate)
      if (dentistId) query = query.eq('dentist_id', dentistId)
      if (qPatient) query = query.ilike('patient_name', `%${qPatient}%`)
      if (qDentist) query = query.ilike('dentist_name', `%${qDentist}%`)

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .range(from, to)

      const { data, error, count } = await query
      if (error) throw error
      setAppointments(data || [])
      setTotal(count || 0)
      // Enrich names if missing
      await ensureNames(data || [])
    } catch (e) {
      setError(e.message || 'Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  // Ensure we have display names for user ids found in rows
  async function ensureNames(rows) {
    try {
      const ids = new Set()
      rows.forEach(a => {
        if (a?.patient_id && !a?.patient_name && !userNameMap[a.patient_id]) ids.add(a.patient_id)
        if (a?.dentist_id && !a?.dentist_name && !userNameMap[a.dentist_id]) ids.add(a.dentist_id)
      })
      if (ids.size === 0) return
      const { data, error } = await supabase
        .from('users')
        .select('id,name,email')
        .in('id', Array.from(ids))
      if (error) return
      const next = { ...userNameMap }
      ;(data || []).forEach(u => { next[u.id] = { name: u.name, email: u.email } })
      setUserNameMap(next)
    } catch (_) { /* noop */ }
  }

  useEffect(() => {
    // Defaults: last 7 days up to next 7 days, calendar date = today
    const today = new Date()
    const weekAgo = new Date()
    const weekAhead = new Date()
    weekAgo.setDate(today.getDate() - 7)
    weekAhead.setDate(today.getDate() + 7)
    const t = fmt(today)
    setCalendarDate(t)
    setToDate(fmt(weekAhead))
    setFromDate(fmt(weekAgo))
    loadDentists()
  }, [])

  useEffect(() => {
    if (fromDate && toDate) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, fromDate, toDate, dentistId, qPatient, qDentist, page])

  function openCreate() {
    const d = calendarDate || fmt(new Date())
    setForm({ ...emptyForm, appointment_date: d })
    setShowModal(true)
  }
  function openEdit(a) {
    const parsed = parseTypeFromNotes(a?.notes)
    setForm({
      id: a.id,
      appointment_date: a.appointment_date || '',
      appointment_time: a.appointment_time || '10:00',
      patient_id: a.patient_id || '',
      patient_name: a.patient_name || '',
      dentist_id: a.dentist_id || '',
      appointment_type: (parsed.type || a.appointment_type || ''),
      status: a.status || 'scheduled',
      notes: (parsed.type ? parsed.cleaned : (a.notes || '')),
    })
    setShowModal(true)
  }




  // Check for dentist/time conflicts on same date
  async function checkConflictLocal(f) {
    if (!f.appointment_date || !f.appointment_time || !f.dentist_id) {
      setConflict(false); setConflictMsg('');
      return false
    }
    try {
      let query = supabase
        .from('appointments')
        .select('id')
        .eq('appointment_date', f.appointment_date)
        .eq('appointment_time', f.appointment_time)
        .eq('dentist_id', f.dentist_id)
        .limit(1)
      if (f.id) query = query.neq('id', f.id)
      const { data } = await query
      const has = (data && data.length > 0)
      setConflict(has)
      setConflictMsg(has ? 'Another appointment exists for this dentist at the same date and time.' : '')
      return has
    } catch (_e) {
      // On error, do not block but clear conflict message
      setConflict(false); setConflictMsg('')
      return false
    }
  }

  // React to modal field changes for conflict detection
  useEffect(() => {
    if (!showModal) return
    checkConflictLocal(form)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, form.appointment_date, form.appointment_time, form.dentist_id, form.id])


  function exportCSV() {
    const headers = ['date','time','patient','dentist','type','status','notes']
    const esc = (v) => {
      const s = (v ?? '').toString()
      return '"' + s.replaceAll('"', '""') + '"'
    }
    const rows = appointments.map(a => [
      a.appointment_date,
      a.appointment_time,
      nameForId(a.patient_id, a.patient_name),
      nameForId(a.dentist_id, a.dentist_name),
      displayType(a),
      a.status,
      cleanedNotes(a),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `appointments_${fromDate || ''}_${toDate || ''}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function saveAppointment(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      // Validate required fields
      if (!form.appointment_date || !form.appointment_time || !form.dentist_id) {
        throw new Error('Please select date, time, and dentist')
      }
      if (!form.patient_name || !form.patient_name.trim()) {
        throw new Error('Please enter patient name')
      }
      let dupQuery = supabase
        .from('appointments')
        .select('id')
        .eq('appointment_date', form.appointment_date)
        .eq('appointment_time', form.appointment_time)
        .eq('dentist_id', form.dentist_id)
        .limit(1)
      if (isEditing && form.id) dupQuery = dupQuery.neq('id', form.id)
      const { data: dup } = await dupQuery
      if (dup && dup.length) {
        setConflict(true)
        setConflictMsg('Another appointment exists for this dentist at the same date and time.')
        throw new Error('Conflict: duplicate time for dentist')
      }

      const payload = { ...form }
      // If user pasted a "Type: ..." into notes, extract it and clean notes
      if (payload.notes) {
        const p = parseTypeFromNotes(payload.notes)
        if (p.type && !payload.appointment_type) payload.appointment_type = p.type
        payload.notes = p.cleaned
      }

      if (isEditing) {
        // For updates, remove id from payload
        const { id, ...updatePayload } = payload
        const { error } = await supabase.from('appointments').update(updatePayload).eq('id', form.id)
        if (error) throw error
      } else {
        // Calculate end_time by adding duration to start_time
        const startTime = payload.appointment_time
        const duration = 30 // 30 minutes default
        const [hours, minutes] = startTime.split(':').map(Number)
        const startMinutes = hours * 60 + minutes
        const endMinutes = startMinutes + duration
        const endHours = Math.floor(endMinutes / 60)
        const endMins = endMinutes % 60
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`

        // Use ONLY the original table columns (avoid appointment_date/appointment_time)
        const insertPayload = {
          date: payload.appointment_date,                    // Use original 'date' column
          start_time: startTime,                             // Use original 'start_time' column
          end_time: endTime,                                 // Calculate proper end_time
          patient_name: payload.patient_name,                // Our new column
          patient_phone: payload.patient_phone || null,     // Our new column
          patient_id: payload.patient_id || null,            // Make nullable
          dentist_id: payload.dentist_id,
          appointment_type: payload.appointment_type || 'checkup',
          status: payload.status || 'scheduled',
          notes: payload.notes || null,
          duration_minutes: duration,                        // Set duration
        }

        console.log('Inserting appointment with payload:', insertPayload)
        const { data, error } = await supabase.from('appointments').insert([insertPayload])
        if (error) {
          console.error('Insert error details:', error)
          console.error('Error message:', error.message)
          console.error('Error details:', error.details)
          console.error('Error hint:', error.hint)
          throw error
        }
        console.log('Insert successful:', data)
      }
      setShowModal(false)
      setForm(emptyForm)
      load()
    } catch (e) {
      setError(e.message || 'Failed to save appointment')
    } finally {
      setSaving(false)
    }
  }

  function switchToDay() {
    setView('day')
    if (calendarDate) {
      setFromDate(calendarDate)
      setToDate(calendarDate)
      setPage(1)
    }
  }
  function switchToWeek() {
    setView('week')
    if (calendarDate) {
      const start = startOfWeek(calendarDate)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      setFromDate(fmt(start))
      setToDate(fmt(end))
      setPage(1)
    }
  }
  function switchToList() {
    setView('list')
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
    <h1 className="text-2xl px-2 mb-4">Appointments Dashboard</h1>
      <section className="bg-white rounded-lg shadow border p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">View</label>
            <div className="inline-flex rounded border overflow-hidden">
              <button onClick={switchToList} className={`px-3 py-1 text-sm ${view==='list'?'bg-gray-800 text-white':'bg-white'}`}>List</button>
              <button onClick={switchToDay} className={`px-3 py-1 text-sm border-l ${view==='day'?'bg-gray-800 text-white':'bg-white'}`}>Day</button>
              <button onClick={switchToWeek} className={`px-3 py-1 text-sm border-l ${view==='week'?'bg-gray-800 text-white':'bg-white'}`}>Week</button>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Calendar date</label>
            <input type="date" value={calendarDate} onChange={(e)=>setCalendarDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Status</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="border rounded px-2 py-1 text-sm">
              <option value="">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No-show</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Dentist</label>
            <select value={dentistId} onChange={(e)=>{ setDentistId(e.target.value); setPage(1) }} className="border rounded px-2 py-1 text-sm min-w-[160px]">
              <option value="">All dentists</option>
              {dentists.map(d=> (
                <option key={d.id} value={d.id}>{d.name || d.id}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Patient search</label>
            <input value={qPatient} onChange={(e)=>{ setQPatient(e.target.value); setPage(1) }} placeholder="e.g. John" className="border rounded px-2 py-1 text-sm" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Dentist search</label>
            <input value={qDentist} onChange={(e)=>{ setQDentist(e.target.value); setPage(1) }} placeholder="e.g. Dr. Smith" className="border rounded px-2 py-1 text-sm" />
          </div>

          <div className="flex-1" />
          <button onClick={openCreate} className="bg-green-600 text-white text-sm px-3 py-1.5 rounded hover:bg-green-700">Add Appointment</button>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">From</label>
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} className="border rounded px-2 py-1 text-sm" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">To</label>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} className="border rounded px-2 py-1 text-sm" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={exportCSV} className="bg-slate-600 text-white text-sm px-3 py-1.5 rounded hover:bg-slate-700">Export CSV</button>
            <button onClick={()=>{ setPage(1); load() }} className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">Refresh</button>
          </div>
        </div>
      </section>

      {/* List view */}
      {view === 'list' && (
        <section className="mt-4 bg-white rounded-lg shadow border overflow-hidden">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border-b border-red-200">{error}</div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="text-left font-semibold px-3 py-2">Date</th>
                  <th className="text-left font-semibold px-3 py-2">Time</th>
                  <th className="text-left font-semibold px-3 py-2">Patient</th>
                  <th className="text-left font-semibold px-3 py-2">Dentist</th>
                  <th className="text-left font-semibold px-3 py-2">Appt for</th>
                  <th className="text-left font-semibold px-3 py-2">Status</th>
                  <th className="text-left font-semibold px-3 py-2">Notes</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Loading…</td></tr>
                ) : appointments.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">No appointments</td></tr>
                ) : (
                  appointments.map((a) => (
                    <tr key={a.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{a.appointment_date}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{a.appointment_time}</td>
                      <td className="px-3 py-2">{nameForId(a.patient_id, a.patient_name)}</td>
                      <td className="px-3 py-2">{nameForId(a.dentist_id, a.dentist_name)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{displayType(a)}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><StatusPill status={a.status} /></td>
                      <td className="px-3 py-2 max-w-[320px] truncate" title={cleanedNotes(a) || ''}>{cleanedNotes(a) || '-'}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={()=>openEdit(a)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50 text-sm">
            <div>Page {page} of {totalPages} • Showing {appointments.length} of {total}</div>
            <div className="flex items-center gap-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-2 py-1 border rounded disabled:opacity-50">Prev</button>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-2 py-1 border rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        </section>
      )}

      {/* Day view */}
      {view === 'day' && (
        <section className="mt-4 bg-white rounded-lg shadow border p-3">
          <h3 className="font-semibold mb-2">Appointments on {fromDate}</h3>
          {loading ? (
            <div className="px-3 py-6 text-center text-gray-500">Loading…</div>
          ) : appointments.length === 0 ? (
            <div className="px-3 py-6 text-center text-gray-500">No appointments</div>
          ) : (
            <ul className="divide-y">
              {appointments
                .sort((a,b)=> (a.appointment_time||'').localeCompare(b.appointment_time||''))
                .map(a => (
                <li key={a.id} className="py-2 flex items-start gap-3">
                  <div className="text-xs text-gray-500 w-16">{a.appointment_time}</div>
                  <div className="flex-1">
                    <div className="font-medium">{nameForId(a.patient_id, a.patient_name)} <span className="text-gray-500">• {nameForId(a.dentist_id, a.dentist_name)}</span></div>
                    <div className="text-xs text-gray-600">{displayType(a)}</div>
                    <div className="mt-1"><StatusPill status={a.status} /></div>
                  </div>
                  <button onClick={()=>openEdit(a)} className="text-blue-600 hover:underline text-xs">Edit</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Week view */}
      {view === 'week' && (
        <section className="mt-4 bg-white rounded-lg shadow border p-3">
          <h3 className="font-semibold mb-2">Week {fromDate} — {toDate}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const start = startOfWeek(calendarDate || fmt(new Date()))
              const day = new Date(start)
              day.setDate(start.getDate() + i)
              const key = fmt(day)
              const dayItems = appointments.filter(a => a.appointment_date === key)
              return (
                <div key={key} className="border rounded p-2">
                  <div className="text-sm font-semibold mb-1">{key}</div>
                  <div className="space-y-1">
                    {dayItems.length === 0 ? (
                      <div className="text-xs text-gray-400">No items</div>
                    ) : dayItems
                      .sort((a,b)=> (a.appointment_time||'').localeCompare(b.appointment_time||''))
                      .map(a => (
                        <div key={a.id} className="text-xs bg-gray-100 rounded px-2 py-1">
                          <div className="font-medium">{a.appointment_time} • {nameForId(a.patient_id, a.patient_name)}</div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">{nameForId(a.dentist_id, a.dentist_name)}</span>
                            <button onClick={()=>openEdit(a)} className="text-blue-600 hover:underline">Edit</button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {showModal && (
        <Modal title={isEditing ? 'Edit appointment' : 'New appointment'} onClose={()=>setShowModal(false)}>
          <form onSubmit={saveAppointment} className="space-y-3">

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Date</label>
                <input type="date" required value={form.appointment_date} onChange={(e)=>setForm(f=>({...f, appointment_date: e.target.value}))} className="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Time</label>
                <input type="time" required value={form.appointment_time} onChange={(e)=>setForm(f=>({...f, appointment_time: e.target.value}))} className="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Patient Name *</label>
                <input
                  value={form.patient_name}
                  onChange={(e) => setForm(f => ({ ...f, patient_name: e.target.value }))}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Enter patient name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Patient Phone</label>
                <input
                  value={form.patient_phone || ''}
                  onChange={(e) => setForm(f => ({ ...f, patient_phone: e.target.value }))}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Patient contact number"
                />
              </div>



              <div>
                <label className="block text-xs text-gray-600 mb-1">Dentist</label>
                <select required value={form.dentist_id} onChange={(e)=>setForm(f=>({...f, dentist_id: e.target.value}))} className="w-full border rounded px-2 py-1 text-sm">

                  <option value="">Select dentist</option>
                  {dentists.map(d=> (
                    <option key={d.id} value={d.id}>{d.name || d.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Type</label>
                <select value={form.appointment_type} onChange={(e)=>setForm(f=>({...f, appointment_type: e.target.value}))} className="w-full border rounded px-2 py-1 text-sm">
                  {APPOINTMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Status</label>
                <select value={form.status} onChange={(e)=>setForm(f=>({...f, status: e.target.value}))} className="w-full border rounded px-2 py-1 text-sm">
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No-show</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Notes</label>
                <textarea rows={3} value={form.notes} onChange={(e)=>setForm(f=>({...f, notes: e.target.value}))} className="w-full border rounded px-2 py-1 text-sm" />
              </div>
            </div>
            {conflict && (
              <div className="mb-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{conflictMsg}</div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={()=>setShowModal(false)} className="px-3 py-1.5 border rounded">Cancel</button>
              <button disabled={saving || conflict} type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded disabled:opacity-50">{saving? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
