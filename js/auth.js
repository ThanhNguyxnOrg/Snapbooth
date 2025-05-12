// Authentication management
class Auth {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.initializeAuth();
        this.setupLoginButtons();
    }

    initializeAuth() {
        // Check for existing session
        const userData = localStorage.getItem('userData');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.isAdmin = this.currentUser.role === 'admin';
            this.updateUI();
        }
    }

    setupLoginButtons() {
        // Regular login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleRegularLogin());
        }

        // Google login button
        const googleBtn = document.getElementById('google-login-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.handleGoogleLogin());
        }

        // Facebook login button
        const facebookBtn = document.getElementById('facebook-login-btn');
        if (facebookBtn) {
            facebookBtn.addEventListener('click', () => this.handleFacebookLogin());
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    async handleRegularLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('login-error');

        try {
            // Admin credentials check
            if (username === 'admin' && password === 'admin123') {
                this.currentUser = {
                    id: 'admin',
                    name: 'Administrator',
                    email: 'admin@photobooth.com',
                    role: 'admin'
                };
                this.isAdmin = true;
            } else {
                // Regular user login validation
                const isValid = await this.validateUserCredentials(username, password);
                if (!isValid) {
                    throw new Error(translations[this.getCurrentLanguage()].invalidCredentials);
                }
                this.currentUser = {
                    id: 'user_' + Date.now(),
                    name: username,
                    email: username,
                    role: 'user'
                };
                this.isAdmin = false;
            }

            // Save user data
            localStorage.setItem('userData', JSON.stringify(this.currentUser));
            this.updateUI();
            errorElement.textContent = '';

            // Redirect admin to admin panel
            if (this.isAdmin) {
                window.location.href = 'admin.html';
            }
        } catch (error) {
            errorElement.textContent = error.message;
        }
    }

    async handleGoogleLogin() {
        try {
            // Initialize Google Sign-In
            const auth2 = await this.loadGoogleAuth();
            const googleUser = await auth2.signIn();
            
            const profile = googleUser.getBasicProfile();
            this.currentUser = {
                id: profile.getId(),
                name: profile.getName(),
                email: profile.getEmail(),
                role: 'user'
            };

            localStorage.setItem('userData', JSON.stringify(this.currentUser));
            this.updateUI();
        } catch (error) {
            console.error('Google login failed:', error);
            document.getElementById('login-error').textContent = 
                translations[this.getCurrentLanguage()].socialLoginError;
        }
    }

    async handleFacebookLogin() {
        try {
            // Initialize Facebook Login
            const response = await new Promise((resolve, reject) => {
                FB.login((response) => {
                    if (response.status === 'connected') {
                        resolve(response);
                    } else {
                        reject(new Error('Facebook login failed'));
                    }
                }, { scope: 'public_profile,email' });
            });

            // Get user data
            const userData = await new Promise((resolve) => {
                FB.api('/me', { fields: 'name,email' }, (response) => {
                    resolve(response);
                });
            });

            this.currentUser = {
                id: response.authResponse.userID,
                name: userData.name,
                email: userData.email,
                role: 'user'
            };

            localStorage.setItem('userData', JSON.stringify(this.currentUser));
            this.updateUI();
        } catch (error) {
            console.error('Facebook login failed:', error);
            document.getElementById('login-error').textContent = 
                translations[this.getCurrentLanguage()].socialLoginError;
        }
    }

    handleLogout() {
        this.currentUser = null;
        this.isAdmin = false;
        localStorage.removeItem('userData');
        this.updateUI();

        // Redirect to home page if on admin panel
        if (window.location.pathname.includes('admin.html')) {
            window.location.href = 'index.html';
        }
    }

    updateUI() {
        // Update login status elements
        const loginSection = document.getElementById('login-section');
        const userSection = document.getElementById('user-section');
        const adminSection = document.getElementById('admin-section');

        if (loginSection && userSection) {
            if (this.currentUser) {
                loginSection.style.display = 'none';
                userSection.style.display = 'block';
                document.getElementById('user-name').textContent = this.currentUser.name;
            } else {
                loginSection.style.display = 'block';
                userSection.style.display = 'none';
            }
        }

        // Show/hide admin section if exists
        if (adminSection) {
            adminSection.style.display = this.isAdmin ? 'block' : 'none';
        }
    }

    async validateUserCredentials(username, password) {
        // In a real app, this would validate against a backend
        // For demo, accept any non-empty username/password
        return username.length > 0 && password.length > 0;
    }

    loadGoogleAuth() {
        return new Promise((resolve, reject) => {
            gapi.load('auth2', () => {
                gapi.auth2.init({
                    client_id: 'YOUR_GOOGLE_CLIENT_ID' // Replace with your Google Client ID
                }).then(resolve, reject);
            });
        });
    }

    getCurrentLanguage() {
        return localStorage.getItem('language') || 'en';
    }
}

// Initialize authentication
const auth = new Auth();
