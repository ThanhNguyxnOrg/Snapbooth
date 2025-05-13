// DOM Elements
var captureSection = document.getElementById("capture-section");
var uploadSection = document.getElementById("upload-section");
var editor = document.getElementById("editor");
var slots = [
  document.getElementById("slot-1"),
  document.getElementById("slot-2"),
  document.getElementById("slot-3")
];
var uploads = [
  document.getElementById("upload-1"),
  document.getElementById("upload-2"),
  document.getElementById("upload-3")
];
var submitBtn = document.getElementById("submit-btn");
var photostripContainer = document.querySelector(".photostrip-container");
var photostrip = document.getElementById("photostrip");
var photos = [
  document.getElementById("photo-1"),
  document.getElementById("photo-2"),
  document.getElementById("photo-3")
];
var stickerButtons = document.querySelectorAll(".stickers button");
var backgroundButtons = document.querySelectorAll(".backgrounds button");
var filterButtons = document.querySelectorAll(".filters button");
var enableDate = document.getElementById("enable-date");
var dateStamp = document.getElementById("date-stamp");
var previewBtn = document.getElementById("preview-btn");
var downloadBtn = document.getElementById("download-btn");
var retakeBtn = document.getElementById("retake-btn");
var scrapbook = document.getElementById("scrapbook");
var video = document.getElementById("video");
var errorMessage = document.getElementById("error-message");
var captureBtn = document.getElementById("capture-btn");
var countdown = document.getElementById("countdown");

// Variables
var capturedImages = [];
var currentFilter = "none";
var stickers = [];
var currentSlotIndex = 0;
var stickerPositions = [
  { left: -40, top: 0 },    // Top-left
  { left: 230, top: 0 },    // Top-right
  { left: -40, top: 210 },  // Middle-left
  { left: 230, top: 210 },  // Middle-right
  { left: -40, top: 420 },  // Bottom-left
  { left: 230, top: 420 }   // Bottom-right
];
var nextStickerPositionIndex = 0;

// Initialize webcam
function initWebcam() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      video.srcObject = stream;
      errorMessage.style.display = "none";
    })
    .catch((error) => {
      console.error("Error accessing camera:", error);
      errorMessage.style.display = "block";
      errorMessage.textContent = "Unable to access camera. Please allow camera permissions in your browser settings and ensure you're using HTTPS.";
      captureBtn.disabled = true;
    });
}

// Capture photo function
function capturePhoto() {
  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw the current video frame to the canvas
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  var dataURL = canvas.toDataURL("image/png");

  // Display the captured photo in the current slot
  var img = document.createElement("img");
  img.src = dataURL;
  slots[currentSlotIndex].innerHTML = "";
  slots[currentSlotIndex].appendChild(img);
  capturedImages[currentSlotIndex] = dataURL;

  // Move to the next slot
  currentSlotIndex++;
  if (currentSlotIndex >= slots.length) {
    // All slots are filled, proceed to upload section
    captureSection.classList.remove("active");
    uploadSection.classList.add("active");
    updateSubmitButton();
    currentSlotIndex = 0; // Reset for potential retake
  }
}

// Filter functions
function getFilterStyle(filter) {
  switch (filter) {
    case "black-and-whitewhite":
      return "grayscale(100%)";
    case "sepia":
      return "sepia(100%)";
    case "warm":
      return "hue-rotate(-30deg) saturate(150%)";
    case "cold":
      return "hue-rotate(180deg) saturate(150%)";
    case "cool":
      return "hue-rotate(210deg) brightness(110%)";
    default:
      return "none";
  }
}

function updatePhotostrip() {
  capturedImages.forEach((dataURL, index) => {
    photos[index].src = dataURL;
    photos[index].style.filter = getFilterStyle(currentFilter);
  });
}

