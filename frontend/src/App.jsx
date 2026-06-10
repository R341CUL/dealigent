import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDealStore } from './store/dealStore'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PillarDetail from './pages/PillarDetail'
import RedFlags from './pages/RedFlags'
import Financial from './pages/Financial'
import Synthesis from './pages/Synthesis'
import Report from './pages/Report'
import Wizard from './pages/Wizard'

function RequireAuth({ children }) {
  const isAuthenticated = useDealStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/wizard" element={<Wizard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pillar" element={<PillarDetail />} />
          <Route path="/pillar/:id" element={<PillarDetail />} />
          <Route path="/redflags" element={<RedFlags />} />
          <Route path="/financial" element={<Financial />} />
          <Route path="/synthesis" element={<Synthesis />} />
          <Route path="/report" element={<Report />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
