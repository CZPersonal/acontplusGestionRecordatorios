import { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import { getVisitsRef } from '../lib/tenantDb';
import { formatDateOnly } from '../utils/dates.js';
import {
  AlertTriangle, Calendar, CheckCircle2, Clock,
  LogOut, MapPin, Phone, Wrench, X,
} from 'lucide-react';

function localToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
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
            value={obs}
            onChange={e => setObs(e.target.value)}
            rows={3}
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
              type="number" min="0" step="0.01"
              value={visitValue}
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
  const isConfirmed = visit.confirmed || visit.technicianConfirmed;
  const urgBg     = URGENCY_BG[visit.urgency]    || '#f8fafc';
  const urgBorder = URGENCY_BORDER[visit.urgency] || '#e2e8f0';
  const urgText   = URGENCY_TEXT[visit.urgency]   || '#64748b';

  return (
    <div className="bg-white rounded-2xl border-2 shadow-sm overflow-hidden"
      style={{ borderColor: urgBorder }}>

      {/* Cabecera */}
      <div className="px-4 py-3 flex items-center justify-between gap-2"
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
          {isConfirmed && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
              ✓ Confirmada
            </span>
          )}
        </div>
      </div>

      {/* Cuerpo */}
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-5 flex-wrap">
          {visit.scheduledTime && (
            <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
              <Clock size={14} className="text-slate-400" />
              {visit.scheduledTime}
            </span>
          )}
          {visit.type && (
            <span className="flex items-center gap-1.5 text-sm text-slate-600">
              <Wrench size={14} className="text-slate-400" />
              {visit.type}
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
            <Phone size={14} />
            {task.clientPhone}
          </a>
        )}
        {visit.observations && (
          <p className="text-xs text-slate-400 italic">📝 {visit.observations}</p>
        )}
        {isConfirmed && visit.confirmedBy && (
          <p className="text-xs text-green-600">
            Confirmada por {visit.confirmedBy}
            {visit.confirmedAt && ` — ${formatDateOnly(visit.confirmedAt.slice(0, 10))}`}
          </p>
        )}
      </div>

      {/* Botones */}
      <div className="px-4 pb-4 space-y-2">
        {isConfirmed && (
          <button
            onClick={() => onComplete(visit, task)}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-base shadow-sm transition-opacity"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
          >
            <CheckCircle2 size={18} className="inline mr-2 -mt-0.5" />
            Marcar como realizada
          </button>
        )}
        {!isConfirmed && (
          <button
            onClick={() => onConfirm(task.id, visit.id)}
            disabled={confirming === visit.id}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-sm disabled:opacity-60 transition-opacity"
            style={{ background: confirming === visit.id ? '#86efac' : 'linear-gradient(135deg, #16a34a, #15803d)' }}
          >
            {confirming === visit.id ? 'Confirmando...' : '✓ Confirmar asistencia'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sección agrupada ─────────────────────────────────────────────────────────

function Section({ title, icon: Icon, color, visits, onConfirm, confirming, onComplete }) {
  if (visits.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={18} style={{ color }} />
        <h3 className="font-bold text-slate-700" style={{ color }}>{title}</h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: color + '20', color }}>
          {visits.length}
        </span>
      </div>
      <div className="space-y-3">
        {visits.map(({ visit, task: t }) => (
          <VisitCard
            key={visit.id}
            visit={visit}
            task={t}
            onConfirm={onConfirm}
            confirming={confirming}
            onComplete={onComplete}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TechPortal({ user }) {
  const tasks      = useAppStore(s => s.tasks);
  const addToast   = useAppStore(s => s.addToast);
  const tenantName = useAppStore(s => s.tenantName);

  const [confirming,    setConfirming]    = useState(null);
  const [completingVisit, setCompletingVisit] = useState(null); // { visit, task }

  const today = useMemo(() => localToday(), []);

  const { atrasadas, hoy, proximas } = useMemo(() => {
    const groups = { atrasadas: [], hoy: [], proximas: [] };
    tasks.forEach(task => {
      (task.visits || []).forEach(visit => {
        if (visit.status !== 'Programada') return;
        const isMyVisit =
          visit.technicianEmail === user.email ||
          visit.technician === user.email;
        if (!isMyVisit) return;

        if (visit.scheduledDate < today && !visit.confirmed && !visit.technicianConfirmed) {
          groups.atrasadas.push({ visit, task });
        } else if (visit.scheduledDate === today) {
          groups.hoy.push({ visit, task });
        } else if (visit.scheduledDate > today) {
          groups.proximas.push({ visit, task });
        }
      });
    });
    groups.hoy.sort((a, b) =>
      (a.visit.scheduledTime || '').localeCompare(b.visit.scheduledTime || ''));
    groups.proximas.sort((a, b) =>
      a.visit.scheduledDate.localeCompare(b.visit.scheduledDate));
    groups.atrasadas.sort((a, b) =>
      b.visit.scheduledDate.localeCompare(a.visit.scheduledDate));
    return groups;
  }, [tasks, user.email, today]);

  const handleConfirm = async (taskId, visitId) => {
    setConfirming(visitId);
    try {
      await updateDoc(doc(getVisitsRef(taskId), visitId), {
        confirmed:           true,
        technicianConfirmed: true,
        confirmedAt:         new Date().toISOString(),
        confirmedBy:         user.email,
      });
      addToast({ type: 'success', title: '✅ Confirmada', body: 'Tu asistencia ha sido registrada.' });
    } catch (e) {
      console.error('TechPortal confirm error:', e);
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo confirmar. Intenta de nuevo.' });
    } finally {
      setConfirming(null);
    }
  };

  const handleComplete = async (taskId, visitId, { closingObservations, visitValue }) => {
    try {
      await updateDoc(doc(getVisitsRef(taskId), visitId), {
        status:              'Realizada',
        closingObservations,
        visitValue,
        completedAt:         new Date().toISOString(),
        completedBy:         user.email,
      });
      addToast({ type: 'success', title: '✅ Realizada', body: 'La visita ha sido registrada como realizada.' });
    } catch (e) {
      console.error('TechPortal complete error:', e);
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo registrar. Intenta de nuevo.' });
      throw e;
    }
  };

  const totalVisitas = atrasadas.length + hoy.length + proximas.length;

  const sectionProps = {
    onConfirm: handleConfirm,
    confirming,
    onComplete: (visit, task) => setCompletingVisit({ visit, task }),
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Acontplus" className="w-8 h-8 object-contain" />
            <div>
              <p className="text-xs text-slate-400">{tenantName}</p>
              <p className="text-sm font-bold text-slate-800 leading-tight">Portal Técnico</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Sesión</p>
              <p className="text-xs font-semibold text-slate-700 truncate max-w-[160px]">{user.email}</p>
            </div>
            <button onClick={() => signOut(auth)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-slate-200">
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* Alerta atrasadas */}
        {atrasadas.length > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
            <p className="text-sm font-bold text-red-700">
              {atrasadas.length} visita{atrasadas.length !== 1 ? 's' : ''} atrasada{atrasadas.length !== 1 ? 's' : ''} — requiere atención
            </p>
          </div>
        )}

        {/* Sin visitas */}
        {totalVisitas === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Calendar size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin visitas asignadas</p>
            <p className="text-xs mt-1">Tu agenda está libre</p>
          </div>
        )}

        {/* Fecha de hoy */}
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          {new Date().toLocaleDateString('es-EC', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'America/Guayaquil',
          })}
        </p>

        <Section title="Visitas atrasadas" icon={AlertTriangle} color="#dc2626" visits={atrasadas} {...sectionProps} />
        <Section title="Hoy"               icon={Calendar}      color="#D61672"  visits={hoy}      {...sectionProps} />
        <Section title="Próximas"          icon={Clock}         color="#2563eb"  visits={proximas} {...sectionProps} />

      </div>

      {/* Modal: marcar realizada */}
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
