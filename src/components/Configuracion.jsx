import { useState, useEffect, useRef } from 'react';
import {
  Phone, Save, CheckCircle, AlertCircle, Upload, Image,
  Building2, Bell, Info, Users, Copy, PlusCircle, Wrench, Package, CalendarCheck,
  Mail, Clock, X,
} from 'lucide-react';
import { doc, getDoc, getDocs, query, collection, where, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import { useConfiguracion } from '../hooks/useConfiguracion.js';
import TecnicosForm from './TecnicosForm.jsx';
import ServiceTypesManager from './ServiceTypesManager.jsx';
import TiposVisitaManager from './TiposVisitaManager.jsx';
import UsersManager from './UsersManager.jsx';

// ─── Sub-componentes de Entidad ───────────────────────────────────────────────

function JoinCodeSection() {
  const tenantId  = useAppStore(s => s.tenantId);
  const [code,    setCode]   = useState('');
  const [copied,  setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    getDoc(doc(db, 'tenants', tenantId))
      .then(snap => { if (snap.exists()) setCode(snap.data().joinCode || ''); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-3"
        style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff7ed)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          <Users size={15} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">Código de invitación</p>
          <p className="text-xs text-slate-400">Compártelo para que otros se unan a tu empresa</p>
        </div>
      </div>
      <div className="px-6 py-5">
        {loading ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-100 rounded-xl px-5 py-3">
              <span className="text-2xl font-mono font-bold tracking-widest text-slate-800">
                {code || '—'}
              </span>
              {code && (
                <button onClick={copy} className="text-slate-400 hover:text-slate-700">
                  {copied
                    ? <CheckCircle size={18} className="text-green-500" />
                    : <Copy size={18} />}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 flex-1">
              Los nuevos usuarios ingresan este código en la pantalla de configuración de empresa.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function JoinAnotherSection() {
  const user      = useAppStore(s => s.user);
  const tenantIds = useAppStore(s => s.tenantIds);
  const [code,    setCode]    = useState('');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 6) { setError('El código debe tener 6 caracteres.'); return; }
    setError(''); setSuccess(''); setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'tenants'), where('joinCode', '==', c)));
      if (snap.empty) { setError('Código incorrecto. Verifica con el administrador.'); return; }
      const tenant = snap.docs[0].data();
      if (tenantIds.includes(tenant.id)) { setError('Ya perteneces a esta empresa.'); return; }
      await setDoc(doc(db, 'users', user.uid), { tenantIds: arrayUnion(tenant.id) }, { merge: true });
      const newIds   = [...tenantIds, tenant.id];
      const tDocs    = await Promise.all(newIds.map(id => getDoc(doc(db, 'tenants', id))));
      useAppStore.setState({
        tenantIds:        newIds,
        availableTenants: tDocs.map(d => ({ id: d.id, name: d.data()?.name ?? '', ruc: d.data()?.ruc ?? '' })),
      });
      setSuccess(`Te uniste a "${tenant.name}" correctamente.`);
      setCode('');
    } catch (e) {
      setError('Error al unirse. Intenta de nuevo.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-3"
        style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500">
          <PlusCircle size={15} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">Unirse a otra empresa</p>
          <p className="text-xs text-slate-400">Ingresa el código de invitación de la empresa</p>
        </div>
      </div>
      <div className="px-6 py-5 space-y-3">
        <input
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase().slice(0, 6)); setError(''); setSuccess(''); }}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          placeholder="ABC123"
          maxLength={6}
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-mono tracking-widest text-center uppercase focus:outline-none transition-colors"
          onFocus={e => e.target.style.borderColor = '#16a34a'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
        {error   && <p className="text-xs text-red-500">{error}</p>}
        {success && <p className="text-xs text-green-600 font-medium">{success}</p>}
        <button
          onClick={handleJoin}
          disabled={loading || code.length < 6}
          className="w-full py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50 transition-all"
          style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}
        >
          {loading ? 'Verificando...' : 'Unirse a la empresa'}
        </button>
      </div>
    </div>
  );
}

