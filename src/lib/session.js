// Caché local de sesión (localStorage) — permite restaurar sesión offline
// (técnico de campo sin red) y sirve de respaldo cuando Firestore no responde.
// Compartido entre App.jsx (guarda tras resolver el tenant en el login) y
// CompanySelector.jsx (debe actualizarlo al cambiar de empresa, si no la
// próxima carga sin red restauraría la empresa anterior).
const SESSION_KEY = 'acontplus_session';

export function saveSession(data) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch { /* quota */ }
}

export function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}'); } catch { return {}; }
}
