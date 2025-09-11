import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute() {
  const { session } = useAuth()
  const [authorized, setAuthorized] = useState(null) // null=loading, false=deny, true=allow

  useEffect(() => {
    let mounted = true
    async function check() {
      if (!session) { setAuthorized(false); return }
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) { setAuthorized(false); return }
      const { data: profile } = await supabase.from('users').select('role').eq('id', userId).single()
      const allowed = ['admin', 'staff', 'doctor', 'dentist', 'receptionist']
      if (!mounted) return
      setAuthorized(allowed.includes((profile?.role || '').toLowerCase()))
    }
    check()
    return () => { mounted = false }
  }, [session])

  if (!session) return <Navigate to="/login" replace />
  if (authorized === null) return <div className="p-6 text-gray-600">Checking access...</div>
  if (authorized === false) return <Navigate to="/login" replace />
  return <Outlet />
}

