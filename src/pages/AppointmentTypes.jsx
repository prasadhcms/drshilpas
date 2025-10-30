import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

export default function AppointmentTypes() {
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
  const [sending, setSending] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    color: '#2196F3',
    is_active: true,
  })

  function resetForm() {
    setForm({
      name: '',
      description: '',
      duration_minutes: 60,
      color: '#2196F3',
      is_active: true,
    })
    setEditing(null)
  }

  async function fetchAppointmentTypes() {
    try {
      setLoading(true)
      setError('')

      let query = supabase
        .from('appointment_types')
        .select('*', { count: 'exact' })

      if (status !== 'all') {
        query = query.eq('is_active', status === 'active')
      }
      if (search) {
        const like = `%${search}%`
        query = query.or(`name.ilike.${like},description.ilike.${like}`)
      }

      const from = (page - 1) * perPage
      const to = from + perPage - 1
      query = query.order('name', { ascending: true }).range(from, to)

      const { data, error, count } = await query
      if (error) throw error
      setRows(data || [])
      setCount(count || 0)
    } catch (e) {
      setError(e.message || 'Failed to fetch appointment types')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAppointmentTypes() }, [page, search, status])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / perPage)), [count])

  function openCreate() {
    resetForm()
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    setForm({
      name: row.name || '',
      description: row.description || '',
      duration_minutes: row.duration_minutes || 60,
      color: row.color || '#2196F3',
      is_active: row.is_active !== false,
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      if (!form.name) throw new Error('Name is required')
      if (form.duration_minutes <= 0) throw new Error('Duration must be greater than 0')

      const payload = {
        name: form.name,
        description: form.description,
        duration_minutes: form.duration_minutes,
        color: form.color,
        is_active: form.is_active,
      }

      if (editing) {
        // Update existing appointment type
        const { error } = await supabase
          .from('appointment_types')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
      } else {
        // Create new appointment type
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase
          .from('appointment_types')
          .insert([{
            ...payload,
            created_by: user?.id
          }])
        if (error) throw error
      }

      setModalOpen(false)
      resetForm()
      fetchAppointmentTypes()
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSending(false)
    }
  }

  async function toggleActive(row) {
    const newStatus = !row.is_active
    const { error } = await supabase
      .from('appointment_types')
      .update({ is_active: newStatus })
      .eq('id', row.id)
    if (!error) fetchAppointmentTypes()
  }

  function exportCSV() {
    const headers = ['name', 'description', 'duration_minutes', 'color', 'status']
    const esc = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"'
    const rowsOut = (rows || []).map(r => [
      r.name,
      r.description || '',
      r.duration_minutes,
      r.color || '',
      r.is_active ? 'Active' : 'Inactive'
    ])
    const csv = [headers.join(','), ...rowsOut.map(r => r.map(esc).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'appointment_types.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Appointment Types</h1>
        <div className="flex items-center gap-2">
          <input 
            value={search} 
            onChange={e=>{setSearch(e.target.value); setPage(1)}} 
            placeholder="Search name or description" 
            className="border rounded px-3 py-1.5 text-sm w-72" 
          />
          <select 
            value={status} 
            onChange={e=>{setStatus(e.target.value); setPage(1)}} 
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button 
            onClick={exportCSV} 
            className="bg-slate-600 text-white px-3 py-2 rounded text-sm hover:bg-slate-700"
          >
            Export CSV
          </button>
          <button 
            onClick={openCreate} 
            className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
          >
            Add Type
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}

      <div className="bg-white rounded border shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Description</th>
              <th className="text-left px-4 py-2">Duration</th>
              <th className="text-left px-4 py-2">Color</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2 font-medium">{r.name}</td>
                <td className="px-4 py-2">{r.description || '-'}</td>
                <td className="px-4 py-2">{r.duration_minutes} minutes</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border" 
                      style={{ backgroundColor: r.color }}
                    />
                    <span>{r.color}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button 
                    onClick={()=>openEdit(r)} 
                    className="px-2 py-1 rounded border text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={()=>toggleActive(r)} 
                    className="px-2 py-1 rounded border text-gray-700 hover:bg-gray-50"
                  >
                    {r.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  {loading ? 'Loading…' : 'No appointment types found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center text-sm">
        <div>
          Showing {(rows.length ? (page-1)*perPage+1 : 0)}–{(page-1)*perPage+rows.length} of {count}
        </div>
        <div className="space-x-2">
          <button 
            disabled={page<=1} 
            onClick={()=>setPage(p=>Math.max(1,p-1))} 
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span>Page {page} / {totalPages}</span>
          <button 
            disabled={page>=totalPages} 
            onClick={()=>setPage(p=>Math.min(totalPages,p+1))} 
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white rounded shadow-lg border">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold">{editing ? 'Edit Appointment Type' : 'Add Appointment Type'}</h2>
              <button 
                onClick={()=>{setModalOpen(false); resetForm()}} 
                className="text-gray-500"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <Field label="Name *">
                  <input 
                    value={form.name} 
                    onChange={e=>setForm({...form, name:e.target.value})} 
                    required 
                    className="w-full border rounded px-3 py-2" 
                    placeholder="e.g., Regular Checkup, Teeth Cleaning"
                  />
                </Field>
                <Field label="Description">
                  <textarea 
                    value={form.description} 
                    onChange={e=>setForm({...form, description:e.target.value})} 
                    className="w-full border rounded px-3 py-2" 
                    rows={2}
                    placeholder="Brief description of the appointment type"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Duration (minutes) *">
                    <input 
                      type="number" 
                      value={form.duration_minutes} 
                      onChange={e=>setForm({...form, duration_minutes:parseInt(e.target.value) || 60})} 
                      required 
                      min="1"
                      className="w-full border rounded px-3 py-2" 
                    />
                  </Field>
                  <Field label="Color">
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={form.color} 
                        onChange={e=>setForm({...form, color:e.target.value})} 
                        className="w-10 h-10 border rounded" 
                      />
                      <input 
                        value={form.color} 
                        onChange={e=>setForm({...form, color:e.target.value})} 
                        className="flex-1 border rounded px-3 py-2 text-sm" 
                        placeholder="#2196F3"
                      />
                    </div>
                  </Field>
                </div>
                <Field label="Status">
                  <select 
                    value={form.is_active ? 'active' : 'inactive'} 
                    onChange={e=>setForm({...form, is_active:e.target.value === 'active'})} 
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={()=>{setModalOpen(false); resetForm()}} 
                  className="px-3 py-2 border rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={sending} 
                  className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                >
                  {sending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}