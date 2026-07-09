import { useState, useMemo, useRef, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  Search, Plus, Pencil, UserX, UserCheck, X,
  CheckCircle, Loader2, Upload, Download, FileText, Users, Phone,
  MapPin, CreditCard, Filter, Wrench, ExternalLink, Navigation,
  ChevronDown, ChevronUp, Trash2, Clipboard, CalendarDays,
  Eye, EyeOff, Columns3,
} from 'lucide-react';
import Pagination from './Pagination.jsx';
import { usePagination } from '../hooks/usePagination.js';
import ClientImportModal from './ClientImportModal.jsx';
import ClientHistorialModal from './ClientHistorialModal.jsx';
import { emptyContact, emptyInstallation, getClientContacts } from '../hooks/useClients.js';
import { exportCSV, exportExcel } from '../services/exportService.js';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

// Columnas de la vista de tabla — TODOS los campos del cliente (a diferencia del
// reporte exportado, que sí es configurable vía useExportConfig.js/getActiveColumns).
const TABLE_COLUMNS = [
  { key: 'nombre',      label: 'Nombre' },
  { key: 'ruc',         label: 'RUC' },
  { key: 'extranjero',  label: 'Extranjero' },
  { key: 'ubicacion',   label: 'Ubicación' },
  { key: 'ciudad',      label: 'Ciudad' },
  { key: 'direccion',   label: 'Dirección' },
  { key: 'telefono',    label: 'Teléfono' },
  { key: 'email',       label: 'Email' },
  { key: 'mapsLink',    label: 'Link Maps' },
  { key: 'referencia',  label: 'Referencia' },
  { key: 'equipo',      label: 'Equipo' },
  { key: 'observacion', label: 'Observación' },
];

