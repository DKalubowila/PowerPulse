import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBORM86SgEK_Ajuq4S8cH84Joa3ovByq10",
  authDomain: "powerpulse-34061.firebaseapp.com",
  databaseURL: "https://powerpulse-34061-default-rtdb.firebaseio.com",
  projectId: "powerpulse-34061",
  storageBucket: "powerpulse-34061.firebasestorage.app",
  messagingSenderId: "557566359545",
  appId: "1:557566359545:web:6678687a6bcca9de986f28",
  measurementId: "G-FTQH9WEC8W"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

export { db, rtdb, storage }; 