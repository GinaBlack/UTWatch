// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD5lAR0rp0xCgNVZ3HZCaMZ7Uk4KxfJUhE",
  authDomain: "utwatch-25ae6.firebaseapp.com",
  projectId: "utwatch-25ae6",
  storageBucket: "utwatch-25ae6.firebasestorage.app",
  messagingSenderId: "389463768653",
  appId: "1:389463768653:web:8d7164f2eeb2a32f23e604",
  measurementId: "G-M7SYHBQVDZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);