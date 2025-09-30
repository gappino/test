#!/usr/bin/env node

/**
 * Debug Gemini API issues
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function debugAPI() {
    console.log('🔍 Debugging Gemini API Issues...\n');
    
    const apiKey = 'ZCwJHrTiIxiYyee3ELoZsUwcPYV986q9PYu4zAGPIfklu00z2vzg9hOt';
    
    console.log('🔑 API Key:', apiKey);
    console.log('📏 API Key Length:', apiKey.length);
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Test with a very simple request
        console.log('\n📝 Testing with gemini-1.5-flash...');
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Very simple test
        const result = await model.generateContent("Hello");
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ SUCCESS!');
        console.log('📄 Response:', text);
        
    } catch (error) {
        console.log('❌ Error details:');
        console.log('Message:', error.message);
        console.log('Stack:', error.stack);
        
        // Check if it's a network issue
        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            console.log('🌐 This looks like a network connectivity issue');
        } else if (error.message.includes('403')) {
            console.log('🔑 This is definitely an API key permission issue');
            console.log('💡 Possible causes:');
            console.log('   - API key is invalid or expired');
            console.log('   - API key doesn\'t have permission for Gemini API');
            console.log('   - Billing account not set up');
            console.log('   - API not enabled for this project');
        } else if (error.message.includes('401')) {
            console.log('🔐 Authentication failed - API key is definitely wrong');
        } else if (error.message.includes('429')) {
            console.log('💳 Rate limit exceeded');
        }
    }
}

debugAPI();



