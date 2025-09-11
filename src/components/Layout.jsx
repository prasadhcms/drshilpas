import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoUrl from '../assets/drshilpas-logo.png'

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname || ''
  let routeTitle = ''
  if (path.startsWith('/appointments')) routeTitle = 'Appointments'

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-[#2874ba] text-white">
        <div className="max-w-[1360px] mx-auto px-6 py-3 flex items-center gap-4">
          <Link to="/appointments" className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center bg-white rounded-full p-1 shadow-sm">
              <img src={logoUrl} alt="Dr. Shilpa's Clinic" className="h-8 w-8 object-contain" />
            </span>
            <span className="text-lg sm:text-xl font-semibold">Dr. Shilpa's Clinic</span>
          </Link>
         
          <div className="ml-auto flex items-center gap-6">
            <div className="flex items-center gap-3 text-sm text-white/80">
              <span className="hidden sm:block">{user?.email}</span>
              <button onClick={handleSignOut} className="px-3 py-1.5 rounded bg-white/10 border border-white/20 text-white hover:bg-white/20">Sign out</button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-[1360px] mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}

