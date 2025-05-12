// Camera handling
class Camera {
    constructor() {
        this.video = document.getElementById('video');
        this.errorMessage = document.getElementById('error-message');
        this.captureBtn = document.getElementById('capture-btn');
        this.countdown = document.getElementById('countdown');
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.initializeProgressBar();
        this.handleVisibilityChange();
        this.handleOrientationChange();
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
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // Default constraints
            const constraints = {
                video: {
                    facingMode: this.isMobile ? "user" : "environment",
                    width: { ideal: this.isMobile ? 1280 : 1920 },
                    height: { ideal: this.isMobile ? 720 : 1080 }
                }
            };

            // If we have multiple cameras, try to use the best one
            if (videoDevices.length > 1) {
                const bestCamera = videoDevices.find(device => 
                    device.label.toLowerCase().includes('back') ||
                    device.label.toLowerCase().includes('rear')
                );
                
                if (bestCamera) {
                    constraints.video.deviceId = { exact: bestCamera.deviceId };
                }
            }

            return constraints;
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
    }

    performCountdown(callback) {
        const timeLeft = parseInt(document.getElementById('capture-interval')?.value || 3);
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
        };

        const timer = setInterval(updateProgress, interval);

        const countdownInterval = setInterval(() => {
            const secondsLeft = Math.ceil((totalTime - elapsed) / 1000);
            if (secondsLeft > 0) {
                this.countdown.textContent = secondsLeft;
            }
        }, 1000);

        setTimeout(() => {
            clearInterval(timer);
            clearInterval(countdownInterval);
            this.countdown.style.display = "none";
            this.progressBar.style.width = '0%';
            callback();
        }, totalTime);
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
        this.isCapturing = true;
        this.remainingPhotos = 3;
        this.captureBtn.disabled = true;
        
        const interval = parseInt(this.captureInterval.value) * 1000;
        let progress = 0;
        
        // Create progress bar
        const progressBar = document.createElement("div");
        progressBar.className = "capture-progress";
        this.captureBtn.appendChild(progressBar);

        const captureWithProgress = () => {
            if (this.remainingPhotos <= 0) {
                this.isCapturing = false;
                this.captureBtn.disabled = false;
                progressBar.remove();
                return;
            }

            // Start countdown
            let timeLeft = 3;
            this.countdown.style.display = "flex";
            this.countdown.textContent = timeLeft;

            const countdownInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft > 0) {
                    this.countdown.textContent = timeLeft;
                } else {
                    this.countdown.style.display = "none";
                    clearInterval(countdownInterval);
                    callback();
                    this.remainingPhotos--;

                    if (this.remainingPhotos > 0) {
                        progress = 0;
                        progressBar.style.width = "0%";
                        setTimeout(captureWithProgress, interval);
                    } else {
                        this.isCapturing = false;
                        this.captureBtn.disabled = false;
                        progressBar.remove();
                    }
                }
            }, 1000);
        };

        // Update progress bar
        const progressInterval = setInterval(() => {
            if (!this.isCapturing) {
                clearInterval(progressInterval);
                return;
            }
            progress += 1;
            progressBar.style.width = `${(progress / (interval/100))}%`;
        }, 100);

        captureWithProgress();
    }

    stopCamera() {
        if (this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
        }
    }

    capturePhoto() {
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
        const context = canvas.getContext("2d");

        // Set dimensions based on device
        if (this.isMobile) {
            const aspectRatio = this.video.videoWidth / this.video.videoHeight;
            canvas.width = Math.min(1280, this.video.videoWidth);
            canvas.height = canvas.width / aspectRatio;
        } else {
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
        }

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
}
