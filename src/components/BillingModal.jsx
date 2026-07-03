import { useState } from 'react';
import {
  X, DollarSign, Plus, Trash2, Printer, CreditCard,
  Banknote, ArrowRightLeft, Calendar, CheckCircle, Loader2, AlertCircle
} from 'lucide-react';
import {
  calcPaymentSummary, saveVisitBilling,
  addPayment, deletePayment, generateReceiptNo,
  saveFlatVisitBilling, addFlatVisitPayment, deleteFlatVisitPayment,
} from '../services/visitBilling.js';

import { localDateStr, formatDateOnly } from '../utils/dates.js';
import { fmtMoney } from '../utils/format.js';

const METHOD_ICONS = {
  'Efectivo':       <Banknote     size={13} className="text-green-600"  />,
  'Transferencia':  <ArrowRightLeft size={13} className="text-blue-600" />,
  'Cheque':         <CreditCard   size={13} className="text-purple-600" />,
  'Otro':           <DollarSign   size={13} className="text-slate-500"  />,
};

// ─── Generador de comprobante HTML ────────────────────────────────────────────

function generateReceipt({ task, visit, payment }) {
  const { total, abonado, saldo } = calcPaymentSummary({
    ...visit,
    payments: visit.payments || [],
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante ${payment.receiptNo}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; font-size:12px; color:#1e293b; }
    .page { max-width:400px; margin:0 auto; padding:24px; border:2px solid #e2e8f0; }
    .header { text-align:center; border-bottom:3px solid #D61672; padding-bottom:12px; margin-bottom:14px; }
    .header h1 { font-size:18px; font-weight:bold; color:#D61672; letter-spacing:.05em; }
    .header p  { font-size:10px; color:#FFA901; font-weight:bold; }
    .receipt-no { text-align:center; margin-bottom:12px; }
    .receipt-no span { font-family:monospace; font-size:15px; font-weight:bold; color:#D61672;
      background:#fdf2f8; px:8px; padding:4px 12px; border-radius:6px; border:1px solid #fce7f3; }
    .section { margin-bottom:10px; }
    .section-title { font-size:9px; font-weight:bold; text-transform:uppercase; letter-spacing:.08em;
      color:#D61672; border-bottom:1px solid #fce7f3; padding-bottom:3px; margin-bottom:6px; }
    .row { display:flex; justify-content:space-between; padding:3px 0; font-size:11px; }
    .row .label { color:#64748b; }
    .row .value { font-weight:bold; }
    .amount-box { background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:8px; padding:10px;
      text-align:center; margin:10px 0; }
    .amount-box .am-label { font-size:9px; color:#166534; text-transform:uppercase; font-weight:bold; }
    .amount-box .am-value { font-size:22px; font-weight:bold; color:#166534; }
    .saldo-box { background:#fff7ed; border:1.5px solid #fed7aa; border-radius:8px; padding:8px;
      display:flex; justify-content:space-between; align-items:center; }
    .saldo-box .s-label { font-size:10px; color:#9a3412; font-weight:bold; }
    .saldo-box .s-value { font-size:14px; font-weight:bold; color:#9a3412; }
    .paid-box { background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:8px; padding:8px;
      text-align:center; color:#166534; font-weight:bold; font-size:12px; }
    .footer { margin-top:16px; padding-top:10px; border-top:2px solid #D61672;
      display:flex; justify-content:space-between; align-items:center; font-size:9px; color:#94a3b8; }
    .signature { margin-top:36px; border-top:1px solid #D61672; padding-top:4px;
      text-align:center; font-size:9px; color:#64748b; }
    @media print { .page { border:none; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>ACONTPLUS</h1>
    <p>Recordatorios · Comprobante de cobro</p>
  </div>

  <div class="receipt-no">
    <span>${payment.receiptNo}</span>
  </div>

  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="row"><span class="label">Nombre</span><span class="value">${task.clientName || '—'}</span></div>
    ${task.clientPhone ? `<div class="row"><span class="label">Teléfono</span><span class="value">${task.clientPhone}</span></div>` : ''}
    ${task.serviceOrder ? `<div class="row"><span class="label">Orden servicio</span><span class="value">${task.serviceOrder}</span></div>` : ''}
    ${task.serviceType  ? `<div class="row"><span class="label">Tipo servicio</span><span class="value">${task.serviceType}</span></div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Visita</div>
    <div class="row"><span class="label">Fecha visita</span><span class="value">${formatDateOnly(visit.scheduledDate)}</span></div>
    ${visit.type ? `<div class="row"><span class="label">Tipo</span><span class="value">${visit.type}</span></div>` : ''}
    ${visit.technician ? `<div class="row"><span class="label">Técnico</span><span class="value">${visit.technician}</span></div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Abono registrado</div>
    <div class="row"><span class="label">Fecha cobro</span><span class="value">${formatDateOnly(payment.date)}</span></div>
    <div class="row"><span class="label">Forma de pago</span><span class="value">${payment.method}</span></div>
    ${payment.note ? `<div class="row"><span class="label">Referencia</span><span class="value">${payment.note}</span></div>` : ''}
    <div class="row"><span class="label">Registrado por</span><span class="value">${payment.registeredBy}</span></div>
    <div class="row"><span class="label">Fecha registro</span><span class="value">${new Date(payment.registeredAt).toLocaleString('es-EC')}</span></div>
  </div>

  <div class="amount-box">
    <div class="am-label">Valor abonado</div>
    <div class="am-value">$ ${fmtMoney(payment.amount)}</div>
  </div>

  <div class="section">
    <div class="section-title">Resumen de cuenta</div>
    <div class="row"><span class="label">Valor total</span><span class="value">$ ${fmtMoney(total)}</span></div>
    <div class="row"><span class="label">Total abonado</span><span class="value">$ ${fmtMoney(abonado)}</span></div>
  </div>

  ${saldo === 0
    ? `<div class="paid-box">✅ CUENTA CANCELADA EN SU TOTALIDAD</div>`
    : `<div class="saldo-box"><span class="s-label">Saldo pendiente</span><span class="s-value">$ ${fmtMoney(saldo)}</span></div>`
  }

  <div class="signature">Firma del cliente / Recibí conforme</div>

  <div class="footer">
    <span>ACONTPLUS Recordatorios</span>
    <span>Generado: ${new Date().toLocaleString('es-EC')}</span>
  </div>
</div>
</body></html>`;
  return html;
}

function printReceipt(task, visit, payment) {
  const win = window.open('', '_blank', 'width=500,height=700');
  win.document.write(generateReceipt({ task, visit, payment }));
  win.document.close();
  win.focus();
}

// ─── Formulario nuevo abono ────────────────────────────────────────────────────

function PaymentForm({ visitId, onAdd, onCancel, isLoading, maxAmount }) {
  const [form, setForm] = useState({
    date:   localDateStr(),
    amount: '',
    method: 'Efectivo',
    note:   '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError('Ingresa un monto válido mayor a 0.'); return; }
    setError('');
    await onAdd(form);
  };

  const inp = "w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors";

  return (
    <form onSubmit={handleSubmit}
      className="bg-green-50 border-2 border-green-200 rounded-xl p-4 space-y-3 mb-4">
      <p className="text-xs font-bold uppercase tracking-wide text-green-700">Registrar abono</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Fecha cobro <span className="text-red-400">*</span>
          </label>
          <input type="date" value={form.date}
            onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            className={inp} required
            onFocus={e => e.target.style.borderColor = '#16a34a'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Monto (USD) <span className="text-red-400">*</span>
          </label>
          <input type="number" min="0.01" step="0.01"
            value={form.amount}
            onChange={e => { setForm(p => ({ ...p, amount: e.target.value })); setError(''); }}
            placeholder="0.00" className={inp}
            onFocus={e => e.target.style.borderColor = '#16a34a'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          {error && <p className="text-xs text-red-500 mt-1">⚠️ {error}</p>}
        </div>
      </div>

      {/* Método de pago */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Forma de pago
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['Efectivo', 'Transferencia', 'Cheque', 'Otro'].map(m => (
            <button type="button" key={m}
              onClick={() => setForm(p => ({ ...p, method: m }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-colors ${
                form.method === m
                  ? 'border-green-400 bg-green-100 text-green-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}>
              {METHOD_ICONS[m]}
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Referencia */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Referencia / Nota <span className="text-slate-400 font-normal normal-case">(opcional)</span>
        </label>
        <input type="text" value={form.note}
          onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
          placeholder="Nº transferencia, cheque, etc."
          className={inp}
          onFocus={e => e.target.style.borderColor = '#16a34a'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          {isLoading ? 'Guardando...' : 'Guardar abono'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Modal principal ───────────────────────────────────────────────────────────

// flatMode: true cuando la visita vive en la colección plana tenants/{id}/visits
// (Gestión de visitas) en vez del modelo legado tarea→visitas embebidas.
// En ese caso `task` es solo un objeto sintético para mostrar datos del cliente
// y `allVisits`/`onUpdate` no se usan — cada visita es su propio documento.
export default function BillingModal({ task, visit, allVisits, onClose, onUpdate, user, flatMode = false }) {
  const [showPayForm,    setShowPayForm]    = useState(false);
  const [isLoading,      setIsLoading]      = useState(false);
  const [localVisit,     setLocalVisit]     = useState(visit);
  const [editingBilling, setEditingBilling] = useState(false);

  // Estado del formulario de facturación principal
  const [billingForm, setBillingForm] = useState({
    valorCobrar:    localVisit.valorCobrar    || '',
    commitmentDate: localVisit.commitmentDate || '',
  });

  const summary = calcPaymentSummary(localVisit);
  const payments = localVisit.payments || [];

  // ── Guardar valor a cobrar / fecha compromiso ──────────────────────────────
  const handleSaveBilling = async () => {
    setIsLoading(true);
    try {
      const patch = {
        valorCobrar:    billingForm.valorCobrar    ? parseFloat(billingForm.valorCobrar) : undefined,
        commitmentDate: billingForm.commitmentDate || '',
      };
      if (flatMode) {
        await saveFlatVisitBilling(localVisit.id, patch);
        const fresh = { ...localVisit, ...patch };
        setLocalVisit(fresh);
        onUpdate?.(fresh);
      } else {
        const updated = await saveVisitBilling(task.id, allVisits, localVisit.id, patch);
        const fresh = updated.find(v => v.id === localVisit.id);
        setLocalVisit(fresh);
        onUpdate(updated);
      }
      setEditingBilling(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Registrar abono ────────────────────────────────────────────────────────
  const handleAddPayment = async (formData) => {
    setIsLoading(true);
    try {
      if (flatMode) {
        const { updatedVisit, newPayment } = await addFlatVisitPayment(localVisit, formData, user.email);
        setLocalVisit(updatedVisit);
        onUpdate?.(updatedVisit);
        setShowPayForm(false);
        printReceipt(task, updatedVisit, newPayment);
      } else {
        const { updatedVisits, newPayment } = await addPayment(
          task.id, allVisits, localVisit.id, formData, user.email
        );
        const fresh = updatedVisits.find(v => v.id === localVisit.id);
        setLocalVisit(fresh);
        onUpdate(updatedVisits);
        setShowPayForm(false);
        printReceipt(task, fresh, newPayment);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Eliminar abono ─────────────────────────────────────────────────────────
  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('¿Eliminar este abono? Esta acción no se puede deshacer.')) return;
    setIsLoading(true);
    try {
      if (flatMode) {
        const fresh = await deleteFlatVisitPayment(localVisit, paymentId);
        setLocalVisit(fresh);
        onUpdate?.(fresh);
      } else {
        const updated = await deletePayment(task.id, allVisits, localVisit.id, paymentId);
        const fresh   = updated.find(v => v.id === localVisit.id);
        setLocalVisit(fresh);
        onUpdate(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const inp = "w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-end bg-black bg-opacity-40">
      <div className="relative bg-white h-full w-full max-w-md flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide opacity-80">Cobro de visita</p>
              <h3 className="font-bold text-lg truncate mt-0.5">{task.clientName}</h3>
              <p className="text-xs opacity-80 mt-0.5">
                📅 {formatDateOnly(localVisit.scheduledDate)}
                {localVisit.scheduledTime && ` · ${localVisit.scheduledTime}`}
                {localVisit.type && ` · ${localVisit.type}`}
              </p>
              {task.serviceOrder && (
                <span className="inline-block mt-1 text-xs font-mono opacity-80">OS: {task.serviceOrder}</span>
              )}
            </div>
            <button onClick={onClose}
              className="p-2 text-white opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-20 rounded-lg ml-2 flex-shrink-0">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Resumen de cuenta ── */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <DollarSign size={15} style={{ color: '#D61672' }} />
                Resumen de cuenta
              </h4>
              <button onClick={() => setEditingBilling(!editingBilling)}
                className="text-xs font-semibold transition-colors"
                style={{ color: '#D61672' }}>
                {editingBilling ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            {editingBilling ? (
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Valor a cobrar (USD)
                  </label>
                  <input type="number" min="0" step="0.01"
                    value={billingForm.valorCobrar}
                    onChange={e => setBillingForm(p => ({ ...p, valorCobrar: e.target.value }))}
                    placeholder="0.00" className={inp}
                    onFocus={e => e.target.style.borderColor = '#D61672'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    <Calendar size={11} className="inline mr-1" />
                    Fecha compromiso de pago
                  </label>
                  <input type="date"
                    value={billingForm.commitmentDate}
                    onChange={e => setBillingForm(p => ({ ...p, commitmentDate: e.target.value }))}
                    className={inp}
                    onFocus={e => e.target.style.borderColor = '#D61672'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <button onClick={handleSaveBilling} disabled={isLoading}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Guardar
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Barra de progreso */}
                {summary.total > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">Progreso de pago</span>
                      <span className="text-xs font-bold text-slate-700">
                        {summary.total > 0 ? Math.min(100, Math.round((summary.abonado / summary.total) * 100)) : 0}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (summary.abonado / summary.total) * 100)}%`,
                          background: summary.pagado
                            ? 'linear-gradient(90deg, #16a34a, #15803d)'
                            : 'linear-gradient(90deg, #D61672, #FFA901)',
                        }} />
                    </div>
                  </div>
                )}

                {/* Cifras */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Total</p>
                    <p className="text-base font-bold text-slate-800">
                      {summary.total > 0 ? `$${fmtMoney(summary.total)}` : <span className="text-slate-300 text-sm">—</span>}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-0.5">Abonado</p>
                    <p className="text-base font-bold text-green-700">${fmtMoney(summary.abonado)}</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${summary.saldo > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${summary.saldo > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      Saldo
                    </p>
                    <p className={`text-base font-bold ${summary.saldo > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                      ${fmtMoney(summary.saldo)}
                    </p>
                  </div>
                </div>

                {/* Estado de cuenta */}
                {summary.pagado && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                    <span className="text-sm font-bold text-green-700">Cuenta cancelada en su totalidad</span>
                  </div>
                )}

                {/* Fecha compromiso */}
                {localVisit.commitmentDate && !summary.pagado && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <Calendar size={15} className="text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Fecha compromiso</p>
                      <p className="text-sm font-bold text-amber-800">{formatDateOnly(localVisit.commitmentDate)}</p>
                    </div>
                  </div>
                )}

                {summary.total === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <AlertCircle size={15} className="text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500">Sin valor registrado. Haz clic en "Editar" para configurar el cobro.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Historial de abonos ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-700">Historial de abonos</h4>
              {!showPayForm && !summary.pagado && (
                <button onClick={() => setShowPayForm(true)}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl text-white"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                  <Plus size={12} />
                  Registrar abono
                </button>
              )}
            </div>

            {showPayForm && (
              <PaymentForm
                onAdd={handleAddPayment}
                onCancel={() => setShowPayForm(false)}
                isLoading={isLoading}
              />
            )}

            {payments.length === 0 && !showPayForm ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <DollarSign size={32} className="mx-auto mb-2 opacity-25" />
                <p className="text-sm font-medium">Sin abonos registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {METHOD_ICONS[p.method] || METHOD_ICONS['Otro']}
                        <div>
                          <p className="text-sm font-bold text-slate-800">${fmtMoney(p.amount)}</p>
                          <p className="text-xs text-slate-500">{p.method} · {formatDateOnly(p.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => printReceipt(task, localVisit, p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Imprimir comprobante">
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => handleDeletePayment(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar abono">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {p.note && (
                      <p className="text-xs text-slate-400 mt-1.5 pl-6">📎 {p.note}</p>
                    )}
                    <div className="flex items-center justify-between mt-1.5 pl-6">
                      <span className="text-xs text-slate-400 font-mono">{p.receiptNo}</span>
                      <span className="text-xs text-slate-400">{p.registeredBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0 bg-slate-50">
          <button onClick={onClose}
            className="w-full py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
