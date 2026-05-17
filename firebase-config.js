// firebase-config.js
// VLV EVENTS INVENTORY - Firebase Compat Setup

const firebaseConfig = {
  apiKey: "AIzaSyC0-EOuOOeZfm70MY4ANt0qMZF47iH6ld0",
  authDomain: "vlv-event-73d1e.firebaseapp.com",
  projectId: "vlv-event-73d1e",
  storageBucket: "vlv-event-73d1e.firebasestorage.app",
  messagingSenderId: "520508206954",
  appId: "1:520508206954:web:626bc04802d86cd87ebf13"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

console.log("VLV Firebase connected successfully");
