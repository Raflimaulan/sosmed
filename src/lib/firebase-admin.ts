
import * as admin from 'firebase-admin';

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


if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
        projectId: firebaseConfig.projectId,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: firebaseConfig.databaseURL,
  });
}

const firestore = admin.firestore();
const auth = admin.auth();

export { firestore, auth };
