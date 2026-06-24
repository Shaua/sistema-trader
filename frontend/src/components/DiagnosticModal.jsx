import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, Activity, Database, Zap, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export default function DiagnosticModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostic();
    }
  }, [isOpen]);

  const fetchDiagnostic = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/deriv/diagnostic');
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isAllOk = data && 
    data.database.status === 'OK' && 
    data.broker.status === 'OK' && 
    data.scanner.status === 'OK' && 
    data.logs.status === 'OK';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 999,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)'
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)', zIndex: 1000,
              width: '90%', maxWidth: '650px',
              backgroundColor: '#0f172a', /* Dark slate background */
              border: '1px solid #1e293b',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px', borderBottom: '1px solid #1e293b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Activity size={20} color="#38bdf8" />
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
                  Diagnóstico do Sistema
                </h2>
              </div>
              <button 
                onClick={onClose}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
                  <div className="loading-spinner" style={{ marginBottom: 16 }}></div>
                  <p style={{ color: '#94a3b8' }}>Executando diagnóstico...</p>
                </div>
              ) : error ? (
                <div style={{ padding: '20px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#fca5a5' }}>
                  Ocorreu um erro ao buscar o diagnóstico: {error}
                </div>
              ) : data ? (
                <>
                  {/* Status Geral */}
                  <div style={{
                    backgroundColor: isAllOk ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${isAllOk ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    borderRadius: '12px', padding: '16px 20px', marginBottom: '24px',
                    display: 'flex', alignItems: 'center', gap: '16px'
                  }}>
                    {isAllOk ? <CheckCircle size={32} color="#10b981" /> : <XCircle size={32} color="#ef4444" />}
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: isAllOk ? '#10b981' : '#ef4444' }}>
                        Status Geral: {isAllOk ? 'OK' : 'ALERTA'}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                        Resumo do estado atual da infraestrutura
                      </p>
                    </div>
                  </div>

                  {/* Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
                    <StatusCard title="DATABASE" status={data.database.status} />
                    <StatusCard title="BROKER" status={data.broker.status} />
                    <StatusCard title="SCANNER" status={data.scanner.status} />
                    <StatusCard title="LOGS" status={data.logs.status} />
                  </div>

                  {/* Detalhes */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>
                      Detalhes da Execução
                    </h4>
                    <div style={{ border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden' }}>
                      <LogItem icon={<Database size={14} />} label="DATABASE" status={data.database.status} text={data.database.details} />
                      <LogItem icon={<Activity size={14} />} label="SCANNER" status={data.scanner.status} text={data.scanner.details} />
                      <LogItem icon={<Zap size={14} />} label="BROKER" status={data.broker.status} text={data.broker.details} />
                      <LogItem icon={<FileText size={14} />} label="LOGS" status={data.logs.status} text={data.logs.details} isLast />
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={onClose}
                style={{
                  padding: '8px 24px', backgroundColor: '#334155', color: '#f8fafc',
                  border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#475569'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#334155'}
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatusCard({ title, status }) {
  const isOk = status === 'OK';
  return (
    <div style={{
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    }}>
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', color: '#94a3b8' }}>{title}</span>
      <span style={{ fontSize: '16px', fontWeight: 700, color: isOk ? '#10b981' : '#ef4444' }}>{status}</span>
    </div>
  );
}

function LogItem({ icon, label, status, text, isLast }) {
  const isOk = status === 'OK';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '16px',
      padding: '16px', borderBottom: isLast ? 'none' : '1px solid #1e293b',
      backgroundColor: '#0f172a'
    }}>
      {isOk ? <CheckCircle size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '6px',
        fontSize: '10px', fontWeight: 600, color: '#94a3b8'
      }}>
        {label}
      </div>
      <span style={{ fontSize: '13px', color: '#cbd5e1', flex: 1 }}>{text}</span>
    </div>
  );
}
