import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './hooks/useAuthStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetallePage from './pages/TicketDetallePage';
import NotificacionesPage from './pages/NotificacionesPage';
import {
  NuevoTicketPage, AgentesPage, ClientesPage, SLAPage,
  ReportesPage, KBPage, ConfigPage, EncuestaPage
} from './pages/extra-pages.jsx';
import './styles/global.css';

const PrivateRoute = ({ children, roles }) => {
  const { usuario } = useAuthStore();
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/encuesta/:token" element={<EncuestaPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/nuevo" element={<NuevoTicketPage />} />
          <Route path="tickets/:id" element={<TicketDetallePage />} />
          <Route path="notificaciones" element={<NotificacionesPage />} />
          <Route path="agentes" element={<PrivateRoute roles={['admin','supervisor']}><AgentesPage /></PrivateRoute>} />
          <Route path="clientes" element={<PrivateRoute roles={['admin','supervisor','agente']}><ClientesPage /></PrivateRoute>} />
          <Route path="sla" element={<PrivateRoute roles={['admin','supervisor']}><SLAPage /></PrivateRoute>} />
          <Route path="reportes" element={<PrivateRoute roles={['admin','supervisor']}><ReportesPage /></PrivateRoute>} />
          <Route path="kb" element={<KBPage />} />
          <Route path="config" element={<PrivateRoute roles={['admin']}><ConfigPage /></PrivateRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}