import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Appointments from './pages/Appointments'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/" element={<Navigate to="/appointments" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/appointments" replace />} />
      </Routes>
    </AuthProvider>
  )
}
