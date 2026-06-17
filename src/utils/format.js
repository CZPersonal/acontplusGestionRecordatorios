export const fmtMoney = (n) =>
  (parseFloat(n) || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtMoneyRaw = (n) =>
  (parseFloat(n) || 0).toFixed(2);
