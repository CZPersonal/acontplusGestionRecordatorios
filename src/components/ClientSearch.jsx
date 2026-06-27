import { useState, useRef, useEffect } from 'react';
import { Search, User, Phone, MapPin, CreditCard, X, Plus } from 'lucide-react';
import { getClientContacts } from '../hooks/useClients.js';

export default function ClientSearch({ clients, onSelect, selectedClient, onClear }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = clients.filter(c => {
    const q = query.toLowerCase();
    const firstPhone = getClientContacts(c)[0]?.phone || '';
    return (
      c.name?.toLowerCase().includes(q) ||
      c.identification?.includes(query) ||
      firstPhone.includes(query)
    );
  }).slice(0, 8);

  const handleSelect = (client) => {
    onSelect(client);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onClear();
    setQuery('');
    setIsOpen(false);
  };

  // Si hay cliente seleccionado, mostrar tarjeta (sin info de contacto — la muestra TaskForm)
  if (selectedClient) {
    const contacts    = getClientContacts(selectedClient);
    const contactCount = contacts.length;
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800">{selectedClient.name}</p>
              <p className="text-xs text-blue-600 font-mono font-semibold">{selectedClient.identification}</p>
              {contactCount > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {contactCount} ubicación{contactCount !== 1 ? 'es' : ''} registrada{contactCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Cambiar cliente"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, cédula/RUC o teléfono..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {filtered.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              {filtered.map(client => {
                const firstC = getClientContacts(client)[0] || {};
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelect(client)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{client.name}</p>
                        <div className="flex items-center space-x-3 mt-0.5">
                          <span className="flex items-center space-x-1 text-xs text-purple-600 font-mono">
                            <CreditCard size={10} />
                            <span>{client.identification}</span>
                          </span>
                          {firstC.phone && (
                            <span className="flex items-center space-x-1 text-xs text-slate-400">
                              <Phone size={10} />
                              <span>{firstC.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {firstC.address && (
                        <span className="text-xs text-slate-400 truncate max-w-24 ml-2">
                          {firstC.address}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : query.length > 0 ? (
            <div className="px-4 py-3 text-center">
              <p className="text-sm text-slate-500 mb-1">No se encontró el cliente</p>
              <p className="text-xs text-slate-400">Completa los campos abajo para registrarlo</p>
            </div>
          ) : (
            <div className="px-4 py-3 text-center">
              <p className="text-sm text-slate-400">Escribe para buscar clientes</p>
            </div>
          )}

          {/* Opción nuevo cliente */}
          <div className="border-t border-slate-100 px-4 py-2 bg-slate-50">
            <p className="text-xs text-slate-400 flex items-center space-x-1">
              <Plus size={12} />
              <span>Si el cliente no existe, completa los datos abajo y se registrará automáticamente</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}