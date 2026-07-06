import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X, Upload, Download, CheckCircle, AlertCircle,
  Loader2, FileText, Trash2, Users, MapPin
} from 'lucide-react';
import { normalizeRow, groupRowsByClient, validateGroup } from '../utils/importValidation.js';

// ─── Paso 1: Plantilla Excel ───────────────────────────────────────────────────
// Orden: RUC | NOMBRE | UBICACION | CIUDAD | EMAIL | DIRECCION | TELEFONO | EQUIPO | OBSERVACION
// Un mismo RUC en varias filas = varias ubicaciones del mismo cliente.
function downloadTemplate() {
  const headers = ['RUC', 'NOMBRE', 'UBICACION', 'CIUDAD', 'EMAIL', 'DIRECCION', 'TELEFONO', 'EQUIPO', 'OBSERVACION'];
  const example = [
    ['1712345678',    'Juan Pérez',       'Casa',          'Quito',      'juan@email.com', 'Av. Principal 123',     '0991234567', '', 'Ozono'],
    ['1790123456001', 'Empresa ABC S.A.', 'Oficina matriz','Guayaquil',  '',               'Calle 5 de Junio 456',  '022345678',  '', 'Osmosis'],
    ['1790123456001', 'Empresa ABC S.A.', 'Bodega norte',  'Guayaquil',  '',               'Av. Norte km 5',        '022345678',  '', 'Lechos filtrantes'],
  ];
  const csv = [headers, ...example]
    .map(r => r.map(c => `"${c}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'plantilla_clientes.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Parsear Excel/CSV usando SheetJS — lee TODAS las hojas del libro ────────
function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: 'array' });
        const rows = wb.SheetNames.flatMap(name =>
          XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '', raw: false })
        );
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ClientImportModal({ existingClients, onImport, onClose }) {
  const [step,        setStep]        = useState('upload');
  const [rows,        setRows]        = useState([]);
  const [isParsing,   setIsParsing]   = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress,    setProgress]    = useState({ done: 0, total: 0 });
  const [result,      setResult]      = useState(null);
  const [dragOver,    setDragOver]    = useState(false);
  const [parseError,  setParseError]  = useState('');
  const fileRef = useRef();

  const existingIds = new Set(existingClients.map(c => c.identification?.replace(/\s/g, '')));

  const groups = groupRowsByClient(rows).map(g => ({ ...g, ...validateGroup(g, existingIds) }));
  const validGroups   = groups.filter(g => g.valid);
  const existingCount = groups.filter(g => g.existing).length;
  const errorCount    = groups.filter(g => !g.valid && !g.existing).length;
  const totalUbicaciones = validGroups.reduce((s, g) => s + g.rows.length, 0);

  const handleFile = async (file) => {
    if (!file) return;
    setIsParsing(true);
    setParseError('');
    try {
      const raw        = await parseFile(file);
      const normalized = raw.map(normalizeRow).filter(r => r.name || r.identification);
      setRows(normalized);
      setStep('preview');
    } catch {
      setParseError('No se pudo leer el archivo. Asegúrate de que sea .xlsx o .csv válido.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Elimina una fila (ubicación) individual del archivo — opera antes de agrupar
  const handleRemoveRow = (rowIndex) => setRows(prev => prev.filter((_, i) => i + 1 !== rowIndex));

  const handleConfirmImport = async () => {
    setProgress({ done: 0, total: validGroups.length });
    setIsImporting(true);
    const res = await onImport(validGroups, (done, total) => {
      setProgress({ done, total });
    });
    setResult(res);
    setStep('result');
    setIsImporting(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="px-5 py-4 text-white flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          <div>
            <h3 className="font-bold text-base">Importar clientes desde Excel</h3>
            <p className="text-xs opacity-80 mt-0.5">
              {step === 'upload'  && 'Sube tu archivo .xlsx o .csv'}
              {step === 'preview' && `${rows.length} filas · ${groups.length} clientes · ${validGroups.length} nuevos`}
              {step === 'result'  && 'Importación completada'}
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 text-white opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-20 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── Subir archivo ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <FileText size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800">Paso 1 — Descarga la plantilla</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Columnas obligatorias:
                    <span className="font-bold ml-1">RUC · Nombre</span>
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Columnas opcionales:
                    <span className="font-bold ml-1">Ubicacion · Ciudad · Email · Direccion · Telefono · Equipo · Observacion</span>
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    • Si un cliente tiene <strong>varias ubicaciones</strong>, repite su RUC en una fila por cada una — se agrupan automáticamente en un solo cliente.<br/>
                    • El archivo puede tener <strong>varias hojas</strong>; se leen todas.<br/>
                    • <strong>RUC</strong>: acepta cédula/RUC real o un código propio si el cliente no tiene uno registrado.
                  </p>
                </div>
                <button onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-lg flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                  <Download size={13} />Plantilla
                </button>
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-pink-400 bg-pink-50' : 'border-slate-200 hover:border-pink-300 hover:bg-pink-50'
                }`}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => handleFile(e.target.files[0])} />
                {isParsing ? (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Loader2 size={32} className="animate-spin" style={{ color: '#D61672' }} />
                    <p className="text-sm font-medium">Procesando archivo...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Upload size={36} className={dragOver ? 'text-pink-500' : ''} />
                    <p className="text-sm font-semibold text-slate-600">Arrastra tu archivo aquí</p>
                    <p className="text-xs">o haz clic para seleccionarlo</p>
                    <p className="text-xs mt-1 text-slate-300">Formatos: .xlsx, .xls, .csv</p>
                  </div>
                )}
              </div>

              {parseError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700 font-medium">{parseError}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Vista previa ── */}
          {step === 'preview' && (
            <div className="space-y-3">

              {/* KPIs */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Filas',      value: rows.length,       color: 'text-slate-700',  bg: 'bg-slate-50'  },
                  { label: 'Clientes',   value: groups.length,     color: 'text-slate-700',  bg: 'bg-slate-50'  },
                  { label: 'Nuevos',     value: validGroups.length,color: 'text-green-700',  bg: 'bg-green-50'  },
                  { label: 'Ya existen', value: existingCount,     color: 'text-blue-700',   bg: 'bg-blue-50'   },
                  { label: 'Con errores', value: errorCount,       color: 'text-red-600',    bg: 'bg-red-50'    },
                ].map(k => (
                  <div key={k.label} className={`${k.bg} rounded-xl p-3 text-center`}>
                    <p className="text-xs uppercase font-semibold mb-0.5 text-slate-400">{k.label}</p>
                    <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {existingCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <CheckCircle size={15} className="text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700 font-medium">
                    {existingCount} cliente{existingCount !== 1 ? 's' : ''} ya existen en el sistema — no se modificarán ni se tocarán sus ubicaciones.
                  </p>
                </div>
              )}

              {errorCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700 font-medium">
                    {errorCount} cliente{errorCount !== 1 ? 's' : ''} con RUC o nombre vacío — no se importarán.
                  </p>
                </div>
              )}

              {/* Tabla — una fila por ubicación */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">#</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Estado</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600 whitespace-nowrap">RUC</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Nombre</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Ubicación</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600 whitespace-nowrap">Ciudad</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Dirección</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600 whitespace-nowrap">Teléfono</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Email</th>
                        <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Equipo / Observación</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groups.map(group => group.rows.map((row, locIdx) => (
                        <tr key={row.rowIndex} className={
                          group.valid ? 'bg-white hover:bg-slate-50'
                          : group.existing ? 'bg-blue-50'
                          : 'bg-red-50'
                        }>
                          <td className="px-3 py-2 text-slate-400 font-mono font-bold">{row.rowIndex}</td>

                          <td className="px-3 py-2 min-w-[150px]">
                            {group.valid ? (
                              <span className="flex items-center gap-1 text-green-600 font-semibold">
                                <CheckCircle size={13} />
                                {group.rows.length > 1 ? 'Ubicación adicional' : 'Nuevo cliente'}
                              </span>
                            ) : group.existing ? (
                              <span className="text-blue-700 font-semibold">Ya existe — se omite</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                                {group.errors.map((e, i) => (
                                  <span key={i} className="text-red-600 leading-tight font-medium">{e}</span>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-2 font-mono">
                            {group.identification || <span className="text-red-400 italic">vacío</span>}
                          </td>

                          <td className="px-3 py-2 font-medium text-slate-800">
                            {group.name || <span className="text-red-400 italic">vacío</span>}
                          </td>

                          <td className="px-3 py-2 max-w-[140px] truncate" title={row.ubicacion}>
                            <span className="text-slate-600">{row.ubicacion || '—'}</span>
                            {group.rows.length > 1 && (
                              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 whitespace-nowrap">
                                {locIdx + 1}/{group.rows.length}
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.ciudad || '—'}</td>

                          <td className="px-3 py-2 max-w-[120px] truncate text-slate-500" title={row.address}>
                            {row.address || '—'}
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap text-slate-500">{row.phone || '—'}</td>

                          <td className="px-3 py-2 text-slate-400">{row.email || '—'}</td>

                          <td className="px-3 py-2 max-w-[150px] truncate text-slate-500" title={row.serviceType}>
                            {row.serviceType || '—'}
                          </td>

                          <td className="px-3 py-2">
                            <button onClick={() => handleRemoveRow(row.rowIndex)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                              title="Eliminar fila">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>

              {validGroups.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">
                    No hay clientes nuevos para importar. Corrige los errores o revisa el archivo.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Resultado ── */}
          {step === 'result' && result && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle size={52} className="mx-auto text-green-500" />
              <div>
                <h4 className="text-lg font-bold text-slate-800">¡Importación completada!</h4>
                <p className="text-sm text-slate-500 mt-1">
                  <span className="font-bold text-green-600">{result.ok}</span> cliente{result.ok !== 1 ? 's' : ''} importado{result.ok !== 1 ? 's' : ''} correctamente
                  {' '}(<span className="font-bold text-green-600">{totalUbicaciones}</span> ubicaciones).
                  {result.skipped > 0 && (
                    <span className="block mt-1 text-blue-600 font-medium">{result.skipped} ya existían y no se modificaron.</span>
                  )}
                  {result.errors.length > 0 && (
                    <span className="block mt-1 text-red-500 font-medium">{result.errors.length} con errores al guardar.</span>
                  )}
                </p>
              </div>
              {result.errors.length > 0 && (
                <div className="text-left bg-red-50 border border-red-100 rounded-xl p-4 space-y-1.5">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">Registros con error al guardar:</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-700">
                      <span className="font-semibold">{e.row.name || e.row.identification || 'Sin identificación'}</span> — {e.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0 bg-slate-50 flex gap-2">
          {step === 'upload' && (
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => { setStep('upload'); setRows([]); }}
                disabled={isImporting}
                className="flex-1 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40">
                ← Volver
              </button>

              <div className="flex-1">
                {isImporting ? (
                  /* Barra de progreso */
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span style={{ color: '#D61672' }}>
                        Guardando {progress.done} de {progress.total} clientes...
                      </span>
                      <span className="text-slate-500">
                        {progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                          background: 'linear-gradient(135deg, #D61672, #FFA901)',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  /* Botón importar normal */
                  <button
                    onClick={handleConfirmImport}
                    disabled={validGroups.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                    <Users size={14} />
                    Importar {validGroups.length} cliente{validGroups.length !== 1 ? 's' : ''}
                    {totalUbicaciones !== validGroups.length && (
                      <span className="flex items-center gap-1 opacity-80">
                        <MapPin size={12} />({totalUbicaciones} ubicaciones)
                      </span>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
          {step === 'result' && (
            <button onClick={onClose}
              className="flex-1 py-2.5 text-white font-bold rounded-xl text-sm"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
