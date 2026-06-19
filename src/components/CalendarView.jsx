import { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, User,
  CalendarDays, Plus, X, Phone, MapPin, Wrench,
  AlertCircle, CheckCircle, Loader2, FileText, Search, Package
} from 'lucide-react';
import { useVisits } from '../hooks/useVisits';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const TASK_TYPES = [
  'Mantenimiento preventivo',
  'Mantenimiento correctivo',
  'Instalación',
  'Revisión técnica',
  'Cambio de filtros',
  'Limpieza de equipo',
  'Otro',
];

import { localDateStr, formatDateOnly } from '../utils/dates.js';

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

// ─── Tarjeta rica (vista semanal) ─────────────────────────────────────────────

function WeekEventCard({ event, onClick, onAddVisit }) {
  const isTask  = event.type === 'task';
  const isVisit = event.type === 'visit';

  // Detección de retraso (solo visitas Programadas)
  const todayStr = localDateStr();
  const nowTime  = (() => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })();
  const isOverdue = isVisit && event.visitStatus === 'Programada' && (
    event.date < todayStr ||
    (event.date === todayStr && !!event.time && event.time < nowTime)
  );

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
    isOverdue                        ? 'bg-red-100 text-red-700' :
    event.visitStatus === 'Realizada'  ? 'bg-green-100 text-green-700' :
    event.visitStatus === 'Cancelada'  ? 'bg-slate-100 text-slate-500' :
    'bg-pink-100 text-pink-700'
  );

  const borderLeft = isTask ? 'border-l-2 border-blue-400' :
    isOverdue                        ? 'border-l-4 border-red-500' :
    event.visitStatus === 'Realizada'  ? 'border-l-2 border-green-400' :
    event.visitStatus === 'Cancelada'  ? 'border-l-2 border-slate-300' :
    'border-l-2 border-pink-400';

  const task = event.task;

  return (
    <div className={`rounded-lg border shadow-sm mb-1.5 overflow-hidden hover:shadow-md transition-shadow ${borderLeft} ${isOverdue ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
      {/* Cabecera clickeable */}
      <button
        onClick={() => onClick(event)}
        className="w-full text-left px-2.5 pt-2 pb-1"
      >
        {/* Badge retrasada */}
        {isOverdue && (
          <div className="flex items-center gap-1 mb-1">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold bg-red-200 text-red-800 border border-red-300">
              <AlertCircle size={10} />⚠️ Retrasada
            </span>
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
              <Clock size={10} className="flex-shrink-0" />
              {event.time}
            </span>
          )}
          {(event.subtitle) && (
            <span className="flex items-center gap-0.5 text-xs text-slate-500 truncate">
              <Wrench size={10} className="flex-shrink-0" />
              <span className="truncate max-w-[80px]">{event.subtitle}</span>
            </span>
          )}
        </div>

        {/* Teléfono */}
        {task?.clientPhone && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <Phone size={9} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500">{task.clientPhone}</span>
          </div>
        )}

        {/* Dirección */}
        {task?.clientAddress && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <MapPin size={9} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 truncate">{task.clientAddress}</span>
          </div>
        )}

        {/* Técnico (solo en visitas) */}
        {isVisit && event.visit?.technician && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <User size={9} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 truncate">{event.visit.technician}</span>
          </div>
        )}

        {/* Observaciones */}
        {(isVisit ? event.visit?.observations : task?.observations) && (
          <p className="text-xs text-slate-400 italic truncate mt-0.5">
            📝 {isVisit ? event.visit.observations : task.observations}
          </p>
        )}
      </button>

      {/* Footer: estado + botón agregar visita (solo en tareas activas) */}
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
            <Plus size={11} />
            Visita
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Formulario agregar visita (inline en el calendario) ──────────────────────

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
    if (ok) {
      setSaved(true);
      setTimeout(onClose, 900);
    }
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

        {/* Header */}
        <div className="px-5 py-4 text-white flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">Nueva visita</p>
            <h3 className="font-bold text-base mt-0.5">{task.clientName}</h3>
            {task.clientPhone && (
              <p className="text-xs opacity-80 mt-0.5">📞 {task.clientPhone}</p>
            )}
          </div>
          <button onClick={onClose}
            className="p-1.5 text-white opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors ml-3">
            <X size={18} />
          </button>
        </div>

        {/* Panel informativo de la tarea */}
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Fecha programada <span className="text-red-400">*</span></label>
              <input type="date" name="scheduledDate" value={form.scheduledDate} onChange={handleChange}
                className={inp} required />
            </div>
            <div>
              <label className={lbl}>Hora</label>
              <input type="time" name="scheduledTime" value={form.scheduledTime} onChange={handleChange}
                className={inp} />
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
                      ? u === 'Alta'   ? 'bg-red-100 border-red-300 text-red-700'
                      : u === 'Media'  ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                      :                  'bg-green-100 border-green-300 text-green-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={lbl}>Técnico</label>
            <input type="text" name="technician" value={form.technician} onChange={handleChange}
              className={inp} placeholder="Email del técnico" />
          </div>

          <div>
            <label className={lbl}>Observaciones</label>
            <textarea name="observations" value={form.observations} onChange={handleChange}
              rows={2} className={`${inp} resize-none`}
              placeholder="Describe el trabajo a realizar..." />
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
    return events.filter(e => e.date === dateStr)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200">
        {DAYS.map(day => (
          <div key={day} className="px-2 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="border-r border-b border-slate-100 min-h-24 bg-slate-50" />;
          const dateStr    = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents  = getEventsForDay(day);
          const isToday    = dateStr === today;
          const isWeekend  = [0, 6].includes(new Date(year, month, day).getDay());
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
                {dayEvents.length > 3 && (
                  <p className="text-xs text-slate-400 pl-1">+{dayEvents.length - 3} más</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vista semanal mejorada ────────────────────────────────────────────────────

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
    return events.filter(e => e.date === dateStr)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  // Calcular altura mínima basada en el día con más eventos
  const maxEvents = Math.max(...weekDays.map(d => getEventsForDay(d).length), 1);
  const colMinHeight = Math.max(160, maxEvents * 82 + 40);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Cabecera días */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {weekDays.map((date, idx) => {
          const dateStr = localDateStr(date);
          const isToday = dateStr === todayStr;
          const dayEventCount = getEventsForDay(date).length;
          return (
            <div key={idx}
              className={`px-1 py-2.5 text-center border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-pink-50' : ''}`}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{DAYS[date.getDay()]}</p>
              <div className={`w-8 h-8 mx-auto mt-1 flex items-center justify-center rounded-full text-sm font-bold
                ${isToday ? 'text-white' : 'text-slate-700'}`}
                style={isToday ? { background: '#D61672' } : {}}>
                {date.getDate()}
              </div>
              {/* Contador de eventos */}
              {dayEventCount > 0 && (
                <span className="inline-block mt-0.5 text-xs font-medium text-slate-400">
                  {dayEventCount} ev.
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Cuerpo columnas */}
      <div className="grid grid-cols-7" style={{ minHeight: colMinHeight }}>
        {weekDays.map((date, idx) => {
          const dayEvents = getEventsForDay(date);
          const dateStr   = localDateStr(date);
          const isToday   = dateStr === todayStr;

          return (
            <div key={idx}
              className={`border-r border-slate-100 last:border-r-0 p-1.5
                ${isToday ? 'bg-pink-50 bg-opacity-40' : ''}`}>

              {/* Botón rápido agregar visita al día */}
              <button
                onClick={() => onAddVisitToDay(dateStr)}
                className="w-full mb-1.5 flex items-center justify-center gap-0.5 py-0.5 rounded text-xs text-slate-300 hover:text-pink-500 hover:bg-pink-50 transition-colors"
                title={`Agregar visita el ${formatDateOnly(dateStr)}`}>
                <Plus size={11} />
              </button>

              {/* Tarjetas de eventos */}
              {dayEvents.map(event => (
                <WeekEventCard
                  key={event.id}
                  event={event}
                  onClick={onEventClick}
                  onAddVisit={onAddVisitToTask}
                />
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
    </div>
  );
}

// ─── Chip de información reutilizable ─────────────────────────────────────────

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
  // ESC para cerrar
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!event) return null;
  const isTask = event.type === 'task';
  const task   = event.task;

  const todayStr  = localDateStr();
  const nowTime   = (() => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })();
  const isOverdue = !isTask && event.visitStatus === 'Programada' && (
    event.date < todayStr ||
    (event.date === todayStr && !!event.time && event.time < nowTime)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40"
      onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 text-white flex-shrink-0"
          style={{ background: isOverdue
            ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
            : 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide opacity-75">
                {isTask ? '📋 Tarea' : '📅 Visita programada'}
              </p>
              <h3 className="font-bold text-base mt-0.5 leading-tight">{event.title}</h3>
              <p className="text-xs opacity-80 mt-0.5 truncate">{event.subtitle}</p>

              {/* Badges del header */}
              {(isOverdue || (isTask && (task?.serviceOrder || task?.serviceType))) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {/* Solo visitas retrasadas */}
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-white border border-white border-opacity-40"
                      style={{ background: 'rgba(255,255,255,0.25)' }}>
                      <AlertCircle size={11} />
                      ⚠️ Retrasada
                    </span>
                  )}
                  {/* Solo tareas: OS y tipo */}
                  {isTask && task?.serviceOrder && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold text-white"
                      style={{ background: 'rgba(255,255,255,0.25)' }}>
                      <FileText size={10} />
                      OS: {task.serviceOrder}
                    </span>
                  )}
                  {isTask && task?.serviceType && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-white"
                      style={{ background: 'rgba(255,255,255,0.20)' }}>
                      <Package size={10} />
                      {task.serviceType}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose}
              className="p-1.5 text-white opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-20 rounded-lg flex-shrink-0 -mt-0.5">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Cuerpo scrollable */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2.5">

          {/* Fecha + Hora siempre en grid 2 cols */}
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

              {/* Técnico + teléfono + dirección en una tarjeta compacta */}
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

              {event.visit?.closingObservations && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Cierre</p>
                  <p className="text-sm text-green-800 leading-snug">{event.visit.closingObservations}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer fijo */}
        <div className="px-4 py-3 flex gap-2 flex-shrink-0 border-t border-slate-100">
          {isTask && event.status !== 'Completado' && event.status !== 'Cancelado' && (
            <button
              onClick={() => { onClose(); onAddVisit(event.task, event.date); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white font-bold rounded-xl text-sm"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              <Plus size={15} />
              Agregar visita
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cerrar  <span className="text-xs text-slate-400 ml-1">(ESC)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal selector de tarea (para agregar visita desde un día vacío) ──────────

function TaskPickerModal({ tasks, defaultDate, user, onClose, onNewTask }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState('');

  // Activas, ordenadas de más reciente a más antigua por createdAt
  const activeTasks = tasks
    .filter(t => t.status !== 'Completado' && t.status !== 'Cancelado')
    .sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const db2 = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return db2 - da;
    });

  // Filtro de búsqueda: cliente, OS o fecha de creación
  const q = search.trim().toLowerCase();
  const filteredTasks = q
    ? activeTasks.filter(t =>
        (t.clientName  || '').toLowerCase().includes(q) ||
        (t.serviceOrder || '').toLowerCase().includes(q) ||
        (t.createdAt   || '').slice(0, 10).includes(q)
      )
    : activeTasks;

  if (selected) {
    return (
      <AddVisitInlineForm
        task={selected}
        user={user}
        defaultDate={defaultDate}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header — sin botón extra, solo título y cerrar */}
        <div className="px-5 py-4 text-white flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">Nueva visita</p>
            <h3 className="font-bold text-base mt-0.5">{formatDateOnly(defaultDate)}</h3>
          </div>
          <button onClick={onClose}
            className="p-1.5 text-white opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-20 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          {/* Buscador */}
          {activeTasks.length > 0 && (
            <div className="relative mb-3">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por cliente, OS o fecha…"
                className="w-full pl-7 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-pink-400 transition-colors bg-white"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Contador */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Selecciona la tarea
            </p>
            <span className="text-xs text-slate-400">
              {filteredTasks.length} de {activeTasks.length} activa{activeTasks.length !== 1 ? 's' : ''}
            </span>
          </div>

          {activeTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Calendar size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No hay tareas activas</p>
              <p className="text-xs mt-1 mb-4">Crea una tarea primero para poder agendar visitas</p>
              <button
                onClick={() => { onClose(); onNewTask(); }}
                className="flex items-center gap-1.5 mx-auto px-4 py-2 text-white text-sm font-bold rounded-xl"
                style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}
              >
                <Plus size={14} />
                Crear nueva tarea
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

                  {/* Nombre + estado */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">{task.clientName}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      task.status === 'En Proceso' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{task.status}</span>
                  </div>

                  {/* Teléfono */}
                  {task.clientPhone && (
                    <div className="flex items-center gap-1 mt-1">
                      <Phone size={10} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500">{task.clientPhone}</span>
                    </div>
                  )}

                  {/* Orden de servicio */}
                  {task.serviceOrder && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <FileText size={10} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500">OS: {task.serviceOrder}</span>
                    </div>
                  )}

                  {/* Fecha de creación */}
                  {task.createdAt && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock size={10} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500">
                        Creada: {formatDateOnly(task.createdAt.slice(0, 10))}
                      </span>
                    </div>
                  )}

                  {/* Fecha de vencimiento */}
                  {task.dueDate && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Calendar size={10} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500">Vence: {formatDateOnly(task.dueDate)}</span>
                    </div>
                  )}

                  {/* Tipo */}
                  {task.type && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Wrench size={10} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-400">{task.type}</span>
                    </div>
                  )}

                  {/* Observación general */}
                  {task.observations && (
                    <p className="text-xs text-slate-400 italic mt-1 truncate">
                      📝 {task.observations}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Botón Nueva tarea — siempre visible cuando hay tareas */}
          {activeTasks.length > 0 && (
            <button
              onClick={() => { onClose(); onNewTask(); }}
              className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-slate-200 hover:border-pink-300 hover:bg-pink-50 transition-colors text-xs font-semibold text-slate-400 hover:text-pink-600"
            >
              <Plus size={13} />
              Crear nueva tarea
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
  const [viewMode, setViewMode]         = useState('month');
  const [currentDate, setCurrentDate]   = useState({
    year:  today.getFullYear(),
    month: today.getMonth(),
    day:   today.getDate(),
  });
  const [selectedEvent, setSelectedEvent]   = useState(null);
  // { task, defaultDate } cuando se quiere agregar visita directo
  const [addVisitContext, setAddVisitContext] = useState(null);
  // dateStr cuando se clickea el + de un día (sin tarea preseleccionada)
  const [dayPickerDate, setDayPickerDate]    = useState(null);

  const events = useMemo(() => getCalendarEvents(tasks), [tasks]);

  const navigate = (dir) => {
    if (viewMode === 'month') {
      setCurrentDate(prev => {
        let m = prev.month + dir, y = prev.year;
        if (m > 11) { m = 0; y++; }
        if (m < 0)  { m = 11; y--; }
        return { ...prev, month: m, year: y };
      });
    } else {
      setCurrentDate(prev => {
        const d = new Date(prev.year, prev.month, prev.day);
        d.setDate(d.getDate() + dir * 7);
        return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
      });
    }
  };

  const goToToday = () =>
    setCurrentDate({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });

  // Abre el formulario de agregar visita (con tarea ya elegida)
  const handleAddVisitToTask = (task, defaultDate) => {
    setSelectedEvent(null);
    setAddVisitContext({ task, defaultDate: defaultDate || localDateStr() });
  };

  // Abre el selector de tarea primero (clic en + de un día)
  const handleAddVisitToDay = (dateStr) => {
    setDayPickerDate(dateStr);
  };

  const title = viewMode === 'month'
    ? `${MONTHS[currentDate.month]} ${currentDate.year}`
    : (() => {
        const start = new Date(currentDate.year, currentDate.month, currentDate.day);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.getDate()} ${MONTHS[start.getMonth()]} — ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
      })();

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Calendario</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {events.length} evento{events.length !== 1 ? 's' : ''} en total
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Toggle vista */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button onClick={() => setViewMode('month')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'month'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Calendar size={14} /><span>Mes</span>
            </button>
            <button onClick={() => setViewMode('week')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'week'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              <CalendarDays size={14} /><span>Semana</span>
            </button>
          </div>

          {/* Navegación */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-50 text-slate-600 transition-colors border-r border-slate-200">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToToday}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Hoy
            </button>
            <button onClick={() => navigate(1)}
              className="p-2 hover:bg-slate-50 text-slate-600 transition-colors border-l border-slate-200">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Título periodo */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-700 capitalize">{title}</h3>
        {viewMode === 'week' && (
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400">
              Haz clic en <span className="font-semibold" style={{ color: '#D61672' }}>+ Visita</span> en una tarjeta o en el <span className="font-semibold">+</span> del día para agendar
            </p>
            <button
              onClick={onNewTask}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}
            >
              <Plus size={13} />
              Nueva tarea
            </button>
          </div>
        )}
      </div>

      {/* Vista */}
      {viewMode === 'month' ? (
        <MonthView
          year={currentDate.year}
          month={currentDate.month}
          events={events}
          onEventClick={setSelectedEvent}
          onAddVisitToTask={handleAddVisitToTask}
        />
      ) : (
        <WeekView
          year={currentDate.year}
          month={currentDate.month}
          day={currentDate.day}
          events={events}
          onEventClick={setSelectedEvent}
          onAddVisitToTask={handleAddVisitToTask}
          onAddVisitToDay={handleAddVisitToDay}
        />
      )}

      {/* Modal detalle evento */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onAddVisit={handleAddVisitToTask}
        />
      )}

      {/* Modal agregar visita a tarea específica */}
      {addVisitContext && (
        <AddVisitInlineForm
          task={addVisitContext.task}
          user={user}
          defaultDate={addVisitContext.defaultDate}
          onClose={() => setAddVisitContext(null)}
        />
      )}

      {/* Modal selector de tarea (desde + de un día) */}
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
