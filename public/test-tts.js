// Test TTS functionality
const directTtsText = document.getElementById('directTtsText');
const directTtsVoice = document.getElementById('directTtsVoice');
const generateDirectTtsBtn = document.getElementById('generateDirectTtsBtn');
const directTtsResult = document.getElementById('directTtsResult');
const directTtsContainer = document.getElementById('directTtsContainer');
const directTtsLoading = document.getElementById('directTtsLoading');

// Voice comparison elements
const comparisonText = document.getElementById('comparisonText');
const compareVoicesBtn = document.getElementById('compareVoicesBtn');
const voiceComparisonLoading = document.getElementById('voiceComparisonLoading');
const voiceComparisonResult = document.getElementById('voiceComparisonResult');

// Available voices for comparison (curated selection)
const availableVoices = [
    // Persian voices (preserved)
    { id: 'fa_IR-amir-medium', name: 'امیر - صدای مرد فارسی', description: 'صدای طبیعی مرد فارسی' },
    { id: 'fa_IR-ganji-medium', name: 'گنجی - صدای مرد فارسی', description: 'صدای مرد فارسی با کیفیت بالا' },
    { id: 'fa_IR-ganji_adabi-medium', name: 'گنجی ادبی - صدای مرد فارسی', description: 'صدای ادبی مرد فارسی' },
    { id: 'fa_IR-gyro-medium', name: 'جیرو - صدای مرد فارسی', description: 'صدای مرد فارسی' },
    { id: 'fa_IR-reza_ibrahim-medium', name: 'رضا ابراهیم - صدای مرد فارسی', description: 'صدای مرد فارسی' },
    
    // English female voices (selected)
    { id: 'en_US-kristin-medium', name: 'Kristin Medium - صدای زن', description: 'صدای زن انگلیسی Kristin' },
    { id: 'en_US-lessac-high', name: 'Lessac High - صدای زن', description: 'صدای زن انگلیسی با کیفیت بالا' },
    
    // English male voices (selected)
    { id: 'en_US-john-medium', name: 'John Medium - صدای مرد', description: 'صدای مرد انگلیسی John' },
    { id: 'en_US-ryan-high', name: 'Ryan High - صدای مرد', description: 'صدای مرد انگلیسی با کیفیت بالا' },
    { id: 'en_US-norman-medium', name: 'Norman Medium - صدای مرد', description: 'صدای مرد انگلیسی Norman' },
    { id: 'en_US-kusal-medium', name: 'Kusal Medium - صدای مرد', description: 'صدای مرد انگلیسی Kusal' }
];

// Event listeners
generateDirectTtsBtn.addEventListener('click', generateDirectTTS);
compareVoicesBtn.addEventListener('click', compareAllVoices);

// Generate direct TTS
async function generateDirectTTS() {
    try {
        const text = directTtsText.value.trim();
        const voice = directTtsVoice.value;
        
        if (!text) {
            alert('لطفاً متنی برای تبدیل به صدا وارد کنید');
            return;
        }
        
        // Show loading state
        generateDirectTtsBtn.disabled = true;
        generateDirectTtsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تولید صدا...';
        directTtsLoading.classList.remove('hidden');
        
        // Call Kokoro TTS API
        const response = await fetch('/api/kokoro/text-to-speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                voice: voice
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Display the result
            displayDirectTTSResult(result.data);
            directTtsResult.classList.remove('hidden');
            directTtsResult.classList.add('fade-in');
        } else {
            alert('خطا در تولید صدا: ' + result.error);
        }
        
    } catch (error) {
        console.error('Error generating TTS:', error);
        alert('خطا در تولید صدا: ' + error.message);
    } finally {
        // Reset button state
        generateDirectTtsBtn.disabled = false;
        generateDirectTtsBtn.innerHTML = '<i class="fas fa-volume-up"></i> تبدیل به صدا';
        directTtsLoading.classList.add('hidden');
    }
}

// Display direct TTS result
function displayDirectTTSResult(audioData) {
    const audioItem = document.createElement('div');
    audioItem.className = 'tts-result-item';
    
    audioItem.innerHTML = `
        <div class="tts-info">
            <h4><i class="fas fa-microphone"></i> صدا تولید شده با کوکورو</h4>
            <div class="tts-details">
                <p><strong>متن:</strong> ${audioData.text}</p>
                <p><strong>مدل صدا:</strong> ${audioData.voice}</p>
                <p><strong>موتور:</strong> ${audioData.engine}</p>
                <p><strong>مدت زمان:</strong> ${audioData.duration.toFixed(1)} ثانیه</p>
                <p><strong>تعداد کلمات:</strong> ${audioData.words}</p>
                <p><strong>نرخ نمونه‌برداری:</strong> ${audioData.sample_rate} Hz</p>
            </div>
        </div>
        <div class="tts-controls">
            <audio controls class="tts-audio-player">
                <source src="${audioData.audio_url}" type="audio/wav">
                مرورگر شما از پخش صدا پشتیبانی نمی‌کند.
            </audio>
            <div class="tts-actions">
                <button class="btn btn-small btn-primary" onclick="playAudio('${audioData.audio_url}')">
                    <i class="fas fa-play"></i> پخش
                </button>
                <a href="${audioData.audio_url}" download class="btn btn-small btn-secondary">
                    <i class="fas fa-download"></i> دانلود
                </a>
            </div>
        </div>
    `;
    
    directTtsContainer.innerHTML = '';
    directTtsContainer.appendChild(audioItem);
}

