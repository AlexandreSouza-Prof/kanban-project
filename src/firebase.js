import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDAZ8HQFONuHwf6oviJ0Cbl64oElHqx15A",
  authDomain: "kanban-antigravity-alexandre.firebaseapp.com",
  projectId: "kanban-antigravity-alexandre",
  storageBucket: "kanban-antigravity-alexandre.firebasestorage.app",
  messagingSenderId: "734852758224",
  appId: "1:734852758224:web:9c3f732a395227f6783cd5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
