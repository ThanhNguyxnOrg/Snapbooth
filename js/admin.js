// Admin functionality
class Admin {
    constructor() {
        this.isLoggedIn = false;
        this.photos = [];
        this.currentFilter = {
            status: 'all',
            date: ''
        };

        this.initializeElements();
        this.setupEventListeners();
        this.checkLoginStatus();
    }

    initializeElements() {
        // Sections
        this.loginSection = document.getElementById('login-section');
        this.dashboardSection = document.getElementById('dashboard-section');
        
        // Login elements
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.getElementById('login-btn');
        this.loginError = document.getElementById('login-error');
        this.logoutBtn = document.getElementById('logout-btn');

        // Dashboard elements
        this.pendingCount = document.getElementById('pending-count');
        this.totalCount = document.getElementById('total-count');
        this.statusFilter = document.getElementById('status-filter');
        this.dateFilter = document.getElementById('date-filter');
        this.photosGrid = document.getElementById('photos-grid');
    }

    setupEventListeners() {
        // Login handling
        this.loginBtn.addEventListener('click', () => this.handleLogin());
        this.logoutBtn.addEventListener('click', () => this.handleLogout());

        // Filter handling
        this.statusFilter.addEventListener('change', () => {
            this.currentFilter.status = this.statusFilter.value;
            this.displayPhotos();
        });

        this.dateFilter.addEventListener('change', () => {
            this.currentFilter.date = this.dateFilter.value;
            this.displayPhotos();
        });

        // Handle enter key in login form
        this.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
    }

    checkLoginStatus() {
        const token = localStorage.getItem('adminToken');
        if (token === 'admin-authenticated') { // Simplified auth for demo
            this.isLoggedIn = true;
            this.showDashboard();
            this.loadPhotos();
        }
    }

    async handleLogin() {
        const username = this.usernameInput.value;
        const password = this.passwordInput.value;

        // Simplified authentication for demo
        if (username === 'admin' && password === 'admin123') {
            localStorage.setItem('adminToken', 'admin-authenticated');
            this.isLoggedIn = true;
            this.showDashboard();
            this.loadPhotos();
            this.loginError.textContent = '';
        } else {
            this.loginError.textContent = 'Invalid username or password';
        }
    }

    handleLogout() {
        localStorage.removeItem('adminToken');
        this.isLoggedIn = false;
        this.showLogin();
    }

    showLogin() {
        this.loginSection.classList.add('active');
        this.dashboardSection.classList.remove('active');
    }

    showDashboard() {
        this.loginSection.classList.remove('active');
        this.dashboardSection.classList.add('active');
    }

    loadPhotos() {
        // In a real app, this would fetch from a server
        // Using localStorage for demo purposes
        this.photos = JSON.parse(localStorage.getItem('photos') || '[]');
        this.updateStats();
        this.displayPhotos();
    }

    updateStats() {
        const pendingPhotos = this.photos.filter(photo => photo.status === 'pending');
        this.pendingCount.textContent = pendingPhotos.length;
        this.totalCount.textContent = this.photos.length;
    }

    displayPhotos() {
        const filteredPhotos = this.filterPhotos();
        this.photosGrid.innerHTML = '';

        filteredPhotos.forEach(photo => {
            const photoCard = this.createPhotoCard(photo);
            this.photosGrid.appendChild(photoCard);
        });
    }

    filterPhotos() {
        return this.photos.filter(photo => {
            const statusMatch = this.currentFilter.status === 'all' || photo.status === this.currentFilter.status;
            const dateMatch = !this.currentFilter.date || photo.date.startsWith(this.currentFilter.date);
            return statusMatch && dateMatch;
        });
    }

    createPhotoCard(photo) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        
        card.innerHTML = `
            <img src="${photo.url}" alt="Photo" />
            <div class="photo-info">
                <p>Date: ${photo.date}</p>
                <p>Status: ${photo.status}</p>
                ${photo.status === 'pending' ? `
                    <div class="photo-actions">
                        <button class="approve-btn" onclick="admin.approvePhoto('${photo.id}')">Approve</button>
                        <button class="reject-btn" onclick="admin.rejectPhoto('${photo.id}')">Reject</button>
                    </div>
                ` : ''}
            </div>
        `;

        return card;
    }

    approvePhoto(id) {
        this.updatePhotoStatus(id, 'approved');
    }

    rejectPhoto(id) {
        this.updatePhotoStatus(id, 'rejected');
    }

    updatePhotoStatus(id, status) {
        const photo = this.photos.find(p => p.id === id);
        if (photo) {
            photo.status = status;
            photo.moderatedAt = new Date().toISOString();
            localStorage.setItem('photos', JSON.stringify(this.photos));
            this.updateStats();
            this.displayPhotos();
        }
    }
}

// Initialize admin functionality
const admin = new Admin();
