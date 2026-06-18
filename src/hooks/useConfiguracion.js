// src/hooks/useConfiguracion.js
import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

const CONFIG_DOC_ID = 'config_empresa';

export function useConfiguracion(user) {
  const [config,    setConfig]    = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving,  setIsSaving]  = useState(false);
  const [permError, setPermError] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Timeout de seguridad: si en 5s no responde, mostramos el form igual
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setPermError(true);
    }, 5000);

    const ref  = doc(getCollectionRef('configuracion'), CONFIG_DOC_ID);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        clearTimeout(timeout);
        const data = snap.exists() ? snap.data() : null;
        setConfig(data);
        if (data) {
          useAppStore.setState({
            empresaConfig: {
              empresaNombre:   data.empresaNombre   || 'ACONTPLUS',
              empresaSlogan:   data.empresaSlogan   || 'Recordatorios',
              empresaTag:      data.empresaTag      || 'Facturar nunca fue tan fácil',
              whatsappNumero:  data.whatsappNumero  || '',
              whatsappPrefijo: data.whatsappPrefijo || '593',
              logoUrl:         data.logoUrl         || '',
            },
          });
        }
        setIsLoading(false);
        setPermError(false);
      },
      (error) => {
        // Firestore denegó la lectura (reglas) u otro error de red
        clearTimeout(timeout);
        console.warn('useConfiguracion snapshot error:', error.code, error.message);
        setIsLoading(false);
        setPermError(error.code === 'permission-denied');
      }
    );

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, [user]);

  const saveConfig = async (data) => {
    if (!user) return false;
    setIsSaving(true);
    try {
      const ref = doc(getCollectionRef('configuracion'), CONFIG_DOC_ID);
      await setDoc(ref, {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: user.email,
      }, { merge: true });
      setPermError(false);
      return true;
    } catch (e) {
      console.error('Error al guardar configuración:', e);
      if (e.code === 'permission-denied') setPermError(true);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { config, isLoading, isSaving, permError, saveConfig };
}
