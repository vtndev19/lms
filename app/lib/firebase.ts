import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Cấu hình Firebase dự án vj-lms
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD8F86j7_5QKKc_hDpVyzE7R091NIHoDCM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vj-lms.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vj-lms",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vj-lms.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "20653710124",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:20653710124:web:c5c5798c0fc93969376a89",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0L2FHG8DZP",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Lazy getter cho Firebase Storage khi cần dùng
let _storage: any = null;
export const getFirebaseStorage = async () => {
  if (!_storage) {
    const { getStorage, connectStorageEmulator } = await import("firebase/storage");
    _storage = getStorage(app);
    if (import.meta.env.VITE_USE_EMULATOR === "true") {
      const host = typeof window !== "undefined" ? window.location.hostname || "localhost" : "localhost";
      connectStorageEmulator(_storage, host, 9199);
    }
  }
  return _storage;
};

// Khởi tạo Analytics động ở browser nếu hỗ trợ
export let analytics: any = null;
if (typeof window !== "undefined") {
  import("firebase/analytics")
    .then(({ getAnalytics, isSupported }) => {
      isSupported().then((supported) => {
        if (supported) {
          analytics = getAnalytics(app);
        }
      }).catch(() => {});
    })
    .catch(() => {});
}

// Kết nối Emulator cục bộ nếu biến VITE_USE_EMULATOR = "true"
if (import.meta.env.VITE_USE_EMULATOR === "true") {
  try {
    const host = typeof window !== "undefined" ? window.location.hostname || "localhost" : "localhost";
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    console.log(" Connected to Firebase Local Emulator Suite!");
  } catch (err) {
    console.warn("Could not connect to Firebase emulator:", err);
  }
}
