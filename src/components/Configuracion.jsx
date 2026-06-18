// src/components/Configuracion.jsx
import { useState, useEffect, useRef } from 'react';
import {
  Phone, Save, CheckCircle, AlertCircle,
  Upload, Image, Building2, Bell, Info, Users, Copy
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import { useConfiguracion } from '../hooks/useConfiguracion.js';

function JoinCodeSection() {
  const tenantId   = useAppStore(s => s.tenantId);
  const [code,     setCode]    = useState('');
  const [copied,   setCopied]  = useState(false);
  const [loading,  setLoading] = useState(true);

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

export default function Configuracion({ user }) {
  const { config, isLoading, isSaving, saveConfig } = useConfiguracion(user);
  const tenantName = useAppStore(s => s.tenantName);
  const tenantRuc  = useAppStore(s => s.tenantRuc);

  const [form, setForm]         = useState({
    empresaNombre:   '',
    ruc:             '',
    empresaSlogan:   '',
    whatsappNumero:  '',
    whatsappPrefijo: '593',
    logoUrl:         '',
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState('');
  const fileInputRef                  = useRef(null);

  // Cargar config existente; usa tenantName/tenantRuc como fallback si el doc aún no tiene valor
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
    setSaved(false);
    setError('');
  };

  // Convertir imagen a base64 para guardarla en Firestore
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      setError('El logotipo no debe superar los 500 KB. Reduce el tamaño de la imagen.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setLogoPreview(base64);
      setForm(prev => ({ ...prev, logoUrl: base64 }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setForm(prev => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Validar y formatear número WhatsApp
  const getWhatsAppFull = () => {
    const raw = form.whatsappNumero.replace(/\D/g, '');
    if (!raw) return '';
    const num = raw.startsWith('0') ? raw.slice(1) : raw;
    return `+${form.whatsappPrefijo}${num}`;
  };

  const validate = () => {
    const raw = form.whatsappNumero.replace(/\D/g, '');
    if (raw && raw.replace(/^0/, '').length < 7) {
      setError('El número de teléfono debe tener al menos 7 dígitos.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const ok = await saveConfig(form);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError('Error al guardar. Verifica tu conexión.');
    }
  };

  const inp = "w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors bg-white";
  const lbl = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <img src="/logo.png" alt="Acontplus" className="w-12 h-12 mx-auto mb-3 animate-bounce" />
          <p className="text-sm text-slate-400">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configuración</h2>
        <p className="text-sm text-slate-500 mt-0.5">Personaliza tu empresa y datos de notificaciones</p>
      </div>

      {/* ── SECCIÓN: Datos de la empresa ── */}
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
            <input
              type="text"
              value={form.empresaNombre}
              onChange={handleChange('empresaNombre')}
              placeholder="Ej: Mi Empresa S.A."
              className={inp}
              onFocus={e => e.target.style.borderColor = '#D61672'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div>
            <label className={lbl}>RUC</label>
            <input
              type="text"
              value={form.ruc}
              onChange={e => setForm(prev => ({ ...prev, ruc: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
              placeholder="0000000000001"
              maxLength={13}
              className={`${inp} font-mono`}
              onFocus={e => e.target.style.borderColor = '#D61672'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div>
            <label className={lbl}>Slogan / descripción corta</label>
            <input
              type="text"
              value={form.empresaSlogan}
              onChange={handleChange('empresaSlogan')}
              placeholder="Ej: Facturar nunca fue tan fácil"
              className={inp}
              onFocus={e => e.target.style.borderColor = '#D61672'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        </div>
      </div>

      {/* ── SECCIÓN: Logotipo ── */}
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
          {/* Preview del logo */}
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              <div className={`w-28 h-28 rounded-2xl border-2 flex items-center justify-center overflow-hidden transition-all ${
                logoPreview ? 'border-pink-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50'
              }`}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-center text-slate-300">
                    <Image size={32} className="mx-auto mb-1" />
                    <p className="text-[10px]">Sin logo</p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">Vista previa</p>
            </div>

            <div className="flex-1 space-y-3">
              {/* Botón subir */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all w-full justify-center border-2 border-dashed border-slate-300 hover:border-pink-400 hover:bg-pink-50 text-slate-500 hover:text-pink-600">
                  <Upload size={16} />
                  <span>Seleccionar imagen</span>
                </label>
              </div>

              {logoPreview && (
                <button
                  onClick={handleRemoveLogo}
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

          {/* URL externa (alternativa) */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className={lbl}>O ingresar URL de imagen externa</label>
            <input
              type="url"
              value={form.logoUrl?.startsWith('http') ? form.logoUrl : ''}
              onChange={(e) => {
                const url = e.target.value;
                setForm(prev => ({ ...prev, logoUrl: url }));
                setLogoPreview(url);
              }}
              placeholder="https://ejemplo.com/logo.png"
              className={inp}
              onFocus={e => e.target.style.borderColor = '#D61672'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        </div>
      </div>

      {/* ── SECCIÓN: Notificaciones WhatsApp ── */}
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
            {/* Prefijo de país */}
            <div>
              <label className={lbl}>País</label>
              <select
                value={form.whatsappPrefijo}
                onChange={handleChange('whatsappPrefijo')}
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

            {/* Número */}
            <div className="col-span-2">
              <label className={lbl}>Número de teléfono</label>
              <input
                type="tel"
                value={form.whatsappNumero}
                onChange={handleChange('whatsappNumero')}
                placeholder="Ej: 0987654321"
                className={`${inp} font-mono`}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {/* Preview del número completo */}
          {form.whatsappNumero && (
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <Phone size={14} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">Número completo para WhatsApp:</p>
                <p className="text-sm font-bold text-green-800 font-mono">{getWhatsAppFull()}</p>
              </div>
              <a
                href={`https://wa.me/${getWhatsAppFull().replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs font-semibold text-green-600 hover:text-green-700 underline flex-shrink-0">
                Probar →
              </a>
            </div>
          )}

          {/* Nota informativa */}
          <div className="flex items-start space-x-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <Bell size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Este número se usará por defecto al enviar notificaciones de visitas por WhatsApp cuando el cliente no tenga teléfono registrado.
            </p>
          </div>
        </div>
      </div>

      {/* ── Mensajes de estado ── */}
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

      {/* ── Botón guardar ── */}
      <div className="flex justify-end pb-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-8 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-95 shadow-sm"
          style={{ background: isSaving ? '#94a3b8' : 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          {isSaving ? (
            <><span className="animate-spin">⏳</span><span>Guardando...</span></>
          ) : (
            <><Save size={16} /><span>Guardar configuración</span></>
          )}
        </button>
      </div>

      {/* ── SECCIÓN: Código de invitación ── */}
      <JoinCodeSection />

    </div>
  );
}
