import { useState, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { formatDateOnly } from '../utils/dates.js';
import { X, Plus, Calendar, AlertTriangle, MapPin, User, Wrench } from 'lucide-react';

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const STATUS_DOT = {
  Programada: 'bg-blue-400',
  Confirmada: 'bg-teal-400',
  Realizada:  'bg-green-500',
  Cancelada:  'bg-slate-300',
  Anulada:    'bg-red-400',
};
const STATUS_BADGE = {
  Programada: 'bg-blue-100 text-blue-700',
  Confirmada: 'bg-teal-100 text-teal-700',
  Realizada:  'bg-green-100 text-green-700',
  Cancelada:  'bg-slate-100 text-slate-500',
  Anulada:    'bg-red-100 text-red-600',
};

export default function ClientHistorialModal({ client, onClose, onNewVisit }) {
  const visits = useAppStore(s => s.visits);
  const [selectedYear,  setSelectedYear]  = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);

  const clientVisits = useMemo(() =>
    visits
      .filter(v => v.clientId === client.id)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
    [visits, client.id]
  );

  const years = useMemo(() => {
    const ys = new Set(clientVisits.map(v => parseInt(v.scheduledDate.slice(0, 4))));
    ys.add(new Date().getFullYear());
    return [...ys].sort((a, b) => b - a);
  }, [clientVisits]);

  const yearVisits = useMemo(() =>
    clientVisits.filter(v => v.scheduledDate.startsWith(String(selectedYear))),
    [clientVisits, selectedYear]
  );

  const visitsByMonth = useMemo(() => {
    const map = {};
    for (let m = 0; m < 12; m++) map[m] = [];
    yearVisits.forEach(v => {
      const m = parseInt(v.scheduledDate.slice(5, 7)) - 1;
      map[m].push(v);
    });
    return map;
  }, [yearVisits]);

  const stats = useMemo(() => {
    const realized = clientVisits.filter(v => v.status === 'Realizada');
    const upcoming = [...clientVisits]
      .filter(v => v.status === 'Programada' || v.status === 'Confirmada')
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    const lastVisit = realized.length ? realized[realized.length - 1] : null;
    const nextVisit = upcoming[0] || null;
    let daysSinceLast = null;
    if (lastVisit) {
      const last = new Date(lastVisit.scheduledDate + 'T12:00:00');
      daysSinceLast = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
    }
    return { total: clientVisits.length, realized: realized.length, lastVisit, nextVisit, daysSinceLast };
  }, [clientVisits]);

  const gapAlert = stats.daysSinceLast !== null && stats.daysSinceLast > 90;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{client.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {client.identification} · {stats.total} visita{stats.total !== 1 ? 's' : ''} registradas
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onNewVisit && (
              <button onClick={() => { onClose(); onNewVisit(client); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-xl transition-opacity hover:opacity-90"
                style={{ background: '#D61672' }}>
                <Plus size={13} /> Nueva visita
              </button>
            )}
            <button onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Total visitas</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              <p className="text-xs text-slate-400">{stats.realized} realizadas</p>
            </div>
            <div className={`rounded-xl p-3 ${gapAlert ? 'bg-red-50' : 'bg-slate-50'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${gapAlert ? 'text-red-500' : 'text-slate-400'}`}>
                Última visita
              </p>
              {stats.lastVisit ? (
                <>
                  <p className={`text-sm font-bold leading-tight ${gapAlert ? 'text-red-700' : 'text-slate-800'}`}>
                    {formatDateOnly(stats.lastVisit.scheduledDate)}
                  </p>
                  <p className={`text-xs mt-0.5 ${gapAlert ? 'text-red-500' : 'text-slate-400'}`}>
                    {gapAlert ? `⚠️ hace ${stats.daysSinceLast}d` : `hace ${stats.daysSinceLast} días`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400">Sin visitas</p>
              )}
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Próxima visita</p>
              {stats.nextVisit ? (
                <>
                  <p className="text-sm font-bold text-slate-800 leading-tight">
                    {formatDateOnly(stats.nextVisit.scheduledDate)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {stats.nextVisit.technician || 'Sin técnico'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400">No programada</p>
              )}
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Este año</p>
              <p className="text-2xl font-bold text-slate-800">{yearVisits.length}</p>
              <p className="text-xs text-slate-400">en {selectedYear}</p>
            </div>
          </div>

          {/* Gap alert */}
          {gapAlert && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">
                Han pasado <strong>{stats.daysSinceLast} días</strong> desde la última visita realizada.
                Se recomienda agendar una visita.
              </p>
            </div>
          )}

          {/* Year selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-600 flex-shrink-0">Año:</p>
            {years.map(y => (
              <button key={y} onClick={() => { setSelectedYear(y); setSelectedMonth(null); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedYear === y ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                style={selectedYear === y ? { background: '#D61672' } : {}}>
                {y}
              </button>
            ))}
          </div>

          {/* 12-month strip */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {MONTHS_SHORT.map((name, m) => {
              const mVisits    = visitsByMonth[m] || [];
              const isSelected = selectedMonth === m;
              const hasVisits  = mVisits.length > 0;
              const realized   = mVisits.filter(v => v.status === 'Realizada').length;
              return (
                <button key={m} onClick={() => setSelectedMonth(isSelected ? null : m)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-pink-400 bg-pink-50 shadow-sm'
                      : hasVisits
                      ? 'border-slate-200 bg-white hover:border-pink-200'
                      : 'border-slate-100 bg-slate-50/60'
                  }`}>
                  <p className={`text-xs font-bold ${hasVisits ? 'text-slate-700' : 'text-slate-300'}`}>{name}</p>
                  {hasVisits ? (
                    <>
                      <div className="flex flex-wrap gap-0.5 mt-1.5">
                        {mVisits.map(v => (
                          <span key={v.id}
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[v.status] || 'bg-slate-300'}`}
                            title={`${formatDateOnly(v.scheduledDate)} — ${v.status}`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                        {mVisits.length} visita{mVisits.length !== 1 ? 's' : ''}
                        {realized > 0 && ` · ${realized} ✓`}
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-300 mt-1.5">Sin visitas</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Month detail */}
          {selectedMonth !== null && (
            <div>
              <p className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">
                {MONTHS_FULL[selectedMonth]} {selectedYear}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  — {visitsByMonth[selectedMonth].length} visita{visitsByMonth[selectedMonth].length !== 1 ? 's' : ''}
                </span>
              </p>
              {visitsByMonth[selectedMonth].length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Sin visitas este mes</p>
              ) : (
                <div className="space-y-2">
                  {visitsByMonth[selectedMonth].map(v => (
                    <div key={v.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="font-semibold text-slate-800 text-sm">
                          {formatDateOnly(v.scheduledDate)}
                          {v.scheduledTime && (
                            <span className="text-slate-400 font-normal ml-1.5">· {v.scheduledTime}</span>
                          )}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[v.status] || 'bg-slate-100 text-slate-500'}`}>
                          {v.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {v.technician && (
                          <span className="flex items-center gap-1">
                            <User size={10} />{v.technician}
                          </span>
                        )}
                        {(v.type || v.serviceType) && (
                          <span className="flex items-center gap-1">
                            <Wrench size={10} />{v.type || v.serviceType}
                          </span>
                        )}
                        {(v.ubicacion || v.ciudad) && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />{[v.ubicacion, v.ciudad].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>
                      {v.observations && (
                        <p className="text-xs text-slate-400 italic mt-1">📝 {v.observations}</p>
                      )}
                      {v.closingObservations && (
                        <p className="text-xs text-green-600 italic mt-1">✅ {v.closingObservations}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {clientVisits.length === 0 && (
            <div className="text-center py-12">
              <Calendar size={44} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-400 mb-1">Sin visitas registradas</p>
              <p className="text-xs text-slate-300">Las visitas de este cliente aparecerán aquí</p>
              {onNewVisit && (
                <button onClick={() => { onClose(); onNewVisit(client); }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-white text-sm font-bold rounded-xl"
                  style={{ background: '#D61672' }}>
                  <Plus size={14} /> Agendar primera visita
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
