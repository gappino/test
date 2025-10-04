const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { exec } = require('child_process');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Whisper API endpoint using Tiny Whisper
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    const audioPath = req.file.path;
    const { language = 'auto', model = 'tiny', subtitles = false, format = 'json' } = req.body;
    
    // Use Tiny Whisper for transcription
    const result = await transcribeWithTinyWhisper(audioPath, {
      language,
      model,
      subtitles: subtitles === 'true',
      format
    });

    // Clean up uploaded file
    await fs.remove(audioPath);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to transcribe audio',
        details: result.error
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error transcribing audio:', error);
    
    // Clean up file on error
    if (req.file) {
      await fs.remove(req.file.path).catch(console.error);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to transcribe audio',
      details: error.message
    });
  }
});

// Text to speech using Kokoro
router.post('/text-to-speech', async (req, res) => {
  try {
    const { text, voice = 'af_heart_0' } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    // Convert Persian text to English for TTS
    const englishText = await translateToEnglish(text);
    
    // Generate audio using Kokoro
    const audioId = Date.now();
    const audioDir = path.join(__dirname, '../uploads/audio');
    await fs.ensureDir(audioDir);
    
    // Call Python script for Kokoro TTS
    const result = await generateKokoroAudio(englishText, voice, audioDir);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // Convert WAV to MP3 for better compatibility
    const mp3Path = result.audio_file.replace('.wav', '.mp3');
    await convertWavToMp3(result.audio_file, mp3Path);
    
    // Store audio data
    const audioData = {
      id: audioId,
      text: englishText,
      originalText: text,
      voice: voice,
      duration: result.duration,
      filePath: mp3Path,
      createdAt: new Date()
    };
    
    // Store in memory
    if (!global.audioCache) {
      global.audioCache = new Map();
    }
    global.audioCache.set(audioId, audioData);
    console.log('Audio stored with ID:', audioId);
    console.log('Cache size:', global.audioCache.size);
    
    res.json({
      success: true,
      data: {
        audio_url: `/api/whisper/audio/${audioId}`,
        text: englishText,
        original_text: text,
        voice: voice,
        duration: result.duration,
        audio_id: audioId
      }
    });

  } catch (error) {
    console.error('Error generating speech:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate speech',
      details: error.message
    });
  }
});

