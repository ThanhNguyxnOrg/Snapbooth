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
  
  // Make sure Firebase is properly initialized
  let auth;
  try {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      auth = firebase.auth();
    } else {
      console.error('Firebase is not properly initialized');
      showError(loginError, 'Firebase initialization failed. Please check your configuration.');
      disableAuthForms();
    }
  } catch (e) {
    console.error('Firebase initialization error:', e);
    showError(loginError, 'Firebase initialization failed. Please check your configuration.');
    disableAuthForms();
  }
  
  // Configure providers if Firebase is available
  let googleProvider, facebookProvider;
  if (auth) {
    try {
      googleProvider = new firebase.auth.GoogleAuthProvider();
      facebookProvider = new firebase.auth.FacebookAuthProvider();
    } catch (e) {
      console.error('Provider initialization error:', e);
    }
  }
  
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
      
      if (!auth) {
        handleContinueWithoutLogin();
        return;
      }
      
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
              showError(loginError, i18n.translate('loginError') + ': ' + error.message);
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
      
      if (!auth) {
        handleContinueWithoutLogin();
        return;
      }
      
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
              showError(registerError, i18n.translate('registerError') + ': ' + error.message);
          }
          
          // Reset button state
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        });
    });
  }
  
  // Google login handler
  function signInWithGoogle() {
    if (!auth || !googleProvider) {
      handleContinueWithoutLogin();
      return;
    }
    
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
          showError(loginError, 'Google sign-in failed: ' + error.message);
          showError(registerError, 'Google sign-in failed: ' + error.message);
        }
      });
  }
  
  // Facebook login handler
  function signInWithFacebook() {
    if (!auth || !facebookProvider) {
      handleContinueWithoutLogin();
      return;
    }
    
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
          showError(loginError, 'Facebook sign-in failed: ' + error.message);
          showError(registerError, 'Facebook sign-in failed: ' + error.message);
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
  
  // Helper function to disable auth forms when Firebase is not available
  function disableAuthForms() {
    // Disable form inputs and buttons
    const forms = [loginFormEl, registerFormEl];
    forms.forEach(form => {
      if (form) {
        const inputs = form.querySelectorAll('input');
        const buttons = form.querySelectorAll('button:not(.secondary-btn)');
        
        inputs.forEach(input => input.disabled = true);
        buttons.forEach(button => button.disabled = true);
        
        // Add notice about guest mode
        const notice = document.createElement('div');
        notice.className = 'auth-notice';
        notice.textContent = 'Authentication is currently unavailable. You can continue as a guest.';
        notice.style.color = '#e74c3c';
        notice.style.margin = '10px 0';
        notice.style.padding = '10px';
        notice.style.border = '1px solid #e74c3c';
        notice.style.borderRadius = '4px';
        notice.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
        
        form.insertBefore(notice, form.firstChild);
      }
    });
  }
  
  // Check if user is already logged in
  function checkLoginStatus() {
    if (auth) {
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
  }
  
  // Check login status when page loads (with a slight delay to ensure Firebase is initialized)
  setTimeout(checkLoginStatus, 500);
}); 