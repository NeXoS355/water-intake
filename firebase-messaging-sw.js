console.log('Service Worker gestartet.');
try {
    console.log('Importiere Firebase App...');
    importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
    console.log('Firebase App importiert.');

    console.log('Importiere Firebase Messaging...');
    importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');
    console.log('Firebase Messaging importiert.');

    // Firebase initialisieren
    const firebaseConfig = {
        apiKey: "AIzaSyBoLabzHIJQzenkaN28wf29HbX3P1CPEqE",
        authDomain: "water-intake-ded46.firebaseapp.com",
        projectId: "water-intake-ded46",
        storageBucket: "water-intake-ded46.firebasestorage.app",
        messagingSenderId: "703290574513",
        appId: "1:703290574513:web:5d5c370facae9ba5810490",
        measurementId: "G-FXZX32HTL6"
    };
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialisiert.');

    // Firebase Messaging initialisieren
    const messaging = firebase.messaging();
    console.log('Firebase Messaging initialisiert.');

    // Hintergrundnachrichten empfangen
    messaging.onBackgroundMessage((payload) => {
        console.log('Hintergrundnachricht empfangen:', payload);

        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });

} catch (error) {
    console.error('Fehler im Service Worker:', error);
}
