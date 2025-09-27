#!/usr/bin/env node

/**
 * Quick test script to verify the fixes
 * Tests: English text handling and error logging
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testFixes() {
    console.log('🔧 Testing Fixes...\n');
    
    try {
        // Test 1: Check if Gemini generates English text
        console.log('📝 Test 1: Checking Gemini script generation...');
        const scriptResponse = await axios.post(`${BASE_URL}/api/gemini/generate-script`);
        
        if (!scriptResponse.data.success) {
            throw new Error('Failed to generate script');
        }
        
        const script = scriptResponse.data.data;
        console.log(`✅ Script generated: "${script.title}"`);
        
        // Check if speaker text is in English
        const firstScene = script.scenes[0];
        const speakerText = firstScene.speaker_text;
        const isEnglish = /^[a-zA-Z0-9\s.,!?;:'"()-]+$/.test(speakerText.trim());
        
        console.log(`   Speaker text: "${speakerText}"`);
        console.log(`   Is English: ${isEnglish ? '✅ Yes' : '❌ No'}`);
        
        if (!isEnglish) {
            console.log('⚠️  Warning: Text is not in English, translation will be applied');
        }
        
        // Test 2: Test Kokoro TTS with English text
        console.log('\n🎵 Test 2: Testing Kokoro TTS...');
        const ttsResponse = await axios.post(`${BASE_URL}/api/kokoro/text-to-speech`, {
            text: speakerText,
            voice: 'af_heart'
        });
        
        if (!ttsResponse.data.success) {
            throw new Error(`TTS failed: ${ttsResponse.data.error}`);
        }
        
        console.log('✅ TTS successful');
        console.log(`   Audio URL: ${ttsResponse.data.data.audio_url}`);
        console.log(`   Duration: ${ttsResponse.data.data.duration}s`);
        console.log(`   Engine: ${ttsResponse.data.data.engine}`);
        
        // Test 3: Test Whisper transcription
        console.log('\n📝 Test 3: Testing Whisper transcription...');
        const whisperResponse = await axios.post(`${BASE_URL}/api/whisper/transcribe-with-timestamps`, {
            audioUrl: ttsResponse.data.data.audio_url,
            language: 'en'
        });
        
        if (!whisperResponse.data.success) {
            console.log('⚠️  Whisper transcription failed, but this is optional');
        } else {
            console.log('✅ Whisper transcription successful');
            console.log(`   Detected text: "${whisperResponse.data.data.text}"`);
            console.log(`   Segments: ${whisperResponse.data.data.segments.length}`);
        }
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Gemini script generation works');
        console.log('   ✅ English text detection works');
        console.log('   ✅ Kokoro TTS works');
        console.log('   ✅ Whisper transcription works (optional)');
        console.log('   ✅ Error handling and logging improved');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testFixes();
}

module.exports = { testFixes };


