// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase with error handling
try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized");
    
    // Enable Firebase Auth persistence to keep users logged in
    if (firebase.auth) {
      firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .catch((error) => {
          console.error("Firebase persistence error:", error);
        });
    } else {
      console.warn("Firebase Auth not available");
    }
  } else {
    console.error("Firebase SDK not loaded");
    document.addEventListener('DOMContentLoaded', function() {
      showFirebaseError();
    });
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  document.addEventListener('DOMContentLoaded', function() {
    showFirebaseError();
  });
}

// Function to show Firebase error on the page
function showFirebaseError() {
  // Check if we're on the login page
  if (document.querySelector('.auth-container')) {
    const errorBanner = document.createElement('div');
    errorBanner.className = 'firebase-error-banner';
    errorBanner.innerHTML = `
      <div style="background-color: #f8d7da; color: #721c24; padding: 10px; 
                  border: 1px solid #f5c6cb; border-radius: 4px; margin-bottom: 20px; 
                  text-align: center;">
        <p style="margin: 5px 0;">Firebase initialization failed. You may continue as a guest.</p>
      </div>
    `;
    
    const authContainer = document.querySelector('.auth-container');
    if (authContainer && authContainer.firstChild) {
      authContainer.insertBefore(errorBanner, authContainer.firstChild);
    }
  }
} 