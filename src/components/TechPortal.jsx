import { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import { getVisitsRef } from '../lib/tenantDb';
import { formatDateOnly, formatDateTime } from '../utils/dates.js';
import {
  AlertTriangle, Calendar, CheckCircle2, Clock,
  LogOut, MapPin, Phone, Wrench, X,
  ChevronLeft, ChevronRight, List, RefreshCw, CheckCircle,
} from 'lucide-react';

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function localToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
}

function localNowTime() {
  const d = new Date();
  return d.toLocaleTimeString('en-GB', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit' });
}

function isLateConfirmation(visit) {
  if (!visit?.confirmedAt || !visit?.scheduledDate) return false;
  const scheduled = new Date(`${visit.scheduledDate}T${visit.scheduledTime || '23:59'}:00-05:00`);
  return new Date(visit.confirmedAt) > scheduled;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
}

function getWeekDays(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
  });
}

function fmtDayLabel(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

function fmtDayName(dateStr) {
  const names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const d = new Date(dateStr + 'T12:00:00');
  return names[d.getDay()];
}

function fmtWeekRange(days) {
  const first = days[0], last = days[6];
  const [, fm, fd] = first.split('-');
  const [ly, lm, ld] = last.split('-');
  if (fm === lm) return `${fd}–${ld}/${lm}/${ly}`;
  return `${fd}/${fm} – ${ld}/${lm}/${ly}`;
}

const URGENCY_BG     = { Alta: '#fef2f2', Media: '#fffbeb', Baja: '#f0fdf4' };
const URGENCY_BORDER = { Alta: '#fca5a5', Media: '#fcd34d', Baja: '#86efac' };
const URGENCY_TEXT   = { Alta: '#dc2626', Media: '#b45309', Baja: '#15803d' };

// ─── Modal: marcar visita como realizada ─────────────────────────────────────

function CompleteModal({ visit, task, onSave, onClose }) {
  const [obs,        setObs]        = useState('');
  const [visitValue, setVisitValue] = useState('0');
  const [loading,    setLoading]    = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(task.id, visit.id, {
        closingObservations: obs.trim(),
        visitValue:          parseFloat(visitValue) || 0,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Marcar como realizada</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {task.clientName} · {formatDateOnly(visit.scheduledDate)}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Observaciones <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea
            value={obs} onChange={e => setObs(e.target.value)} rows={3}
            placeholder="Describe el trabajo realizado…"
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-green-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Valor de la visita <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
            <input
              type="number" min="0" step="0.01" value={visitValue}
              onChange={e => setVisitValue(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-green-400"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-colors"
            style={{ background: loading ? '#86efac' : 'linear-gradient(135deg, #16a34a, #15803d)' }}>
            {loading ? 'Guardando…' : '✓ Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de visita ────────────────────────────────────────────────────────

function VisitCard({ visit, task, onConfirm, confirming, onComplete }) {
  const today       = localToday();
  const nowTime     = localNowTime();
  const isConfirmed = visit.confirmed || visit.technicianConfirmed;
  const isLate      = isConfirmed && isLateConfirmation(visit);
  const isOverdue   = !isConfirmed && (
    visit.scheduledDate < today ||
    (visit.scheduledDate === today && !!visit.scheduledTime && visit.scheduledTime < nowTime)
  );

  const urgBg     = URGENCY_BG[visit.urgency]    || '#f8fafc';
  const urgBorder = URGENCY_BORDER[visit.urgency] || '#e2e8f0';
  const urgText   = URGENCY_TEXT[visit.urgency]   || '#64748b';

  // Borde izquierdo refleja el estado más importante
  const statusBorder = isOverdue   ? '#ef4444'
    : isLate      ? '#f97316'
    : isConfirmed ? '#22c55e'
    : urgBorder;

  return (
    <div className="bg-white rounded-2xl border-2 shadow-sm overflow-hidden"
      style={{ borderColor: statusBorder }}>
      <div className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap"
        style={{ background: urgBg }}>
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {task.serviceOrder && (
            <span className="flex-shrink-0 text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white/70 text-slate-600 border border-slate-200">
              OS: {task.serviceOrder}
            </span>
          )}
          <span className="font-bold text-slate-800">{task.clientName}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {visit.urgency && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full border"
              style={{ color: urgText, borderColor: urgBorder, background: 'white' }}>
              {visit.urgency}
            </span>
          )}
          {/* Etiqueta de estado de confirmación */}
          {isOverdue && (
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              <AlertTriangle size={11} />Atrasada
            </span>
          )}
          {isConfirmed && !isLate && (
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
              <CheckCircle2 size={11} />Confirmada
            </span>
          )}
          {isConfirmed && isLate && (
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
              <AlertTriangle size={11} />Conf. tardía
            </span>
          )}
        </div>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-5 flex-wrap">
          {visit.scheduledTime && (
            <span className={`flex items-center gap-1.5 text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
              <Clock size={14} className={isOverdue ? 'text-red-400' : 'text-slate-400'} />{visit.scheduledTime}
            </span>
          )}
          {visit.type && (
            <span className="flex items-center gap-1.5 text-sm text-slate-600">
              <Wrench size={14} className="text-slate-400" />{visit.type}
            </span>
          )}
        </div>
        {task.clientAddress && (
          <p className="flex items-start gap-1.5 text-sm text-slate-600 break-words">
            <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <span>{task.clientAddress}</span>
          </p>
        )}
        {task.clientPhone && (
          <a href={`tel:${task.clientPhone}`}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
            <Phone size={14} />{task.clientPhone}
          </a>
        )}
        {visit.observations && (
          <p className="text-xs text-slate-400 italic">📝 {visit.observations}</p>
        )}
        {isConfirmed && visit.confirmedBy && (
          <p className={`text-xs font-semibold ${isLate ? 'text-orange-600' : 'text-green-600'}`}>
            {isLate ? '⚠️' : '✓'} Confirmada por {visit.confirmedBy}
            {visit.confirmedAt && ` — ${formatDateTime(visit.confirmedAt)}`}
          </p>
        )}
      </div>
      {visit.status === 'Realizada' ? (
        <div className="px-4 pb-4 space-y-1.5 bg-emerald-50 border-t border-emerald-100 pt-3">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">✅ Visita realizada</p>
          {visit.completedAt && (
            <p className="text-xs text-emerald-600">Fecha: {formatDateTime(visit.completedAt)}</p>
          )}
          {visit.completedBy && (
            <p className="text-xs text-emerald-600">Por: {visit.completedBy}</p>
          )}
          {visit.visitValue > 0 && (
            <p className="text-xs font-bold text-emerald-700">Valor cobrado: ${visit.visitValue}</p>
          )}
          {visit.closingObservations && (
            <p className="text-xs text-emerald-600 italic">📝 {visit.closingObservations}</p>
          )}
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-2">
          {isConfirmed && (
            <button onClick={() => onComplete(visit, task)}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-base shadow-sm"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              <CheckCircle2 size={18} className="inline mr-2 -mt-0.5" />
              Marcar como realizada
            </button>
          )}
          {!isConfirmed && (
            <button onClick={() => onConfirm(task.id, visit.id)} disabled={confirming === visit.id}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-sm disabled:opacity-60"
              style={{ background: confirming === visit.id ? '#86efac' : 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              {confirming === visit.id ? 'Confirmando...' : '✓ Confirmar asistencia'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Vista de lista (secciones) ───────────────────────────────────────────────

function Section({ title, icon: Icon, color, visits, onConfirm, confirming, onComplete }) {
  if (visits.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={18} style={{ color }} />
        <h3 className="font-bold text-slate-700" style={{ color }}>{title}</h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: color + '20', color }}>{visits.length}</span>
      </div>
      <div className="space-y-3">
        {visits.map(({ visit, task: t }) => (
          <VisitCard key={visit.id} visit={visit} task={t}
            onConfirm={onConfirm} confirming={confirming} onComplete={onComplete} />
        ))}
      </div>
    </div>
  );
}

// ─── Vista día ────────────────────────────────────────────────────────────────

function DayView({ allVisitsByDate, calDate, setCalDate, today, onConfirm, confirming, onComplete }) {
  const visits = (allVisitsByDate[calDate] || []).sort((a, b) =>
    (a.visit.scheduledTime || '').localeCompare(b.visit.scheduledTime || ''));

  const dayName  = new Date(calDate + 'T12:00:00')
    .toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Guayaquil' });

  return (
    <div className="space-y-4">
      {/* Navegación día */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 shadow-sm px-3 py-2">
        <button onClick={() => setCalDate(addDays(calDate, -1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-bold text-slate-800 capitalize">{dayName}</p>
        </div>
        <button onClick={() => setCalDate(addDays(calDate, 1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <ChevronRight size={18} />
        </button>
        {calDate !== today && (
          <button onClick={() => setCalDate(today)}
            className="text-xs font-bold px-2.5 py-1 rounded-lg bg-pink-50 text-pink-600 border border-pink-200">
            Hoy
          </button>
        )}
      </div>

      {visits.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Calendar size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin visitas este día</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map(({ visit, task: t }) => (
            <VisitCard key={visit.id} visit={visit} task={t}
              onConfirm={onConfirm} confirming={confirming} onComplete={onComplete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vista semana ─────────────────────────────────────────────────────────────

function WeekView({ allVisitsByDate, calDate, setCalDate, setCalView, today }) {
  const days = useMemo(() => getWeekDays(calDate), [calDate]);

  const goWeek = (n) => setCalDate(addDays(days[0], n * 7));

  return (
    <div className="space-y-3">
      {/* Navegación semana */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 shadow-sm px-3 py-2">
        <button onClick={() => goWeek(-1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <ChevronLeft size={18} />
        </button>
        <p className="flex-1 text-center text-sm font-bold text-slate-800">
          {fmtWeekRange(days)}
        </p>
        <button onClick={() => goWeek(1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <ChevronRight size={18} />
        </button>
        {!days.includes(today) && (
          <button onClick={() => setCalDate(today)}
            className="text-xs font-bold px-2.5 py-1 rounded-lg bg-pink-50 text-pink-600 border border-pink-200">
            Hoy
          </button>
        )}
      </div>

      {/* Grid de 7 días */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {days.map(day => {
            const dayVisits = allVisitsByDate[day] || [];
            const isToday   = day === today;
            return (
              <button key={day}
                onClick={() => { setCalDate(day); setCalView('dia'); }}
                className={`w-[120px] flex-shrink-0 rounded-xl border-2 p-2.5 text-left transition-all hover:shadow-md ${
                  isToday
                    ? 'border-pink-400 bg-pink-50'
                    : dayVisits.length > 0
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-slate-100 bg-white'
                }`}>
                {/* Cabecera día */}
                <div className="mb-2">
                  <p className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-pink-600' : 'text-slate-400'}`}>
                    {fmtDayName(day)}
                  </p>
                  <p className={`text-lg font-bold leading-tight ${isToday ? 'text-pink-700' : 'text-slate-700'}`}>
                    {fmtDayLabel(day).split('/')[0]}
                  </p>
                </div>

                {/* Visitas del día */}
                {dayVisits.length === 0 ? (
                  <p className="text-xs text-slate-300 italic">Sin visitas</p>
                ) : (
                  <div className="space-y-1">
                    {dayVisits.slice(0, 3).map(({ visit, task }) => {
                      const isConfirmed = visit.confirmed || visit.technicianConfirmed;
                      return (
                        <div key={visit.id}
                          className={`rounded-lg px-1.5 py-1 text-xs ${isConfirmed ? 'bg-green-100 text-green-800' : 'bg-white text-slate-700 border border-slate-100'}`}>
                          {visit.scheduledTime && (
                            <span className="font-bold mr-1">{visit.scheduledTime}</span>
                          )}
                          <span className="truncate block leading-tight">{task.clientName}</span>
                        </div>
                      );
                    })}
                    {dayVisits.length > 3 && (
                      <p className="text-xs text-slate-400 font-semibold">+{dayVisits.length - 3} más</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">Toca un día para ver el detalle</p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TechPortal({ user }) {
  const tasks      = useAppStore(s => s.tasks);
  const addToast   = useAppStore(s => s.addToast);
  const tenantName = useAppStore(s => s.tenantName);
  const tenantRuc  = useAppStore(s => s.tenantRuc);
  const refreshKey = useAppStore(s => s.refreshKey);

  const today = useMemo(() => localToday(), []);

  const [calView,         setCalView]         = useState('lista'); // 'lista' | 'dia' | 'semana'
  const [calDate,         setCalDate]         = useState(today);
  const [visitFilter,     setVisitFilter]     = useState('todas'); // 'todas' | 'programadas' | 'confirmadas' | 'realizadas'
  const [confirming,      setConfirming]      = useState(null);
  const [completingVisit, setCompletingVisit] = useState(null);
  const [refreshing,      setRefreshing]      = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    useAppStore.setState({ refreshKey: refreshKey + 1 });
    setTimeout(() => setRefreshing(false), 1500);
  };

  // Visitas del técnico (Programada y Realizada), por fecha, con filtro aplicado
  const allVisitsByDate = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      (task.visits || []).forEach(visit => {
        const isActive = visit.status === 'Programada' || visit.status === 'Realizada';
        if (!isActive) return;
        const isMyVisit =
          visit.technicianEmail === user.email ||
          visit.technician === user.email;
        if (!isMyVisit) return;
        const isConfirmed  = visit.confirmed || visit.technicianConfirmed;
        const isRealizada  = visit.status === 'Realizada';
        if (visitFilter === 'programadas' && (isRealizada || isConfirmed)) return;
        if (visitFilter === 'confirmadas' && (isRealizada || !isConfirmed)) return;
        if (visitFilter === 'realizadas'  && !isRealizada) return;
        if (!map[visit.scheduledDate]) map[visit.scheduledDate] = [];
        map[visit.scheduledDate].push({ visit, task });
      });
    });
    return map;
  }, [tasks, user.email, visitFilter]);

  // Grupos para vista lista
  const { atrasadas, hoy, proximas, realizadas } = useMemo(() => {
    const groups = { atrasadas: [], hoy: [], proximas: [], realizadas: [] };
    Object.entries(allVisitsByDate).forEach(([date, entries]) => {
      entries.forEach(entry => {
        const { visit } = entry;
        if (visit.status === 'Realizada') {
          if (date === today) groups.hoy.push(entry);
          else groups.realizadas.push(entry);
          return;
        }
        if (date < today && !visit.confirmed && !visit.technicianConfirmed) {
          groups.atrasadas.push(entry);
        } else if (date === today) {
          groups.hoy.push(entry);
        } else if (date > today) {
          groups.proximas.push(entry);
        }
      });
    });
    groups.hoy.sort((a, b) => (a.visit.scheduledTime || '').localeCompare(b.visit.scheduledTime || ''));
    groups.proximas.sort((a, b) => a.visit.scheduledDate.localeCompare(b.visit.scheduledDate));
    groups.atrasadas.sort((a, b) => b.visit.scheduledDate.localeCompare(a.visit.scheduledDate));
    groups.realizadas.sort((a, b) => b.visit.scheduledDate.localeCompare(a.visit.scheduledDate));
    return groups;
  }, [allVisitsByDate, today]);

  const handleConfirm = async (taskId, visitId) => {
    setConfirming(visitId);
    try {
      await updateDoc(doc(getVisitsRef(taskId), visitId), {
        confirmed: true, technicianConfirmed: true,
        confirmedAt: new Date().toISOString(), confirmedBy: user.email,
      });
      addToast({ type: 'success', title: '✅ Confirmada', body: 'Tu asistencia ha sido registrada.' });
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo confirmar. Intenta de nuevo.' });
    } finally {
      setConfirming(null);
    }
  };

  const handleComplete = async (taskId, visitId, { closingObservations, visitValue }) => {
    try {
      await updateDoc(doc(getVisitsRef(taskId), visitId), {
        status: 'Realizada', closingObservations, visitValue,
        ...(visitValue > 0 && { valorCobrar: visitValue }),
        completedAt: new Date().toISOString(), completedBy: user.email,
      });
      addToast({ type: 'success', title: '✅ Realizada', body: 'Visita registrada como realizada.' });
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo registrar. Intenta de nuevo.' });
      throw e;
    }
  };

  const totalVisitas = atrasadas.length + hoy.length + proximas.length + realizadas.length;

  const visitCardProps = {
    onConfirm: handleConfirm,
    confirming,
    onComplete: (visit, task) => setCompletingVisit({ visit, task }),
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-start justify-between gap-3">
          {/* Izquierda: logo + info empresa */}
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.png" alt="Acontplus" className="w-9 h-9 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 leading-tight truncate">{tenantName || 'Portal Técnico'}</p>
              {tenantRuc && (
                <p className="text-xs text-slate-400 leading-tight">RUC: {tenantRuc}</p>
              )}
              <p className="text-xs text-slate-500 leading-tight truncate">{user.email}</p>
            </div>
          </div>
          {/* Derecha: refrescar + salir */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-slate-200 disabled:opacity-60"
              title="Actualizar visitas">
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button onClick={() => signOut(auth)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-slate-200">
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>

        {/* Selector de vista + filtro */}
        <div className="max-w-lg mx-auto px-4 pb-2 flex items-center justify-between gap-2 flex-wrap">
          {/* Vista */}
          <div className="flex gap-1">
            {[
              { id: 'lista',  label: 'Lista',  icon: <List     size={13} /> },
              { id: 'dia',    label: 'Día',    icon: <Calendar size={13} /> },
              { id: 'semana', label: 'Semana', icon: <Clock    size={13} /> },
            ].map(v => (
              <button key={v.id}
                onClick={() => { setCalView(v.id); if (v.id !== 'lista') setCalDate(today); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  calView === v.id ? 'text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                }`}
                style={calView === v.id ? { background: '#D61672' } : {}}>
                {v.icon}{v.label}
              </button>
            ))}
          </div>
          {/* Filtro */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {[
              { id: 'todas',       label: 'Todas' },
              { id: 'programadas', label: 'Pend.' },
              { id: 'confirmadas', label: 'Conf.' },
              { id: 'realizadas',  label: 'Real.' },
            ].map(f => (
              <button key={f.id} onClick={() => setVisitFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  visitFilter === f.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* Vista lista */}
        {calView === 'lista' && (<>
          {atrasadas.length > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3">
              <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-sm font-bold text-red-700">
                {atrasadas.length} visita{atrasadas.length !== 1 ? 's' : ''} atrasada{atrasadas.length !== 1 ? 's' : ''} — requiere atención
              </p>
            </div>
          )}
          {totalVisitas === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Calendar size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin visitas asignadas</p>
              <p className="text-xs mt-1">Tu agenda está libre</p>
            </div>
          )}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {new Date().toLocaleDateString('es-EC', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              timeZone: 'America/Guayaquil',
            })}
          </p>
          <Section title="Visitas atrasadas" icon={AlertTriangle} color="#dc2626"  visits={atrasadas}  {...visitCardProps} />
          <Section title="Hoy"               icon={Calendar}      color="#D61672"   visits={hoy}        {...visitCardProps} />
          <Section title="Próximas"          icon={Clock}         color="#2563eb"  visits={proximas}   {...visitCardProps} />
          <Section title="Realizadas"        icon={CheckCircle2}  color="#16a34a"  visits={realizadas} {...visitCardProps} />
        </>)}

        {/* Vista día */}
        {calView === 'dia' && (
          <DayView
            allVisitsByDate={allVisitsByDate}
            calDate={calDate}
            setCalDate={setCalDate}
            today={today}
            {...visitCardProps}
          />
        )}

        {/* Vista semana */}
        {calView === 'semana' && (
          <WeekView
            allVisitsByDate={allVisitsByDate}
            calDate={calDate}
            setCalDate={setCalDate}
            setCalView={setCalView}
            today={today}
          />
        )}
      </div>

      {completingVisit && (
        <CompleteModal
          visit={completingVisit.visit}
          task={completingVisit.task}
          onSave={handleComplete}
          onClose={() => setCompletingVisit(null)}
        />
      )}
    </div>
  );
}
