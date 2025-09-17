import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import logoUrl from '../assets/drshilpas-logo.png'

export default function Login() {
  const { signInWithPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error } = await signInWithPassword(email, password)
      if (error) throw error

      // Ensure session is fully established before navigating (prevents flicker)
      await supabase.auth.getSession()

      // Enforce web access only for admin/staff/doctor/dentist/receptionist
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) throw new Error('No user session')
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      if (profileError) throw profileError
      const allowed = ['admin', 'staff', 'doctor', 'receptionist']
      if (!allowed.includes((profile?.role || '').toLowerCase())) {
        await supabase.auth.signOut()
        throw new Error('Web access is restricted to Admin, Staff, Doctor, or Receptionist accounts')
      }

      navigate('/appointments', { replace: true })
    } catch (e) {
      setError(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white shadow rounded-lg p-6 border">
        <div className="flex flex-col items-center mb-4">
          <img src={logoUrl} alt="Dr. Shilpa's Clinic" className="h-27 md:h-30 w-auto mb-2" />
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        </div>
        {error && (
          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
