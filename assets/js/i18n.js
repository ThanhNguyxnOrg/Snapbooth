// Internationalization utilities for the Photo Booth application

// The current language code
let currentLanguage = 'en';

// Get browser language or previously saved language preference
function detectLanguage() {
  // Check localStorage first for saved preference
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage && translations[savedLanguage]) {
    return savedLanguage;
  }
  
  // Otherwise try to detect from browser
  const browserLang = navigator.language.split('-')[0]; // Get base language code
  
  // Check if we support this language
  if (translations[browserLang]) {
    return browserLang;
  }
  
  // Default to English
  return 'en';
}

// Translate a specific key
function translateText(key, params = {}) {
  // Get the translation from the current language or fallback to English
  const text = translations[currentLanguage][key] || translations.en[key] || key;
  
  // Replace any parameters in the text
  return Object.keys(params).reduce((result, param) => {
    return result.replace(`{${param}}`, params[param]);
  }, text);
}

// Apply translations to the entire page
function applyTranslations() {
  // Update document title if on login page
  if (document.title.includes('Login') || document.title.includes('Photo Booth')) {
    document.title = translateText('login') + " - Photo Booth";
  }
  
  // Translate all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = translateText(key);
  });
  
  // Translate all placeholders with data-i18n-placeholder attribute
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.setAttribute('placeholder', translateText(key));
  });
}

// Change the current language
function changeLanguage(languageCode) {
  if (translations[languageCode]) {
    currentLanguage = languageCode;
    localStorage.setItem('language', languageCode);
    applyTranslations();
    updateFlagIcon();
  }
}

// Update flag icon based on selected language
function updateFlagIcon() {
  const selectedFlag = document.getElementById('selected-flag');
  const languageDropdown = document.getElementById('language-dropdown');
  
  if (selectedFlag && languageDropdown) {
    const selectedOption = languageDropdown.options[languageDropdown.selectedIndex];
    const flagCode = selectedOption.getAttribute('data-flag');
    
    // Remove all existing flag classes
    selectedFlag.className = 'flag-icon';
    
    // Add the correct flag class
    if (flagCode) {
      selectedFlag.classList.add(`flag-icon-${flagCode}`);
    }
  }
}

// Initialize the language system when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Set up the language dropdown
  const languageDropdown = document.getElementById('language-dropdown');
  
  if (languageDropdown) {
    // Detect and set the initial language
    currentLanguage = detectLanguage();
    languageDropdown.value = currentLanguage;
    
    // Apply initial translations
    applyTranslations();
    
    // Set up initial flag
    updateFlagIcon();
    
    // Set up language change event
    languageDropdown.addEventListener('change', function() {
      changeLanguage(this.value);
    });
  }
});

// Expose the translation functions globally
window.i18n = {
  translate: translateText,
  changeLanguage: changeLanguage,
  getCurrentLanguage: () => currentLanguage,
  updateFlag: updateFlagIcon
}; 