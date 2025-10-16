// Socket.io connection
const socket = io();

// DOM Elements
const generateBtn = document.getElementById('generateBtn');
const loadingSection = document.getElementById('loadingSection');
const scriptSection = document.getElementById('scriptSection');
const scriptContent = document.getElementById('scriptContent');
const generateImagesBtn = document.getElementById('generateImagesBtn');
const imageProgressSection = document.getElementById('imageProgressSection');
const imageGenerationStatus = document.getElementById('imageGenerationStatus');
const imagesGallery = document.getElementById('imagesGallery');
const imagesContainer = document.getElementById('imagesContainer');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');

// New Idea Generation Elements
const userIdea = document.getElementById('userIdea');
const generateNichesBtn = document.getElementById('generateNichesBtn');
const nichesLoadingSection = document.getElementById('nichesLoadingSection');
const nichesSection = document.getElementById('nichesSection');
const nichesContainer = document.getElementById('nichesContainer');
const contentGenerationSection = document.getElementById('contentGenerationSection');
const selectedNicheInfo = document.getElementById('selectedNicheInfo');
const generateContentBtn = document.getElementById('generateContentBtn');
const contentLoadingSection = document.getElementById('contentLoadingSection');

// Custom Image Elements (removed from main page)
// const customPrompt = document.getElementById('customPrompt');
// const imageWidth = document.getElementById('imageWidth');
// const imageHeight = document.getElementById('imageHeight');
// const generateCustomImageBtn = document.getElementById('generateCustomImageBtn');
// const customImageLoading = document.getElementById('customImageLoading');
// const customImageSection = document.getElementById('customImageSection');
// const customImageContainer = document.getElementById('customImageContainer');

// Video Generation Elements
const generateCompleteVideoBtn = document.getElementById('generateCompleteVideoBtn');
const voiceSelect = document.getElementById('voiceSelect');
const videoProgressSection = document.getElementById('videoProgressSection');
const videoGenerationStatus = document.getElementById('videoGenerationStatus');
const videoProgressText = document.getElementById('videoProgressText');
const videoProgressFill = document.getElementById('videoProgressFill');
const videoSection = document.getElementById('videoSection');
const videoContainer = document.getElementById('videoContainer');

// Enhanced Progress Elements
const currentStepText = document.getElementById('currentStepText');
const estimatedTime = document.getElementById('estimatedTime');

// Server Load Test Elements
const testServerLoadBtn = document.getElementById('testServerLoadBtn');
const serverLoadTestSection = document.getElementById('serverLoadTestSection');
const serverLoadStatus = document.getElementById('serverLoadStatus');
const loadStatusIcon = document.getElementById('loadStatusIcon');
const loadStatusTitle = document.getElementById('loadStatusTitle');
const loadStatusMessage = document.getElementById('loadStatusMessage');
const loadStatusDetails = document.getElementById('loadStatusDetails');
const responseTime = document.getElementById('responseTime');
const serverLoadGuidelines = document.getElementById('serverLoadGuidelines');
const guidelinesText = document.getElementById('guidelinesText');

// Direct TTS Elements (moved to separate test page)
// const directTtsText = document.getElementById('directTtsText');
// const directTtsVoice = document.getElementById('directTtsVoice');
// const generateDirectTtsBtn = document.getElementById('generateDirectTtsBtn');
// const directTtsResult = document.getElementById('directTtsResult');
// const directTtsContainer = document.getElementById('directTtsContainer');


// Global variables
let currentScript = null;
let imagePrompts = [];
let generatedImages = [];
let selectedNiche = null;
let currentUserIdea = '';

// Load background music options
async function loadBackgroundMusic() {
    try {
        console.log('🎵 Loading background music options...');
        const response = await fetch('/api/music/list');
        const data = await response.json();
        
        console.log('🎵 API response:', data);
        
        const backgroundMusicSelect = document.getElementById('backgroundMusic');
        console.log('🎵 backgroundMusicSelect element:', backgroundMusicSelect);
        
        if (data.success && backgroundMusicSelect) {
            // Clear existing options except the first one
            backgroundMusicSelect.innerHTML = '<option value="">بدون موزیک بک‌گراند</option>';
            
            // Group music by category
            const categories = {};
            data.music.forEach(music => {
                if (!categories[music.type]) {
                    categories[music.type] = [];
                }
                categories[music.type].push(music);
            });
            
            // Add music options grouped by category
            Object.entries(categories).forEach(([category, musicList]) => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `🎵 ${category}`;
                
                musicList.forEach(music => {
                    const option = document.createElement('option');
                    option.value = music.filename;
                    option.textContent = music.name;
                    optgroup.appendChild(option);
                });
                
                backgroundMusicSelect.appendChild(optgroup);
            });
            
            console.log('✅ Background music options loaded:', data.music.length);
        } else {
            console.error('❌ Failed to load background music:', data);
            console.error('❌ backgroundMusicSelect element:', backgroundMusicSelect);
        }
    } catch (error) {
        console.error('❌ Error loading background music:', error);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for the DOM to be fully loaded
    setTimeout(() => {
        loadBackgroundMusic();
    }, 100);
});

// Event Listeners
if (generateBtn) generateBtn.addEventListener('click', generateScript);
generateImagesBtn.addEventListener('click', generateImages);
// generateCustomImageBtn.addEventListener('click', generateCustomImage); // Moved to test page
generateCompleteVideoBtn.addEventListener('click', generateCompleteVideo);
// generateDirectTtsBtn.addEventListener('click', generateDirectTTS); // Moved to test page

