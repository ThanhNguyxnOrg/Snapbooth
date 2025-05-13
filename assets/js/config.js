/**
 * Photo Booth App Configuration
 * Version: 1.0.0
 */

const APP_CONFIG = {
  // Application info
  version: '1.0.0',
  name: 'Photo Booth',
  
  // Camera settings
  camera: {
    countdown: 3, // seconds
    quality: 0.9, // image quality (0-1)
    width: 640,
    height: 480
  },
  
  // Photostrip settings
  photostrip: {
    width: 220,
    height: 670,
    photoWidth: 200,
    photoHeight: 200,
    borderColor: '#ff99cc',
    borderWidth: 5,
    defaultBg: '#fff'
  },
  
  // Date format
  dateFormat: {
    defaultDate: 'March 16, 2025', // Default display date
    useLiveDate: false // Set to true to use current date instead of fixed date
  }
};

// Export configuration
export default APP_CONFIG; 