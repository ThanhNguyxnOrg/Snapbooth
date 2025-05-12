# Photo Booth Web Application

A modern web-based photo booth application with Firebase authentication and a clean, modular structure.

## Features

- User authentication (login/register)
- Live camera preview
- 3-second countdown timer
- Capture three photos
- Download photo strip
- Modern UI with responsive design
- Secure user sessions

## Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

2. Get your Firebase configuration and update `src/js/firebase-config.js` with your credentials:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

3. Enable Email/Password authentication in your Firebase project:
   - Go to Authentication > Sign-in method
   - Enable Email/Password provider

4. Serve the application using a local web server (due to module security requirements)
   For example, using Python:
   ```bash
   python -m http.server 8000
   ```
   Or using Node.js:
   ```bash
   npx http-server
   ```

5. Access the application at `http://localhost:8000`

## Project Structure

```
├── index.html           # Main application page
├── login.html          # Login/Register page
├── src/
│   ├── js/
│   │   ├── camera.js           # Camera functionality
│   │   └── firebase-config.js  # Firebase configuration
│   └── css/
│       └── styles.css          # Application styles
└── README.md
```

## Usage

1. Register or login with your email and password
2. Allow camera access when prompted
3. Click "Take Photo" to start the countdown
4. After taking 3 photos, click "Download Photos" to get your photo strip
5. Click "Take Photo" again to start a new session
6. Use the "Logout" button to end your session

## Browser Support

The application requires a modern browser with support for:
- WebRTC (getUserMedia API)
- ES6 Modules
- Async/Await
- CSS Grid/Flexbox

## Security

- Authentication is handled securely through Firebase
- Camera access requires explicit user permission
- No sensitive data is stored locally
- All Firebase communication is encrypted

## License

MIT License - feel free to use and modify for your own projects.

## Author

ThanhNguyxn