// Direct Creative Script Generation Event Listener
generateNichesBtn.addEventListener('click', generateCreativeScript);

// Generate creative YouTube script directly from user idea
async function generateCreativeScript() {
    const ideaText = userIdea.value.trim();
    
    if (!ideaText) {
        alert('لطفاً ایده خود را وارد کنید');
        return;
    }
    
    try {
        // Show loading state
        generateNichesBtn.disabled = true;
        generateNichesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تولید اسکریپت خلاقانه...';
        nichesLoadingSection.classList.remove('hidden');
        
        currentUserIdea = ideaText;
        
        const response = await fetch('/api/gemini/generate-creative-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userIdea: ideaText
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Skip niche selection and go directly to script display
            currentScript = result.data;
            displayScript(currentScript);
            
            // Hide niche sections and show script directly
            nichesSection.classList.add('hidden');
            contentGenerationSection.classList.add('hidden');
            scriptSection.classList.remove('hidden');
            scriptSection.classList.add('fade-in');
            
            // Scroll to script section
            scriptSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error(result.error || 'خطا در تولید اسکریپت خلاقانه');
        }
        
    } catch (error) {
        console.error('Error generating creative script:', error);
        alert('خطا در تولید اسکریپت خلاقانه: ' + error.message);
    } finally {
        // Reset button state
        generateNichesBtn.disabled = false;
        generateNichesBtn.innerHTML = '<i class="fas fa-magic"></i> تولید اسکریپت خلاقانه';
        nichesLoadingSection.classList.add('hidden');
    }
}

// Display generated niches
function displayNiches(niches) {
    const html = niches.map(niche => `
        <div class="niche-card" onclick="selectNiche(${JSON.stringify(niche).replace(/"/g, '&quot;')})">
            <div class="niche-header">
                <h3>${niche.title}</h3>
                <span class="niche-views">${niche.potential_views}</span>
            </div>
            <p class="niche-description">${niche.description}</p>
            <div class="niche-details">
                <div class="niche-audience">
                    <i class="fas fa-users"></i>
                    <span>${niche.target_audience}</span>
                </div>
                <div class="niche-style">
                    <i class="fas fa-video"></i>
                    <span>${niche.content_style}</span>
                </div>
            </div>
            <div class="niche-select-btn">
                <i class="fas fa-arrow-left"></i>
                انتخاب این نیچ
            </div>
        </div>
    `).join('');
    
    nichesContainer.innerHTML = html;
}

// Select a niche
function selectNiche(niche) {
    selectedNiche = niche;
    
    // Show selected niche info
    selectedNicheInfo.innerHTML = `
        <div class="selected-niche-card">
            <h3><i class="fas fa-check-circle"></i> نیچ انتخابی: ${niche.title}</h3>
            <p>${niche.description}</p>
            <div class="niche-stats">
                <span><i class="fas fa-eye"></i> ${niche.potential_views}</span>
                <span><i class="fas fa-users"></i> ${niche.target_audience}</span>
            </div>
        </div>
    `;
    
    // Show content generation section
    contentGenerationSection.classList.remove('hidden');
    contentGenerationSection.classList.add('fade-in');
    
    // Scroll to content generation section
    contentGenerationSection.scrollIntoView({ behavior: 'smooth' });
}

// Generate content based on selected niche
async function generateContentFromNiche() {
    if (!selectedNiche || !currentUserIdea) {
        alert('لطفاً ابتدا یک نیچ انتخاب کنید');
        return;
    }
    
    try {
        // Show loading state
        generateContentBtn.disabled = true;
        generateContentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تولید محتوا...';
        contentLoadingSection.classList.remove('hidden');
        
        const response = await fetch('/api/gemini/generate-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                selectedNiche: selectedNiche,
                userIdea: currentUserIdea
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentScript = result.data;
            displayScript(currentScript);
            scriptSection.classList.remove('hidden');
            scriptSection.classList.add('fade-in');
            
            // Scroll to script section
            scriptSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error(result.error || 'خطا در تولید محتوا');
        }
        
    } catch (error) {
        console.error('Error generating content:', error);
        alert('خطا در تولید محتوا: ' + error.message);
    } finally {
        // Reset button state
        generateContentBtn.disabled = false;
        generateContentBtn.innerHTML = '<i class="fas fa-play"></i> تولید محتوای یوتیوب';
        contentLoadingSection.classList.add('hidden');
    }
}

// Generate video script using Gemini
async function generateScript() {
    try {
        // Show loading state
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تولید...';
        loadingSection.classList.remove('hidden');
        
        const response = await fetch('/api/gemini/generate-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentScript = result.data;
            displayScript(currentScript);
            scriptSection.classList.remove('hidden');
            scriptSection.classList.add('fade-in');
            
            // Check if using fallback data (quota exceeded)
            if (result.data.title === "AI Technology Revolution" && result.data.scenes.length === 5) {
                showQuotaWarning();
            }
        } else {
            throw new Error(result.error || 'خطا در تولید اسکریپت');
        }
        
    } catch (error) {
        console.error('Error generating script:', error);
        alert('خطا در تولید اسکریپت: ' + error.message);
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-play"></i> شروع تولید محتوا';
        loadingSection.classList.add('hidden');
    }
}