// Aplana clientes → una fila por ubicación/instalación (mismo grano que el Excel
// de importación: cada equipo/observación de cada ubicación es su propia fila).
// Cada fila incluye referencias de identidad (clientId/contactId/installationId +
// rowKey estable) para poder editar/guardar esa fila puntual desde la tabla.
function flattenClientsForExport(clients) {
  const rows = [];
  clients.forEach(client => {
    const clientId   = client.id;
    const ruc        = client.identification || client.id || '';
    const nombre     = client.name || '';
    const extranjero = client.foreign ? 'Sí' : 'No';
    const contacts   = getClientContacts(client);

    if (contacts.length === 0) {
      rows.push({
        clientId, contactId: null, installationId: null, rowKey: `${clientId}::nc::ni`,
        ruc, nombre, extranjero,
        ubicacion: '', ciudad: '', direccion: '', telefono: '', email: '',
        mapsLink: '', referencia: '', equipo: '', observacion: '',
      });
      return;
    }

    contacts.forEach(contact => {
      const base = {
        clientId, contactId: contact.id,
        ruc, nombre, extranjero,
        ubicacion:  contact.ubicacion  || '',
        ciudad:     contact.ciudad     || '',
        direccion:  contact.address    || '',
        telefono:   contact.phone      || '',
        email:      contact.email      || '',
        mapsLink:   contact.mapsLink   || '',
        referencia: contact.referencia || '',
      };
      const installations = contact.installations || [];
      if (installations.length === 0) {
        rows.push({ ...base, installationId: null, rowKey: `${clientId}::${contact.id}::ni`, equipo: '', observacion: '' });
      } else {
        installations.forEach(inst => {
          rows.push({
            ...base, installationId: inst.id, rowKey: `${clientId}::${contact.id}::${inst.id}`,
            equipo: inst.serviceType || '', observacion: inst.observacion || '',
          });
        });
      }
    });
  });
  return rows;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Reporte de clientes en PDF (HTML imprimible en ventana nueva) ───────────
// Mismo patrón ya usado en el resto de la app (generateVisitPDF/generateReceipt):
// sin librería nueva, se abre una ventana con estilos de impresión y el usuario
// usa "Guardar como PDF" desde el diálogo de impresión del navegador.
function printClientsReportPDF(rows, empresaConfig, columns) {
  const cfg       = empresaConfig || {};
  const logoSrc   = cfg.logoUrl || `${window.location.origin}/logo.png`;
  const nombreEmp = cfg.empresaNombre || 'ACONTPLUS';
  const sloganEmp = cfg.empresaSlogan || 'Recordatorios';
  const rucEmp    = cfg.ruc || '';
  const fecha     = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de clientes</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:10px;color:#1e293b;background:#fff}
    .page{padding:24px}
    .header{display:flex;justify-content:space-between;align-items:center;
            margin-bottom:14px;padding-bottom:10px;border-bottom:3px solid #D61672}
    .header-brand{display:flex;align-items:center;gap:8px}
    .header-brand img{width:36px;height:36px;object-fit:contain}
    .header-brand h1{font-size:14px;font-weight:bold;color:#D61672}
    .header-brand p{font-size:9px;color:#FFA901;font-weight:bold}
    .header-brand small{font-size:8px;color:#94a3b8;display:block}
    .header-right{text-align:right;font-size:9px;color:#64748b}
    table{width:100%;border-collapse:collapse}
    th{background:#D61672;color:#fff;text-align:left;padding:5px 6px;font-size:9px;white-space:nowrap}
    td{padding:4px 6px;border-bottom:1px solid #e2e8f0;font-size:9px}
    tr:nth-child(even) td{background:#f8fafc}
    .footer{margin-top:10px;font-size:8px;color:#94a3b8;text-align:right}
    @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.page{padding:12px}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-brand">
      <img src="${logoSrc}" alt="${escapeHtml(nombreEmp)}"/>
      <div>
        <h1>${escapeHtml(nombreEmp)}</h1><p>${escapeHtml(sloganEmp)}</p>
        ${rucEmp ? `<small>RUC: ${escapeHtml(rucEmp)}</small>` : ''}
      </div>
    </div>
    <div class="header-right">
      <div><strong>Reporte de clientes</strong></div>
      <div>${rows.length} registro${rows.length !== 1 ? 's' : ''}</div>
      <div>Generado: ${fecha}</div>
    </div>
  </div>
  <table>
    <thead><tr>${columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${columns.map(c => `<td>${escapeHtml(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
  <div class="footer">${escapeHtml(nombreEmp)} ${escapeHtml(sloganEmp)}</div>
</div>
</body>
</html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
}

// ─── Selector de tipo de equipo/instalación/servicio con botón "+" ───────────
function ServiceTypeSelector({ value, onChange, serviceTypes, onAdd }) {
  const [adding,   setAdding]   = useState(false);
  const [newName,  setNewName]  = useState('');
  const [saving,   setSaving]   = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const ok = await onAdd({ name: newName.trim(), description: '' });
    if (ok) {
      onChange(newName.trim());
      setNewName('');
      setAdding(false);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-1.5">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400 bg-white"
        >
          <option value="">— Seleccionar tipo —</option>
          {serviceTypes.map(st => (
            <option key={st.id} value={st.name}>{st.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { setAdding(p => !p); setNewName(''); }}
          title="Crear nuevo tipo"
          className="flex-shrink-0 px-2 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors text-xs font-bold"
        >
          <Plus size={12} />
        </button>
      </div>
      {adding && (
        <div className="flex gap-1.5 items-center">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } if (e.key === 'Escape') setAdding(false); }}
            placeholder="Nombre del tipo..."
            className="flex-1 border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 bg-white"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !newName.trim()}
            className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '...' : 'Crear'}
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 text-xs"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Formulario inline crear / editar ─────────────────────────────────────────
export function ClientForm({ initial, onSave, onCancel, isLoading, existingIds, allClients, onActivateExisting, noBorder = false }) {
  const isEdit       = !!initial;
  const serviceTypes  = useAppStore(s => s.serviceTypes);
  const addServiceType = useAppStore(s => s.addServiceType);

  const [form, setForm] = useState({
    name:           initial?.name           || '',
    identification: initial?.identification || '',
    foreign:        initial?.foreign        ?? false,
  });
  const [errors,   setErrors]   = useState({});
  const [contacts, setContacts] = useState(() => {
    const existing = getClientContacts(initial || {});
    return existing.length > 0
      ? existing.map(c => ({
          id:            c.id            || crypto.randomUUID(),
          ubicacion:     c.ubicacion     || '',
          ciudad:        c.ciudad        || '',
          address:       c.address       || '',
          phone:         c.phone         || '',
          email:         c.email         || '',
          mapsLink:      c.mapsLink      || '',
          referencia:    c.referencia    || '',
          installations: (c.installations || []).map(inst => ({
            id:          inst.id          || crypto.randomUUID(),
            serviceType: inst.serviceType || '',
            observacion: inst.observacion || '',
          })),
        }))
      : [emptyContact()];
  });
  // Acordeón: el primer contacto siempre arranca expandido para que el usuario vea sus datos.
  const [expandedContacts, setExpandedContacts] = useState(() => new Set([0]));
  const toggleContact = (idx) =>
    setExpandedContacts(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });

  const validate = () => {
    const errs  = {};
    const newId = form.identification.replace(/\s/g, '');
    const oldId = initial?.identification?.replace(/\s/g, '') || '';
    const idChanged = newId !== oldId;

    if (!form.name.trim())
      errs.name = 'El nombre es obligatorio';

    if (!form.identification.trim()) {
      errs.identification = 'La cédula/RUC o pasaporte es obligatorio';
    } else if (existingIds.has(newId) && newId !== oldId) {
      const dup = allClients?.find(c => c.identification?.replace(/\s/g, '') === newId);
      errs.identification = dup?.active === false
        ? '__INACTIVE__:' + (dup.id)
        : 'Ya existe un cliente activo con este documento';
    } else if (!form.foreign && (!isEdit || idChanged)) {
      const digits = newId;
      if (!/^\d+$/.test(digits))
        errs.identification = 'Solo se permiten números para clientes nacionales';
      else if (digits.length !== 10 && digits.length !== 13)
        errs.identification = 'Debe tener 10 dígitos (cédula) o 13 dígitos (RUC)';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    await onSave({ ...form, contacts });
  };

  const addContact = () => {
    setContacts(prev => [emptyContact(), ...prev]);
    setExpandedContacts(prev => {
      const next = new Set([0]);
      prev.forEach(i => next.add(i + 1));
      return next;
    });
  };
  const removeContact = (idx) => {
    setContacts(prev => prev.filter((_, i) => i !== idx));
    setExpandedContacts(prev => {
      const next = new Set();
      prev.forEach(i => { if (i < idx) next.add(i); else if (i > idx) next.add(i - 1); });
      return next;
    });
  };
  const setContactField = (idx, field, value) =>
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));

  const addInstallation = (contactIdx) =>
    setContacts(prev => prev.map((c, i) =>
      i === contactIdx ? { ...c, installations: [...(c.installations || []), emptyInstallation()] } : c
    ));
  const removeInstallation = (contactIdx, instIdx) =>
    setContacts(prev => prev.map((c, i) =>
      i === contactIdx ? { ...c, installations: (c.installations || []).filter((_, j) => j !== instIdx) } : c
    ));
  const setInstField = (contactIdx, instIdx, field, value) =>
    setContacts(prev => prev.map((c, i) =>
      i === contactIdx
        ? { ...c, installations: (c.installations || []).map((inst, j) =>
            j === instIdx ? { ...inst, [field]: value } : inst) }
        : c
    ));

  const inp = (err) =>
    `w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors ${
      err ? 'border-red-400' : 'border-slate-200 focus:border-pink-400'
    }`;
  const lbl = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

  return (
    <form onSubmit={handleSubmit}
      className={noBorder ? 'space-y-4' : 'bg-pink-50 border-2 border-pink-200 rounded-2xl p-5 mb-4 space-y-4'}>
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D61672' }}>
        {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
      </p>

      {/* ── Fila 1: Toggle + Cédula/RUC ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <button type="button"
            onClick={() => {
              setForm(p => ({ ...p, foreign: !p.foreign, identification: '' }));
              setErrors(p => ({ ...p, identification: '' }));
            }}
            disabled={isEdit}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
              form.foreign ? 'bg-blue-500' : 'bg-slate-200'
            } ${isEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              form.foreign ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-800 truncate">🌐 Extranjero</p>
            <p className="text-xs text-blue-600 leading-tight">
              {form.foreign ? 'Pasaporte / doc. extranjero' : '10 o 13 dígitos'}
            </p>
          </div>
        </div>

        <div>
          <label className={lbl}>
            {form.foreign ? 'Pasaporte / ID' : 'Cédula / RUC'} <span className="text-red-400">*</span>
          </label>
          <input
            type={form.foreign ? 'text' : 'tel'}
            value={form.identification}
            onChange={e => {
              const val = form.foreign ? e.target.value : e.target.value.replace(/\D/g, '');
              setForm(p => ({ ...p, identification: val }));
              setErrors(p => ({ ...p, identification: '' }));
            }}
            placeholder={form.foreign ? 'Pasaporte...' : 'Ej: 1712345678'}
            className={`${inp(errors.identification)} font-mono`}
            maxLength={form.foreign ? 30 : 13}
            autoFocus={!initial}
          />
          {errors.identification && (
            errors.identification.startsWith('__INACTIVE__:')
              ? (
                <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium mb-1.5">
                    ⚠️ Este cliente existe pero está <strong>inactivo</strong>.
                  </p>
                  <button type="button"
                    onClick={() => onActivateExisting(errors.identification.split(':')[1])}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">
                    Reactivar cliente
                  </button>
                </div>
              )
              : <p className="text-xs text-red-500 mt-1">⚠️ {errors.identification}</p>
          )}
        </div>
      </div>

      {/* ── Fila 2: Nombre ── */}
      <div>
        <label className={lbl}>Nombre <span className="text-red-400">*</span></label>
        <input type="text" value={form.name} autoFocus={!!initial}
          onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })); }}
          placeholder="Nombre completo o razón social"
          className={inp(errors.name)} />
        {errors.name && <p className="text-xs text-red-500 mt-1">⚠️ {errors.name}</p>}
      </div>

      {/* ── Sección Contactos / Ubicaciones ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Ubicaciones / Contactos
          </p>
          <button type="button" onClick={addContact}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg text-white"
            style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
            <Plus size={11} /> Agregar
          </button>
        </div>

        {contacts.map((contact, idx) => {
          const isExpanded = expandedContacts.has(idx);
          const summary = [contact.ubicacion, contact.ciudad].filter(Boolean).join(' · ')
            || contact.address
            || 'Sin datos de ubicación';
          return (
            <div key={contact.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">

              {/* ── Cabecera colapsable ── */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button type="button" onClick={() => toggleContact(idx)}
                  className="flex-1 flex items-center gap-2 text-left min-w-0">
                  <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <MapPin size={11} className="text-pink-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{summary}</p>
                    {contact.phone && !isExpanded && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone size={9} />{contact.phone}
                        {contact.referencia && <span className="ml-1 italic truncate">· {contact.referencia}</span>}
                      </p>
                    )}
                  </div>
                  {isExpanded
                    ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
                    : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
                </button>

                {/* Botón eliminar */}
                <button type="button"
                  onClick={() => removeContact(idx)}
                  disabled={contacts.length === 1}
                  title={contacts.length === 1 ? 'Debe haber al menos una ubicación' : 'Eliminar ubicación'}
                  className="flex-shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <Trash2 size={13} />
                </button>
              </div>

              {/* ── Campos expandidos ── */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2.5 border-t border-slate-100 pt-2.5">

                  {/* Ubicación + Ciudad */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className={lbl}>Ubicación / Sector</label>
                      <input type="text" value={contact.ubicacion}
                        onChange={e => setContactField(idx, 'ubicacion', e.target.value)}
                        placeholder="Sector, barrio, referencia..."
                        className={inp(false)} />
                    </div>
                    <div>
                      <label className={lbl}>Ciudad</label>
                      <input type="text" value={contact.ciudad}
                        onChange={e => setContactField(idx, 'ciudad', e.target.value)}
                        placeholder="Quito, Coca..."
                        className={inp(false)} />
                    </div>
                  </div>

                  {/* Dirección */}
                  <div>
                    <label className={lbl}>Dirección</label>
                    <input type="text" value={contact.address}
                      onChange={e => setContactField(idx, 'address', e.target.value)}
                      placeholder="Calle, número, edificio..."
                      className={inp(false)} />
                  </div>

                  {/* Teléfono + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className={lbl}>Teléfono</label>
                      <input type="tel" value={contact.phone}
                        onChange={e => setContactField(idx, 'phone', e.target.value)}
                        placeholder="0991234567"
                        className={inp(false)} />
                    </div>
                    <div>
                      <label className={lbl}>Email</label>
                      <input type="email" value={contact.email}
                        onChange={e => setContactField(idx, 'email', e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className={inp(false)} />
                    </div>
                  </div>

                  {/* Referencia */}
                  <div>
                    <label className={lbl}>Referencia</label>
                    <input type="text" value={contact.referencia}
                      onChange={e => setContactField(idx, 'referencia', e.target.value)}
                      placeholder="Frente al parque, junto a la farmacia..."
                      className={inp(false)} />
                  </div>

                  {/* Google Maps */}
                  <div>
                    <label className={lbl}>Google Maps</label>
                    {/* Campo URL — fila completa en móvil, inline en escritorio */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input type="url" value={contact.mapsLink}
                        onChange={e => setContactField(idx, 'mapsLink', e.target.value)}
                        placeholder="Pega aquí el link de Google Maps..."
                        className={`w-full sm:flex-1 ${inp(false)}`} />

                      {/* Botones: en móvil van debajo del campo, en escritorio inline */}
                      <div className="flex gap-2">
                        {/* Abrir Maps */}
                        <button type="button"
                          title="Abrir Google Maps con mi ubicación actual"
                          onClick={() => {
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                pos => window.open(
                                  `https://www.google.com/maps/@${pos.coords.latitude},${pos.coords.longitude},17z`,
                                  '_blank'
                                ),
                                () => window.open('https://www.google.com/maps', '_blank')
                              );
                            } else {
                              window.open('https://www.google.com/maps', '_blank');
                            }
                          }}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-xs font-bold">
                          <Navigation size={13} /> Abrir Maps
                        </button>

                        {/* Pegar desde portapapeles */}
                        <button type="button"
                          title="Pegar link del portapapeles"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text) setContactField(idx, 'mapsLink', text.trim());
                            } catch {
                              // Permiso denegado o sin soporte — no hacer nada
                            }
                          }}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-xs font-bold">
                          <Clipboard size={13} /> Pegar
                        </button>

                        {/* Ver enlace guardado */}
                        {contact.mapsLink && (
                          <a href={contact.mapsLink} target="_blank" rel="noopener noreferrer"
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition-colors text-xs font-bold">
                            <ExternalLink size={13} /> Ver
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Abre Maps, busca la dirección, comparte la ubicación y pega el enlace aquí.
                    </p>
                  </div>

                  {/* ── Equipo / Instalación ── */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">⚙️ Equipo / Instalación / Servicio</p>
                      <button type="button" onClick={() => addInstallation(idx)}
                        className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">
                        <Plus size={10} /> Agregar
                      </button>
                    </div>
                    {(contact.installations || []).length === 0 && (
                      <p className="text-xs text-slate-300 italic">Sin equipos/instalaciones registrados</p>
                    )}
                    {(contact.installations || []).map((inst, instIdx) => (
                      <div key={inst.id}
                        className="flex items-start gap-2 mb-2 p-2 bg-amber-50/60 border border-amber-100 rounded-lg">
                        <div className="flex-1 space-y-1.5">
                          <div>
                            <p className="text-xs text-amber-700 font-semibold mb-1">Tipo de Equipo / Instalación / Servicio</p>
                            <ServiceTypeSelector
                              value={inst.serviceType}
                              onChange={v => setInstField(idx, instIdx, 'serviceType', v)}
                              serviceTypes={serviceTypes}
                              onAdd={addServiceType}
                            />
                          </div>
                          <input value={inst.observacion}
                            onChange={e => setInstField(idx, instIdx, 'observacion', e.target.value)}
                            placeholder="Observación (capacidad, marca, modelo...)"
                            className="w-full border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400 bg-white" />
                        </div>
                        <button type="button" onClick={() => removeInstallation(idx, instIdx)}
                          className="mt-1 p-0.5 rounded text-amber-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Botones ── */}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-white font-bold rounded-xl text-sm disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          {isLoading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear cliente'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Menú de acciones por cliente ────────────────────────────────────────────
function ActionsMenu({ client, visitCount, onNewVisit, onEdit, onToggleActive, onDelete, isAdmin, isLoading, wrapperClassName = 'relative mt-2' }) {
  const [open,           setOpen]           = useState(false);
  const [confirming,     setConfirming]     = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setConfirming(false);
        setConfirmingDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className={wrapperClassName} ref={menuRef}>
      <button
        onClick={() => { setOpen(p => !p); setConfirming(false); setConfirmingDelete(false); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
        Acciones <ChevronDown size={11} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-40 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[160px] py-1 overflow-hidden">

          {/* Nueva visita */}
          <button
            onClick={() => { onNewVisit(client); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 transition-colors">
            <Wrench size={12} className="text-pink-500" /> Nueva visita
          </button>

          {/* Editar */}
          <button
            onClick={() => { onEdit(client); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 transition-colors">
            <Pencil size={12} className="text-blue-500" /> Editar
          </button>

          <div className="border-t border-slate-100 my-1" />

          {/* Inactivar / Activar con confirmación */}
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                client.active !== false
                  ? 'text-orange-600 hover:bg-orange-50'
                  : 'text-green-600 hover:bg-green-50'
              }`}>
              {client.active !== false
                ? <><UserX size={12} /> Inactivar</>
                : <><UserCheck size={12} /> Activar</>}
            </button>
          ) : (
            <div className="px-3 py-2.5">
              <p className="text-xs text-slate-600 font-medium mb-2">
                {client.active !== false
                  ? '¿Inactivar este cliente?'
                  : '¿Activar este cliente?'}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={async () => {
                    await onToggleActive(client);
                    setOpen(false);
                    setConfirming(false);
                  }}
                  disabled={isLoading}
                  className="flex-1 px-2 py-1 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors">
                  {isLoading ? '...' : 'Confirmar'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Eliminar — solo panel de administrador */}
          {isAdmin && (
            <>
              <div className="border-t border-slate-100 my-1" />
              {!confirmingDelete ? (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 size={12} /> Eliminar
                </button>
              ) : (
                <div className="px-3 py-2.5">
                  <p className="text-xs text-slate-600 font-medium mb-1">
                    ¿Eliminar definitivamente a {client.name}?
                  </p>
                  {visitCount > 0 && (
                    <p className="text-xs text-amber-600 mb-2">
                      Tiene {visitCount} visita{visitCount !== 1 ? 's' : ''} registrada{visitCount !== 1 ? 's' : ''} que quedará{visitCount !== 1 ? 'n' : ''} sin cliente asociado.
                    </p>
                  )}
                  <div className="flex gap-1.5">
                    <button
                      onClick={async () => {
                        await onDelete(client);
                        setOpen(false);
                        setConfirmingDelete(false);
                      }}
                      disabled={isLoading}
                      className="flex-1 px-2 py-1 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                      {isLoading ? '...' : 'Eliminar'}
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      className="flex-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Fila de cliente ───────────────────────────────────────────────────────────
function ClientRow({ client, visitCount, onEdit, onToggleActive, onDelete, isAdmin, isLoading, onNewVisit, onHistorial }) {
  const contacts   = getClientContacts(client);
  const rowCount   = Math.max(contacts.length, 1);
  const inactiveCls = !client.active ? 'opacity-60' : '';

  // Celda Cliente con rowSpan para abarcar todas las filas de ubicación
  const clientCell = (
    <td className="px-4 py-3 w-56 align-top border-r border-slate-100" rowSpan={rowCount}>
      <div className="flex items-start gap-2">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${client.active ? 'bg-green-400' : 'bg-slate-300'}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold text-slate-800 leading-snug">{client.name}</p>
            {client.foreign && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                🌐 Ext.
              </span>
            )}
          </div>
          {client.identification && (
            <div className="flex items-center gap-1 mt-0.5">
              <CreditCard size={10} className="text-slate-400" />
              <span className="text-xs font-mono text-slate-500">{client.identification}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              visitCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
            }`}>
              {visitCount} visita{visitCount !== 1 ? 's' : ''}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              client.active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {client.active !== false ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <button
              onClick={() => onHistorial(client)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors border border-purple-100">
              <CalendarDays size={12} /> Calendario
            </button>
          </div>
          <ActionsMenu
            client={client}
            visitCount={visitCount}
            onNewVisit={onNewVisit}
            onEdit={onEdit}
            onToggleActive={onToggleActive}
            onDelete={onDelete}
            isAdmin={isAdmin}
            isLoading={isLoading}
          />
        </div>
      </div>
    </td>
  );

  // Sin ubicaciones: una sola fila
  if (contacts.length === 0) {
    return (
      <tr className={`hover:bg-slate-50 transition-colors ${inactiveCls}`}>
        {clientCell}
        <td className="px-4 py-3 align-top">
          <span className="text-slate-300 text-xs">Sin ubicaciones</span>
        </td>
        <td className="px-4 py-3 align-top">
          <span className="text-slate-300 text-xs">—</span>
        </td>
      </tr>
    );
  }

  // Una fila por cada ubicación — el cliente abarca todas con rowSpan
  return (
    <>
      {contacts.map((c, i) => (
        <tr key={c.id}
          className={`hover:bg-slate-50 transition-colors ${inactiveCls}`}>

          {/* Celda cliente solo en la primera fila */}
          {i === 0 && clientCell}

          {/* ── Ubicación ── */}
          <td className="px-4 py-3 align-top text-xs">
            {(c.ubicacion || c.ciudad) && (
              <p className="font-semibold text-slate-700 flex items-center gap-1 mb-0.5">
                <MapPin size={10} className="text-pink-400 flex-shrink-0" />
                {[c.ubicacion, c.ciudad].filter(Boolean).join(' · ')}
              </p>
            )}
            {c.address && <p className="text-slate-500 ml-3.5">{c.address}</p>}
            {(c.phone || c.email) && (
              <div className="flex flex-wrap gap-x-3 ml-3.5 mt-0.5 text-slate-500">
                {c.phone && (
                  <span className="flex items-center gap-0.5">
                    <Phone size={9} className="text-slate-400" />{c.phone}
                  </span>
                )}
                {c.email && <span className="truncate max-w-[180px]">{c.email}</span>}
              </div>
            )}
            {c.referencia && (
              <p className="text-slate-400 italic ml-3.5 mt-0.5 truncate max-w-xs" title={c.referencia}>
                📍 {c.referencia}
              </p>
            )}
            {c.mapsLink && (
              <div className="ml-3.5 mt-1">
                <a href={c.mapsLink} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-0.5 text-blue-500 hover:text-blue-700 font-medium">
                  <ExternalLink size={9} /> Ver en Maps
                </a>
              </div>
            )}
          </td>

          {/* ── Equipos de esta ubicación ── */}
          <td className="px-4 py-3 align-top text-xs">
            {(c.installations || []).length === 0 ? (
              <span className="text-slate-300">—</span>
            ) : (
              <div className="space-y-0.5">
                {c.installations.map((inst, ii) => (
                  <div key={inst.id ?? ii} className="flex items-start gap-1 text-amber-700">
                    <Wrench size={9} className="flex-shrink-0 mt-0.5" />
                    <span className="font-medium">
                      {inst.serviceType || 'Sin tipo'}
                      {inst.observacion
                        ? <span className="text-slate-400 font-normal"> — {inst.observacion}</span>
                        : null}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ClientsManager({ clients, tasks, useClientsHook, pendingClientHistorial, onClearPendingHistorial }) {
  const { createClient, updateClient, setClientActive, deleteClient, importClients } = useClientsHook;
  const openNewVisitModal = useAppStore(s => s.openNewVisitModal);
  const visits            = useAppStore(s => s.visits);
  const addToast          = useAppStore(s => s.addToast);
  const userRole          = useAppStore(s => s.userRole);
  const isAdmin           = userRole === 'admin';
  const serviceTypes      = useAppStore(s => s.serviceTypes);
  const empresaConfig     = useAppStore(s => s.empresaConfig);
  const getActiveColumns  = useAppStore(s => s.getActiveColumns);
  const setShowExportConfig = useAppStore(s => s.setShowExportConfig);
  const user                = useAppStore(s => s.user);

  const [search,         setSearch]         = useState('');
  const [searchField,    setSearchField]    = useState('nombre');
  const [showInactive,   setShowInactive]   = useState(false);
  const [showForm,       setShowForm]       = useState(false);
  const [editing,        setEditing]        = useState(null);
  const [isLoading,      setIsLoading]      = useState(false);
  const [showImport,     setShowImport]     = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  // Columnas visibles EN PANTALLA en la vista Tabla — independiente de las columnas
  // del reporte exportado (getActiveColumns('clients')); se persiste en Firestore
  // (doc propio dentro de export_config, no comparte el doc "columns" de la
  // config de exportación).
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState(() => new Set());
  const [historialClient, setHistorialClient] = useState(null);

  useEffect(() => {
    if (!user) return;
    // Reutiliza la colección export_config (ya permitida en firestore.rules para
    // cualquier miembro del tenant) con un doc propio, en vez de crear una colección
    // nueva que requeriría desplegar reglas de Firestore por separado.
    const docRef = doc(getCollectionRef('export_config'), 'clients_table_columns');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setHiddenColumnKeys(new Set(snap.data().hiddenColumns || []));
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!pendingClientHistorial) return;
    const c = clients.find(cl => cl.id === pendingClientHistorial);
    if (c) setHistorialClient(c);
    onClearPendingHistorial?.();
  }, [pendingClientHistorial, clients, onClearPendingHistorial]);

  const existingIds = useMemo(() =>
    new Set(clients.map(c => c.identification?.replace(/\s/g, ''))),
    [clients]
  );

  const visitCountMap = useMemo(() => {
    const map = {};
    visits.forEach(v => {
      if (v.clientId) map[v.clientId] = (map[v.clientId] || 0) + 1;
    });
    return map;
  }, [visits]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients
      .filter(c => showInactive ? c.active === false : c.active !== false)
      .filter(c => {
        if (!q) return true;
        const contacts = getClientContacts(c);
        switch (searchField) {
          case 'nombre':
            return c.name?.toLowerCase().includes(q);
          case 'cedula':
            return c.identification?.toLowerCase().includes(q);
          case 'ubicacion':
            return contacts.some(ct => ct.ubicacion?.toLowerCase().includes(q));
          case 'ciudad':
            return contacts.some(ct => ct.ciudad?.toLowerCase().includes(q));
          case 'direccion':
            return contacts.some(ct => ct.address?.toLowerCase().includes(q));
          case 'telefono':
            return contacts.some(ct => ct.phone?.toLowerCase().includes(q));
          case 'email':
            return contacts.some(ct => ct.email?.toLowerCase().includes(q));
          case 'equipo':
            // q viene de un desplegable con los tipos de equipo registrados —
            // comparación exacta, no parcial.
            return contacts.some(ct => (ct.installations || [])
              .some(inst => inst.serviceType?.toLowerCase() === q));
          case 'observacion':
            return contacts.some(ct => (ct.installations || [])
              .some(inst => inst.observacion?.toLowerCase().includes(q)));
          default:
            return c.name?.toLowerCase().includes(q);
        }
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [clients, search, searchField, showInactive]);

  const [pageSize, setPageSize] = useState(25);
  const pagination = usePagination(filtered, pageSize);

  // ─── Vista de tabla plana (una fila por ubicación, ordenable) ───────────────
  const [viewMode,   setViewMode]   = useState('table'); // 'cards' | 'table'
  const [sortLevels, setSortLevels] = useState([{ field: 'nombre', dir: 'asc' }]); // [{ field, dir }], hasta 3

  const toggleSort = (field) => {
    setSortLevels(prev => {
      const idx = prev.findIndex(s => s.field === field);
      if (idx === -1) {
        if (prev.length >= 3) return prev; // máximo 3 niveles
        return [...prev, { field, dir: 'asc' }];
      }
      const level = prev[idx];
      if (level.dir === 'asc') {
        return prev.map((s, i) => i === idx ? { ...s, dir: 'desc' } : s);
      }
      return prev.filter((_, i) => i !== idx); // desc -> quitar del orden
    });
  };
  const clearSort = () => setSortLevels([]);

  const saveHiddenColumns = (nextSet) => {
    if (!user) return;
    setDoc(doc(getCollectionRef('export_config'), 'clients_table_columns'),
      { hiddenColumns: [...nextSet] }, { merge: true }
    ).catch(e => console.error('Error guardando columnas de tabla:', e));
  };

  const toggleColumnVisibility = (key) => {
    setHiddenColumnKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      saveHiddenColumns(next);
      return next;
    });
  };
  // Nombre queda "congelada" (sticky) a la izquierda al hacer scroll horizontal,
  // para saber a quién corresponde la fila que se está viendo.
  const FROZEN_COLUMN_LEFT = { nombre: 0 };
  const FROZEN_COLUMN_WIDTH = { nombre: 160 };
  const getFrozenStyle = (key) => FROZEN_COLUMN_LEFT[key] !== undefined
    ? { position: 'sticky', left: FROZEN_COLUMN_LEFT[key], width: FROZEN_COLUMN_WIDTH[key], minWidth: FROZEN_COLUMN_WIDTH[key] }
    : undefined;

  const visibleTableColumns = useMemo(
    () => TABLE_COLUMNS.filter(c => !hiddenColumnKeys.has(c.key)),
    [hiddenColumnKeys]
  );

  // Navegación tipo hoja de cálculo entre celdas (modo lectura): las flechas mueven
  // el foco a la celda vecina dentro de <tbody>; Tab/Shift+Tab ya funciona solo con
  // tabIndex=0 (orden natural del DOM), no necesita manejo aparte.
  const handleCellKeyDown = (e) => {
    const { key } = e;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return;
    e.preventDefault();
    const cell = e.currentTarget;
    const row  = cell.parentElement;
    const body = row.parentElement;
    const rowIdx = Array.prototype.indexOf.call(body.children, row);
    const colIdx = Array.prototype.indexOf.call(row.children, cell);
    let targetRow = rowIdx, targetCol = colIdx;
    if (key === 'ArrowUp')    targetRow -= 1;
    if (key === 'ArrowDown')  targetRow += 1;
    if (key === 'ArrowLeft')  targetCol -= 1;
    if (key === 'ArrowRight') targetCol += 1;
    const nextRow  = body.children[targetRow];
    const nextCell = nextRow?.children[targetCol];
    nextCell?.focus();
  };

  // La vista de tabla filtra CADA FILA (ubicación) individualmente, no el cliente
  // completo — si no, una fila de "Lago Agrio" aparecía solo porque ese mismo
  // cliente tenía OTRA ubicación en "Coca" que sí coincidía con la búsqueda.
  const tableRows = useMemo(() => {
    const activeClients = clients.filter(c => showInactive ? c.active === false : c.active !== false);
    const allRows = flattenClientsForExport(activeClients);
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(row => {
      switch (searchField) {
        case 'nombre':      return row.nombre.toLowerCase().includes(q);
        case 'cedula':      return row.ruc.toLowerCase().includes(q);
        case 'ubicacion':   return row.ubicacion.toLowerCase().includes(q);
        case 'ciudad':      return row.ciudad.toLowerCase().includes(q);
        case 'direccion':   return row.direccion.toLowerCase().includes(q);
        case 'telefono':    return row.telefono.toLowerCase().includes(q);
        case 'email':       return row.email.toLowerCase().includes(q);
        case 'equipo':      return row.equipo.toLowerCase() === q;
        case 'observacion': return row.observacion.toLowerCase().includes(q);
        default:            return row.nombre.toLowerCase().includes(q);
      }
    });
  }, [clients, showInactive, search, searchField]);
  const sortedTableRows = useMemo(() => {
    if (sortLevels.length === 0) return tableRows;
    return [...tableRows].sort((a, b) => {
      for (const { field, dir } of sortLevels) {
        const av = (a[field] || '').toString().toLowerCase();
        const bv = (b[field] || '').toString().toLowerCase();
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [tableRows, sortLevels]);
  const tablePagination = usePagination(sortedTableRows, pageSize);

  // ─── Edición inline de la tabla (Guardar/Deshacer por fila, nunca automático) ──
  const [editMode,     setEditMode]     = useState(false);
  const [pendingEdits, setPendingEdits] = useState({}); // { [rowKey]: { [field]: valor } }
  const [savingRows,   setSavingRows]   = useState(new Set());
  const tableScrollRef = useRef(null);

  const confirmDiscardPendingEdits = () => {
    if (Object.keys(pendingEdits).length === 0) return true;
    const ok = window.confirm('Tienes cambios sin guardar en la tabla. ¿Continuar de todas formas? Se perderán.');
    if (ok) setPendingEdits({});
    return ok;
  };

  const toggleEditMode = () => {
    if (editMode) {
      if (!confirmDiscardPendingEdits()) return;
    }
    setEditMode(v => !v);
  };

  const getCellValue = (row, field) => pendingEdits[row.rowKey]?.[field] ?? row[field];

  const setCellEdit = (row, field, value) => {
    setPendingEdits(prev => ({
      ...prev,
      [row.rowKey]: { ...prev[row.rowKey], [field]: value },
    }));
  };

  const undoRowEdits = (rowKey) => {
    setPendingEdits(prev => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
  };

  const saveRowEdits = async (row) => {
    const edits = pendingEdits[row.rowKey];
    if (!edits) return;
    const client = clients.find(c => c.id === row.clientId);
    if (!client) return;

    setSavingRows(prev => new Set(prev).add(row.rowKey));
    try {
      const name           = edits.nombre !== undefined ? edits.nombre : client.name;
      const identification  = edits.ruc    !== undefined ? edits.ruc    : client.identification;
      const foreign         = edits.extranjero !== undefined ? edits.extranjero === 'Sí' : client.foreign;

      const contactFields     = ['ubicacion', 'ciudad', 'direccion', 'telefono', 'email', 'mapsLink', 'referencia'];
      const installFields     = ['equipo', 'observacion'];
      const touchesContact    = contactFields.some(f => edits[f] !== undefined);
      const touchesInstall    = installFields.some(f => edits[f] !== undefined);

      let contacts = getClientContacts(client).map(c => ({ ...c, installations: [...(c.installations || [])] }));

      if (touchesContact || touchesInstall) {
        // Clientes "legacy" (campos planos, sin array contacts) generan un contacto
        // sintético con un id aleatorio distinto en cada llamada a getClientContacts —
        // si hay exactamente un contacto y no matchea por id, es ese mismo (evita
        // crear uno vacío y perder sus datos al sobrescribir contacts en updateClient).
        let contact = contacts.find(c => c.id === row.contactId)
          || (contacts.length === 1 ? contacts[0] : null);
        if (!contact) {
          contact = emptyContact();
          contacts = [...contacts, contact];
        }
        if (touchesContact) {
          contact.ubicacion  = edits.ubicacion  !== undefined ? edits.ubicacion  : contact.ubicacion;
          contact.ciudad     = edits.ciudad     !== undefined ? edits.ciudad     : contact.ciudad;
          contact.address    = edits.direccion  !== undefined ? edits.direccion  : contact.address;
          contact.phone      = edits.telefono   !== undefined ? edits.telefono   : contact.phone;
          contact.email      = edits.email      !== undefined ? edits.email      : contact.email;
          contact.mapsLink   = edits.mapsLink   !== undefined ? edits.mapsLink   : contact.mapsLink;
          contact.referencia = edits.referencia !== undefined ? edits.referencia : contact.referencia;
        }
        if (touchesInstall) {
          let inst = (contact.installations || []).find(i => i.id === row.installationId);
          if (!inst) {
            inst = emptyInstallation();
            contact.installations = [...(contact.installations || []), inst];
          }
          inst.serviceType = edits.equipo      !== undefined ? edits.equipo      : inst.serviceType;
          inst.observacion = edits.observacion !== undefined ? edits.observacion : inst.observacion;
        }
        contacts = contacts.map(c => c.id === contact.id ? contact : c);
      }

      const ok = await updateClient(client.id, { name, foreign, identification, contacts });
      if (ok) {
        addToast({ type: 'success', title: '✅ Fila guardada', body: `${name} se actualizó correctamente.` });
        undoRowEdits(row.rowKey);
      } else {
        addToast({ type: 'error', title: '❌ Error', body: 'No se pudo guardar esta fila.' });
      }
    } finally {
      setSavingRows(prev => { const next = new Set(prev); next.delete(row.rowKey); return next; });
    }
  };

  const handleSave = async (formData) => {
    const isEditing = !!editing;
    const idChanged = isEditing
      && formData.identification?.trim().replace(/\s/g, '') !== editing.id;

    setIsLoading(true);
    try {
      const ok = isEditing
        ? await updateClient(editing.id, formData)
        : await createClient(formData);

      if (ok) {
        const offline = !navigator.onLine;
        addToast({
          type:  'success',
          title: isEditing ? '✅ Cliente actualizado' : '✅ Cliente creado',
          body:  offline
            ? `${formData.name} guardado localmente — se sincronizará al reconectar.`
            : `${formData.name} ${isEditing ? 'actualizado' : 'registrado'} correctamente.`,
        });
        setShowForm(false);
        setEditing(null);
      } else {
        addToast({
          type:  'error',
          title: '❌ Error',
          body:  idChanged && !navigator.onLine
            ? 'Cambiar la cédula/RUC requiere conexión a internet.'
            : `No se pudo ${isEditing ? 'actualizar' : 'crear'} el cliente.`,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (client) => {
    setEditing(client);
    setShowForm(true);
  };

  const handleToggleActive = async (client) => {
    const activating = client.active === false;
    setIsLoading(true);
    try {
      const ok = await setClientActive(client.id, activating);
      if (ok) {
        addToast({
          type:  'success',
          title: activating ? '✅ Cliente activado' : '🚫 Cliente desactivado',
          body:  `${client.name} ${activating ? 'fue reactivado' : 'fue desactivado'} correctamente.`,
        });
      } else {
        addToast({
          type:  'error',
          title: '❌ Error',
          body:  `No se pudo ${activating ? 'activar' : 'desactivar'} el cliente.`,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Confirmación resuelta inline en ActionsMenu (no window.confirm: en PWAs
  // instaladas en modo standalone el diálogo nativo puede resolverse como
  // "cancelar" sin llegar a mostrarse, dejando el botón sin efecto aparente).
  const handleDeleteClient = async (client) => {
    setIsLoading(true);
    try {
      const ok = await deleteClient(client.id);
      if (ok) {
        addToast({ type: 'success', title: '🗑️ Cliente eliminado', body: `${client.name} fue eliminado correctamente.` });
      } else {
        addToast({ type: 'error', title: '❌ Error', body: 'No se pudo eliminar el cliente.' });
      }
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo eliminar el cliente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const activeCount   = clients.filter(c => c.active !== false).length;
  const inactiveCount = clients.filter(c => c.active === false).length;

  return (
    <div className="space-y-4">

      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeCount} activo{activeCount !== 1 ? 's' : ''}
            {inactiveCount > 0 && ` · ${inactiveCount} inactivo${inactiveCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Upload size={15} />
            <span>Importar Excel</span>
          </button>

          <div className="relative">
            <button onClick={() => setShowExportMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
              <Download size={15} />
              <span>Reporte</span>
              <ChevronDown size={14} />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <button onClick={() => { exportExcel('clients', getActiveColumns('clients'), sortedTableRows); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
                    <div className="p-1.5 bg-green-100 rounded"><FileText size={14} className="text-green-600" /></div>
                    <div><p className="text-sm font-medium text-slate-700">Excel (.xlsx)</p></div>
                  </button>
                  <div className="border-t border-slate-100" />
                  <button onClick={() => { exportCSV('clients', getActiveColumns('clients'), sortedTableRows); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
                    <div className="p-1.5 bg-blue-100 rounded"><FileText size={14} className="text-blue-600" /></div>
                    <div><p className="text-sm font-medium text-slate-700">CSV</p></div>
                  </button>
                  <div className="border-t border-slate-100" />
                  <button onClick={() => { printClientsReportPDF(sortedTableRows, empresaConfig, getActiveColumns('clients')); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
                    <div className="p-1.5 bg-red-100 rounded"><FileText size={14} className="text-red-600" /></div>
                    <div><p className="text-sm font-medium text-slate-700">PDF</p></div>
                  </button>
                  <div className="border-t border-slate-100" />
                  <button onClick={() => { setShowExportConfig(true); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
                    <div className="p-1.5 bg-slate-100 rounded"><Filter size={14} className="text-slate-600" /></div>
                    <div><p className="text-sm font-medium text-slate-700">Configurar columnas...</p></div>
                  </button>
                </div>
              </>
            )}
          </div>

          {!showForm && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-white font-bold rounded-lg text-sm"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              <Plus size={15} />
              Nuevo cliente
            </button>
          )}
        </div>
      </div>

      {/* ── Formulario crear / editar ── */}
      {showForm && (
        <ClientForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          isLoading={isLoading}
          existingIds={existingIds}
          allClients={clients}
          onActivateExisting={async (clientId) => {
            setIsLoading(true);
            try {
              const ok = await setClientActive(clientId, true);
              if (ok) {
                addToast({
                  type:  'success',
                  title: '✅ Cliente activado',
                  body:  'El cliente existente fue reactivado correctamente.',
                });
                setShowForm(false);
                setEditing(null);
              } else {
                addToast({ type: 'error', title: '❌ Error', body: 'No se pudo activar el cliente.' });
              }
            } finally {
              setIsLoading(false);
            }
          }}
        />
      )}

      {/* ── Buscador y filtro ── */}
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <select
          value={searchField}
          onChange={e => setSearchField(e.target.value)}
          className="border border-slate-300 rounded-lg px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:border-pink-400 transition-colors flex-shrink-0">
          <option value="nombre">Buscar en: Nombre</option>
          <option value="cedula">Cédula/RUC</option>
          <option value="ubicacion">Ubicación</option>
          <option value="ciudad">Ciudad</option>
          <option value="direccion">Dirección</option>
          <option value="telefono">Teléfono</option>
          <option value="email">Email</option>
          <option value="equipo">Equipo</option>
          <option value="observacion">Observación</option>
        </select>

        {searchField === 'equipo' ? (
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-pink-400 transition-colors appearance-none">
              <option value="">Todos los equipos</option>
              {serviceTypes.map(st => (
                <option key={st.id} value={st.name?.toLowerCase()}>{st.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={
                searchField === 'nombre'      ? 'Buscar por nombre...' :
                searchField === 'cedula'      ? 'Buscar por cédula/RUC...' :
                searchField === 'ubicacion'   ? 'Buscar por ubicación...' :
                searchField === 'ciudad'      ? 'Buscar por ciudad...' :
                searchField === 'direccion'   ? 'Buscar por dirección...' :
                searchField === 'telefono'    ? 'Buscar por teléfono...' :
                searchField === 'email'       ? 'Buscar por email...' :
                searchField === 'observacion' ? 'Buscar por observación...' :
                'Buscar...'
              }
              className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-pink-400 transition-colors" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <X size={14} />
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            showInactive
              ? 'text-white border-transparent'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
          style={showInactive ? { background: 'linear-gradient(135deg, #D61672, #FFA901)' } : {}}>
          <Filter size={14} />
          {showInactive ? 'Ver solo activos' : 'Ver solo inactivos'}
        </button>

        <div className="flex bg-slate-100 rounded-lg p-1 gap-0.5 flex-shrink-0">
          <button onClick={() => { if (confirmDiscardPendingEdits()) { setEditMode(false); setViewMode('cards'); } }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              viewMode === 'cards' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            Tarjetas
          </button>
          <button onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            Tabla
          </button>
        </div>

        {viewMode === 'table' && (
          <button onClick={toggleEditMode}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors flex-shrink-0 ${
              editMode ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
            style={editMode ? { background: 'linear-gradient(135deg, #D61672, #FFA901)' } : {}}>
            <Pencil size={14} />
            {editMode ? 'Salir de edición' : 'Editar tabla'}
          </button>
        )}

        {viewMode === 'table' && (
          <div className="relative">
            <button onClick={() => setShowColumnsMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0">
              <Columns3 size={14} />
              Columnas
              <ChevronDown size={14} />
            </button>
            {showColumnsMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColumnsMenu(false)} />
                <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs text-slate-500">Mostrar/ocultar columnas en pantalla</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {TABLE_COLUMNS.map(col => {
                      const visible = !hiddenColumnKeys.has(col.key);
                      return (
                        <button key={col.key} onClick={() => toggleColumnVisibility(col.key)}
                          className="w-full flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-slate-50 text-left">
                          <span className={visible ? 'text-slate-700' : 'text-slate-400'}>{col.label}</span>
                          {visible ? <Eye size={14} className="text-slate-500" /> : <EyeOff size={14} className="text-slate-300" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-100">
                    <button onClick={() => { setHiddenColumnKeys(new Set()); saveHiddenColumns(new Set()); }}
                      className="w-full px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 text-left">
                      Mostrar todas
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Tarjetas (vista actual, agrupada por cliente) ── */}
      {viewMode === 'cards' && (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm font-medium">Sin clientes que coincidan</p>
            {!showForm && (
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="mt-4 flex items-center gap-1.5 mx-auto px-4 py-2 text-white text-sm font-bold rounded-xl"
                style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                <Plus size={14} />
                Crear primer cliente
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 w-56">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Ubicaciones</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Equipos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagination.paginatedItems.map(client => (
                    <ClientRow
                      key={client.id}
                      client={client}
                      visitCount={visitCountMap[client.id] || 0}
                      onEdit={handleEdit}
                      onToggleActive={handleToggleActive}
                      onDelete={handleDeleteClient}
                      isAdmin={isAdmin}
                      isLoading={isLoading}
                      onNewVisit={(c) => openNewVisitModal({ clientId: c.id })}
                      onHistorial={(c) => setHistorialClient(c)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={pagination.goToPage}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                totalItems={pagination.totalItems}
                pageSize={pageSize}
                onPageSizeChange={(size) => { setPageSize(size); pagination.resetPage(); }}
              />
            </div>
          </>
        )}
      </div>
      )}

      {/* ── Vista de tabla plana (una fila por ubicación, ordenable hasta 3 niveles) ── */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50">
              {sortLevels.length > 0 && (
                <>
                  <span className="text-xs text-slate-500">Ordenando por:</span>
                  {sortLevels.map((s, i) => {
                    const col = TABLE_COLUMNS.find(c => c.key === s.field);
                    return (
                      <span key={s.field}
                        className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                        {i + 1}. {col?.label} {s.dir === 'asc' ? '▲' : '▼'}
                      </span>
                    );
                  })}
                  <button onClick={clearSort}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1">
                    <X size={12} />Limpiar orden
                  </button>
                </>
              )}
              {/* Scroll horizontal — solo desktop/laptop, en tablet/celular el scroll táctil ya funciona */}
              <div className="ml-auto hidden sm:flex items-center gap-1">
                <button onClick={() => tableScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-colors"
                  title="Desplazar tabla a la izquierda">
                  <ChevronDown size={14} className="rotate-90" />
                </button>
                <button onClick={() => tableScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-colors"
                  title="Desplazar tabla a la derecha">
                  <ChevronDown size={14} className="-rotate-90" />
                </button>
              </div>
          </div>
          {/* Paginación arriba de la tabla — siempre visible, sin depender del scroll */}
          <div className="px-4 py-3 border-b border-slate-100">
            <Pagination
              currentPage={tablePagination.currentPage}
              totalPages={tablePagination.totalPages}
              onPageChange={tablePagination.goToPage}
              startIndex={tablePagination.startIndex}
              endIndex={tablePagination.endIndex}
              totalItems={tablePagination.totalItems}
              pageSize={pageSize}
              onPageSizeChange={(size) => { setPageSize(size); tablePagination.resetPage(); }}
            />
          </div>
          {sortedTableRows.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users size={40} className="mx-auto mb-3 opacity-25" />
              <p className="text-sm font-medium">Sin clientes que coincidan</p>
            </div>
          ) : (
            <>
              <div ref={tableScrollRef} className="overflow-x-auto overflow-y-auto max-h-[65vh]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {visibleTableColumns.map(col => {
                        const level = sortLevels.find(s => s.field === col.key);
                        const priority = level ? sortLevels.indexOf(level) + 1 : null;
                        const isFrozen = FROZEN_COLUMN_LEFT[col.key] !== undefined;
                        return (
                          <th key={col.key} onClick={() => toggleSort(col.key)}
                            style={getFrozenStyle(col.key)}
                            className={`sticky top-0 bg-slate-50 text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 transition-colors ${isFrozen ? 'z-30' : 'z-10'}`}>
                            <span className="flex items-center gap-1">
                              {col.label}
                              {level ? (
                                <span className="text-[10px] text-pink-600 font-bold">
                                  {priority}{level.dir === 'asc' ? '▲' : '▼'}
                                </span>
                              ) : (
                                <span className="text-slate-300">⇅</span>
                              )}
                            </span>
                          </th>
                        );
                      })}
                      <th className="sticky top-0 z-10 bg-slate-50 text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tablePagination.paginatedItems.map((row, i) => {
                      const client       = clients.find(c => c.id === row.clientId);
                      const rowEdits     = pendingEdits[row.rowKey];
                      const hasEdits     = rowEdits && Object.keys(rowEdits).length > 0;
                      const isSaving     = savingRows.has(row.rowKey);
                      const isInactive   = client?.active === false;
                      return (
                        <tr key={row.rowKey || i} className={`hover:bg-slate-50 ${isInactive ? 'opacity-60 bg-slate-50/50' : ''}`}>
                          {visibleTableColumns.map(col => {
                            const isFrozen = FROZEN_COLUMN_LEFT[col.key] !== undefined;
                            if (!editMode) {
                              return (
                                <td key={col.key} tabIndex={0} onKeyDown={handleCellKeyDown}
                                  style={getFrozenStyle(col.key)}
                                  className={`px-4 py-2.5 text-slate-600 whitespace-nowrap max-w-[220px] truncate outline-none focus:ring-2 focus:ring-inset focus:ring-pink-400 focus:bg-pink-50 ${isFrozen ? 'bg-white z-20' : ''}`}
                                  title={row[col.key]}>
                                  {col.key === 'nombre' && isInactive && (
                                    <span className="mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-500 align-middle">Inactivo</span>
                                  )}
                                  {row[col.key] || '—'}
                                </td>
                              );
                            }
                            const value = getCellValue(row, col.key);
                            return (
                              <td key={col.key} style={getFrozenStyle(col.key)}
                                className={`px-2 py-1.5 ${isFrozen ? 'bg-white z-20' : ''}`}>
                                {col.key === 'equipo' ? (
                                  <select value={value} disabled={isSaving}
                                    onChange={e => setCellEdit(row, col.key, e.target.value)}
                                    className="w-full min-w-[140px] px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-pink-400">
                                    <option value="">—</option>
                                    {serviceTypes.map(st => (
                                      <option key={st.id} value={st.name}>{st.name}</option>
                                    ))}
                                  </select>
                                ) : col.key === 'extranjero' ? (
                                  <select value={value} disabled={isSaving}
                                    onChange={e => setCellEdit(row, col.key, e.target.value)}
                                    className="w-full min-w-[90px] px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-pink-400">
                                    <option value="No">No</option>
                                    <option value="Sí">Sí</option>
                                  </select>
                                ) : (
                                  <input type="text" value={value} disabled={isSaving}
                                    onChange={e => setCellEdit(row, col.key, e.target.value)}
                                    className="w-full min-w-[140px] px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400" />
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {hasEdits && (
                                <>
                                  <button onClick={() => saveRowEdits(row)} disabled={isSaving}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
                                    style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                    Guardar
                                  </button>
                                  <button onClick={() => undoRowEdits(row.rowKey)} disabled={isSaving}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-60">
                                    <X size={12} />Deshacer
                                  </button>
                                </>
                              )}
                              {client && (
                                <>
                                  <button onClick={() => setHistorialClient(client)}
                                    title="Calendario / historial de visitas"
                                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors border border-purple-100">
                                    <CalendarDays size={12} />
                                  </button>
                                  <ActionsMenu
                                    client={client}
                                    visitCount={visitCountMap[client.id] || 0}
                                    onNewVisit={(c) => openNewVisitModal({ clientId: c.id })}
                                    onEdit={handleEdit}
                                    onToggleActive={handleToggleActive}
                                    onDelete={handleDeleteClient}
                                    isAdmin={isAdmin}
                                    isLoading={isLoading}
                                    wrapperClassName="relative"
                                  />
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal importación */}
      {showImport && (
        <ClientImportModal
          existingClients={clients}
          onImport={async (rows) => await importClients(rows)}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Modal historial del cliente */}
      {historialClient && (
        <ClientHistorialModal
          client={historialClient}
          onClose={() => setHistorialClient(null)}
          onNewVisit={(c) => { openNewVisitModal({ clientId: c.id }); }}
        />
      )}
    </div>
  );
}
