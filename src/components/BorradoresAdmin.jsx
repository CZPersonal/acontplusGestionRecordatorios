import { useState, useEffect, useRef, useMemo } from 'react';
import {
  User, Hash, MapPin, Phone, Mail, Calendar, Clock,
  FileText, CheckCircle2, Search, X, AlertCircle, Loader2,
  ArrowRight, Eye, Ban, Trash2, Navigation, Building2, Repeat,
} from 'lucide-react';
import { useBorradores } from '../hooks/useBorradores';
import { useTecnicos } from '../hooks/useTecnicos';
import { useAppStore } from '../lib/store';
import { formatDateOnly, formatDateTime } from '../utils/dates.js';
import { PERIODICIDAD_OPTIONS } from './BorradorSheet.jsx';

const periodicidadLabel = (value) => PERIODICIDAD_OPTIONS.find(o => o.value === value)?.label || value;

// ─── Modal de detalle / convertir ────────────────────────────────────────────

function BorradorDetailModal({ b, onClose, onConvert, onAnular, onDelete, converting }) {
  const isPendiente = b.status === 'Pendiente';
  const isAnulado   = b.status === 'Anulado';
  const [confirmAnular, setConfirmAnular] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const row = (icon, label, value, extra = null) => value ? (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="w-5 h-5 mt-0.5 flex-shrink-0 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-sm text-slate-800 font-medium mt-0.5 break-words">{value}</p>
        {extra}
      </div>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between flex-shrink-0"
          style={{ background: isPendiente ? 'linear-gradient(135deg, #D61672, #FFA901)' : isAnulado ? '#64748b' : 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          <div>
            <p className="text-xs font-bold text-white opacity-80 uppercase tracking-wide">Borrador de visita</p>
            <h3 className="text-base font-bold text-white mt-0.5">{b.clientName}</h3>
            <span className="inline-block mt-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white">
              {isPendiente ? '⏳ Pendiente' : isAnulado ? '🚫 Anulado' : '✅ Convertido'}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-white opacity-70 hover:opacity-100 hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-1">

          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Cliente</p>
          {row(<Hash size={14} className="text-slate-400" />,       'Cédula / RUC',       b.clientIdNumber)}
          {row(<User size={14} className="text-slate-400" />,       'Nombre y apellido',  b.clientName)}
          {row(<Phone size={14} className="text-slate-400" />,      'Teléfono',           b.clientPhone)}
          {row(<Mail size={14} className="text-slate-400" />,       'Email',              b.clientEmail)}
          {row(<MapPin size={14} className="text-slate-400" />,     'Dirección',          b.clientAddress)}
          {row(<MapPin size={14} className="text-slate-400" />,     'Ubicación',          b.clientUbicacion)}
          {row(<Building2 size={14} className="text-slate-400" />,  'Ciudad',             b.clientCiudad)}
          {row(<FileText size={14} className="text-slate-400" />,   'Referencia',         b.clientReferencia)}
          {row(
            <Navigation size={14} className="text-slate-400" />,
            'Google Maps',
            b.clientMapsLink,
            b.clientMapsLink ? (
              <a href={b.clientMapsLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-blue-600 hover:text-blue-800">
                <Navigation size={10} />Abrir mapa
              </a>
            ) : null
          )}

          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4 mb-2">Visita</p>
          {row(<Calendar size={14} className="text-slate-400" />,   'Fecha',
            b.scheduledDate ? formatDateOnly(b.scheduledDate) : null)}
          {row(<Clock size={14} className="text-slate-400" />,      'Hora',               b.scheduledTime)}
          {row(<FileText size={14} className="text-slate-400" />,   'Motivo',             b.motivo)}
          {row(<Repeat size={14} className="text-pink-500" />,      'Periodicidad',
            b.isPeriodica ? `${periodicidadLabel(b.periodicidad)} × ${b.periodicidadCantidad} visitas` : null)}

          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4 mb-2">Técnico</p>
          {row(<User size={14} className="text-slate-400" />,       'Nombre',             b.technicianName)}
          {row(<Mail size={14} className="text-slate-400" />,       'Email',              b.technicianEmail)}
          {row(<Clock size={14} className="text-slate-400" />,      'Creado',             b.createdAt ? formatDateTime(b.createdAt) : null)}
          {b.updatedAt && b.updatedAt !== b.createdAt &&
            row(<Clock size={14} className="text-slate-400" />,     'Modificado',         formatDateTime(b.updatedAt))}

          {b.status === 'Convertido' && (
            <>
              <p className="text-xs font-bold text-green-600 uppercase tracking-widest mt-4 mb-2">Conversión</p>
              {row(<CheckCircle2 size={14} className="text-green-600" />, 'Convertido el', b.convertedAt ? formatDateTime(b.convertedAt) : null)}
              {row(<User size={14} className="text-green-600" />,         'Convertido por', b.convertedBy)}
            </>
          )}
          {isAnulado && (
            <>
              <p className="text-xs font-bold text-red-600 uppercase tracking-widest mt-4 mb-2">Anulación</p>
              {row(<Ban size={14} className="text-red-600" />,  'Anulado el',  b.anuladoAt ? formatDateTime(b.anuladoAt) : null)}
              {row(<User size={14} className="text-red-600" />, 'Anulado por', b.anuladoPor)}
              {row(<Mail size={14} className="text-red-600" />, 'Email',       b.anuladoPorEmail)}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
          {confirmDelete ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-red-700 text-center">¿Eliminar permanentemente este borrador?</p>
              <p className="text-xs text-slate-500 text-center">Esta acción no se puede deshacer.</p>
              <div className="flex gap-2 mt-1">
                <button onClick={() => { onDelete(b); setConfirmDelete(false); }}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-bold bg-red-600 hover:bg-red-700 transition-colors">
                  Sí, eliminar
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : confirmAnular ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-red-700 text-center">¿Confirmar anulación del borrador?</p>
              <div className="flex gap-2">
                <button onClick={() => { onAnular(b); setConfirmAnular(false); }}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-bold bg-red-600 hover:bg-red-700 transition-colors">
                  Sí, anular
                </button>
                <button onClick={() => setConfirmAnular(false)}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {isPendiente && b.isPeriodica && (
                <div className="flex items-start gap-2 text-xs font-semibold text-pink-700 bg-pink-50 border border-pink-200 rounded-xl px-3 py-2.5">
                  <Repeat size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Visita periódica: {periodicidadLabel(b.periodicidad)} × {b.periodicidadCantidad} visitas.
                    Recuerda configurar la serie con "Repetir esta visita" al crear la visita.
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                {isPendiente && (
                  <button onClick={() => onConvert(b)} disabled={converting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60 transition-opacity"
                    style={{ background: converting ? '#86efac' : 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                    {converting ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                    {converting ? 'Procesando…' : 'Convertir en visita'}
                  </button>
                )}
                {isPendiente && (
                  <button onClick={() => setConfirmAnular(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-red-700 border-2 border-red-200 hover:bg-red-50 transition-colors">
                    <Ban size={15} />Anular
                  </button>
                )}
                <button onClick={onClose}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cerrar
                </button>
              </div>
              <button onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 border border-red-100 transition-colors">
                <Trash2 size={13} />Eliminar borrador permanentemente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta compacta de lista ────────────────────────────────────────────────

function BorradorRow({ b, onDetail }) {
  const isPendiente = b.status === 'Pendiente';
  const isAnulado   = b.status === 'Anulado';
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-shadow ${
        isPendiente ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
        : isAnulado  ? 'border-red-200 bg-red-50 hover:border-red-300'
        : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
      onClick={() => onDetail(b)}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isPendiente ? 'bg-amber-100' : isAnulado ? 'bg-red-100' : 'bg-green-100'
      }`}>
        {isPendiente
          ? <AlertCircle size={16} className="text-amber-600" />
          : isAnulado
            ? <Ban size={16} className="text-red-500" />
            : <CheckCircle2 size={16} className="text-green-600" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-800 truncate">{b.clientName}</p>
          <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
            isPendiente ? 'bg-amber-200 text-amber-800'
            : isAnulado  ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
          }`}>
            {isPendiente ? 'Pendiente' : isAnulado ? 'Anulado' : 'Convertido'}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {b.scheduledDate && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar size={10} />{formatDateOnly(b.scheduledDate)}
              {b.scheduledTime && ` · ${b.scheduledTime}`}
            </span>
          )}
          {b.technicianName && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <User size={10} />{b.technicianName}
            </span>
          )}
          {b.isPeriodica && (
            <span className="text-xs font-bold text-pink-600 flex items-center gap-1">
              <Repeat size={10} />{periodicidadLabel(b.periodicidad)} × {b.periodicidadCantidad}
            </span>
          )}
        </div>
        {b.motivo && (
          <p className="text-xs text-slate-400 italic mt-0.5 truncate">📝 {b.motivo}</p>
        )}
      </div>

      <Eye size={14} className="text-slate-300 flex-shrink-0 mt-1" />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BorradoresAdmin({ user }) {
  const { borradores, isLoading, convertBorrador, anuladoBorrador, deleteBorrador } = useBorradores(user);
  const addToast          = useAppStore(s => s.addToast);
  const openNewVisitModal = useAppStore(s => s.openNewVisitModal);
  const openNewVisit      = useAppStore(s => s.openNewVisit);
  const highlightedVisitId = useAppStore(s => s.highlightedVisitId);
  const { tecnicos } = useTecnicos(user);

  const adminName = useMemo(
    () => tecnicos.find(t => t.email === user.email)?.nombre || user.displayName || user.email,
    [tecnicos, user.email, user.displayName]
  );

  const [filter,     setFilter]     = useState('pendientes');
  const [search,     setSearch]     = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [detail,     setDetail]     = useState(null);

  // Borrador en proceso de conversión: guardamos ref para el useEffect
  const borradorConvertRef   = useRef(null);
  const prevHighlightRef     = useRef(highlightedVisitId);
  const prevOpenNewVisitRef  = useRef(openNewVisit);

  // Detectar cuando se guarda la visita y completar la conversión
  useEffect(() => {
    const wasOpen = prevOpenNewVisitRef.current;
    const isNowClosed = !openNewVisit;
    const visitChanged = highlightedVisitId !== prevHighlightRef.current;

    if (wasOpen && isNowClosed && visitChanged && borradorConvertRef.current) {
      const borrador = borradorConvertRef.current;
      borradorConvertRef.current = null;
      convertBorrador(borrador.id, { visitId: highlightedVisitId, adminEmail: user.email })
        .then(ok => {
          if (ok) addToast({ type: 'success', title: '✅ Borrador convertido', body: `La visita de ${borrador.clientName} fue creada y el borrador marcado como convertido.` });
          else    addToast({ type: 'error',   title: '⚠️ Atención',           body: 'La visita se guardó pero no se pudo marcar el borrador como convertido.' });
        });
    }

    prevOpenNewVisitRef.current  = openNewVisit;
    prevHighlightRef.current     = highlightedVisitId;
  }, [openNewVisit, highlightedVisitId]);

  const filtered = useMemo(() => {
    let list = borradores;
    if (filter === 'pendientes')  list = list.filter(b => b.status === 'Pendiente');
    if (filter === 'convertidos') list = list.filter(b => b.status === 'Convertido');
    if (filter === 'anulados')    list = list.filter(b => b.status === 'Anulado');
    if (dateFilter) list = list.filter(b => b.scheduledDate === dateFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(b =>
        (b.clientName     || '').toLowerCase().includes(q) ||
        (b.clientPhone    || '').toLowerCase().includes(q) ||
        (b.clientIdNumber || '').toLowerCase().includes(q) ||
        (b.technicianName || '').toLowerCase().includes(q) ||
        (b.motivo         || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [borradores, filter, dateFilter, search]);

  const pendientesCount = borradores.filter(b => b.status === 'Pendiente').length;

  const handleAnular = async (b) => {
    const ok = await anuladoBorrador(b.id, { nombre: adminName, email: user.email });
    if (ok) addToast({ type: 'success', title: '🚫 Borrador anulado', body: `El borrador de ${b.clientName} fue anulado.` });
    else    addToast({ type: 'error',   title: '❌ Error',            body: 'No se pudo anular el borrador.' });
  };

  const handleDelete = async (b) => {
    const ok = await deleteBorrador(b.id);
    if (ok) {
      setDetail(null);
      addToast({ type: 'success', title: '🗑️ Borrador eliminado', body: `El borrador de ${b.clientName} fue eliminado.` });
    } else {
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo eliminar el borrador.' });
    }
  };

  // Convertir: abre VisitFormUnified con datos del borrador pre-cargados
  const startConvert = (b) => {
    setDetail(null);
    borradorConvertRef.current = b;
    openNewVisitModal({
      clientId:        b.clientId        || null,
      contactId:       b.contactId       || null,
      clientName:      b.clientName      || '',
      phone:           b.clientPhone     || '',
      clientEmail:     b.clientEmail     || '',
      address:         b.clientAddress   || '',
      ubicacion:       b.clientUbicacion || '',
      ciudad:          b.clientCiudad    || '',
      referencia:      b.clientReferencia|| '',
      mapsLink:        b.clientMapsLink  || '',
      scheduledDate:   b.scheduledDate   || '',
      scheduledTime:   b.scheduledTime   || '',
      observations:    b.motivo          || '',
      technician:      b.technicianName  || '',
      technicianEmail: b.technicianEmail || '',
      urgency:         'Media',
      serviceOrder:    '',
      type:            '',
    });
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Borradores de visita</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {pendientesCount > 0
              ? `${pendientesCount} borrador${pendientesCount !== 1 ? 'es' : ''} pendiente${pendientesCount !== 1 ? 's' : ''} de procesar`
              : 'Sin borradores pendientes'}
          </p>
        </div>
      </div>

      {/* Alerta de pendientes */}
      {pendientesCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm font-bold text-amber-800">
            {pendientesCount} borrador{pendientesCount !== 1 ? 'es' : ''} esperando ser convertido{pendientesCount !== 1 ? 's' : ''} en visita formal
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
            {[
              { id: 'pendientes',  label: 'Pendientes' },
              { id: 'convertidos', label: 'Convertidos' },
              { id: 'anulados',    label: 'Anulados' },
              { id: 'todos',       label: 'Todos' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {f.label}
                {f.id === 'pendientes' && pendientesCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                    {pendientesCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-pink-400 transition-colors bg-white"
              />
            </div>
            {dateFilter && (
              <button onClick={() => setDateFilter('')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 border-2 border-slate-200 bg-white transition-colors whitespace-nowrap">
                <X size={12} />Limpiar
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, técnico, motivo…"
            className="w-full pl-9 pr-8 py-2 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-pink-400 transition-colors bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {isLoading && borradores.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-slate-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText size={44} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-sm">
            {search ? `Sin resultados para "${search}"` : 'Sin borradores'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <BorradorRow key={b.id} b={b} onDetail={setDetail} />
          ))}
        </div>
      )}

      {/* Modal detalle */}
      {detail && (
        <BorradorDetailModal
          b={detail}
          onClose={() => setDetail(null)}
          onConvert={startConvert}
          onAnular={handleAnular}
          onDelete={handleDelete}
          converting={false}
        />
      )}
    </div>
  );
}