// Display generated script with editing capabilities
function displayScript(script) {
    const html = `
        <div class="script-content">
            <h3 class="script-title">${script.title}</h3>
            <p class="script-description">${script.description}</p>
            <div class="script-editing-info">
                <i class="fas fa-edit"></i>
                <span>می‌توانید متن گوینده و پرامپت تصویر هر صحنه را ویرایش کنید</span>
            </div>
            <ul class="scenes-list">
                ${script.scenes.map((scene, index) => `
                    <li class="scene-item editable-scene">
                        <div class="scene-header">
                            <span class="scene-number">صحنه ${scene.scene_number}</span>
                            <span class="scene-duration">${scene.duration}</span>
                            <button class="btn-edit-scene" onclick="toggleSceneEdit(${index})">
                                <i class="fas fa-edit"></i> ویرایش
                            </button>
                        </div>
                        <div class="scene-content">
                            <div class="scene-text-display" id="scene-text-${index}">
                                <strong>متن گوینده:</strong>
                                <p>${scene.speaker_text}</p>
                            </div>
                            <div class="scene-visual-display" id="scene-visual-${index}">
                                <strong>پرامپت تصویر:</strong>
                                <p>${scene.visual_description}</p>
                            </div>
                            <div class="scene-edit-form hidden" id="scene-edit-${index}">
                                <div class="form-group">
                                    <label>متن گوینده:</label>
                                    <textarea class="form-control scene-speaker-edit" rows="3" data-scene="${index}">${scene.speaker_text}</textarea>
                                </div>
                                <div class="form-group">
                                    <label>پرامپت تصویر:</label>
                                    <textarea class="form-control scene-visual-edit" rows="2" data-scene="${index}">${scene.visual_description}</textarea>
                                </div>
                                <div class="scene-edit-actions">
                                    <button class="btn btn-success btn-small" onclick="saveSceneEdit(${index})">
                                        <i class="fas fa-save"></i> ذخیره
                                    </button>
                                    <button class="btn btn-secondary btn-small" onclick="cancelSceneEdit(${index})">
                                        <i class="fas fa-times"></i> لغو
                                    </button>
                                </div>
                            </div>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
    
    scriptContent.innerHTML = html;
}

// Generate image prompts and images - NOW CALLS BACKEND DIRECTLY
async function generateImages() {
    if (!currentScript || !currentScript.scenes) {
        alert('ابتدا اسکریپت را تولید کنید');
        return;
    }
    
    try {
        generateImagesBtn.disabled = true;
        generateImagesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> شروع تولید کامل...';
        
        // Show elegant warning notification
        showPageWarningNotification();
        
        // Show progress section
        imageProgressSection.classList.remove('hidden');
        imageProgressSection.classList.add('fade-in');
        
        // Reset progress
        updateProgress(0, currentScript.scenes.length);
        
        addStatusItem(0, 'generating', 'ارسال درخواست به سرور...', 'سرور همه چیز را انجام می‌دهد');
        
        // Show notification
        showNotification('🚀 درخواست ارسال شد - سرور تصاویر، صداها و ویدیو را می‌سازد', 'success');
        
        // Wait a moment to show the message
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Now call the complete video function which handles everything in backend
        await generateCompleteVideo();
        
    } catch (error) {
        console.error('Error starting video generation:', error);
        alert('خطا در شروع تولید ویدیو: ' + error.message);
        
        generateImagesBtn.disabled = false;
        generateImagesBtn.innerHTML = '<i class="fas fa-arrow-right"></i> شروع تولید کامل';
    }
}

// Add status item for image generation
function addStatusItem(index, status, statusText, sceneText) {
    const statusItem = document.createElement('div');
    statusItem.className = `status-item ${status}`;
    statusItem.id = `status-${index}`;
    
    const iconClass = status === 'generating' ? 'fas fa-spinner fa-spin' : 
                     status === 'completed' ? 'fas fa-check-circle' : 
                     'fas fa-exclamation-circle';
    
    statusItem.innerHTML = `
        <div class="status-icon ${status}">
            <i class="${iconClass}"></i>
        </div>
        <div class="status-text">
            <h4>صحنه ${index + 1}</h4>
            <p>${statusText}</p>
            <small>${sceneText}</small>
        </div>
    `;
    
    imageGenerationStatus.appendChild(statusItem);
}

// Update status item
function updateStatusItem(index, status, statusText, sceneText) {
    const statusItem = document.getElementById(`status-${index}`);
    if (statusItem) {
        statusItem.className = `status-item ${status}`;
        
        const iconClass = status === 'generating' ? 'fas fa-spinner fa-spin' : 
                         status === 'completed' ? 'fas fa-check-circle' : 
                         'fas fa-exclamation-circle';
        
        statusItem.innerHTML = `
            <div class="status-icon ${status}">
                <i class="${iconClass}"></i>
            </div>
            <div class="status-text">
                <h4>صحنه ${index + 1}</h4>
                <p>${statusText}</p>
                <small>${sceneText}</small>
            </div>
        `;
    }
}

