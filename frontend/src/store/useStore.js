import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import api from '../lib/api'

/**
 * Store principal da aplicação — gerencia auth, dados globais e KPIs
 */
export const useStore = create(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      session: null,
      profile: null,
      
      // Config
      bankConfig: null,
      riskConfig: null,
      
      // Filters
      dashboardFilters: {
        startDate: '',
        endDate: '',
        asset: '',
        type: ''
      },
      
      // KPIs
      kpis: null,
      charts: null,
      alerts: [],
      insights: [],
      
      // UI
      sidebarOpen: true,
      loading: false,
      
      // ============================================================
      // Auth Actions
      // ============================================================
      setSession: async (session) => {
        set({ session, user: session?.user || null })
        if (session?.user) {
          const { data } = await supabase.from('user_profiles').select('role, deriv_token, deriv_demo_token, active_account_type, deriv_app_id').eq('id', session.user.id).single()
          if (data) {
            set({ 
              profile: data,
              activeAccountType: data.active_account_type || 'REAL'
            })
          }
        }
      },
      
      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, session: null, profile: null, kpis: null, bankConfig: null, activeAccountType: 'REAL' })
      },
      
      updateProfile: (updates) => set((state) => ({ profile: { ...state.profile, ...updates } })),
      
      setActiveAccountType: async (type) => {
        set({ activeAccountType: type });
        try {
          const { session } = get()
          if (session?.user?.id) {
            await supabase.from('user_profiles').update({ active_account_type: type }).eq('id', session.user.id)
          }
        } catch(e) { console.error(e) }
        
        await get().fetchDashboard()
        await get().fetchBankConfig()
        await get().fetchRiskConfig()
      },

      // ============================================================
      // Data Actions
      // ============================================================
      fetchDashboard: async () => {
        try {
          set({ loading: true })
          const filters = get().dashboardFilters
          const query = new URLSearchParams()
          if (filters.startDate) query.append('startDate', filters.startDate)
          if (filters.endDate) query.append('endDate', filters.endDate)
          if (filters.asset) query.append('asset', filters.asset)
          if (filters.type) query.append('type', filters.type)
          
          const qs = query.toString() ? `?${query.toString()}` : ''

          const [kpisRes, chartsRes, alertsRes, insightsRes] = await Promise.all([
            api.get(`/stats/dashboard${qs}`),
            api.get(`/stats/charts${qs}`),
            api.get(`/stats/alerts${qs}`),
            api.get(`/stats/insights${qs}`),
          ])
          set({
            kpis: kpisRes.data,
            charts: chartsRes.data,
            alerts: alertsRes.data,
            insights: insightsRes.data,
          })
        } catch (err) {
          console.error('Dashboard fetch error:', err)
        } finally {
          set({ loading: false })
        }
      },
      
      fetchBankConfig: async () => {
        try {
          const res = await api.get('/bank')
          set({ bankConfig: res.data })
          return res.data
        } catch (err) {
          console.error(err)
        }
      },
      
      fetchRiskConfig: async () => {
        try {
          const res = await api.get('/risk')
          set({ riskConfig: res.data })
          return res.data
        } catch (err) {
          console.error(err)
        }
      },
      
      // ============================================================
      // UI Actions
      // ============================================================
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      setDashboardFilters: (filters) => set((state) => ({ dashboardFilters: { ...state.dashboardFilters, ...filters } })),
      
      // ============================================================
      // Realtime Actions
      // ============================================================
      realtimeSubscription: null,
      setupRealtime: () => {
        const userId = get().user?.id
        if (!userId || get().realtimeSubscription) return

        console.log('Configurando Supabase Realtime para operações...')
        const subscription = supabase.channel('operations-channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'operations', filter: `user_id=eq.${userId}` },
            (payload) => {
              console.log('Atualização em tempo real recebida!', payload)
              get().fetchDashboard() // Atualiza os gráficos e KPIs
            }
          )
          .subscribe()
          
        set({ realtimeSubscription: subscription })
      },
      cleanupRealtime: () => {
        const sub = get().realtimeSubscription
        if (sub) {
          supabase.removeChannel(sub)
          set({ realtimeSubscription: null })
        }
      }
    }),
    {
      name: 'traderdesk-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)
