#!/usr/bin/env node

/**
 * Comprehensive API key test with multiple models
 */

async function callGeminiAPI(prompt, model = 'gemini-pro') {
    const apiKey = 'AIzaSyDGpIKaSSqiimWgqWPqkhgsvUEm4BY2yb4';
    
    console.log(`🔑 Testing model: ${model}`);
    console.log(`📏 API Key: ${apiKey.substring(0, 10)}...`);
    
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
            maxOutputTokens: 1024,
        }
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log(`📥 Response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ Error: ${response.status}`);
            console.log(`📄 Error details: ${errorText.substring(0, 200)}...`);
            return { success: false, error: `${response.status} - ${errorText}` };
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.log('❌ Invalid response structure');
            return { success: false, error: 'Invalid response structure' };
        }
        
        const text = data.candidates[0].content.parts[0].text;
        console.log(`✅ SUCCESS! Response length: ${text.length}`);
        console.log(`📄 Response preview: ${text.substring(0, 200)}...`);
        
        return { success: true, text: text };
        
    } catch (error) {
        console.log(`❌ Network error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testComprehensive() {
    console.log('🤖 Comprehensive Gemini API Test\n');
    
    const models = [
        'gemini-pro',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-2.0-flash',
        'gemini-2.5-flash'
    ];
    
    const prompt = 'Hello, this is a test. Please respond with "API working".';
    
    let workingModel = null;
    
    for (const model of models) {
        console.log(`\n📝 Testing ${model}...`);
        console.log('─'.repeat(50));
        
        const result = await callGeminiAPI(prompt, model);
        
        if (result.success) {
            console.log(`🎉 ${model} is working!`);
            workingModel = model;
            break;
        } else {
            console.log(`❌ ${model} failed: ${result.error}`);
        }
    }
    
    if (workingModel) {
        console.log(`\n✅ SUCCESS! Working model found: ${workingModel}`);
        console.log('💡 You can use this model in your application');
        
        // Test with a more complex prompt
        console.log('\n🧪 Testing with complex prompt...');
        const complexPrompt = `Create a short video script about AI technology. Return JSON:
{
  "title": "Test Video",
  "scenes": [
    {
      "scene_number": 1,
      "speaker_text": "Hello world",
      "visual_description": "Test scene"
    }
  ]
}`;
        
        const complexResult = await callGeminiAPI(complexPrompt, workingModel);
        if (complexResult.success) {
            console.log('✅ Complex prompt also works!');
            try {
                const jsonData = JSON.parse(complexResult.text);
                console.log('✅ JSON parsing successful!');
                console.log('📊 Generated data:', {
                    title: jsonData.title,
                    scenesCount: jsonData.scenes?.length || 0
                });
            } catch (parseError) {
                console.log('⚠️ JSON parsing failed, but API call was successful');
            }
        }
        
        return true;
    } else {
        console.log('\n❌ All models failed');
        console.log('💡 Possible issues:');
        console.log('   - API key is invalid or expired');
        console.log('   - Generative Language API is not enabled');
        console.log('   - Billing account not set up');
        console.log('   - IP restrictions');
        console.log('   - Rate limiting');
        
        return false;
    }
}

// Run the comprehensive test
if (require.main === module) {
    testComprehensive().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testComprehensive };



