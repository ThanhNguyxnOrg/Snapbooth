// Firebase configuration - MOCK VERSION
// Remove real Firebase config to prevent errors with invalid API keys
const firebaseConfig = {
  mockMode: true // Đánh dấu rằng chúng ta đang sử dụng phiên bản giả lập
};

// Mock Firebase for development
function createMockFirebase() {
  console.log("Using mock Firebase implementation for development");
  
  // Local storage keys for users
  const USERS_STORAGE_KEY = 'photobooth_mock_users';
  const CURRENT_USER_KEY = 'photobooth_mock_current_user';
  
  // Load existing mock users from local storage
  const getStoredUsers = () => {
    const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
    return usersJson ? JSON.parse(usersJson) : {};
  };
  
  // Save users to local storage
  const saveUsers = (users) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  };
  
  // Get current user from local storage
  const getStoredCurrentUser = () => {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  };
  
  // Save current user to local storage
  const saveCurrentUser = (user) => {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  };
  
  // Initialize mock users if not exist
  if (!localStorage.getItem(USERS_STORAGE_KEY)) {
    // Add some test users
    const initialUsers = {
      'test@example.com': {
        email: 'test@example.com',
        password: 'password123',
        uid: 'user_' + Date.now(),
        displayName: 'Test User',
        photoURL: null,
        createdAt: new Date().toISOString()
      }
    };
    saveUsers(initialUsers);
  }
  
  // Create mock Auth implementation
  const mockAuth = {
    currentUser: getStoredCurrentUser(),
    
    // Sign in with email and password
    signInWithEmailAndPassword: (email, password) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const users = getStoredUsers();
          const user = users[email];
          
          if (!user) {
            reject({ code: 'auth/user-not-found', message: 'User not found' });
            return;
          }
          
          if (user.password !== password) {
            reject({ code: 'auth/wrong-password', message: 'Wrong password' });
            return;
          }
          
          // Create user credential response
          const userCredential = {
            user: {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              emailVerified: true,
              updateProfile: (profileData) => {
                return new Promise((resolve) => {
                  users[email] = { ...user, ...profileData };
                  saveUsers(users);
                  mockAuth.currentUser = { ...mockAuth.currentUser, ...profileData };
                  saveCurrentUser(mockAuth.currentUser);
                  resolve();
                });
              }
            }
          };
          
          // Set as current user
          mockAuth.currentUser = userCredential.user;
          saveCurrentUser(mockAuth.currentUser);
          
          resolve(userCredential);
        }, 500); // Add delay to simulate network
      });
    },
    
    // Create user with email and password
    createUserWithEmailAndPassword: (email, password) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const users = getStoredUsers();
          
          if (users[email]) {
            reject({ code: 'auth/email-already-in-use', message: 'Email already in use' });
            return;
          }
          
          if (password.length < 6) {
            reject({ code: 'auth/weak-password', message: 'Password should be at least 6 characters' });
            return;
          }
          
          // Create new user
          const newUser = {
            uid: 'user_' + Date.now(),
            email: email,
            password: password,
            displayName: email.split('@')[0],
            photoURL: null,
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updateProfile: (profileData) => {
              return new Promise((resolve) => {
                users[email] = { ...users[email], ...profileData };
                saveUsers(users);
                mockAuth.currentUser = { ...mockAuth.currentUser, ...profileData };
                saveCurrentUser(mockAuth.currentUser);
                resolve();
              });
            }
          };
          
          // Add to users store
          users[email] = newUser;
          saveUsers(users);
          
          // Create user credential response
          const userCredential = {
            user: {
              uid: newUser.uid,
              email: newUser.email,
              displayName: newUser.displayName,
              photoURL: newUser.photoURL,
              emailVerified: true,
              updateProfile: newUser.updateProfile
            }
          };
          
          // Set as current user
          mockAuth.currentUser = userCredential.user;
          saveCurrentUser(mockAuth.currentUser);
          
          resolve(userCredential);
        }, 500); // Add delay to simulate network
      });
    },
    
    // Sign out
    signOut: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          mockAuth.currentUser = null;
          saveCurrentUser(null);
          
          const authChangeListeners = mockAuth._authChangeListeners || [];
          authChangeListeners.forEach(listener => listener(null));
          
          resolve();
        }, 300);
      });
    },
    
    // Sign in with popup
    signInWithPopup: (provider) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // Create a fake user based on the provider
          const providerName = provider === mockAuth.GoogleAuthProvider ? 'google' : 'facebook';
          const email = `user_${Date.now()}@${providerName}.com`;
          const displayName = `${providerName.charAt(0).toUpperCase() + providerName.slice(1)} User`;
          const photoURL = `https://ui-avatars.com/api/?name=${displayName.replace(' ', '+')}&background=random`;
          
          const users = getStoredUsers();
          
          // Create new user if not exists
          if (!users[email]) {
            users[email] = {
              uid: 'user_' + Date.now(),
              email: email,
              password: 'oauth_user',
              displayName: displayName,
              photoURL: photoURL,
              emailVerified: true,
              createdAt: new Date().toISOString()
            };
            saveUsers(users);
          }
          
          const user = users[email];
          
          // Create user credential response
          const userCredential = {
            user: {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              emailVerified: true
            },
            providerId: providerName,
            operationType: 'signIn'
          };
          
          // Set as current user
          mockAuth.currentUser = userCredential.user;
          saveCurrentUser(mockAuth.currentUser);
          
          const authChangeListeners = mockAuth._authChangeListeners || [];
          authChangeListeners.forEach(listener => listener(mockAuth.currentUser));
          
          resolve(userCredential);
        }, 1000);
      });
    },
    
    // Auth state changed event
    onAuthStateChanged: (listener) => {
      if (!mockAuth._authChangeListeners) {
        mockAuth._authChangeListeners = [];
      }
      
      mockAuth._authChangeListeners.push(listener);
      
      // Call immediately with current auth state
      listener(mockAuth.currentUser);
      
      // Return unsubscribe function
      return () => {
        mockAuth._authChangeListeners = mockAuth._authChangeListeners.filter(l => l !== listener);
      };
    },
    
    // Set persistence
    setPersistence: () => {
      return Promise.resolve();
    },
    
    // Auth providers
    GoogleAuthProvider: {},
    FacebookAuthProvider: {}
  };
  
  // Return mock firebase
  return {
    auth: () => mockAuth,
    firestore: () => ({}), // Add mock firestore if needed
    storage: () => ({}),   // Add mock storage if needed
    initializeApp: () => {},
    SDK_VERSION: 'mock-version'  // Add this to simulate a real Firebase instance
  };
}

// Always use Mock Firebase to avoid API key errors
console.log("Using mock Firebase implementation for the project");
window.firebase = createMockFirebase();

// Let the user know which implementation is being used
document.addEventListener('DOMContentLoaded', function() {
  if (document.querySelector('.auth-container')) {
    const infoMessage = document.createElement('div');
    infoMessage.className = 'firebase-info-banner';
    infoMessage.innerHTML = `
      <div style="background-color: #e6f7ff; color: #0066cc; padding: 10px; 
                  border: 1px solid #99ccff; border-radius: 4px; margin-bottom: 20px; 
                  text-align: center;">
        <p style="margin: 5px 0;">Đang sử dụng hệ thống đăng nhập offline. Bạn có thể đăng nhập với:</p>
        <p style="margin: 5px 0;">• Email: <strong>test@example.com</strong> / Password: <strong>password123</strong></p>
        <p style="margin: 5px 0;">• Phone: <strong>+84987654321</strong> / Code: <strong>123456</strong></p>
      </div>
    `;
    
    const authContainer = document.querySelector('.auth-container');
    if (authContainer && authContainer.firstChild) {
      authContainer.insertBefore(infoMessage, authContainer.firstChild);
    }
  }
}); 