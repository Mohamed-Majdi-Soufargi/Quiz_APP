import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyATHjxr5Owl-Um-mUfgpPupqKJDjQPP6Yk",
  authDomain: "quiz-app-17b22.firebaseapp.com",
  projectId: "quiz-app-17b22",
  storageBucket: "quiz-app-17b22.firebasestorage.app",
  messagingSenderId: "471469320926",
  appId: "1:471469320926:web:4da48bb539cbffbdb0f04f",
  databaseURL: "https://quiz-app-17b22-default-rtdb.europe-west1.firebasedatabase.app" 
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const database = getDatabase(app);
export const auth = getAuth(app);

export default app;