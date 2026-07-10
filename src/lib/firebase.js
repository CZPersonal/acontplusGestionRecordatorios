// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

// App Check — debe inicializarse antes que Auth y Firestore.
// En DEV el SDK genera un debug token automático y lo imprime en consola;
// cópialo y regístralo en Firebase Console → App Check → Apps → Debug tokens.
// En producción usa reCAPTCHA v3: requiere VITE_RECAPTCHA_SITE_KEY.
if (import.meta.env.DEV) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN || true;
}
if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

const auth = getAuth(app);

// persistentMultipleTabManager soporta múltiples pestañas y el service worker
// de la PWA sin conflictos de lock en IndexedDB — necesario para escrituras offline
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Firebase Messaging — solo disponible en navegadores con soporte Push API.
// messaging es null en entornos sin soporte (SSR, algunos navegadores).
let messaging = null;
isSupported().then(supported => {
  if (supported) messaging = getMessaging(app);
}).catch(() => {});

const storage = getStorage(app);

// us-central1 explícito para que coincida con la región de las Cloud Functions
// (functions/index.js las declara todas con region: 'us-central1').
const functions = getFunctions(app, 'us-central1');

export { app, auth, db, messaging, storage, functions };