// Update progress bar
function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${current} از ${total} تصویر`;
}

// Display generated image
function displayGeneratedImage(index, imageUrl, scene) {
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item fade-in';
    
    imageItem.innerHTML = `
        <div class="image-preview">
            <img src="${imageUrl}" alt="Generated Image ${index + 1}" 
                 onerror="this.parentElement.innerHTML='<i class=\\"fas fa-image\\"></i> خطا در بارگذاری تصویر'">
        </div>
        <div class="image-info">
            <h4>صحنه ${index + 1}</h4>
            <p>${scene.speaker_text}</p>
        </div>
    `;
    
    imagesContainer.appendChild(imageItem);
}

// Socket.io event listeners
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('imageGenerated', (data) => {
    console.log('Image generated:', data);
});

// Video status update listener
socket.on('videoStatusUpdate', (data) => {
    console.log('📹 Video status update:', data);
    handleVideoStatusUpdate(data);
});

// Video progress update listener  
socket.on('videoProgressUpdate', (data) => {
    console.log('📊 Video progress update:', data);
    handleVideoProgressUpdate(data);
});

// Generate custom image (moved to test-image-generation.js)
// async function generateCustomImage() { ... }

// Display custom generated image (moved to test-image-generation.js)
// function displayCustomImage(imageUrl, prompt, width, height) { ... }

// Global variable to track current video being generated
let currentGeneratingVideoId = null;

// Handle video status updates from server
function handleVideoStatusUpdate(data) {
    if (!data || !data.videoId) return;
    
    // Only handle updates for the video we're currently generating
    if (currentGeneratingVideoId && data.videoId !== currentGeneratingVideoId) {
        return;
    }
    
    console.log('📹 Handling video status:', data.status, data);
    
    if (data.status === 'queued') {
        showNotification('ویدیو به صف اضافه شد و منتظر پردازش است', 'info');
    } else if (data.status === 'processing') {
        showNotification('شروع پردازش ویدیو...', 'info');
        updateVideoStatusItem(3, 'processing', 'در حال تولید ویدیو نهایی...', '');
    } else if (data.status === 'completed' && data.result) {
        showNotification('ویدیو با موفقیت تولید شد!', 'success');
        updateVideoStatusItem(3, 'completed', 'ویدیو با موفقیت تولید شد', '');
        updateVideoProgress(4, 4);
        
        // Display final video
        if (data.result.data) {
            displayGeneratedVideo(data.result.data);
            videoSection.classList.remove('hidden');
            videoSection.classList.add('fade-in');
        }
        
        // Reset current video ID
        currentGeneratingVideoId = null;
        
        // Re-enable button
        if (generateCompleteVideoBtn) {
            generateCompleteVideoBtn.disabled = false;
            generateCompleteVideoBtn.innerHTML = '<i class="fas fa-video"></i> تولید ویدیو کامل';
        }
    } else if (data.status === 'failed') {
        showNotification('خطا در تولید ویدیو: ' + (data.error || 'خطای ناشناخته'), 'error');
        updateVideoStatusItem(3, 'error', 'خطا در تولید ویدیو', data.error || '');
        
        // Reset current video ID
        currentGeneratingVideoId = null;
        
        // Re-enable button
        if (generateCompleteVideoBtn) {
            generateCompleteVideoBtn.disabled = false;
            generateCompleteVideoBtn.innerHTML = '<i class="fas fa-video"></i> تولید ویدیو کامل';
        }
    }
}

// Handle video progress updates from server
function handleVideoProgressUpdate(data) {
    if (!data || !data.videoId) return;
    
    // Only handle updates for the video we're currently generating
    if (currentGeneratingVideoId && data.videoId !== currentGeneratingVideoId) {
        return;
    }
    
    console.log('📊 Handling progress update:', data.progress, data.currentStep);
    
    if (data.currentStep) {
        showNotification(data.currentStep, 'info');
    }
    
    // Update progress bar if we have progress information
    if (typeof data.progress === 'number') {
        const normalizedProgress = Math.min(Math.max(data.progress / 25, 0), 4); // Convert 0-100 to 0-4 scale
        updateVideoProgress(normalizedProgress, 4);
    }
}

// Generate complete video - NOW FULLY IN BACKEND
async function generateCompleteVideo() {
    try {
        if (!currentScript) {
            alert('ابتدا اسکریپت را تولید کنید');
            return;
        }

        // Show loading state
        generateCompleteVideoBtn.disabled = true;
        generateCompleteVideoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال اضافه کردن به صف...';
        
        // Show elegant warning notification
        showPageWarningNotification();
        
        // Show video progress section
        videoProgressSection.classList.remove('hidden');
        videoProgressSection.classList.add('fade-in');
        
        // Reset progress
        updateVideoProgress(0, 4);
        
        // Prepare audio settings
        addVideoStatusItem(0, 'processing', 'ارسال درخواست به سرور...', '');
        
        const backgroundMusicElement = document.getElementById('backgroundMusic');
        
        const audioSettings = {
            voice: voiceSelect.value,
            backgroundMusic: backgroundMusicElement ? backgroundMusicElement.value : ''
        };
        
        // Send ONLY script to server - server will handle everything else
        const completeVideoData = {
            script: currentScript,
            audioSettings: audioSettings,
            processInBackground: true // Flag to indicate full backend processing
        };
        
        console.log('🎵 Sending video request to server (backend will handle everything)...', completeVideoData);
        
        const videoResponse = await fetch('/api/video/generate-complete-video-backend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(completeVideoData)
        });
        
        const videoResult = await videoResponse.json();
        
        if (videoResult.success && videoResult.videoId) {
            // Store the video ID to track its progress
            currentGeneratingVideoId = videoResult.videoId;
            
            updateVideoStatusItem(0, 'completed', `ویدیو به صف اضافه شد (موقعیت: ${videoResult.queuePosition})`, '');
            showNotification('✅ ویدیو به صف اضافه شد. می‌توانید صفحه را ببندید!', 'success');
            
            // Update button text
            generateCompleteVideoBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> در حال پردازش در سرور...';
            
            // Clear the UI sections to show we're waiting for server
            updateVideoProgress(1, 4);
            addVideoStatusItem(1, 'processing', 'سرور در حال تولید تصاویر...', '');
            
            // WebSocket will handle the rest of the updates automatically
            
        } else {
            throw new Error(videoResult.error || 'خطا در اضافه کردن به صف');
        }
        
    } catch (error) {
        console.error('Error generating complete video:', error);
        alert('خطا در تولید ویدیو: ' + error.message);
        
        // Update status to error
        const statusItems = document.querySelectorAll('.video-status-item');
        if (statusItems.length > 0) {
            const lastItem = statusItems[statusItems.length - 1];
            lastItem.className = 'video-status-item error';
            lastItem.querySelector('.video-status-icon').innerHTML = '<i class="fas fa-exclamation-circle"></i>';
            lastItem.querySelector('.video-status-text p').textContent = 'خطا در تولید ویدیو';
        }
        
        // Re-enable button
        generateCompleteVideoBtn.disabled = false;
        generateCompleteVideoBtn.innerHTML = '<i class="fas fa-video"></i> تولید ویدیو کامل';
        
        // Reset current video ID
        currentGeneratingVideoId = null;
    }
}

// Add video status item
function addVideoStatusItem(index, status, statusText, description) {
    const statusItem = document.createElement('div');
    statusItem.className = `video-status-item ${status}`;
    statusItem.id = `video-status-${index}`;
    
    const iconClass = status === 'processing' ? 'fas fa-spinner fa-spin' : 
                     status === 'completed' ? 'fas fa-check-circle' : 
                     'fas fa-exclamation-circle';
    
    statusItem.innerHTML = `
        <div class="video-status-icon ${status}">
            <i class="${iconClass}"></i>
        </div>
        <div class="video-status-text">
            <h4>مرحله ${index + 1}</h4>
            <p>${statusText}</p>
            <small>${description}</small>
        </div>
    `;
    
    videoGenerationStatus.appendChild(statusItem);
}

// Update video status item
function updateVideoStatusItem(index, status, statusText, description) {
    const statusItem = document.getElementById(`video-status-${index}`);
    if (statusItem) {
        statusItem.className = `video-status-item ${status}`;
        
        const iconClass = status === 'processing' ? 'fas fa-spinner fa-spin' : 
                         status === 'completed' ? 'fas fa-check-circle' : 
                         'fas fa-exclamation-circle';
        
        statusItem.innerHTML = `
            <div class="video-status-icon ${status}">
                <i class="${iconClass}"></i>
            </div>
            <div class="video-status-text">
                <h4>مرحله ${index + 1}</h4>
                <p>${statusText}</p>
                <small>${description}</small>
            </div>
        `;
    }
}

// Update video progress bar with enhanced features
function updateVideoProgress(current, total) {
    const percentage = (current / total) * 100;
    videoProgressFill.style.width = `${percentage}%`;
    videoProgressText.textContent = `${current} از ${total} مرحله`;
    
    // Update step indicators
    updateProgressSteps(current);
    
    // Update current step text
    updateCurrentStepText(current);
    
    // Update estimated time
    updateEstimatedTime(current, total);
}

// Update progress step indicators
function updateProgressSteps(currentStep) {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed', 'pending');
        if (index < currentStep) {
            step.classList.add('completed');
        } else if (index === currentStep - 1) {
            step.classList.add('active');
        } else {
            step.classList.add('pending');
        }
    });
}

// Update current step text
function updateCurrentStepText(currentStep) {
    const stepTexts = [
        'آماده‌سازی',
        'تولید صدا',
        'ترکیب تصاویر',
        'تولید نهایی'
    ];
    
    if (currentStepText && stepTexts[currentStep - 1]) {
        currentStepText.textContent = stepTexts[currentStep - 1];
    }
}

// Update estimated time
function updateEstimatedTime(current, total) {
    if (estimatedTime) {
        const remainingSteps = total - current;
        const estimatedSeconds = remainingSteps * 15; // Assume 15 seconds per step
        
        if (remainingSteps === 0) {
            estimatedTime.textContent = 'تقریباً تمام شد';
        } else if (estimatedSeconds < 60) {
            estimatedTime.textContent = `تقریباً ${estimatedSeconds} ثانیه`;
        } else {
            const minutes = Math.ceil(estimatedSeconds / 60);
            estimatedTime.textContent = `تقریباً ${minutes} دقیقه`;
        }
    }
}

// Display audio results with play buttons
function displayAudioResults(audioResults) {
    console.log('🎵 Displaying audio results:', audioResults);
    
    const audioSection = document.createElement('div');
    audioSection.className = 'audio-results-section';
    audioSection.innerHTML = '<h3><i class="fas fa-volume-up"></i> صداهای تولید شده</h3>';
    
    const audioContainer = document.createElement('div');
    audioContainer.className = 'audio-container';
    
    let hasAudio = false;
    
    audioResults.forEach((audio, index) => {
        console.log(`🎵 Processing audio ${index}:`, audio);
        
        if (audio.audioUrl || audio.audio_url) {
            hasAudio = true;
            const audioItem = document.createElement('div');
            audioItem.className = 'audio-item';
            
            const audioUrl = audio.audioUrl || audio.audio_url;
            const sceneText = currentScript && currentScript.scenes && currentScript.scenes[index] 
                ? currentScript.scenes[index].speaker_text 
                : 'متن صحنه';
            
            audioItem.innerHTML = `
                <div class="audio-info">
                    <h4>صحنه ${index + 1}</h4>
                    <p><strong>متن اصلی:</strong> ${sceneText}</p>
                    <p><strong>متن انگلیسی:</strong> ${audio.text || 'در حال ترجمه...'}</p>
                    <p><strong>صدا:</strong> ${audio.voice || 'پیش‌فرض'}</p>
                    <p><strong>موتور:</strong> ${audio.engine || 'Kokoro TTS'}</p>
                    <p><strong>مدت زمان:</strong> ${audio.duration ? audio.duration.toFixed(1) : 'نامشخص'} ثانیه</p>
                    <p><strong>URL:</strong> ${audioUrl}</p>
                </div>
                <div class="audio-controls">
                    <audio controls class="audio-player">
                        <source src="${audioUrl}" type="audio/wav">
                        مرورگر شما از پخش صدا پشتیبانی نمی‌کند.
                    </audio>
                    <button class="btn btn-small" onclick="playAudio('${audioUrl}')">
                        <i class="fas fa-play"></i> پخش
                    </button>
                </div>
            `;
            
            audioContainer.appendChild(audioItem);
        } else {
            console.log(`⚠️ No audio URL for scene ${index}`);
        }
    });
    
    if (!hasAudio) {
        audioContainer.innerHTML = '<p class="no-audio">⚠️ هیچ صدایی تولید نشده است</p>';
    }
    
    audioSection.appendChild(audioContainer);
    
    // Insert after video progress section
    const videoProgressSection = document.getElementById('videoProgressSection');
    if (videoProgressSection && videoProgressSection.parentNode) {
        videoProgressSection.parentNode.insertBefore(audioSection, videoProgressSection.nextSibling);
    }
}

// Play audio function
function playAudio(audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(error => {
        console.error('Error playing audio:', error);
        alert('خطا در پخش صدا: ' + error.message);
    });
}

// Display generated video
function displayGeneratedVideo(videoData) {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item fade-in';
    
    videoItem.innerHTML = `
        <video controls class="video-item" style="width: 100%; max-width: 500px;">
            <source src="${videoData.video_url}" type="video/mp4">
            مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
        </video>
        <div class="video-info">
            <h4>ویدیو تولید شده با زیرنویس</h4>
            <p><strong>مدت زمان:</strong> ${videoData.duration} ثانیه</p>
            <p><strong>تعداد صحنه‌ها:</strong> ${videoData.scenes_count}</p>
            <p><strong>رزولوشن:</strong> ${videoData.resolution}</p>
            <p><strong>وضعیت:</strong> ${videoData.status}</p>
            <p><strong>ویژگی‌ها:</strong> صدا با کوکورو TTS، زیرنویس با Whisper</p>
        </div>
    `;
    
    videoContainer.innerHTML = '';
    videoContainer.appendChild(videoItem);
}

// Generate direct TTS (moved to test-tts.js)
// async function generateDirectTTS() { ... }

// Display direct TTS result (moved to test-tts.js)
// function displayDirectTTSResult(audioData) { ... }

// Load available voices
async function loadAvailableVoices() {
    try {
        const response = await fetch('/api/kokoro/voices');
        const result = await response.json();
        
        if (result.success) {
            const voiceSelect = document.getElementById('directTtsVoice');
            voiceSelect.innerHTML = '';
            
            result.data.voices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.id;
                option.textContent = `${voice.name} (${voice.language})`;
                voiceSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading voices:', error);
    }
}

// Show quota warning
function showQuotaWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'quota-warning';
    warningDiv.innerHTML = `
        <div class="warning-content">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>⚠️ سهمیه Gemini API تمام شده</h4>
            <p>سیستم از داده‌های نمونه استفاده می‌کند. برای استفاده از Gemini واقعی:</p>
            <ul>
                <li>🔑 API Key جدید از <a href="https://aistudio.google.com/" target="_blank">Google AI Studio</a> دریافت کنید</li>
                <li>⏰ منتظر بازگشت سهمیه روزانه بمانید</li>
                <li>💳 پلن پولی فعال کنید</li>
            </ul>
            <button onclick="this.parentElement.parentElement.remove()" class="btn btn-small">
                <i class="fas fa-times"></i> بستن
            </button>
        </div>
    `;
    
    // Add warning styles
    const style = document.createElement('style');
    style.textContent = `
        .quota-warning {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        }
        .quota-warning h4 {
            color: #856404;
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        .quota-warning p {
            color: #856404;
            margin: 0 0 10px 0;
            font-size: 14px;
        }
        .quota-warning ul {
            color: #856404;
            margin: 0 0 15px 0;
            padding-left: 20px;
        }
        .quota-warning li {
            margin: 5px 0;
            font-size: 13px;
        }
        .quota-warning a {
            color: #007bff;
            text-decoration: none;
        }
        .quota-warning a:hover {
            text-decoration: underline;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(warningDiv);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (warningDiv.parentElement) {
            warningDiv.remove();
        }
    }, 10000);
}

