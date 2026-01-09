import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;

const initFirebase = async () => {
    if (getApps().length > 0) {
        app = getApps()[0];
        analytics = getAnalytics(app);
        return;
    }

    // Check if config is valid (at least apiKey and projectId are present)
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.warn('Firebase Analytics: Missing configuration. Analytics will be disabled.');
        return;
    }

    try {
        app = initializeApp(firebaseConfig);

        // Analytics is only supported in browser environments
        const supported = await isSupported();
        if (supported) {
            analytics = getAnalytics(app);
            console.log('Firebase Analytics initialized');
        } else {
            console.log('Firebase Analytics not supported in this environment');
        }
    } catch (error) {
        console.error('Firebase initialization failed:', error);
    }
};

// Initialize immediately but export promise for synchronization
const analyticsReady = initFirebase().then(() => analytics);

export { app, analytics, analyticsReady };
