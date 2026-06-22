import { useState, useMemo, useEffect } from 'react';
import { X, Plus, Trash2, CalendarDays, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDateOnly } from '../utils/dates.js';
import { fmtMoney } from '../utils/format.js';
import { calcPaymentSummary } from '../services/visitBilling.js';
import { localDateStr } from '../utils/dates.js';

export default function AbonosModal({ task, visit, visitAbonos = [], user, onClose, onAdd, onDelete }) {
  const summary         = calcPaymentSummary(visit);
  const totalProgramado = useMemo(() => visitAbonos.reduce((s, a) => s + (a.valor || 0), 0), [visitAbonos]);
  const disponible      = Math.max(0, summary.total - totalProgramado);

  const [fecha,   setFecha]   = useState(localDateStr());
  const [valor,   setValor]   = useState('');
  const [nota,    setNota]    = useState('');
  const [err,     setErr]     = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Cerrar con Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const handleAdd = async () => {
    setErr('');
    const v = parseFloat(valor);
    if (!fecha)       { setErr('Selecciona una fecha.'); return; }
    if (!v || v <= 0) { setErr('Ingresa un valor mayor a cero.'); return; }
    if (v > disponible + 0.001) {
      setErr(`El valor ($${fmtMoney(v)}) supera el disponible ($${fmtMoney(disponible)}).`);
      return;
    }
    setSaving(true);
    try {
      await onAdd({
        visitId:      visit.id,
        taskId:       task.id,
        clientName:   task.clientName   || '',
        clientPhone:  task.clientPhone  || '',
        serviceOrder: task.serviceOrder || '',
        totalCobro:   summary.total,
        fecha,
        valor:        v,
        nota:         nota.trim(),
        estado:       'pendiente',
        createdBy:    user?.email || '',
      });
      setFecha(localDateStr()); setValor(''); setNota('');
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr('Error al guardar. Intenta de nuevo.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try { await onDelete(id); }
    catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const inp = "w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff7ed)' }}>
          <div>
            <p className="text-base font-bold text-slate-800">Programar abonos</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {task.clientName}
              {task.serviceOrder && <span className="ml-2 font-mono text-purple-600">OS: {task.serviceOrder}</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Resumen financiero */}
        <div className="px-5 py-3 grid grid-cols-4 gap-2 border-b border-slate-100 flex-shrink-0 bg-slate-50">
          {[
            { label: 'Total cobro',     value: `$${fmtMoney(summary.total)}`,    color: 'text-slate-700' },
            { label: 'Ya cobrado',      value: `$${fmtMoney(summary.abonado)}`,  color: 'text-green-700' },
            { label: 'Programado',      value: `$${fmtMoney(totalProgramado)}`,  color: 'text-blue-700'  },
            { label: 'Disponible',      value: `$${fmtMoney(disponible)}`,       color: disponible > 0 ? 'text-orange-600' : 'text-slate-400' },
          ].map(k => (
            <div key={k.label} className="text-center">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">{k.label}</p>
              <p className={`text-sm font-bold mt-0.5 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Lista de abonos programados */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {visitAbonos.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Sin abonos programados</p>
              <p className="text-xs mt-0.5">Agrega el primer compromiso de pago</p>
            </div>
          ) : (
            visitAbonos.map(a => (
              <div key={a.id} className="flex items-center gap-3 bg-white border-2 border-slate-100 rounded-xl px-3 py-2.5 hover:border-slate-200 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <CalendarDays size={14} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-700">{formatDateOnly(a.fecha)}</p>
                    <span className="text-sm font-bold text-blue-700">${fmtMoney(a.valor)}</span>
                    {a.estado === 'pagado' && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">✅ Pagado</span>
                    )}
                  </div>
                  {a.nota && <p className="text-xs text-slate-400 truncate mt-0.5">📝 {a.nota}</p>}
                </div>
                <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id}
                  className="flex-shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Formulario agregar */}
        {disponible > 0 ? (
          <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Agregar compromiso</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Fecha</label>
                <input type="date" value={fecha} onChange={e => { setFecha(e.target.value); setErr(''); }}
                  className={inp}
                  onFocus={e => e.target.style.borderColor = '#D61672'}
                  onBlur={e  => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  Valor <span className="text-slate-400 font-normal">(máx. ${fmtMoney(disponible)})</span>
                </label>
                <input type="number" min="0.01" step="0.01" value={valor}
                  onChange={e => { setValor(e.target.value); setErr(''); }}
                  placeholder="0.00"
                  className={`${inp} font-mono`}
                  onFocus={e => e.target.style.borderColor = '#D61672'}
                  onBlur={e  => e.target.style.borderColor = '#e2e8f0'} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Nota (opcional)</label>
              <input type="text" value={nota} onChange={e => setNota(e.target.value)}
                placeholder="Ej: Cuota 1 de 3, transferencia..."
                className={inp}
                onFocus={e => e.target.style.borderColor = '#D61672'}
                onBlur={e  => e.target.style.borderColor = '#e2e8f0'} />
            </div>
            {err && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="flex-shrink-0" />{err}
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                <CheckCircle size={13} />Abono programado correctamente.
              </div>
            )}
            <button onClick={handleAdd} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-all"
              style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              {saving ? '⏳ Guardando...' : <><Plus size={15} />Agregar abono</>}
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 text-center">
            <p className="text-sm text-slate-500 font-medium">
              {summary.total === 0
                ? 'Esta visita no tiene valor de cobro registrado.'
                : '✅ El total está completamente programado.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
