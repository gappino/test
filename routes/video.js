const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const fsExtra = require('fs-extra');
const resourceManager = require('../resource-manager');
const ttsQueueManager = require('../tts-queue-manager');
const whisperQueueManager = require('../whisper-queue-manager');
const videoQueueManager = require('../video-queue-manager');
const { execSync } = require('child_process');

const TRACKING_FILE = path.join(__dirname, '../video-tracking.json');

// Function to detect available Python command
function getPythonCommand() {
  try {
    execSync('python3 --version', { stdio: 'ignore' });
    return 'python3';
  } catch (e) {
    try {
      execSync('python --version', { stdio: 'ignore' });
      return 'python';
    } catch (e2) {
      console.error('❌ Neither python3 nor python found in PATH');
      return 'python3'; // Default fallback
    }
  }
}

const PYTHON_CMD = getPythonCommand();
console.log(`🐍 Using Python command: ${PYTHON_CMD}`);

// Helper function to load tracking data
async function loadTrackingData() {
    try {
        if (await fsExtra.pathExists(TRACKING_FILE)) {
            const data = await fsExtra.readJson(TRACKING_FILE);
            return Array.isArray(data) ? data : [];
        }
    } catch (error) {
        console.error('Error loading tracking data:', error);
    }
    return [];
}

// Helper function to save tracking data
async function saveTrackingData(data) {
    try {
        await fsExtra.writeJson(TRACKING_FILE, data, { spaces: 2 });
        return true;
    } catch (error) {
        console.error('Error saving tracking data:', error);
        return false;
    }
}

// Helper function to update video tracking
async function updateVideoTracking(videoId, updateData) {
    try {
        const trackingData = await loadTrackingData();
        const videoIndex = trackingData.findIndex(video => video.id === videoId);
        
        if (videoIndex !== -1) {
            trackingData[videoIndex] = {
                ...trackingData[videoIndex],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            await saveTrackingData(trackingData);
            console.log('✅ Video tracking updated:', videoId);
        } else {
            console.log('⚠️ Video tracking entry not found:', videoId);
        }
    } catch (error) {
        console.error('❌ Error updating video tracking:', error);
    }
}

// Helper function to remove video from tracking
async function removeVideoFromTracking(videoId) {
    try {
        const trackingData = await loadTrackingData();
        const filteredData = trackingData.filter(video => video.id !== videoId);
        
        if (filteredData.length < trackingData.length) {
            await saveTrackingData(filteredData);
            console.log('✅ Video removed from tracking:', videoId);
        } else {
            console.log('ℹ️ Video not found in tracking:', videoId);
        }
    } catch (error) {
        console.error('❌ Error removing video from tracking:', error);
    }
}

// Generate Piper TTS directly
async function generatePiperTTS(text, voice) {
  const { spawn } = require('child_process');
  
  return new Promise((resolve) => {
    try {
      const timestamp = Date.now();
      const uniqueId = `${timestamp}-${Math.round(Math.random() * 1e9)}`;
      const outputDir = path.join(__dirname, '../uploads/audio');
      
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Run Piper TTS script
      const piperScript = path.join(__dirname, '..', 'piper_tts.py');
      
      console.log(`🐍 Running Piper TTS script: ${piperScript}`);
      console.log(`📝 Text: ${text}`);
      console.log(`🎤 Voice: ${voice}`);
      console.log(`📁 Output dir: ${outputDir}`);
      
      // Run Python script with proper arguments
      const args = [piperScript, text, voice, outputDir, uniqueId];
      console.log(`🐍 Command: ${PYTHON_CMD} ${args.join(' ')}`);
      
      const pythonProcess = spawn(PYTHON_CMD, args, {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false // Don't use shell to avoid argument parsing issues
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log('📄 Python stdout:', dataStr);
      });

      pythonProcess.stderr.on('data', (data) => {
        const stderrData = data.toString();
        console.log('📄 Python stderr:', stderrData);
        // Only log warnings, don't treat them as errors
        if (stderrData.includes('WARNING:')) {
          console.log('Python warning:', stderrData);
        } else {
          errorOutput += stderrData;
        }
      });

      pythonProcess.on('close', (code) => {
        try {
          console.log(`🐍 Python process exited with code: ${code}`);
          console.log(`📄 Python output:`, output);
          console.log(`❌ Python errors:`, errorOutput);
          
          // If Python fails or no output, create a fallback audio file
          if (code !== 0 || !output.trim() || !output.includes('{')) {
            console.log('⚠️ Python process failed or no JSON output, creating fallback audio...');
            console.log('📄 Raw output:', JSON.stringify(output));
            
            const fallbackAudioUrl = createFallbackAudio(text, voice, outputDir);
            
            resolve({
              success: true,
              data: {
                audio_url: fallbackAudioUrl,
                duration: 5,
                text: text,
                voice: voice,
                sample_rate: 16000,
                words: text.split(' ').length,
                file_size: 160000, // Approximate size
                engine: 'Fallback Audio Generator'
              }
            });
            return;
          }

          // Extract JSON from output (find the last line that starts with {)
          const lines = output.split('\n');
          let jsonLine = '';
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('{') && line.endsWith('}')) {
              jsonLine = line;
              break;
            }
          }

          console.log(`🔍 Extracted JSON line:`, jsonLine);

          if (!jsonLine) {
            console.log('⚠️ No JSON found, creating fallback audio...');
            
            const fallbackAudioUrl = createFallbackAudio(text, voice, outputDir);
            
            resolve({
              success: true,
              data: {
                audio_url: fallbackAudioUrl,
                duration: 5,
                text: text,
                voice: voice,
                sample_rate: 16000,
                words: text.split(' ').length,
                file_size: 160000,
                engine: 'Fallback Audio Generator'
              }
            });
            return;
          }

          // Parse the JSON output from Python script
          let result;
          try {
            result = JSON.parse(jsonLine);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.log('⚠️ JSON parse failed, creating fallback audio...');
            
            const fallbackAudioUrl = createFallbackAudio(text, voice, outputDir);
            
            resolve({
              success: true,
              data: {
                audio_url: fallbackAudioUrl,
                duration: 5,
                text: text,
                voice: voice,
                sample_rate: 16000,
                words: text.split(' ').length,
                file_size: 160000,
                engine: 'Fallback Audio Generator'
              }
            });
            return;
          }
          
          console.log(`✅ Parsed result:`, result);
          
          if (!result.success) {
            console.log('⚠️ Python result indicates failure, creating fallback audio...');
            
            const fallbackAudioUrl = createFallbackAudio(text, voice, outputDir);
            
            resolve({
              success: true,
              data: {
                audio_url: fallbackAudioUrl,
                duration: 5,
                text: text,
                voice: voice,
                sample_rate: 16000,
                words: text.split(' ').length,
                file_size: 160000,
                engine: 'Fallback Audio Generator'
              }
            });
            return;
          }

          // Convert file path to URL
          const audioFileName = path.basename(result.audio_file);
          const audioUrl = `/uploads/audio/${audioFileName}`;
          
          console.log(`🎵 Generated audio file: ${result.audio_file}`);
          console.log(`🔗 Audio URL: ${audioUrl}`);
          console.log(`📁 File exists: ${fs.existsSync(result.audio_file)}`);

          resolve({
            success: true,
            data: {
              audio_url: audioUrl,
              duration: result.duration,
              text: result.text,
              voice: result.voice,
              sample_rate: result.sample_rate,
              words: result.words,
              file_size: result.file_size,
              engine: result.engine
            }
          });

        } catch (parseError) {
          console.error('Error parsing Python output:', parseError);
          console.log('⚠️ General error, creating fallback audio...');
          
          const fallbackAudioUrl = createFallbackAudio(text, voice, outputDir);
          
          resolve({
            success: true,
            data: {
              audio_url: fallbackAudioUrl,
              duration: 5,
              text: text,
              voice: voice,
              sample_rate: 24000,
              words: text.split(' ').length,
              file_size: 240000,
              engine: 'Fallback Audio Generator'
            }
          });
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Python process spawn error:', error);
        const fallbackAudioUrl = createFallbackAudio(text, voice, outputDir);
        
        resolve({
          success: true,
          data: {
            audio_url: fallbackAudioUrl,
            duration: 5,
            text: text,
            voice: voice,
            sample_rate: 24000,
            words: text.split(' ').length,
            file_size: 240000,
            engine: 'Fallback Audio Generator'
          }
        });
      });

    } catch (error) {
      console.error('Piper TTS error:', error);
      const fallbackAudioUrl = createFallbackAudio(text, voice, outputDir);
      
      resolve({
        success: true,
        data: {
          audio_url: fallbackAudioUrl,
          duration: 5,
          text: text,
          voice: voice,
          sample_rate: 24000,
          words: text.split(' ').length,
          file_size: 240000,
          engine: 'Fallback Audio Generator'
        }
      });
    }
  });
}

