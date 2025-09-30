#!/usr/bin/env node
/**
 * Debug script to check all available voices
 */

const axios = require('axios');

async function checkVoices() {
  try {
    console.log('🔍 Checking all available voices...');
    
    const voicesResponse = await axios.get('http://localhost:3004/api/kokoro/voices');
    const voices = voicesResponse.data.data.voices;
    
    console.log(`✅ Found ${voices.length} total voices:`);
    voices.forEach(voice => {
      console.log(`   - ${voice.name} (${voice.id}) - Language: ${voice.language}`);
    });
    
    const persianVoices = voices.filter(v => v.language === 'فارسی');
    console.log(`\n📋 Persian voices: ${persianVoices.length}`);
    
    const englishVoices = voices.filter(v => v.language === 'انگلیسی');
    console.log(`📋 English voices: ${englishVoices.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

checkVoices();

