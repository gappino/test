const express = require('express');
const router = express.Router();

// Pure Gemini API integration - no fallbacks, only real AI
async function callGeminiAPI(prompt, model = 'gemini-2.0-flash') {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    
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
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
    }
    
    return data.candidates[0].content.parts[0].text;
}

// Generate video script
router.post('/generate-script', async (req, res) => {
    try {
        console.log('🤖 Calling Pure Gemini API for script generation...');
        
        const prompt = `Create a viral Technology & AI video script that reveals cutting-edge developments, hidden features, or game-changing applications. Focus on practical benefits viewers can use immediately. Include surprising insights about how AI is transforming daily life, work productivity, or future possibilities. Target tech enthusiasts and early adopters who want to stay ahead of trends.

IMPORTANT: All speaker_text must be in English only. Do not use any other language.

Please provide the response in the following JSON format:
{
  "title": "Video Title",
  "description": "Brief description of the video",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-5 seconds",
      "speaker_text": "What the narrator says",
      "visual_description": "What should be shown on screen",
      "image_prompt": "Detailed description for image generation"
    }
  ],
  "total_duration": "60 seconds",
  "target_audience": "tech enthusiasts and early adopters"
}`;
        
        const response = await callGeminiAPI(prompt);
        console.log('✅ Received response from Gemini');
        console.log('📄 Response length:', response.length);
        console.log('📄 Response preview:', response.substring(0, 200) + '...');
        
        // Parse JSON response
        const scriptData = JSON.parse(response);
        console.log('✅ Successfully parsed JSON from Gemini');
        console.log('📊 Generated script:', {
            title: scriptData.title,
            scenesCount: scriptData.scenes ? scriptData.scenes.length : 0,
            totalDuration: scriptData.total_duration
        });
        
        res.json({
            success: true,
            data: scriptData
        });
        
    } catch (error) {
        console.error('❌ Error generating script with Gemini:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate video script',
            details: error.message
        });
    }
});

// Generate image prompt
router.post('/generate-image-prompt', async (req, res) => {
    try {
        const { visual_description } = req.body;
        
        if (!visual_description) {
            return res.status(400).json({
                success: false,
                error: 'Visual description is required'
            });
        }
        
        console.log('🤖 Calling Pure Gemini API for image prompt generation...');
        console.log('📝 Visual description:', visual_description);
        
        const prompt = `You are an AI image‑prompt creation expert. Please create a post using the following JSON format:

AI Image Generation Prompt Guidelines:
Objective
Create highly realistic, high‐quality images
Ensure the image content faithfully conveys the spirit of the original text
Integrate short text (10–20 characters) naturally into the image
Maintain consistency and professionalism

Standard Prompt Structure
[Main Scene] | [Key Elements] | [Text Integration] | [Lighting & Atmosphere] | [Technical Parameters] | [Style Parameters]

Component Breakdown
1. Main Scene (Weight ::8)
Describe the primary setting in line with the content.
Examples:
Tech news: "modern tech office setting, minimalist workspace"
Economy news: "professional financial district, corporate environment"
Education news: "modern classroom, advanced learning environment"

2. Key Elements (Weight ::8)
List the main visual elements required.
Examples:
"large HD display showing text 'AI Ethics' in modern typography"
"professional people in business attire discussing around interactive screen"
"detailed infographic elements floating in augmented reality style"

3. Text Integration (Weight ::7)
How to display text within the image:
text elements | elegant typography, clear readable text, integrated naturally into scene ::7

4. Lighting & Atmosphere (Weight ::7)
lighting | cinematic dramatic lighting, natural ambient light, professional studio setup ::7
background | depth of field blur, clean professional environment ::6

5. Technical Parameters
parameters | 8k resolution, hyperrealistic, photorealistic quality, octane render, cinematic composition --ar 9:16
settings | sharp focus, high detail, professional photography --s 1000 --q 2

The structure is:
{
  "prompt_image": {
    "prompt": "generated prompt here"
  }
}

Based on this visual description: ${visual_description}`;
        
        const response = await callGeminiAPI(prompt);
        console.log('✅ Received image prompt response from Gemini');
        console.log('📄 Response length:', response.length);
        console.log('📄 Response preview:', response.substring(0, 200) + '...');
        
        // Parse JSON response
        const imagePromptData = JSON.parse(response);
        console.log('✅ Successfully parsed image prompt JSON from Gemini');
        console.log('🎨 Generated prompt:', imagePromptData.prompt_image?.prompt?.substring(0, 100) + '...');
        
        res.json({
            success: true,
            data: imagePromptData
        });
        
    } catch (error) {
        console.error('❌ Error generating image prompt with Gemini:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate image prompt',
            details: error.message
        });
    }
});