// Scene editing functions
function toggleSceneEdit(sceneIndex) {
    const editForm = document.getElementById(`scene-edit-${sceneIndex}`);
    const textDisplay = document.getElementById(`scene-text-${sceneIndex}`);
    const visualDisplay = document.getElementById(`scene-visual-${sceneIndex}`);
    const editBtn = document.querySelector(`[onclick="toggleSceneEdit(${sceneIndex})"]`);
    
    if (editForm.classList.contains('hidden')) {
        // Show edit form
        editForm.classList.remove('hidden');
        textDisplay.classList.add('hidden');
        visualDisplay.classList.add('hidden');
        editBtn.innerHTML = '<i class="fas fa-times"></i> لغو ویرایش';
        editBtn.onclick = () => cancelSceneEdit(sceneIndex);
    } else {
        // Hide edit form
        editForm.classList.add('hidden');
        textDisplay.classList.remove('hidden');
        visualDisplay.classList.remove('hidden');
        editBtn.innerHTML = '<i class="fas fa-edit"></i> ویرایش';
        editBtn.onclick = () => toggleSceneEdit(sceneIndex);
    }
}

function saveSceneEdit(sceneIndex) {
    const speakerText = document.querySelector(`.scene-speaker-edit[data-scene="${sceneIndex}"]`).value;
    const visualDescription = document.querySelector(`.scene-visual-edit[data-scene="${sceneIndex}"]`).value;
    
    // Update current script
    if (currentScript && currentScript.scenes && currentScript.scenes[sceneIndex]) {
        currentScript.scenes[sceneIndex].speaker_text = speakerText;
        currentScript.scenes[sceneIndex].visual_description = visualDescription;
    }
    
    // Update display
    const textDisplay = document.getElementById(`scene-text-${sceneIndex}`);
    const visualDisplay = document.getElementById(`scene-visual-${sceneIndex}`);
    
    textDisplay.querySelector('p').textContent = speakerText;
    visualDisplay.querySelector('p').textContent = visualDescription;
    
    // Hide edit form
    toggleSceneEdit(sceneIndex);
    
    // Show success message
    showNotification('تغییرات با موفقیت ذخیره شد و در تولید تصاویر اعمال خواهد شد', 'success');
}

