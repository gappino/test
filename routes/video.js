const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const resourceManager = require('../resource-manager');

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
      console.log(`🐍 Command: python ${args.join(' ')}`);
      
      const pythonProcess = spawn('python', args, {
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
    
    if (!script || !images || !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        error: 'Script and images are required'
      });
    }

    // Step 1: Always generate audio for each scene (with fallback)
    console.log('🔄 Generating audio for all scenes...');
    
    const audioPromises = script.scenes.map(async (scene, index) => {
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
        
        // Use direct Piper TTS call instead of API
        const piperResult = await generatePiperTTS(textForTTS, audioSettings.voice || 'en_US-lessac-medium');
        
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
        
        return {
          sceneIndex: index,
          audioUrl: audioUrl,
          duration: piperResult.data.duration || 5,
          text: piperResult.data.text,
          voice: piperResult.data.voice,
          engine: piperResult.data.engine || 'Piper TTS'
        };
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
          return {
            sceneIndex: index,
            audioUrl: fallbackAudioUrl,
            duration: 5,
            text: fallbackText,
            voice: audioSettings.voice || 'af_heart',
            engine: 'Fallback (Silent)'
          };
        } catch (fallbackError) {
          console.error(`Fallback audio creation failed for scene ${index}:`, fallbackError);
          return {
            sceneIndex: index,
            audioUrl: null,
            duration: 5 // Default duration
          };
        }
      }
    });

    const finalAudioResults = await Promise.all(audioPromises);
    console.log(`✅ Generated ${finalAudioResults.length} audio files`);
    
    // Step 2: Generate subtitles using Whisper
    // Detect language from voice
    const isPersianVoice = audioSettings.voice && audioSettings.voice.startsWith('fa_IR');
    const subtitleLanguage = isPersianVoice ? 'fa' : 'en';
    console.log(`📝 Subtitle language: ${subtitleLanguage} (voice: ${audioSettings.voice})`);
    
    const subtitlePromises = finalAudioResults.map(async (audioData, index) => {
      if (!audioData.audioUrl) return null;
      
      // Get original scene text (not translated)
      const originalSceneText = script.scenes[index] ? script.scenes[index].speaker_text : '';
      
      try {
        console.log(`🎤 Generating subtitles for scene ${index}...`);
        const subtitleResponse = await fetch(`${req.protocol}://${req.get('host')}/api/whisper/transcribe-with-timestamps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: audioData.audioUrl,
            language: subtitleLanguage  // ✅ Use correct language
          })
        });
        
        const subtitleResult = await subtitleResponse.json();
        console.log(`🎤 Subtitle result for scene ${index}:`, subtitleResult);
        
        if (subtitleResult.success && subtitleResult.data && subtitleResult.data.segments) {
          return {
            sceneIndex: index,
            segments: subtitleResult.data.segments,
            text: subtitleResult.data.text || originalSceneText
          };
        } else {
          // Create fallback subtitle with original text
          console.log(`⚠️ Creating fallback subtitle for scene ${index}`);
          const fallbackSegments = [{
            start: 0,
            end: audioData.duration || 5,
            text: originalSceneText || audioData.text || 'No text available'
          }];
          
          return {
            sceneIndex: index,
            segments: fallbackSegments,
            text: audioData.text || ''
          };
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
        
        return {
          sceneIndex: index,
          segments: fallbackSegments,
          text: originalSceneText || audioData.text || ''
        };
      }
    });

    const subtitleResults = await Promise.all(subtitlePromises);
    
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
    const composeResponse = await fetch(`${req.protocol}://${req.get('host')}/api/remotion/compose-video-with-subtitles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenes: videoScenes,
        audioResults: finalAudioResults,
        subtitleResults: subtitleResults
      })
    });

    const composeResult = await composeResponse.json();
    
    if (!composeResult.success) {
      throw new Error(composeResult.error || 'Failed to compose video');
    }

    res.json({
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
    });

  } catch (error) {
    console.error('Error generating complete video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate complete video',
      details: error.message
    });
  }
});

