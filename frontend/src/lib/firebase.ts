import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isApiKeyValid = typeof apiKey === 'string' && apiKey.trim().length > 5 && apiKey !== 'undefined';

const firebaseConfig = {
  apiKey: isApiKeyValid ? apiKey : undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: any = null;
let auth: any = null;

if (isApiKeyValid) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig as any);
    auth = getAuth(app);
  } catch (err) {
    console.warn('Firebase failed to initialize cleanly with environment config:', err);
    app = null;
    auth = null;
  }
} else {
  console.warn('VITE_FIREBASE_API_KEY is missing or unconfigured in Vercel environment variables.');
}

export { auth };
export default app;
