import React, { useState } from 'react';
import { Filter, X, Search, Calendar } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function DashboardFilterBar() {
  const { dashboardFilters, setDashboardFilters, fetchDashboard, loading } = useStore();
  
  // Local state for the inputs
  const [localFilters, setLocalFilters] = useState(dashboardFilters);

  const handleApply = () => {
    setDashboardFilters(localFilters);
    fetchDashboard();
  };

  const handleClear = () => {
    const emptyFilters = { startDate: '', endDate: '', asset: '', type: '' };
    setLocalFilters(emptyFilters);
    setDashboardFilters(emptyFilters);
    fetchDashboard();
  };

  const hasActiveFilters = dashboardFilters.startDate || dashboardFilters.endDate || dashboardFilters.asset || dashboardFilters.type;

  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 24,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 16,
      alignItems: 'flex-end'
    }}>
      <div style={{ flex: '1 1 200px' }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          Data Inicial
        </label>
        <div style={{ position: 'relative' }}>
          <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input 
            type="date"
            className="input"
            style={{ paddingLeft: 36, width: '100%' }}
            value={localFilters.startDate}
            onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
          />
        </div>
      </div>
      
      <div style={{ flex: '1 1 200px' }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          Data Final
        </label>
        <div style={{ position: 'relative' }}>
          <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input 
            type="date"
            className="input"
            style={{ paddingLeft: 36, width: '100%' }}
            value={localFilters.endDate}
            onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
          />
        </div>
      </div>
      
      <div style={{ flex: '1 1 200px' }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          Ativo
        </label>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input 
            type="text"
            className="input"
            placeholder="Ex: 1HZ100V"
            style={{ paddingLeft: 36, width: '100%' }}
            value={localFilters.asset}
            onChange={(e) => setLocalFilters({ ...localFilters, asset: e.target.value })}
          />
        </div>
      </div>
      
      <div style={{ flex: '1 1 150px' }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          Tipo
        </label>
        <select 
          className="input"
          style={{ width: '100%' }}
          value={localFilters.type}
          onChange={(e) => setLocalFilters({ ...localFilters, type: e.target.value })}
        >
          <option value="">Todos</option>
          <option value="CALL">CALL (Compra)</option>
          <option value="PUT">PUT (Venda)</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 12, flex: '1 1 200px' }}>
        <button 
          className="btn btn-primary" 
          onClick={handleApply}
          disabled={loading}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          <Filter size={16} />
          {loading ? 'Aplicando...' : 'Aplicar'}
        </button>
        
        {hasActiveFilters && (
          <button 
            className="btn btn-secondary" 
            onClick={handleClear}
            disabled={loading}
            style={{ justifyContent: 'center', padding: '0 12px' }}
            title="Limpar filtros"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