// Enable submit button if at least one image is uploaded
function updateSubmitButton() {
  var uploaded = uploads.some(upload => upload.files.length > 0);
  if (uploaded) {
    submitBtn.classList.add("enabled");
    submitBtn.disabled = false;
  } else {
    submitBtn.classList.remove("enabled");
    submitBtn.disabled = true;
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize webcam
  initWebcam();
  
  // Start countdown and capture photo
  captureBtn.addEventListener("click", () => {
    captureBtn.disabled = true;
    let timeLeft = 3;
    countdown.style.display = "flex";
    countdown.textContent = timeLeft;

    const countdownInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        countdown.textContent = timeLeft;
      } else {
        countdown.style.display = "none";
        clearInterval(countdownInterval);
        capturePhoto();
        captureBtn.disabled = false;
      }
    }, 1000);
  });

  // Handle image uploads
  slots.forEach((slot, index) => {
    slot.addEventListener("click", () => {
      uploads[index].click();
    });
    uploads[index].addEventListener("change", (e) => {
      var file = e.target.files[0];
      if (file) {
        var reader = new FileReader();
        reader.onload = (e) => {
          var img = document.createElement("img");
          img.src = e.target.result;
          slot.innerHTML = "";
          slot.appendChild(img);
          capturedImages[index] = e.target.result;
          updateSubmitButton();
        };
        reader.readAsDataURL(file);
      }
    });
  });

  // Submit images and proceed to editor
  submitBtn.addEventListener("click", () => {
    if (capturedImages.length > 0) {
      while (capturedImages.length < 3) {
        capturedImages.push(capturedImages[0]); // Duplicate the first image if fewer than 3
      }
      uploadSection.classList.remove("active");
      editor.classList.add("active");
      updatePhotostrip();
    }
  });

  // Add sticker to photostrip
  stickerButtons.forEach(button => {
    button.addEventListener("click", () => {
      var sticker = button.getAttribute("data-sticker");
      var position = stickerPositions[nextStickerPositionIndex];
      var stickerEl = document.createElement("span");
      stickerEl.className = "sticker";
      stickerEl.textContent = sticker;
      stickerEl.style.left = position.left + "px";
      stickerEl.style.top = position.top + "px";
      photostripContainer.appendChild(stickerEl);
      stickers.push(stickerEl);

      // Move to the next position, looping back to the start if necessary
      nextStickerPositionIndex = (nextStickerPositionIndex + 1) % stickerPositions.length;
    });
  });

  // Change photostrip background
  backgroundButtons.forEach(button => {
    button.addEventListener("click", () => {
      var bgColor = button.getAttribute("data-bg");
      photostrip.style.backgroundColor = bgColor;
    });
  });

  // Apply filter
  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      filterButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.getAttribute("data-filter");
      updatePhotostrip();
    });
  });

  // Toggle date stamp
  enableDate.addEventListener("change", () => {
    dateStamp.style.display = enableDate.checked ? "block" : "none";
  });

  // Download photostrip
  downloadBtn.addEventListener("click", () => {
    var canvas = document.createElement("canvas");
    canvas.width = 220;
    canvas.height = 670;
    var context = canvas.getContext("2d");

    // Draw background
    context.fillStyle = photostrip.style.backgroundColor || "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw images
    capturedImages.forEach((dataURL, index) => {
      var img = new Image();
      img.src = dataURL;
      context.drawImage(img, 10, 10 + (index * 210), 200, 200);
      context.lineWidth = 5;
      context.strokeStyle = "#ff99cc";
      context.strokeRect(10, 10 + (index * 210), 200, 200);
    });

    // Draw stickers
    stickers.forEach(sticker => {
      var x = parseFloat(sticker.style.left) + 10; // Adjust for photostrip padding
      var y = parseFloat(sticker.style.top) + 10;
      context.font = "24px Arial";
      context.fillText(sticker.textContent, x, y);
    });

    // Draw date stamp
    if (enableDate.checked) {
      context.font = "14px Arial";
      context.textAlign = "center";
      context.fillStyle = "#000";
      context.fillText("March 16, 2025", 110, 650);
    }

    var a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "photostrip.png";
    a.click();
  });

  // Preview in scrapbook
  previewBtn.addEventListener("click", () => {
    editor.classList.remove("active");
    scrapbook.classList.add("active");
    document.querySelectorAll(".scrapbook img").forEach((img, index) => {
      img.src = capturedImages[index % 3];
      img.style.filter = getFilterStyle(currentFilter);
    });
  });

  // Retake photos (return to capture section)
  retakeBtn.addEventListener("click", () => {
    editor.classList.remove("active");
    uploadSection.classList.remove("active");
    captureSection.classList.add("active");
    slots.forEach(slot => slot.innerHTML = "");
    uploads.forEach(upload => upload.value = "");
    stickers.forEach(sticker => sticker.remove());
    stickers = [];
    scrapbook.classList.remove("active");
    capturedImages = [];
    currentSlotIndex = 0;
    nextStickerPositionIndex = 0;
    updateSubmitButton();
  });
}); 