// Generate audio using Kokoro Python script
async function generateKokoroAudio(text, voice, outputDir) {
  return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '..', 'pyttsx3_tts.py');
    const command = `python "${scriptPath}" "${text}" "${voice}" "${outputDir}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Python script error:', error);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.error('Python script stderr:', stderr);
      }
      
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (parseError) {
        console.error('Error parsing Python result:', parseError);
        console.error('Python output:', stdout);
        reject(parseError);
      }
    });
  });
}

// Convert WAV to MP3 using ffmpeg
async function convertWavToMp3(wavPath, mp3Path) {
  return new Promise((resolve, reject) => {
    ffmpeg(wavPath)
      .toFormat('mp3')
      .on('end', () => {
        // Clean up WAV file
        fs.remove(wavPath).catch(console.error);
        resolve();
      })
      .on('error', reject)
      .save(mp3Path);
  });
}

// Get audio duration using ffmpeg
function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        console.error('Error getting audio duration:', err);
        resolve(5); // Default duration
      } else {
        resolve(metadata.format.duration || 5);
      }
    });
  });
}

// Translate Persian text to English (mock implementation)
async function translateToEnglish(text) {
  // Mock translation - in production, use Google Translate API or similar
  const translations = {
    'آیا می‌دانستید که هوش مصنوعی در حال تغییر دنیای ما است؟': 'Did you know that artificial intelligence is changing our world?',
    'از تشخیص چهره تا تولید محتوا، AI همه جا حضور دارد': 'From face recognition to content generation, AI is everywhere',
    'اما آینده چه چیزی در انتظار ما است؟': 'But what does the future hold for us?',
    'هوش مصنوعی نه تنها کار ما را آسان‌تر می‌کند، بلکه فرصت‌های جدیدی ایجاد می‌کند': 'AI not only makes our work easier, but also creates new opportunities',
    'آماده‌اید برای آینده‌ای که هوش مصنوعی در آن حاکم است؟': 'Are you ready for a future where AI rules?'
  };
  
  return translations[text] || text; // Return original text if no translation found
}

// Serve audio files
router.get('/audio/:audioId', async (req, res) => {
  try {
    const { audioId } = req.params;
    
    // Try to find the audio file in the uploads directory
    const audioDir = path.join(__dirname, '../uploads/audio');
    const files = await fs.readdir(audioDir);
    
    // Look for any kokoro audio file (prefer MP3)
    let audioFile = files.find(file => file.includes('kokoro_audio') && file.endsWith('.mp3'));
    
    if (!audioFile) {
      audioFile = files.find(file => file.includes('kokoro_audio'));
    }
    
    console.log('Found audio file:', audioFile);
    
    if (!audioFile) {
      return res.status(404).json({
        success: false,
        error: 'Audio file not found'
      });
    }
    
    const audioPath = path.join(audioDir, audioFile);
    
    // Check if file exists
    if (!await fs.pathExists(audioPath)) {
      return res.status(404).json({
        success: false,
        error: 'Audio file not found'
      });
    }
    
    // Set headers for audio streaming based on file extension
    const ext = path.extname(audioFile).toLowerCase();
    let contentType = 'audio/mpeg';
    
    if (ext === '.wav') {
      contentType = 'audio/wav';
    } else if (ext === '.mp3') {
      contentType = 'audio/mpeg';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Stream the audio file
    const audioStream = fs.createReadStream(audioPath);
    audioStream.pipe(res);
    
    audioStream.on('error', (error) => {
      console.error('Error streaming audio:', error);
      res.status(500).json({
        success: false,
        error: 'Error streaming audio'
      });
    });
    
  } catch (error) {
    console.error('Error serving audio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve audio',
      details: error.message
    });
  }
});

// Get available voices
router.get('/voices', async (req, res) => {
  try {
    // Curated voices - Persian and selected English voices
    const voices = [
      // Persian voices (preserved)
      { id: 'fa_IR-amir-medium', name: 'امیر - صدای مرد فارسی', language: 'fa' },
      { id: 'fa_IR-ganji-medium', name: 'گنجی - صدای مرد فارسی', language: 'fa' },
      { id: 'fa_IR-ganji_adabi-medium', name: 'گنجی ادبی - صدای مرد فارسی', language: 'fa' },
      { id: 'fa_IR-gyro-medium', name: 'جیرو - صدای مرد فارسی', language: 'fa' },
      { id: 'fa_IR-reza_ibrahim-medium', name: 'رضا ابراهیم - صدای مرد فارسی', language: 'fa' },
      
      // English female voices (selected)
      { id: 'en_US-kristin-medium', name: 'Kristin Medium - Female Voice', language: 'en' },
      { id: 'en_US-lessac-high', name: 'Lessac High - Female Voice', language: 'en' },
      
      // English male voices (selected)
      { id: 'en_US-john-medium', name: 'John Medium - Male Voice', language: 'en' },
      { id: 'en_US-ryan-high', name: 'Ryan High - Male Voice', language: 'en' },
      { id: 'en_US-norman-medium', name: 'Norman Medium - Male Voice', language: 'en' },
      { id: 'en_US-kusal-medium', name: 'Kusal Medium - Male Voice', language: 'en' }
    ];

    res.json({
      success: true,
      data: voices
    });

  } catch (error) {
    console.error('Error getting voices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get voices',
      details: error.message
    });
  }
});

// Tiny Whisper integration function
async function transcribeWithTinyWhisper(audioPath, options = {}) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', 'tiny_whisper.py');
    const { language = 'auto', model = 'tiny', subtitles = false, format = 'json' } = options;
    
    let command = `python "${scriptPath}" "${audioPath}" --model ${model} --language ${language} --format ${format}`;
    
    if (subtitles) {
      command += ' --subtitles';
    }
    
    console.log('Running Tiny Whisper command:', command);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Tiny Whisper error:', error);
        console.error('stderr:', stderr);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.error('Tiny Whisper stderr:', stderr);
      }
      
      try {
        // Extract JSON from output (remove any non-JSON content)
        let jsonOutput = stdout.trim();
        
        // Find JSON content by looking for the first '{' and last '}'
        const firstBrace = jsonOutput.indexOf('{');
        const lastBrace = jsonOutput.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonOutput = jsonOutput.substring(firstBrace, lastBrace + 1);
        }
        
        const result = JSON.parse(jsonOutput);
        resolve(result);
      } catch (parseError) {
        console.error('Error parsing Tiny Whisper result:', parseError);
        console.error('Raw output:', stdout);
        reject(parseError);
      }
    });
  });
}

// Generate subtitles endpoint
router.post('/generate-subtitles', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    const audioPath = req.file.path;
    const { language = 'auto', model = 'tiny', format = 'srt' } = req.body;
    
    // Use Tiny Whisper for subtitle generation
    const result = await transcribeWithTinyWhisper(audioPath, {
      language,
      model,
      subtitles: true,
      format
    });

    // Clean up uploaded file
    await fs.remove(audioPath);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate subtitles',
        details: result.error
      });
    }

    // Set appropriate content type based on format
    let contentType = 'application/json';
    if (format === 'srt') {
      contentType = 'text/plain; charset=utf-8';
    } else if (format === 'vtt') {
      contentType = 'text/vtt; charset=utf-8';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="subtitles.${format}"`);
    
    if (format === 'json') {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.send(result.content);
    }

  } catch (error) {
    console.error('Error generating subtitles:', error);
    
    // Clean up file on error
    if (req.file) {
      await fs.remove(req.file.path).catch(console.error);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate subtitles',
      details: error.message
    });
  }
});

