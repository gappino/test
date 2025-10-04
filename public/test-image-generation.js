// Test Image Generation functionality
const customPrompt = document.getElementById('customPrompt');
const imageWidth = document.getElementById('imageWidth');
const imageHeight = document.getElementById('imageHeight');
const generateCustomImageBtn = document.getElementById('generateCustomImageBtn');
const customImageLoading = document.getElementById('customImageLoading');
const customImageSection = document.getElementById('customImageSection');
const customImageContainer = document.getElementById('customImageContainer');
const imageGallery = document.getElementById('imageGallery');

// Store generated images for gallery
let generatedImages = [];

// Event listeners
generateCustomImageBtn.addEventListener('click', generateCustomImage);

// Generate custom image
async function generateCustomImage() {
    try {
        const prompt = customPrompt.value.trim();
        
        if (!prompt) {
            alert('لطفاً پرامپت تصویر را وارد کنید');
            return;
        }
        
        // Show loading state
        generateCustomImageBtn.disabled = true;
        generateCustomImageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تولید...';
        customImageLoading.classList.remove('hidden');
        
        // Get dimensions
        const width = imageWidth.value;
        const height = imageHeight.value;
        
        // Generate image using Pollinations.ai
        const response = await fetch('/api/flax/generate-image-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                width: parseInt(width),
                height: parseInt(height)
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayCustomImage(result.data.image_url, prompt, width, height);
            customImageSection.classList.remove('hidden');
            customImageSection.classList.add('fade-in');
            
            // Add to gallery
            addToGallery(result.data.image_url, prompt, width, height);
            
            // Show success notification
            showNotification('تصویر با موفقیت تولید شد', 'success');
        } else {
            throw new Error(result.error || 'خطا در تولید تصویر');
        }
        
    } catch (error) {
        console.error('Error generating custom image:', error);
        showNotification('خطا در تولید تصویر: ' + error.message, 'error');
    } finally {
        // Reset button state
        generateCustomImageBtn.disabled = false;
        generateCustomImageBtn.innerHTML = '<i class="fas fa-image"></i> تولید تصویر';
        customImageLoading.classList.add('hidden');
    }
}

// Display custom generated image
function displayCustomImage(imageUrl, prompt, width, height) {
    const imageItem = document.createElement('div');
    imageItem.className = 'custom-image-item fade-in';
    
    imageItem.innerHTML = `
        <div class="image-preview">
            <img src="${imageUrl}" alt="Custom Generated Image" 
                 onerror="this.parentElement.innerHTML='<i class=\\"fas fa-image\\"></i> خطا در بارگذاری تصویر'">
        </div>
        <div class="custom-image-info">
            <h4>تصویر سفارشی تولید شده</h4>
            <div class="image-details">
                <p><strong>پرامپت:</strong> ${prompt}</p>
                <p><strong>ابعاد:</strong> ${width} × ${height} پیکسل</p>
                <p><strong>سرویس:</strong> Pollinations.ai</p>
                <p><strong>تاریخ تولید:</strong> ${new Date().toLocaleString('fa-IR')}</p>
            </div>
            <div class="image-actions">
                <button class="btn btn-small btn-primary" onclick="downloadImage('${imageUrl}', '${prompt.replace(/[^a-zA-Z0-9]/g, '_')}')">
                    <i class="fas fa-download"></i> دانلود
                </button>
                <button class="btn btn-small btn-secondary" onclick="copyImageUrl('${imageUrl}')">
                    <i class="fas fa-copy"></i> کپی لینک
                </button>
            </div>
        </div>
    `;
    
    customImageContainer.innerHTML = '';
    customImageContainer.appendChild(imageItem);
}

// Add image to gallery
function addToGallery(imageUrl, prompt, width, height) {
    const imageData = {
        url: imageUrl,
        prompt: prompt,
        width: width,
        height: height,
        timestamp: new Date()
    };
    
    generatedImages.unshift(imageData); // Add to beginning
    
    // Keep only last 10 images
    if (generatedImages.length > 10) {
        generatedImages = generatedImages.slice(0, 10);
    }
    
    updateGallery();
}

// Update gallery display
function updateGallery() {
    if (generatedImages.length === 0) {
        imageGallery.innerHTML = '<p class="no-images">هنوز تصویری تولید نشده است</p>';
        return;
    }
    
    const galleryHTML = generatedImages.map((image, index) => `
        <div class="gallery-item">
            <div class="gallery-image">
                <img src="${image.url}" alt="Generated Image ${index + 1}" 
                     onerror="this.parentElement.innerHTML='<i class=\\"fas fa-image\\"></i> خطا در بارگذاری'">
            </div>
            <div class="gallery-info">
                <h5>تصویر ${index + 1}</h5>
                <p class="gallery-prompt">${image.prompt.length > 50 ? image.prompt.substring(0, 50) + '...' : image.prompt}</p>
                <p class="gallery-dimensions">${image.width} × ${image.height}</p>
                <p class="gallery-time">${image.timestamp.toLocaleString('fa-IR')}</p>
                <div class="gallery-actions">
                    <button class="btn btn-tiny btn-primary" onclick="downloadImage('${image.url}', '${image.prompt.replace(/[^a-zA-Z0-9]/g, '_')}')">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-tiny btn-secondary" onclick="copyImageUrl('${image.url}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    imageGallery.innerHTML = galleryHTML;
}

// Download image
function downloadImage(imageUrl, filename) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${filename || 'generated_image'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('تصویر در حال دانلود...', 'success');
}

// Copy image URL to clipboard
async function copyImageUrl(imageUrl) {
    try {
        await navigator.clipboard.writeText(imageUrl);
        showNotification('لینک تصویر کپی شد', 'success');
    } catch (error) {
        console.error('Error copying URL:', error);
        showNotification('خطا در کپی کردن لینک', 'error');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('Image Generation Test page initialized');
    updateGallery();
});





