// Camera handling
class Camera {
    constructor() {
        this.video = document.getElementById('video');
        this.errorMessage = document.getElementById('error-message');
        this.captureBtn = document.getElementById('capture-btn');
        this.countdown = document.getElementById('countdown');
        this.settingsBtn = document.getElementById('settings-btn');
        this.settingsPanel = document.getElementById('settings-panel');
        this.autoCapture = document.getElementById('auto-capture');
        this.captureInterval = document.getElementById('capture-interval');
        this.enableSound = document.getElementById('enable-sound');
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        this.isAutoCaptureActive = false;
        this.autoCaptureTimer = null;
        this.countdownAudio = new Audio('data:audio/mp3;base64,//NExAAAAAANIAAAAAExBTUUzLjk4LjIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        
        this.currentFacingMode = 'user'; // Default là camera trước
        this.switchCameraBtn = document.getElementById('switch-camera');
        this.cameraIcon = this.switchCameraBtn?.querySelector('.camera-icon');
        this.cameraText = this.switchCameraBtn?.querySelector('.camera-text');
        
        if (this.isMobile) {
            this.setupCameraSwitching();
        }

        this.initializeSettings();
        this.initializeProgressBar();
        this.handleVisibilityChange();
        this.handleOrientationChange();
    }

    initializeSettings() {
        // Toggle settings panel
        this.settingsBtn.addEventListener('click', () => {
            this.settingsPanel.classList.toggle('active');
        });

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.settingsPanel.contains(e.target) && 
                !this.settingsBtn.contains(e.target)) {
                this.settingsPanel.classList.remove('active');
            }
        });

        // Load saved settings
        this.loadSettings();

        // Save settings when changed
        this.autoCapture.addEventListener('change', () => this.saveSettings());
        this.captureInterval.addEventListener('change', () => this.saveSettings());
        this.enableSound.addEventListener('change', () => this.saveSettings());
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('cameraSettings') || '{}');
        this.autoCapture.checked = settings.autoCapture ?? true;
        this.captureInterval.value = settings.captureInterval ?? 3;
        this.enableSound.checked = settings.enableSound ?? true;
    }

    saveSettings() {
        const settings = {
            autoCapture: this.autoCapture.checked,
            captureInterval: parseInt(this.captureInterval.value),
            enableSound: this.enableSound.checked
        };
        localStorage.setItem('cameraSettings', JSON.stringify(settings));
    }

    initializeProgressBar() {
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'capture-progress';
        this.video.parentElement.appendChild(this.progressBar);
    }

    handleVisibilityChange() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseCapture();
            } else {
                this.resumeCapture();
            }
        });
    }

    handleOrientationChange() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.adjustVideoSize();
            }, 300);
        });
    }

    async initialize() {
        try {
            const constraints = await this.getOptimalConstraints();
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            this.stream = stream;
            this.errorMessage.style.display = "none";

            await this.video.play();
            this.adjustVideoSize();
            this.initializeCameraSettings();
        } catch (error) {
            console.error("Error accessing camera:", error);
            this.handleCameraError(error);
        }
    }

    async getOptimalConstraints() {
        try {
            // Default constraints cho mobile
            if (this.isMobile) {
                return {
                    video: {
                        facingMode: { exact: this.currentFacingMode },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                };
            }
            
            // Constraints cho desktop
            return {
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };
        } catch (error) {
            console.warn("Error getting optimal constraints:", error);
            return { video: true }; // Fallback to basic constraints
        }
    }

    adjustVideoSize() {
        if (!this.video.videoWidth) return;

        const containerWidth = this.video.parentElement.clientWidth;
        const containerHeight = this.video.parentElement.clientHeight;
        const videoRatio = this.video.videoWidth / this.video.videoHeight;
        const containerRatio = containerWidth / containerHeight;

        if (videoRatio > containerRatio) {
            this.video.style.width = '100%';
            this.video.style.height = 'auto';
        } else {
            this.video.style.width = 'auto';
            this.video.style.height = '100%';
        }
    }

    handleCameraError(error) {
        this.errorMessage.style.display = "block";
        if (error.name === "NotAllowedError") {
            this.errorMessage.textContent = "Camera access denied. Please allow camera permissions in your browser settings.";
        } else if (error.name === "NotFoundError") {
            this.errorMessage.textContent = "No camera found. Please connect a camera and try again.";
        } else if (error.name === "NotReadableError") {
            this.errorMessage.textContent = "Camera is in use by another application. Please close other apps using the camera.";
        } else {
            this.errorMessage.textContent = "Unable to access camera. Please check your camera connection and permissions.";
        }
        this.captureBtn.disabled = true;
    }

    initializeCameraSettings() {
        this.isCapturing = false;
        this.remainingPhotos = 3;
        this.autoCapture = document.getElementById("auto-capture");
        this.captureInterval = document.getElementById("capture-interval");
        this.settingsBtn = document.getElementById("settings-btn");
        this.settingsPanel = document.querySelector(".settings-panel");

        // Setup settings panel toggle
        this.settingsBtn.addEventListener("click", () => {
            this.settingsPanel.classList.toggle("active");
        });

        // Close settings when clicking outside
        document.addEventListener("click", (e) => {
            if (!this.settingsPanel.contains(e.target) && !this.settingsBtn.contains(e.target)) {
                this.settingsPanel.classList.remove("active");
            }
        });
    }

    startCountdown(callback) {
        if (!this.stream || this.stream.active === false) {
            this.initialize().then(() => this.performCountdown(callback));
            return;
        }
        this.performCountdown(callback);
    }    performCountdown(callback) {
        if (this.isCountingDown) return; // Prevent multiple countdown starts
        
        this.isCountingDown = true;
        const timeLeft = parseInt(this.captureInterval.value);
        this.countdown.style.display = "flex";
        this.countdown.textContent = timeLeft;
        this.progressBar.style.width = '0%';

        let elapsed = 0;
        const interval = 100; // Update every 100ms for smoother progress
        const totalTime = timeLeft * 1000;

        const updateProgress = () => {
            elapsed += interval;
            const progress = (elapsed / totalTime) * 100;
            this.progressBar.style.width = `${progress}%`;

            if (this.enableSound.checked && elapsed % 1000 === 0) {
                this.playCountdownSound();
            }
        };

        const timer = setInterval(updateProgress, interval);

        const countdownInterval = setInterval(() => {
            const secondsLeft = Math.ceil((totalTime - elapsed) / 1000);
            if (secondsLeft > 0) {
                this.countdown.textContent = secondsLeft;
            }
        }, 1000);

        setTimeout(() => {            clearInterval(timer);
            clearInterval(countdownInterval);
            this.countdown.style.display = "none";
            this.progressBar.style.width = '0%';
            this.isCountingDown = false; // Reset countdown flag
            
            if (callback) callback();

            // Start next auto capture if enabled
            if (this.autoCapture.checked && this.isAutoCaptureActive) {
                const cooldownTime = 1500; // 1.5 second cooldown between captures
                if (this.autoCaptureTimer) {
                    clearTimeout(this.autoCaptureTimer);
                }
                this.autoCaptureTimer = setTimeout(() => {
                    this.startCountdown(callback);
                }, cooldownTime);
            }
        }, totalTime);
    }

    playCountdownSound() {
        if (this.enableSound.checked) {
            this.countdownAudio.currentTime = 0;
            this.countdownAudio.play().catch(() => {});
        }
    }

    startSingleCapture(callback) {
        this.captureBtn.disabled = true;
        let timeLeft = 3;
        this.countdown.style.display = "flex";
        this.countdown.textContent = timeLeft;

        const countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                this.countdown.style.display = "none";
                clearInterval(countdownInterval);
                callback();
                this.captureBtn.disabled = false;
            } else {
                this.countdown.textContent = timeLeft;
            }
        }, 1000);
    }

    startAutoCapture(callback) {
        this.isAutoCaptureActive = true;
        this.startCountdown(callback);
    }

    stopAutoCapture() {
        this.isAutoCaptureActive = false;
        if (this.autoCaptureTimer) {
            clearTimeout(this.autoCaptureTimer);
            this.autoCaptureTimer = null;
        }
    }

    stopCamera() {
        if (this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
        }
    }    capturePhoto() {
        if (!this.video.srcObject) {
            console.error("No camera stream available");
            return null;
        }

        // Check if video is ready and has valid dimensions
        if (!this.video.videoWidth || !this.video.videoHeight) {
            console.error("Video stream not ready");
            this.errorMessage.textContent = "Camera stream not ready. Please wait a moment.";
            this.errorMessage.style.display = "block";
            return null;
        }

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { alpha: false });

        // Maintain aspect ratio but ensure high quality
        const targetWidth = 1920; // Target width for high quality
        const aspectRatio = this.video.videoWidth / this.video.videoHeight;
        
        if (this.isMobile) {
            // For mobile, use smaller dimensions but maintain quality
            canvas.width = Math.min(1280, this.video.videoWidth);
            canvas.height = canvas.width / aspectRatio;
        } else {
            // For desktop, use higher resolution
            canvas.width = Math.min(targetWidth, this.video.videoWidth);
            canvas.height = canvas.width / aspectRatio;
        }

        // Enable image smoothing for better quality
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';

        try {
            // Draw the current frame from video to canvas
            context.drawImage(this.video, 0, 0, canvas.width, canvas.height);
            
            // Convert to image data with mobile-optimized quality
            const imageData = canvas.toDataURL("image/jpeg", this.isMobile ? 0.8 : 0.9);
            
            // Validate the image data
            if (!imageData || imageData === "data:," || imageData.length < 1000) {
                throw new Error("Failed to capture valid image");
            }

            // Hide any previous error messages
            this.errorMessage.style.display = "none";
            return imageData;
        } catch (error) {
            console.error("Error capturing photo:", error);
            this.errorMessage.textContent = "Failed to capture photo. Please try again.";
            this.errorMessage.style.display = "block";
            return null;
        }
    }

    pauseCapture() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.enabled = false);
        }
    }

    resumeCapture() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.enabled = true);
        }
    }

    setupCameraSwitching() {
        // Kiểm tra xem thiết bị có nhiều camera không
        this.checkMultipleCameras();
        
        this.switchCameraBtn?.addEventListener('click', () => {
            this.switchCamera();
        });
    }

    async checkMultipleCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // Chỉ hiện nút switch nếu có nhiều hơn 1 camera
            const cameraSwitchGroup = document.getElementById('camera-switch-group');
            if (cameraSwitchGroup) {
                cameraSwitchGroup.style.display = videoDevices.length > 1 ? 'block' : 'none';
            }

            // Lưu danh sách camera
            this.cameras = videoDevices;
        } catch (error) {
            console.error('Không thể kiểm tra camera:', error);
        }
    }

    async switchCamera() {
        if (!this.switchCameraBtn || this.switching) return;

        try {
            this.switching = true;
            this.switchCameraBtn.classList.add('switching');
            
            // Dừng stream hiện tại
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            // Đổi chế độ camera
            this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
            
            // Cập nhật UI
            this.updateCameraUI();

            // Khởi tạo lại stream với camera mới
            await this.initialize();

            // Thông báo thành công
            this.showSuccessMessage('Đã chuyển camera!');

        } catch (error) {
            console.error('Lỗi khi chuyển camera:', error);
            this.showErrorMessage('Không thể chuyển camera. Vui lòng thử lại!');
            
            // Thử lại với camera trước
            this.currentFacingMode = 'user';
            await this.initialize();
            
        } finally {
            this.switching = false;
            this.switchCameraBtn.classList.remove('switching');
        }
    }

    updateCameraUI() {
        // Cập nhật icon và text
        if (this.currentFacingMode === 'user') {
            this.cameraIcon.textContent = '🤳';
            this.cameraText.textContent = 'Camera trước';
        } else {
            this.cameraIcon.textContent = '📸';
            this.cameraText.textContent = 'Camera sau';
        }
    }

    showSuccessMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'camera-toast success';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    showErrorMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'camera-toast error';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