// Transcribe audio from URL with timestamps
router.post('/transcribe-with-timestamps', async (req, res) => {
  try {
    const { audioUrl, language = 'auto', model = 'tiny' } = req.body;
    
    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        error: 'Audio URL is required'
      });
    }

    // Download audio file from URL
    const tempDir = path.join(__dirname, '../temp');
    await fs.ensureDir(tempDir);
    const tempAudioPath = path.join(tempDir, `temp-audio-${Date.now()}.wav`);
    
    try {
      await downloadAudioFromUrl(audioUrl, tempAudioPath);
      
      // Use Tiny Whisper for transcription with timestamps
      const result = await transcribeWithTinyWhisper(tempAudioPath, {
        language,
        model,
        subtitles: false,
        format: 'json'
      });
      
      console.log('Whisper transcription result:', JSON.stringify(result, null, 2));

      // Clean up temporary file
      await fs.remove(tempAudioPath);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to transcribe audio',
          details: result.error
        });
      }

      res.json({
        success: true,
        data: {
          text: result.text,
          language: result.language,
          segments: result.segments || [],
          duration: result.duration
        }
      });

    } catch (downloadError) {
      console.error('Error downloading audio:', downloadError);
      res.status(500).json({
        success: false,
        error: 'Failed to download audio file',
        details: downloadError.message
      });
    }

  } catch (error) {
    console.error('Error transcribing audio with timestamps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transcribe audio',
      details: error.message
    });
  }
});

// Download audio from URL
async function downloadAudioFromUrl(audioUrl, outputPath) {
  const axios = require('axios');
  
  // تبدیل URL نسبی به کامل
  let fullAudioUrl = audioUrl;
  if (audioUrl.startsWith('/')) {
    fullAudioUrl = `http://localhost:${process.env.PORT || 3004}${audioUrl}`;
  }
  
  console.log(`📥 Downloading audio from: ${fullAudioUrl}`);
  
  try {
    const response = await axios.get(fullAudioUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ Audio downloaded to: ${outputPath}`);
        resolve(outputPath);
      });
      writer.on('error', (error) => {
        console.error(`❌ Error writing audio file: ${error}`);
        reject(error);
      });
    });
  } catch (error) {
    console.error(`❌ Error downloading audio from ${fullAudioUrl}:`, error);
    throw error;
  }
}

module.exports = router;
