import { useState } from 'react';
import {
  Phone, MapPin, Edit, Trash2, CheckCircle, FileText,
  Clock, User, Printer, MessageCircle, CalendarDays, CreditCard, Package
} from 'lucide-react';
import { printTaskPDF, shareViaWhatsApp } from './TaskPDF.jsx';
import VisitsModal from './VisitsModal.jsx';
import { formatDateOnly } from '../utils/dates.js';

const statusColors = {
  'Pendiente':  'bg-yellow-100 text-yellow-700',
  'En Proceso': 'bg-blue-100 text-blue-700',
  'Completado': 'bg-green-100 text-green-700',
  'Cancelado':  'bg-slate-100 text-slate-500',
};

export default function TaskCard({ task, onEdit, onDelete, onComplete, user }) {
  const [showVisits, setShowVisits] = useState(false);

  const visitCount    = task.visits?.length || 0;
  const pendingVisits = task.visits?.filter(v => v.status === 'Programada').length || 0;

  const nextVisit = task.visits
    ?.filter(v => v.status === 'Programada')
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0] || null;

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">

        {/* Cabecera: nombre + estado */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-800 truncate">{task.clientName}</h4>
            {task.identification && (
              <div className="flex items-center space-x-1 mt-0.5">
                <CreditCard size={11} className="text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-400 font-mono">{task.identification}</span>
              </div>
            )}
          </div>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${statusColors[task.status] || 'bg-slate-100 text-slate-500'}`}>
            {task.status}
          </span>
        </div>

        {/* Orden de servicio */}
        {task.serviceOrder && (
          <div className="mb-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-mono font-bold tracking-wider border border-purple-200">
              <FileText size={12} />
              <span>OS: {task.serviceOrder}</span>
            </span>
          </div>
        )}

        {/* ── Tipo de instalación / equipo / servicio ── */}
        {task.serviceType && (
          <div className="mb-3">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-semibold border border-orange-200">
              <Package size={12} />
              <span>{task.serviceType}</span>
            </span>
          </div>
        )}

        {/* Detalles del cliente */}
        <div className="space-y-1.5 mb-3">
          {task.clientPhone && (
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Phone size={12} className="flex-shrink-0 text-slate-400" />
              <span>{task.clientPhone}</span>
            </div>
          )}
          {task.clientAddress && (
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <MapPin size={12} className="flex-shrink-0 text-slate-400" />
              <span className="truncate">{task.clientAddress}</span>
            </div>
          )}
        </div>

        {/* Próxima visita */}
        {nextVisit && (
          <div className="mb-3 p-2.5 bg-blue-50 border border-blue-100 rounded-lg space-y-1">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-1">📅 Próxima visita</p>
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-xs font-semibold text-slate-700">
                {formatDateOnly(nextVisit.scheduledDate)}
                {nextVisit.scheduledTime && ` · ${nextVisit.scheduledTime}`}
              </span>
              {nextVisit.urgency && (
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                  nextVisit.urgency === 'Alta'  ? 'bg-red-100 text-red-700' :
                  nextVisit.urgency === 'Media' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>{nextVisit.urgency}</span>
              )}
            </div>
            {nextVisit.type && (
              <p className="text-xs text-slate-600">🔧 {nextVisit.type}</p>
            )}
            {nextVisit.technician && (
              <div className="flex items-center space-x-1 text-xs text-slate-500">
                <User size={10} className="text-slate-400" />
                <span>{nextVisit.technician}</span>
              </div>
            )}
          </div>
        )}

        {/* Observaciones */}
        {task.observations && (
          <div className="mb-3 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-xs text-slate-600 italic">📋 {task.observations}</p>
          </div>
        )}

        {/* Footer: fecha creación */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3 pt-2 border-t border-slate-50">
          <div className="flex items-center space-x-1">
            <Clock size={11} />
            <span>{task.createdAt ? formatDate(task.createdAt) : '—'}</span>
          </div>
          {task.createdBy && (
            <div className="flex items-center space-x-1">
              <User size={11} />
              <span className="truncate max-w-[120px]">{task.createdBy}</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Visitas */}
          <button
            onClick={() => setShowVisits(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}
          >
            <CalendarDays size={13} />
            <span>Visitas</span>
            {visitCount > 0 && (
              <span className="rounded-full px-1.5 py-0.5 text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.30)' }}>
                {pendingVisits}/{visitCount}
              </span>
            )}
          </button>

          {/* Imprimir */}
          <button onClick={() => printTaskPDF(task)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Imprimir ficha">
            <Printer size={15} />
          </button>

          {/* WhatsApp */}
          <button onClick={() => shareViaWhatsApp(task)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
            title="Compartir por WhatsApp">
            <MessageCircle size={15} />
          </button>

          <div className="flex-1" />

          {/* Editar */}
          {task.status !== 'Completado' && task.status !== 'Cancelado' && (
            <button onClick={() => onEdit(task)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Editar">
              <Edit size={15} />
            </button>
          )}

          {/* Completar */}
          {task.status !== 'Completado' && task.status !== 'Cancelado' && (
            <button onClick={() => onComplete(task)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
              title="Marcar completada">
              <CheckCircle size={15} />
            </button>
          )}

          {/* Eliminar */}
          <button onClick={() => onDelete(task.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Eliminar">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {showVisits && (
        <VisitsModal task={task} user={user} onClose={() => setShowVisits(false)} />
      )}
    </>
  );
}
