import { create } from 'zustand';
import api from '../utils/api';

const useAuthStore = create((set, get) => ({
  usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
  token: localStorage.getItem('token'),
  cargando: false,
  error: null,

  login: async (email, password) => {
    set({ cargando: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, usuario } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      set({ usuario, token, cargando: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Error al iniciar sesión', cargando: false });
      return false;
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    set({ usuario: null, token: null });
  },

  esAdmin: () => ['admin'].includes(get().usuario?.rol),
  esSupervisor: () => ['admin','supervisor'].includes(get().usuario?.rol),
  esAgente: () => ['admin','supervisor','agente'].includes(get().usuario?.rol),
  esCliente: () => get().usuario?.rol === 'cliente',
}));

export default useAuthStore;
