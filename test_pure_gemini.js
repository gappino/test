#!/usr/bin/env node

/**
 * Test Pure Gemini API with direct fetch calls
 */

async function callGeminiAPI(prompt, model = 'gemini-2.0-flash') {
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDGpIKaSSqiimWgqWPqkhgsvUEm4BY2yb4';
    
    console.log('🔑 Using API Key:', apiKey.substring(0, 10) + '...');
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: prompt
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
        }
    };
    
    console.log('📤 Sending request to:', url);
    console.log('📝 Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Error response body:', errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📄 Response data:', JSON.stringify(data, null, 2));
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
    }
    
    return data.candidates[0].content.parts[0].text;
}

async function testPureGemini() {
    console.log('🤖 Testing Pure Gemini API...\n');
    
    try {
        const prompt = `Create a short video script about "AI Technology Revolution" in English. Return only valid JSON:
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
        
        console.log('📝 Testing prompt:', prompt.substring(0, 100) + '...');
        
        const response = await callGeminiAPI(prompt);
        
        console.log('✅ SUCCESS!');
        console.log('📄 Response length:', response.length);
        console.log('📄 Response content:', response);
        
        // Try to parse JSON
        try {
            const jsonData = JSON.parse(response);
            console.log('✅ JSON parsed successfully!');
            console.log('📊 Generated content:', {
                title: jsonData.title,
                scenesCount: jsonData.scenes ? jsonData.scenes.length : 0,
                firstSceneText: jsonData.scenes?.[0]?.speaker_text
            });
        } catch (parseError) {
            console.log('⚠️ JSON parsing failed, but API call was successful');
            console.log('📄 Raw response:', response);
        }
        
        console.log('\n🎉 Pure Gemini API test successful!');
        return true;
        
    } catch (error) {
        console.error('\n❌ Pure Gemini API test failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testPureGemini().then(success => {
        if (success) {
            console.log('\n🎉 Pure Gemini API is working!');
            console.log('💡 You can now use the system with real AI content generation');
        } else {
            console.log('\n❌ Pure Gemini API test failed');
            console.log('💡 Please check your API key and network connection');
        }
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testPureGemini, callGeminiAPI };