// Compare all voices
async function compareAllVoices() {
    try {
        const text = comparisonText.value.trim();
        
        if (!text) {
            alert('لطفاً متنی برای مقایسه وارد کنید');
            return;
        }
        
        // Show loading state
        compareVoicesBtn.disabled = true;
        compareVoicesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال مقایسه...';
        voiceComparisonLoading.classList.remove('hidden');
        
        // Generate TTS for all voices
        const promises = availableVoices.map(async (voice) => {
            try {
                const response = await fetch('/api/kokoro/text-to-speech', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text: text,
                        voice: voice.id
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    return {
                        voice: voice,
                        audioData: result.data,
                        success: true
                    };
                } else {
                    return {
                        voice: voice,
                        error: result.error,
                        success: false
                    };
                }
            } catch (error) {
                return {
                    voice: voice,
                    error: error.message,
                    success: false
                };
            }
        });
        
        const results = await Promise.all(promises);
        
        // Display comparison results
        displayVoiceComparison(results);
        voiceComparisonResult.classList.remove('hidden');
        voiceComparisonResult.classList.add('fade-in');
        
    } catch (error) {
        console.error('Error comparing voices:', error);
        alert('خطا در مقایسه صداها: ' + error.message);
    } finally {
        // Reset button state
        compareVoicesBtn.disabled = false;
        compareVoicesBtn.innerHTML = '<i class="fas fa-balance-scale"></i> مقایسه همه صداها';
        voiceComparisonLoading.classList.add('hidden');
    }
}

// Display voice comparison results
function displayVoiceComparison(results) {
    const container = document.createElement('div');
    container.className = 'voice-comparison-grid';
    
    results.forEach((result, index) => {
        const voiceCard = document.createElement('div');
        voiceCard.className = 'voice-card';
        
        if (result.success) {
            voiceCard.innerHTML = `
                <div class="voice-card-header">
                    <h4>${result.voice.name}</h4>
                    <p>${result.voice.description}</p>
                </div>
                <div class="voice-card-body">
                    <div class="voice-stats">
                        <span><i class="fas fa-clock"></i> ${result.audioData.duration.toFixed(1)} ثانیه</span>
                        <span><i class="fas fa-file-word"></i> ${result.audioData.words} کلمه</span>
                    </div>
                    <audio controls class="voice-audio-player">
                        <source src="${result.audioData.audio_url}" type="audio/wav">
                    </audio>
                    <div class="voice-actions">
                        <button class="btn btn-small btn-primary" onclick="playAudio('${result.audioData.audio_url}')">
                            <i class="fas fa-play"></i> پخش
                        </button>
                        <a href="${result.audioData.audio_url}" download class="btn btn-small btn-secondary">
                            <i class="fas fa-download"></i> دانلود
                        </a>
                    </div>
                </div>
            `;
        } else {
            voiceCard.innerHTML = `
                <div class="voice-card-header">
                    <h4>${result.voice.name}</h4>
                    <p>${result.voice.description}</p>
                </div>
                <div class="voice-card-body error">
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>خطا در تولید صدا: ${result.error}</p>
                    </div>
                </div>
            `;
        }
        
        container.appendChild(voiceCard);
    });
    
    voiceComparisonResult.innerHTML = '';
    voiceComparisonResult.appendChild(container);
}

// Play audio function
function playAudio(audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(error => {
        console.error('Error playing audio:', error);
        alert('خطا در پخش صدا: ' + error.message);
    });
}

// Load available voices on page load
async function loadAvailableVoices() {
    try {
        // Try multiple API endpoints
        let response;
        let result;
        
        try {
            response = await fetch('/api/kokoro/voices');
            result = await response.json();
        } catch (error) {
            console.log('Kokoro API failed, trying whisper API...');
            response = await fetch('/api/whisper/voices');
            result = await response.json();
        }
        
        if (result.success && result.data && result.data.voices) {
            const voiceSelect = document.getElementById('directTtsVoice');
            voiceSelect.innerHTML = '';
            
            // Group voices by language
            const persianVoices = [];
            const englishVoices = [];
            
            result.data.voices.forEach(voice => {
                if (voice.language === 'فارسی' || voice.language === 'fa') {
                    persianVoices.push(voice);
                } else {
                    englishVoices.push(voice);
                }
            });
            
            // Add Persian voices
            if (persianVoices.length > 0) {
                const persianGroup = document.createElement('optgroup');
                persianGroup.label = '🎤 صداهای فارسی';
                persianVoices.forEach(voice => {
                    const option = document.createElement('option');
                    option.value = voice.id;
                    option.textContent = voice.name;
                    persianGroup.appendChild(option);
                });
                voiceSelect.appendChild(persianGroup);
            }
            
            // Add English voices
            if (englishVoices.length > 0) {
                const englishGroup = document.createElement('optgroup');
                englishGroup.label = '🌍 صداهای انگلیسی';
                englishVoices.forEach(voice => {
                    const option = document.createElement('option');
                    option.value = voice.id;
                    option.textContent = voice.name;
                    englishGroup.appendChild(option);
                });
                voiceSelect.appendChild(englishGroup);
            }
            
            console.log('Voices loaded successfully from API');
        } else {
            console.log('API failed, using static voice list');
            // Fallback to static list if API fails
            useStaticVoiceList();
        }
    } catch (error) {
        console.error('Error loading voices from API:', error);
        console.log('Using static voice list as fallback');
        useStaticVoiceList();
    }
}

// Fallback function to use static voice list
function useStaticVoiceList() {
    const voiceSelect = document.getElementById('directTtsVoice');
    // Keep the existing HTML structure as fallback
    console.log('Using static voice list from HTML');
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('TTS Test page initialized');
    loadAvailableVoices();
});
