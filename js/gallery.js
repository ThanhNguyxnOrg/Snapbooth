class Gallery {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.photos = [];
        this.filters = {
            date: 'all', // all, today, week, month
            filter: 'all', // all, bw, sepia, etc.
            status: 'approved' // Only show approved photos by default
        };
        
        this.initializeGallery();
        this.loadPhotos();
        this.setupEventListeners();
    }

    initializeGallery() {
        // Create gallery section if it doesn't exist
        if (!document.querySelector('.gallery-section')) {
            const galleryHTML = `
                <div class="gallery-section" id="gallery-section">
                    <h2>✨ Photo Gallery ✨</h2>
                    <div class="gallery-filters">
                        <button class="filter-btn active" data-date="all">All Time</button>
                        <button class="filter-btn" data-date="today">Today</button>
                        <button class="filter-btn" data-date="week">This Week</button>
                        <button class="filter-btn" data-date="month">This Month</button>
                        <button class="filter-btn" data-filter="all">All Filters</button>
                        <button class="filter-btn" data-filter="bw">Black & White</button>
                        <button class="filter-btn" data-filter="sepia">Sepia</button>
                        <button class="filter-btn" data-filter="warm">Warm</button>
                    </div>
                    <div class="gallery-grid"></div>
                    <button class="load-more">Load More Photos</button>
                </div>
            `;
            document.querySelector('.container').insertAdjacentHTML('beforeend', galleryHTML);
        }
    }

    loadPhotos() {
        // Simulate loading photos from a server
        // In a real app, this would be an API call
        const mockPhotos = [
            {
                id: 1,
                imageUrl: 'path/to/image1.jpg',
                username: 'user1',
                date: new Date(),
                filter: 'none'
            },
            // Add more mock photos here
        ];

        this.photos = [...this.photos, ...mockPhotos];
        this.displayPhotos();
    }

    submitForModeration(photoData) {
        // In a real app, this would be an API call
        const submission = {
            ...photoData,
            status: 'pending',
            submittedAt: new Date(),
            moderatedAt: null
        };

        // Show confirmation message
        this.showModerationMessage();
        
        // Simulate moderation process (in reality, this would be done by admins)
        setTimeout(() => {
            // Randomly approve or reject for demo purposes
            submission.status = Math.random() > 0.2 ? 'approved' : 'rejected';
            submission.moderatedAt = new Date();
            
            if (submission.status === 'approved') {
                this.photos.unshift(submission);
                this.displayPhotos();
            }
        }, 30000); // Simulate 30-second review process
    }

    showModerationMessage() {
        const message = document.createElement('div');
        message.className = 'moderation-message';
        message.textContent = translations[getCurrentLanguage()].moderationMessage;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 5000);
    }

    displayPhotos() {
        const grid = document.querySelector('.gallery-grid');
        const filteredPhotos = this.filterPhotos();
        
        if (filteredPhotos.length === 0) {
            grid.innerHTML = '<div class="gallery-empty">No photos found 📸</div>';
            return;
        }

        const photosToShow = filteredPhotos.slice(0, this.currentPage * this.itemsPerPage);
        
        grid.innerHTML = photosToShow.map((photo, index) => `
            <div class="gallery-item" style="animation-delay: ${index * 0.1}s">
                <img src="${photo.imageUrl}" alt="Gallery photo" style="filter: ${this.getFilterStyle(photo.filter)}">
                ${this.getModerationBadge(photo.status)}
                <div class="gallery-info">
                    <div class="gallery-user">📸 ${photo.username}</div>
                    <div class="gallery-date">${this.formatDate(photo.date)}</div>
                </div>
            </div>
        `).join('');

        // Show/hide load more button
        const loadMoreBtn = document.querySelector('.load-more');
        loadMoreBtn.style.display = photosToShow.length < filteredPhotos.length ? 'block' : 'none';
    }

    getModerationBadge(status) {
        const labels = {
            pending: '⏳',
            approved: '✅',
            rejected: '❌'
        };
        
        return status === 'approved' ? '' : `
            <div class="moderation-badge ${status}">
                ${labels[status]}
                <span data-translate="${status}">${translations[getCurrentLanguage()][status]}</span>
            </div>
        `;
    }

    filterPhotos() {
        return this.photos.filter(photo => {
            const dateMatch = this.matchesDateFilter(photo.date);
            const filterMatch = this.filters.filter === 'all' || photo.filter === this.filters.filter;
            const statusMatch = this.filters.status === 'all' || photo.status === this.filters.status;
            return dateMatch && filterMatch && statusMatch;
        });
    }

    matchesDateFilter(date) {
        const now = new Date();
        const photoDate = new Date(date);
        
        switch(this.filters.date) {
            case 'today':
                return photoDate.toDateString() === now.toDateString();
            case 'week':
                const weekAgo = new Date(now.setDate(now.getDate() - 7));
                return photoDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
                return photoDate >= monthAgo;
            default:
                return true;
        }
    }

    getFilterStyle(filter) {
        switch (filter) {
            case "black-and-white":
                return "grayscale(100%)";
            case "sepia":
                return "sepia(100%)";
            case "warm":
                return "hue-rotate(-30deg) saturate(150%)";
            default:
                return "none";
        }
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterType = e.target.dataset.date ? 'date' : 'filter';
                const value = e.target.dataset.date || e.target.dataset.filter;
                
                // Update active state
                document.querySelectorAll(`[data-${filterType}]`).forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update filters and refresh display
                this.filters[filterType] = value;
                this.currentPage = 1;
                this.displayPhotos();
            });
        });

        // Load more button
        document.querySelector('.load-more').addEventListener('click', () => {
            this.currentPage++;
            this.displayPhotos();
        });
    }
}

// Initialize gallery
const gallery = new Gallery();
