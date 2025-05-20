// firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";  // THÊM DÒNG NÀY

const firebaseConfig = {
    apiKey: "AIzaSyD-ondrnAGBWyEvwpX0t8HXOn4VBew1MyI",
    authDomain: "docsach-2e95b.firebaseapp.com",
    databaseURL: "https://docsach-2e95b-default-rtdb.firebaseio.com",
    projectId: "docsach-2e95b",
    storageBucket: "docsach-2e95b.firebasestorage.app",
    messagingSenderId: "422980361238",
    appId: "1:422980361238:web:d80db6baee57bb0068a937",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);  // THÊM DÒNG NÀY

isSupported().then((yes) => {
    if (yes) {
        const analytics = getAnalytics(app);
    } else {
        console.log("Analytics not supported in this environment");
    }
});

export { app, db, auth };  // THÊM `auth` vào export


// // DocSach/firebase.js
// import { initializeApp } from 'firebase/app';
// import { getDatabase } from 'firebase/database';
// import { getStorage } from 'firebase/storage';

// const firebaseConfig = {
//   apiKey: "AIzaSyD-ondrnAGBWyEvwpX0t8HXOn4VBew1MyI",
//   authDomain: "docsach-2e95b.firebaseapp.com",
//   databaseURL: "https://docsach-2e95b-default-rtdb.firebaseio.com",
//   projectId: "docsach-2e95b",
//   storageBucket: "docsach-2e95b.firebasestorage.app",
//   messagingSenderId: "422980361238",
//   appId: "1:422980361238:web:d80db6baee57bb0068a937"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// export const db = getDatabase(app);
// export const storage = getStorage(app);


// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyD-ondrnAGBWyEvwpX0t8HXOn4VBew1MyI",
//   authDomain: "docsach-2e95b.firebaseapp.com",
//   databaseURL: "https://docsach-2e95b-default-rtdb.firebaseio.com",
//   projectId: "docsach-2e95b",
//   storageBucket: "docsach-2e95b.firebasestorage.app",
//   messagingSenderId: "422980361238",
//   appId: "1:422980361238:web:d80db6baee57bb0068a937",
//   measurementId: "G-GLPSSC9C88"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);