function cancelSceneEdit(sceneIndex) {
    // Reset form values to original
    const speakerText = currentScript.scenes[sceneIndex].speaker_text;
    const visualDescription = currentScript.scenes[sceneIndex].visual_description;
    
    document.querySelector(`.scene-speaker-edit[data-scene="${sceneIndex}"]`).value = speakerText;
    document.querySelector(`.scene-visual-edit[data-scene="${sceneIndex}"]`).value = visualDescription;
    
    // Hide edit form
    toggleSceneEdit(sceneIndex);
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

// Elegant Page Warning Notification
function showPageWarningNotification() {
    // Remove any existing warning notification
    const existingWarning = document.querySelector('.page-warning-notification');
    if (existingWarning) {
        existingWarning.remove();
    }
    
    const warningNotification = document.createElement('div');
    warningNotification.className = 'page-warning-notification';
    warningNotification.innerHTML = `
        <div class="page-warning-content">
            <div class="page-warning-icon">
                <i class="fas fa-info-circle"></i>
            </div>
            <div class="page-warning-text">
                <div class="page-warning-title">✅ خبر خوب!</div>
                <div class="page-warning-message">
                    ویدیو در حال پردازش در سرور است. می‌توانید صفحه را ببندید و بعداً برگردید.
                    وضعیت ویدیو به صورت خودکار ذخیره می‌شود.
                </div>
            </div>
            <button class="page-warning-close" onclick="closePageWarningNotification()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(warningNotification);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (warningNotification.parentElement) {
            closePageWarningNotification();
        }
    }, 10000);
}

// Close Page Warning Notification
function closePageWarningNotification() {
    const warningNotification = document.querySelector('.page-warning-notification');
    if (warningNotification) {
        warningNotification.style.animation = 'fadeOutUp 0.5s ease-out forwards';
        setTimeout(() => {
            if (warningNotification.parentElement) {
                warningNotification.remove();
            }
        }, 500);
    }
}

// Server Load Test Functions
async function testServerLoad() {
    try {
        // Show loading state
        testServerLoadBtn.disabled = true;
        testServerLoadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال بررسی...';
        
        // Show server load test section
        serverLoadTestSection.classList.remove('hidden');
        serverLoadStatus.classList.remove('hidden');
        serverLoadGuidelines.classList.add('hidden');
        
        // Set loading state
        loadStatusIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        loadStatusIcon.style.color = '#3b82f6';
        loadStatusTitle.textContent = 'در حال بررسی سرور...';
        loadStatusMessage.textContent = 'در حال ارسال درخواست به سرورهای ارک';
        loadStatusDetails.classList.add('hidden');
        
        // Make request to test server load
        const response = await fetch('/api/flax/test-server-load', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        // Update UI based on result
        updateServerLoadStatus(result);
        
    } catch (error) {
        console.error('Server load test error:', error);
        
        // Show error state
        loadStatusIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        loadStatusIcon.style.color = '#ef4444';
        loadStatusTitle.textContent = 'خطا در بررسی سرور';
        loadStatusMessage.textContent = 'خطا در ارتباط با سرور: ' + error.message;
        loadStatusDetails.classList.add('hidden');
        
    } finally {
        // Reset button state
        testServerLoadBtn.disabled = false;
        testServerLoadBtn.innerHTML = '<i class="fas fa-server"></i> تست شلوغی سرور';
    }
}

function updateServerLoadStatus(result) {
    // Update status icon and colors based on load status
    const loadStatus = result.loadStatus;
    
    // Remove existing status classes
    serverLoadStatus.removeAttribute('data-status');
    
    if (loadStatus === 'شلوغی متوسط') {
        loadStatusIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
        loadStatusIcon.style.color = '#10b981';
        serverLoadStatus.setAttribute('data-status', 'good');
    } else if (loadStatus === 'شلوغی زیاد') {
        loadStatusIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        loadStatusIcon.style.color = '#f59e0b';
        serverLoadStatus.setAttribute('data-status', 'warning');
    } else {
        loadStatusIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
        loadStatusIcon.style.color = '#ef4444';
        serverLoadStatus.setAttribute('data-status', 'error');
    }
    
    // Update status text
    loadStatusTitle.textContent = loadStatus;
    loadStatusMessage.textContent = result.message || 'نتیجه تست سرور';
    
    // Show details if available
    if (result.responseTime !== undefined) {
        loadStatusDetails.classList.remove('hidden');
        
        if (result.responseTime !== undefined) {
            responseTime.textContent = result.responseTime + 'ms';
        }
    }
    
    // Determine notification type
    let notificationType = 'info';
    if (loadStatus === 'شلوغی متوسط') {
        notificationType = 'success';
    } else if (loadStatus === 'شلوغی زیاد') {
        notificationType = 'warning';
    } else {
        notificationType = 'error';
    }
    
    // Show notification
    showNotification(result.message || `وضعیت سرور: ${loadStatus}`, notificationType);
    
    // Show guidelines based on server status
    showServerLoadGuidelines(loadStatus);
}

function showServerLoadGuidelines(loadStatus) {
    // Show guidelines section
    serverLoadGuidelines.classList.remove('hidden');
    
    let guidelinesContent = '';
    
    if (loadStatus === 'شلوغی متوسط') {
        guidelinesContent = `
            <p>
                <strong class="success-text">✅ وضعیت مناسب!</strong> 
                در حال حاضر می‌توانید به راحتی ویدیو بسازید.
            </p>
            <p>
                سرور در حالت متعادل قرار دارد و تمامی قابلیت‌های سیستم در دسترس هستند. 
                می‌توانید بدون نگرانی از تولید ویدیو، تصاویر و سایر محتواها استفاده کنید.
            </p>
        `;
    } else if (loadStatus === 'شلوغی زیاد') {
        guidelinesContent = `
            <p>
                <strong class="warning-text">⚠️ شلوغی زیاد!</strong> 
                توصیه می‌شود از ساخت ویدیو خودداری کنید.
            </p>
            <p>
                در حال حاضر سرور تحت فشار قرار دارد و ممکن است با خطاهای ساخت مواجه شوید. 
                این موضوع به دلیل استفاده همزمان تعداد زیادی کاربر از سیستم است.
            </p>
            <p>
                <strong>راه حل:</strong> در صورت نیاز فوری، با بخش پشتیبانی تماس بگیرید تا 
                راه‌حل‌های شخصی‌سازی شده دریافت کنید.
            </p>
            <a href="https://t.me/arkk_support" target="_blank" class="support-link">
                <i class="fab fa-telegram"></i>
                تماس با پشتیبانی
            </a>
        `;
    } else {
        guidelinesContent = `
            <p>
                <strong class="error-text">🚨 سرور تحت فشار حداکثری!</strong> 
                لطفاً از ساخت ویدیو خودداری کنید.
            </p>
            <p>
                سرور در حال حاضر تحت فشار حداکثری قرار دارد و احتمال بروز خطا در ساخت ویدیو بسیار بالاست. 
                این وضعیت معمولاً به دلیل استفاده بیش از حد کاربران از سیستم رخ می‌دهد.
            </p>
            <p>
                <strong>متأسفانه بسیاری از کاربران این وضعیت را رعایت نمی‌کنند</strong> و باعث 
                افزایش فشار بر روی سرور می‌شوند.
            </p>
            <p>
                <strong>راه حل تخصصی:</strong> اگر می‌خواهید از صف سرور جدا باشید و به صورت 
                شخصی‌سازی شده عمل کنید، حتماً با بخش پشتیبانی در میان بگذارید.
            </p>
            <a href="https://t.me/arkk_support" target="_blank" class="support-link">
                <i class="fab fa-telegram"></i>
                تماس با پشتیبانی - @arkk_support
            </a>
        `;
    }
    
    guidelinesText.innerHTML = guidelinesContent;
}


// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('AI Video Maker initialized');
    loadAvailableVoices();
    
    // Add event listener for server load test button
    if (testServerLoadBtn) {
        testServerLoadBtn.addEventListener('click', testServerLoad);
    }
    
    // Check if we have a video being generated on page load
    // This helps resume monitoring if user refreshed the page
    if (currentGeneratingVideoId) {
        console.log('📹 Resuming video generation monitoring for:', currentGeneratingVideoId);
        showNotification('در حال بررسی وضعیت ویدیو...', 'info');
    }
});

