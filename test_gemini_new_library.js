#!/usr/bin/env node

/**
 * Test Gemini API with new library and models
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiNewLibrary() {
    console.log('🤖 Testing Gemini API with New Library...\n');
    
    // Test with a simple API key first
    const testApiKey = 'AIzaSyDGpIKaSSqiimWgqWPqkhgsvUEm4BY2yb4';
    
    try {
        console.log('🔑 Using test API key...');
        console.log('📏 API Key Length:', testApiKey.length);
        
        const genAI = new GoogleGenerativeAI(testApiKey);
        
        // Test different models in order of preference
        const models = [
            'gemini-2.5-flash',
            'gemini-1.5-flash', 
            'gemini-1.5-pro',
            'gemini-pro'
        ];
        
        for (const modelName of models) {
            console.log(`\n📝 Testing model: ${modelName}`);
            
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                
                const prompt = `Create a short video script about "AI Technology" in English. Return only valid JSON:
{
  "title": "Video Title",
  "description": "Brief description",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-5 seconds",
      "speaker_text": "English text here",
      "visual_description": "Visual description",
      "image_prompt": "Detailed image prompt"
    }
  ],
  "total_duration": "30 seconds",
  "target_audience": "tech enthusiasts"
}`;
                
                console.log('📤 Sending request...');
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                
                console.log('✅ SUCCESS!');
                console.log('📄 Response length:', text.length);
                console.log('📄 Response preview:', text.substring(0, 300) + '...');
                
                // Try to parse JSON
                try {
                    const jsonData = JSON.parse(text);
                    console.log('✅ JSON parsed successfully!');
                    console.log('📊 Generated content:', {
                        title: jsonData.title,
                        scenesCount: jsonData.scenes ? jsonData.scenes.length : 0,
                        firstSceneText: jsonData.scenes?.[0]?.speaker_text
                    });
                } catch (parseError) {
                    console.log('⚠️ JSON parsing failed, but API call was successful');
                    console.log('📄 Raw response:', text);
                }
                
                console.log(`🎉 Model ${modelName} is working perfectly!`);
                return true;
                
            } catch (modelError) {
                console.log(`❌ Model ${modelName} failed:`, modelError.message);
                
                // Check for specific error types
                if (modelError.message.includes('403')) {
                    console.log('🔑 API key permission issue');
                } else if (modelError.message.includes('404')) {
                    console.log('📝 Model not available');
                } else if (modelError.message.includes('quota')) {
                    console.log('💳 Quota/billing issue');
                } else if (modelError.message.includes('400')) {
                    console.log('📝 Bad request - model might not support this format');
                }
            }
        }
        
        console.log('\n❌ All models failed');
        return false;
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testGeminiNewLibrary().then(success => {
        if (success) {
            console.log('\n🎉 Gemini API is working with new library!');
            console.log('💡 You can now use the system with real AI content generation');
        } else {
            console.log('\n❌ Gemini API test failed');
            console.log('💡 Please get a valid API key from https://aistudio.google.com/');
        }
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testGeminiNewLibrary };

