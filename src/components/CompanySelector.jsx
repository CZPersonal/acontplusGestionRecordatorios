import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import { saveSession } from '../lib/session.js';
import { Building2, LogOut } from 'lucide-react';

export default function CompanySelector() {
  const user             = useAppStore(s => s.user);
  const tenantIds        = useAppStore(s => s.tenantIds);
  const availableTenants = useAppStore(s => s.availableTenants);

  const selectTenant = (tenant) => {
    useAppStore.setState({
      tenantId:   tenant.id,
      tenantName: tenant.name,
      tenantRuc:  tenant.ruc,
    });
    // Sin esto, recargar la página (o perder la red) antes de que el rol se
    // termine de resolver restauraba la última empresa guardada en vez de la
    // que se acaba de elegir aquí.
    saveSession({
      uid: user?.uid, email: user?.email, displayName: user?.displayName || '',
      tenantId: tenant.id, tenantIds, tenantName: tenant.name, tenantRuc: tenant.ruc,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4"
      style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fff7ed 100%)' }}>
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full space-y-6">

        <div className="text-center">
          <img src="/logo.png" alt="Acontplus" className="w-14 h-14 object-contain mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-800">Selecciona una empresa</h1>
          <p className="text-sm text-slate-500 mt-1">Estás vinculado a más de una empresa</p>
        </div>

        <div className="space-y-3">
          {availableTenants.map(tenant => (
            <button
              key={tenant.id}
              onClick={() => selectTenant(tenant)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-pink-400 hover:bg-pink-50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                <Building2 size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{tenant.name}</p>
                {tenant.ruc && (
                  <p className="text-xs text-slate-400 font-mono">RUC: {tenant.ruc}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs text-center text-slate-400 mb-3">{user?.email}</p>
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
