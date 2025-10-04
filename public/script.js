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

// Generate image prompts and images
async function generateImages() {
    if (!currentScript || !currentScript.scenes) {
        alert('ابتدا اسکریپت را تولید کنید');
        return;
    }
    
    try {
        generateImagesBtn.disabled = true;
        generateImagesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تولید تصاویر و ویدیو...';
        
        // Show elegant warning notification
        showPageWarningNotification();
        
        // Show progress section
        imageProgressSection.classList.remove('hidden');
        imageProgressSection.classList.add('fade-in');
        
        // Reset progress
        imagePrompts = [];
        generatedImages = [];
        updateProgress(0, currentScript.scenes.length);
        
        // Generate images for each scene using existing image prompts
        for (let i = 0; i < currentScript.scenes.length; i++) {
            const scene = currentScript.scenes[i];
            
            // Add status item with indication if using edited prompt
            const isEditedPrompt = scene.visual_description && scene.visual_description !== scene.image_prompt;
            const statusText = isEditedPrompt ? 'تولید تصویر با پرامپت ویرایش شده...' : 'تولید تصویر...';
            addStatusItem(i, 'generating', statusText, scene.speaker_text);
            
            try {
                // Use the edited visual description if available, otherwise fall back to original prompts
                const imagePrompt = scene.visual_description || scene.image_prompt || 'A beautiful and engaging visual';
                
                // Log which prompt is being used for debugging
                console.log(`Scene ${i + 1} - Using prompt:`, imagePrompt);
                console.log(`Scene ${i + 1} - Original image_prompt:`, scene.image_prompt);
                console.log(`Scene ${i + 1} - Edited visual_description:`, scene.visual_description);
                
                imagePrompts.push({
                    sceneIndex: i,
                    prompt: imagePrompt,
                    scene: scene
                });
                
                // Generate image using Pollinations.ai
                const imageResponse = await fetch('/api/flax/generate-image-url', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            prompt: imagePrompt
                        })
                    });
                    
                    const imageResult = await imageResponse.json();
                    
                    if (imageResult.success) {
                        generatedImages.push({
                            sceneIndex: i,
                            imageUrl: imageResult.data.image_url,
                            prompt: imagePrompt,
                            scene: scene
                        });
                        
                        const completionText = isEditedPrompt ? 'تصویر با پرامپت ویرایش شده تولید شد' : 'تصویر تولید شد';
                        updateStatusItem(i, 'completed', completionText, scene.speaker_text);
                        displayGeneratedImage(i, imageResult.data.image_url, scene);
                        
                    } else {
                        throw new Error(imageResult.error || 'خطا در تولید تصویر');
                    }
                
            } catch (error) {
                console.error(`Error processing scene ${i}:`, error);
                updateStatusItem(i, 'error', 'خطا در تولید', scene.speaker_text);
            }
            
            // Update progress
            updateProgress(i + 1, currentScript.scenes.length);
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Hide images gallery after generation (as requested)
        imagesGallery.classList.add('hidden');
        
        // Show notification for next step
        showNotification('تصاویر با موفقیت تولید شدند! در حال شروع تولید ویدیو...', 'success');
        
        // Automatically start video generation after a short delay
        setTimeout(() => {
            generateCompleteVideo();
        }, 2000); // 2 second delay to show the success message
        
    } catch (error) {
        console.error('Error generating images:', error);
        alert('خطا در تولید تصاویر: ' + error.message);
    } finally {
        generateImagesBtn.disabled = false;
        generateImagesBtn.innerHTML = '<i class="fas fa-arrow-right"></i> شروع تولید کامل';
        
        // Hide the complete video button since it's now automatic
        generateCompleteVideoBtn.classList.add('hidden');
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

// Generate custom image (moved to test-image-generation.js)
// async function generateCustomImage() { ... }

// Display custom generated image (moved to test-image-generation.js)
// function displayCustomImage(imageUrl, prompt, width, height) { ... }

// Generate complete video
async function generateCompleteVideo() {
    try {
        if (!currentScript || !generatedImages.length) {
            alert('ابتدا اسکریپت و تصاویر را تولید کنید');
            return;
        }

        // Show loading state
        generateCompleteVideoBtn.disabled = true;
        generateCompleteVideoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تولید ویدیو...';
        
        // Show elegant warning notification
        showPageWarningNotification();
        
        // Show video progress section
        videoProgressSection.classList.remove('hidden');
        videoProgressSection.classList.add('fade-in');
        
        // Reset progress
        updateVideoProgress(0, 4);
        
        // Step 1: Prepare audio settings
        addVideoStatusItem(0, 'processing', 'آماده‌سازی تنظیمات صدا...', '');
        const audioSettings = {
            voice: voiceSelect.value
        };
        updateVideoStatusItem(0, 'completed', 'تنظیمات صدا آماده شد', '');
        updateVideoProgress(1, 4);
        
        // Step 2: Generate TTS for all scenes using Piper TTS
        addVideoStatusItem(1, 'processing', 'تولید صدا برای صحنه‌ها با Piper TTS...', '');
        const ttsPromises = currentScript.scenes.map(async (scene, index) => {
            try {
                const response = await fetch('/api/kokoro/text-to-speech', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: scene.speaker_text,
                        voice: audioSettings.voice || 'en_US-lessac-medium'
                    })
                });
                const result = await response.json();
                return {
                    sceneIndex: index,
                    audioUrl: result.data.audio_url,
                    duration: result.data.duration,
                    text: result.data.text,
                    voice: result.data.voice,
                    engine: result.data.engine
                };
            } catch (error) {
                console.error(`Error generating TTS for scene ${index}:`, error);
                return {
                    sceneIndex: index,
                    audioUrl: null,
                    duration: 5
                };
            }
        });
        
        const audioResults = await Promise.all(ttsPromises);
        updateVideoStatusItem(1, 'completed', 'صدا برای تمام صحنه‌ها تولید شد', '');
        
        // Display audio results with play buttons
        displayAudioResults(audioResults);
        
        updateVideoProgress(2, 4);
        
        // Step 3: Prepare video composition
        addVideoStatusItem(2, 'processing', 'آماده‌سازی ترکیب ویدیو...', '');
        const videoData = {
            script: currentScript,
            images: generatedImages,
            audioSettings: audioSettings
        };
        updateVideoStatusItem(2, 'completed', 'ترکیب ویدیو آماده شد', '');
        updateVideoProgress(3, 4);
        
        // Step 4: Generate final video with subtitles
        addVideoStatusItem(3, 'processing', 'تولید ویدیو نهایی با زیرنویس...', '');
        
        // Prepare complete video data with audio results
        const completeVideoData = {
            script: currentScript,
            images: generatedImages,
            audioSettings: audioSettings,
            audioResults: audioResults // Add audio results to the request
        };
        
        const videoResponse = await fetch('/api/video/generate-complete-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(completeVideoData)
        });
        
        const videoResult = await videoResponse.json();
        
        if (videoResult.success) {
            updateVideoStatusItem(3, 'completed', 'ویدیو با موفقیت تولید شد', '');
            updateVideoProgress(4, 4);
            
            // Display final video
            displayGeneratedVideo(videoResult.data);
            videoSection.classList.remove('hidden');
            videoSection.classList.add('fade-in');
        } else {
            throw new Error(videoResult.error || 'خطا در تولید ویدیو');
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
    } finally {
        generateCompleteVideoBtn.disabled = false;
        generateCompleteVideoBtn.innerHTML = '<i class="fas fa-video"></i> تولید ویدیو کامل';
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
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="page-warning-text">
                <div class="page-warning-title">⚠️ توجه مهم</div>
                <div class="page-warning-message">
                    لطفاً تا پایان ساخت ویدیو از صفحه خارج نشوید و صفحه را ریلود نکنید. 
                    این کار ممکن است باعث قطع شدن فرآیند تولید شود.
                </div>
            </div>
            <button class="page-warning-close" onclick="closePageWarningNotification()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(warningNotification);
    
    // Auto remove after 15 seconds
    setTimeout(() => {
        if (warningNotification.parentElement) {
            closePageWarningNotification();
        }
    }, 15000);
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


// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('AI Video Maker initialized');
    loadAvailableVoices();
    
    // Add beforeunload event listener to warn users about leaving during generation
    let isGenerating = false;
    
    // Track generation state
    const originalGenerateImages = generateImages;
    const originalGenerateCompleteVideo = generateCompleteVideo;
    
    generateImages = async function() {
        isGenerating = true;
        try {
            await originalGenerateImages.call(this);
        } finally {
            isGenerating = false;
        }
    };
    
    generateCompleteVideo = async function() {
        isGenerating = true;
        try {
            await originalGenerateCompleteVideo.call(this);
        } finally {
            isGenerating = false;
        }
    };
    
    window.addEventListener('beforeunload', (event) => {
        if (isGenerating) {
            const message = 'آیا مطمئن هستید که می‌خواهید صفحه را ترک کنید؟ فرآیند تولید ویدیو ممکن است قطع شود.';
            event.preventDefault();
            event.returnValue = message;
            return message;
        }
    });
});

