import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

export default function Patients() {
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const perPage = 10

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all') // all | active | inactive

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [createLogin, setCreateLogin] = useState(true)
  const [sending, setSending] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    status: 'active',
    defaultPassword: '',
    sendInvite: true,
  })

  const [stats, setStats] = useState({}) // { [patientId]: { count: number, lastAt: Date|null, totalBalance: number } }
  const [pwInfo, setPwInfo] = useState(null) // { email, tempPassword }

  function fmtDate(d) {
    if (!d) return '-'
    const yyyy = d.getFullYear(); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0')
    return `${yyyy}-${mm}-${dd}`
  }


  function resetForm() {
    setForm({
      name: '', email: '', phone: '', date_of_birth: '', gender: '', address: '', status: 'active',
      defaultPassword: '', sendInvite: true,
    })
    setCreateLogin(true)
    setEditing(null)
  }

  async function fetchPatients() {
    try {
      setLoading(true)
      setError('')

      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', 'patient')

      if (status !== 'all') query = query.eq('status', status)
      if (search) {
        const like = `%${search}%`
        query = query.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      }

      const from = (page - 1) * perPage
      const to = from + perPage - 1
      query = query.order('created_at', { ascending: false }).range(from, to)

      const { data, error, count } = await query
      if (error) throw error
      setRows(data || [])
      setCount(count || 0)
    } catch (e) {
      setError(e.message || 'Failed to fetch patients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPatients() }, [page, search, status])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / perPage)), [count])

  function openCreate() {
    resetForm()
    setModalOpen(true)
  }
  function openEdit(row) {
    setEditing(row)
    setForm({
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      date_of_birth: row.date_of_birth || '',
      gender: row.gender || '',
      address: row.address || '',
      status: row.status || 'active',
      defaultPassword: '',
      sendInvite: false,
    })
    setCreateLogin(false)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSending(true)
    setError('')
    try {

      if (!form.name) throw new Error('Name is required')

      if (editing) {
        // Update profile
        const { error } = await supabase
          .from('users')
          .update({
            name: form.name,
            email: form.email || null,
            phone: form.phone || null,
            date_of_birth: form.date_of_birth || null,
            gender: form.gender || null,
            address: form.address || null,
            status: form.status,
          })
          .eq('id', editing.id)
        if (error) throw error
      } else {
        // Create patient via Edge Function (requires deployment)
        if (!createLogin) throw new Error('Creating a patient requires a login. Please enable "Create login".')
        const { data, error } = await supabase.functions.invoke('create-patient', {
          body: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            date_of_birth: form.date_of_birth || null,
            gender: form.gender || null,
            address: form.address,
            sendInvite: form.sendInvite,
            defaultPassword: form.defaultPassword || undefined,
          }
        })
        if (error) throw error
        const created = data
        if (created?.tempPassword) {
          setPwInfo({ email: created.email, tempPassword: created.tempPassword })
        }
      }

      setModalOpen(false)
      resetForm()
      fetchPatients()
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSending(false)
    }
  }

  async function toggleActive(row) {
    const newStatus = row.status === 'active' ? 'inactive' : 'active'
    const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', row.id)
    if (!error) fetchPatients()
  }

  function exportCSV() {
    const headers = ['name','email','mobile','status','last_appointment','total_appointments','balance']
    const esc = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"'
    const rowsOut = (rows || []).map(r => {
      const st = stats[r.id] || {}
      const balanceText = st.totalBalance !== undefined ?
        (st.totalBalance === 0 ? 'Fully PAID' : `₹${st.totalBalance.toFixed(2)}`) :
        '-'
      return [r.name, r.email || '', r.phone || '', r.status || '', st.lastAt ? fmtDate(st.lastAt) : '', st.count || 0, balanceText]
    })
    const csv = [headers.join(','), ...rowsOut.map(r => r.map(esc).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'patients.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }


  async function loadStats(currentRows) {
    try {
      const ids = (currentRows || []).map(r => r.id).filter(Boolean)
      if (!ids.length) { setStats({}); return }
      const { data, error } = await supabase
        .from('appointments')
        .select('id, patient_id, start_at, appointment_date, appointment_time, balance')
        .in('patient_id', ids)
      if (error) throw error
      const map = {}
      for (const a of (data || [])) {
        const pid = a.patient_id
        if (!pid) continue
        const entry = map[pid] || { count: 0, lastAt: null, totalBalance: 0 }
        entry.count += 1

        // Calculate total balance for the patient
        const balance = parseFloat(a.balance || 0)
        entry.totalBalance += balance

        let dt = null
        if (a.start_at) dt = new Date(a.start_at)
        else if (a.appointment_date) {
          const t = (a.appointment_time || '00:00').slice(0,5)
          dt = new Date(`${a.appointment_date}T${t}:00`)
        }
        if (dt && (!entry.lastAt || dt > entry.lastAt)) entry.lastAt = dt
        map[pid] = entry
      }
      setStats(map)
    } catch (_) {
      // ignore stats errors
    }
  }

  useEffect(() => { if (rows && rows.length) loadStats(rows); else setStats({}) }, [rows])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Patients</h1>
        <div className="flex items-center gap-2">
          <input value={search} onChange={e=>{setSearch(e.target.value); setPage(1)}} placeholder="Search name / email / mobile" className="border rounded px-3 py-1.5 text-sm w-72" />
          <select value={status} onChange={e=>{setStatus(e.target.value); setPage(1)}} className="border rounded px-2 py-1.5 text-sm">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button onClick={exportCSV} className="bg-slate-600 text-white px-3 py-2 rounded text-sm hover:bg-slate-700">Export CSV</button>
          <button onClick={openCreate} className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">Add Patient</button>
        </div>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}

      <div className="bg-white rounded border shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Mobile</th>
              <th className="text-left px-4 py-2">Last Appt</th>
              <th className="text-left px-4 py-2">Total Appts</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Balance</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.email || '-'}</td>
                <td className="px-4 py-2">{r.phone || '-'}</td>
                <td className="px-4 py-2">{stats[r.id]?.lastAt ? fmtDate(stats[r.id].lastAt) : '-'}</td>
                <td className="px-4 py-2">{stats[r.id]?.count ?? 0}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${r.status==='active'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700'}`}>{r.status}</span>
                </td>
                <td className="px-4 py-2">
                  {stats[r.id]?.totalBalance !== undefined ? (
                    stats[r.id].totalBalance === 0 ? (
                      <span className="font-medium text-green-600">Fully PAID</span>
                    ) : stats[r.id].totalBalance > 0 ? (
                      <span className="font-medium text-red-600">
                        ₹{stats[r.id].totalBalance.toFixed(2)}
                      </span>
                    ) : (
                      <span className="font-medium text-green-600">
                        ₹{stats[r.id].totalBalance.toFixed(2)}
                      </span>
                    )
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={()=>openEdit(r)} className="px-2 py-1 rounded border text-gray-700 hover:bg-gray-50">Edit</button>
                  <button onClick={()=>toggleActive(r)} className="px-2 py-1 rounded border text-gray-700 hover:bg-gray-50">{r.status==='active'?'Deactivate':'Activate'}</button>
                </td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">{loading? 'Loading…' : 'No patients found'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center text-sm">
        <div>Showing {(rows.length ? (page-1)*perPage+1 : 0)}–{(page-1)*perPage+rows.length} of {count}</div>
        <div className="space-x-2">
          <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
          <span>Page {page} / {totalPages}</span>
          <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
        </div>

      {pwInfo && (
        <div className="fixed bottom-4 right-4 z-50 bg-white border rounded shadow-lg p-3 w-[320px]">
          <div className="font-semibold mb-1">Patient login created</div>
          <div className="text-sm text-gray-700">Email: <span className="font-medium">{pwInfo.email || '-'}</span></div>
          <div className="text-sm text-gray-700 mt-1">Temporary password: <code className="bg-gray-100 px-1 py-0.5 rounded">{pwInfo.tempPassword}</code></div>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={()=>{ try { navigator.clipboard?.writeText(pwInfo.tempPassword) } catch(_){} }} className="px-2 py-1 border rounded">Copy password</button>
            <button onClick={()=>setPwInfo(null)} className="px-2 py-1 border rounded">Close</button>
          </div>
        </div>
      )}

      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white rounded shadow-lg border">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold">{editing? 'Edit Patient' : 'Add Patient'}</h2>
              <button onClick={()=>{setModalOpen(false); resetForm()}} className="text-gray-500">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name">
                  <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required className="w-full border rounded px-3 py-2" />
                </Field>
                <Field label="Mobile">
                  <input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} className="w-full border rounded px-3 py-2" />
                </Field>
                <Field label="Email">
                  <input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} className="w-full border rounded px-3 py-2" />
                </Field>
                <Field label="DOB">
                  <input type="date" value={form.date_of_birth} onChange={e=>setForm({...form, date_of_birth:e.target.value})} className="w-full border rounded px-3 py-2" />
                </Field>
                <Field label="Gender">
                  <select value={form.gender} onChange={e=>setForm({...form, gender:e.target.value})} className="w-full border rounded px-3 py-2">
                    <option value="">-</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={e=>setForm({...form, status:e.target.value})} className="w-full border rounded px-3 py-2">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>
              <Field label="Address">
                <textarea value={form.address} onChange={e=>setForm({...form, address:e.target.value})} className="w-full border rounded px-3 py-2" rows={2} />
              </Field>

              {!editing && (
                <div className="space-y-2 border-t pt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={createLogin} onChange={e=>setCreateLogin(e.target.checked)} />
                    <span>Create login for patient</span>
                  </label>
                  {createLogin && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Send invite email">
                        <select value={form.sendInvite? 'yes':'no'} onChange={e=>setForm({...form, sendInvite: e.target.value==='yes'})} className="w-full border rounded px-3 py-2">
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </Field>
                      <Field label="Default password (optional)">
                        <input value={form.defaultPassword} onChange={e=>setForm({...form, defaultPassword:e.target.value})} className="w-full border rounded px-3 py-2" placeholder="If empty, generates auto" />
                      </Field>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">Note: Creating a patient requires the create-patient Edge Function to be deployed with service role key.</p>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={()=>{setModalOpen(false); resetForm()}} className="px-3 py-2 border rounded">Cancel</button>
                <button type="submit" disabled={sending} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60">{sending? 'Saving…':'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

