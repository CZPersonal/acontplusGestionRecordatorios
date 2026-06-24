import { useState, useMemo } from 'react';
import {
  X, Plus, Clock, CheckCircle, Calendar, User,
  Phone, MapPin, FileText, Wrench, AlertCircle, Hash,
  Edit, Printer, MessageCircle, RotateCcw, Ban, Settings, Mail,
} from 'lucide-react';
import { useVisits } from '../hooks/useVisits';
import { useAppStore } from '../lib/store';
import { useTiposVisita } from '../hooks/useTiposVisita';
import { useTecnicos } from '../hooks/useTecnicos';
import TiposVisitaForm from './TiposVisitaForm.jsx';
import TecnicosForm from './TecnicosForm.jsx';

const URGENCIES = ['Alta', 'Media', 'Baja'];

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

import { formatDateOnly } from '../utils/dates.js';

// Formatea número WhatsApp empresa para wa.me (puro, sin imports globales)
function formatEmpresaWhatsApp(cfg) {
  if (!cfg.whatsappNumero) return '';
  const raw = cfg.whatsappNumero.replace(/\D/g, '');
  const num = raw.startsWith('0') ? raw.slice(1) : raw;
  return `${cfg.whatsappPrefijo || '593'}${num}`;
}

// ─── PDF de una visita ─────────────────────────────────────────────────────
function generateVisitPDF(task, visit) {
  const cfg        = useAppStore.getState().empresaConfig;
  const logoSrc    = cfg.logoUrl || `${window.location.origin}/logo.png`;
  const nombreEmp  = cfg.empresaNombre || 'ACONTPLUS';
  const sloganEmp  = cfg.empresaSlogan || 'Recordatorios';
  const statusColor  = { 'Programada': '#2563eb', 'Realizada': '#16a34a', 'Cancelada': '#6b7280', 'Anulada': '#dc2626' }[visit.status] || '#6b7280';
  const urgencyColor = { 'Alta': '#dc2626', 'Media': '#d97706', 'Baja': '#16a34a' }[visit.urgency] || '#6b7280';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Visita Técnica - ${task.clientName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:12px;color:#1e293b;background:#fff}
    .page{max-width:720px;margin:0 auto;padding:32px}
    .header{display:flex;justify-content:space-between;align-items:center;
            margin-bottom:20px;padding-bottom:14px;border-bottom:4px solid #D61672}
    .header-brand{display:flex;align-items:center;gap:10px}
    .header-brand img{width:48px;height:48px;object-fit:contain}
    .header-brand h1{font-size:18px;font-weight:bold;color:#D61672}
    .header-brand p{font-size:10px;color:#FFA901;font-weight:bold}
    .header-brand small{font-size:9px;color:#94a3b8}
    .header-right{text-align:right}
    .doc-title{font-size:14px;font-weight:bold;color:#1e293b}
    .doc-sub{font-size:10px;color:#64748b;margin-top:2px}
    .status-row{display:flex;gap:10px;margin-bottom:16px}
    .sc{flex:1;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center}
    .sc-lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
    .sc-val{font-size:13px;font-weight:bold}
    .section{margin-bottom:16px}
    .section-title{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.07em;
                   color:#D61672;margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid #fce7f3}
    table{width:100%;border-collapse:collapse}
    td{padding:6px 10px;border:1px solid #e2e8f0;font-size:11px}
    td.lbl{background:#f8fafc;font-weight:bold;color:#475569;width:28%;font-size:10px;
            text-transform:uppercase;letter-spacing:.04em}
    .obs{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:6px;padding:10px;
         font-size:11px;color:#1e293b;min-height:36px;line-height:1.5}
    .obs.empty{color:#94a3b8;font-style:italic}
    .closure{background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:16px}
    .closure-title{font-size:10px;font-weight:bold;color:#166534;text-transform:uppercase;
                   letter-spacing:.06em;margin-bottom:8px}
    .sig-area{display:flex;gap:16px;margin-top:8px}
    .sig-box{flex:1;border-top:1.5px solid #D61672;padding-top:6px;text-align:center;
             font-size:10px;color:#64748b;margin-top:48px}
    .footer{margin-top:20px;padding-top:10px;border-top:2px solid #D61672;
            display:flex;justify-content:space-between;align-items:center}
    .footer-left{display:flex;align-items:center;gap:8px}
    .footer-left img{width:22px;height:22px;object-fit:contain}
    .footer-brand{font-size:10px;font-weight:bold;color:#D61672}
    .footer-right{font-size:9px;color:#94a3b8;text-align:right}
    @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.page{padding:20px}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-brand">
      <img src="${logoSrc}" alt="${nombreEmp}"/>
      <div><h1>${nombreEmp}</h1><p>${sloganEmp}</p></div>
    </div>
    <div class="header-right">
      <div class="doc-title">Ficha de Visita Técnica</div>
      ${task.serviceOrder ? `<div class="doc-sub">OS: ${task.serviceOrder}</div>` : `<div class="doc-sub" style="color:#94a3b8">Sin orden asignada</div>`}
      <div class="doc-sub">Generado: ${formatDate(new Date().toISOString())}</div>
    </div>
  </div>
  <div class="status-row">
    <div class="sc"><div class="sc-lbl">Estado visita</div><div class="sc-val" style="color:${statusColor}">${visit.status}</div></div>
    <div class="sc"><div class="sc-lbl">Urgencia</div><div class="sc-val" style="color:${urgencyColor}">${visit.urgency || '—'}</div></div>
    <div class="sc"><div class="sc-lbl">Tipo</div><div class="sc-val" style="color:#D61672;font-size:11px">${visit.type || '—'}</div></div>
    <div class="sc"><div class="sc-lbl">Fecha programada</div><div class="sc-val" style="font-size:12px">${formatDateOnly(visit.scheduledDate)}${visit.scheduledTime ? ' · ' + visit.scheduledTime : ''}</div></div>
  </div>
  <div class="section">
    <div class="section-title">👤 Datos del cliente</div>
    <table>
      <tr>
        <td class="lbl">Nombre</td><td>${task.clientName || '—'}</td>
        <td class="lbl">Cédula / RUC</td><td style="font-family:monospace">${task.identification || '—'}</td>
      </tr>
      <tr>
        <td class="lbl">Teléfono</td><td>${task.clientPhone || '—'}</td>
        <td class="lbl">Dirección</td><td>${task.clientAddress || '—'}</td>
      </tr>
    </table>
  </div>
  <div class="section">
    <div class="section-title">🔧 Datos de la visita</div>
    <table>
      <tr>
        <td class="lbl">Técnico asignado</td><td>${visit.technician || '—'}</td>
        <td class="lbl">Registrado por</td><td>${visit.createdBy || '—'}</td>
      </tr>
      <tr>
        <td class="lbl">Fecha programada</td>
        <td>${formatDateOnly(visit.scheduledDate)}${visit.scheduledTime ? ' a las ' + visit.scheduledTime : ''}</td>
        <td class="lbl">Fecha creación</td><td>${formatDate(visit.createdAt)}</td>
      </tr>
    </table>
  </div>
  <div class="section">
    <div class="section-title">📝 Observaciones</div>
    <div class="obs ${!visit.observations ? 'empty' : ''}">${visit.observations || 'Sin observaciones registradas'}</div>
  </div>
  ${visit.status === 'Realizada' && visit.completedAt ? `
  <div class="closure">
    <div class="closure-title">✅ Datos de cierre</div>
    <table>
      <tr>
        <td class="lbl" style="background:#dcfce7;border-color:#bbf7d0">Completado por</td>
        <td style="background:#dcfce7;border-color:#bbf7d0">${visit.completedBy || '—'}</td>
        <td class="lbl" style="background:#dcfce7;border-color:#bbf7d0">Fecha cierre</td>
        <td style="background:#dcfce7;border-color:#bbf7d0">${formatDate(visit.completedAt)}</td>
      </tr>
    </table>
    ${visit.closingObservations ? `
    <div style="margin-top:8px">
      <div style="font-size:10px;font-weight:bold;color:#166534;margin-bottom:4px">Observación de cierre:</div>
      <div class="obs" style="background:#dcfce7;border-color:#bbf7d0;color:#166534">${visit.closingObservations}</div>
    </div>` : ''}
  </div>` : ''}
  <div class="section">
    <div class="section-title">✍️ Firmas</div>
    <div class="sig-area">
      <div class="sig-box">Firma del técnico</div>
      <div class="sig-box">Firma del cliente / Recibí conforme</div>
      <div class="sig-box">Nombre y cédula del cliente</div>
    </div>
  </div>
  <div class="footer">
    <div class="footer-left">
      <img src="${logoSrc}" alt="${nombreEmp}"/>
      <div><div class="footer-brand">${nombreEmp}</div><div style="font-size:9px;color:#FFA901;font-weight:bold">${sloganEmp}</div></div>
    </div>
    <div class="footer-right">Documento generado el ${formatDate(new Date().toISOString())}<br/>${nombreEmp} ${sloganEmp}</div>
  </div>
</div>
</body>
</html>`;
}

export function printVisitPDF(task, visit) {
  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(generateVisitPDF(task, visit));
  w.document.close();
  w.focus();
}

// ─── WhatsApp de una visita ────────────────────────────────────────────────
export function shareVisitWhatsApp(task, visit) {
  const cfg        = useAppStore.getState().empresaConfig;
  const nombreEmp  = cfg.empresaNombre || 'ACONTPLUS';
  const lines = [
    `🔧 *${nombreEmp.toUpperCase()}*`,
    `📋 *Aviso de Visita Técnica*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    task.serviceOrder ? `🔖 *OS:* ${task.serviceOrder}` : '',
    ``, `👤 *CLIENTE*`,
    `• Nombre: ${task.clientName}`,
    task.clientPhone   ? `• Teléfono: ${task.clientPhone}`    : '',
    task.clientAddress ? `• Dirección: ${task.clientAddress}` : '',
    ``, `📅 *VISITA PROGRAMADA*`,
    `• Fecha: ${formatDateOnly(visit.scheduledDate)}${visit.scheduledTime ? ' a las ' + visit.scheduledTime : ''}`,
    visit.type       ? `• Tipo: ${visit.type}`          : '',
    visit.urgency    ? `• Urgencia: ${visit.urgency}`   : '',
    visit.technician ? `• Técnico: ${visit.technician}` : '',
    visit.observations ? `\n📝 *Observaciones:*\n${visit.observations}` : '',
    visit.status === 'Realizada' && visit.completedAt ? [
      ``, `✅ *CIERRE*`,
      `• Realizada: ${formatDate(visit.completedAt)}`,
      visit.completedBy         ? `• Por: ${visit.completedBy}`          : '',
      visit.closingObservations ? `• Obs: ${visit.closingObservations}`  : '',
    ].filter(Boolean).join('\n') : '',
    ``, `━━━━━━━━━━━━━━━━━━━━`,
    `_Enviado desde ${nombreEmp}_`,
  ].filter(l => l !== '').join('\n');

  const encoded = encodeURIComponent(lines);
  let destPhone = '';
  if (task.clientPhone) {
    const raw = task.clientPhone.replace(/\D/g, '');
    destPhone = raw.startsWith('0') ? `593${raw.slice(1)}` : `593${raw}`;
  } else {
    destPhone = formatEmpresaWhatsApp(cfg);
  }
  const url = destPhone
    ? `https://wa.me/${destPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
}

// ─── Modal de formulario unificado (nueva visita y edición) ──────────────────
const URGENCY_CONFIG = {
  Alta:  { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', label: '🔴 Alta' },
  Media: { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', label: '🟡 Media' },
  Baja:  { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', label: '🟢 Baja' },
};

export function VisitFormModal({ initial, onSave, onClose, isEdit, tiposParaSelect, tecnicosParaSelect }) {
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

  const tasks = useAppStore(s => s.tasks);

  const [formData, setFormData] = useState({
    scheduledDate:   initial?.scheduledDate   || today,
    scheduledTime:   initial?.scheduledTime   || '',
    type:            initial?.type            || tiposParaSelect[0] || '',
    urgency:         initial?.urgency         || 'Media',
    observations:    initial?.observations    || '',
    technician:      initial?.technician      || '',
    technicianEmail: initial?.technicianEmail || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  // Visitas del técnico seleccionado en la fecha seleccionada (excluye la visita en edición)
  const techSchedule = useMemo(() => {
    if (!formData.technician || !formData.scheduledDate) return [];
    const result = [];
    tasks.forEach(task => {
      (task.visits || []).forEach(v => {
        if (
          v.technician === formData.technician &&
          v.scheduledDate === formData.scheduledDate &&
          v.status === 'Programada' &&
          v.id !== initial?.id
        ) result.push({ visit: v, clientName: task.clientName });
      });
    });
    return result.sort((a, b) => (a.visit.scheduledTime || '').localeCompare(b.visit.scheduledTime || ''));
  }, [tasks, formData.technician, formData.scheduledDate, initial?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onSave(formData);
    setIsLoading(false);
  };

  const inp = "w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors bg-white";
  const lbl = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2";
  const accentColor = isEdit ? '#2563eb' : '#D61672';
  const foc = e => e.target.style.borderColor = accentColor;
  const blr = e => e.target.style.borderColor = '#e2e8f0';

  const SectionHeader = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 mb-5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: accentColor }}>
        <Icon size={14} className="text-white" />
      </div>
      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h4>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="flex-1 min-w-0"
        style={{ backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)' }}
        onClick={onClose} />

      <div className="relative bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '100%', maxWidth: '560px' }}>

        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between flex-shrink-0"
          style={{ background: isEdit ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              {isEdit ? <Edit size={18} className="text-white" /> : <Plus size={18} className="text-white" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{isEdit ? 'Editar visita' : 'Nueva visita programada'}</h3>
              <p className="text-xs text-white" style={{ opacity: 0.75 }}>
                {isEdit ? 'Modifica los datos de la visita' : 'Completa la información de la visita'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white transition-all" style={{ opacity: 0.75 }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.background = 'transparent'; }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-7 space-y-8">

            {/* ── 1. Técnico (primero para cargar la agenda) ── */}
            <div>
              <SectionHeader icon={User} title="Técnico asignado" />
              <select value={formData.technician} onChange={e => {
                const nombre = e.target.value;
                const found  = tecnicosParaSelect.find(t => t.nombre === nombre);
                set('technician', nombre);
                set('technicianEmail', found?.email || '');
              }} className={inp} onFocus={foc} onBlur={blr}>
                <option value="">— Selecciona un técnico —</option>
                {tecnicosParaSelect.map(t => (
                  <option key={t.id} value={t.nombre}>{t.nombre}</option>
                ))}
              </select>
              {formData.technicianEmail && (
                <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                  <Mail size={11} />
                  Notificación de email: <span className="font-mono text-slate-500">{formData.technicianEmail}</span>
                </p>
              )}
            </div>

            {/* ── 2. Fecha + Agenda + Hora ── */}
            <div>
              <SectionHeader icon={Calendar} title="Programación" />

              {/* Fecha */}
              <div className="mb-4">
                <label className={lbl}>Fecha de visita <span className="text-red-400">*</span></label>
                <input type="date" value={formData.scheduledDate}
                  onChange={e => set('scheduledDate', e.target.value)}
                  required className={inp} onFocus={foc} onBlur={blr} />
              </div>

              {/* Agenda del técnico para esa fecha */}
              {formData.technician && formData.scheduledDate && (
                <div className="mb-4 rounded-xl border-2 overflow-hidden"
                  style={{ borderColor: `${accentColor}30` }}>
                  <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: `${accentColor}12` }}>
                    <Clock size={13} style={{ color: accentColor }} />
                    <p className="text-xs font-bold text-slate-700">
                      Agenda de <span style={{ color: accentColor }}>{formData.technician}</span> — {formData.scheduledDate}
                    </p>
                  </div>
                  {techSchedule.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-400 italic flex items-center gap-1.5">
                      <span className="text-green-500 font-bold">✓</span> Día libre — sin visitas programadas
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {techSchedule.map(({ visit, clientName }) => (
                        <div key={visit.id} className="px-4 py-2.5 flex items-center gap-3">
                          <span className="flex-shrink-0 text-xs font-bold font-mono w-12"
                            style={{ color: accentColor }}>
                            {visit.scheduledTime || '——:——'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{clientName}</p>
                            {visit.type && <p className="text-xs text-slate-400 truncate">🔧 {visit.type}</p>}
                          </div>
                          <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                            visit.urgency === 'Alta'  ? 'bg-red-100 text-red-700' :
                            visit.urgency === 'Media' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>{visit.urgency || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Hora */}
              <div>
                <label className={lbl}>Hora de la visita</label>
                <input type="time" value={formData.scheduledTime}
                  onChange={e => set('scheduledTime', e.target.value)}
                  className={inp} onFocus={foc} onBlur={blr} />
                <p className="text-xs text-slate-400 mt-1.5">Opcional — si no se indica se considera todo el día</p>
              </div>
            </div>

            {/* ── 3. Tipo de visita ── */}
            <div>
              <SectionHeader icon={Wrench} title="Tipo de servicio" />
              <select value={formData.type} onChange={e => set('type', e.target.value)}
                className={inp} onFocus={foc} onBlur={blr}>
                <option value="">— Selecciona un tipo —</option>
                {tiposParaSelect.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* ── 4. Urgencia ── */}
            <div>
              <SectionHeader icon={AlertCircle} title="Urgencia" />
              <div className="grid grid-cols-3 gap-4">
                {URGENCIES.map(u => {
                  const cfg      = URGENCY_CONFIG[u];
                  const selected = formData.urgency === u;
                  return (
                    <button key={u} type="button" onClick={() => set('urgency', u)}
                      className="py-4 px-4 rounded-xl border-2 font-bold text-sm transition-all"
                      style={{
                        borderColor: selected ? cfg.color : '#e2e8f0',
                        background:  selected ? cfg.bg    : '#fff',
                        color:       selected ? cfg.color : '#94a3b8',
                        boxShadow:   selected ? `0 0 0 3px ${cfg.border}` : 'none',
                      }}>
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 5. Observaciones ── */}
            <div>
              <SectionHeader icon={FileText} title="Observaciones" />
              <textarea value={formData.observations}
                onChange={e => set('observations', e.target.value)}
                rows={5}
                placeholder="Describe el trabajo a realizar, materiales necesarios, acceso al lugar, etc."
                className={`${inp} resize-none`}
                onFocus={foc} onBlur={blr} />
            </div>
          </div>

          {/* Botones */}
          <div className="px-7 py-5 border-t border-slate-100 bg-slate-50 flex gap-3 flex-shrink-0">
            <button type="submit" disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-all hover:opacity-90 active:scale-95 shadow-sm"
              style={{ background: isLoading ? '#94a3b8' : isEdit
                ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                : 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              {isLoading
                ? <><span className="animate-spin">⏳</span><span>Guardando...</span></>
                : isEdit
                  ? <><Edit size={16} /><span>Guardar cambios</span></>
                  : <><Plus size={16} /><span>Agregar visita</span></>}
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Item de visita ────────────────────────────────────────────────────────
function VisitItem({ visit, task, visitNumber, onComplete, onCancel, onRevert, onAnnul, onEdit }) {
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closingObs,    setClosingObs]    = useState('');
  const [isLoading,     setIsLoading]     = useState(false);

  // ── Flags de estado temporal (solo para visitas Programadas) ──────────────
  // Fecha local del navegador (evita desfase UTC en zonas -5 como Ecuador)
  const todayLocal = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const nowTime    = (() => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })();
  const isOverdue  = visit.status === 'Programada' && (
    visit.scheduledDate < todayLocal ||
    (visit.scheduledDate === todayLocal && !!visit.scheduledTime && visit.scheduledTime < nowTime)
  );
  const isToday    = visit.status === 'Programada' && visit.scheduledDate === todayLocal && !isOverdue;

  const handleComplete = async () => {
    setIsLoading(true);
    await onComplete(visit.id, { closingObservations: closingObs });
    setIsLoading(false);
    setShowCloseForm(false);
  };

  // Colores del borde/fondo del item
  const bgColor =
    visit.status === 'Realizada' ? 'bg-green-50 border-green-200'   :
    visit.status === 'Cancelada' ? 'bg-amber-50 border-amber-200'   :
    visit.status === 'Anulada'   ? 'bg-red-50 border-red-200'       :
    isOverdue                    ? 'bg-red-50 border-red-300'        :
    isToday                      ? 'bg-blue-50 border-blue-300'      :
    'bg-slate-50 border-slate-200';

  const statusStyle =
    visit.status === 'Realizada' ? 'bg-green-100 text-green-700'    :
    visit.status === 'Cancelada' ? 'bg-amber-100 text-amber-700'    :
    visit.status === 'Anulada'   ? 'bg-red-100 text-red-600'        :
    'bg-blue-100 text-blue-700';

  const urgencyStyle =
    visit.urgency === 'Alta'  ? 'bg-red-100 text-red-700'       :
    visit.urgency === 'Media' ? 'bg-yellow-100 text-yellow-700'  :
    'bg-slate-100 text-slate-600';

  return (
    <div className={`rounded-xl border-2 p-3 transition-all ${bgColor}`}>

      {/* Cabecera */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">

          {/* Badges de estado + urgencia + Retrasada/Hoy */}
          <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
            {visitNumber && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-500">
                #{visitNumber}
              </span>
            )}
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${statusStyle}`}>
              {visit.status}
            </span>
            {visit.urgency && (
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${urgencyStyle}`}>
                {visit.urgency}
              </span>
            )}
            {/* ── Etiqueta Retrasada ── */}
            {isOverdue && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-200 text-red-800 border border-red-300">
                ⚠️ Retrasada
              </span>
            )}
            {/* ── Etiqueta Hoy ── */}
            {isToday && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-200 text-blue-800 border border-blue-300">
                📅 Hoy
              </span>
            )}
          </div>

          {/* Fecha + hora */}
          <p className={`text-sm font-bold ${isOverdue ? 'text-red-700' : 'text-slate-800'}`}>
            📅 {formatDateOnly(visit.scheduledDate)}
            {visit.scheduledTime && (
              <span className="text-slate-500 font-normal ml-1">· {visit.scheduledTime}</span>
            )}
          </p>
          {visit.type && (
            <p className="text-xs text-slate-600 mt-0.5 flex items-center space-x-1">
              <Wrench size={11} className="flex-shrink-0" /><span>{visit.type}</span>
            </p>
          )}
          {visit.technician && (
            <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
              <User size={11} className="flex-shrink-0" /><span className="truncate">{visit.technician}</span>
            </p>
          )}
        </div>

        {/* Botones de acción por estado */}
        <div className="flex space-x-1 ml-2 flex-shrink-0">
          {visit.status === 'Programada' && (
            <>
              <button onClick={() => setShowCloseForm(!showCloseForm)}
                className="p-1.5 rounded-lg text-green-600 hover:bg-green-100 transition-colors"
                title="Marcar como realizada">
                <CheckCircle size={16} />
              </button>
              <button onClick={() => onEdit(visit)}
                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                title="Editar visita">
                <Edit size={16} />
              </button>
              <button onClick={() => onCancel(visit.id)}
                className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors"
                title="Cancelar visita">
                <X size={16} />
              </button>
              <button onClick={() => onAnnul(visit.id)}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                title="Anular visita">
                <Ban size={16} />
              </button>
            </>
          )}
          {visit.status === 'Cancelada' && (
            <>
              <button onClick={() => onRevert(visit.id)}
                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors"
                title="Revertir a Programada">
                <RotateCcw size={16} />
              </button>
              <button onClick={() => onAnnul(visit.id)}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                title="Anular visita">
                <Ban size={16} />
              </button>
            </>
          )}
          {visit.status === 'Anulada' && (
            <button onClick={() => onRevert(visit.id)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              title="Revertir a Programada">
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Observaciones */}
      {visit.observations && (
        <div className="mb-2 p-2 rounded-lg border border-white" style={{ background: 'rgba(255,255,255,0.7)' }}>
          <p className="text-xs text-slate-500">📝 {visit.observations}</p>
        </div>
      )}

      {/* Nota anulada */}
      {visit.status === 'Anulada' && (
        <div className="mb-2 px-2 py-1.5 rounded-lg bg-red-100 border border-red-200">
          <p className="text-xs text-red-600 font-semibold">🚫 Visita anulada — inactiva</p>
        </div>
      )}

      {/* Botones PDF y WhatsApp */}
      <div className="flex space-x-2 mt-2 pt-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
        <button onClick={() => printVisitPDF(task, visit)}
          className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
          title="Ver / Imprimir PDF">
          <Printer size={13} /><span>Ver PDF</span>
        </button>
        <button onClick={() => shareVisitWhatsApp(task, visit)}
          className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
          title="Enviar por WhatsApp">
          <MessageCircle size={13} /><span>WhatsApp</span>
        </button>
      </div>

      {/* Formulario cierre */}
      {showCloseForm && visit.status === 'Programada' && (
        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Observación de cierre <span className="text-slate-400 font-normal normal-case">(opcional)</span>
          </label>
          <textarea value={closingObs} onChange={e => setClosingObs(e.target.value)} rows={2}
            placeholder="Describe el trabajo realizado..."
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none resize-none bg-white"
            onFocus={e => e.target.style.borderColor = '#16a34a'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            autoFocus />
          <div className="flex space-x-2">
            <button onClick={handleComplete} disabled={isLoading}
              className="flex-1 flex items-center justify-center space-x-1 py-2 text-white text-xs font-bold rounded-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              <CheckCircle size={13} />
              <span>{isLoading ? 'Guardando...' : 'Confirmar realizada'}</span>
            </button>
            <button onClick={() => setShowCloseForm(false)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Datos de cierre */}
      {visit.status === 'Realizada' && visit.completedAt && (
        <div className="mt-2 pt-2 border-t border-green-200 space-y-1">
          <div className="flex items-center justify-between text-xs text-green-600">
            <span>✅ {formatDate(visit.completedAt)}</span>
            <span>{visit.completedBy}</span>
          </div>
          {visit.closingObservations && (
            <p className="text-xs text-green-700 bg-green-100 rounded-lg p-2">{visit.closingObservations}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal principal centrado ──────────────────────────────────────────────
export default function VisitsModal({ task, user, onClose, autoAddForm = false }) {
  // ── Hooks de catálogos ──────────────────────────────────────────────────
  const { tiposParaSelect }   = useTiposVisita(user);
  const { tecnicos }          = useTecnicos(user);
  const tecnicosParaSelect    = tecnicos;

  // ── Estados de formularios de gestión ────────────────────────────────────
  const [showTiposForm,    setShowTiposForm]    = useState(false);
  const [showTecnicosForm, setShowTecnicosForm] = useState(false);

  const {
    visits, isLoading,
    addVisit, editVisit, completeVisit,
    cancelVisit, revertVisit, annulVisit,
  } = useVisits(task, user);

  const [showAddForm,  setShowAddForm]  = useState(autoAddForm);
  const [editingVisit, setEditingVisit] = useState(null);

  // ── CAMBIO 3: orden ASCENDENTE — más cercana a hoy primero ────────────────
  const sortedVisits = [...visits].sort((a, b) => {
    const da = new Date(a.scheduledDate + 'T' + (a.scheduledTime || '00:00'));
    const db = new Date(b.scheduledDate + 'T' + (b.scheduledTime || '00:00'));
    return da - db;
  });

  // Número secuencial por orden de creación (independiente del orden de visualización)
  const visitNumberMap = Object.fromEntries(
    [...visits]
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
      .map((v, i) => [v.id, i + 1])
  );

  const pendingCount   = visits.filter(v => v.status === 'Programada').length;
  const completedCount = visits.filter(v => v.status === 'Realizada').length;
  const canceledCount  = visits.filter(v => v.status === 'Cancelada').length;
  const annuledCount   = visits.filter(v => v.status === 'Anulada').length;

  const handleAdd = async (data) => {
    const ok = await addVisit(data);
    if (ok) setShowAddForm(false);
  };

  const handleStartEdit = (visit) => setEditingVisit(visit);

  const handleSaveEdit = async (data) => {
    const ok = await editVisit(editingVisit.id, data);
    if (ok) setEditingVisit(null);
  };

  return (
    <>
      {/* Sub-modales de catálogos */}
      {showTiposForm    && <TiposVisitaForm user={user} onClose={() => setShowTiposForm(false)} />}
      {showTecnicosForm && <TecnicosForm    user={user} onClose={() => setShowTecnicosForm(false)} />}

      {/* Modal de formulario unificado (nueva visita o edición) */}
      {(showAddForm || editingVisit) && (
        <VisitFormModal
          initial={editingVisit || undefined}
          isEdit={!!editingVisit}
          onSave={editingVisit ? handleSaveEdit : handleAdd}
          onClose={() => { setShowAddForm(false); setEditingVisit(null); }}
          tiposParaSelect={tiposParaSelect}
          tecnicosParaSelect={tecnicosParaSelect}
        />
      )}

      {/* Modal principal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0"
          style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}
          onClick={onClose} />

        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
          style={{ maxHeight: '92vh' }}>

          {/* CABECERA */}
          <div className="flex-shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, #D61672 0%, #c01265 50%, #FFA901 100%)' }}>

            <div className="px-5 pt-5 pb-3 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <CalendarDaysIcon />
                  <h3 className="font-bold text-white text-lg leading-tight">Visitas programadas</h3>
                </div>
                <p className="text-white font-semibold text-base leading-tight truncate">{task.clientName}</p>
              </div>
              <button onClick={onClose}
                className="ml-3 flex-shrink-0 p-1.5 rounded-xl transition-colors"
                style={{ color: 'rgba(255,255,255,0.8)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}>
                <X size={20} />
              </button>
            </div>

            {/* Chips de datos de tarea */}
            <div className="px-5 pb-4 space-y-2">
              <div className="flex flex-wrap gap-2">
                {task.serviceOrder && (
                  <div className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5"
                    style={{ background: 'rgba(255,255,255,0.22)' }}>
                    <Hash size={12} className="text-white flex-shrink-0" />
                    <span className="text-xs text-white font-bold font-mono">OS: {task.serviceOrder}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5"
                  style={{ background: 'rgba(255,255,255,0.22)' }}>
                  <span className="text-xs text-white font-semibold">{task.status}</span>
                </div>
                {task.equipment && (
                  <div className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5"
                    style={{ background: 'rgba(255,255,255,0.22)' }}>
                    <Wrench size={12} className="text-white flex-shrink-0" />
                    <span className="text-xs text-white font-semibold truncate max-w-32">{task.equipment}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {task.identification && (
                  <div className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5"
                    style={{ background: 'rgba(255,255,255,0.16)' }}>
                    <span className="text-xs text-white">🪪 {task.identification}</span>
                  </div>
                )}
                {task.clientPhone && (
                  <div className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5"
                    style={{ background: 'rgba(255,255,255,0.16)' }}>
                    <Phone size={12} className="text-white flex-shrink-0" />
                    <span className="text-xs text-white">{task.clientPhone}</span>
                  </div>
                )}
                {task.clientAddress && (
                  <div className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5"
                    style={{ background: 'rgba(255,255,255,0.16)' }}>
                    <MapPin size={12} className="text-white flex-shrink-0" />
                    <span className="text-xs text-white truncate max-w-40">{task.clientAddress}</span>
                  </div>
                )}
              </div>
              {task.observations && (
                <div className="flex items-start space-x-1.5 rounded-lg px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <FileText size={12} className="text-white flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white italic line-clamp-2" style={{ opacity: 0.85 }}>
                    {task.observations}
                  </p>
                </div>
              )}
            </div>

            {/* Contadores */}
            <div className="px-5 pb-4 flex flex-wrap gap-2">
              <div className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5"
                style={{ background: 'rgba(255,255,255,0.22)' }}>
                <Clock size={12} className="text-white" />
                <span className="text-xs text-white font-semibold">{pendingCount} programada{pendingCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5"
                style={{ background: 'rgba(255,255,255,0.22)' }}>
                <CheckCircle size={12} className="text-white" />
                <span className="text-xs text-white font-semibold">{completedCount} realizada{completedCount !== 1 ? 's' : ''}</span>
              </div>
              {canceledCount > 0 && (
                <div className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5"
                  style={{ background: 'rgba(255,255,255,0.22)' }}>
                  <X size={12} className="text-white" />
                  <span className="text-xs text-white font-semibold">{canceledCount} cancelada{canceledCount !== 1 ? 's' : ''}</span>
                </div>
              )}
              {annuledCount > 0 && (
                <div className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5"
                  style={{ background: 'rgba(255,255,255,0.22)' }}>
                  <Ban size={12} className="text-white" />
                  <span className="text-xs text-white font-semibold">{annuledCount} anulada{annuledCount !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* CUERPO */}
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="px-4 pt-4 pb-3">
              <button onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                <Plus size={17} /><span>Agregar visita</span>
              </button>
            </div>

            <div className="px-4 pb-4 space-y-3">
              {isLoading && <div className="text-center py-4 text-slate-400 text-sm">Guardando...</div>}
              {sortedVisits.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Sin visitas programadas</p>
                  <p className="text-xs mt-1">Agrega la primera visita arriba</p>
                </div>
              )}
              {sortedVisits.map(visit => (
                <VisitItem
                  key={visit.id}
                  visit={visit}
                  task={task}
                  visitNumber={visitNumberMap[visit.id]}
                  onComplete={completeVisit}
                  onCancel={cancelVisit}
                  onRevert={revertVisit}
                  onAnnul={annulVisit}
                  onEdit={handleStartEdit}
                />
              ))}
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex-shrink-0 px-5 py-3 border-t border-slate-100 bg-white">
            {/* Fila principal: contador + cerrar */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400">
                {visits.length} visita{visits.length !== 1 ? 's' : ''} en total
              </p>
              <button onClick={onClose}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                Cerrar
              </button>
            </div>
            {/* Botones de gestión de catálogos */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400 mr-auto">Catálogos:</p>
              <button
                onClick={() => setShowTiposForm(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-pink-200 hover:bg-pink-50 transition-colors"
                style={{ color: '#D61672' }}>
                <Wrench size={13} />
                <span>Tipos de visita</span>
              </button>
              <button
                onClick={() => setShowTecnicosForm(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 hover:bg-blue-50 text-blue-600 transition-colors">
                <User size={13} />
                <span>Técnicos</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Icono inline ──────────────────────────────────────────────────────────
function CalendarDaysIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="flex-shrink-0 opacity-90">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/>
      <line x1="16" y1="14" x2="16.01" y2="14"/><line x1="8" y1="18" x2="8.01" y2="18"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
}
