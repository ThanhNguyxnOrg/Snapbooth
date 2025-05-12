// Main application logic
class PhotoBooth {
    constructor() {
        this.camera = new Camera();
        this.editor = new PhotoEditor();
        this.capturedImages = [];
        this.currentSlotIndex = 0;
        this.isCapturing = false;

        this.initializeElements();
        this.setupEventListeners();
        this.setupAutoCaptureHandling();
        this.initializeTheme();
    }

    initializeElements() {
        this.sections = {
            capture: document.getElementById("capture-section"),
            upload: document.getElementById("upload-section"),
            editor: document.getElementById("editor"),
            scrapbook: document.getElementById("scrapbook")
        };

        this.slots = [
            document.getElementById("slot-1"),
            document.getElementById("slot-2"),
            document.getElementById("slot-3")
        ];

        this.uploads = [
            document.getElementById("upload-1"),
            document.getElementById("upload-2"),
            document.getElementById("upload-3")
        ];

        this.buttons = {
            submit: document.getElementById("submit-btn"),
            preview: document.getElementById("preview-btn"),
            download: document.getElementById("download-btn"),
            retake: document.getElementById("retake-btn"),
            capture: document.getElementById("capture-btn")
        };

        this.dateCheckbox = document.getElementById("enable-date");
        this.dateStamp = document.getElementById("date-stamp");
    }

    setupEventListeners() {
        // Camera capture
        this.buttons.capture.addEventListener("click", () => {
            this.camera.startCountdown(() => this.capturePhoto());
        });

        // Image uploads
        this.setupUploadListeners();

        // Editor controls
        this.dateCheckbox.addEventListener("change", () => {
            this.dateStamp.style.display = this.dateCheckbox.checked ? "block" : "none";
        });

        // Button actions
        this.buttons.submit.addEventListener("click", () => this.submitImages());
        this.buttons.preview.addEventListener("click", () => this.previewInScrapbook());
        this.buttons.download.addEventListener("click", () => this.downloadPhotostrip());
        this.buttons.retake.addEventListener("click", () => this.retakePhotos());
    }

