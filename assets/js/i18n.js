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
    updateCustomSelect();
  }
}

// Update the custom language dropdown display
function updateCustomSelect() {
  const languageDropdown = document.getElementById('language-dropdown');
  const selectedLanguageEl = document.getElementById('selected-language');
  const selectedFlagEl = document.getElementById('selected-flag');
  const customSelect = document.querySelector('.custom-select');
  
  if (languageDropdown && selectedLanguageEl && selectedFlagEl && customSelect) {
    // Update the hidden native select value
    languageDropdown.value = currentLanguage;
    
    // Find the matching option data
    const option = [...languageDropdown.options].find(opt => opt.value === currentLanguage);
    
    if (option) {
      const flagCode = option.getAttribute('data-flag');
      
      // Update display text
      selectedLanguageEl.textContent = option.textContent;
      
      // Update flag
      selectedFlagEl.className = 'flag-icon';
      if (flagCode) {
        selectedFlagEl.classList.add(`flag-icon-${flagCode}`);
      }
      
      // Mark the selected item in the dropdown
      const allItems = customSelect.querySelectorAll('.select-item');
      allItems.forEach(item => {
        if (item.getAttribute('data-value') === currentLanguage) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
        }
      });
      
      // Update RTL if needed
      document.body.style.direction = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    }
  }
}

// Initialize the custom language dropdown
function initCustomSelect() {
  const customSelect = document.querySelector('.custom-select');
  const selectSelected = document.querySelector('.select-selected');
  const selectItems = document.querySelector('.select-items');
  const languageDropdown = document.getElementById('language-dropdown');
  
  if (customSelect && selectSelected && selectItems && languageDropdown) {
    // Toggle dropdown when clicking the selected item
    selectSelected.addEventListener('click', function(e) {
      e.stopPropagation();
      selectItems.classList.toggle('select-hide');
      selectSelected.classList.toggle('active');
    });
    
    // Handle item selection
    const items = document.querySelectorAll('.select-item');
    items.forEach(item => {
      item.addEventListener('click', function() {
        const value = this.getAttribute('data-value');
        changeLanguage(value);
        selectItems.classList.add('select-hide');
        selectSelected.classList.remove('active');
      });
    });
    
    // Close dropdown when clicking elsewhere
    document.addEventListener('click', function() {
      selectItems.classList.add('select-hide');
      selectSelected.classList.remove('active');
    });
  }
}

// Initialize the language system when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Set up the language
  currentLanguage = detectLanguage();
  
  // Initialize custom select
  initCustomSelect();
  
  // Update display
  updateCustomSelect();
  
  // Apply initial translations
  applyTranslations();
});

// Expose the translation functions globally
window.i18n = {
  translate: translateText,
  changeLanguage: changeLanguage,
  getCurrentLanguage: () => currentLanguage
}; 