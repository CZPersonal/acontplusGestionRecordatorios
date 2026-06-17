import { useEffect, useState } from 'react';
import {
  AlertCircle, Calendar, Clock, X, ChevronDown, ChevronUp,
  Bell, Printer, MessageCircle, Wrench, User, MapPin
} from 'lucide-react';
import { printTaskPDF, shareViaWhatsApp } from './TaskPDF.jsx';
import { printVisitPDF, shareVisitWhatsApp } from './VisitsModal.jsx';
import { formatDateOnly } from '../utils/dates.js';

// ── Estilos por tipo de alerta ────────────────────────────────────────────
const STYLES = {
  overdue: {
    wrap:      'bg-red-50 border-red-300',
    bar:       'bg-red-500',
    title:     'text-red-800',
    badge:     'bg-red-500 text-white',
    badgeText: '⚠️ Retrasada',
    icon:      <AlertCircle size={16} className="text-red-500 flex-shrink-0" />,
    divider:   'border-red-200',
  },
  today: {
    wrap:      'bg-blue-50 border-blue-300',
    bar:       'bg-blue-500',
    title:     'text-blue-800',
    badge:     'bg-blue-500 text-white',
    badgeText: '📅 Hoy',
    icon:      <Calendar size={16} className="text-blue-500 flex-shrink-0" />,
    divider:   'border-blue-200',
  },
  urgent: {
    wrap:      'bg-yellow-50 border-yellow-300',
    bar:       'bg-yellow-500',
    title:     'text-yellow-800',
    badge:     'bg-yellow-500 text-white',
    badgeText: '🔴 Urgente',
    icon:      <Clock size={16} className="text-yellow-500 flex-shrink-0" />,
    divider:   'border-yellow-200',
  },
};

function ToastItem({ toast, onClose }) {
  // Toast simple: error o "sin alertas"
  if (!toast.task && !toast.visit) {
    const isError = toast.type === 'error';
    return (
      <div className={`relative flex items-start space-x-3 p-3 rounded-xl border-2 ${
        isError ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'
      }`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${
          isError ? 'bg-red-500' : 'bg-green-500'
        }`} />
        <div className="ml-2 flex-1 min-w-0">
          <p className={`text-sm font-bold ${isError ? 'text-red-800' : 'text-green-800'}`}>
            {toast.title}
          </p>
          <p className={`text-xs mt-0.5 ${isError ? 'text-red-700' : 'text-green-700'}`}>
            {toast.body}
          </p>
        </div>
        <button onClick={() => onClose(toast.id)}
          className="text-slate-400 hover:text-slate-700 flex-shrink-0 p-1 rounded-lg transition-colors">
          <X size={15} />
        </button>
      </div>
    );
  }

  const s = STYLES[toast.type] || STYLES.urgent;

  // Determinar si usar PDF/WhatsApp de visita o de tarea
  const hasPrintVisit = typeof printVisitPDF === 'function' && toast.visit;
  const hasShareVisit = typeof shareVisitWhatsApp === 'function' && toast.visit;

  return (
    <div className={`relative flex flex-col p-3 rounded-xl border-2 ${s.wrap}`}>
      {/* Barra lateral de color */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${s.bar}`} />

      {/* Cabecera: icono + cliente + badge + cerrar */}
      <div className="flex items-start justify-between ml-2 mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {s.icon}
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5">
              <p className={`text-sm font-bold truncate ${s.title}`}>
                {toast.clientName}
              </p>
              {toast.serviceOrder && (
                <span className="text-xs font-mono font-semibold px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                  OS: {toast.serviceOrder}
                </span>
              )}
            </div>
            <p className={`text-xs font-semibold mt-0.5 ${s.title}`}>{toast.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${s.badge}`}>
            {s.badgeText}
          </span>
          <button onClick={() => onClose(toast.id)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Detalle de la visita */}
      <div className={`ml-2 space-y-1 pb-2 border-b ${s.divider}`}>

        {/* Fecha + hora */}
        {toast.visitDate && (
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
            <Calendar size={12} className="text-slate-400 flex-shrink-0" />
            <span className={toast.type === 'overdue' ? 'text-red-700 font-bold' : ''}>
              {formatDateOnly(toast.visitDate)}
              {toast.visitTime && ` · ${toast.visitTime}`}
            </span>
          </div>
        )}

        {/* Tipo de visita + urgencia */}
        <div className="flex items-center flex-wrap gap-2">
          {toast.visitType && (
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <Wrench size={12} className="text-slate-400 flex-shrink-0" />
              <span>{toast.visitType}</span>
            </div>
          )}
          {toast.urgency && (
            <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${
              toast.urgency === 'Alta'  ? 'bg-red-100 text-red-700' :
              toast.urgency === 'Media' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>{toast.urgency}</span>
          )}
        </div>

        {/* Técnico */}
        {toast.technician && (
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <User size={12} className="text-slate-400 flex-shrink-0" />
            <span className="truncate">{toast.technician}</span>
          </div>
        )}

        {/* Observaciones */}
        {toast.observations && (
          <div className="mt-1 p-2 rounded-lg bg-white bg-opacity-60 text-xs text-slate-600 leading-relaxed">
            📝 {toast.observations}
          </div>
        )}
      </div>

      {/* Acciones: PDF + WhatsApp */}
      <div className="flex items-center space-x-2 mt-2 ml-2">
        <button
          onClick={() => hasPrintVisit
            ? printVisitPDF(toast.task, toast.visit)
            : printTaskPDF(toast.task)
          }
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
          title="Ver PDF de la visita">
          <Printer size={13} />
          <span>PDF</span>
        </button>
        <button
          onClick={() => hasShareVisit
            ? shareVisitWhatsApp(toast.task, toast.visit)
            : shareViaWhatsApp(toast.task)
          }
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors"
          title="Enviar visita por WhatsApp">
          <MessageCircle size={13} />
          <span>WhatsApp</span>
        </button>
      </div>
    </div>
  );
}

export default function Toast({ toasts, onClose }) {
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (toasts.length > 0) setIsMinimized(false);
  }, [toasts.length]);

  if (toasts.length === 0) return null;

  // Conteo real (excluyendo el "todo al día")
  const alertCount = toasts.filter(t => t.task || t.visit).length;

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-slate-200">

      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
        <div className="flex items-center space-x-2">
          <Bell size={16} className="text-white" />
          <span className="text-sm font-bold text-white">
            {alertCount > 0
              ? `${alertCount} visita${alertCount !== 1 ? 's' : ''} con alerta`
              : 'Sin alertas pendientes'
            }
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => toasts.forEach(t => onClose(t.id))}
            className="text-xs text-white underline transition-colors" style={{ opacity: 0.85 }}>
            Cerrar todas
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white transition-colors p-0.5" style={{ opacity: 0.85 }}
            title={isMinimized ? 'Expandir' : 'Minimizar'}>
            {isMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Lista con scroll */}
      {!isMinimized && (
        <>
          <div
            className="flex flex-col space-y-2 p-3 bg-white overflow-y-auto"
            style={{ maxHeight: 'min(60vh, 520px)' }}>
            {toasts.map(toast => (
              <ToastItem key={toast.id} toast={toast} onClose={onClose} />
            ))}
          </div>

          {toasts.length > 3 && (
            <div className="bg-slate-100 px-4 py-2 flex items-center justify-between flex-shrink-0 border-t border-slate-200">
              <span className="text-xs text-slate-500">Desliza para ver todas las alertas</span>
              <ChevronDown size={14} className="text-slate-400 animate-bounce" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
