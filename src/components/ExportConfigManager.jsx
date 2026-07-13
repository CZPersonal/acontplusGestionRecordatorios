import { useState, useEffect, useRef } from 'react';
import {
  X, GripVertical, RotateCcw, Save, CheckCircle,
  Loader2, FileText, Eye, EyeOff, Info
} from 'lucide-react';
import { VISIT_COLUMNS, BILLING_COLUMNS, CLIENT_COLUMNS, SERIES_COLUMNS } from '../hooks/useExportConfig.js';
import { useAppStore } from '../lib/store.js';

const REPORT_TABS = [
  { key: 'visits',  label: 'Visitas',  defaults: VISIT_COLUMNS  },
  { key: 'billing', label: 'Cobros',   defaults: BILLING_COLUMNS },
  { key: 'clients', label: 'Clientes', defaults: CLIENT_COLUMNS },
  { key: 'series',  label: 'Series',   defaults: SERIES_COLUMNS },
];

// ─── Fila de columna con drag ──────────────────────────────────────────────────
function ColumnRow({ col, index, onToggle, onDragStart, onDragOver, onDrop, isDragging }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      onDrop={() => onDrop(index)}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-grab select-none ${
        isDragging
          ? 'opacity-40 border-pink-300 bg-pink-50'
          : col.enabled
            ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
            : 'bg-slate-50 border-slate-100'
      }`}
    >
      {/* Handle drag */}
      <GripVertical size={14} className="text-slate-300 flex-shrink-0" />

      {/* Nombre columna */}
      <span className={`flex-1 text-sm ${col.enabled ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
        {col.label}
      </span>

      {/* Toggle activar/desactivar */}
      <button
        type="button"
        onClick={() => onToggle(index)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
          col.enabled
            ? 'text-white'
            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
        }`}
        style={col.enabled ? { background: 'linear-gradient(135deg, #D61672, #FFA901)' } : {}}
        title={col.enabled ? 'Desactivar columna' : 'Activar columna'}
      >
        {col.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
        {col.enabled ? 'Activa' : 'Oculta'}
      </button>
    </div>
  );
}

// ─── Panel de un reporte ───────────────────────────────────────────────────────
function ReportPanel({ type, columns, onSave, onReset, isLoading }) {
  const addToast = useAppStore(s => s.addToast);
  const [localCols, setLocalCols] = useState(columns);
  const [saved,     setSaved]     = useState(false);
  const dragFrom    = useRef(null);
  const dragOverIdx = useRef(null);

  // Mantener sincronizado si las props cambian (ej: guardado externo).
  // Antes usaba useState(fn, deps) por error -- useState no acepta un
  // array de dependencias, así que nunca resincronizaba tras el mount inicial.
  useEffect(() => { setLocalCols(columns); }, [columns]);

  const handleToggle = (idx) => {
    setLocalCols(prev => prev.map((c, i) => i === idx ? { ...c, enabled: !c.enabled } : c));
    setSaved(false);
  };

  const handleDragStart = (idx) => { dragFrom.current = idx; };
  const handleDragOver  = (idx) => { dragOverIdx.current = idx; };
  const handleDrop      = () => {
    const from = dragFrom.current;
    const to   = dragOverIdx.current;
    if (from === null || to === null || from === to) return;
    const updated = [...localCols];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setLocalCols(updated);
    dragFrom.current = null;
    dragOverIdx.current = null;
    setSaved(false);
  };

  const handleSave = async () => {
    const ok = await onSave(type, localCols);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo guardar la configuración de columnas.' });
    }
  };

  const handleReset = async () => {
    if (!window.confirm('¿Restaurar la configuración por defecto para este reporte?')) return;
    await onReset(type);
    // El hook actualizará las columnas via onSnapshot
  };

  const activeCount = localCols.filter(c => c.enabled).length;

  return (
    <div className="space-y-4">

      {/* Info */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 rounded-xl border border-blue-100">
        <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Activa o desactiva columnas y arrastra las filas para cambiar el orden. 
          El resultado aplica a las exportaciones Excel y CSV de este reporte.
          <br />
          <span className="font-semibold">{activeCount} de {localCols.length} columnas activas.</span>
        </p>
      </div>

      {/* Controles rápidos */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setLocalCols(prev => prev.map(c => ({ ...c, enabled: true }))); setSaved(false); }}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          Activar todas
        </button>
        <button
          type="button"
          onClick={() => { setLocalCols(prev => prev.map(c => ({ ...c, enabled: false }))); setSaved(false); }}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          Desactivar todas
        </button>
      </div>

      {/* Lista de columnas */}
      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
        {localCols.map((col, idx) => (
          <ColumnRow
            key={col.key}
            col={col}
            index={idx}
            onToggle={handleToggle}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragging={dragFrom.current === idx}
          />
        ))}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-60 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}
        >
          {isLoading
            ? <Loader2 size={14} className="animate-spin" />
            : saved
              ? <CheckCircle size={14} />
              : <Save size={14} />
          }
          {saved ? '¡Guardado!' : isLoading ? 'Guardando...' : 'Guardar configuración'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-40"
          title="Restaurar valores por defecto"
        >
          <RotateCcw size={14} />
          Restaurar
        </button>
      </div>
    </div>
  );
}

// ─── Modal principal ───────────────────────────────────────────────────────────
export default function ExportConfigManager({ configs, isLoading, onSave, onReset, onClose }) {
  const [activeTab, setActiveTab] = useState('visits');

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="px-5 py-4 text-white flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          <div>
            <h3 className="font-bold text-base">Configurar columnas de exportación</h3>
            <p className="text-xs opacity-80 mt-0.5">
              Elige qué campos incluir al exportar cada reporte
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 text-white opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs de reporte */}
        <div className="flex border-b border-slate-200 flex-shrink-0">
          {REPORT_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 text-slate-800'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
              style={activeTab === tab.key ? { borderColor: '#D61672', color: '#D61672' } : {}}
            >
              <FileText size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel activo */}
        <div className="flex-1 overflow-y-auto p-5">
          {REPORT_TABS.map(tab => (
            activeTab === tab.key && (
              <ReportPanel
                key={tab.key}
                type={tab.key}
                columns={configs[tab.key] || tab.defaults}
                onSave={onSave}
                onReset={onReset}
                isLoading={isLoading}
              />
            )
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0 bg-slate-50">
          <button onClick={onClose}
            className="w-full py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