// Create fallback audio file
function createFallbackAudio(text, voice, outputDir) {
  try {
    const fileName = `fallback_${Date.now()}.wav`;
    const filePath = path.join(outputDir, fileName);
    
    // Create a simple silent WAV file (5 seconds)
    const sampleRate = 22050; // Use 22kHz for better quality
    const duration = 5; // seconds
    const samples = sampleRate * duration;
    
    // WAV header for 16-bit PCM
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + samples * 2, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(1, 22); // Mono
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(samples * 2, 40);
    
    // Create silent audio data
    const audioData = Buffer.alloc(samples * 2);
    
    // Combine header and audio data
    const wavFile = Buffer.concat([header, audioData]);
    
    fs.writeFileSync(filePath, wavFile);
    
    console.log(`🎵 Created fallback audio: ${filePath}`);
    
    return `/uploads/audio/${fileName}`;
  } catch (error) {
    console.error('Error creating fallback audio:', error);
    throw error;
  }
}

// Create silent audio file as fallback
async function createSilentAudio(text, index) {
  const fs = require('fs-extra');
  const path = require('path');
  
  try {
    const outputDir = path.join(__dirname, '../uploads/audio');
    await fs.ensureDir(outputDir);
    
    const fileName = `silent_${index}_${Date.now()}.wav`;
    const filePath = path.join(outputDir, fileName);
    
    // Create a simple silent WAV file (5 seconds)
    const sampleRate = 22050; // Use 22kHz for better quality
    const duration = 5; // seconds
    const samples = sampleRate * duration;
    
    // WAV header for 16-bit PCM
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + samples * 2, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(1, 22); // Mono
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(samples * 2, 40);
    
    // Create silent audio data
    const audioData = Buffer.alloc(samples * 2);
    
    // Combine header and audio data
    const wavFile = Buffer.concat([header, audioData]);
    
    await fs.writeFile(filePath, wavFile);
    
    return `/uploads/audio/${fileName}`;
  } catch (error) {
    console.error('Error creating silent audio:', error);
    throw error;
  }
}

// Simple translation function (in production, use Google Translate API)
async function translateToEnglish(text) {
  // Check if text is already in English (simple check)
  const englishPattern = /^[a-zA-Z0-9\s.,!?;:'"()-]+$/;
  
  if (englishPattern.test(text.trim())) {
    return text; // Already in English
  }
  
  // Simple translation mapping for common Persian phrases
  const translations = {
    'آیا می‌دانستید که هوش مصنوعی در حال تغییر دنیای ما است؟': 'Did you know that artificial intelligence is changing our world?',
    'از تشخیص چهره تا تولید محتوا، AI همه جا حضور دارد': 'From face recognition to content generation, AI is everywhere',
    'اما آینده چه چیزی در انتظار ما است؟': 'But what does the future hold for us?',
    'هوش مصنوعی نه تنها کار ما را آسان‌تر می‌کند، بلکه فرصت‌های جدیدی ایجاد می‌کند': 'AI not only makes our work easier, but also creates new opportunities',
    'آماده‌اید برای آینده‌ای که هوش مصنوعی در آن حاکم است؟': 'Are you ready for a future where AI rules?',
    'خوش آمدید به آینده تکنولوژی': 'Welcome to the future of technology',
    'در این ویدیو با هم کشف می‌کنیم': 'In this video we explore together',
    'بیایید شروع کنیم': 'Let\'s get started',
    'این واقعاً شگفت‌انگیز است': 'This is truly amazing',
    'نتیجه نهایی': 'Final result'
  };
  
  // Return translation if found, otherwise return original text
  return translations[text] || text;
}

// Complete video generation pipeline
router.post('/generate-complete-video', async (req, res) => {
  try {
    const { script, images, audioSettings = {}, audioResults = [] } = req.body;
    
    console.log('🎵 Received request body:', req.body);
    console.log('🎵 Audio settings received:', audioSettings);
    console.log('🎵 Background music received:', audioSettings.backgroundMusic);
    
    if (!script || !images || !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        error: 'Script and images are required'
      });
    }

    // ایجاد شناسه ویدیو
    const videoId = `short-video-${Date.now()}`;
    
    console.log('🎬 Adding short video to queue...');
    console.log(`📊 Video ID: ${videoId}`);
    console.log(`📊 Scenes: ${script.scenes.length}`);
    console.log(`📊 Voice: ${audioSettings.voice || 'en_US-lessac-medium'}`);

    // اضافه کردن به صف
    videoQueueManager.addVideoTask(
      async () => {
        return await generateCompleteVideoContent(script, images, audioSettings, audioResults, req);
      },
      {
        videoId: videoId,
        type: 'short',
        title: script.title || 'ویدیوی کوتاه',
        metadata: {
          scenes: script.scenes.length,
          voice: audioSettings.voice || 'en_US-lessac-medium',
          backgroundMusic: audioSettings.backgroundMusic || 'none'
        }
      }
    ).catch(error => {
      console.error(`❌ Video ${videoId} failed in queue:`, error);
    });

    // برگرداندن فوری videoId
    res.json({
      success: true,
      videoId: videoId,
      status: 'queued',
      message: 'ویدیو به صف اضافه شد',
      queuePosition: videoQueueManager.getQueueStatus().queue.length
    });

  } catch (error) {
    console.error('Error queueing video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue video',
      details: error.message
    });
  }
});