    setupUploadListeners() {
        this.slots.forEach((slot, index) => {
            slot.addEventListener("click", () => {
                this.uploads[index].click();
            });

            this.uploads[index].addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = document.createElement("img");
                        img.src = e.target.result;
                        slot.innerHTML = "";
                        slot.appendChild(img);
                        this.capturedImages[index] = e.target.result;
                        this.updateSubmitButton();
                    };
                    reader.readAsDataURL(file);
                }
            });
        });
    }

    setupAutoCaptureHandling() {
        this.buttons.capture.addEventListener("click", () => {
            if (this.camera.autoCapture.checked) {
                if (!this.camera.isAutoCaptureActive) {
                    this.camera.startAutoCapture(() => this.capturePhoto());
                    this.buttons.capture.textContent = "Dừng chụp";
                } else {
                    this.camera.stopAutoCapture();
                    this.buttons.capture.textContent = "Chụp ảnh";
                }
            } else {
                this.camera.startCountdown(() => this.capturePhoto());
            }
        });
    }    capturePhoto() {
        if (this.isCapturing) return; // Prevent multiple captures
        this.isCapturing = true;

        const dataURL = this.camera.capturePhoto();
        if (!dataURL) {
            this.isCapturing = false;
            return;
        }

        const img = new Image();
        img.onload = () => {
            this.slots[this.currentSlotIndex].innerHTML = "";
            this.slots[this.currentSlotIndex].appendChild(img);
            this.capturedImages[this.currentSlotIndex] = dataURL;

            this.currentSlotIndex++;
            if (this.currentSlotIndex >= this.slots.length) {
                this.camera.stopAutoCapture();
                this.buttons.capture.textContent = "Chụp ảnh";
                this.showSection('upload');
                this.updateSubmitButton();
                this.currentSlotIndex = 0;
            }

            this.isCapturing = false;
        };

        img.onerror = () => {
            console.error('Failed to load captured image');
            this.isCapturing = false;
        };

        img.src = dataURL;
    }

    showSection(sectionName) {
        Object.values(this.sections).forEach(section => {
            section.classList.remove('active');
        });
        this.sections[sectionName].classList.add('active');
    }

    updateSubmitButton() {
        const hasImages = this.capturedImages.length > 0 || 
                         this.uploads.some(upload => upload.files.length > 0);
        this.buttons.submit.disabled = !hasImages;
    }

    submitImages() {
        if (this.capturedImages.length > 0) {
            while (this.capturedImages.length < 3) {
                this.capturedImages.push(this.capturedImages[0]);
            }
            this.showSection('editor');
            this.updatePhotostrip();
        }
    }

    updatePhotostrip() {
        const photos = document.querySelectorAll(".photostrip img");
        this.capturedImages.forEach((dataURL, index) => {
            photos[index].src = dataURL;
        });
        this.editor.updatePhotostrip();
    }

    previewInScrapbook() {
        // Show scrapbook section
        this.showSection('scrapbook');
        
        // Get all scrapbook images including thumbnails
        const scrapbookImages = document.querySelectorAll(".scrapbook img");
        
        // Get the current filter style
        const currentFilterStyle = this.editor.getFilterStyle(this.editor.currentFilter);
        
        // Get the current background color
        const currentBgColor = document.getElementById("photostrip").style.backgroundColor || "#fff";
        
        // Update all photostrips in scrapbook
        document.querySelectorAll(".scrapbook .photostrip").forEach(strip => {
            strip.style.backgroundColor = currentBgColor;
        });
        
        // Apply images and filters to all scrapbook images
        scrapbookImages.forEach((img, index) => {
            // Use modulo to cycle through captured images
            img.src = this.capturedImages[index % this.capturedImages.length];
            // Apply the same filter as in editor
            img.style.filter = currentFilterStyle;
            
            // Load handler to ensure proper display
            img.onload = () => {
                img.style.display = "block";
            };
            img.onerror = () => {
                console.error(`Failed to load image ${index}`);
                img.style.display = "none";
            };
        });
        
        // Update date stamps in scrapbook
        const dateElements = document.querySelectorAll(".scrapbook .date");
        const showDate = this.dateCheckbox.checked;
        dateElements.forEach(dateEl => {
            dateEl.textContent = showDate ? new Date().toLocaleDateString() : "";
            dateEl.style.display = showDate ? "block" : "none";
        });
    }    async downloadPhotostrip() {
        const canvas = document.createElement("canvas");
        canvas.width = 220;
        canvas.height = 670;
        const context = canvas.getContext("2d");
        
        // Show loading state
        const downloadBtn = this.buttons.download;
        const originalText = downloadBtn.textContent;
        downloadBtn.textContent = "Processing...";
        downloadBtn.disabled = true;
        
        try {
            // Render the photostrip with filters
            await Promise.all(this.renderPhotostrip(context));
            
            // Add stickers and date after images are rendered
            this.editor.stickers.forEach(sticker => {
                const x = parseFloat(sticker.style.left) + 10;
                const y = parseFloat(sticker.style.top) + 10;
                context.font = "24px Arial";
                context.fillText(sticker.textContent, x, y);
            });

            // Date stamp
            if (this.dateCheckbox.checked) {
                context.font = "14px Arial";
                context.textAlign = "center";
                context.fillStyle = "#000";
                context.fillText(new Date().toLocaleDateString(), 110, 650);
            }
            
            // Download the image
            const a = document.createElement("a");
            a.href = canvas.toDataURL("image/png");
            a.download = "photostrip.png";
            a.click();
        } catch (error) {
            console.error("Error generating photostrip:", error);
            alert("Failed to generate photostrip. Please try again.");
        } finally {
            // Restore button state
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;
        }
    }renderPhotostrip(context) {
        const photostrip = document.getElementById("photostrip");

        // Background
        context.fillStyle = photostrip.style.backgroundColor || "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Create a temporary canvas for applying filters
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 200;
        tempCanvas.height = 200;
        const tempContext = tempCanvas.getContext('2d');

        // Images
        const drawPromises = this.capturedImages.map((dataURL, index) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    // Draw to temp canvas first
                    tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                    tempContext.filter = this.editor.getFilterStyle(this.editor.currentFilter);
                    tempContext.drawImage(img, 0, 0, 200, 200);
                    
                    // Draw filtered image to main canvas
                    context.drawImage(tempCanvas, 10, 10 + (index * 210));
                    
                    // Draw border
                    context.lineWidth = 5;
                    context.strokeStyle = "#ff99cc";
                    context.strokeRect(10, 10 + (index * 210), 200, 200);
                    resolve();
                };
                img.src = dataURL;
            });
        });

        // Stickers
        this.editor.stickers.forEach(sticker => {
            const x = parseFloat(sticker.style.left) + 10;
            const y = parseFloat(sticker.style.top) + 10;
            context.font = "24px Arial";
            context.fillText(sticker.textContent, x, y);
        });

        // Date stamp
        if (this.dateCheckbox.checked) {
            context.font = "14px Arial";
            context.textAlign = "center";
            context.fillStyle = "#000";
            context.fillText(new Date().toLocaleDateString(), 110, 650);
        }
    }

    retakePhotos() {
        this.showSection('capture');
        this.slots.forEach(slot => slot.innerHTML = "");
        this.uploads.forEach(upload => upload.value = "");
        this.editor.clearStickers();
        this.capturedImages = [];
        this.currentSlotIndex = 0;
        this.updateSubmitButton();
    }

    initializeTheme() {
        // Load saved theme
        const savedTheme = localStorage.getItem('photoboothTheme') || 'pink';
        this.applyTheme(savedTheme);

        // Setup theme switcher
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                this.applyTheme(theme);
                localStorage.setItem('photoboothTheme', theme);
            });
        });
    }

    applyTheme(theme) {
        // Remove all theme classes
        document.body.classList.remove('theme-pink', 'theme-purple', 'theme-mint');
        // Add new theme class
        document.body.classList.add(`theme-${theme}`);

        // Update active state of theme buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });

        // Animate theme change
        document.body.style.transition = 'background 0.5s ease';
        document.querySelectorAll('.container, .photostrip, .button').forEach(el => {
            el.style.transition = 'all 0.5s ease';
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize language from localStorage or default to 'en'
    const currentLang = localStorage.getItem('photoboothLang') || 'en';
    updateLanguage(currentLang);

    // Setup language switcher
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            updateLanguage(lang);
            localStorage.setItem('photoboothLang', lang);
        });
    });

    // Update UI elements with translations
    function updateLanguage(lang) {
        const t = translations[lang];
        
        // Update active state of language buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });

        // Update text content
        document.getElementById('capture-btn').textContent = t.takePicture;
        document.getElementById('submit-btn').textContent = t.submit;
        document.getElementById('preview-btn').textContent = t.preview;
        document.getElementById('download-btn').textContent = t.download;
        document.getElementById('retake-btn').textContent = t.retake;
        
        document.querySelector('.upload-section h2').textContent = t.uploadPhotos;
        document.querySelector('.upload-section p').textContent = t.uploadInstruction;
        document.querySelector('.stickers label').textContent = t.cuteStickers;
        document.querySelector('.backgrounds label').textContent = t.photoBackground;
        document.querySelector('.filters label').textContent = t.filters;
        
        // Update enable date label
        const dateLabel = document.querySelector('label[for="enable-date"]');
        if (dateLabel) {
            const checkbox = dateLabel.querySelector('input');
            dateLabel.innerHTML = `
                ${checkbox.outerHTML}
                ${t.enableDate}
            `;
        }

        // Add animation to the decorative icons when language changes
        document.querySelectorAll('.deco-icon').forEach(icon => {
            icon.style.animation = 'none';
            icon.offsetHeight; // Trigger reflow
            icon.style.animation = null;
        });
    }

    // Initialize the rest of the application
    const app = new PhotoBooth();
    app.camera.initialize();
});