// Generate YouTube niche suggestions based on user idea
router.post('/generate-niches', async (req, res) => {
    try {
        const { userIdea } = req.body;
        
        if (!userIdea) {
            return res.status(400).json({
                success: false,
                error: 'User idea is required'
            });
        }
        
        console.log('🤖 Calling Pure Gemini API for niche generation...');
        console.log('💡 User idea:', userIdea);
        
        const prompt = `Based on the user's idea: "${userIdea}"

Generate 5 popular YouTube niches that are related to this idea and have high potential for viral content. Each niche should be trendy, engaging, and suitable for YouTube monetization.

Provide the response in the following JSON format:
{
  "niches": [
    {
      "id": 1,
      "title": "Niche Title",
      "description": "Brief description of why this niche is popular",
      "potential_views": "Estimated view potential",
      "target_audience": "Main audience demographic",
      "content_style": "Type of content that works best"
    }
  ]
}

Focus on niches that are:
- Currently trending on YouTube
- Have high engagement potential
- Suitable for monetization
- Related to the user's original idea
- Appeal to broad audiences`;
        
        const response = await callGeminiAPI(prompt);
        console.log('✅ Received niche suggestions from Gemini');
        console.log('📄 Response length:', response.length);
        
        // Parse JSON response
        const nicheData = JSON.parse(response);
        console.log('✅ Successfully parsed niche JSON from Gemini');
        console.log('📊 Generated niches count:', nicheData.niches ? nicheData.niches.length : 0);
        
        res.json({
            success: true,
            data: nicheData
        });
        
    } catch (error) {
        console.error('❌ Error generating niches with Gemini:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate niche suggestions',
            details: error.message
        });
    }
});

// Generate YouTube content based on selected niche
router.post('/generate-content', async (req, res) => {
    try {
        const { selectedNiche, userIdea } = req.body;
        
        if (!selectedNiche || !userIdea) {
            return res.status(400).json({
                success: false,
                error: 'Selected niche and user idea are required'
            });
        }
        
        console.log('🤖 Calling Pure Gemini API for content generation...');
        console.log('🎯 Selected niche:', selectedNiche.title);
        console.log('💡 User idea:', userIdea);
        
        const prompt = `Create a complete YouTube video content based on:
- User's Original Idea: "${userIdea}"
- Selected Niche: "${selectedNiche.title}" - ${selectedNiche.description}
- Target Audience: ${selectedNiche.target_audience}
- Content Style: ${selectedNiche.content_style}

Create engaging YouTube content that combines the user's idea with the selected niche. The content should be viral-worthy and optimized for the target audience.

CRITICAL REQUIREMENTS:
1. All speaker_text (narrator voice) must be in ENGLISH only
2. All image_prompt descriptions must be in ENGLISH only
3. Create exactly 10 scenes minimum for the video
4. Each image prompt must be highly detailed and specific to match the narrator text
5. Images must be perfectly synchronized with the narrator content
6. Content must be engaging and suitable for YouTube monetization

Provide the response in the following JSON format:
{
  "title": "Engaging YouTube Video Title",
  "description": "SEO-optimized video description",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "estimated_duration": "60-90 seconds",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-6 seconds",
      "speaker_text": "English narrator text that hooks the viewer",
      "visual_description": "What should be shown on screen",
      "image_prompt": "Extremely detailed English prompt for image generation that matches the speaker text perfectly"
    }
  ],
  "target_audience": "${selectedNiche.target_audience}",
  "monetization_potential": "High/Medium/Low with explanation"
}

Make sure:
- The content flows naturally from scene to scene
- Each image prompt creates visuals that perfectly match what the narrator is saying
- The video tells a complete story related to the user's idea
- All text is in English for international audience appeal
- Content is engaging from the first second to maximize retention`;
        
        const response = await callGeminiAPI(prompt);
        console.log('✅ Received content from Gemini');
        console.log('📄 Response length:', response.length);
        
        // Parse JSON response
        const contentData = JSON.parse(response);
        console.log('✅ Successfully parsed content JSON from Gemini');
        console.log('📊 Generated content:', {
            title: contentData.title,
            scenesCount: contentData.scenes ? contentData.scenes.length : 0,
            duration: contentData.estimated_duration
        });
        
        res.json({
            success: true,
            data: contentData
        });
        
    } catch (error) {
        console.error('❌ Error generating content with Gemini:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate content',
            details: error.message
        });
    }
});

module.exports = router;