// تابع تولید محتوای ویدیو کامل
async function generateCompleteVideoContent(script, images, audioSettings, audioResults, req) {
  try {
    console.log('🎵 Starting complete video content generation...');
    console.log('🎵 audioSettings type:', typeof audioSettings);
    console.log('🎵 audioSettings keys:', Object.keys(audioSettings));

    // Step 1: Always generate audio for each scene (with fallback) - using TTS Queue
    console.log('🔄 Generating audio for all scenes with TTS Queue...');
    
    const finalAudioResults = [];
    for (let index = 0; index < script.scenes.length; index++) {
      const scene = script.scenes[index];
      
      try {
        // Ensure text is in the correct language for the selected voice
        let textForTTS;
        if (audioSettings.voice && audioSettings.voice.startsWith('fa_IR')) {
          // Use original Persian text for Persian voices
          textForTTS = scene.speaker_text;
          console.log(`🎵 Using Persian text for Persian voice: "${textForTTS}"`);
        } else {
          // Translate to English for English voices
          textForTTS = await translateToEnglish(scene.speaker_text);
          console.log(`🎵 Using English text for English voice: "${textForTTS}"`);
        }
        
        console.log(`🎵 Generating TTS for scene ${index}: "${textForTTS}"`);
        
        // Use TTS Queue Manager for controlled processing
        const piperResult = await ttsQueueManager.addTTSTask(
          () => generatePiperTTS(textForTTS, audioSettings.voice || 'en_US-lessac-medium'),
          `complete-video-scene-${index}`
        );
        
        console.log(`🎵 Piper Result for scene ${index}:`, piperResult);
        
        if (!piperResult.success || !piperResult.data) {
          console.error(`❌ Piper TTS failed for scene ${index}:`, piperResult);
          throw new Error('Piper TTS failed');
        }
        
        // Handle both audio_url and audio_file properties
        const audioUrl = piperResult.data.audio_url || piperResult.data.audio_file;
        if (!audioUrl) {
          console.error(`❌ No audio URL found in result for scene ${index}:`, piperResult.data);
          throw new Error('No audio URL in Piper result');
        }
        
        finalAudioResults.push({
          sceneIndex: index,
          audioUrl: audioUrl,
          duration: piperResult.data.duration || 5,
          text: piperResult.data.text,
          voice: piperResult.data.voice,
          engine: piperResult.data.engine || 'Piper TTS'
        });
      } catch (error) {
        console.error(`Error generating TTS for scene ${index}:`, error);
        
        // Always create fallback audio to ensure video has audio
        try {
          let fallbackText;
          if (audioSettings.voice && audioSettings.voice.startsWith('fa_IR')) {
            fallbackText = scene.speaker_text;
          } else {
            fallbackText = await translateToEnglish(scene.speaker_text);
          }
          const fallbackAudioUrl = await createSilentAudio(fallbackText, index);
          console.log(`🔄 Created fallback audio for scene ${index}: ${fallbackAudioUrl}`);
          finalAudioResults.push({
            sceneIndex: index,
            audioUrl: fallbackAudioUrl,
            duration: 5,
            text: fallbackText,
            voice: audioSettings.voice || 'af_heart',
            engine: 'Fallback (Silent)'
          });
        } catch (fallbackError) {
          console.error(`Fallback audio creation failed for scene ${index}:`, fallbackError);
          finalAudioResults.push({
            sceneIndex: index,
            audioUrl: null,
            duration: 5 // Default duration
          });
        }
      }
    }

    console.log(`✅ Generated ${finalAudioResults.length} audio files`);
    
    // Step 2: Generate subtitles using Whisper with Queue Manager
    // Detect language from voice
    const isPersianVoice = audioSettings.voice && audioSettings.voice.startsWith('fa_IR');
    const subtitleLanguage = isPersianVoice ? 'fa' : 'en';
    console.log(`📝 Subtitle language: ${subtitleLanguage} (voice: ${audioSettings.voice})`);
    
    // Use Whisper Queue Manager for controlled processing (1 at a time)
    const subtitleResults = [];
    for (let index = 0; index < finalAudioResults.length; index++) {
      const audioData = finalAudioResults[index];
      
      if (!audioData.audioUrl) {
        subtitleResults.push(null);
        continue;
      }
      
      // Get original scene text (not translated)
      const originalSceneText = script.scenes[index] ? script.scenes[index].speaker_text : '';
      
      try {
        console.log(`🎤 Generating subtitles for scene ${index} with Whisper Queue...`);
        
        // Add to Whisper Queue
        const subtitleResult = await whisperQueueManager.addWhisperTask(
          async () => {
            const subtitleResponse = await fetch(`${req.protocol}://${req.get('host')}/api/whisper/transcribe-with-timestamps`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioUrl: audioData.audioUrl,
                language: subtitleLanguage  // ✅ Use correct language
              })
            });
            
            return await subtitleResponse.json();
          },
          `complete-video-scene-${index}`
        );
        
        console.log(`🎤 Subtitle result for scene ${index}:`, subtitleResult);
        
        if (subtitleResult.success && subtitleResult.data && subtitleResult.data.segments) {
          subtitleResults.push({
            sceneIndex: index,
            segments: subtitleResult.data.segments,
            text: subtitleResult.data.text || originalSceneText
          });
        } else {
          // Create fallback subtitle with original text
          console.log(`⚠️ Creating fallback subtitle for scene ${index}`);
          const fallbackSegments = [{
            start: 0,
            end: audioData.duration || 5,
            text: originalSceneText || audioData.text || 'No text available'
          }];
          
          subtitleResults.push({
            sceneIndex: index,
            segments: fallbackSegments,
            text: audioData.text || ''
          });
        }
      } catch (error) {
        console.error(`Error generating subtitles for scene ${index}:`, error);
        
        // Create fallback subtitle with original text
        console.log(`⚠️ Creating fallback subtitle for scene ${index} due to error`);
        const fallbackSegments = [{
          start: 0,
          end: audioData.duration || 5,
          text: originalSceneText || audioData.text || 'No text available'
        }];
        
        subtitleResults.push({
          sceneIndex: index,
          segments: fallbackSegments,
          text: originalSceneText || audioData.text || ''
        });
      }
    }
    
    // Step 3: Prepare scenes with images, audio, and subtitles
    const videoScenes = script.scenes.map((scene, index) => {
      const correspondingImage = images.find(img => img.sceneIndex === index);
      const audioData = finalAudioResults.find(audio => audio.sceneIndex === index);
      const subtitleData = subtitleResults.find(sub => sub && sub.sceneIndex === index);
      
      return {
        scene_number: scene.scene_number,
        duration: audioData ? audioData.duration : 5,
        speaker_text: scene.speaker_text,
        visual_description: scene.visual_description,
        image_url: correspondingImage ? correspondingImage.imageUrl : null,
        audio_url: audioData ? audioData.audioUrl : null,
        audio_duration: audioData ? audioData.duration : 5,
        subtitles: subtitleData ? subtitleData.segments : [],
        subtitle_text: subtitleData ? subtitleData.text : ''
      };
    });

    // Step 4: Compose video with subtitles
        console.log('🎵 Sending to Remotion:', {
          scenes: videoScenes.length,
          audioResults: finalAudioResults.length,
          subtitleResults: subtitleResults.length,
          backgroundMusic: audioSettings.backgroundMusic
        });
        console.log('🎵 Full audioSettings object:', audioSettings);
        console.log('🎵 audioSettings.backgroundMusic:', audioSettings.backgroundMusic);
        
        const composeResponse = await fetch(`${req.protocol}://${req.get('host')}/api/remotion/compose-video-with-subtitles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenes: videoScenes,
            audioResults: finalAudioResults,
            subtitleResults: subtitleResults,
            backgroundMusic: audioSettings.backgroundMusic
          })
        });

    const composeResult = await composeResponse.json();
    
    if (!composeResult.success) {
      throw new Error(composeResult.error || 'Failed to compose video');
    }

    return {
      success: true,
      data: {
        video_url: composeResult.data.video_url,
        duration: composeResult.data.duration,
        scenes_count: composeResult.data.scenes_count,
        resolution: composeResult.data.resolution,
        status: 'completed',
        scenes: videoScenes,
        audio_results: finalAudioResults,
        subtitle_results: subtitleResults
      }
    };

  } catch (error) {
    console.error('Error generating complete video:', error);
    throw error;
  }
}

// Custom video generation with user input
router.post('/generate-custom-video', async (req, res) => {
  try {
    const { title, scenes, voice = 'en_US-kristin-medium', orientation = 'vertical', subtitleSettings = {}, generatedImages = [], backgroundMusic = '' } = req.body;
    
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'لطفاً حداقل یک صحنه وارد کنید'
      });
    }

    // ایجاد شناسه ویدیو
    const videoId = `custom-video-${Date.now()}`;
    
    console.log('🎬 Adding custom video to queue...');
    console.log(`📊 Video ID: ${videoId}`);
    console.log(`📊 Title: ${title}`);
    console.log(`📊 Scenes: ${scenes.length}`);
    console.log(`📊 Voice: ${voice}`);
    console.log(`📊 Orientation: ${orientation}`);

    // اضافه کردن به صف
    videoQueueManager.addVideoTask(
      async () => {
        return await generateCustomVideoContent(title, scenes, voice, orientation, subtitleSettings, generatedImages, backgroundMusic, req);
      },
      {
        videoId: videoId,
        type: 'custom',
        title: title || 'ویدیوی سفارشی',
        metadata: {
          scenes: scenes.length,
          voice: voice,
          orientation: orientation,
          backgroundMusic: backgroundMusic || 'none'
        }
      }
    ).catch(error => {
      console.error(`❌ Video ${videoId} failed in queue:`, error);
    });

    // برگرداندن فوری videoId
    res.json({
      success: true,
      videoId: videoId,
      status: 'queued',
      message: 'ویدیو به صف اضافه شد',
      queuePosition: videoQueueManager.getQueueStatus().queue.length
    });

  } catch (error) {
    console.error('Error queueing custom video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue custom video',
      details: error.message
    });
  }
});

// تابع تولید محتوای ویدیوی سفارشی
async function generateCustomVideoContent(title, scenes, voice, orientation, subtitleSettings, generatedImages, backgroundMusic, req) {
  try {
    console.log(`🎬 Starting custom video generation: "${title}"`);
    console.log(`   Scenes: ${scenes.length}`);
    console.log(`   Voice: ${voice}`);
    console.log(`   Orientation: ${orientation}`);
    console.log(`   Generated Images: ${generatedImages.length}`);
    console.log(`   Background Music: ${backgroundMusic || 'none'}`);

    // Use pre-generated images if available
    let images = generatedImages;
    
    if (!images || images.length === 0) {
      // Fallback: Generate images if not provided
      console.log('🖼️ No pre-generated images, creating fallback...');
      const width = orientation === 'horizontal' ? 1920 : 1080;
      const height = orientation === 'horizontal' ? 1080 : 1920;
      
      images = scenes.map((scene, index) => ({
        sceneIndex: index,
        imageUrl: `https://pollinations.ai/p/${encodeURIComponent(scene.visual_description)}?width=${width}&height=${height}&model=flux&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`
      }));
    } else {
      console.log('✅ Using pre-generated images from frontend');
    }

    // Step 2: Generate audio for each scene - using TTS Queue
    console.log('🎤 Generating audio with TTS Queue...');
    const finalAudioResults = [];
    for (let index = 0; index < scenes.length; index++) {
      const scene = scenes[index];
      
      try {
        // Translate Persian text to English for Piper TTS
        let textForTTS;
        if (voice && voice.startsWith('fa_IR')) {
          // Use original Persian text for Persian voices
          textForTTS = scene.speaker_text;
          console.log(`🎵 Using Persian text for Persian voice: "${textForTTS}"`);
        } else {
          // Translate to English for English voices
          textForTTS = await translateToEnglish(scene.speaker_text);
          console.log(`🎵 Using English text for English voice: "${textForTTS}"`);
        }
        
        console.log(`🎵 Generating TTS for scene ${index + 1}: "${textForTTS}"`);
        
        // Use TTS Queue Manager for controlled processing
        const piperResult = await ttsQueueManager.addTTSTask(
          () => generatePiperTTS(textForTTS, voice),
          `custom-video-scene-${index}`
        );
        
        if (!piperResult.success || !piperResult.data) {
          console.error(`❌ Piper TTS failed for scene ${index + 1}:`, piperResult);
          throw new Error('Piper TTS failed');
        }
        
        const audioUrl = piperResult.data.audio_url || piperResult.data.audio_file;
        if (!audioUrl) {
          throw new Error('No audio URL in Piper result');
        }
        
        finalAudioResults.push({
          sceneIndex: index,
          audioUrl: audioUrl,
          duration: piperResult.data.duration || 5,
          text: piperResult.data.text,
          voice: piperResult.data.voice,
          engine: piperResult.data.engine || 'Piper TTS'
        });
      } catch (error) {
        console.error(`Error generating TTS for scene ${index + 1}:`, error);
        
        // Create fallback audio
        try {
          let fallbackText;
          if (voice && voice.startsWith('fa_IR')) {
            fallbackText = scene.speaker_text;
          } else {
            fallbackText = await translateToEnglish(scene.speaker_text);
          }
          const fallbackAudioUrl = await createSilentAudio(fallbackText, index);
          finalAudioResults.push({
            sceneIndex: index,
            audioUrl: fallbackAudioUrl,
            duration: 5,
            text: fallbackText,
            voice: voice,
            engine: 'Fallback (Silent)'
          });
        } catch (fallbackError) {
          console.error(`Fallback audio creation failed for scene ${index + 1}:`, fallbackError);
          finalAudioResults.push({
            sceneIndex: index,
            audioUrl: null,
            duration: 5
          });
        }
      }
    }

    console.log(`✅ Generated ${finalAudioResults.length} audio files`);
    
    // Step 3: Generate subtitles using Whisper with Queue Manager
    console.log('📝 Generating subtitles...');
    
    // Detect language from voice
    const isPersianVoice = voice && voice.startsWith('fa_IR');
    const subtitleLanguage = isPersianVoice ? 'fa' : 'en';
    console.log(`📝 Subtitle language: ${subtitleLanguage} (voice: ${voice})`);
    
    // Use Whisper Queue Manager for controlled processing (1 at a time)
    const subtitleResults = [];
    for (let index = 0; index < finalAudioResults.length; index++) {
      const audioData = finalAudioResults[index];
      
      if (!audioData.audioUrl) {
        subtitleResults.push(null);
        continue;
      }
      
      // Get original scene text (not translated)
      const originalSceneText = scenes[index] ? scenes[index].speaker_text : '';
      
      try {
        console.log(`🎤 Generating subtitles for scene ${index + 1} with Whisper Queue...`);
        
        // Add to Whisper Queue
        const subtitleResult = await whisperQueueManager.addWhisperTask(
          async () => {
            const subtitleResponse = await fetch(`${req.protocol}://${req.get('host')}/api/whisper/transcribe-with-timestamps`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioUrl: audioData.audioUrl,
                language: subtitleLanguage  // ✅ Use correct language
              })
            });
            
            return await subtitleResponse.json();
          },
          `custom-video-scene-${index}`
        );
        
        if (subtitleResult.success && subtitleResult.data && subtitleResult.data.segments) {
          subtitleResults.push({
            sceneIndex: index,
            segments: subtitleResult.data.segments,
            text: subtitleResult.data.text || originalSceneText
          });
        } else {
          // Create fallback subtitle with original text
          console.log(`⚠️ Whisper failed for scene ${index + 1}, using original text`);
          const fallbackSegments = [{
            start: 0,
            end: audioData.duration || 5,
            text: originalSceneText || audioData.text || 'No text available'
          }];
          
          subtitleResults.push({
            sceneIndex: index,
            segments: fallbackSegments,
            text: originalSceneText || audioData.text || ''
          });
        }
      } catch (error) {
        console.error(`Error generating subtitles for scene ${index + 1}:`, error);
        
        // Create fallback subtitle with original text
        const fallbackSegments = [{
          start: 0,
          end: audioData.duration || 5,
          text: originalSceneText || audioData.text || 'No text available'
        }];
        
        subtitleResults.push({
          sceneIndex: index,
          segments: fallbackSegments,
          text: originalSceneText || audioData.text || ''
        });
      }
    }
    
    // Step 4: Prepare scenes with images, audio, and subtitles
    const videoScenes = scenes.map((scene, index) => {
      const correspondingImage = images.find(img => img.sceneIndex === index);
      const audioData = finalAudioResults.find(audio => audio.sceneIndex === index);
      const subtitleData = subtitleResults.find(sub => sub && sub.sceneIndex === index);
      
      return {
        scene_number: scene.scene_number,
        duration: audioData ? audioData.duration : 5,
        speaker_text: scene.speaker_text,
        visual_description: scene.visual_description,
        image_url: correspondingImage ? correspondingImage.imageUrl : null,
        audio_url: audioData ? audioData.audioUrl : null,
        audio_duration: audioData ? audioData.duration : 5,
        subtitles: subtitleData ? subtitleData.segments : [],
        subtitle_text: subtitleData ? subtitleData.text : '',
        orientation: orientation,
        isHorizontal: orientation === 'horizontal',
        subtitleSettings: subtitleSettings
      };
    });

    // Step 5: Compose video with subtitles
    console.log('🎬 Composing video...');
    console.log('🎵 Custom video background music:', backgroundMusic);
    const composeResponse = await fetch(`${req.protocol}://${req.get('host')}/api/remotion/compose-video-with-subtitles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenes: videoScenes,
        audioResults: finalAudioResults,
        subtitleResults: subtitleResults,
        backgroundMusic: backgroundMusic
      })
    });

    const composeResult = await composeResponse.json();
    
    if (!composeResult.success) {
      throw new Error(composeResult.error || 'Failed to compose video');
    }

    return {
      success: true,
      data: {
        video_url: composeResult.data.video_url,
        duration: composeResult.data.duration,
        scenes_count: composeResult.data.scenes_count,
        resolution: composeResult.data.resolution,
        status: 'completed',
        title: title,
        voice: voice,
        scenes: videoScenes,
        audio_results: finalAudioResults,
        subtitle_results: subtitleResults
      }
    };

  } catch (error) {
    console.error('Error generating custom video:', error);
    throw error;
  }
}

// Get video generation status
router.get('/status/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Mock status (replace with actual status tracking)
    const status = {
      video_id: videoId,
      status: 'completed',
      progress: 100,
      video_url: `/api/remotion/download/video-${videoId}.mp4`,
      created_at: new Date().toISOString(),
      steps_completed: [
        'Script generated',
        'Images generated',
        'Audio generated',
        'Video composed'
      ]
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error getting video status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get video status',
      details: error.message
    });
  }
});

// Generate long form video with resource management
router.post('/generate-long-form-video', async (req, res) => {
  try {
    const { script, images, audioSettings = {}, audioResults = [], videoType = 'long-form', videoId } = req.body;
    
    console.log('🎵 Long form received request body:', req.body);
    console.log('🎵 Long form audio settings received:', audioSettings);
    console.log('🎵 Long form background music received:', audioSettings.backgroundMusic);
    console.log('🎵 Long form audioSettings type:', typeof audioSettings);
    console.log('🎵 Long form audioSettings keys:', Object.keys(audioSettings));
    console.log('🎵 Long form req.body.audioSettings:', req.body.audioSettings);
    console.log('🎵 Long form req.body.audioSettings type:', typeof req.body.audioSettings);
    console.log('🎵 Long form req.body.audioSettings keys:', req.body.audioSettings ? Object.keys(req.body.audioSettings) : 'null');
    
    if (!script || !images || !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        error: 'Script and images are required'
      });
    }

    console.log('🎬 Adding long form video to queue...');
    console.log(`📊 Script: ${script.title}`);
    console.log(`📊 Scenes: ${script.scenes.length}`);
    console.log(`📊 Images: ${images.length}`);
    console.log(`📊 Video Type: ${videoType}`);
    console.log(`📊 Video ID: ${videoId}`);
    console.log(`📊 Background Music: ${audioSettings.backgroundMusic || 'none'}`);

    // اضافه کردن به صف
    const taskId = videoId || `long-form-video-${Date.now()}`;
    
    videoQueueManager.addVideoTask(
      async () => {
        return await generateLongFormVideoContent(script, images, audioSettings, audioResults, videoType, req, videoId);
      },
      {
        videoId: taskId,
        type: 'long',
        title: script.title || 'ویدیوی بلند',
        metadata: {
          scenes: script.scenes.length,
          voice: audioSettings.voice || 'en_US-lessac-medium',
          videoType: videoType,
          backgroundMusic: audioSettings.backgroundMusic || 'none'
        }
      }
    ).catch(error => {
      console.error(`❌ Long form video ${taskId} failed in queue:`, error);
    });

    // برگرداندن فوری videoId
    res.json({
      success: true,
      videoId: taskId,
      status: 'queued',
      message: 'ویدیو به صف اضافه شد',
      queuePosition: videoQueueManager.getQueueStatus().queue.length
    });

  } catch (error) {
    console.error('Error in long form video generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate long form video',
      details: error.message
    });
  }
});

// تابع اصلی تولید ویدیو طولانی
async function generateLongFormVideoContent(script, images, audioSettings, audioResults, videoType, req, videoId) {
  try {
    console.log('🎬 Starting long form video generation with resource limits...');
    console.log(`📊 Background Music: ${audioSettings.backgroundMusic || 'none'}`);
    
    // Step 1: Always generate audio for each scene (with fallback) - using TTS Queue
    console.log('🔄 Generating audio for all long form scenes with TTS Queue...');
    
    const finalAudioResults = [];
    for (let index = 0; index < script.scenes.length; index++) {
      const scene = script.scenes[index];
      
      try {
        // Ensure text is in the correct language for the selected voice
        let textForTTS;
        if (audioSettings.voice && audioSettings.voice.startsWith('fa_IR')) {
          // Use original Persian text for Persian voices
          textForTTS = scene.speaker_text;
          console.log(`🎵 Using Persian text for Persian voice: "${textForTTS}"`);
        } else {
          // Translate to English for English voices
          textForTTS = await translateToEnglish(scene.speaker_text);
          console.log(`🎵 Using English text for English voice: "${textForTTS}"`);
        }
        
        console.log(`🎵 Generating TTS for long form scene ${index}: "${textForTTS}"`);
        
        // Use TTS Queue Manager for controlled processing
        const piperResult = await ttsQueueManager.addTTSTask(
          () => generatePiperTTS(textForTTS, audioSettings.voice || 'en_US-lessac-medium'),
          `longform-video-scene-${index}`
        );
        
        console.log(`🎵 Piper Result for long form scene ${index}:`, piperResult);
        
        if (!piperResult.success || !piperResult.data) {
          console.error(`❌ Piper TTS failed for long form scene ${index}:`, piperResult);
          throw new Error('Piper TTS failed');
        }
        
        // Handle both audio_url and audio_file properties
        const audioUrl = piperResult.data.audio_url || piperResult.data.audio_file;
        if (!audioUrl) {
          console.error(`❌ No audio URL found in result for long form scene ${index}:`, piperResult.data);
          throw new Error('No audio URL in Piper result');
        }
        
        finalAudioResults.push({
          sceneIndex: index,
          audioUrl: audioUrl,
          duration: piperResult.data.duration || 5,
          text: piperResult.data.text,
          voice: piperResult.data.voice,
          engine: piperResult.data.engine || 'Piper TTS'
        });
      } catch (error) {
        console.error(`Error generating TTS for long form scene ${index}:`, error);
        
        // Always create fallback audio to ensure video has audio
        try {
          let fallbackText;
          if (audioSettings.voice && audioSettings.voice.startsWith('fa_IR')) {
            fallbackText = scene.speaker_text;
          } else {
            fallbackText = await translateToEnglish(scene.speaker_text);
          }
          const fallbackAudioUrl = await createSilentAudio(fallbackText, index);
          console.log(`🔄 Created fallback audio for long form scene ${index}: ${fallbackAudioUrl}`);
          finalAudioResults.push({
            sceneIndex: index,
            audioUrl: fallbackAudioUrl,
            duration: 5,
            text: fallbackText,
            voice: audioSettings.voice || 'af_heart',
            engine: 'Fallback (Silent)'
          });
        } catch (fallbackError) {
          console.error(`Fallback audio creation failed for long form scene ${index}:`, fallbackError);
          finalAudioResults.push({
            sceneIndex: index,
            audioUrl: null,
            duration: 5 // Default duration
          });
        }
      }
    }

    console.log(`✅ Generated ${finalAudioResults.length} audio files for long form video`);
    
    // Step 2: Generate subtitles using Whisper with Queue Manager
    // Detect language from voice
    const isPersianVoice = audioSettings.voice && audioSettings.voice.startsWith('fa_IR');
    const subtitleLanguage = isPersianVoice ? 'fa' : 'en';
    console.log(`📝 Subtitle language for long form: ${subtitleLanguage} (voice: ${audioSettings.voice})`);
    
    // Use Whisper Queue Manager for controlled processing (1 at a time)
    const subtitleResults = [];
    for (let index = 0; index < finalAudioResults.length; index++) {
      const audioData = finalAudioResults[index];
      
      if (!audioData.audioUrl) {
        subtitleResults.push(null);
        continue;
      }
      
      // Get original scene text (not translated)
      const originalSceneText = script.scenes[index] ? script.scenes[index].speaker_text : '';
      
      try {
        console.log(`🎤 Generating subtitles for long form scene ${index} with Whisper Queue...`);
        
        // Add to Whisper Queue
        const subtitleResult = await whisperQueueManager.addWhisperTask(
          async () => {
            const subtitleResponse = await fetch(`${req.protocol}://${req.get('host')}/api/whisper/transcribe-with-timestamps`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioUrl: audioData.audioUrl,
                language: subtitleLanguage  // ✅ Use correct language
              })
            });
            
            return await subtitleResponse.json();
          },
          `longform-video-scene-${index}`
        );
        
        console.log(`🎤 Subtitle result for long form scene ${index}:`, subtitleResult);
        
        if (subtitleResult.success && subtitleResult.data && subtitleResult.data.segments) {
          subtitleResults.push({
            sceneIndex: index,
            segments: subtitleResult.data.segments,
            text: subtitleResult.data.text || originalSceneText
          });
        } else {
          // Create fallback subtitle with original text
          console.log(`⚠️ Creating fallback subtitle for long form scene ${index}`);
          const fallbackSegments = [{
            start: 0,
            end: audioData.duration || 5,
            text: originalSceneText || audioData.text || 'No text available'
          }];
          
          subtitleResults.push({
            sceneIndex: index,
            segments: fallbackSegments,
            text: originalSceneText || audioData.text || ''
          });
        }
      } catch (error) {
        console.error(`Error generating subtitles for long form scene ${index}:`, error);
        
        // Create fallback subtitle with original text
        console.log(`⚠️ Creating fallback subtitle for long form scene ${index} due to error`);
        const fallbackSegments = [{
          start: 0,
          end: audioData.duration || 5,
          text: originalSceneText || audioData.text || 'No text available'
        }];
        
        subtitleResults.push({
          sceneIndex: index,
          segments: fallbackSegments,
          text: originalSceneText || audioData.text || ''
        });
      }
    }
    
    // Step 3: Prepare scenes with images, audio, and subtitles
    const videoScenes = script.scenes.map((scene, index) => {
      const correspondingImage = images.find(img => img.sceneIndex === index);
      const audioData = finalAudioResults.find(audio => audio.sceneIndex === index);
      const subtitleData = subtitleResults.find(sub => sub && sub.sceneIndex === index);
      
      return {
        scene_number: scene.scene_number,
        duration: audioData ? audioData.duration : 5,
        speaker_text: scene.speaker_text,
        visual_description: scene.visual_description,
        image_url: correspondingImage ? correspondingImage.imageUrl : null,
        audio_url: audioData ? audioData.audioUrl : null,
        audio_duration: audioData ? audioData.duration : 5,
        subtitles: subtitleData ? subtitleData.segments : [],
        subtitle_text: subtitleData ? subtitleData.text : '',
        orientation: 'horizontal',
        isHorizontal: true
      };
    });

    // Step 4: Compose long form video with subtitles
    console.log('🎬 Composing long form video...');
    console.log(`📊 Background Music: ${audioSettings.backgroundMusic || 'none'}`);
    
    // اطمینان از صحت URL ها قبل از ارسال
    const validatedScenes = videoScenes.map(scene => {
      if (scene.audio_url && scene.audio_url.startsWith('/')) {
        scene.audio_url = `http://localhost:${process.env.PORT || 3004}${scene.audio_url}`;
      }
      if (scene.image_url && scene.image_url.startsWith('/')) {
        scene.image_url = `http://localhost:${process.env.PORT || 3004}${scene.image_url}`;
      }
      return scene;
    });
    
    // افزایش تایم‌اوت برای ویدیوهای طولانی (10 دقیقه)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes
    
    let composeResult;
    try {
    console.log('🎵 Long form sending to Remotion:', {
      scenes: validatedScenes.length,
      audioResults: finalAudioResults.length,
      subtitleResults: subtitleResults.length,
      backgroundMusic: audioSettings.backgroundMusic
    });
    console.log('🎵 Full audioSettings object:', audioSettings);
    console.log('🎵 audioSettings.backgroundMusic:', audioSettings.backgroundMusic);
        
        const composeResponse = await fetch(`${req.protocol}://${req.get('host')}/api/remotion/compose-long-form-video-with-subtitles`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Connection': 'keep-alive'
          },
          body: JSON.stringify({
            scenes: validatedScenes,
            audioResults: finalAudioResults,
            subtitleResults: subtitleResults,
            videoType: videoType,
            backgroundMusic: audioSettings.backgroundMusic
          }),
          signal: controller.signal
        });

      composeResult = await composeResponse.json();
      clearTimeout(timeoutId);
      
      if (!composeResult.success) {
        console.error('❌ Compose result:', composeResult);
        throw new Error(composeResult.error || 'Failed to compose long form video');
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // اگر تایم‌اوت شد، بررسی کن که آیا ویدیو ساخته شده یا نه
      if (fetchError.name === 'AbortError' || fetchError.code === 'UND_ERR_HEADERS_TIMEOUT') {
        console.log('⚠️ Request timed out, checking if video was created anyway...');
        
        // بررسی اینکه آیا ویدیو در پوشه output ذخیره شده یا نه
        const outputDir = path.join(__dirname, '../output');
        const files = await fsPromises.readdir(outputDir);
        const recentVideos = files.filter(f => f.startsWith('long-form-video-') && f.endsWith('.mp4'))
                                  .sort()
                                  .reverse();
        
        if (recentVideos.length > 0) {
          // ویدیو یافت شد، بنابراین موفقیت‌آمیز بوده است
          const videoFileName = recentVideos[0];
          const videoId = videoFileName.replace('long-form-video-', '').replace('.mp4', '');
          
          console.log('✅ Video was created successfully despite timeout!');
          composeResult = {
            success: true,
            data: {
              video_url: `/api/remotion/download/${videoFileName}`,
              duration: validatedScenes.reduce((total, scene) => total + (scene.audio_duration || 5), 0),
              scenes_count: validatedScenes.length,
              resolution: '1920x1080',
              status: 'completed',
              video_id: videoId,
              video_type: 'long-form'
            }
          };
          
          // Remove video from tracking for timeout case since it's completed
          if (videoId) {
            await removeVideoFromTracking(videoId);
          }
        } else {
          throw new Error('Request timed out and no video file was found');
        }
      } else {
        throw fetchError;
      }
    }

    // Remove video from tracking since it's now completed and has a file
    if (videoId) {
      await removeVideoFromTracking(videoId);
    }

    return {
      success: true,
      data: {
        video_url: composeResult.data.video_url,
        duration: composeResult.data.duration,
        scenes_count: composeResult.data.scenes_count,
        resolution: composeResult.data.resolution,
        status: 'completed',
        video_type: 'long-form',
        scenes: videoScenes,
        audio_results: finalAudioResults,
        subtitle_results: subtitleResults
      }
    };

  } catch (error) {
    console.error('Error generating long form video content:', error);
    
    // Update video tracking to error status
    if (videoId) {
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
          errorMessage: error.message
        }
      });
    }
    
    throw error;
  }
}

