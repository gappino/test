// Socket.io connection
const socket = io();

// DOM Elements for Long Form Video
const longFormUserIdea = document.getElementById('longFormUserIdea');
const videoLength = document.getElementById('videoLength');
const generateLongFormScriptBtn = document.getElementById('generateLongFormScriptBtn');
const longFormLoadingSection = document.getElementById('longFormLoadingSection');
const longFormScriptSection = document.getElementById('longFormScriptSection');
const longFormScriptContent = document.getElementById('longFormScriptContent');
const scriptStats = document.getElementById('scriptStats');
const generateLongFormImagesBtn = document.getElementById('generateLongFormImagesBtn');
const longFormImageProgressSection = document.getElementById('longFormImageProgressSection');
const longFormImageGenerationStatus = document.getElementById('longFormImageGenerationStatus');
const longFormImagesGallery = document.getElementById('longFormImagesGallery');
const longFormImagesContainer = document.getElementById('longFormImagesContainer');
const longFormProgressText = document.getElementById('longFormProgressText');
const longFormProgressFill = document.getElementById('longFormProgressFill');
const longFormVoiceSelect = document.getElementById('longFormVoiceSelect');
const generateLongFormCompleteVideoBtn = document.getElementById('generateLongFormCompleteVideoBtn');
const longFormVideoProgressSection = document.getElementById('longFormVideoProgressSection');
const longFormVideoGenerationStatus = document.getElementById('longFormVideoGenerationStatus');
const longFormVideoProgressText = document.getElementById('longFormVideoProgressText');
const longFormVideoProgressFill = document.getElementById('longFormVideoProgressFill');
const longFormCurrentStepText = document.getElementById('longFormCurrentStepText');
const longFormEstimatedTime = document.getElementById('longFormEstimatedTime');
const longFormVideoSection = document.getElementById('longFormVideoSection');
const longFormVideoContainer = document.getElementById('longFormVideoContainer');

// Global variables
let longFormCurrentScript = null;
let longFormImagePrompts = [];
let longFormGeneratedImages = [];
let longFormCurrentVideoId = null; // Track current video ID
let longFormCurrentUserIdea = '';

// Load background music options for long form
async function loadLongFormBackgroundMusic() {
    try {
        console.log('🎵 Loading long form background music options...');
        const response = await fetch('/api/music/list');
        const data = await response.json();
        
        console.log('🎵 Long form API response:', data);
        
        if (data.success) {
            const backgroundMusicSelect = document.getElementById('longFormBackgroundMusic');
            console.log('🎵 longFormBackgroundMusic element:', backgroundMusicSelect);
            
            if (backgroundMusicSelect) {
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
                
                console.log('✅ Long form background music options loaded:', data.music.length);
            } else {
                console.error('❌ longFormBackgroundMusic element not found');
            }
        } else {
            console.error('❌ Failed to load long form background music:', data);
        }
    } catch (error) {
        console.error('❌ Error loading long form background music:', error);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for the DOM to be fully loaded
    setTimeout(() => {
        loadLongFormBackgroundMusic();
    }, 100);
});

// Event Listeners
generateLongFormScriptBtn.addEventListener('click', generateLongFormScript);
generateLongFormImagesBtn.addEventListener('click', generateLongFormImages);
generateLongFormCompleteVideoBtn.addEventListener('click', () => generateLongFormCompleteVideo(longFormCurrentVideoId));

// Generate long form script
async function generateLongFormScript() {
    const ideaText = longFormUserIdea.value.trim();
    const selectedLength = parseInt(videoLength.value);
    
    if (!ideaText) {
        alert('لطفاً ایده خود را وارد کنید');
        return;
    }
    
    try {
        // Show loading state
        generateLongFormScriptBtn.disabled = true;
        generateLongFormScriptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تولید اسکریپت طولانی...';
        longFormLoadingSection.classList.remove('hidden');
        
        longFormCurrentUserIdea = ideaText;
        
        const response = await fetch('/api/gemini/generate-long-form-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userIdea: ideaText,
                sceneCount: selectedLength
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            longFormCurrentScript = result.data;
            displayLongFormScript(longFormCurrentScript);
            
            // Show script section
            longFormScriptSection.classList.remove('hidden');
            longFormScriptSection.classList.add('fade-in');
            
            // Scroll to script section
            longFormScriptSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error(result.error || 'خطا در تولید اسکریپت طولانی');
        }
        
    } catch (error) {
        console.error('Error generating long form script:', error);
        alert('خطا در تولید اسکریپت طولانی: ' + error.message);
    } finally {
        // Reset button state
        generateLongFormScriptBtn.disabled = false;
        generateLongFormScriptBtn.innerHTML = '<i class="fas fa-magic"></i> تولید اسکریپت طولانی';
        longFormLoadingSection.classList.add('hidden');
    }
}