class CameraManager {
    constructor() {
        this.video = document.getElementById('video');
        this.currentCamera = 'user';
        this.stream = null;
        this.initializeCamera();
        this.setupCameraSwitch();
    }

    async initializeCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: this.currentCamera,
                    // Add advanced constraints for better mobile handling
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            this.video.srcObject = this.stream;
            // Fix mobile camera orientation
            this.fixMobileOrientation();
        } catch (error) {
            console.error("Error accessing camera:", error);
            document.getElementById("error-message").style.display = "block";
            document.getElementById("error-message").textContent = 
                "Unable to access camera. Please check permissions.";
        }
    }

    fixMobileOrientation() {
        // Check if running on mobile
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            if (this.currentCamera === 'user') {
                // For front camera, mirror the video
                this.video.style.transform = 'scaleX(-1)';
            } else {
                // For back camera, normal orientation
                this.video.style.transform = 'scaleX(1)';
            }
        }
    }

    async switchCamera() {
        if (this.stream) {
            // Stop all tracks before switching
            this.stream.getTracks().forEach(track => track.stop());
        }

        // Toggle camera facing mode
        this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: this.currentCamera,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            this.video.srcObject = this.stream;
            this.fixMobileOrientation();
        } catch (error) {
            console.error("Error switching camera:", error);
            // Revert to previous camera if switch fails
            this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
            this.initializeCamera();
        }
    }

    setupCameraSwitch() {
        const switchBtn = document.getElementById('switch-camera');
        if (switchBtn) {
            switchBtn.addEventListener('click', () => this.switchCamera());
        }
    }
}