// ─── Sub-menú: Entidad ────────────────────────────────────────────────────────

function TabEntidad({ user }) {
  const { config, isLoading, isSaving, saveConfig } = useConfiguracion(user);
  const tenantName = useAppStore(s => s.tenantName);
  const tenantRuc  = useAppStore(s => s.tenantRuc);

  const [form, setForm] = useState({
    empresaNombre: '', ruc: '', empresaSlogan: '',
    whatsappNumero: '', whatsappPrefijo: '593', logoUrl: '',
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState('');
  const fileInputRef                  = useRef(null);

  useEffect(() => {
    setForm({
      empresaNombre:   config?.empresaNombre   || tenantName || '',
      ruc:             config?.ruc             || tenantRuc  || '',
      empresaSlogan:   config?.empresaSlogan   || '',
      whatsappNumero:  config?.whatsappNumero  || '',
      whatsappPrefijo: config?.whatsappPrefijo || '593',
      logoUrl:         config?.logoUrl         || '',
    });
    setLogoPreview(config?.logoUrl || '');
  }, [config, tenantName, tenantRuc]);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setSaved(false); setError('');
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { setError('El logotipo no debe superar los 500 KB.'); return; }
    if (!file.type.startsWith('image/')) { setError('Solo se permiten archivos de imagen (PNG, JPG, SVG, WebP).'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target.result);
      setForm(prev => ({ ...prev, logoUrl: ev.target.result }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setForm(prev => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getWhatsAppFull = () => {
    const raw = form.whatsappNumero.replace(/\D/g, '');
    if (!raw) return '';
    const num = raw.startsWith('0') ? raw.slice(1) : raw;
    return `+${form.whatsappPrefijo}${num}`;
  };

  const handleSave = async () => {
    const raw = form.whatsappNumero.replace(/\D/g, '');
    if (raw && raw.replace(/^0/, '').length < 7) {
      setError('El número de teléfono debe tener al menos 7 dígitos.'); return;
    }
    const ok = await saveConfig(form);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else setError('Error al guardar. Verifica tu conexión.');
  };

  const inp = "w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors bg-white";
  const lbl = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5";

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <img src="/logo.png" alt="Acontplus" className="w-12 h-12 mx-auto mb-3 animate-bounce" />
        <p className="text-sm text-slate-400">Cargando configuración...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Datos de la empresa */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-3"
          style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff7ed)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
            <Building2 size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">Datos de la empresa</p>
            <p className="text-xs text-slate-400">Se muestran en el encabezado y documentos</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={lbl}>Nombre de la empresa</label>
            <input type="text" value={form.empresaNombre} onChange={handleChange('empresaNombre')}
              placeholder="Ej: Mi Empresa S.A." className={inp}
              onFocus={e => e.target.style.borderColor = '#D61672'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>
          <div>
            <label className={lbl}>RUC</label>
            <input type="text" value={form.ruc}
              onChange={e => setForm(prev => ({ ...prev, ruc: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
              placeholder="0000000000001" maxLength={13} className={`${inp} font-mono`}
              onFocus={e => e.target.style.borderColor = '#D61672'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>
          <div>
            <label className={lbl}>Slogan / descripción corta</label>
            <input type="text" value={form.empresaSlogan} onChange={handleChange('empresaSlogan')}
              placeholder="Ej: Facturar nunca fue tan fácil" className={inp}
              onFocus={e => e.target.style.borderColor = '#D61672'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>
        </div>
      </div>

      {/* Logotipo */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-3"
          style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff7ed)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
            <Image size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">Logotipo de la empresa</p>
            <p className="text-xs text-slate-400">PNG, JPG o SVG · Máximo 500 KB</p>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              <div className={`w-28 h-28 rounded-2xl border-2 flex items-center justify-center overflow-hidden transition-all ${
                logoPreview ? 'border-pink-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50'}`}>
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                  : <div className="text-center text-slate-300"><Image size={32} className="mx-auto mb-1" /><p className="text-[10px]">Sin logo</p></div>}
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">Vista previa</p>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-upload" />
                <label htmlFor="logo-upload"
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all w-full justify-center border-2 border-dashed border-slate-300 hover:border-pink-400 hover:bg-pink-50 text-slate-500 hover:text-pink-600">
                  <Upload size={16} /><span>Seleccionar imagen</span>
                </label>
              </div>
              {logoPreview && (
                <button onClick={handleRemoveLogo}
                  className="w-full px-4 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors">
                  Quitar logo
                </button>
              )}
              <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-600 leading-relaxed">
                  El logo se guarda en la base de datos y se usa en los documentos PDF y en la app. Recomendado: fondo transparente (PNG) o blanco, tamaño cuadrado.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className={lbl}>O ingresar URL de imagen externa</label>
            <input type="url" value={form.logoUrl?.startsWith('http') ? form.logoUrl : ''}
              onChange={e => { setForm(prev => ({ ...prev, logoUrl: e.target.value })); setLogoPreview(e.target.value); }}
              placeholder="https://ejemplo.com/logo.png" className={inp}
              onFocus={e => e.target.style.borderColor = '#D61672'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-3"
          style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500">
            <Phone size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">Número para notificaciones WhatsApp</p>
            <p className="text-xs text-slate-400">Se usará para enviar alertas y fichas de visita</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>País</label>
              <select value={form.whatsappPrefijo} onChange={handleChange('whatsappPrefijo')}
                className={`${inp} bg-white`}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                <option value="593">🇪🇨 +593 Ecuador</option>
                <option value="57">🇨🇴 +57 Colombia</option>
                <option value="51">🇵🇪 +51 Perú</option>
                <option value="56">🇨🇱 +56 Chile</option>
                <option value="54">🇦🇷 +54 Argentina</option>
                <option value="52">🇲🇽 +52 México</option>
                <option value="1">🇺🇸 +1 EE.UU./Canadá</option>
                <option value="34">🇪🇸 +34 España</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={lbl}>Número de teléfono</label>
              <input type="tel" value={form.whatsappNumero} onChange={handleChange('whatsappNumero')}
                placeholder="Ej: 0987654321" className={`${inp} font-mono`}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
          </div>
          {form.whatsappNumero && (
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <Phone size={14} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">Número completo para WhatsApp:</p>
                <p className="text-sm font-bold text-green-800 font-mono">{getWhatsAppFull()}</p>
              </div>
              <a href={`https://wa.me/${getWhatsAppFull().replace('+', '')}`} target="_blank" rel="noopener noreferrer"
                className="ml-auto text-xs font-semibold text-green-600 hover:text-green-700 underline flex-shrink-0">
                Probar →
              </a>
            </div>
          )}
          <div className="flex items-start space-x-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <Bell size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Este número se usará por defecto al enviar notificaciones de visitas por WhatsApp cuando el cliente no tenga teléfono registrado.
            </p>
          </div>
        </div>
      </div>

      {/* Mensajes y botón guardar */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-xl border border-red-200">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {saved && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-xl border border-green-200">
          <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">Configuración guardada correctamente.</p>
        </div>
      )}
      <div className="flex justify-end pb-2">
        <button onClick={handleSave} disabled={isSaving}
          className="flex items-center space-x-2 px-8 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-95 shadow-sm"
          style={{ background: isSaving ? '#94a3b8' : 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          {isSaving
            ? <><span className="animate-spin">⏳</span><span>Guardando...</span></>
            : <><Save size={16} /><span>Guardar configuración</span></>}
        </button>
      </div>

      <JoinAnotherSection />
      <JoinCodeSection />
    </div>
  );
}

// ─── Sub-menú: Notificaciones ─────────────────────────────────────────────────

const NOTIF_DEFAULT = { tecnico: true, cliente: false, creador: false, otros: false, otrosEmails: [] };

function NotifGroup({ label, icon, value, onChange, accent = '#D61672' }) {
  const [newEmail, setNewEmail] = useState('');
  const [emailErr, setEmailErr] = useState('');

  const RECIPIENTS = [
    { key: 'tecnico', emoji: '👷', label: 'Técnico' },
    { key: 'cliente', emoji: '👤', label: 'Cliente' },
    { key: 'creador', emoji: '✍️', label: 'Creador' },
    { key: 'otros',   emoji: '📧', label: 'Otros' },
  ];

  const toggle = (key) => onChange({ ...value, [key]: !value[key] });

  const addEmail = () => {
    const e = newEmail.trim().toLowerCase();
    if (!e.includes('@')) { setEmailErr('Email inválido'); return; }
    const list = value.otrosEmails || [];
    if (list.includes(e)) { setEmailErr('Ya está en la lista'); return; }
    onChange({ ...value, otrosEmails: [...list, e] });
    setNewEmail(''); setEmailErr('');
  };

  const removeEmail = (email) =>
    onChange({ ...value, otrosEmails: (value.otrosEmails || []).filter(e => e !== email) });

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <p className="text-sm font-bold text-slate-700">{label}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {RECIPIENTS.map(r => (
          <label key={r.key} className="flex items-center gap-1.5 cursor-pointer select-none
            px-3 py-1.5 rounded-lg border-2 transition-all"
            style={{
              borderColor: value[r.key] ? accent : '#e2e8f0',
              background:  value[r.key] ? `${accent}10` : 'white',
            }}>
            <input type="checkbox" checked={!!value[r.key]} onChange={() => toggle(r.key)}
              className="w-3.5 h-3.5 rounded" style={{ accentColor: accent }} />
            <span className="text-xs font-semibold text-slate-700">{r.emoji} {r.label}</span>
          </label>
        ))}
      </div>
      {value.otros && (
        <div className="mt-3 space-y-2">
          {/* Chips de correos agregados */}
          {(value.otrosEmails || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(value.otrosEmails || []).map(email => (
                <span key={email} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border"
                  style={{ background: `${accent}10`, borderColor: `${accent}40`, color: accent }}>
                  {email}
                  <button type="button" onClick={() => removeEmail(email)}
                    className="ml-0.5 hover:opacity-70 transition-opacity">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {/* Input agregar */}
          <div className="flex gap-2">
            <input type="email" value={newEmail}
              onChange={e => { setNewEmail(e.target.value); setEmailErr(''); }}
              onKeyDown={e => e.key === 'Enter' && addEmail()}
              placeholder="correo@ejemplo.com"
              className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = accent}
              onBlur={e  => e.target.style.borderColor = '#e2e8f0'} />
            <button type="button" onClick={addEmail}
              className="px-3 py-2 rounded-xl text-white text-xs font-bold flex-shrink-0"
              style={{ background: accent }}>
              Agregar
            </button>
          </div>
          {emailErr && <p className="text-xs text-red-500">{emailErr}</p>}
        </div>
      )}
    </div>
  );
}

function TabNotificaciones({ user }) {
  const { config, isLoading, isSaving, saveConfig } = useConfiguracion(user);

  const [agendaHoy,    setAgendaHoy]    = useState({ activo: false, hora: 7,  destinatarios: [] });
  const [agendaMañana, setAgendaMañana] = useState({ activo: false, hora: 20, destinatarios: [] });
  const [incluirAtrasadas, setIncluirAtrasadas] = useState(false);

  const [newAgendaHoy,    setNewAgendaHoy]    = useState('');
  const [newAgendaMañana, setNewAgendaMañana] = useState('');
  const [emailErr,        setEmailErr]        = useState('');
  const [saved,           setSaved]           = useState(false);
  const [error,           setError]           = useState('');

  const [notifPre,    setNotifPre]    = useState({ activo: false, minutosAntes: 30,   destinatarios: ['tecnico'] });
  const [notifRetard, setNotifRetard] = useState({ activo: false, minutosRetraso: 30, destinatarios: ['admin']   });

  const [notifCreada,      setNotifCreada]      = useState(NOTIF_DEFAULT);
  const [notifModificada,  setNotifModificada]  = useState(NOTIF_DEFAULT);
  const [notifConfirmada,  setNotifConfirmada]  = useState(NOTIF_DEFAULT);
  const [notifRealizada,   setNotifRealizada]   = useState(NOTIF_DEFAULT);

  useEffect(() => {
    if (!config) return;
    setAgendaHoy(prev => ({ ...prev, ...(config.agendaHoy || {}) }));
    setAgendaMañana(prev => ({ ...prev, ...(config.agendaMañana || {}) }));
    setIncluirAtrasadas(!!config.incluirAtrasadas);
    if (config.notifPrevisita) setNotifPre(prev => ({ ...prev, ...config.notifPrevisita }));
    if (config.notifRetraso)   setNotifRetard(prev => ({ ...prev, ...config.notifRetraso }));
    if (config.notifCreada)     setNotifCreada(prev     => ({ ...NOTIF_DEFAULT, ...config.notifCreada }));
    if (config.notifModificada) setNotifModificada(prev => ({ ...NOTIF_DEFAULT, ...config.notifModificada }));
    if (config.notifConfirmada) setNotifConfirmada(prev => ({ ...NOTIF_DEFAULT, ...config.notifConfirmada }));
    if (config.notifRealizada)  setNotifRealizada(prev  => ({ ...NOTIF_DEFAULT, ...config.notifRealizada }));
  }, [config]);

  const handleSave = async () => {
    setError('');
    const ok = await saveConfig({
      agendaHoy,
      agendaMañana,
      incluirAtrasadas,
      notifPrevisita:  notifPre,
      notifRetraso:    notifRetard,
      notifCreada,
      notifModificada,
      notifConfirmada,
      notifRealizada,
    });
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else setError('Error al guardar. Verifica tu conexión.');
  };

  const HORAS = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${String(i).padStart(2, '0')}:00`,
  }));

  const inp = "w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors bg-white";
  const lbl = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5";

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <img src="/logo.png" alt="Acontplus" className="w-12 h-12 mx-auto mb-3 animate-bounce" />
        <p className="text-sm text-slate-400">Cargando configuración...</p>
      </div>
    </div>
  );

  const EmailList = ({ list, onRemove, value, onChange, onAdd, placeholder }) => (
    <div className="space-y-3">
      {list.length > 0 ? (
        <div className="space-y-2">
          {list.map(email => (
            <div key={email} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-sm text-slate-700 font-mono">{email}</span>
              <button onClick={() => onRemove(email)} className="ml-2 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 text-center py-1">Sin correos configurados</p>
      )}
      <div className="flex gap-2">
        <input type="email" value={value}
          onChange={e => { onChange(e.target.value); setEmailErr(''); setSaved(false); }}
          onKeyDown={e => e.key === 'Enter' && onAdd()}
          placeholder={placeholder || 'correo@ejemplo.com'}
          className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
          onFocus={e => e.target.style.borderColor = '#D61672'}
          onBlur={e => e.target.style.borderColor  = '#e2e8f0'} />
        <button onClick={onAdd}
          className="px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          Agregar
        </button>
      </div>
      {emailErr && <p className="text-xs text-red-500">{emailErr}</p>}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Agenda del día actual */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff7ed)' }}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              <Clock size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Agenda del día actual</p>
              <p className="text-xs text-slate-400">Envía las visitas programadas para hoy</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`relative w-11 h-6 rounded-full transition-colors ${agendaHoy.activo ? 'bg-pink-500' : 'bg-slate-300'}`}
              onClick={() => { setAgendaHoy(p => ({ ...p, activo: !p.activo })); setSaved(false); }}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${agendaHoy.activo ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{agendaHoy.activo ? 'Activa' : 'Inactiva'}</span>
          </label>
        </div>
        {agendaHoy.activo && (
          <div className="p-6 space-y-5">
            <div>
              <label className={lbl}>Hora de envío (Ecuador UTC-5)</label>
              <select value={agendaHoy.hora}
                onChange={e => { setAgendaHoy(p => ({ ...p, hora: Number(e.target.value) })); setSaved(false); }}
                className={`${inp} bg-white`}
                onFocus={e => e.target.style.borderColor = '#D61672'}
                onBlur={e => e.target.style.borderColor  = '#e2e8f0'}>
                {HORAS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Destinatarios adicionales</label>
              <p className="text-xs text-slate-400 mb-3">Reciben la agenda completa de todos los técnicos</p>
              <EmailList
                list={agendaHoy.destinatarios}
                onRemove={email => { setAgendaHoy(p => ({ ...p, destinatarios: p.destinatarios.filter(e => e !== email) })); setSaved(false); }}
                value={newAgendaHoy} onChange={setNewAgendaHoy}
                onAdd={() => {
                  const e = newAgendaHoy.trim().toLowerCase();
                  if (!e.includes('@')) { setEmailErr('Ingresa un email válido.'); return; }
                  if (agendaHoy.destinatarios.includes(e)) { setEmailErr('Este correo ya está en la lista.'); return; }
                  setAgendaHoy(p => ({ ...p, destinatarios: [...p.destinatarios, e] }));
                  setNewAgendaHoy(''); setEmailErr(''); setSaved(false);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Agenda del día siguiente */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff7ed)' }}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              <Clock size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Agenda del día siguiente</p>
              <p className="text-xs text-slate-400">Envía las visitas programadas para mañana</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`relative w-11 h-6 rounded-full transition-colors ${agendaMañana.activo ? 'bg-pink-500' : 'bg-slate-300'}`}
              onClick={() => { setAgendaMañana(p => ({ ...p, activo: !p.activo })); setSaved(false); }}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${agendaMañana.activo ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{agendaMañana.activo ? 'Activa' : 'Inactiva'}</span>
          </label>
        </div>
        {agendaMañana.activo && (
          <div className="p-6 space-y-5">
            <div>
              <label className={lbl}>Hora de envío (Ecuador UTC-5)</label>
              <select value={agendaMañana.hora}
                onChange={e => { setAgendaMañana(p => ({ ...p, hora: Number(e.target.value) })); setSaved(false); }}
                className={`${inp} bg-white`}
                onFocus={e => e.target.style.borderColor = '#D61672'}
                onBlur={e => e.target.style.borderColor  = '#e2e8f0'}>
                {HORAS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Destinatarios adicionales</label>
              <p className="text-xs text-slate-400 mb-3">Reciben la agenda completa de todos los técnicos</p>
              <EmailList
                list={agendaMañana.destinatarios}
                onRemove={email => { setAgendaMañana(p => ({ ...p, destinatarios: p.destinatarios.filter(e => e !== email) })); setSaved(false); }}
                value={newAgendaMañana} onChange={setNewAgendaMañana}
                onAdd={() => {
                  const e = newAgendaMañana.trim().toLowerCase();
                  if (!e.includes('@')) { setEmailErr('Ingresa un email válido.'); return; }
                  if (agendaMañana.destinatarios.includes(e)) { setEmailErr('Este correo ya está en la lista.'); return; }
                  setAgendaMañana(p => ({ ...p, destinatarios: [...p.destinatarios, e] }));
                  setNewAgendaMañana(''); setEmailErr(''); setSaved(false);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Incluir visitas atrasadas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff7ed)' }}>
          <label className="flex items-start gap-4 cursor-pointer">
            <input type="checkbox" checked={incluirAtrasadas}
              onChange={e => { setIncluirAtrasadas(e.target.checked); setSaved(false); }}
              className="mt-0.5 w-4 h-4 rounded accent-pink-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-700">Incluir visitas atrasadas en la agenda</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Si está activo, al final de cada agenda se lista las visitas con fecha vencida.
                Los técnicos solo ven sus propias visitas atrasadas.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Notificaciones de eventos de visita */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-3"
          style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff7ed)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
            <Bell size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">Notificaciones de eventos de visita</p>
            <p className="text-xs text-slate-400">Elige quién recibe aviso en cada tipo de evento</p>
          </div>
        </div>
        <div className="px-6 py-4 divide-y divide-slate-100">
          <NotifGroup
            label="Visita creada"
            icon="🆕"
            value={notifCreada}
            onChange={v => { setNotifCreada(v); setSaved(false); }}
          />
          <NotifGroup
            label="Visita modificada"
            icon="✏️"
            value={notifModificada}
            onChange={v => { setNotifModificada(v); setSaved(false); }}
          />
          <NotifGroup
            label="Visita confirmada"
            icon="✅"
            value={notifConfirmada}
            onChange={v => { setNotifConfirmada(v); setSaved(false); }}
          />
          <NotifGroup
            label="Visita realizada"
            icon="🏁"
            value={notifRealizada}
            onChange={v => { setNotifRealizada(v); setSaved(false); }}
          />
        </div>
      </div>

      {/* Notificación pre-visita */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff7ed)' }}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              <Bell size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Notificación pre-visita</p>
              <p className="text-xs text-slate-400">Avisa minutos antes de la hora programada de la visita</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`relative w-11 h-6 rounded-full transition-colors ${notifPre.activo ? 'bg-pink-500' : 'bg-slate-300'}`}
              onClick={() => { setNotifPre(p => ({ ...p, activo: !p.activo })); setSaved(false); }}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifPre.activo ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{notifPre.activo ? 'Activo' : 'Inactivo'}</span>
          </label>
        </div>
        {notifPre.activo && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Minutos antes</label>
                <input type="number" min={5} max={120}
                  value={notifPre.minutosAntes}
                  onChange={e => { setNotifPre(p => ({ ...p, minutosAntes: Number(e.target.value) })); setSaved(false); }}
                  className={`${inp} font-mono`}
                  onFocus={e => e.target.style.borderColor = '#D61672'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label className={lbl}>Destinatarios</label>
                <div className="flex flex-col gap-2 mt-1">
                  {[{ key: 'tecnico', label: '👷 Técnico' }, { key: 'admin', label: '👤 Admin' }].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox"
                        checked={notifPre.destinatarios.includes(key)}
                        onChange={e => {
                          setNotifPre(p => ({
                            ...p,
                            destinatarios: e.target.checked
                              ? [...p.destinatarios, key]
                              : p.destinatarios.filter(d => d !== key),
                          }));
                          setSaved(false);
                        }}
                        className="w-4 h-4 rounded accent-pink-600" />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
              <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-600 leading-relaxed">
                El técnico recibirá un botón <strong>«Confirmar mi asistencia»</strong> en el email.
                Al hacer clic queda registrado en la visita.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notificación de retraso */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff7ed)' }}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500">
              <Clock size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Notificación de retraso</p>
              <p className="text-xs text-slate-400">Alerta cuando la visita lleva X minutos sin registrarse</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`relative w-11 h-6 rounded-full transition-colors ${notifRetard.activo ? 'bg-red-500' : 'bg-slate-300'}`}
              onClick={() => { setNotifRetard(p => ({ ...p, activo: !p.activo })); setSaved(false); }}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifRetard.activo ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{notifRetard.activo ? 'Activo' : 'Inactivo'}</span>
          </label>
        </div>
        {notifRetard.activo && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Minutos de retraso</label>
                <input type="number" min={5} max={240}
                  value={notifRetard.minutosRetraso}
                  onChange={e => { setNotifRetard(p => ({ ...p, minutosRetraso: Number(e.target.value) })); setSaved(false); }}
                  className={`${inp} font-mono`}
                  onFocus={e => e.target.style.borderColor = '#dc2626'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label className={lbl}>Destinatarios</label>
                <div className="flex flex-col gap-2 mt-1">
                  {[{ key: 'tecnico', label: '👷 Técnico' }, { key: 'admin', label: '👤 Admin' }].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox"
                        checked={notifRetard.destinatarios.includes(key)}
                        onChange={e => {
                          setNotifRetard(p => ({
                            ...p,
                            destinatarios: e.target.checked
                              ? [...p.destinatarios, key]
                              : p.destinatarios.filter(d => d !== key),
                          }));
                          setSaved(false);
                        }}
                        className="w-4 h-4 rounded accent-red-600" />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-xl border border-red-200">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {saved && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-xl border border-green-200">
          <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">Configuración guardada correctamente.</p>
        </div>
      )}
      <div className="flex justify-end pb-2">
        <button onClick={handleSave} disabled={isSaving}
          className="flex items-center space-x-2 px-8 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-95 shadow-sm"
          style={{ background: isSaving ? '#94a3b8' : 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          {isSaving
            ? <><span className="animate-spin">⏳</span><span>Guardando...</span></>
            : <><Save size={16} /><span>Guardar configuración</span></>}
        </button>
      </div>
    </div>
  );
}

// ─── Sub-menú: Catálogos ──────────────────────────────────────────────────────

function TabCatalogos({ user }) {
  const [showTecnicos,     setShowTecnicos]     = useState(false);
  const [showServiceTypes, setShowServiceTypes] = useState(false);
  const [showTiposVisita,  setShowTiposVisita]  = useState(false);
  const [showUsers,        setShowUsers]        = useState(false);

  const cards = [
    {
      label: 'Técnicos',
      description: 'Agrega y gestiona los técnicos del equipo',
      icon: <Wrench size={22} />,
      color: '#2563eb',
      bg: '#dbeafe',
      onClick: () => setShowTecnicos(true),
    },
    {
      label: 'Tipos de servicio',
      description: 'Define los tipos de servicio que ofrece la empresa',
      icon: <Package size={22} />,
      color: '#D61672',
      bg: '#fce7f3',
      onClick: () => setShowServiceTypes(true),
    },
    {
      label: 'Tipos de visita',
      description: 'Define las categorías de visitas técnicas',
      icon: <CalendarCheck size={22} />,
      color: '#7c3aed',
      bg: '#ede9fe',
      onClick: () => setShowTiposVisita(true),
    },
    {
      label: 'Usuarios y roles',
      description: 'Asigna roles de admin o técnico a cada usuario',
      icon: <Users size={22} />,
      color: '#0f766e',
      bg: '#ccfbf1',
      onClick: () => setShowUsers(true),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(c => (
          <button key={c.label} onClick={c.onClick}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border-2 border-slate-200 hover:shadow-md transition-all text-left group"
            onMouseEnter={e => e.currentTarget.style.borderColor = c.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
              style={{ background: c.bg, color: c.color }}>
              {c.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{c.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>
            </div>
          </button>
        ))}
      </div>

      {showTecnicos     && <TecnicosForm        user={user} onClose={() => setShowTecnicos(false)} />}
      {showServiceTypes && <ServiceTypesManager  user={user} onClose={() => setShowServiceTypes(false)} />}
      {showTiposVisita  && <TiposVisitaManager   user={user} onClose={() => setShowTiposVisita(false)} />}
      {showUsers        && <UsersManager                     onClose={() => setShowUsers(false)} />}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

const SUB_TABS = [
  { id: 'entidad',         label: 'Entidad',        icon: <Building2 size={15} /> },
  { id: 'catalogos',       label: 'Catálogos',      icon: <Package   size={15} /> },
  { id: 'notificaciones',  label: 'Notificaciones', icon: <Bell      size={15} /> },
];

export default function Configuracion({ user }) {
  const [subTab, setSubTab] = useState('entidad');

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configuración</h2>
        <p className="text-sm text-slate-500 mt-0.5">Administra tu empresa, catálogos y más</p>
      </div>

      {/* Sub-navegación */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              subTab === t.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Contenido del sub-menú activo */}
      {subTab === 'entidad'        && <TabEntidad        user={user} />}
      {subTab === 'catalogos'      && <TabCatalogos      user={user} />}
      {subTab === 'notificaciones' && <TabNotificaciones user={user} />}

    </div>
  );
}
