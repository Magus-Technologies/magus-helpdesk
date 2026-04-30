import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './hooks/useAuthStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetallePage from './pages/TicketDetallePage';
import NuevoTicketPage from './pages/NuevoTicketPage';
import AgentesPage from './pages/AgentesPage';
import ClientesPage from './pages/ClientesPage';
import SLAPage from './pages/SLAPage';
import ReportesPage from './pages/ReportesPage';
import KBPage from './pages/KBPage';
import ConfigPage from './pages/ConfigPage';
import EncuestaPage from './pages/EncuestaPage';
import './styles/global.css';

const PrivateRoute = ({ children, roles }) => {
  const { usuario } = useAuthStore();
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter basename="/helpdesk">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/encuesta/:token" element={<EncuestaPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/nuevo" element={<NuevoTicketPage />} />
          <Route path="tickets/:id" element={<TicketDetallePage />} />
          <Route path="agentes" element={<PrivateRoute roles={['admin','supervisor']}><AgentesPage /></PrivateRoute>} />
          <Route path="clientes" element={<PrivateRoute roles={['admin','supervisor','agente']}><ClientesPage /></PrivateRoute>} />
          <Route path="sla" element={<PrivateRoute roles={['admin','supervisor']}><SLAPage /></PrivateRoute>} />
          <Route path="reportes" element={<PrivateRoute roles={['admin','supervisor']}><ReportesPage /></PrivateRoute>} />
          <Route path="kb" element={<KBPage />} />
          <Route path="config" element={<PrivateRoute roles={['admin']}><ConfigPage /></PrivateRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