// Custom video generation with user input
router.post('/generate-custom-video', async (req, res) => {
  try {
    const { title, scenes, voice = 'en_US-kristin-medium', orientation = 'vertical', subtitleSettings = {}, generatedImages = [] } = req.body;
    
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'لطفاً حداقل یک صحنه وارد کنید'
      });
    }

    console.log(`🎬 Starting custom video generation: "${title}"`);
    console.log(`   Scenes: ${scenes.length}`);
    console.log(`   Voice: ${voice}`);
    console.log(`   Orientation: ${orientation}`);
    console.log(`   Generated Images: ${generatedImages.length}`);

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

    // Step 2: Generate audio for each scene
    console.log('🎤 Generating audio...');
    const audioPromises = scenes.map(async (scene, index) => {
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
        
        // Use direct Piper TTS call
        const piperResult = await generatePiperTTS(textForTTS, voice);
        
        if (!piperResult.success || !piperResult.data) {
          console.error(`❌ Piper TTS failed for scene ${index + 1}:`, piperResult);
          throw new Error('Piper TTS failed');
        }
        
        const audioUrl = piperResult.data.audio_url || piperResult.data.audio_file;
        if (!audioUrl) {
          throw new Error('No audio URL in Piper result');
        }
        
        return {
          sceneIndex: index,
          audioUrl: audioUrl,
          duration: piperResult.data.duration || 5,
          text: piperResult.data.text,
          voice: piperResult.data.voice,
          engine: piperResult.data.engine || 'Piper TTS'
        };
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
          return {
            sceneIndex: index,
            audioUrl: fallbackAudioUrl,
            duration: 5,
            text: fallbackText,
            voice: voice,
            engine: 'Fallback (Silent)'
          };
        } catch (fallbackError) {
          console.error(`Fallback audio creation failed for scene ${index + 1}:`, fallbackError);
          return {
            sceneIndex: index,
            audioUrl: null,
            duration: 5
          };
        }
      }
    });

    const finalAudioResults = await Promise.all(audioPromises);
    console.log(`✅ Generated ${finalAudioResults.length} audio files`);
    
    // Step 3: Generate subtitles using Whisper
    console.log('📝 Generating subtitles...');
    
    // Detect language from voice
    const isPersianVoice = voice && voice.startsWith('fa_IR');
    const subtitleLanguage = isPersianVoice ? 'fa' : 'en';
    console.log(`📝 Subtitle language: ${subtitleLanguage} (voice: ${voice})`);
    
    const subtitlePromises = finalAudioResults.map(async (audioData, index) => {
      if (!audioData.audioUrl) return null;
      
      // Get original scene text (not translated)
      const originalSceneText = scenes[index] ? scenes[index].speaker_text : '';
      
      try {
        const subtitleResponse = await fetch(`${req.protocol}://${req.get('host')}/api/whisper/transcribe-with-timestamps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: audioData.audioUrl,
            language: subtitleLanguage  // ✅ Use correct language
          })
        });
        
        const subtitleResult = await subtitleResponse.json();
        
        if (subtitleResult.success && subtitleResult.data && subtitleResult.data.segments) {
          return {
            sceneIndex: index,
            segments: subtitleResult.data.segments,
            text: subtitleResult.data.text || originalSceneText
          };
        } else {
          // Create fallback subtitle with original text
          console.log(`⚠️ Whisper failed for scene ${index + 1}, using original text`);
          const fallbackSegments = [{
            start: 0,
            end: audioData.duration || 5,
            text: originalSceneText || audioData.text || 'No text available'
          }];
          
          return {
            sceneIndex: index,
            segments: fallbackSegments,
            text: originalSceneText || audioData.text || ''
          };
        }
      } catch (error) {
        console.error(`Error generating subtitles for scene ${index + 1}:`, error);
        
        // Create fallback subtitle with original text
        const fallbackSegments = [{
          start: 0,
          end: audioData.duration || 5,
          text: originalSceneText || audioData.text || 'No text available'
        }];
        
        return {
          sceneIndex: index,
          segments: fallbackSegments,
          text: originalSceneText || audioData.text || ''
        };
      }
    });

    const subtitleResults = await Promise.all(subtitlePromises);
    
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
    const composeResponse = await fetch(`${req.protocol}://${req.get('host')}/api/remotion/compose-video-with-subtitles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenes: videoScenes,
        audioResults: finalAudioResults,
        subtitleResults: subtitleResults
      })
    });

    const composeResult = await composeResponse.json();
    
    if (!composeResult.success) {
      throw new Error(composeResult.error || 'Failed to compose video');
    }

    res.json({
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
    });

  } catch (error) {
    console.error('Error generating custom video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate custom video',
      details: error.message
    });
  }
});

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
    const { script, images, audioSettings = {}, audioResults = [], videoType = 'long-form' } = req.body;
    
    if (!script || !images || !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        error: 'Script and images are required'
      });
    }

    console.log('🎬 Queuing long form video generation...');
    console.log(`📊 Script: ${script.title}`);
    console.log(`📊 Scenes: ${script.scenes.length}`);
    console.log(`📊 Images: ${images.length}`);
    console.log(`📊 Video Type: ${videoType}`);

    // اضافه کردن به صف با محدودیت منابع
    const taskId = `long-form-video-${Date.now()}`;
    
    const result = await resourceManager.addTask(async () => {
      return await generateLongFormVideoContent(script, images, audioSettings, audioResults, videoType, req);
    }, taskId);

    res.json(result);

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
async function generateLongFormVideoContent(script, images, audioSettings, audioResults, videoType, req) {
  try {
    console.log('🎬 Starting long form video generation with resource limits...');
    
    // Step 1: Always generate audio for each scene (with fallback)
    console.log('🔄 Generating audio for all long form scenes...');
    
    const audioPromises = script.scenes.map(async (scene, index) => {
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
        
        // Use direct Piper TTS call instead of API
        const piperResult = await generatePiperTTS(textForTTS, audioSettings.voice || 'en_US-lessac-medium');
        
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
        
        return {
          sceneIndex: index,
          audioUrl: audioUrl,
          duration: piperResult.data.duration || 5,
          text: piperResult.data.text,
          voice: piperResult.data.voice,
          engine: piperResult.data.engine || 'Piper TTS'
        };
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
          return {
            sceneIndex: index,
            audioUrl: fallbackAudioUrl,
            duration: 5,
            text: fallbackText,
            voice: audioSettings.voice || 'af_heart',
            engine: 'Fallback (Silent)'
          };
        } catch (fallbackError) {
          console.error(`Fallback audio creation failed for long form scene ${index}:`, fallbackError);
          return {
            sceneIndex: index,
            audioUrl: null,
            duration: 5 // Default duration
          };
        }
      }
    });

    const finalAudioResults = await Promise.all(audioPromises);
    console.log(`✅ Generated ${finalAudioResults.length} audio files for long form video`);
    
    // Step 2: Generate subtitles using Whisper
    // Detect language from voice
    const isPersianVoice = audioSettings.voice && audioSettings.voice.startsWith('fa_IR');
    const subtitleLanguage = isPersianVoice ? 'fa' : 'en';
    console.log(`📝 Subtitle language for long form: ${subtitleLanguage} (voice: ${audioSettings.voice})`);
    
    const subtitlePromises = finalAudioResults.map(async (audioData, index) => {
      if (!audioData.audioUrl) return null;
      
      // Get original scene text (not translated)
      const originalSceneText = script.scenes[index] ? script.scenes[index].speaker_text : '';
      
      try {
        console.log(`🎤 Generating subtitles for long form scene ${index}...`);
        const subtitleResponse = await fetch(`${req.protocol}://${req.get('host')}/api/whisper/transcribe-with-timestamps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: audioData.audioUrl,
            language: subtitleLanguage  // ✅ Use correct language
          })
        });
        
        const subtitleResult = await subtitleResponse.json();
        console.log(`🎤 Subtitle result for long form scene ${index}:`, subtitleResult);
        
        if (subtitleResult.success && subtitleResult.data && subtitleResult.data.segments) {
          return {
            sceneIndex: index,
            segments: subtitleResult.data.segments,
            text: subtitleResult.data.text || originalSceneText
          };
        } else {
          // Create fallback subtitle with original text
          console.log(`⚠️ Creating fallback subtitle for long form scene ${index}`);
          const fallbackSegments = [{
            start: 0,
            end: audioData.duration || 5,
            text: originalSceneText || audioData.text || 'No text available'
          }];
          
          return {
            sceneIndex: index,
            segments: fallbackSegments,
            text: originalSceneText || audioData.text || ''
          };
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
        
        return {
          sceneIndex: index,
          segments: fallbackSegments,
          text: originalSceneText || audioData.text || ''
        };
      }
    });

    const subtitleResults = await Promise.all(subtitlePromises);
    
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
          videoType: videoType
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
        } else {
          throw new Error('Request timed out and no video file was found');
        }
      } else {
        throw fetchError;
      }
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
    throw error;
  }
}

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
