// Componente compartido: muestra el estado progresivo de una visita
// Secuencia: Programada + Por Confirmar → Confirmada + Por Realizar → Realizada
export function VisitStatusBadge({ status, confirmed = false, size = 'sm', layout = 'auto' }) {
  const isConfirmedState = status === 'Confirmada' || !!confirmed;

  const px  = size === 'xs' ? 'px-1.5 py-0.5' : 'px-2 py-1';
  const txt = size === 'xs' ? 'text-[10px]'   : 'text-xs';
  const base = `${px} ${txt} font-bold rounded-full whitespace-nowrap leading-none`;

  const dirCls = layout === 'col'
    ? 'flex-col items-start'
    : layout === 'row'
    ? 'flex-row flex-wrap items-center'
    : 'flex-col items-start sm:flex-row sm:flex-wrap sm:items-center';
  const wrap = `flex gap-1 ${dirCls}`;

  if (status === 'Realizada') {
    return <span className={`${base} bg-green-100 text-green-700`}>✅ Realizada</span>;
  }
  if (status === 'Cancelada') {
    return <span className={`${base} bg-amber-100 text-amber-700`}>Cancelada</span>;
  }
  if (status === 'Anulada') {
    return <span className={`${base} bg-red-100 text-red-600`}>Anulada</span>;
  }
  if (isConfirmedState) {
    return (
      <div className={wrap}>
        <span className={`${base} bg-teal-100 text-teal-700`}>✓ Confirmada</span>
        <span className={`${base} bg-sky-100 text-sky-600`}>Por Realizar</span>
      </div>
    );
  }
  return (
    <div className={wrap}>
      <span className={`${base} bg-blue-100 text-blue-700`}>Programada</span>
      <span className={`${base} bg-amber-100 text-amber-700`}>Por Confirmar</span>
    </div>
  );
}
