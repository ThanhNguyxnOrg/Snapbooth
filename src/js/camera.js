export class Camera {
    constructor(videoElement, countdownElement) {
        this.video = videoElement;
        this.countdown = countdownElement;
        this.stream = null;
        this.currentEffect = 'normal';
    }

    async initialize() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    facingMode: 'user'
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            return true;
        } catch (err) {
            console.error("Error accessing camera:", err);
            throw new Error("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
        }
    }

    async takePhoto(effect = 'normal') {
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        const context = canvas.getContext('2d');

        // Vẽ video lên canvas
        context.drawImage(this.video, 0, 0, canvas.width, canvas.height);

        // Áp dụng hiệu ứng
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        switch (effect) {
            case 'grayscale':
                for (let i = 0; i < pixels.length; i += 4) {
                    const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
                    pixels[i] = avg;     // Red
                    pixels[i + 1] = avg; // Green
                    pixels[i + 2] = avg; // Blue
                }
                break;

            case 'sepia':
                for (let i = 0; i < pixels.length; i += 4) {
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    pixels[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                    pixels[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                    pixels[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                }
                break;

            case 'vintage':
                for (let i = 0; i < pixels.length; i += 4) {
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    pixels[i] = Math.min(255, (r * 0.5) + (g * 0.5) + (b * 0.1));
                    pixels[i + 1] = Math.min(255, (r * 0.2) + (g * 0.7) + (b * 0.1));
                    pixels[i + 2] = Math.min(255, (r * 0.1) + (g * 0.3) + (b * 0.6));
                }
                break;

            case 'brightness':
                const brightnessValue = 50;
                for (let i = 0; i < pixels.length; i += 4) {
                    pixels[i] = Math.min(255, pixels[i] + brightnessValue);
                    pixels[i + 1] = Math.min(255, pixels[i + 1] + brightnessValue);
                    pixels[i + 2] = Math.min(255, pixels[i + 2] + brightnessValue);
                }
                break;

            case 'contrast':
                const contrastFactor = 1.5;
                for (let i = 0; i < pixels.length; i += 4) {
                    pixels[i] = Math.min(255, ((pixels[i] - 128) * contrastFactor) + 128);
                    pixels[i + 1] = Math.min(255, ((pixels[i + 1] - 128) * contrastFactor) + 128);
                    pixels[i + 2] = Math.min(255, ((pixels[i + 2] - 128) * contrastFactor) + 128);
                }
                break;
        }

        context.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/png');
    }

    async startCountdown(seconds = 3) {
        return new Promise((resolve) => {
            let timeLeft = seconds;
            this.countdown.style.display = 'block';
            this.countdown.textContent = timeLeft;

            // Thêm âm thanh đếm ngược
            const beepSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBkCU1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTqO0/PUgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnwoBSBzwu7mmEYMDlOq5e63YBsIPJPY88p+KgUda7/u55tKDgxPqOTzuWIdBzqQ1vLNgSwEGWi87eqfTQ8KS6Xi9btlHgU2jdTy0YUvBRVktuvspVIQCEig4PK9aCMDMYvS8tOHMQQTYrTq7KdUEgZBnN7yvmokAy+J0fPVijIEEGCy6e2pVxMEPJnc8sFsJgItiM/y14w0BA1dserurFoVAzqX2/LDcKgCK4bO8tmONgMLWrDp7q5cFwE3lNryxXIoASqEzfLbkDcDCFeu6O+xXxoCNZDY8sd0KwEogszz3ZI5AghVrufwtGIdADOO1/LJdiwBJoDL8t+UOgIGUqzm8bZkHwAxi9byy3ktACV+yvPhlDwDBVCq5fK4Zh8AL4nV8s14LgAjfMnz45Y9AgNNqOTzumggACyG1PLPei8AIHrH8+WYPwEBSqbi9LxpIQAqhNPy0XwvAB56xvLnmj8BAUel4vS+ayIAKILS8tN+MAAbeMXy6ZxAAD9Ho+H1wG0jACaCkvPVgDEAGXbE8eucQQA9RaLg9cJvJAAkgJDy14IyABd1w/PsnUEAOkSh4PbDcCUAIX6P89mDMwAVc8Ly7p9BADhCoN/2xXEmAB9+jvPahDQAE3LC8vCgQgA2QJ/e98dzJwAdfY3z3IU0ABFwwfLxokMANT+e3vfIdCcAHHyM89yGNQAPbsHy86NEADq3nN33yHUoABp6i/PdiDUADW3A8vWkRQA4tpve+Ml2KAAYeYrz34k2AAtswPL2pUUANrWa3fnKdykAF3iJ8+CLNgAJasHy+KZFADSzmN36y3gpABV3iPPhjDcAB2nA8vmmRgAys5fd+sx5KgATdofy44w3AAVpwPL7p0YAMLKw3fvNeioBEXWG8+WNOAADaL/y/KhHAC6xr936znorAQ91hfLnjjgAAWe/8v6pRwAssq7d+897KwEOdITy6Y84AABlv/L/qkgAKrCt3fvQfCsBDHOD8+qQOQD/ZL7zAatIACivrd380HwsAQpygvPskToA/WO+8wKsSAAmsKzd/NF9LAEIcoHz7ZI6APxjvvMDrUkAJa+r3f3SfSwBBnGA8++TOwD6Yr3zA65JACStqt3+034sAQVwf/PwlDsA+GG98wSvSgAjrar8/tR/LQEDbH7z8pU7APZhvfMFr0oAIayp/P/UgC0BAWx98/SWOwD0YLzzBrBLACCrqfz/1YAtAP9rfPP1lzsA82C78wexSwAeqqj9ANaBLgD9anzz95g7APFfuvMIsUwAHamn/QHXgS4A+2l78/iZPADvX7rzCbJMABuop/0C14IuAPppevP6mTwA7V+68wqyTQAap6b9A9iCLgD4aHrz+5o8AOxeuPMLs00AGKal/QTZgy4A9mh58/2bPQDqXrjzDLRNABampP0F2YMvAPVnefP+mz0A6V238w20TgAWpaT9BtqELwDzZ3j0AJw9AOddtvMOtU4AFaSj/QfbhC8A8WZ49AGcPQDmXbbzD7VOABSko/0I24UvAO9mePQCnT4A5Fy18xC2TwASo6L9CdyFLwDtZXf0A54+AORctfMRtk8AEaOh/QrdhS8A7GV29ASePgDiW7XzErZQAA+iof0L3oYvAOpldfQFnz4A4Vu08xO3UAAOoaD9DN6GLwDoZHX0Bp8/AOBatPMUt1AADaGg/Q3fhi8A5mR09AegPwDeWrTzFbhQAAugn/0O34cvAOVjdPQIoD8A3Vmz8xa4UQAKn5/9D+CHL');

            const countdownInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft > 0) {
                    this.countdown.textContent = timeLeft;
                } else {
                    clearInterval(countdownInterval);
                    this.countdown.style.display = 'none';
                    beepSound.play();
                    resolve();
                }
            }, 1000);
        });
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }
} 