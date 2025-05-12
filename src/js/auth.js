// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
let db = firebase.firestore();
let storageRef = storage.ref();

// Admin credentials
const ADMIN_CREDENTIALS = {
  email: 'thanhnguyentuan2007@gmail.com',
  password: 'Thanh17112007'
};

// DOM Elements
const loginSection = document.getElementById('loginSection');
const mainContent = document.getElementById('mainContent');
const loginForm = document.getElementById('loginForm');
const authError = document.getElementById('auth-error');
const googleLogin = document.getElementById('googleLogin');
const facebookLogin = document.getElementById('facebookLogin');
const skipLogin = document.getElementById('skipLogin');
const userStatus = document.getElementById('userStatus');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminControls = document.getElementById('adminControls');

// Show login section by default when page loads
document.addEventListener('DOMContentLoaded', () => {
  loginSection.style.display = 'flex';
  mainContent.style.display = 'none';
  
  // Check if user is already logged in
  auth.onAuthStateChanged((user) => {
    if (user) {
      const isAdmin = user.email === ADMIN_CREDENTIALS.email;
      loginSuccess(isAdmin);
    }
  });
});

// Continue as guest
function continueAsGuest() {
  loginSection.style.display = 'none';
  mainContent.style.display = 'block';
  userStatus.style.display = 'flex';
  loginBtn.style.display = 'block';
  logoutBtn.style.display = 'none';
  userName.textContent = 'Guest';
  userAvatar.textContent = 'G';
}

// Login success handler
function loginSuccess(isAdmin) {
  authError.textContent = '';
  loginSection.style.display = 'none';
  mainContent.style.display = 'block';
  userStatus.style.display = 'flex';
  loginBtn.style.display = 'none';
  logoutBtn.style.display = 'block';
  
  if (isAdmin) {
    adminControls.classList.add('visible');
    userName.textContent = 'Admin';
    userAvatar.textContent = 'A';
  } else {
    adminControls.classList.remove('visible');
    const user = auth.currentUser;
    userName.textContent = user?.email || 'User';
    userAvatar.textContent = (user?.email?.[0] || 'U').toUpperCase();
  }
}

// Regular email/password login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // Check if trying to login as admin
  if (email === ADMIN_CREDENTIALS.email) {
    if (password === ADMIN_CREDENTIALS.password) {
      loginSuccess(true);
    } else {
      authError.textContent = 'Invalid admin credentials';
    }
  } else {
    // Regular user login
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        loginSuccess(false);
      })
      .catch((error) => {
        if (error.code === 'auth/user-not-found') {
          // Create new account
          auth.createUserWithEmailAndPassword(email, password)
            .then(() => {
              loginSuccess(false);
            })
            .catch((error) => {
              authError.textContent = error.message;
            });
        } else {
          authError.textContent = error.message;
        }
      });
  }
});

// Google login
googleLogin.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(() => {
      loginSuccess(false);
    })
    .catch((error) => {
      authError.textContent = error.message;
    });
});

// Facebook login
facebookLogin.addEventListener('click', () => {
  const provider = new firebase.auth.FacebookAuthProvider();
  auth.signInWithPopup(provider)
    .then(() => {
      loginSuccess(false);
    })
    .catch((error) => {
      authError.textContent = error.message;
    });
});

// Skip login (guest mode)
skipLogin.addEventListener('click', () => {
  continueAsGuest();
});

// Login button handler
loginBtn.addEventListener('click', () => {
  mainContent.style.display = 'none';
  loginSection.style.display = 'flex';
});

// Logout button handler
logoutBtn.addEventListener('click', () => {
  auth.signOut().then(() => {
    continueAsGuest();
  });
}); 