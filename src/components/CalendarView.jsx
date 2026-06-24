import { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, User,
  CalendarDays, Plus, X, Phone, MapPin, Wrench,
  AlertCircle, CheckCircle, Loader2, FileText, Search, Package,
  CheckCircle2,
} from 'lucide-react';
import { useVisits } from '../hooks/useVisits';
import { localDateStr, formatDateOnly, formatDateTime } from '../utils/dates.js';

const MONTHS     = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS       = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const WORK_HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 – 22:00

const TASK_TYPES = [
  'Mantenimiento preventivo',
  'Mantenimiento correctivo',
  'Instalación',
  'Revisión técnica',
  'Cambio de filtros',
  'Limpieza de equipo',
  'Otro',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCalendarEvents(tasks) {
  const events = [];
  tasks.forEach(task => {
    if (task.dueDate) {
      events.push({
        id: `task-${task.id}`,
        date: task.dueDate,
        time: '',
        title: task.clientName,
        subtitle: task.type,
        type: 'task',
        status: task.status,
        urgency: task.urgency,
        task,
      });
    }
    if (task.visits?.length) {
      task.visits.forEach(visit => {
        if (visit.scheduledDate) {
          events.push({
            id: `visit-${visit.id}`,
            date: visit.scheduledDate,
            time: visit.scheduledTime || '',
            title: task.clientName,
            subtitle: visit.type || visit.technician || task.type,
            type: 'visit',
            visitStatus: visit.status,
            visitType: visit.type,
            urgency: visit.urgency,
            task,
            visit,
          });
        }
      });
    }
  });
  return events;
}

// Devuelve true si la confirmación llegó después de la hora programada (Ecuador UTC-5)
function isLateConfirmation(visit) {
  if (!visit?.confirmedAt || !visit?.scheduledDate) return false;
  const scheduled = new Date(
    `${visit.scheduledDate}T${visit.scheduledTime || '23:59'}:00-05:00`
  );
  return new Date(visit.confirmedAt) > scheduled;
}

// ─── Badge compacto (vista mensual) ───────────────────────────────────────────

function EventBadge({ event, onClick }) {
  const isTask  = event.type === 'task';

  const taskColor = {
    'Completado': 'bg-green-100 text-green-700 border-green-200',
    'Cancelado':  'bg-slate-100 text-slate-500 border-slate-200',
    'En Proceso': 'bg-blue-100 text-blue-700 border-blue-200',
    'Pendiente':  'bg-yellow-100 text-yellow-700 border-yellow-200',
  }[event.status] || 'bg-yellow-100 text-yellow-700 border-yellow-200';

  const visitColor = {
    'Programada': 'border-l-2 bg-pink-50 text-pink-700 border-pink-300',
    'Realizada':  'border-l-2 bg-green-50 text-green-700 border-green-300',
    'Cancelada':  'border-l-2 bg-slate-50 text-slate-500 border-slate-300',
  }[event.visitStatus] || 'border-l-2 bg-pink-50 text-pink-700 border-pink-300';

  return (
    <button
      onClick={() => onClick(event)}
      className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate border transition-colors hover:opacity-80 ${
        isTask ? taskColor : visitColor
      }`}
      title={`${event.title} — ${event.subtitle}${event.time ? ` (${event.time})` : ''}`}
    >
      {event.time && <span className="font-bold mr-1">{event.time}</span>}
      {event.title}
    </button>
  );
}

// ─── Tarjeta rica (vista semanal y diaria) ────────────────────────────────────

function WeekEventCard({ event, onClick, onAddVisit, wide = false }) {
  const isTask  = event.type === 'task';
  const isVisit = event.type === 'visit';

  const todayStr = localDateStr();
  const nowTime  = (() => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })();
  const isOverdue = isVisit && event.visitStatus === 'Programada' && (
    event.date < todayStr ||
    (event.date === todayStr && !!event.time && event.time < nowTime)
  );

  const isConfirmed = isVisit && (event.visit?.confirmed || event.visit?.technicianConfirmed);
  const isLate      = isConfirmed && isLateConfirmation(event.visit);

  const urgencyDot = {
    Alta:  'bg-red-500',
    Media: 'bg-yellow-400',
    Baja:  'bg-green-400',
  }[event.urgency || event.visit?.urgency] || 'bg-slate-300';

  const statusStyle = isTask ? ({
    'Completado': 'bg-green-100 text-green-700',
    'Cancelado':  'bg-slate-100 text-slate-500',
    'En Proceso': 'bg-blue-100 text-blue-700',
    'Pendiente':  'bg-yellow-100 text-yellow-800',
  }[event.status] || 'bg-yellow-100 text-yellow-800') : (
    isOverdue                         ? 'bg-red-100 text-red-700' :
    event.visitStatus === 'Realizada'  ? 'bg-green-100 text-green-700' :
    event.visitStatus === 'Cancelada'  ? 'bg-slate-100 text-slate-500' :
    'bg-pink-100 text-pink-700'
  );

  const borderLeft = isTask ? 'border-l-2 border-blue-400' :
    isOverdue                         ? 'border-l-4 border-red-500' :
    isLate                            ? 'border-l-4 border-orange-400' :
    isConfirmed                       ? 'border-l-4 border-green-400' :
    event.visitStatus === 'Realizada'  ? 'border-l-2 border-green-400' :
    event.visitStatus === 'Cancelada'  ? 'border-l-2 border-slate-300' :
    'border-l-2 border-pink-400';

  const cardBg = isOverdue ? 'bg-red-50 border-red-100' :
    isLate    ? 'bg-orange-50 border-orange-100' :
    isConfirmed ? 'bg-green-50 border-green-100' :
    'bg-white border-slate-100';

  const task = event.task;

  return (
    <div className={`rounded-lg border shadow-sm mb-1.5 overflow-hidden hover:shadow-md transition-shadow ${borderLeft} ${cardBg}`}>
      <button onClick={() => onClick(event)} className="w-full text-left px-2.5 pt-2 pb-1">

        {/* Badges de estado */}
        {(isOverdue || isConfirmed) && (
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            {isOverdue && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold bg-red-200 text-red-800 border border-red-300">
                <AlertCircle size={10} />⚠️ Retrasada
              </span>
            )}
            {isConfirmed && !isLate && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold bg-green-200 text-green-800 border border-green-300">
                <CheckCircle2 size={10} />✓ Confirmada
              </span>
            )}
            {isConfirmed && isLate && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold bg-orange-200 text-orange-800 border border-orange-300">
                <AlertCircle size={10} />⚠️ Confirmación tardía
              </span>
            )}
          </div>
        )}

        {/* Nombre cliente + urgency dot */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${urgencyDot}`} />
          <span className={`text-xs font-semibold truncate leading-tight ${isOverdue ? 'text-red-800' : 'text-slate-800'}`}>{event.title}</span>
        </div>

        {/* Hora + tipo */}
        <div className="flex items-center gap-2 flex-wrap">
          {event.time && (
            <span className={`flex items-center gap-0.5 text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
              <Clock size={10} className="flex-shrink-0" />{event.time}
            </span>
          )}
          {event.subtitle && (
            <span className="flex items-center gap-0.5 text-xs text-slate-500 truncate">
              <Wrench size={10} className="flex-shrink-0" />
              <span className={`truncate ${wide ? 'max-w-[200px]' : 'max-w-[80px]'}`}>{event.subtitle}</span>
            </span>
          )}
        </div>

        {/* Confirmación: fecha/hora */}
        {isConfirmed && event.visit?.confirmedAt && (
          <p className={`text-xs mt-0.5 ${isLate ? 'text-orange-600 font-semibold' : 'text-green-600'}`}>
            🕐 Confirmada: {formatDateTime(event.visit.confirmedAt)}
          </p>
        )}

        {task?.clientPhone && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <Phone size={9} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500">{task.clientPhone}</span>
          </div>
        )}
        {task?.clientAddress && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <MapPin size={9} className="text-slate-400 flex-shrink-0" />
            <span className={`text-xs text-slate-500 ${wide ? '' : 'truncate'}`}>{task.clientAddress}</span>
          </div>
        )}
        {isVisit && event.visit?.technician && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <User size={9} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 truncate">{event.visit.technician}</span>
          </div>
        )}
        {(isVisit ? event.visit?.observations : task?.observations) && (
          <p className="text-xs text-slate-400 italic truncate mt-0.5">
            📝 {isVisit ? event.visit.observations : task.observations}
          </p>
        )}

        {/* Datos de realización — solo en vista día (wide) */}
        {wide && isVisit && event.visitStatus === 'Realizada' && (
          <div className="mt-1.5 pt-1.5 border-t border-emerald-200 space-y-0.5">
            {event.visit?.completedAt && (
              <p className="text-xs font-semibold text-emerald-700">
                ✅ Realizada: {formatDateTime(event.visit.completedAt)}
              </p>
            )}
            {event.visit?.visitValue > 0 && (
              <p className="text-xs font-bold text-emerald-700">
                💰 Valor: ${Number(event.visit.visitValue).toFixed(2)}
              </p>
            )}
            {event.visit?.closingObservations && (
              <p className="text-xs text-emerald-600 italic">
                📝 {event.visit.closingObservations}
              </p>
            )}
          </div>
        )}
      </button>

      <div className="flex items-center justify-between px-2.5 pb-1.5 pt-0.5">
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${statusStyle}`}>
          {isTask ? event.status : event.visitStatus}
        </span>
        {isTask && event.status !== 'Completado' && event.status !== 'Cancelado' && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddVisit(event.task); }}
            className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-lg transition-colors hover:bg-pink-50"
            style={{ color: '#D61672' }}
            title="Agregar visita a esta tarea"
          >
            <Plus size={11} />Visita
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Formulario agregar visita (inline) ───────────────────────────────────────

function AddVisitInlineForm({ task, user, defaultDate, onClose }) {
  const { addVisit, isLoading } = useVisits(task, user);
  const [form, setForm] = useState({
    scheduledDate: defaultDate || localDateStr(),
    scheduledTime: '',
    type: TASK_TYPES[0],
    urgency: 'Media',
    observations: '',
    technician: user?.email || '',
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await addVisit(form);
    if (ok) { setSaved(true); setTimeout(onClose, 900); }
  };

  const inp = "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-pink-400 transition-colors bg-white";
  const lbl = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1";

  if (saved) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-3">
          <CheckCircle size={40} className="text-green-500" />
          <p className="font-semibold text-slate-700">Visita guardada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 text-white flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">Nueva visita</p>
            <h3 className="font-bold text-base mt-0.5">{task.clientName}</h3>
            {task.clientPhone && <p className="text-xs opacity-80 mt-0.5">📞 {task.clientPhone}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-white opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-20 rounded-lg ml-3">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 space-y-1.5">
          {task.serviceType && (
            <div className="flex items-center gap-2">
              <Package size={12} className="text-orange-500 flex-shrink-0" />
              <span className="text-xs font-bold text-orange-700 truncate">{task.serviceType}</span>
            </div>
          )}
          {task.serviceOrder && (
            <div className="flex items-center gap-2">
              <FileText size={12} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">OS:</span>
              <span className="text-xs font-bold text-slate-700">{task.serviceOrder}</span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Fecha tarea:</span>
              <span className="text-xs font-bold text-slate-700">{formatDateOnly(task.dueDate)}</span>
            </div>
          )}
          {task.observations && (
            <div className="flex items-start gap-2">
              <span className="text-xs mt-0.5 flex-shrink-0">📝</span>
              <p className="text-xs text-slate-500 italic leading-relaxed">{task.observations}</p>
            </div>
          )}
          {!task.serviceType && !task.serviceOrder && !task.dueDate && !task.observations && (
            <p className="text-xs text-slate-400 italic">Sin datos adicionales de la tarea</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Fecha programada <span className="text-red-400">*</span></label>
              <input type="date" name="scheduledDate" value={form.scheduledDate} onChange={handleChange} className={inp} required />
            </div>
            <div>
              <label className={lbl}>Hora</label>
              <input type="time" name="scheduledTime" value={form.scheduledTime} onChange={handleChange} className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Tipo de visita</label>
            <select name="type" value={form.type} onChange={handleChange} className={inp}>
              {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Urgencia</label>
            <div className="flex gap-2">
              {['Alta','Media','Baja'].map(u => (
                <button type="button" key={u}
                  onClick={() => setForm(prev => ({ ...prev, urgency: u }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    form.urgency === u
                      ? u === 'Alta'  ? 'bg-red-100 border-red-300 text-red-700'
                      : u === 'Media' ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                      :                 'bg-green-100 border-green-300 text-green-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={lbl}>Técnico</label>
            <input type="text" name="technician" value={form.technician} onChange={handleChange} className={inp} placeholder="Email del técnico" />
          </div>

          <div>
            <label className={lbl}>Observaciones</label>
            <textarea name="observations" value={form.observations} onChange={handleChange}
              rows={2} className={`${inp} resize-none`} placeholder="Describe el trabajo a realizar..." />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-2.5 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {isLoading ? 'Guardando...' : 'Guardar visita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Vista mensual ─────────────────────────────────────────────────────────────

function MonthView({ year, month, events, onEventClick, onAddVisitToTask }) {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today       = localDateStr();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200">
        {DAYS.map(day => (
          <div key={day} className="px-2 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="border-r border-b border-slate-100 min-h-24 bg-slate-50" />;
          const dateStr   = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = getEventsForDay(day);
          const isToday   = dateStr === today;
          const isWeekend = [0, 6].includes(new Date(year, month, day).getDay());
          return (
            <div key={day} className={`border-r border-b border-slate-100 min-h-24 p-1 ${isWeekend ? 'bg-slate-50' : 'bg-white'}`}>
              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 ${isToday ? 'text-white' : 'text-slate-700'}`}
                style={isToday ? { background: '#D61672' } : {}}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <EventBadge key={event.id} event={event} onClick={onEventClick} />
                ))}
                {dayEvents.length > 3 && <p className="text-xs text-slate-400 pl-1">+{dayEvents.length - 3} más</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vista semanal ─────────────────────────────────────────────────────────────

function WeekView({ year, month, day, events, onEventClick, onAddVisitToTask, onAddVisitToDay }) {
  const startOfWeek = new Date(year, month, day);
  startOfWeek.setDate(day - startOfWeek.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const todayStr = localDateStr();

  const getEventsForDay = (date) => {
    const dateStr = localDateStr(date);
    return events.filter(e => e.date === dateStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  const maxEvents    = Math.max(...weekDays.map(d => getEventsForDay(d).length), 1);
  const colMinHeight = Math.max(160, maxEvents * 82 + 40);

  const todayIdx = weekDays.findIndex(d => localDateStr(d) === todayStr);
  const [selectedDayIdx, setSelectedDayIdx] = useState(todayIdx >= 0 ? todayIdx : 0);

  useEffect(() => {
    const idx = weekDays.findIndex(d => localDateStr(d) === todayStr);
    setSelectedDayIdx(idx >= 0 ? idx : 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, day]);

  const selectedDate    = weekDays[selectedDayIdx];
  const selectedDateStr = localDateStr(selectedDate);
  const selectedEvents  = getEventsForDay(selectedDate);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Cabecera desktop */}
      <div className="hidden md:grid grid-cols-7 border-b border-slate-200">
        {weekDays.map((date, idx) => {
          const dateStr       = localDateStr(date);
          const isToday       = dateStr === todayStr;
          const dayEventCount = getEventsForDay(date).length;
          return (
            <div key={idx} className={`px-1 py-2.5 text-center border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-pink-50' : ''}`}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{DAYS[date.getDay()]}</p>
              <div className={`w-8 h-8 mx-auto mt-1 flex items-center justify-center rounded-full text-sm font-bold ${isToday ? 'text-white' : 'text-slate-700'}`}
                style={isToday ? { background: '#D61672' } : {}}>
                {date.getDate()}
              </div>
              {dayEventCount > 0 && (
                <span className="inline-block mt-0.5 text-xs font-medium text-slate-400">{dayEventCount} ev.</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Cabecera móvil */}
      <div className="md:hidden border-b border-slate-200 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-1 px-2 py-2 min-w-max">
          {weekDays.map((date, idx) => {
            const dateStr       = localDateStr(date);
            const isToday       = dateStr === todayStr;
            const isSelected    = idx === selectedDayIdx;
            const dayEventCount = getEventsForDay(date).length;
            return (
              <button key={idx} onClick={() => setSelectedDayIdx(idx)}
                className={`flex flex-col items-center px-3 py-1.5 rounded-xl transition-colors min-w-[44px] ${
                  !isSelected && !isToday ? 'hover:bg-slate-50' : ''
                } ${!isSelected && isToday ? 'bg-pink-50' : ''}`}
                style={isSelected ? { background: 'linear-gradient(135deg, #D61672, #e11d48)' } : {}}>
                <span className={`text-xs font-bold uppercase tracking-wide ${isSelected ? 'text-white opacity-80' : 'text-slate-500'}`}>
                  {DAYS[date.getDay()]}
                </span>
                <span className={`text-base font-bold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full ${isSelected ? 'text-white' : isToday ? 'text-white' : 'text-slate-700'}`}
                  style={isToday && !isSelected ? { background: '#D61672' } : {}}>
                  {date.getDate()}
                </span>
                <span className={`mt-0.5 min-w-[18px] text-xs font-bold px-1 rounded-full leading-none h-4 flex items-center justify-center ${
                  dayEventCount > 0
                    ? isSelected ? 'bg-white text-pink-600' : 'bg-pink-100 text-pink-600'
                    : 'opacity-0'
                }`}>{dayEventCount}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cuerpo desktop */}
      <div className="hidden md:grid grid-cols-7" style={{ minHeight: colMinHeight }}>
        {weekDays.map((date, idx) => {
          const dayEvents = getEventsForDay(date);
          const dateStr   = localDateStr(date);
          const isToday   = dateStr === todayStr;
          return (
            <div key={idx} className={`border-r border-slate-100 last:border-r-0 p-1.5 ${isToday ? 'bg-pink-50 bg-opacity-40' : ''}`}>
              <button onClick={() => onAddVisitToDay(dateStr)}
                className="w-full mb-1.5 flex items-center justify-center gap-0.5 py-0.5 rounded text-xs text-slate-300 hover:text-pink-500 hover:bg-pink-50 transition-colors"
                title={`Agregar visita el ${formatDateOnly(dateStr)}`}>
                <Plus size={11} />
              </button>
              {dayEvents.map(event => (
                <WeekEventCard key={event.id} event={event} onClick={onEventClick} onAddVisit={onAddVisitToTask} />
              ))}
              {dayEvents.length === 0 && (
                <div className="flex items-center justify-center" style={{ minHeight: 60 }}>
                  <span className="text-slate-200 text-xs select-none">—</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cuerpo móvil */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
          <p className="text-sm font-bold text-slate-700">{formatDateOnly(selectedDateStr)}</p>
          <button onClick={() => onAddVisitToDay(selectedDateStr)}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors"
            style={{ color: '#D61672', borderColor: '#fda4af' }}>
            <Plus size={13} />Agregar visita
          </button>
        </div>
        <div className="p-3 space-y-2">
          {selectedEvents.length > 0 ? (
            selectedEvents.map(event => (
              <WeekEventCard key={event.id} event={event} onClick={onEventClick} onAddVisit={onAddVisitToTask} />
            ))
          ) : (
            <div className="py-10 text-center">
              <CalendarDays size={32} className="mx-auto mb-2 text-slate-200" />
              <p className="text-sm text-slate-400 font-medium">Sin eventos este día</p>
              <button onClick={() => onAddVisitToDay(selectedDateStr)}
                className="mt-3 text-xs font-semibold px-4 py-2 rounded-xl text-white"
                style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                + Agregar visita
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Vista día ─────────────────────────────────────────────────────────────────

function DayView({ year, month, day, events, onEventClick, onAddVisitToTask, onAddVisitToDay }) {
  const dateStr  = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const todayStr = localDateStr();

  const dayEvents = useMemo(() =>
    events.filter(e => e.date === dateStr).sort((a, b) => (a.time || '').localeCompare(b.time || '')),
    [events, dateStr]
  );

  const { eventsByHour, noTimeEvents } = useMemo(() => {
    const byHour = {};
    WORK_HOURS.forEach(h => { byHour[h] = []; });
    const noTime = [];
    dayEvents.forEach(ev => {
      if (!ev.time) { noTime.push(ev); return; }
      const h = parseInt(ev.time.split(':')[0], 10);
      if (h >= 7 && h <= 22) byHour[h].push(ev);
      else noTime.push(ev);
    });
    return { eventsByHour: byHour, noTimeEvents: noTime };
  }, [dayEvents]);

  const dayName = new Date(year, month, day)
    .toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Guayaquil' });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Cabecera */}
      <div className={`px-4 py-3 flex items-center justify-between border-b border-slate-100 ${dateStr === todayStr ? 'bg-pink-50' : 'bg-slate-50'}`}>
        <div>
          <p className="text-sm font-bold text-slate-800 capitalize">{dayName}</p>
          <p className="text-xs text-slate-400 mt-0.5">{dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => onAddVisitToDay(dateStr)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
          style={{ color: '#D61672', borderColor: '#fda4af' }}>
          <Plus size={13} />Agregar visita
        </button>
      </div>

      {/* Grilla horaria 07:00 – 22:00 */}
      <div className="divide-y divide-slate-100">
        {WORK_HOURS.map(h => {
          const hEvents = eventsByHour[h] || [];
          const isBusy  = hEvents.length > 0;
          return (
            <div key={h} className={`flex min-h-[64px] transition-colors ${isBusy ? '' : 'hover:bg-slate-50/60'}`}>
              {/* Etiqueta hora */}
              <div className={`flex-shrink-0 w-20 flex flex-col items-center justify-start pt-3 pb-2 border-r ${
                isBusy ? 'bg-pink-50/70 border-pink-100' : 'bg-slate-50/40 border-slate-100'
              }`}>
                <span className={`font-extrabold leading-none ${isBusy ? 'text-2xl text-pink-700' : 'text-xl text-slate-300'}`}>
                  {String(h).padStart(2, '0')}
                </span>
                <span className={`text-xs font-bold ${isBusy ? 'text-pink-400' : 'text-slate-200'}`}>00</span>
              </div>
              {/* Contenido */}
              <div className="flex-1 py-2 px-3 min-w-0">
                {isBusy ? (
                  <div className="space-y-1.5">
                    {hEvents.map(ev => (
                      <WeekEventCard key={ev.id} event={ev} onClick={onEventClick} onAddVisit={onAddVisitToTask} wide />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center py-2">
                    <span className="text-sm font-semibold text-slate-300 italic tracking-wide">Libre</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {noTimeEvents.length > 0 && (
          <div className="p-4 bg-amber-50 border-t border-amber-100">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">Sin hora asignada</p>
            <div className="space-y-1.5">
              {noTimeEvents.map(ev => (
                <WeekEventCard key={ev.id} event={ev} onClick={onEventClick} onAddVisit={onAddVisitToTask} wide />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chip de información ───────────────────────────────────────────────────────

function InfoChip({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

// ─── Modal detalle evento ──────────────────────────────────────────────────────

function EventDetailModal({ event, onClose, onAddVisit }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!event) return null;
  const isTask = event.type === 'task';
  const task   = event.task;

  const todayStr = localDateStr();
  const nowTime  = (() => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })();
  const isOverdue = !isTask && event.visitStatus === 'Programada' && (
    event.date < todayStr ||
    (event.date === todayStr && !!event.time && event.time < nowTime)
  );

  const isConfirmed = !isTask && (event.visit?.confirmed || event.visit?.technicianConfirmed);
  const isLate      = isConfirmed && isLateConfirmation(event.visit);

  const headerBg = isOverdue
    ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
    : isLate
    ? 'linear-gradient(135deg, #ea580c, #c2410c)'
    : 'linear-gradient(135deg, #D61672, #FFA901)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>

        <div className="px-5 py-4 text-white flex-shrink-0" style={{ background: headerBg }}>
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide opacity-75">
                {isTask ? '📋 Tarea' : '📅 Visita programada'}
              </p>
              <h3 className="font-bold text-base mt-0.5 leading-tight">{event.title}</h3>
              <p className="text-xs opacity-80 mt-0.5 truncate">{event.subtitle}</p>

              {(isOverdue || isConfirmed || (isTask && (task?.serviceOrder || task?.serviceType))) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-white border border-white border-opacity-40"
                      style={{ background: 'rgba(255,255,255,0.25)' }}>
                      <AlertCircle size={11} />⚠️ Retrasada
                    </span>
                  )}
                  {isConfirmed && !isLate && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-white border border-white border-opacity-40"
                      style={{ background: 'rgba(255,255,255,0.25)' }}>
                      <CheckCircle2 size={11} />✓ Confirmada
                    </span>
                  )}
                  {isConfirmed && isLate && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-white border border-white border-opacity-40"
                      style={{ background: 'rgba(255,255,255,0.25)' }}>
                      <AlertCircle size={11} />⚠️ Confirmación tardía
                    </span>
                  )}
                  {isTask && task?.serviceOrder && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold text-white"
                      style={{ background: 'rgba(255,255,255,0.25)' }}>
                      <FileText size={10} />OS: {task.serviceOrder}
                    </span>
                  )}
                  {isTask && task?.serviceType && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-white"
                      style={{ background: 'rgba(255,255,255,0.20)' }}>
                      <Package size={10} />{task.serviceType}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 text-white opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-20 rounded-lg flex-shrink-0 -mt-0.5">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <InfoChip label="Fecha" value={formatDateOnly(event.date)} />
            <InfoChip label="Hora"  value={event.time || '—'} />
          </div>

          {isTask && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <InfoChip label="Estado"   value={event.status} />
                <InfoChip label="Urgencia" value={event.urgency || '—'} />
              </div>
              {(task?.clientPhone || task?.clientAddress) && (
                <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                  {task.clientPhone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700 font-medium">{task.clientPhone}</span>
                    </div>
                  )}
                  {task.clientAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700 font-medium leading-snug">{task.clientAddress}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!isTask && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <InfoChip label="Estado"   value={event.visitStatus} />
                <InfoChip label="Urgencia" value={event.visit?.urgency || '—'} />
              </div>

              {/* Confirmación */}
              {isConfirmed && (
                <div className={`rounded-xl p-3 border ${isLate ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isLate ? 'text-orange-600' : 'text-green-600'}`}>
                    {isLate ? '⚠️ Confirmación tardía' : '✓ Confirmación'}
                  </p>
                  <p className={`text-sm font-bold ${isLate ? 'text-orange-800' : 'text-green-800'}`}>
                    {formatDateTime(event.visit.confirmedAt)}
                  </p>
                  {event.visit.confirmedBy && (
                    <p className={`text-xs mt-0.5 ${isLate ? 'text-orange-600' : 'text-green-600'}`}>
                      Por: {event.visit.confirmedBy}
                    </p>
                  )}
                </div>
              )}

              {(event.visit?.technician || task?.clientPhone || task?.clientAddress) && (
                <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                  {event.visit?.technician && (
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700 font-medium">{event.visit.technician}</span>
                    </div>
                  )}
                  {task?.clientPhone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700 font-medium">{task.clientPhone}</span>
                    </div>
                  )}
                  {task?.clientAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700 font-medium leading-snug">{task.clientAddress}</span>
                    </div>
                  )}
                </div>
              )}

              {event.visit?.observations && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Observaciones</p>
                  <p className="text-sm text-slate-700 leading-snug">{event.visit.observations}</p>
                </div>
              )}
              {event.visitStatus === 'Realizada' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">✅ Realizada</p>
                  {event.visit?.completedAt && (
                    <p className="text-sm font-bold text-emerald-800">{formatDateTime(event.visit.completedAt)}</p>
                  )}
                  {event.visit?.completedBy && (
                    <p className="text-xs text-emerald-600">Por: {event.visit.completedBy}</p>
                  )}
                  {event.visit?.visitValue > 0 && (
                    <p className="text-xs font-bold text-emerald-700">Valor: ${event.visit.visitValue}</p>
                  )}
                  {event.visit?.closingObservations && (
                    <p className="text-xs text-emerald-700 italic mt-1">📝 {event.visit.closingObservations}</p>
                  )}
                </div>
              )}
              {event.visitStatus !== 'Realizada' && event.visit?.closingObservations && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Cierre</p>
                  <p className="text-sm text-green-800 leading-snug">{event.visit.closingObservations}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-3 flex gap-2 flex-shrink-0 border-t border-slate-100">
          {isTask && event.status !== 'Completado' && event.status !== 'Cancelado' && (
            <button onClick={() => { onClose(); onAddVisit(event.task, event.date); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white font-bold rounded-xl text-sm"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              <Plus size={15} />Agregar visita
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cerrar <span className="text-xs text-slate-400 ml-1">(ESC)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal selector de tarea ───────────────────────────────────────────────────

function TaskPickerModal({ tasks, defaultDate, user, onClose, onNewTask }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState('');

  const activeTasks = tasks
    .filter(t => t.status !== 'Completado' && t.status !== 'Cancelado')
    .sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const db2 = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return db2 - da;
    });

  const q = search.trim().toLowerCase();
  const filteredTasks = q
    ? activeTasks.filter(t =>
        (t.clientName   || '').toLowerCase().includes(q) ||
        (t.serviceOrder || '').toLowerCase().includes(q) ||
        (t.createdAt    || '').slice(0, 10).includes(q)
      )
    : activeTasks;

  if (selected) {
    return <AddVisitInlineForm task={selected} user={user} defaultDate={defaultDate} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 text-white flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">Nueva visita</p>
            <h3 className="font-bold text-base mt-0.5">{formatDateOnly(defaultDate)}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-white opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-20 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          {activeTasks.length > 0 && (
            <div className="relative mb-3">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por cliente, OS o fecha…"
                className="w-full pl-7 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-pink-400 transition-colors bg-white" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Selecciona la tarea</p>
            <span className="text-xs text-slate-400">
              {filteredTasks.length} de {activeTasks.length} activa{activeTasks.length !== 1 ? 's' : ''}
            </span>
          </div>

          {activeTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Calendar size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No hay tareas activas</p>
              <p className="text-xs mt-1 mb-4">Crea una tarea primero para poder agendar visitas</p>
              <button onClick={() => { onClose(); onNewTask(); }}
                className="flex items-center gap-1.5 mx-auto px-4 py-2 text-white text-sm font-bold rounded-xl"
                style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                <Plus size={14} />Crear nueva tarea
              </button>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <Search size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin resultados para <span className="font-semibold">"{search}"</span></p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
              {filteredTasks.map(task => (
                <button key={task.id} onClick={() => setSelected(task)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-pink-300 hover:bg-pink-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">{task.clientName}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      task.status === 'En Proceso' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{task.status}</span>
                  </div>
                  {task.clientPhone && (
                    <div className="flex items-center gap-1 mt-1">
                      <Phone size={10} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500">{task.clientPhone}</span>
                    </div>
                  )}
                  {task.serviceOrder && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <FileText size={10} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500">OS: {task.serviceOrder}</span>
                    </div>
                  )}
                  {task.createdAt && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock size={10} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500">Creada: {formatDateOnly(task.createdAt.slice(0, 10))}</span>
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Calendar size={10} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500">Vence: {formatDateOnly(task.dueDate)}</span>
                    </div>
                  )}
                  {task.type && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Wrench size={10} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-400">{task.type}</span>
                    </div>
                  )}
                  {task.observations && (
                    <p className="text-xs text-slate-400 italic mt-1 truncate">📝 {task.observations}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {activeTasks.length > 0 && (
            <button onClick={() => { onClose(); onNewTask(); }}
              className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-slate-200 hover:border-pink-300 hover:bg-pink-50 transition-colors text-xs font-semibold text-slate-400 hover:text-pink-600">
              <Plus size={13} />Crear nueva tarea
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CalendarView({ tasks, user, onNewTask }) {
  const today = new Date();
  const [viewMode, setViewMode]       = useState('month'); // 'month' | 'week' | 'day'
  const [currentDate, setCurrentDate] = useState({
    year:  today.getFullYear(),
    month: today.getMonth(),
    day:   today.getDate(),
  });
  const [selectedEvent,   setSelectedEvent]   = useState(null);
  const [addVisitContext, setAddVisitContext]  = useState(null);
  const [dayPickerDate,   setDayPickerDate]   = useState(null);
  const [visitFilter,     setVisitFilter]     = useState('todas'); // 'todas' | 'programadas' | 'confirmadas'

  const events = useMemo(() => getCalendarEvents(tasks), [tasks]);

  const filteredEvents = useMemo(() => {
    if (visitFilter === 'todas') return events;
    return events.filter(e => {
      if (e.type === 'task') return true;
      const isConfirmed  = e.visit?.confirmed || e.visit?.technicianConfirmed;
      const isRealizada  = e.visitStatus === 'Realizada';
      if (visitFilter === 'programadas') return !isRealizada && !isConfirmed;
      if (visitFilter === 'confirmadas') return !isRealizada && !!isConfirmed;
      if (visitFilter === 'realizadas')  return isRealizada;
      return true;
    });
  }, [events, visitFilter]);

  const navigate = (dir) => {
    setCurrentDate(prev => {
      const d = new Date(prev.year, prev.month, prev.day);
      if (viewMode === 'month') {
        let m = prev.month + dir, y = prev.year;
        if (m > 11) { m = 0; y++; }
        if (m < 0)  { m = 11; y--; }
        return { ...prev, month: m, year: y };
      } else if (viewMode === 'week') {
        d.setDate(d.getDate() + dir * 7);
      } else {
        d.setDate(d.getDate() + dir);
      }
      return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
    });
  };

  const goToToday = () =>
    setCurrentDate({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });

  const handleAddVisitToTask = (task, defaultDate) => {
    setSelectedEvent(null);
    setAddVisitContext({ task, defaultDate: defaultDate || localDateStr() });
  };

  const handleAddVisitToDay = (dateStr) => {
    setDayPickerDate(dateStr);
  };

  const title = viewMode === 'month'
    ? `${MONTHS[currentDate.month]} ${currentDate.year}`
    : viewMode === 'week'
    ? (() => {
        const start = new Date(currentDate.year, currentDate.month, currentDate.day);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.getDate()} ${MONTHS[start.getMonth()]} — ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
      })()
    : new Date(currentDate.year, currentDate.month, currentDate.day)
        .toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Guayaquil' });

  const VIEW_MODES = [
    { id: 'month', label: 'Mes',    icon: <Calendar size={14} /> },
    { id: 'week',  label: 'Semana', icon: <CalendarDays size={14} /> },
    { id: 'day',   label: 'Día',    icon: <Clock size={14} /> },
  ];

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Calendario</h2>
          <p className="text-sm text-slate-500 mt-0.5">{events.length} evento{events.length !== 1 ? 's' : ''} en total</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Toggle vista */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            {VIEW_MODES.map(v => (
              <button key={v.id} onClick={() => setViewMode(v.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === v.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}>
                {v.icon}<span>{v.label}</span>
              </button>
            ))}
          </div>

          {/* Navegación */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 text-slate-600 transition-colors border-r border-slate-200">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToToday} className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Hoy
            </button>
            <button onClick={() => navigate(1)} className="p-2 hover:bg-slate-50 text-slate-600 transition-colors border-l border-slate-200">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Título periodo + filtro + botón nueva tarea */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-700 capitalize">{title}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro visitas */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            {[
              { id: 'todas',       label: 'Todas' },
              { id: 'programadas', label: 'Programadas' },
              { id: 'confirmadas', label: 'Confirmadas' },
              { id: 'realizadas',  label: 'Realizadas' },
            ].map(f => (
              <button key={f.id} onClick={() => setVisitFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  visitFilter === f.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}>
                {f.label}
                {visitFilter === f.id && filteredEvents.filter(e => e.type === 'visit').length > 0 && (
                  <span className="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-600">
                    {filteredEvents.filter(e => e.type === 'visit').length}
                  </span>
                )}
              </button>
            ))}
          </div>
          {(viewMode === 'week' || viewMode === 'day') && (
            <button onClick={onNewTask}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              <Plus size={13} />Nueva tarea
            </button>
          )}
        </div>
      </div>

      {/* Vista */}
      {viewMode === 'month' && (
        <MonthView
          year={currentDate.year}
          month={currentDate.month}
          events={filteredEvents}
          onEventClick={setSelectedEvent}
          onAddVisitToTask={handleAddVisitToTask}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          year={currentDate.year}
          month={currentDate.month}
          day={currentDate.day}
          events={filteredEvents}
          onEventClick={setSelectedEvent}
          onAddVisitToTask={handleAddVisitToTask}
          onAddVisitToDay={handleAddVisitToDay}
        />
      )}
      {viewMode === 'day' && (
        <DayView
          year={currentDate.year}
          month={currentDate.month}
          day={currentDate.day}
          events={filteredEvents}
          onEventClick={setSelectedEvent}
          onAddVisitToTask={handleAddVisitToTask}
          onAddVisitToDay={handleAddVisitToDay}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onAddVisit={handleAddVisitToTask}
        />
      )}
      {addVisitContext && (
        <AddVisitInlineForm
          task={addVisitContext.task}
          user={user}
          defaultDate={addVisitContext.defaultDate}
          onClose={() => setAddVisitContext(null)}
        />
      )}
      {dayPickerDate && (
        <TaskPickerModal
          tasks={tasks}
          defaultDate={dayPickerDate}
          user={user}
          onClose={() => setDayPickerDate(null)}
          onNewTask={onNewTask}
        />
      )}
    </div>
  );
}
