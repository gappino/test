#!/usr/bin/env node
/**
 * Simple test for Persian TTS functionality
 */

const axios = require('axios');

async function testPersianTTS() {
  try {
    console.log('🧪 Testing Persian TTS...');
    
    // Test the voices endpoint first
    console.log('📋 Getting available voices...');
    const voicesResponse = await axios.get('http://localhost:3004/api/kokoro/voices');
    const voices = voicesResponse.data.data.voices;
    const persianVoices = voices.filter(v => v.language === 'فارسی');
    
    console.log(`✅ Found ${persianVoices.length} Persian voices:`);
    persianVoices.forEach(voice => {
      console.log(`   - ${voice.name} (${voice.id})`);
    });
    
    if (persianVoices.length === 0) {
      console.log('❌ No Persian voices found!');
      return;
    }
    
    // Test Persian TTS
    console.log('\n🎤 Testing Persian TTS with first voice...');
    const testText = 'سلام! این یک تست صدا است.';
    const firstVoice = persianVoices[0].id;
    
    console.log(`   Text: ${testText}`);
    console.log(`   Voice: ${firstVoice}`);
    
    const ttsResponse = await axios.post('http://localhost:3004/api/kokoro/text-to-speech', {
      text: testText,
      voice: firstVoice
    });
    
    if (ttsResponse.data.success) {
      console.log('✅ Persian TTS successful!');
      console.log(`   Duration: ${ttsResponse.data.data.duration} seconds`);
      console.log(`   Audio URL: ${ttsResponse.data.data.audio_url}`);
    } else {
      console.log('❌ Persian TTS failed:', ttsResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

testPersianTTS();
