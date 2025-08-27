import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA25h92PbPz-LZYLzzS27WndMsftzM7BwE",
  authDomain: "raffxweb-7c282.firebaseapp.com",
  databaseURL: "https://raffxweb-7c282-default-rtdb.firebaseio.com",
  projectId: "raffxweb-7c282",
  storageBucket: "raffxweb-7c282.firebasestorage.app",
  messagingSenderId: "209772051391",
  appId: "1:209772051391:web:0aa4b31bd457b5d57eff0a",
  measurementId: "G-F6DRD526YK"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

export { app, auth, firestore, storage };