// Display long form script
function displayLongFormScript(script) {
    const totalScenes = script.scenes.length;
    const totalWords = script.scenes.reduce((sum, scene) => {
        return sum + (scene.speaker_text.split(' ').length);
    }, 0);
    const avgWordsPerScene = Math.round(totalWords / totalScenes);
    
    scriptStats.textContent = `${totalScenes} صحنه | ${totalWords} کلمه | میانگین ${avgWordsPerScene} کلمه در هر صحنه`;
    
    const html = `
        <div class="script-content">
            <h3 class="script-title">${script.title}</h3>
            <p class="script-description">${script.description}</p>
            <div class="script-editing-info">
                <i class="fas fa-edit"></i>
                <span>می‌توانید متن گوینده و پرامپت تصویر هر صحنه را ویرایش کنید</span>
            </div>
            <ul class="scenes-list long-form-scenes">
                ${script.scenes.map((scene, index) => `
                    <li class="scene-item editable-scene long-form-scene">
                        <div class="scene-header">
                            <span class="scene-number">صحنه ${scene.scene_number}</span>
                            <span class="scene-duration">${scene.duration}</span>
                            <span class="scene-word-count">${scene.speaker_text.split(' ').length} کلمه</span>
                            <button class="btn-edit-scene" onclick="toggleLongFormSceneEdit(${index})">
                                <i class="fas fa-edit"></i> ویرایش
                            </button>
                        </div>
                        <div class="scene-content">
                            <div class="scene-text-display" id="long-form-scene-text-${index}">
                                <strong>متن گوینده:</strong>
                                <p>${scene.speaker_text}</p>
                            </div>
                            <div class="scene-visual-display" id="long-form-scene-visual-${index}">
                                <strong>پرامپت تصویر:</strong>
                                <p>${scene.visual_description}</p>
                            </div>
                            <div class="scene-edit-form hidden" id="long-form-scene-edit-${index}">
                                <div class="form-group">
                                    <label>متن گوینده:</label>
                                    <textarea class="form-control scene-speaker-edit" rows="4" data-scene="${index}">${scene.speaker_text}</textarea>
                                </div>
                                <div class="form-group">
                                    <label>پرامپت تصویر:</label>
                                    <textarea class="form-control scene-visual-edit" rows="3" data-scene="${index}">${scene.visual_description}</textarea>
                                </div>
                                <div class="scene-edit-actions">
                                    <button class="btn btn-success btn-small" onclick="saveLongFormSceneEdit(${index})">
                                        <i class="fas fa-save"></i> ذخیره
                                    </button>
                                    <button class="btn btn-secondary btn-small" onclick="cancelLongFormSceneEdit(${index})">
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
    
    longFormScriptContent.innerHTML = html;
}

// Generate horizontal images for long form video
async function generateLongFormImages() {
    if (!longFormCurrentScript || !longFormCurrentScript.scenes) {
        alert('ابتدا اسکریپت طولانی را تولید کنید');
        return;
    }
    
    try {
        // Create video tracking entry for image generation
        const videoId = `long-form-video-${Date.now()}`;
        longFormCurrentVideoId = videoId; // Store for later use
        const trackingData = {
            id: videoId,
            title: longFormCurrentScript.title || 'ویدیو طولانی',
            status: 'processing',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: 0,
            currentStep: 'تولید تصاویر',
            steps: [
                { name: 'در صف انتظار', status: 'completed', timestamp: new Date().toISOString() },
                { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
                { name: 'تولید تصاویر', status: 'active', timestamp: new Date().toISOString() },
                { name: 'تولید صدا', status: 'pending', timestamp: null },
                { name: 'ترکیب ویدیو', status: 'pending', timestamp: null },
                { name: 'آماده', status: 'pending', timestamp: null }
            ],
            metadata: {
                scenes: longFormCurrentScript.scenes,
                voice: longFormVoiceSelect.value,
                orientation: 'horizontal',
                duration: null,
                fileSize: null,
                videoUrl: null,
                errorMessage: null,
                subtitleSettings: {
                    color: '#ffffff',
                    size: 24,
                    outline: 2
                }
            }
        };

        // Add to video tracking
        await addVideoToTracking(trackingData);
        
        // Show notification that tracking is active
        showLongFormNotification('🎯 سیستم ترکینگ فعال شد! می‌توانید از صفحه خارج شوید و پیشرفت را در تاریخچه ویدیوها دنبال کنید.', 'info');

        generateLongFormImagesBtn.disabled = true;
        generateLongFormImagesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تولید ویدیو کامل در backend...';
        
        // Show progress section
        longFormImageProgressSection.classList.remove('hidden');
        longFormImageProgressSection.classList.add('fade-in');
        
        // Reset progress
        longFormImagePrompts = [];
        longFormGeneratedImages = [];
        updateLongFormProgress(0, longFormCurrentScript.scenes.length);
        
        // Get background music selection
        const backgroundMusicElement = document.getElementById('longFormBackgroundMusic');
        const backgroundMusic = backgroundMusicElement ? backgroundMusicElement.value : '';
        console.log('🎵 Long form background music selected:', backgroundMusic);
        
        // Call backend to generate complete video (images + video)
        const completeResponse = await fetch('/api/video/generate-long-form-complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                script: longFormCurrentScript,
                videoId: videoId,
                voice: longFormVoiceSelect.value,
                backgroundMusic: backgroundMusic
            })
        });
        
        const completeResult = await completeResponse.json();
        
        if (completeResult.success) {
            console.log('✅ Complete video generated successfully');
            
            // Store generated images for display
            longFormGeneratedImages = completeResult.data.images || [];
            
            // Display all generated images
            longFormGeneratedImages.forEach((imageData, index) => {
                addLongFormStatusItem(index, 'completed', 'تصویر افقی تولید شد', imageData.scene.speaker_text);
                displayLongFormGeneratedImage(index, imageData.imageUrl, imageData.scene);
            });
            
            // Show images gallery
            longFormImagesGallery.classList.remove('hidden');
            longFormImagesGallery.classList.add('fade-in');
            
            // Show tracking link
            const trackingLink = document.getElementById('trackingLink');
            if (trackingLink) {
                trackingLink.classList.remove('hidden');
            }
            
            // Show queue status
            const queueStatusSection = document.getElementById('queueStatusSection');
            if (queueStatusSection) {
                queueStatusSection.classList.remove('hidden');
                queueStatusSection.classList.add('fade-in');
                await checkQueueStatus();
            }
            
            // Show success notification
            showLongFormNotification('🎉 ویدیو طولانی با موفقیت تولید شد! ویدیو در پایین صفحه نمایش داده شد.', 'success');
            
            // Display the final video
            if (completeResult.data.video_url) {
                displayLongFormFinalVideo(completeResult.data);
            }
            
        } else {
            throw new Error(completeResult.error || 'خطا در تولید ویدیو کامل');
        }
        
    } catch (error) {
        console.error('Error generating long form images:', error);
        
        // Update tracking to error status
        await updateVideoTracking(videoId, {
            status: 'error',
            progress: 0,
            currentStep: 'خطا در تولید تصاویر',
            steps: [
                { name: 'در صف انتظار', status: 'completed', timestamp: null },
                { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
                { name: 'تولید تصاویر', status: 'error', timestamp: new Date().toISOString() },
                { name: 'تولید صدا', status: 'pending', timestamp: null },
                { name: 'ترکیب ویدیو', status: 'pending', timestamp: null },
                { name: 'آماده', status: 'pending', timestamp: null }
            ],
            metadata: {
                errorMessage: error.message
            }
        });
        
        alert('خطا در تولید تصاویر افقی: ' + error.message);
    } finally {
        generateLongFormImagesBtn.disabled = false;
        generateLongFormImagesBtn.innerHTML = '<i class="fas fa-arrow-right"></i> شروع تولید کامل';
        
        // Hide the complete video button since it's now automatic
        generateLongFormCompleteVideoBtn.classList.add('hidden');
    }
}

// Add status item for long form image generation
function addLongFormStatusItem(index, status, statusText, sceneText) {
    const statusItem = document.createElement('div');
    statusItem.className = `status-item ${status}`;
    statusItem.id = `long-form-status-${index}`;
    
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
    
    longFormImageGenerationStatus.appendChild(statusItem);
}

// Update status item for long form
function updateLongFormStatusItem(index, status, statusText, sceneText) {
    const statusItem = document.getElementById(`long-form-status-${index}`);
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

// Update progress bar for long form
function updateLongFormProgress(current, total) {
    const percentage = (current / total) * 100;
    longFormProgressFill.style.width = `${percentage}%`;
    longFormProgressText.textContent = `${current} از ${total} تصویر افقی`;
}

// Display generated horizontal image
function displayLongFormGeneratedImage(index, imageUrl, scene) {
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item fade-in horizontal-image-item';
    
    imageItem.innerHTML = `
        <div class="image-preview horizontal-preview">
            <img src="${imageUrl}" alt="Generated Horizontal Image ${index + 1}" 
                 onerror="this.parentElement.innerHTML='<i class=\\"fas fa-image\\"></i> خطا در بارگذاری تصویر'">
        </div>
        <div class="image-info">
            <h4>صحنه ${index + 1}</h4>
            <p>${scene.speaker_text}</p>
            <small>تصویر افقی</small>
        </div>
    `;
    
    longFormImagesContainer.appendChild(imageItem);
}

// Display final video
function displayLongFormFinalVideo(videoData) {
    console.log('🎬 Displaying final video:', videoData);
    
    // Clear previous video content
    longFormVideoContainer.innerHTML = '';
    
    // Create video element
    const videoElement = document.createElement('video');
    videoElement.controls = true;
    videoElement.style.width = '100%';
    videoElement.style.maxWidth = '800px';
    videoElement.style.borderRadius = '8px';
    videoElement.src = videoData.video_url;
    
    // Create video info
    const videoInfo = document.createElement('div');
    videoInfo.className = 'video-info';
    videoInfo.innerHTML = `
        <h3>ویدیو طولانی تولید شده</h3>
        <p><strong>مدت زمان:</strong> ${videoData.duration} ثانیه</p>
        <p><strong>تعداد صحنه‌ها:</strong> ${videoData.scenes_count}</p>
        <p><strong>رزولوشن:</strong> ${videoData.resolution}</p>
        <div class="video-actions">
            <a href="${videoData.video_url}" download class="btn btn-primary">
                <i class="fas fa-download"></i> دانلود ویدیو
            </a>
        </div>
    `;
    
    // Add video and info to container
    longFormVideoContainer.appendChild(videoElement);
    longFormVideoContainer.appendChild(videoInfo);
    
    // Show video section
    longFormVideoSection.classList.remove('hidden');
    longFormVideoSection.classList.add('fade-in');
    
    // Scroll to video section
    setTimeout(() => {
        longFormVideoSection.scrollIntoView({ behavior: 'smooth' });
    }, 500);
}

// Generate complete long form video
async function generateLongFormCompleteVideo(existingVideoId = null) {
    try {
        console.log('🎬 generateLongFormCompleteVideo called with videoId:', existingVideoId);
        console.log('📊 Script exists:', !!longFormCurrentScript);
        console.log('📊 Images count:', longFormGeneratedImages.length);
        
        console.log('📊 Checking conditions:');
        console.log('📊 longFormCurrentScript exists:', !!longFormCurrentScript);
        console.log('📊 longFormGeneratedImages.length:', longFormGeneratedImages.length);
        console.log('📊 longFormGeneratedImages content:', longFormGeneratedImages);
        
        if (!longFormCurrentScript || !longFormGeneratedImages.length) {
            console.error('❌ Missing script or images - cannot proceed');
            alert('ابتدا اسکریپت و تصاویر را تولید کنید');
            return;
        }

        // Use existing videoId or create new one
        const videoId = existingVideoId || `long-form-video-${Date.now()}`;
        longFormCurrentVideoId = videoId; // Store for later use
        
        console.log('📊 Video ID:', videoId);
        console.log('📊 Generated images available:', longFormGeneratedImages.length);
        
        // If no existing videoId, create tracking entry
        if (!existingVideoId) {
            const trackingData = {
                id: videoId,
                title: longFormCurrentScript.title || 'ویدیو طولانی',
                status: 'processing',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                progress: 30,
                currentStep: 'تولید صدا',
                steps: [
                    { name: 'در صف انتظار', status: 'completed', timestamp: null },
                    { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
                    { name: 'تولید تصاویر', status: 'completed', timestamp: null },
                    { name: 'تولید صدا', status: 'active', timestamp: new Date().toISOString() },
                    { name: 'ترکیب ویدیو', status: 'pending', timestamp: null },
                    { name: 'آماده', status: 'pending', timestamp: null }
                ],
                metadata: {
                    scenes: longFormCurrentScript.scenes,
                    voice: longFormVoiceSelect.value,
                    orientation: 'horizontal',
                    duration: null,
                    fileSize: null,
                    videoUrl: null,
                    errorMessage: null,
                    subtitleSettings: {
                        color: '#ffffff',
                        size: 24,
                        outline: 2
                    }
                }
            };

            // Add to video tracking
            await addVideoToTracking(trackingData);
        } else {
            // Update existing tracking to show we're starting video generation
            await updateVideoTracking(videoId, {
                progress: 30,
                currentStep: 'تولید صدا',
                steps: [
                    { name: 'در صف انتظار', status: 'completed', timestamp: null },
                    { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
                    { name: 'تولید تصاویر', status: 'completed', timestamp: null },
                    { name: 'تولید صدا', status: 'active', timestamp: new Date().toISOString() },
                    { name: 'ترکیب ویدیو', status: 'pending', timestamp: null },
                    { name: 'آماده', status: 'pending', timestamp: null }
                ]
            });
        }

        // Show loading state
        generateLongFormCompleteVideoBtn.disabled = true;
        generateLongFormCompleteVideoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تولید ویدیو طولانی...';
        
        // Show video progress section
        longFormVideoProgressSection.classList.remove('hidden');
        longFormVideoProgressSection.classList.add('fade-in');
        
        // Reset progress
        updateLongFormVideoProgress(0, 4);
        
        // Step 1: Prepare audio settings
        addLongFormVideoStatusItem(0, 'processing', 'آماده‌سازی تنظیمات صدا...', '');
        
        const backgroundMusicElement = document.getElementById('longFormBackgroundMusic');
        console.log('🎵 Background music element:', backgroundMusicElement);
        console.log('🎵 Background music element value:', backgroundMusicElement ? backgroundMusicElement.value : 'null');
        console.log('🎵 Background music element selectedIndex:', backgroundMusicElement ? backgroundMusicElement.selectedIndex : 'null');
        console.log('🎵 Background music element options:', backgroundMusicElement ? backgroundMusicElement.options : 'null');
        
        const audioSettings = {
            voice: longFormVoiceSelect.value,
            backgroundMusic: backgroundMusicElement ? backgroundMusicElement.value : ''
        };
        console.log('🎵 Long form audio settings:', audioSettings);
        console.log('🎵 Long form background music selected:', audioSettings.backgroundMusic);
        updateLongFormVideoStatusItem(0, 'completed', 'تنظیمات صدا آماده شد', '');
        updateLongFormVideoProgress(1, 4);
        
        // Update tracking - Step 2: Generate TTS
        await updateVideoTracking(videoId, {
            progress: 25,
            currentStep: 'تولید صدا',
            steps: [
                { name: 'در صف انتظار', status: 'completed', timestamp: null },
                { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
                { name: 'تولید تصاویر', status: 'completed', timestamp: null },
                { name: 'تولید صدا', status: 'active', timestamp: new Date().toISOString() },
                { name: 'ترکیب ویدیو', status: 'pending', timestamp: null },
                { name: 'آماده', status: 'pending', timestamp: null }
            ]
        });

        // Step 2: Generate TTS for all scenes
        addLongFormVideoStatusItem(1, 'processing', 'تولید صدا برای صحنه‌های طولانی...', '');
        const ttsPromises = longFormCurrentScript.scenes.map(async (scene, index) => {
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
        updateLongFormVideoStatusItem(1, 'completed', 'صدا برای تمام صحنه‌های طولانی تولید شد', '');
        
        // Update tracking - Step 3: Video composition
        await updateVideoTracking(videoId, {
            progress: 50,
            currentStep: 'ترکیب ویدیو',
            steps: [
                { name: 'در صف انتظار', status: 'completed', timestamp: null },
                { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
                { name: 'تولید تصاویر', status: 'completed', timestamp: null },
                { name: 'تولید صدا', status: 'completed', timestamp: new Date().toISOString() },
                { name: 'ترکیب ویدیو', status: 'active', timestamp: new Date().toISOString() },
                { name: 'آماده', status: 'pending', timestamp: null }
            ]
        });
        
        updateLongFormVideoProgress(2, 4);
        
        // Step 3: Prepare video composition
        addLongFormVideoStatusItem(2, 'processing', 'آماده‌سازی ترکیب ویدیو طولانی...', '');
        const videoData = {
            script: longFormCurrentScript,
            images: longFormGeneratedImages,
            audioSettings: audioSettings,
            videoType: 'long-form'
        };
        updateLongFormVideoStatusItem(2, 'completed', 'ترکیب ویدیو طولانی آماده شد', '');
        updateLongFormVideoProgress(3, 4);
        
        // Step 4: Generate final long form video
        addLongFormVideoStatusItem(3, 'processing', 'تولید ویدیو طولانی نهایی...', '');
        
        const completeVideoData = {
            script: longFormCurrentScript,
            images: longFormGeneratedImages,
            audioSettings: audioSettings,
            audioResults: audioResults,
            videoType: 'long-form',
            videoId: videoId
        };
        
        console.log('🎵 Long form complete video data:', completeVideoData);
        console.log('🎵 Long form background music in completeVideoData:', completeVideoData.audioSettings.backgroundMusic);
        console.log('🎵 Long form audioSettings type:', typeof completeVideoData.audioSettings);
        console.log('🎵 Long form audioSettings keys:', Object.keys(completeVideoData.audioSettings));
        
        const videoResponse = await fetch('/api/video/generate-long-form-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(completeVideoData)
        });
        
        const videoResult = await videoResponse.json();
        
        if (videoResult.success) {
            updateLongFormVideoStatusItem(3, 'completed', 'ویدیو طولانی با موفقیت تولید شد', '');
            updateLongFormVideoProgress(4, 4);
            
            // Update tracking - Video completed
            await updateVideoTracking(videoId, {
                status: 'completed',
                progress: 100,
                currentStep: 'آماده',
                steps: [
                    { name: 'در صف انتظار', status: 'completed', timestamp: null },
                    { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
                    { name: 'تولید تصاویر', status: 'completed', timestamp: null },
                    { name: 'تولید صدا', status: 'completed', timestamp: null },
                    { name: 'ترکیب ویدیو', status: 'completed', timestamp: new Date().toISOString() },
                    { name: 'آماده', status: 'completed', timestamp: new Date().toISOString() }
                ],
                metadata: {
                    ...trackingData.metadata,
                    videoUrl: videoResult.data.video_url,
                    duration: videoResult.data.duration,
                    fileSize: videoResult.data.fileSize || null
                }
            });
            
            // Log video data for debugging
            console.log('🎬 Long form video generated successfully:', videoResult.data);
            
            // Display final video
            displayLongFormGeneratedVideo(videoResult.data);
            
            // Ensure video section is visible
            if (longFormVideoSection) {
                longFormVideoSection.classList.remove('hidden');
                longFormVideoSection.classList.add('fade-in');
                
                // Scroll to video section after a short delay
                setTimeout(() => {
                    longFormVideoSection.scrollIntoView({ behavior: 'smooth' });
                }, 500);
            } else {
                console.error('❌ Long form video section not found');
            }
            
            // Show success notification
            showLongFormNotification('🎉 ویدیو طولانی با موفقیت تولید شد! ویدیو در پایین صفحه نمایش داده شد.', 'success');
        } else {
            throw new Error(videoResult.error || 'خطا در تولید ویدیو طولانی');
        }
        
    } catch (error) {
        console.error('Error generating long form video:', error);
        
        // Update tracking to error status
        await updateVideoTracking(videoId, {
            status: 'error',
            progress: 0,
            currentStep: 'خطا در تولید',
            steps: [
                { name: 'در صف انتظار', status: 'completed', timestamp: null },
                { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
                { name: 'تولید تصاویر', status: 'completed', timestamp: null },
                { name: 'تولید صدا', status: 'pending', timestamp: null },
                { name: 'ترکیب ویدیو', status: 'error', timestamp: new Date().toISOString() },
                { name: 'آماده', status: 'pending', timestamp: null }
            ],
            metadata: {
                ...trackingData.metadata,
                errorMessage: error.message
            }
        });
        
        alert('خطا در تولید ویدیو طولانی: ' + error.message);
    } finally {
        generateLongFormCompleteVideoBtn.disabled = false;
        generateLongFormCompleteVideoBtn.innerHTML = '<i class="fas fa-video"></i> تولید ویدیو طولانی کامل';
    }
}

// Add video status item for long form
function addLongFormVideoStatusItem(index, status, statusText, description) {
    const statusItem = document.createElement('div');
    statusItem.className = `video-status-item ${status}`;
    statusItem.id = `long-form-video-status-${index}`;
    
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
    
    longFormVideoGenerationStatus.appendChild(statusItem);
}

// Update video status item for long form
function updateLongFormVideoStatusItem(index, status, statusText, description) {
    const statusItem = document.getElementById(`long-form-video-status-${index}`);
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

// Update video progress bar for long form
function updateLongFormVideoProgress(current, total) {
    const percentage = (current / total) * 100;
    longFormVideoProgressFill.style.width = `${percentage}%`;
    longFormVideoProgressText.textContent = `${current} از ${total} مرحله`;
    
    // Update step indicators
    updateLongFormProgressSteps(current);
    
    // Update current step text
    updateLongFormCurrentStepText(current);
    
    // Update estimated time
    updateLongFormEstimatedTime(current, total);
}

// Update progress step indicators for long form
function updateLongFormProgressSteps(currentStep) {
    const steps = document.querySelectorAll('#longFormVideoProgressSection .progress-step');
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

// Update current step text for long form
function updateLongFormCurrentStepText(currentStep) {
    const stepTexts = [
        'آماده‌سازی',
        'تولید صدا',
        'ترکیب تصاویر',
        'تولید نهایی'
    ];
    
    if (longFormCurrentStepText && stepTexts[currentStep - 1]) {
        longFormCurrentStepText.textContent = stepTexts[currentStep - 1];
    }
}

// Update estimated time for long form
function updateLongFormEstimatedTime(current, total) {
    if (longFormEstimatedTime) {
        const remainingSteps = total - current;
        const estimatedSeconds = remainingSteps * 20; // Assume 20 seconds per step for long form
        
        if (remainingSteps === 0) {
            longFormEstimatedTime.textContent = 'تقریباً تمام شد';
        } else if (estimatedSeconds < 60) {
            longFormEstimatedTime.textContent = `تقریباً ${estimatedSeconds} ثانیه`;
        } else {
            const minutes = Math.ceil(estimatedSeconds / 60);
            longFormEstimatedTime.textContent = `تقریباً ${minutes} دقیقه`;
        }
    }
}

// Display generated long form video
function displayLongFormGeneratedVideo(videoData) {
    console.log('🎬 Displaying long form video:', videoData);
    
    // Clear previous content
    longFormVideoContainer.innerHTML = '';
    
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item fade-in long-form-video-item';
    
    // Ensure we have a valid video URL
    const videoUrl = videoData.video_url || videoData.videoUrl || videoData.url;
    if (!videoUrl) {
        console.error('❌ No video URL found in video data:', videoData);
        longFormVideoContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>خطا در نمایش ویدیو</h4>
                <p>آدرس ویدیو یافت نشد. ویدیو ممکن است در بخش تاریخچه ویدیوها موجود باشد.</p>
            </div>
        `;
        return;
    }
    
    videoItem.innerHTML = `
        <div class="video-player-container">
            <video controls class="video-player" style="width: 100%; max-width: 800px; border-radius: 10px;">
                <source src="${videoUrl}" type="video/mp4">
                مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
            </video>
        </div>
        <div class="video-info">
            <h4><i class="fas fa-video"></i> ویدیو طولانی تولید شده</h4>
            <div class="video-details">
                <p><strong>مدت زمان:</strong> ${videoData.duration || 'نامشخص'} ثانیه</p>
                <p><strong>تعداد صحنه‌ها:</strong> ${videoData.scenes_count || longFormCurrentScript?.scenes?.length || 'نامشخص'}</p>
                <p><strong>رزولوشن:</strong> ${videoData.resolution || '1920x1080'}</p>
                <p><strong>وضعیت:</strong> ${videoData.status || 'تکمیل شده'}</p>
                <p><strong>ویژگی‌ها:</strong> ویدیو طولانی، تصاویر افقی، زیرنویس خودکار</p>
                <div class="video-actions">
                    <button onclick="window.location.href='/video-history.html'" class="btn btn-primary">
                        <i class="fas fa-history"></i> بخش تاریخچه ویدیوها
                    </button>
                </div>
            </div>
        </div>
    `;
    
    longFormVideoContainer.appendChild(videoItem);
    
    // Log success
    console.log('✅ Long form video displayed successfully');
}

// Scene editing functions for long form
function toggleLongFormSceneEdit(sceneIndex) {
    const editForm = document.getElementById(`long-form-scene-edit-${sceneIndex}`);
    const textDisplay = document.getElementById(`long-form-scene-text-${sceneIndex}`);
    const visualDisplay = document.getElementById(`long-form-scene-visual-${sceneIndex}`);
    const editBtn = document.querySelector(`[onclick="toggleLongFormSceneEdit(${sceneIndex})"]`);
    
    if (editForm.classList.contains('hidden')) {
        // Show edit form
        editForm.classList.remove('hidden');
        textDisplay.classList.add('hidden');
        visualDisplay.classList.add('hidden');
        editBtn.innerHTML = '<i class="fas fa-times"></i> لغو ویرایش';
        editBtn.onclick = () => cancelLongFormSceneEdit(sceneIndex);
    } else {
        // Hide edit form
        editForm.classList.add('hidden');
        textDisplay.classList.remove('hidden');
        visualDisplay.classList.remove('hidden');
        editBtn.innerHTML = '<i class="fas fa-edit"></i> ویرایش';
        editBtn.onclick = () => toggleLongFormSceneEdit(sceneIndex);
    }
}

function saveLongFormSceneEdit(sceneIndex) {
    const speakerText = document.querySelector(`.scene-speaker-edit[data-scene="${sceneIndex}"]`).value;
    const visualDescription = document.querySelector(`.scene-visual-edit[data-scene="${sceneIndex}"]`).value;
    
    // Update current script
    if (longFormCurrentScript && longFormCurrentScript.scenes && longFormCurrentScript.scenes[sceneIndex]) {
        longFormCurrentScript.scenes[sceneIndex].speaker_text = speakerText;
        longFormCurrentScript.scenes[sceneIndex].visual_description = visualDescription;
    }
    
    // Update display
    const textDisplay = document.getElementById(`long-form-scene-text-${sceneIndex}`);
    const visualDisplay = document.getElementById(`long-form-scene-visual-${sceneIndex}`);
    
    textDisplay.querySelector('p').textContent = speakerText;
    visualDisplay.querySelector('p').textContent = visualDescription;
    
    // Hide edit form
    toggleLongFormSceneEdit(sceneIndex);
    
    // Show success message
    showLongFormNotification('تغییرات با موفقیت ذخیره شد و در تولید تصاویر اعمال خواهد شد', 'success');
}

function cancelLongFormSceneEdit(sceneIndex) {
    // Reset form values to original
    const speakerText = longFormCurrentScript.scenes[sceneIndex].speaker_text;
    const visualDescription = longFormCurrentScript.scenes[sceneIndex].visual_description;
    
    document.querySelector(`.scene-speaker-edit[data-scene="${sceneIndex}"]`).value = speakerText;
    document.querySelector(`.scene-visual-edit[data-scene="${sceneIndex}"]`).value = visualDescription;
    
    // Hide edit form
    toggleLongFormSceneEdit(sceneIndex);
}



// Notification system for long form
function showLongFormNotification(message, type = 'info') {
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


// Check queue status
async function checkQueueStatus() {
    try {
        const response = await fetch('/api/video/queue-status');
        const result = await response.json();
        
        if (result.success) {
            const status = result.data;
            console.log('📊 Queue status:', status);
            
            // Update UI with queue information
            const queueInfo = document.getElementById('queueInfo');
            if (queueInfo) {
                queueInfo.innerHTML = `
                    <div class="queue-status">
                        <p><strong>کارهای فعال:</strong> ${status.activeTasks}/${status.maxConcurrent}</p>
                        <p><strong>کارهای در انتظار:</strong> ${status.queuedTasks}</p>
                        <p><strong>محدودیت منابع:</strong> ${status.resourceLimits.maxCpuCores} هسته CPU، ${status.resourceLimits.maxMemory / (1024*1024*1024)}GB RAM</p>
                    </div>
                `;
            }
            
            return status;
        }
    } catch (error) {
        console.log('⚠️ Could not get queue status:', error);
        const queueInfo = document.getElementById('queueInfo');
        if (queueInfo) {
            queueInfo.innerHTML = '<p>⚠️ خطا در دریافت وضعیت صف</p>';
        }
    }
}

// Video tracking functions
async function addVideoToTracking(trackingData) {
    try {
        const response = await fetch('/api/video-tracking/tracking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trackingData)
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('✅ Video tracking entry created:', trackingData.id);
        } else {
            console.error('❌ Failed to create video tracking entry:', result.error);
        }
    } catch (error) {
        console.error('❌ Error creating video tracking entry:', error);
    }
}

async function updateVideoTracking(videoId, updateData) {
    try {
        const response = await fetch(`/api/video-tracking/tracking/${videoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('✅ Video tracking updated:', videoId);
        } else {
            console.error('❌ Failed to update video tracking:', result.error);
        }
    } catch (error) {
        console.error('❌ Error updating video tracking:', error);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('Long Form Video Maker initialized');
});