// Complete long form video generation in backend (images + video)
router.post('/generate-long-form-complete', async (req, res) => {
  try {
    const { script, videoId, voice = 'en_US-kristin-medium' } = req.body;
    
    if (!script || !script.scenes || !Array.isArray(script.scenes)) {
      return res.status(400).json({
        success: false,
        error: 'Script with scenes is required'
      });
    }

    console.log('🎬 Starting complete long form video generation in backend...');
    console.log(`📊 Video ID: ${videoId}`);
    console.log(`📊 Scenes: ${script.scenes.length}`);
    console.log(`📊 Voice: ${voice}`);

    // Update tracking to show process started
    if (videoId) {
      await updateVideoTracking(videoId, {
        progress: 0,
        currentStep: 'شروع فرآیند کامل',
        steps: [
          { name: 'در صف انتظار', status: 'completed', timestamp: null },
          { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
          { name: 'تولید تصاویر', status: 'active', timestamp: new Date().toISOString() },
          { name: 'تولید صدا', status: 'pending', timestamp: null },
          { name: 'ترکیب ویدیو', status: 'pending', timestamp: null },
          { name: 'آماده', status: 'pending', timestamp: null }
        ]
      });
    }

    // Step 1: Generate images
    console.log('🖼️ Step 1: Generating images...');
    const images = [];
    
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      
      try {
        console.log(`🖼️ Generating image ${i + 1}/${script.scenes.length}...`);
        
        // Modify image prompt for horizontal format
        const basePrompt = scene.visual_description || scene.image_prompt || 'A beautiful and engaging visual';
        const horizontalPrompt = `${basePrompt}, horizontal format, landscape orientation, wide aspect ratio`;
        
        // Generate image using internal API
        const imageResponse = await fetch(`${req.protocol}://${req.get('host')}/api/flax/generate-image-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: horizontalPrompt,
            width: 1920,
            height: 1080
          })
        });
        
        const imageResult = await imageResponse.json();
        
        if (imageResult.success) {
          images.push({
            sceneIndex: i,
            imageUrl: imageResult.data.image_url,
            prompt: horizontalPrompt,
            scene: scene
          });
          
          console.log(`✅ Image ${i + 1} generated successfully`);
        } else {
          throw new Error(imageResult.error || 'خطا در تولید تصویر');
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / script.scenes.length) * 30); // 30% for images
        if (videoId) {
          await updateVideoTracking(videoId, {
            progress: progress,
            currentStep: `تولید تصاویر (${i + 1}/${script.scenes.length})`
          });
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error generating image ${i + 1}:`, error);
        throw error;
      }
    }
    
    // Update tracking to show images completed
    if (videoId) {
      await updateVideoTracking(videoId, {
        progress: 30,
        currentStep: 'تولید تصاویر تکمیل شد',
        steps: [
          { name: 'در صف انتظار', status: 'completed', timestamp: null },
          { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
          { name: 'تولید تصاویر', status: 'completed', timestamp: new Date().toISOString() },
          { name: 'تولید صدا', status: 'active', timestamp: new Date().toISOString() },
          { name: 'ترکیب ویدیو', status: 'pending', timestamp: null },
          { name: 'آماده', status: 'pending', timestamp: null }
        ]
      });
    }
    
    console.log('✅ All images generated successfully');
    
    // Step 2: Generate complete video
    console.log('🎬 Step 2: Generating complete video...');
    
    // Update tracking to show video generation started
    if (videoId) {
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
    
    // Get background music from the request
    const backgroundMusic = req.body.backgroundMusic || '';
    console.log('🎵 Background music for complete video:', backgroundMusic);
    
    // Generate complete video using existing function with background music
    const videoResult = await generateLongFormVideoContent(script, images, { voice, backgroundMusic }, [], 'long-form', req, videoId);
    
    if (videoResult.success) {
      console.log('✅ Complete video generated successfully');
      
      res.json({
        success: true,
        data: {
          video_url: videoResult.data.video_url,
          duration: videoResult.data.duration,
          scenes_count: videoResult.data.scenes_count,
          resolution: videoResult.data.resolution,
          status: 'completed',
          video_type: 'long-form',
          videoId: videoId,
          images: images
        }
      });
    } else {
      throw new Error(videoResult.error || 'خطا در تولید ویدیو');
    }
    
  } catch (error) {
    console.error('❌ Error generating complete long form video:', error);
    
    // Update tracking to error status
    if (req.body.videoId) {
      await updateVideoTracking(req.body.videoId, {
        status: 'error',
        progress: 0,
        currentStep: 'خطا در تولید',
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
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate complete video',
      details: error.message
    });
  }
});

// Generate images for long form video in backend
router.post('/generate-long-form-images', async (req, res) => {
  try {
    const { script, videoId } = req.body;
    
    if (!script || !script.scenes || !Array.isArray(script.scenes)) {
      return res.status(400).json({
        success: false,
        error: 'Script with scenes is required'
      });
    }

    console.log('🖼️ Starting long form image generation in backend...');
    console.log(`📊 Video ID: ${videoId}`);
    console.log(`📊 Scenes: ${script.scenes.length}`);

    // Update tracking to show image generation started
    if (videoId) {
      await updateVideoTracking(videoId, {
        progress: 0,
        currentStep: 'تولید تصاویر در backend',
        steps: [
          { name: 'در صف انتظار', status: 'completed', timestamp: null },
          { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
          { name: 'تولید تصاویر', status: 'active', timestamp: new Date().toISOString() },
          { name: 'تولید صدا', status: 'pending', timestamp: null },
          { name: 'ترکیب ویدیو', status: 'pending', timestamp: null },
          { name: 'آماده', status: 'pending', timestamp: null }
        ]
      });
    }

    const images = [];
    
    // Generate images for each scene
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      
      try {
        console.log(`🖼️ Generating image ${i + 1}/${script.scenes.length}...`);
        
        // Modify image prompt for horizontal format
        const basePrompt = scene.visual_description || scene.image_prompt || 'A beautiful and engaging visual';
        const horizontalPrompt = `${basePrompt}, horizontal format, landscape orientation, wide aspect ratio`;
        
        // Generate image using internal API
        const imageResponse = await fetch(`${req.protocol}://${req.get('host')}/api/flax/generate-image-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: horizontalPrompt,
            width: 1920,
            height: 1080
          })
        });
        
        const imageResult = await imageResponse.json();
        
        if (imageResult.success) {
          images.push({
            sceneIndex: i,
            imageUrl: imageResult.data.image_url,
            prompt: horizontalPrompt,
            scene: scene
          });
          
          console.log(`✅ Image ${i + 1} generated successfully`);
        } else {
          throw new Error(imageResult.error || 'خطا در تولید تصویر');
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / script.scenes.length) * 30); // 30% for images
        if (videoId) {
          await updateVideoTracking(videoId, {
            progress: progress,
            currentStep: `تولید تصاویر (${i + 1}/${script.scenes.length})`
          });
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error generating image ${i + 1}:`, error);
        throw error;
      }
    }
    
    // Update tracking to show images completed
    if (videoId) {
      await updateVideoTracking(videoId, {
        progress: 30,
        currentStep: 'تولید تصاویر تکمیل شد',
        steps: [
          { name: 'در صف انتظار', status: 'completed', timestamp: null },
          { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
          { name: 'تولید تصاویر', status: 'completed', timestamp: new Date().toISOString() },
          { name: 'تولید صدا', status: 'pending', timestamp: null },
          { name: 'ترکیب ویدیو', status: 'pending', timestamp: null },
          { name: 'آماده', status: 'pending', timestamp: null }
        ]
      });
    }
    
    console.log('✅ All images generated successfully');
    
    res.json({
      success: true,
      data: {
        images: images,
        totalImages: images.length,
        videoId: videoId
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating long form images:', error);
    
    // Update tracking to error status
    if (req.body.videoId) {
      await updateVideoTracking(req.body.videoId, {
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
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate images',
      details: error.message
    });
  }
});

// دریافت وضعیت صف و منابع
router.get('/queue-status', (req, res) => {
  try {
    const status = resourceManager.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get queue status',
      details: error.message
    });
  }
});

// پاک کردن صف
router.post('/clear-queue', (req, res) => {
  try {
    resourceManager.clearQueue();
    res.json({
      success: true,
      message: 'Queue cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear queue',
      details: error.message
    });
  }
});

module.exports = router;
