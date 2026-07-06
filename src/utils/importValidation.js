// Lógica pura de normalización y validación para importación masiva de clientes.
// Extraída de ClientImportModal.jsx para permitir tests unitarios.
//
// Un mismo cliente (RUC/cédula) puede aparecer en varias filas del archivo — cada fila
// es una ubicación distinta (ej. la hoja "DUPLICADOS" del formato real de la empresa).
// Por eso la validación no ocurre fila por fila, sino agrupando primero por RUC.

// ─── Normalizar fila cruda (Excel/CSV) a estructura canónica ──────────────────
export function normalizeRow(raw) {
  const get = (...keys) => {
    for (const k of keys) {
      const found = Object.entries(raw).find(
        ([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      if (found && String(found[1]).trim()) return String(found[1]).trim();
    }
    return '';
  };

  const foreignRaw   = get('extranjero', 'foreign', 'isforeignclient', 'esextranjero');
  const foreignUpper = foreignRaw.toUpperCase();
  const foreign      = ['SI', 'S', 'YES', '1', 'TRUE', 'SÍ'].includes(foreignUpper);

  const observacion = get('observacion', 'observaciones', 'notas', 'notes', 'observation');

  return {
    foreignRaw,
    foreign,
    identification: get('cedularuc', 'cedula', 'ruc', 'identification', 'id', 'pasaporte', 'passport'),
    name:           get('nombre', 'name', 'cliente', 'razonsocial'),
    address:        get('direccion', 'address', 'domicilio'),
    phone:          get('telefono', 'phone', 'celular', 'movil'),
    email:          get('email', 'correo', 'mail'),
    ciudad:         get('ciudad', 'city', 'canton'),
    ubicacion:      get('ubicacion', 'sector', 'barrio', 'location', 'referencia'),
    observacion,
    // La columna "Equipo" casi nunca viene llena en los archivos reales de la empresa —
    // el tipo de equipo/servicio (OZONO, OSMOSIS, etc.) termina escrito en Observación,
    // así que se usa como respaldo cuando Equipo está vacío.
    serviceType: get('equipo', 'servicetype', 'tipoequipo') || observacion,
  };
}

// ─── Agrupar filas normalizadas por cliente (RUC/cédula) ──────────────────────
// Cada grupo representa UN cliente; `rows` son sus ubicaciones (1 o más).
export function groupRowsByClient(normalizedRows) {
  const groups = new Map();
  normalizedRows.forEach((row, idx) => {
    const id = row.identification.replace(/\s/g, '');
    if (!groups.has(id)) {
      groups.set(id, {
        identification: id,
        name:           row.name,
        foreign:        row.foreign,
        rows:           [],
      });
    }
    groups.get(id).rows.push({ ...row, rowIndex: idx + 1 });
  });
  return [...groups.values()];
}

// ─── Validar un grupo (cliente) — reglas mínimas, no bloquean por ubicación ──
// Solo el RUC/cédula y el nombre son obligatorios. No se exige formato de RUC
// (los clientes sin cédula real usan placeholders tipo "RUC00015"), ni dirección,
// teléfono o email por ubicación — son datos de campo frecuentemente incompletos.
export function validateGroup(group, existingIds) {
  const errors = [];

  if (!group.identification.trim()) errors.push('Cédula/RUC vacía');
  if (!group.name?.trim())          errors.push('Nombre vacío');

  const existing = errors.length === 0 && existingIds.has(group.identification);

  return {
    errors,
    existing,
    valid: errors.length === 0 && !existing,
  };
}
