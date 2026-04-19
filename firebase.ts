// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCaFVV5UdJEF8OmQsoAl07rtAIq_6uWnXI",
    authDomain: "high-demo-simulation.firebaseapp.com",
    projectId: "high-demo-simulation",
    storageBucket: "high-demo-simulation.firebasestorage.app",
    messagingSenderId: "241890322048",
    appId: "1:241890322048:web:a041634b71bb44c03ea865",
    measurementId: "G-N6F18XH1E2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };