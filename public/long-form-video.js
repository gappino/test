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
let longFormCurrentUserIdea = '';

// Event Listeners
generateLongFormScriptBtn.addEventListener('click', generateLongFormScript);
generateLongFormImagesBtn.addEventListener('click', generateLongFormImages);
generateLongFormCompleteVideoBtn.addEventListener('click', generateLongFormCompleteVideo);

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
        generateLongFormImagesBtn.disabled = true;
        generateLongFormImagesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تولید تصاویر و ویدیو...';
        
        // Show progress section
        longFormImageProgressSection.classList.remove('hidden');
        longFormImageProgressSection.classList.add('fade-in');
        
        // Reset progress
        longFormImagePrompts = [];
        longFormGeneratedImages = [];
        updateLongFormProgress(0, longFormCurrentScript.scenes.length);
        
        // Generate horizontal images for each scene
        for (let i = 0; i < longFormCurrentScript.scenes.length; i++) {
            const scene = longFormCurrentScript.scenes[i];
            
            // Add status item with indication if using edited prompt
            const isEditedPrompt = scene.visual_description && scene.visual_description !== scene.image_prompt;
            const statusText = isEditedPrompt ? 'تولید تصویر افقی با پرامپت ویرایش شده...' : 'تولید تصویر افقی...';
            addLongFormStatusItem(i, 'generating', statusText, scene.speaker_text);
            
            try {
                // Modify image prompt for horizontal format
                const basePrompt = scene.visual_description || scene.image_prompt || 'A beautiful and engaging visual';
                const horizontalPrompt = `${basePrompt}, horizontal format, landscape orientation, wide aspect ratio`;
                
                // Log which prompt is being used for debugging
                console.log(`Long Form Scene ${i + 1} - Using prompt:`, basePrompt);
                console.log(`Long Form Scene ${i + 1} - Original image_prompt:`, scene.image_prompt);
                console.log(`Long Form Scene ${i + 1} - Edited visual_description:`, scene.visual_description);
                console.log(`Long Form Scene ${i + 1} - Final horizontal prompt:`, horizontalPrompt);
                
                longFormImagePrompts.push({
                    sceneIndex: i,
                    prompt: horizontalPrompt,
                    scene: scene
                });
                
                // Generate horizontal image using Pollinations.ai
                const imageResponse = await fetch('/api/flax/generate-horizontal-image-url', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt: horizontalPrompt,
                        width: 1920,
                        height: 1080
                    })
                });
                
                const imageResult = await imageResponse.json();
                
                if (imageResult.success) {
                    longFormGeneratedImages.push({
                        sceneIndex: i,
                        imageUrl: imageResult.data.image_url,
                        prompt: horizontalPrompt,
                        scene: {
                            ...scene,
                            orientation: 'horizontal'
                        }
                    });
                    
                    const completionText = isEditedPrompt ? 'تصویر افقی با پرامپت ویرایش شده تولید شد' : 'تصویر افقی تولید شد';
                    updateLongFormStatusItem(i, 'completed', completionText, scene.speaker_text);
                    displayLongFormGeneratedImage(i, imageResult.data.image_url, scene);
                    
                } else {
                    throw new Error(imageResult.error || 'خطا در تولید تصویر افقی');
                }
                
            } catch (error) {
                console.error(`Error processing scene ${i}:`, error);
                updateLongFormStatusItem(i, 'error', 'خطا در تولید', scene.speaker_text);
            }
            
            // Update progress
            updateLongFormProgress(i + 1, longFormCurrentScript.scenes.length);
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Show images gallery
        longFormImagesGallery.classList.remove('hidden');
        longFormImagesGallery.classList.add('fade-in');
        
        // Show complete video button
        generateLongFormCompleteVideoBtn.classList.remove('hidden');
        
        // Show queue status
        const queueStatusSection = document.getElementById('queueStatusSection');
        if (queueStatusSection) {
            queueStatusSection.classList.remove('hidden');
            queueStatusSection.classList.add('fade-in');
            await checkQueueStatus();
        }
        
        // Show notification for next step
        showLongFormNotification('تصاویر با موفقیت تولید شدند! در حال شروع تولید ویدیو...', 'success');
        
        // Automatically start video generation after a short delay
        setTimeout(() => {
            generateLongFormCompleteVideo();
        }, 2000); // 2 second delay to show the success message
        
    } catch (error) {
        console.error('Error generating long form images:', error);
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

// Generate complete long form video
async function generateLongFormCompleteVideo() {
    try {
        if (!longFormCurrentScript || !longFormGeneratedImages.length) {
            alert('ابتدا اسکریپت و تصاویر را تولید کنید');
            return;
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
        const audioSettings = {
            voice: longFormVoiceSelect.value
        };
        updateLongFormVideoStatusItem(0, 'completed', 'تنظیمات صدا آماده شد', '');
        updateLongFormVideoProgress(1, 4);
        
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
            videoType: 'long-form'
        };
        
        const videoResponse = await fetch('/api/video/generate-long-form-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(completeVideoData)
        });
        
        const videoResult = await videoResponse.json();
        
        if (videoResult.success) {
            updateLongFormVideoStatusItem(3, 'completed', 'ویدیو طولانی با موفقیت تولید شد', '');
            updateLongFormVideoProgress(4, 4);
            
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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('Long Form Video Maker initialized');
});

