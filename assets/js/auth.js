document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const goToRegisterLink = document.getElementById('go-to-register');
  const goToLoginLink = document.getElementById('go-to-login');
  
  // Login Form Elements
  const loginFormEl = document.getElementById('loginForm');
  const loginEmail = document.getElementById('email');
  const loginPassword = document.getElementById('password');
  const loginError = document.getElementById('login-error');
  
  // Register Form Elements
  const registerFormEl = document.getElementById('registerForm');
  const regEmail = document.getElementById('reg-email');
  const regPassword = document.getElementById('reg-password');
  const confirmPassword = document.getElementById('confirm-password');
  const registerError = document.getElementById('register-error');
  
  // Social login buttons
  const facebookLoginBtn = document.getElementById('facebook-login');
  const googleLoginBtn = document.getElementById('google-login');
  const facebookRegisterBtn = document.getElementById('facebook-register');
  const googleRegisterBtn = document.getElementById('google-register');
  
  // Continue without login buttons
  const continueWithoutLoginBtns = document.querySelectorAll('a[data-i18n="continueWithout"]');
  
  // Initialize translation function if not available
  if (!window.i18n || typeof window.i18n.translate !== 'function') {
    window.i18n = {
      translate: function(key) { 
        return translations && translations.en ? (translations.en[key] || key) : key; 
      },
      getCurrentLanguage: function() { return 'en'; }
    };
  }
  
  // Get Firebase Auth instance
  const auth = firebase.auth();
  
  // Configure providers
  const googleProvider = new firebase.auth.GoogleAuthProvider();
  const facebookProvider = new firebase.auth.FacebookAuthProvider();
  
  // Switch between login and register forms
  if (goToRegisterLink) {
    goToRegisterLink.addEventListener('click', function(e) {
      e.preventDefault();
      loginForm.classList.remove('active');
      registerForm.classList.add('active');
      clearErrors();
    });
  }
  
  if (goToLoginLink) {
    goToLoginLink.addEventListener('click', function(e) {
      e.preventDefault();
      registerForm.classList.remove('active');
      loginForm.classList.add('active');
      clearErrors();
    });
  }
  
  // Login form submission
  if (loginFormEl) {
    loginFormEl.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const email = loginEmail.value.trim();
      const password = loginPassword.value;
      
      // Validate inputs
      if (email === '' || password === '') {
        showError(loginError, i18n.translate('emptyFields'));
        return;
      }
      
      // Clear previous errors
      clearErrors();
      
      // Show loading state
      const submitBtn = loginFormEl.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Loading...';
      
      // Sign in with Firebase Auth
      auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          // Login successful
          const user = userCredential.user;
          
          // Store logged in user info in session
          sessionStorage.setItem('currentUser', JSON.stringify({
            email: user.email,
            uid: user.uid,
            loginMethod: 'email',
            displayName: user.displayName || email.split('@')[0],
            language: i18n.getCurrentLanguage()
          }));
          
          // Redirect to main app
          window.location.href = 'app.html';
        })
        .catch((error) => {
          // Handle errors
          console.error('Login error:', error);
          
          switch (error.code) {
            case 'auth/user-not-found':
              showError(loginError, i18n.translate('accountNotExist'));
              break;
            case 'auth/wrong-password':
              showError(loginError, i18n.translate('wrongCredentials'));
              break;
            case 'auth/too-many-requests':
              showError(loginError, 'Too many failed login attempts. Please try again later.');
              break;
            case 'auth/network-request-failed':
              showError(loginError, 'Network error. Please check your internet connection.');
              break;
            default:
              showError(loginError, i18n.translate('loginError') + (error.message ? ': ' + error.message : ''));
          }
          
          // Reset button state
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        });
    });
  }
  
  // Register form submission
  if (registerFormEl) {
    registerFormEl.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const email = regEmail.value.trim();
      const password = regPassword.value;
      const confirm = confirmPassword.value;
      
      // Validate inputs
      if (email === '' || password === '' || confirm === '') {
        showError(registerError, i18n.translate('emptyFields'));
        return;
      }
      
      if (password !== confirm) {
        showError(registerError, i18n.translate('passwordMismatch'));
        return;
      }
      
      if (password.length < 6) {
        showError(registerError, i18n.translate('weakPassword'));
        return;
      }
      
      // Clear previous errors
      clearErrors();
      
      // Show loading state
      const submitBtn = registerFormEl.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Loading...';
      
      // Register with Firebase Auth
      auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          // Registration successful
          const user = userCredential.user;
          
          // Save additional user info if needed
          return user.updateProfile({
            displayName: email.split('@')[0],
            language: i18n.getCurrentLanguage()
          });
        })
        .then(() => {
          // Clear form
          registerFormEl.reset();
          
          // Show success message and switch to login
          alert(i18n.translate('registerSuccess'));
          registerForm.classList.remove('active');
          loginForm.classList.add('active');
          
          // Reset button state
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        })
        .catch((error) => {
          // Handle errors
          console.error('Registration error:', error);
          
          switch (error.code) {
            case 'auth/email-already-in-use':
              showError(registerError, i18n.translate('emailUsed'));
              break;
            case 'auth/weak-password':
              showError(registerError, i18n.translate('weakPassword'));
              break;
            case 'auth/invalid-email':
              showError(registerError, 'Invalid email address format.');
              break;
            case 'auth/network-request-failed':
              showError(registerError, 'Network error. Please check your internet connection.');
              break;
            default:
              showError(registerError, i18n.translate('registerError') + (error.message ? ': ' + error.message : ''));
          }
          
          // Reset button state
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        });
    });
  }
  
  // Google login handler
  function signInWithGoogle() {
    clearErrors();
    
    auth.signInWithPopup(googleProvider)
      .then((result) => {
        const user = result.user;
        
        // Store user info in session
        sessionStorage.setItem('currentUser', JSON.stringify({
          email: user.email,
          uid: user.uid,
          loginMethod: 'google',
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL,
          language: i18n.getCurrentLanguage()
        }));
        
        // Redirect to main app
        window.location.href = 'app.html';
      })
      .catch((error) => {
        console.error('Google sign-in error:', error);
        if (error.code === 'auth/popup-blocked') {
          showError(loginError, 'Popup was blocked. Please allow popups for this website.');
          showError(registerError, 'Popup was blocked. Please allow popups for this website.');
        } else if (error.code === 'auth/popup-closed-by-user') {
          // User closed the popup, no need to show error
        } else {
          showError(loginError, 'Google sign-in failed' + (error.message ? ': ' + error.message : ''));
          showError(registerError, 'Google sign-in failed' + (error.message ? ': ' + error.message : ''));
        }
      });
  }
  
  // Facebook login handler
  function signInWithFacebook() {
    clearErrors();
    
    auth.signInWithPopup(facebookProvider)
      .then((result) => {
        const user = result.user;
        
        // Store user info in session
        sessionStorage.setItem('currentUser', JSON.stringify({
          email: user.email,
          uid: user.uid,
          loginMethod: 'facebook',
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL,
          language: i18n.getCurrentLanguage()
        }));
        
        // Redirect to main app
        window.location.href = 'app.html';
      })
      .catch((error) => {
        console.error('Facebook sign-in error:', error);
        if (error.code === 'auth/popup-blocked') {
          showError(loginError, 'Popup was blocked. Please allow popups for this website.');
          showError(registerError, 'Popup was blocked. Please allow popups for this website.');
        } else if (error.code === 'auth/popup-closed-by-user') {
          // User closed the popup, no need to show error
        } else {
          showError(loginError, 'Facebook sign-in failed' + (error.message ? ': ' + error.message : ''));
          showError(registerError, 'Facebook sign-in failed' + (error.message ? ': ' + error.message : ''));
        }
      });
  }
  
  // Continue without login
  function handleContinueWithoutLogin() {
    // Create a guest user in session storage
    const guestId = 'guest_' + Date.now();
    sessionStorage.setItem('currentUser', JSON.stringify({
      email: 'guest@photobooth.app',
      uid: guestId,
      loginMethod: 'guest',
      displayName: 'Guest User',
      language: i18n.getCurrentLanguage()
    }));
    
    // Redirect to main app
    window.location.href = 'app.html';
  }
  
  // Set up event listeners for social login buttons
  if (googleLoginBtn) googleLoginBtn.addEventListener('click', signInWithGoogle);
  if (facebookLoginBtn) facebookLoginBtn.addEventListener('click', signInWithFacebook);
  if (googleRegisterBtn) googleRegisterBtn.addEventListener('click', signInWithGoogle);
  if (facebookRegisterBtn) facebookRegisterBtn.addEventListener('click', signInWithFacebook);
  
  // Set up event listeners for "continue without login" buttons
  if (continueWithoutLoginBtns) {
    continueWithoutLoginBtns.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        handleContinueWithoutLogin();
      });
    });
  }
  
  // Helper function to show error messages
  function showError(element, message) {
    if (element) {
      element.textContent = message;
      element.style.display = 'block';
    }
  }
  
  // Helper function to clear error messages
  function clearErrors() {
    if (loginError) loginError.textContent = '';
    if (registerError) registerError.textContent = '';
  }
  
  // Check if user is already logged in
  function checkLoginStatus() {
    try {
      auth.onAuthStateChanged(function(user) {
        if (user) {
          // User is already logged in, ensure session storage is updated
          const userData = {
            email: user.email,
            uid: user.uid,
            loginMethod: 'firebase',
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL,
            language: i18n.getCurrentLanguage()
          };
          
          sessionStorage.setItem('currentUser', JSON.stringify(userData));
          
          // Redirect to main app if not already there
          if (!window.location.href.includes('app.html')) {
            window.location.href = 'app.html';
          }
        }
      });
    } catch (e) {
      console.error('Error checking login status:', e);
    }
  }
  
  // Check login status when page loads
  setTimeout(checkLoginStatus, 500);
}); 