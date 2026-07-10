// src/hooks/useConfiguracion.js
import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

const CONFIG_DOC_ID = 'config_empresa';

export function useConfiguracion(user) {
  const tenantId = useAppStore(s => s.tenantId);
  const [config,    setConfig]    = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving,  setIsSaving]  = useState(false);
  const [permError, setPermError] = useState(false);

  // tenantId en las dependencias: sin esto, cambiar de empresa en
  // CompanySelector no volvía a suscribir la lectura, y el usuario seguía
  // viendo la configuración de la empresa anterior.
  useEffect(() => {
    if (!user || !tenantId) {
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
        // Antes, si la empresa nueva aún no tenía documento de configuración
        // creado (snap.exists() === false), no se llamaba a setState y
        // empresaConfig se quedaba con los datos de la ÚLTIMA empresa que sí
        // los tenía — la cabecera mostraba nombre/RUC de la empresa anterior.
        // Ahora siempre se resetea (a vacío) para esa empresa, aunque no
        // tenga configuración propia todavía.
        const data = snap.exists() ? snap.data() : {};
        setConfig(snap.exists() ? data : null);
        useAppStore.setState({
          empresaConfig: {
            empresaNombre:   data.empresaNombre   || '',
            empresaSlogan:   data.empresaSlogan   || '',
            empresaTag:      data.empresaTag      || '',
            whatsappNumero:  data.whatsappNumero  || '',
            whatsappPrefijo: data.whatsappPrefijo || '593',
            logoUrl:         data.logoUrl         || '',
            ruc:             data.ruc             || '',
          },
        });
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
  }, [user, tenantId]);

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
