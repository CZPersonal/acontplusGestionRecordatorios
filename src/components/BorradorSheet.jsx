import { useState, useEffect } from 'react';
import { Plus, X, User, Hash, MapPin, Phone, Mail, Calendar, Clock, FileText, ChevronDown, Pencil, CheckCircle2, Loader2 } from 'lucide-react';
import { useBorradores } from '../hooks/useBorradores';
import { formatDateOnly, formatDateTime } from '../utils/dates.js';

function localToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
}

const EMPTY_FORM = {
  clientName:    '',
  clientIdNumber:'',
  clientAddress: '',
  clientPhone:   '',
  clientEmail:   '',
  scheduledDate: localToday(),
  scheduledTime: '',
  motivo:        '',
};

// ─── Formulario (reutilizado para crear y editar) ─────────────────────────────

function BorradorForm({ initial, onSave, onClose, isEdit, isLoading }) {
  const [form, setForm] = useState(initial || { ...EMPTY_FORM, scheduledDate: localToday() });
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.clientName.trim()) e.clientName = 'Requerido';
    if (!form.scheduledDate)     e.scheduledDate = 'Requerido';
    if (!form.motivo.trim())     e.motivo = 'Requerido';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const ok = await onSave({
      clientName:     form.clientName.trim(),
      clientIdNumber: form.clientIdNumber.trim(),
      clientAddress:  form.clientAddress.trim(),
      clientPhone:    form.clientPhone.trim(),
      clientEmail:    form.clientEmail.trim().toLowerCase(),
      scheduledDate:  form.scheduledDate,
      scheduledTime:  form.scheduledTime,
      motivo:         form.motivo.trim(),
    });
    if (ok) onClose();
  };

  const inp = (hasErr) =>
    `w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors bg-white ${
      hasErr ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-pink-400'
    }`;
  const lbl = 'block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">

      {/* Cabecera */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-slate-100">
        <div>
          <p className="text-base font-bold text-slate-800">
            {isEdit ? 'Editar borrador' : 'Nuevo borrador de visita'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {isEdit ? 'Modifica los datos del borrador' : 'El administrador lo convertirá en visita formal'}
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Campos scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* ── Sección cliente ── */}
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Datos del cliente</p>

        <div>
          <label className={lbl}>Nombre y apellido <span className="text-red-400">*</span></label>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={form.clientName} onChange={e => set('clientName', e.target.value)}
              placeholder="Ej. Juan Pérez García" autoFocus
              className={`${inp(errors.clientName)} pl-9`} />
          </div>
          {errors.clientName && <p className="text-xs text-red-600 mt-1">⚠️ {errors.clientName}</p>}
        </div>

        <div>
          <label className={lbl}>Cédula / RUC</label>
          <div className="relative">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={form.clientIdNumber} onChange={e => set('clientIdNumber', e.target.value)}
              placeholder="0000000000"
              className={`${inp(false)} pl-9`} />
          </div>
        </div>

        <div>
          <label className={lbl}>Dirección</label>
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-3.5 text-slate-400" />
            <textarea value={form.clientAddress} onChange={e => set('clientAddress', e.target.value)}
              placeholder="Calle, número, sector…" rows={2}
              className={`${inp(false)} pl-9 resize-none`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Teléfono</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="tel" value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)}
                placeholder="09XXXXXXXX"
                className={`${inp(false)} pl-9`} />
            </div>
          </div>
          <div>
            <label className={lbl}>Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)}
                placeholder="correo@ejemplo.com"
                className={`${inp(false)} pl-9`} />
            </div>
          </div>
        </div>

        {/* ── Sección visita ── */}
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-2">Visita</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Fecha <span className="text-red-400">*</span></label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)}
                required className={`${inp(errors.scheduledDate)} pl-9`} />
            </div>
            {errors.scheduledDate && <p className="text-xs text-red-600 mt-1">⚠️ {errors.scheduledDate}</p>}
          </div>
          <div>
            <label className={lbl}>Hora</label>
            <div className="relative">
              <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="time" value={form.scheduledTime} onChange={e => set('scheduledTime', e.target.value)}
                className={`${inp(false)} pl-9`} />
            </div>
          </div>
        </div>

        <div>
          <label className={lbl}>Motivo de la visita <span className="text-red-400">*</span></label>
          <div className="relative">
            <FileText size={14} className="absolute left-3 top-3.5 text-slate-400" />
            <textarea value={form.motivo} onChange={e => set('motivo', e.target.value)}
              placeholder="Describe brevemente el motivo o trabajo a realizar…" rows={3}
              className={`${inp(errors.motivo)} pl-9 resize-none`} />
          </div>
          {errors.motivo && <p className="text-xs text-red-600 mt-1">⚠️ {errors.motivo}</p>}
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 px-5 py-4 border-t border-slate-100 flex-shrink-0">
        <button type="button" onClick={onClose} disabled={isLoading}
          className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={isLoading}
          className="flex-1 py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
          style={{ background: isLoading ? '#f9a8d4' : 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {isLoading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar borrador'}
        </button>
      </div>
    </form>
  );
}

// ─── Tarjeta de borrador (lista del técnico) ──────────────────────────────────

function BorradorCard({ b, onEdit }) {
  const isPendiente = b.status === 'Pendiente';
  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${isPendiente ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{b.clientName}</p>
            {b.clientPhone && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone size={10} className="flex-shrink-0" />{b.clientPhone}
              </p>
            )}
          </div>
          <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
            isPendiente ? 'bg-amber-200 text-amber-800' : 'bg-green-100 text-green-700'
          }`}>
            {isPendiente ? '⏳ Pendiente' : '✅ Convertido'}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {b.scheduledDate && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar size={10} className="flex-shrink-0" />
              {formatDateOnly(b.scheduledDate)}
              {b.scheduledTime && ` ${b.scheduledTime}`}
            </span>
          )}
        </div>
        {b.motivo && (
          <p className="text-xs text-slate-500 italic mt-1 line-clamp-2">📝 {b.motivo}</p>
        )}
        {!isPendiente && b.convertedAt && (
          <p className="text-xs text-green-600 mt-1.5">
            Convertido el {formatDateTime(b.convertedAt)} por {b.convertedBy}
          </p>
        )}
      </div>
      {isPendiente && (
        <div className="px-4 pb-3">
          <button onClick={() => onEdit(b)}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors">
            <Pencil size={12} />Editar borrador
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal exportado ──────────────────────────────────────────

export default function BorradorSheet({ user }) {
  const { borradores, isLoading, addBorrador, updateBorrador } = useBorradores(user, { onlyMine: true });

  const [open,      setOpen]      = useState(false);
  const [editing,   setEditing]   = useState(null); // borrador object o null
  const [showAll,   setShowAll]   = useState(false);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') closeSheet(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const openNew  = ()  => { setEditing(null); setOpen(true); };
  const openEdit = (b) => { setEditing(b); setOpen(true); };
  const closeSheet = () => { setOpen(false); setEditing(null); };

  const handleSave = async (data) => {
    if (editing) {
      return await updateBorrador(editing.id, data);
    }
    return await addBorrador(data);
  };

  const pendientes   = borradores.filter(b => b.status === 'Pendiente');
  const convertidos  = borradores.filter(b => b.status === 'Convertido');
  const recentConv   = convertidos.slice(0, 3);
  const shown        = showAll ? borradores : [...pendientes, ...recentConv];

  return (
    <>
      {/* ── Lista de borradores propios ── */}
      {borradores.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Mis borradores
            </p>
            {convertidos.length > 3 && (
              <button onClick={() => setShowAll(v => !v)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                {showAll ? 'Ver menos' : `Ver todos (${borradores.length})`}
                <ChevronDown size={12} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          <div className="space-y-3">
            {shown.map(b => (
              <BorradorCard key={b.id} b={b} onEdit={openEdit} />
            ))}
          </div>
          {pendientes.length === 0 && convertidos.length > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
              <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
              <p className="text-xs text-green-700 font-medium">Todos tus borradores fueron procesados</p>
            </div>
          )}
        </div>
      )}

      {/* ── FAB ── */}
      <button
        onClick={openNew}
        className="fixed z-40 w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center transition-transform active:scale-95"
        style={{
          bottom: '84px', right: '16px',
          background: 'linear-gradient(135deg, #D61672, #FFA901)',
          boxShadow: '0 4px 20px rgba(214,22,114,0.45)',
        }}
        title="Registrar borrador de visita"
      >
        <Plus size={26} />
      </button>

      {/* ── Bottom Sheet ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={closeSheet}
          />

          {/* Panel */}
          <div
            className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: '92vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 flex-shrink-0" />

            <BorradorForm
              initial={editing ? {
                clientName:    editing.clientName    || '',
                clientIdNumber:editing.clientIdNumber|| '',
                clientAddress: editing.clientAddress || '',
                clientPhone:   editing.clientPhone   || '',
                clientEmail:   editing.clientEmail   || '',
                scheduledDate: editing.scheduledDate || localToday(),
                scheduledTime: editing.scheduledTime || '',
                motivo:        editing.motivo        || '',
              } : null}
              onSave={handleSave}
              onClose={closeSheet}
              isEdit={!!editing}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </>
  );
}
