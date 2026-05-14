import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Layout } from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Instaladores from '@/pages/Instaladores'
import Obras from '@/pages/Obras'
import Servicos from '@/pages/Servicos'
import Atividades from '@/pages/Atividades'
import Adiantamentos from '@/pages/Adiantamentos'
import FechamentoSemanal from '@/pages/FechamentoSemanal'
import Pagamentos from '@/pages/Pagamentos'
import Usuarios from '@/pages/Usuarios'
import AuditLogPage from '@/pages/AuditLog'
import Relatorios from '@/pages/Relatorios'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => !!s.accessToken)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="instaladores" element={<Instaladores />} />
          <Route path="obras" element={<Obras />} />
          <Route path="servicos" element={<Servicos />} />
          <Route path="atividades" element={<Atividades />} />
          <Route path="adiantamentos" element={<Adiantamentos />} />
          <Route path="fechamento" element={<FechamentoSemanal />} />
          <Route path="pagamentos" element={<Pagamentos />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="audit-log" element={<AuditLogPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
