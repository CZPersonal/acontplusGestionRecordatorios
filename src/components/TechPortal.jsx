import { useMemo, useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import { getVisitsRef } from '../lib/tenantDb';
import { useBorradores } from '../hooks/useBorradores';
import { useTecnicos } from '../hooks/useTecnicos';
import { getClientContacts } from '../hooks/useClients.js';
import { formatDateOnly, formatDateTime } from '../utils/dates.js';
import {
  AlertTriangle, Calendar, CheckCircle2, Clock,
  LogOut, Mail, MapPin, Navigation, Phone, Wrench, X,
  ChevronLeft, ChevronRight, List, RefreshCw, CheckCircle, BookOpen, History, WifiOff,
  Clipboard, ExternalLink, Pencil, Bell, BellOff,
} from 'lucide-react';
import BorradorSheet from './BorradorSheet.jsx';
import ClientHistorialModal from './ClientHistorialModal.jsx';
import { VisitStatusBadge } from './VisitStatusBadge.jsx';
import Toast from './Toast.jsx';

const WORK_HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 – 22:00

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function localToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
}

function localNowTime() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

function CompleteModal({ visit, task, onSave, onClose, isNewVisit = false }) {
  const [obs,        setObs]        = useState('');
  const [visitValue, setVisitValue] = useState('0');
  const [loading,    setLoading]    = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(task.id, visit.id, {
        closingObservations: obs.trim(),
        visitValue:          parseFloat(visitValue) || 0,
      }, isNewVisit);
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

// ─── Modal: reprogramar visita ─────────────────────────────────────────────────

function RescheduleModal({ visit, task, onSave, onClose }) {
  const [newDate, setNewDate] = useState(visit.scheduledDate || '');
  const [newTime, setNewTime] = useState(visit.scheduledTime || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!newDate) return;
    setLoading(true);
    try {
      await onSave(newDate, newTime);
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
            <h3 className="font-bold text-slate-800">Reprogramar visita</h3>
            <p className="text-xs text-slate-400 mt-0.5">{task.clientName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          Si la visita ya estaba confirmada, la confirmación se quitará — el cliente deberá confirmar la nueva fecha/hora.
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nueva fecha</label>
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Nueva hora <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400" />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading || !newDate}
            className="flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-colors"
            style={{ background: loading ? '#94a3b8' : '#D61672' }}>
            {loading ? 'Guardando…' : 'Reprogramar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: agregar link de mapa (se guarda en el cliente) ────────────────────

function AddMapsLinkModal({ currentUrl = '', onSave, onClose }) {
  const [url, setUrl] = useState(currentUrl);
  const [loading, setLoading] = useState(false);
  const isEdit = !!currentUrl;

  const handleSave = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      await onSave(url.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMaps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => window.open(`https://www.google.com/maps/@${pos.coords.latitude},${pos.coords.longitude},17z`, '_blank'),
        () => window.open('https://www.google.com/maps', '_blank')
      );
    } else {
      window.open('https://www.google.com/maps', '_blank');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      // Permiso denegado o sin soporte — no hacer nada
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800">{isEdit ? 'Editar mapa' : 'Agregar mapa'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Busca la ubicación en Google Maps y pega el link aquí. Quedará guardado en el
          cliente y disponible en esta y futuras visitas a esa dirección.
        </p>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Link de Google Maps</label>
          <input type="url" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400" />
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={handleOpenMaps}
              title="Abrir Google Maps con mi ubicación actual"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-xs font-bold">
              <Navigation size={13} />Abrir Maps
            </button>
            <button type="button" onClick={handlePaste}
              title="Pegar link del portapapeles"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-xs font-bold">
              <Clipboard size={13} />Pegar
            </button>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition-colors text-xs font-bold">
                <ExternalLink size={13} />Ver
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading || !url.trim()}
            className="flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-colors"
            style={{ background: loading ? '#94a3b8' : '#D61672' }}>
            {loading ? 'Guardando…' : 'Guardar mapa'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de visita ────────────────────────────────────────────────────────

function VisitCard({ visit, task, onConfirm, confirming, onComplete, onHistorial, isNewVisit = false, emailToName = {}, mapsLink = '', onReschedule, onUnconfirm, onOpenMapsLink }) {
  const [confirmUnconfirm, setConfirmUnconfirm] = useState(false);
  const today       = localToday();
  const nowTime     = localNowTime();
  const isConfirmed = visit.confirmed || visit.technicianConfirmed || visit.status === 'Confirmada';
  const isLate      = isConfirmed && isLateConfirmation(visit);
  const isPending   = isNewVisit
    ? (visit.status === 'Programada' || visit.status === 'Confirmada')
    : visit.status === 'Programada';
  const isOverdue   = isPending && (
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
          {visit.visitNumber && (
            <span className="flex-shrink-0 text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-700">
              {visit.visitNumber}
            </span>
          )}
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
          {/* Estado progresivo de la visita */}
          {isOverdue && (
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              <AlertTriangle size={11} />Atrasada
            </span>
          )}
          {isConfirmed && isLate && (
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
              <AlertTriangle size={11} />Conf. tardía
            </span>
          )}
          <VisitStatusBadge status={visit.status} confirmed={isConfirmed} size="xs" layout="col" />
        </div>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-5 flex-wrap">
          {visit.scheduledDate && (
            <span className={`flex items-center gap-1.5 text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
              <Calendar size={14} className={isOverdue ? 'text-red-400' : 'text-slate-400'} />{formatDateOnly(visit.scheduledDate)}
            </span>
          )}
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
        {mapsLink ? (
          <div className="flex gap-2">
            <a href={mapsLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors border border-blue-200">
              <Navigation size={13} />Abrir mapa
            </a>
            {isNewVisit && visit.contactId && onOpenMapsLink && (
              <button onClick={() => onOpenMapsLink(visit, mapsLink)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
                <Pencil size={12} />Editar
              </button>
            )}
          </div>
        ) : (isNewVisit && visit.contactId && onOpenMapsLink) && (
          <button onClick={() => onOpenMapsLink(visit)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
            <Navigation size={13} />Agregar mapa
          </button>
        )}
        {(task.clientPhone || task.clientEmail) && (
          <div className="flex gap-2 pt-1">
            {task.clientPhone && (
              <a href={`tel:${task.clientPhone}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 min-w-0"
                style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}>
                <Phone size={15} className="flex-shrink-0" />
                <span className="truncate">{task.clientPhone}</span>
              </a>
            )}
            {task.clientEmail && (
              <a href={`mailto:${task.clientEmail}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 min-w-0"
                style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                <Mail size={15} className="flex-shrink-0" />
                <span className="truncate">{task.clientEmail}</span>
              </a>
            )}
          </div>
        )}
        {visit.observations && (
          <p className="text-xs text-slate-400 italic">📝 {visit.observations}</p>
        )}
        {isConfirmed && visit.confirmedBy && (
          <div className={`text-xs font-semibold ${isLate ? 'text-orange-600' : 'text-teal-600'}`}>
            <span>{isLate ? '⚠️' : '✓'} Confirmada por {emailToName[visit.confirmedBy] || visit.confirmedBy.split('@')[0]}</span>
            <span className="font-normal ml-1 opacity-60">{visit.confirmedBy}</span>
            {visit.confirmedAt && <span className="block font-normal opacity-70">{formatDateTime(visit.confirmedAt)}</span>}
          </div>
        )}
        {(() => {
          const lastReschedule = [...(visit.history || [])].reverse().find(h => h.type === 'reprogramada');
          if (!lastReschedule) return null;
          return (
            <p className="text-xs text-indigo-600">
              🔄 Reprogramada por {emailToName[lastReschedule.by] || lastReschedule.by?.split('@')[0]}
              {' '}el {formatDateTime(lastReschedule.at)} — antes: {formatDateOnly(lastReschedule.previousDate)}
              {lastReschedule.previousTime && ` ${lastReschedule.previousTime}`}
            </p>
          );
        })()}
      </div>
      {visit.status === 'Realizada' ? (
        <div className="px-4 pb-4 space-y-1.5 bg-emerald-50 border-t border-emerald-100 pt-3">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">✅ Visita realizada</p>
          {visit.completedAt && (
            <p className="text-xs text-emerald-600">Fecha: {formatDateTime(visit.completedAt)}</p>
          )}
          {visit.completedBy && (
            <p className="text-xs text-emerald-600">
              <span className="font-semibold">{emailToName[visit.completedBy] || visit.completedBy.split('@')[0]}</span>
              <span className="ml-1 opacity-60">{visit.completedBy}</span>
            </p>
          )}
          {visit.visitValue > 0 && (
            <p className="text-xs font-bold text-emerald-700">Valor cobrado: ${visit.visitValue}</p>
          )}
          {visit.closingObservations && (
            <p className="text-xs text-emerald-600 italic">📝 {visit.closingObservations}</p>
          )}
          {onHistorial && (
            <button onClick={() => onHistorial(task)}
              className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors">
              <History size={11} /> Ver historial del cliente
            </button>
          )}
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-2">
          {isConfirmed && (
            <button onClick={() => onComplete(visit, task, isNewVisit)}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-base shadow-sm"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              <CheckCircle2 size={18} className="inline mr-2 -mt-0.5" />
              Marcar como realizada
            </button>
          )}
          {!isConfirmed && (
            <button onClick={() => onConfirm(task.id, visit.id, isNewVisit)} disabled={confirming === visit.id}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-sm disabled:opacity-60"
              style={{ background: confirming === visit.id ? '#86efac' : 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              {confirming === visit.id ? 'Confirmando...' : '✓ Confirmar asistencia'}
            </button>
          )}
          {isNewVisit && visit.status === 'Programada' && (onReschedule || onUnconfirm) && (
            confirmUnconfirm ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <span className="flex-1 text-xs font-semibold text-amber-700">¿Deshacer la confirmación?</span>
                <button onClick={() => { setConfirmUnconfirm(false); onUnconfirm(visit.id); }}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors">Sí</button>
                <button onClick={() => setConfirmUnconfirm(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">No</button>
              </div>
            ) : (
              <div className="flex gap-2">
                {!isConfirmed && onReschedule && (
                  <button onClick={() => onReschedule(visit, task)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-100">
                    <Calendar size={12} />Reprogramar
                  </button>
                )}
                {isConfirmed && onUnconfirm && (
                  <button onClick={() => setConfirmUnconfirm(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-100">
                    Deshacer confirmación
                  </button>
                )}
              </div>
            )
          )}
          {onHistorial && (
            <button onClick={() => onHistorial(task)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-100">
              <History size={12} /> Historial del cliente
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Vista de lista (secciones) ───────────────────────────────────────────────

function Section({ title, icon: Icon, color, visits, onConfirm, confirming, onComplete, onHistorial, emailToName = {}, onReschedule, onUnconfirm, onOpenMapsLink }) {
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
        {visits.map(({ visit, task: t, isNewVisit, mapsLink }) => (
          <VisitCard key={visit.id} visit={visit} task={t} isNewVisit={isNewVisit}
            onConfirm={onConfirm} confirming={confirming} onComplete={onComplete} onHistorial={onHistorial}
            emailToName={emailToName} mapsLink={mapsLink || ''}
            onReschedule={onReschedule} onUnconfirm={onUnconfirm} onOpenMapsLink={onOpenMapsLink} />
        ))}
      </div>
    </div>
  );
}

// ─── Tarjeta compacta para vista día ─────────────────────────────────────────

function DayVisitCard({ visit, task, isNewVisit = false, mapsLink = '', onConfirm, confirming, onComplete, onHistorial, emailToName = {}, onReschedule, onUnconfirm, onOpenMapsLink }) {
  const [confirmUnconfirm, setConfirmUnconfirm] = useState(false);
  const today     = localToday();
  const nowTime   = localNowTime();
  const isConfirmed = visit.confirmed || visit.technicianConfirmed || visit.status === 'Confirmada';
  const isLate      = isConfirmed && isLateConfirmation(visit);
  const isPending   = isNewVisit
    ? (visit.status === 'Programada' || visit.status === 'Confirmada')
    : visit.status === 'Programada';
  const isOverdue   = isPending && (
    visit.scheduledDate < today ||
    (visit.scheduledDate === today && !!visit.scheduledTime && visit.scheduledTime < nowTime)
  );
  const urgText  = URGENCY_TEXT[visit.urgency]   || '#64748b';
  const urgBg    = URGENCY_BG[visit.urgency]     || '#f8fafc';
  const urgBord  = URGENCY_BORDER[visit.urgency] || '#e2e8f0';
  const cardBorderColor = isOverdue ? '#ef4444' : isLate ? '#f97316' : isConfirmed ? '#22c55e' : '#3b82f6';
  const cardBg          = isOverdue ? 'bg-red-50' : isLate ? 'bg-orange-50' : isConfirmed ? 'bg-green-50' : 'bg-white';

  return (
    <div className={`rounded-xl border border-slate-200 shadow-sm overflow-hidden ${cardBg}`}
      style={{ borderLeft: `4px solid ${cardBorderColor}` }}>

      {/* Cabecera: cliente + badges */}
      <div className="px-3 pt-2.5 pb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {visit.visitNumber && (
            <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 mb-0.5 mr-1">
              {visit.visitNumber}
            </span>
          )}
          {task.serviceOrder && (
            <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 mb-0.5 mr-1">
              OS: {task.serviceOrder}
            </span>
          )}
          <p className={`font-bold text-sm leading-tight ${isOverdue ? 'text-red-800' : 'text-slate-800'}`}>
            {task.clientName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {visit.urgency && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
              style={{ color: urgText, background: urgBg, borderColor: urgBord }}>
              {visit.urgency}
            </span>
          )}
          {isOverdue && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
              <AlertTriangle size={9} />Atrasada
            </span>
          )}
          {isConfirmed && isLate && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">Conf. tardía</span>
          )}
          <VisitStatusBadge status={visit.status} confirmed={isConfirmed} size="xs" layout="col" />
        </div>
      </div>

      {/* Info */}
      <div className="px-3 pb-2 space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          {visit.scheduledTime && (
            <span className={`flex items-center gap-1 text-xs font-bold ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
              <Clock size={11} />{visit.scheduledTime}
            </span>
          )}
          {visit.type && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Wrench size={11} />{visit.type}
            </span>
          )}
        </div>
        {task.clientAddress && (
          <p className="flex items-start gap-1 text-xs text-slate-500 leading-tight">
            <MapPin size={11} className="flex-shrink-0 mt-0.5" />{task.clientAddress}
          </p>
        )}
        {task.clientPhone && (
          <a href={`tel:${task.clientPhone}`}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600">
            <Phone size={11} />{task.clientPhone}
          </a>
        )}
        {task.clientEmail && (
          <a href={`mailto:${task.clientEmail}`}
            className="flex items-center gap-1 text-xs text-slate-500">
            <Mail size={11} />{task.clientEmail}
          </a>
        )}
        {visit.observations && (
          <p className="text-xs text-slate-400 italic leading-tight">📝 {visit.observations}</p>
        )}
        {mapsLink ? (
          <div className="flex gap-1.5">
            <a href={mapsLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200">
              <Navigation size={11} />Abrir mapa
            </a>
            {isNewVisit && visit.contactId && onOpenMapsLink && (
              <button onClick={() => onOpenMapsLink(visit, mapsLink)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
                <Pencil size={10} />Editar
              </button>
            )}
          </div>
        ) : (isNewVisit && visit.contactId && onOpenMapsLink) && (
          <button onClick={() => onOpenMapsLink(visit)}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
            <Navigation size={11} />Agregar mapa
          </button>
        )}
        {isConfirmed && visit.confirmedBy && (
          <div className={`text-[10px] font-semibold ${isLate ? 'text-orange-600' : 'text-teal-600'}`}>
            <span>{isLate ? '⚠️' : '✓'} {emailToName[visit.confirmedBy] || visit.confirmedBy.split('@')[0]}</span>
            <span className="font-normal ml-1 opacity-60">{visit.confirmedBy}</span>
          </div>
        )}
        {(() => {
          const lastReschedule = [...(visit.history || [])].reverse().find(h => h.type === 'reprogramada');
          if (!lastReschedule) return null;
          return (
            <p className="text-[10px] text-indigo-600">
              🔄 Reprogramada — antes: {formatDateOnly(lastReschedule.previousDate)}
              {lastReschedule.previousTime && ` ${lastReschedule.previousTime}`}
            </p>
          );
        })()}
      </div>

      {/* Acciones */}
      <div className="px-3 pb-3 space-y-1.5">
        {visit.status === 'Realizada' ? (
          <div className="bg-emerald-50 rounded-lg px-2 py-1.5 border border-emerald-100">
            <p className="text-xs font-bold text-emerald-700">✅ Realizada</p>
            {visit.completedAt && (
              <p className="text-xs text-emerald-600">{formatDateTime(visit.completedAt)}</p>
            )}
            {visit.completedBy && (
              <p className="text-xs text-emerald-600">
                <span className="font-semibold">{emailToName[visit.completedBy] || visit.completedBy.split('@')[0]}</span>
                <span className="ml-1 opacity-60">{visit.completedBy}</span>
              </p>
            )}
            {visit.visitValue > 0 && (
              <p className="text-xs font-bold text-emerald-700">💰 ${visit.visitValue}</p>
            )}
            {onHistorial && (
              <button onClick={() => onHistorial(task)}
                className="mt-1 flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800">
                <History size={11} />Ver historial
              </button>
            )}
          </div>
        ) : isConfirmed ? (
          <button onClick={() => onComplete(visit, task, isNewVisit)}
            className="w-full py-2 rounded-xl text-white text-xs font-bold shadow-sm"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
            <CheckCircle2 size={13} className="inline mr-1 -mt-0.5" />Marcar realizada
          </button>
        ) : (
          <button onClick={() => onConfirm(task.id, visit.id, isNewVisit)}
            disabled={confirming === visit.id}
            className="w-full py-2 rounded-xl text-white text-xs font-bold shadow-sm disabled:opacity-60"
            style={{ background: confirming === visit.id ? '#86efac' : 'linear-gradient(135deg, #16a34a, #15803d)' }}>
            {confirming === visit.id ? 'Confirmando...' : '✓ Confirmar asistencia'}
          </button>
        )}
        {isNewVisit && visit.status === 'Programada' && (onReschedule || onUnconfirm) && (
          confirmUnconfirm ? (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-2">
              <span className="flex-1 text-[10px] font-semibold text-amber-700">¿Deshacer confirmación?</span>
              <button onClick={() => { setConfirmUnconfirm(false); onUnconfirm(visit.id); }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors">Sí</button>
              <button onClick={() => setConfirmUnconfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">No</button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              {!isConfirmed && onReschedule && (
                <button onClick={() => onReschedule(visit, task)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-100">
                  <Calendar size={10} />Reprogramar
                </button>
              )}
              {isConfirmed && onUnconfirm && (
                <button onClick={() => setConfirmUnconfirm(true)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-100">
                  Deshacer confirmación
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Vista día ────────────────────────────────────────────────────────────────

function DayView({ allVisitsByDate, calDate, setCalDate, today, onConfirm, confirming, onComplete, onHistorial, emailToName = {}, onReschedule, onUnconfirm, onOpenMapsLink }) {
  const dayName = new Date(calDate + 'T12:00:00')
    .toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Guayaquil' });

  const allDayVisits = useMemo(() =>
    (allVisitsByDate[calDate] || []).sort((a, b) =>
      (a.visit.scheduledTime || '').localeCompare(b.visit.scheduledTime || '')),
    [allVisitsByDate, calDate]
  );

  const { visitsByHour, noTimeVisits } = useMemo(() => {
    const byHour = {};
    WORK_HOURS.forEach(h => { byHour[h] = []; });
    const noTime = [];
    allDayVisits.forEach(item => {
      const t = item.visit.scheduledTime;
      if (!t) { noTime.push(item); return; }
      const h = parseInt(t.split(':')[0], 10);
      if (h >= 7 && h <= 22) byHour[h].push(item);
      else noTime.push(item);
    });
    return { visitsByHour: byHour, noTimeVisits: noTime };
  }, [allDayVisits]);

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

      {/* Grilla horaria 07:00 – 22:00 */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
        {WORK_HOURS.map(h => {
          const hVisits = visitsByHour[h] || [];
          const isBusy  = hVisits.length > 0;
          return (
            <div key={h} className={`flex min-h-[72px] transition-colors ${isBusy ? '' : 'hover:bg-slate-50/50'}`}>
              {/* Etiqueta hora */}
              <div className={`flex-shrink-0 w-20 flex flex-col items-center justify-start pt-3 pb-2 border-r ${
                isBusy ? 'bg-pink-50/70 border-pink-100' : 'bg-slate-50/40 border-slate-100'
              }`}>
                <span className={`font-extrabold leading-none ${isBusy ? 'text-2xl text-pink-700' : 'text-xl text-slate-300'}`}>
                  {String(h).padStart(2, '0')}
                </span>
                <span className={`text-xs font-bold ${isBusy ? 'text-pink-400' : 'text-slate-200'}`}>00</span>
              </div>
              {/* Visitas o libre */}
              <div className="flex-1 py-2.5 px-3 min-w-0">
                {isBusy ? (
                  <div className="space-y-3">
                    {hVisits.map(({ visit, task: t, isNewVisit, mapsLink }) => (
                      <DayVisitCard key={visit.id} visit={visit} task={t} isNewVisit={isNewVisit} mapsLink={mapsLink || ''}
                        onConfirm={onConfirm} confirming={confirming} onComplete={onComplete} onHistorial={onHistorial}
                        emailToName={emailToName}
                        onReschedule={onReschedule} onUnconfirm={onUnconfirm} onOpenMapsLink={onOpenMapsLink} />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center py-2">
                    <span className="text-base font-semibold text-slate-300 italic tracking-wide">Libre</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {noTimeVisits.length > 0 && (
          <div className="p-4 bg-amber-50">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">Sin hora asignada</p>
            <div className="space-y-3">
              {noTimeVisits.map(({ visit, task: t, isNewVisit, mapsLink }) => (
                <DayVisitCard key={visit.id} visit={visit} task={t} isNewVisit={isNewVisit} mapsLink={mapsLink || ''}
                  onConfirm={onConfirm} confirming={confirming} onComplete={onComplete} onHistorial={onHistorial}
                  emailToName={emailToName}
                  onReschedule={onReschedule} onUnconfirm={onUnconfirm} onOpenMapsLink={onOpenMapsLink} />
              ))}
            </div>
          </div>
        )}
      </div>
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
  const tasks          = useAppStore(s => s.tasks);
  const newVisits      = useAppStore(s => s.visits);
  const clients        = useAppStore(s => s.clients);
  const addToast       = useAppStore(s => s.addToast);
  const establecimientos       = useAppStore(s => s.establecimientos);
  const memberEstablecimientos = useAppStore(s => s.memberEstablecimientos);
  const userRole                = useAppStore(s => s.userRole);
  const tenantName     = useAppStore(s => s.tenantName);
  const tenantRuc      = useAppStore(s => s.tenantRuc);
  const refreshKey     = useAppStore(s => s.refreshKey);
  const confirmVisit   = useAppStore(s => s.confirmVisit);
  const completeVisit  = useAppStore(s => s.completeVisit);
  const unconfirmVisit  = useAppStore(s => s.unconfirmVisit);
  const rescheduleVisit = useAppStore(s => s.rescheduleVisit);
  const updateClient    = useAppStore(s => s.updateClient);
  const notificationPermission = useAppStore(s => s.notificationPermission);
  const requestNotifications   = useAppStore(s => s.requestNotifications);
  const toasts       = useAppStore(s => s.toasts);
  const removeToast  = useAppStore(s => s.removeToast);

  const [showIosHint, setShowIosHint] = useState(false);
  const isIos = useMemo(() => /iPhone|iPad|iPod/i.test(navigator.userAgent), []);
  const isStandalone = useMemo(() =>
    window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true,
  []);

  const today = useMemo(() => localToday(), []);

  const { tecnicos } = useTecnicos(user);
  const techName = useMemo(
    () => tecnicos.find(t => t.email === user.email)?.nombre || user.displayName || null,
    [tecnicos, user.email, user.displayName]
  );

  const emailToName = useMemo(
    () => Object.fromEntries(tecnicos.filter(t => t.email).map(t => [t.email, t.nombre])),
    [tecnicos]
  );

  const { borradores: misBorradores } = useBorradores(user, { onlyMine: true });
  const pendientesBorradores = useMemo(
    () => misBorradores.filter(b => b.status === 'Pendiente').length,
    [misBorradores]
  );

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const [calView,         setCalView]         = useState('lista'); // 'lista' | 'dia' | 'semana' | 'borradores'
  const [calDate,         setCalDate]         = useState(today);
  const [visitFilter,     setVisitFilter]     = useState('todas'); // 'todas' | 'programadas' | 'confirmadas' | 'realizadas'
  const [filterEst,       setFilterEst]       = useState('todos');

  const visibleEstablecimientos = useMemo(() => {
    if (userRole === 'admin' || memberEstablecimientos.length === 0) return establecimientos;
    return establecimientos.filter(e => memberEstablecimientos.includes(e.id));
  }, [establecimientos, memberEstablecimientos, userRole]);
  const [confirming,      setConfirming]      = useState(null);
  const [completingVisit, setCompletingVisit] = useState(null);
  const [refreshing,      setRefreshing]      = useState(false);
  const [historialClient, setHistorialClient] = useState(null);
  const [reschedulingVisit, setReschedulingVisit] = useState(null); // { visit, task }
  const [mapsLinkTarget,    setMapsLinkTarget]    = useState(null); // { clientId, contactId }

  const findClient = (task) =>
    clients.find(c => c.identification === task.identification) ||
    clients.find(c => c.name === task.clientName) ||
    null;

  const handleHistorial = (task) => {
    const c = findClient(task);
    if (c) setHistorialClient(c);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    useAppStore.setState({ refreshKey: refreshKey + 1 });
    setTimeout(() => setRefreshing(false), 1500);
  };

  // Índice de clientes para lookup de mapsLink
  const clientsById = useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

  const getMapsLink = (clientId, contactId) => {
    if (!clientId) return '';
    const client = clientsById[clientId];
    if (!client) return '';
    const contacts = getClientContacts(client);
    // Buscar primero en el contacto específico de la visita
    if (contactId) {
      const specific = contacts.find(c => c.id === contactId);
      if (specific?.mapsLink) return specific.mapsLink;
    }
    // Fallback: primer contacto que tenga link guardado
    return contacts.find(c => c.mapsLink)?.mapsLink || '';
  };

  const handleUnconfirm = async (visitId) => {
    const ok = await unconfirmVisit(visitId);
    addToast(ok
      ? { type: 'success', title: '✅ Confirmación deshecha', body: 'La visita volvió a estado sin confirmar.' }
      : { type: 'error', title: '❌ Error', body: 'No se pudo deshacer la confirmación.' });
  };

  const handleReschedule = async (newDate, newTime) => {
    if (!reschedulingVisit) return;
    const { visit } = reschedulingVisit;
    const ok = await rescheduleVisit(visit.id, {
      previousDate: visit.scheduledDate, previousTime: visit.scheduledTime || '',
      newDate, newTime,
    });
    if (ok) {
      addToast({ type: 'success', title: '✅ Visita reprogramada', body: 'Se actualizó la fecha/hora y quedó pendiente de reconfirmar.' });
      setReschedulingVisit(null);
    } else {
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo reprogramar la visita.' });
    }
  };

  const handleSaveMapsLink = async (url) => {
    if (!mapsLinkTarget) return;
    const { clientId, contactId } = mapsLinkTarget;
    const client = clientsById[clientId];
    if (!client) return;
    const contacts = getClientContacts(client).map(c => c.id === contactId ? { ...c, mapsLink: url } : c);
    const ok = await updateClient(client.id, {
      name: client.name, foreign: client.foreign, contacts, identification: client.identification,
    });
    if (ok) {
      addToast({ type: 'success', title: '✅ Mapa guardado', body: 'El link quedó disponible en esta y futuras visitas de esa ubicación.' });
      setMapsLinkTarget(null);
    } else {
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo guardar el link del mapa.' });
    }
  };

  // Visitas del técnico — legacy (tasks) + nuevas (visits store), por fecha, con filtro
  const allVisitsByDate = useMemo(() => {
    const map = {};

    // Visitas legacy (colección tasks)
    tasks.forEach(task => {
      (task.visits || []).forEach(visit => {
        const isActive = visit.status === 'Programada' || visit.status === 'Realizada';
        if (!isActive) return;
        const isMyVisit = visit.technicianEmail === user.email || visit.technician === user.email;
        if (!isMyVisit) return;
        const isConfirmed = visit.confirmed || visit.technicianConfirmed;
        const isRealizada = visit.status === 'Realizada';
        if (visitFilter === 'programadas' && (isRealizada || isConfirmed)) return;
        if (visitFilter === 'confirmadas' && (isRealizada || !isConfirmed)) return;
        if (visitFilter === 'realizadas'  && !isRealizada) return;
        if (!map[visit.scheduledDate]) map[visit.scheduledDate] = [];
        const mapsLink = getMapsLink(visit.clientId || task.clientId, visit.contactId);
        map[visit.scheduledDate].push({ visit, task, isNewVisit: false, mapsLink });
      });
    });

    // Visitas nuevas (colección visits)
    newVisits.forEach(v => {
      const isMyVisit = (techName && v.technician === techName) || v.technicianEmail === user.email;
      if (!isMyVisit) return;
      if (filterEst !== 'todos' && v.establecimientoId !== filterEst) return;
      const isRealizada  = v.status === 'Realizada';
      const isConfirmada = v.status === 'Confirmada';
      const isProgramada = v.status === 'Programada';
      if (!isProgramada && !isConfirmada && !isRealizada) return;
      const isConfirmed = v.confirmed || isConfirmada;
      if (visitFilter === 'programadas' && (isRealizada || isConfirmed)) return;
      if (visitFilter === 'confirmadas' && (isRealizada || !isConfirmed)) return;
      if (visitFilter === 'realizadas'  && !isRealizada) return;
      const mapsLink = getMapsLink(v.clientId, v.contactId);
      const syntheticTask = {
        id:           v.id,
        clientName:   v.clientName   || '',
        clientPhone:  v.phone        || '',
        clientAddress: v.address || v.ubicacion || '',
        serviceOrder: v.serviceOrder || '',
        visits: [],
      };
      if (!map[v.scheduledDate]) map[v.scheduledDate] = [];
      map[v.scheduledDate].push({ visit: v, task: syntheticTask, isNewVisit: true, mapsLink });
    });

    return map;
  }, [tasks, newVisits, user.email, techName, visitFilter, filterEst, clientsById]);

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
        const isUnresolved = entry.isNewVisit
          ? (visit.status === 'Programada' || visit.status === 'Confirmada')
          : (!visit.confirmed && !visit.technicianConfirmed);
        if (date < today && isUnresolved) {
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

  const handleConfirm = async (taskId, visitId, isNewVisit = false) => {
    setConfirming(visitId);
    try {
      if (isNewVisit) {
        const ok = await confirmVisit(visitId);
        if (!ok) throw new Error('confirm_failed');
      } else {
        await updateDoc(doc(getVisitsRef(taskId), visitId), {
          confirmed: true, technicianConfirmed: true,
          confirmedAt: new Date().toISOString(), confirmedBy: user.email,
        });
      }
      addToast({ type: 'success', title: '✅ Confirmada', body: 'Tu asistencia ha sido registrada.' });
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo confirmar. Intenta de nuevo.' });
    } finally {
      setConfirming(null);
    }
  };

  const handleComplete = async (taskId, visitId, { closingObservations, visitValue }, isNewVisit = false) => {
    try {
      if (isNewVisit) {
        const ok = await completeVisit(visitId, { closingObservations, visitValue });
        if (!ok) throw new Error('complete_failed');
      } else {
        await updateDoc(doc(getVisitsRef(taskId), visitId), {
          status: 'Realizada', closingObservations, visitValue,
          ...(visitValue > 0 && { valorCobrar: visitValue }),
          completedAt: new Date().toISOString(), completedBy: user.email,
        });
      }
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
    onComplete: (visit, task, isNewVisit) => setCompletingVisit({ visit, task, isNewVisit }),
    onHistorial: handleHistorial,
    emailToName,
    onReschedule: (visit, task) => setReschedulingVisit({ visit, task }),
    onUnconfirm: handleUnconfirm,
    onOpenMapsLink: (visit, currentUrl = '') => setMapsLinkTarget({ clientId: visit.clientId, contactId: visit.contactId, currentUrl }),
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
              {techName && (
                <p className="text-xs font-bold leading-tight truncate" style={{ color: '#D61672' }}>
                  {techName}
                </p>
              )}
              <p className="text-xs text-slate-400 leading-tight truncate">{user.email}</p>
            </div>
          </div>
          {/* Derecha: notificaciones + refrescar + salir */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                requestNotifications?.();
                if (isIos && !isStandalone) setShowIosHint(true);
              }}
              className={`p-2 rounded-lg border transition-colors ${
                notificationPermission === 'granted'
                  ? 'text-pink-600 bg-pink-50 border-pink-100'
                  : 'text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title={notificationPermission === 'granted' ? 'Notificaciones activadas — toca para verificar' : 'Activar notificaciones'}>
              {notificationPermission === 'granted' ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
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

        {showIosHint && (
          <div className="max-w-lg mx-auto px-4 pb-3">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
              <span className="flex-1">
                📱 En iPhone, para recibir notificaciones agrega esta app a tu pantalla de inicio
                (Compartir → "Agregar a inicio") y ábrela desde ahí.
              </span>
              <button onClick={() => setShowIosHint(false)} className="text-amber-500 hover:text-amber-700 flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Selector de vista + filtro */}
        <div className="max-w-lg mx-auto px-4 pb-2 flex items-center justify-between gap-2 flex-wrap">
          {/* Vista */}
          <div className="flex gap-1 flex-wrap">
            {[
              { id: 'lista',       label: 'Lista',      icon: <List      size={13} /> },
              { id: 'dia',         label: 'Día',         icon: <Calendar  size={13} /> },
              { id: 'semana',      label: 'Semana',     icon: <Clock     size={13} /> },
              { id: 'borradores',  label: 'Borradores', icon: <BookOpen  size={13} />, badge: pendientesBorradores },
            ].map(v => (
              <button key={v.id}
                onClick={() => { setCalView(v.id); if (v.id !== 'lista' && v.id !== 'borradores') setCalDate(today); }}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  calView === v.id ? 'text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                }`}
                style={calView === v.id ? { background: '#D61672' } : {}}>
                {v.icon}{v.label}
                {v.badge > 0 && (
                  <span className={`ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-xs font-bold flex items-center justify-center ${
                    calView === v.id ? 'bg-white text-pink-600' : 'bg-amber-400 text-white'
                  }`}>
                    {v.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Filtro — oculto en vista borradores */}
          {calView !== 'borradores' && (
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
          )}
          {/* Filtro por establecimiento — oculto en vista borradores */}
          {calView !== 'borradores' && visibleEstablecimientos.length > 0 && (
            <select value={filterEst} onChange={e => setFilterEst(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium bg-white focus:outline-none focus:border-pink-400 text-slate-600">
              <option value="todos">Todos los establecimientos</option>
              {visibleEstablecimientos.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Banner sin conexión — visible en cualquier pantalla */}
      {!isOnline && (
        <div className="sticky top-[var(--header-h,0px)] z-10 bg-red-600 text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-md">
          <WifiOff size={15} className="flex-shrink-0" />
          <p className="text-xs font-bold tracking-wide">
            Sin conexión — los cambios se guardan localmente y se sincronizarán al reconectar
          </p>
        </div>
      )}

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

        {/* Vista borradores */}
        {calView === 'borradores' && (
          <BorradorSheet user={user} showList={true} />
        )}
      </div>

      {/* FAB siempre visible en otras vistas */}
      {calView !== 'borradores' && (
        <BorradorSheet user={user} showList={false} />
      )}

      {completingVisit && (
        <CompleteModal
          visit={completingVisit.visit}
          task={completingVisit.task}
          isNewVisit={completingVisit.isNewVisit}
          onSave={handleComplete}
          onClose={() => setCompletingVisit(null)}
        />
      )}

      {historialClient && (
        <ClientHistorialModal
          client={historialClient}
          onClose={() => setHistorialClient(null)}
        />
      )}

      {reschedulingVisit && (
        <RescheduleModal
          visit={reschedulingVisit.visit}
          task={reschedulingVisit.task}
          onSave={handleReschedule}
          onClose={() => setReschedulingVisit(null)}
        />
      )}

      {mapsLinkTarget && (
        <AddMapsLinkModal
          currentUrl={mapsLinkTarget.currentUrl}
          onSave={handleSaveMapsLink}
          onClose={() => setMapsLinkTarget(null)}
        />
      )}

      {/* Toasts */}
      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
}
