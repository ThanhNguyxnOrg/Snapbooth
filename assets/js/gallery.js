// Gallery page functionality
document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const galleryGrid = document.getElementById('gallery-grid');
  const noPhotosMessage = document.querySelector('.no-photos');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxAuthor = document.getElementById('lightbox-author');
  const lightboxDate = document.getElementById('lightbox-date');
  const likeButton = document.getElementById('like-button');
  const likeCount = document.getElementById('like-count');
  const commentsContainer = document.getElementById('comments-container');
  const commentInput = document.getElementById('comment-input');
  const submitComment = document.getElementById('submit-comment');
  const closeLightbox = document.querySelector('.close-lightbox');
  const downloadButton = document.getElementById('download-button');
  const languageDropdown = document.getElementById('language-dropdown');
  const selectedFlag = document.getElementById('selected-flag');
  const userInfoContainer = document.getElementById('user-info');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');

  // Current state
  let currentUser = null;
  let currentFilter = 'all';
  let currentSearchQuery = '';
  let currentPhotoData = null;
  let photos = [];

  // Initialize Firebase services
  const db = firebase.firestore ? firebase.firestore() : null;
  const storage = firebase.storage ? firebase.storage() : null;
  const auth = firebase.auth ? firebase.auth() : null;

  // Initialize language support
  initLanguage();
  
  // Initialize authentication
  initAuth();

  // Set up event listeners
  setupEventListeners();

  // Load photos
  loadPhotos();

  // Initialize language support
  function initLanguage() {
    // Check if user has logged in with language preference
    const sessionUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const savedLanguage = localStorage.getItem('language') || sessionUser.language;
    
    // Set language dropdown if available
    if (languageDropdown && savedLanguage) {
      languageDropdown.value = savedLanguage;
    }
    
    // Update flag icon for the selected language
    if (selectedFlag && languageDropdown) {
      const selectedOption = languageDropdown.options[languageDropdown.selectedIndex];
      const flagCode = selectedOption.getAttribute('data-flag');
      if (flagCode) {
        selectedFlag.className = 'flag-icon flag-icon-' + flagCode;
      }
    }
    
    // Initialize translations if i18n is available
    if (window.i18n && typeof window.i18n.changeLanguage === 'function') {
      if (savedLanguage) {
        window.i18n.changeLanguage(savedLanguage);
      } else {
        // Apply default translations
        window.applyTranslations();
      }
    }

    // Set up language change event
    if (languageDropdown && window.i18n) {
      languageDropdown.addEventListener('change', function() {
        window.i18n.changeLanguage(this.value);
        
        // Update flag when language changes
        if (selectedFlag) {
          const selectedOption = languageDropdown.options[languageDropdown.selectedIndex];
          const flagCode = selectedOption.getAttribute('data-flag');
          if (flagCode) {
            selectedFlag.className = 'flag-icon flag-icon-' + flagCode;
          }
        }
      });
    }
  }

  // Initialize authentication
  function initAuth() {
    if (auth) {
      // Listen to auth state changes
      auth.onAuthStateChanged(user => {
        if (user) {
          currentUser = user;
          displayUserInfo(user);
        } else {
          // Try session storage for users who continued without login
          const sessionUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
          if (sessionUser.email) {
            currentUser = sessionUser;
            displayUserFromSession(sessionUser);
          }
        }
      });
    } else {
      // Fallback to session storage if Firebase is not available
      const sessionUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      if (sessionUser.email) {
        currentUser = sessionUser;
        displayUserFromSession(sessionUser);
      }
    }
  }

  // Display user info from Firebase Auth
  function displayUserInfo(user) {
    if (userInfoContainer) {
      userInfoContainer.style.display = 'flex';
      
      // Set avatar if available
      if (user.photoURL) {
        userAvatar.src = user.photoURL;
      }
      
      // Set user name or email
      userName.textContent = user.displayName || user.email.split('@')[0];
    }
  }

  // Display user info from session storage
  function displayUserFromSession(sessionUser) {
    if (userInfoContainer && sessionUser.email) {
      userInfoContainer.style.display = 'flex';
      
      // Set avatar if available
      if (sessionUser.photoURL) {
        userAvatar.src = sessionUser.photoURL;
      }
      
      // Set user name or email
      userName.textContent = sessionUser.displayName || sessionUser.email.split('@')[0];
    }
  }

  // Logout user
  function logoutUser() {
    // Clear session storage
    sessionStorage.removeItem('currentUser');
    
    // Sign out from Firebase if available
    if (auth) {
      auth.signOut()
        .then(() => {
          // Redirect to login page
          window.location.href = 'index.html';
        })
        .catch((error) => {
          console.error('Sign out error:', error);
          // Redirect anyway
          window.location.href = 'index.html';
        });
    } else {
      // Just redirect if Firebase is not available
      window.location.href = 'index.html';
    }
  }

  // Set up event listeners
  function setupEventListeners() {
    // Filter buttons
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        const filter = button.getAttribute('data-filter');
        currentFilter = filter;
        
        // Update active state
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Apply filter
        applyFilters();
      });
    });

    // Search
    searchBtn.addEventListener('click', () => {
      currentSearchQuery = searchInput.value.trim().toLowerCase();
      applyFilters();
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        currentSearchQuery = searchInput.value.trim().toLowerCase();
        applyFilters();
      }
    });

    // Lightbox close
    closeLightbox.addEventListener('click', () => {
      lightbox.style.display = 'none';
    });

    // Close lightbox when clicking outside content
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        lightbox.style.display = 'none';
      }
    });

    // Like button
    likeButton.addEventListener('click', () => {
      if (!currentPhotoData || !currentUser) return;
      
      if (db) {
        const photoRef = db.collection('photos').doc(currentPhotoData.id);
        
        db.runTransaction(transaction => {
          return transaction.get(photoRef).then(photoDoc => {
            if (!photoDoc.exists) return;
            
            const photoData = photoDoc.data();
            const likes = photoData.likes || [];
            const userId = currentUser.uid || currentUser.email;
            
            if (likes.includes(userId)) {
              // Unlike
              transaction.update(photoRef, {
                likes: firebase.firestore.FieldValue.arrayRemove(userId)
              });
              return false; // Return false to indicate unlike
            } else {
              // Like
              transaction.update(photoRef, {
                likes: firebase.firestore.FieldValue.arrayUnion(userId)
              });
              return true; // Return true to indicate like
            }
          });
        }).then(liked => {
          // Update UI
          if (liked) {
            likeButton.classList.add('liked');
            likeCount.textContent = parseInt(likeCount.textContent || '0') + 1;
          } else {
            likeButton.classList.remove('liked');
            likeCount.textContent = Math.max(0, parseInt(likeCount.textContent || '0') - 1);
          }
        }).catch(error => {
          console.error("Error updating likes: ", error);
        });
      }
    });

    // Download button
    downloadButton.addEventListener('click', () => {
      if (!currentPhotoData) return;
      
      const a = document.createElement('a');
      a.href = currentPhotoData.imageUrl;
      a.download = `photo-booth-${Date.now()}.png`;
      a.click();
    });

    // Submit comment
    submitComment.addEventListener('click', () => {
      const commentText = commentInput.value.trim();
      if (!commentText || !currentPhotoData || !currentUser) return;
      
      if (db) {
        const photoRef = db.collection('photos').doc(currentPhotoData.id);
        const comment = {
          text: commentText,
          userId: currentUser.uid || currentUser.email,
          userName: currentUser.displayName || currentUser.email.split('@')[0],
          createdAt: new Date().toISOString()
        };
        
        photoRef.update({
          comments: firebase.firestore.FieldValue.arrayUnion(comment)
        }).then(() => {
          // Add comment to UI
          addCommentToUI(comment);
          
          // Clear input
          commentInput.value = '';
        }).catch(error => {
          console.error("Error adding comment: ", error);
        });
      }
    });

    // Logout button
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logoutUser);
    }
  }

  // Load photos from Firestore
  function loadPhotos() {
    if (!db) {
      console.error("Firestore is not available");
      showNoPhotosMessage();
      return;
    }
    
    db.collection('photos')
      .orderBy('createdAt', 'desc')
      .get()
      .then(snapshot => {
        photos = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          photos.push({
            id: doc.id,
            title: data.title || 'Untitled',
            imageUrl: data.imageUrl,
            thumbnailUrl: data.thumbnailUrl || data.imageUrl,
            authorId: data.authorId,
            authorName: data.authorName,
            createdAt: data.createdAt,
            likes: data.likes || [],
            comments: data.comments || []
          });
        });
        
        // Apply filters to initially show photos
        applyFilters();
      })
      .catch(error => {
        console.error("Error getting photos: ", error);
        showNoPhotosMessage();
      });
  }

  // Apply filters to photos
  function applyFilters() {
    let filteredPhotos = [...photos];
    
    // Apply category filter
    if (currentFilter === 'my' && currentUser) {
      const userId = currentUser.uid || currentUser.email;
      filteredPhotos = filteredPhotos.filter(photo => photo.authorId === userId);
    }
    
    // Apply search filter
    if (currentSearchQuery) {
      filteredPhotos = filteredPhotos.filter(photo => 
        photo.title.toLowerCase().includes(currentSearchQuery) || 
        photo.authorName.toLowerCase().includes(currentSearchQuery)
      );
    }
    
    // Display filtered photos
    displayPhotos(filteredPhotos);
  }

  // Display photos in the grid
  function displayPhotos(photosToDisplay) {
    // Clear loading spinner
    galleryGrid.innerHTML = '';
    
    if (photosToDisplay.length === 0) {
      showNoPhotosMessage();
      return;
    }
    
    // Hide no photos message
    noPhotosMessage.style.display = 'none';
    
    // Create and append photo items
    photosToDisplay.forEach(photo => {
      const photoElement = createPhotoElement(photo);
      galleryGrid.appendChild(photoElement);
    });
  }

  // Create a single photo element
  function createPhotoElement(photo) {
    const photoElement = document.createElement('div');
    photoElement.className = 'gallery-item';
    photoElement.dataset.id = photo.id;
    
    const date = new Date(photo.createdAt);
    const formattedDate = date.toLocaleDateString();
    
    photoElement.innerHTML = `
      <img src="${photo.thumbnailUrl}" alt="${photo.title}" loading="lazy">
      <div class="gallery-item-info">
        <h3>${photo.title}</h3>
        <p>${photo.authorName} • ${formattedDate}</p>
        <div class="gallery-item-stats">
          <span>${photo.likes.length} likes</span>
          <span>${photo.comments.length} comments</span>
        </div>
      </div>
    `;
    
    // Open lightbox when clicking on photo
    photoElement.addEventListener('click', () => {
      openLightbox(photo);
    });
    
    return photoElement;
  }

  // Show no photos message
  function showNoPhotosMessage() {
    galleryGrid.innerHTML = '';
    noPhotosMessage.style.display = 'block';
  }

  // Open lightbox with photo
  function openLightbox(photo) {
    currentPhotoData = photo;
    
    // Set image and info
    lightboxImage.src = photo.imageUrl;
    lightboxAuthor.textContent = `By: ${photo.authorName}`;
    
    const date = new Date(photo.createdAt);
    lightboxDate.textContent = `Posted: ${date.toLocaleDateString()}`;
    
    // Set like button state
    const userId = currentUser ? (currentUser.uid || currentUser.email) : null;
    const isLiked = userId && photo.likes.includes(userId);
    
    if (isLiked) {
      likeButton.classList.add('liked');
    } else {
      likeButton.classList.remove('liked');
    }
    
    likeCount.textContent = photo.likes.length;
    
    // Load comments
    loadComments(photo.comments);
    
    // Show lightbox
    lightbox.style.display = 'block';
  }

  // Load comments into the comments container
  function loadComments(comments) {
    commentsContainer.innerHTML = '';
    
    if (comments.length === 0) {
      commentsContainer.innerHTML = `<p class="no-comments">${window.i18n ? window.i18n.translate('noComments') : 'No comments yet'}</p>`;
      return;
    }
    
    // Sort comments by date (newest first)
    const sortedComments = [...comments].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    // Add comments to UI
    sortedComments.forEach(comment => {
      addCommentToUI(comment);
    });
  }

  // Add a single comment to the UI
  function addCommentToUI(comment) {
    const commentElement = document.createElement('div');
    commentElement.className = 'comment';
    
    const date = new Date(comment.createdAt);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    commentElement.innerHTML = `
      <div class="comment-header">
        <span class="comment-author">${comment.userName}</span>
        <span class="comment-date">${formattedDate}</span>
      </div>
      <div class="comment-text">${comment.text}</div>
    `;
    
    // Add to the beginning of the container
    commentsContainer.insertBefore(commentElement, commentsContainer.firstChild);
  }
}); 