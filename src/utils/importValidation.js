// Lógica pura de normalización y validación para importación masiva de clientes.
// Extraída de ClientImportModal.jsx para permitir tests unitarios.

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
    observacion:    get('observacion', 'observaciones', 'notas', 'notes', 'observation'),
  };
}

// ─── Validar fila normalizada — 9 reglas, todas bloqueantes ──────────────────
export function validateRow(row, existingIds, seenInFile, rowIndex) {
  const errors = [];

  // 1. Extranjero vacío
  if (!row.foreignRaw?.trim())
    errors.push('Campo Extranjero vacío (debe ser SI o NO)');

  // 2. Cédula/RUC vacía
  if (!row.identification?.trim()) {
    errors.push('Cédula/RUC vacía');
  } else {
    const clean = row.identification.replace(/\s/g, '');

    if (!row.foreign) {
      // 6. Solo números para nacionales
      if (!/^\d+$/.test(clean))
        errors.push('Contiene letras — solo números para clientes nacionales');
      // 7. Longitud 10 o 13
      else if (clean.length !== 10 && clean.length !== 13)
        errors.push('Longitud inválida: ' + clean.length + ' dígito' + (clean.length !== 1 ? 's' : '') + ' (debe ser 10 o 13)');
    }

    // 8. Duplicado en el archivo
    if (seenInFile.has(clean)) {
      errors.push('Cédula/RUC repetida en el archivo (igual a fila ' + seenInFile.get(clean) + ')');
    } else if (clean) {
      seenInFile.set(clean, rowIndex);
    }

    // 9. Ya existe en base de datos — bloqueante
    if (existingIds.has(clean))
      errors.push('Ya existe en el sistema — no se importará');
  }

  // 3. Nombre vacío
  if (!row.name?.trim())     errors.push('Nombre vacío');
  // 4. Dirección vacía
  if (!row.address?.trim())  errors.push('Dirección vacía');
  // 5. Teléfono vacío
  if (!row.phone?.trim())    errors.push('Teléfono vacío');

  return errors;
}
