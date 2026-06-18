import axios from 'axios'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
})

// Interceptor: adicionar token JWT em todas as requisições
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  
  // Enviar a conta ativa para o backend filtrar as queries
  try {
    const accountType = useStore.getState().activeAccountType || 'REAL'
    config.headers['X-Account-Type'] = accountType
  } catch (e) {}

  return config
})

// Interceptor: tratar erros globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
