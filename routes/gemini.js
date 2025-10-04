const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Video script generation prompt
const VIDEO_SCRIPT_PROMPT = `Create a viral Technology & AI video script that reveals cutting-edge developments, hidden features, or game-changing applications. Focus on practical benefits viewers can use immediately. Include surprising insights about how AI is transforming daily life, work productivity, or future possibilities. Target tech enthusiasts and early adopters who want to stay ahead of trends.

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

// Image prompt generation prompt
const IMAGE_PROMPT_PROMPT = `You are an AI image‑prompt creation expert. Please create a post using the following JSON format:

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

Based on this visual description: {visual_description}`;

// Generate video script
router.post('/generate-script', async (req, res) => {
  try {
    console.log('🤖 Calling real Gemini API for script generation...');
    
    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      throw new Error('Gemini API key not configured');
    }
    
    // Try gemini-2.0-flash first, fallback to gemini-1.5-pro if needed
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    } catch (modelError) {
      console.log('⚠️ gemini-2.0-flash not available, using gemini-1.5-pro');
      model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }
    console.log('📝 Sending prompt to Gemini...');
    
    const result = await model.generateContent(VIDEO_SCRIPT_PROMPT);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Received response from Gemini');
    console.log('📄 Raw response length:', text.length);
    console.log('📄 Raw response preview:', text.substring(0, 200) + '...');
    
    // Try to parse JSON response
    let scriptData;
    try {
      scriptData = JSON.parse(text);
      console.log('✅ Successfully parsed JSON response from Gemini');
      console.log('📊 Generated script:', {
        title: scriptData.title,
        scenesCount: scriptData.scenes ? scriptData.scenes.length : 0,
        totalDuration: scriptData.total_duration
      });
    } catch (parseError) {
      console.error('❌ Failed to parse JSON from Gemini response:', parseError);
      console.log('📄 Raw text that failed to parse:', text);
      
      // If JSON parsing fails, create a structured response
      scriptData = {
        title: "AI Technology Revolution",
        description: "Exploring cutting-edge AI developments",
        scenes: [
          {
            scene_number: 1,
            duration: "0-5 seconds",
            speaker_text: "Welcome to the future of AI technology",
            visual_description: "Futuristic AI interface with glowing elements",
            image_prompt: "Futuristic AI interface with glowing elements"
          }
        ],
        total_duration: "60 seconds",
        target_audience: "tech enthusiasts and early adopters"
      };
      console.log('⚠️ Using fallback script data');
    }
    
    res.json({
      success: true,
      data: scriptData
    });
    
  } catch (error) {
    console.error('❌ Error generating script with Gemini:', error);
    
    // Check if it's a quota error
    if (error.message.includes('quota') || error.message.includes('429')) {
      console.log('⚠️ Gemini quota exceeded, using fallback script');
      console.log('💡 To fix this: Get a new API key from https://aistudio.google.com/');
      
      // Use fallback script when quota is exceeded
      const fallbackScript = {
        title: "AI Technology Revolution",
        description: "Exploring cutting-edge AI developments",
        scenes: [
          {
            scene_number: 1,
            duration: "0-5 seconds",
            speaker_text: "Welcome to the future of AI technology",
            visual_description: "Futuristic AI interface with glowing elements",
            image_prompt: "Futuristic AI interface with glowing elements"
          },
          {
            scene_number: 2,
            duration: "5-10 seconds",
            speaker_text: "AI is transforming every industry",
            visual_description: "Modern workspace with AI tools and interfaces",
            image_prompt: "Modern workspace with AI tools and interfaces"
          },
          {
            scene_number: 3,
            duration: "10-15 seconds",
            speaker_text: "From healthcare to transportation",
            visual_description: "AI applications in various industries",
            image_prompt: "AI applications in various industries"
          },
          {
            scene_number: 4,
            duration: "15-20 seconds",
            speaker_text: "The future is here today",
            visual_description: "Visionary representation of AI future",
            image_prompt: "Visionary representation of AI future"
          },
          {
            scene_number: 5,
            duration: "20-25 seconds",
            speaker_text: "Are you ready for the AI revolution?",
            visual_description: "Call to action with AI technology",
            image_prompt: "Call to action with AI technology"
          }
        ],
        total_duration: "25 seconds",
        target_audience: "tech enthusiasts and early adopters"
      };
      
      res.json({
        success: true,
        data: fallbackScript
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate video script',
        details: error.message
      });
    }
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
    
    console.log('🤖 Calling real Gemini API for image prompt generation...');
    console.log('📝 Visual description:', visual_description);
    
    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      throw new Error('Gemini API key not configured');
    }
    
    // Try gemini-2.0-flash first, fallback to gemini-1.5-pro if needed
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    } catch (modelError) {
      console.log('⚠️ gemini-2.0-flash not available, using gemini-1.5-pro');
      model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }
    const prompt = IMAGE_PROMPT_PROMPT.replace('{visual_description}', visual_description);
    
    console.log('📝 Sending image prompt request to Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Received image prompt response from Gemini');
    console.log('📄 Raw response length:', text.length);
    console.log('📄 Raw response preview:', text.substring(0, 200) + '...');
    
    // Try to parse JSON response
    let imagePromptData;
    try {
      imagePromptData = JSON.parse(text);
      console.log('✅ Successfully parsed image prompt JSON from Gemini');
      console.log('🎨 Generated prompt:', imagePromptData.prompt_image?.prompt?.substring(0, 100) + '...');
    } catch (parseError) {
      console.error('❌ Failed to parse image prompt JSON from Gemini response:', parseError);
      console.log('📄 Raw text that failed to parse:', text);
      
      // If JSON parsing fails, create a fallback prompt
      imagePromptData = {
        prompt_image: {
          prompt: `modern tech office setting, minimalist workspace | large HD display showing text 'AI Tech' in modern typography, professional people in business attire discussing around interactive screen ::8 | elegant typography, clear readable text, integrated naturally into scene ::7 | cinematic dramatic lighting, natural ambient light, professional studio setup ::7 | 8k resolution, hyperrealistic, photorealistic quality, octane render, cinematic composition --ar 9:16 --s 1000 --q 2`
        }
      };
      console.log('⚠️ Using fallback image prompt data');
    }
    
    res.json({
      success: true,
      data: imagePromptData
    });
    
  } catch (error) {
    console.error('❌ Error generating image prompt with Gemini:', error);
    
    // Check if it's a quota error
    if (error.message.includes('quota') || error.message.includes('429')) {
      console.log('⚠️ Gemini quota exceeded, using fallback image prompt');
      console.log('💡 To fix this: Get a new API key from https://aistudio.google.com/');
      
      // Use fallback image prompt when quota is exceeded
      const fallbackImagePrompt = {
        prompt_image: {
          prompt: `modern tech office setting, minimalist workspace | large HD display showing text 'AI Tech' in modern typography, professional people in business attire discussing around interactive screen ::8 | elegant typography, clear readable text, integrated naturally into scene ::7 | cinematic dramatic lighting, natural ambient light, professional studio setup ::7 | 8k resolution, hyperrealistic, photorealistic quality, octane render, cinematic composition --ar 9:16 --s 1000 --q 2`
        }
      };
      
      res.json({
        success: true,
        data: fallbackImagePrompt
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate image prompt',
        details: error.message
      });
    }
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
    
    console.log('🤖 Calling Gemini 2.0 Flash for niche generation...');
    console.log('💡 User idea:', userIdea);
    
    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      throw new Error('Gemini API key not configured');
    }
    
    // Try gemini-2.0-flash first, fallback to gemini-1.5-pro if needed
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    } catch (modelError) {
      console.log('⚠️ gemini-2.0-flash not available, using gemini-1.5-pro');
      model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }
    
    const NICHE_GENERATION_PROMPT = `Based on the user's idea: "${userIdea}"

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
    
    console.log('📝 Sending niche generation request to Gemini...');
    const result = await model.generateContent(NICHE_GENERATION_PROMPT);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Received niche suggestions from Gemini');
    console.log('📄 Raw response length:', text.length);
    
    // Try to parse JSON response
    let nicheData;
    try {
      nicheData = JSON.parse(text);
      console.log('✅ Successfully parsed niche JSON from Gemini');
      console.log('📊 Generated niches count:', nicheData.niches ? nicheData.niches.length : 0);
    } catch (parseError) {
      console.error('❌ Failed to parse niche JSON from Gemini response:', parseError);
      console.log('📄 Raw text that failed to parse:', text);
      
      // If JSON parsing fails, create fallback niches
      nicheData = {
        niches: [
          {
            id: 1,
            title: "Tech Reviews & Tutorials",
            description: "In-depth reviews and tutorials about latest technology",
            potential_views: "High - Tech content consistently performs well",
            target_audience: "Tech enthusiasts, early adopters, professionals",
            content_style: "Educational, hands-on demonstrations"
          },
          {
            id: 2,
            title: "Lifestyle & Productivity Hacks",
            description: "Life optimization tips and productivity techniques",
            potential_views: "Very High - Evergreen content with broad appeal",
            target_audience: "Young professionals, students, entrepreneurs",
            content_style: "Quick tips, before/after, challenge videos"
          },
          {
            id: 3,
            title: "Entertainment & Pop Culture",
            description: "Trending topics, reactions, and cultural commentary",
            potential_views: "Extremely High - Viral potential",
            target_audience: "Gen Z, Millennials, pop culture fans",
            content_style: "Reactions, commentary, trend analysis"
          },
          {
            id: 4,
            title: "Educational Content",
            description: "Informative content that teaches valuable skills",
            potential_views: "High - Strong retention and sharing",
            target_audience: "Learners, students, professionals",
            content_style: "Step-by-step tutorials, explainer videos"
          },
          {
            id: 5,
            title: "Health & Wellness",
            description: "Fitness, mental health, and wellness tips",
            potential_views: "High - Growing market with engaged audience",
            target_audience: "Health-conscious individuals, fitness enthusiasts",
            content_style: "How-to guides, transformation stories"
          }
        ]
      };
      console.log('⚠️ Using fallback niche data');
    }
    
    res.json({
      success: true,
      data: nicheData
    });
    
  } catch (error) {
    console.error('❌ Error generating niches with Gemini:', error);
    
    // Check if it's an API key error
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      console.log('⚠️ API key error - using fallback niches');
      console.log('💡 Please check your Gemini API key at https://aistudio.google.com/');
      
      // Use fallback niches when API key is invalid
      const fallbackNiches = {
        niches: [
          {
            id: 1,
            title: "Tech Reviews & Tutorials",
            description: "In-depth reviews and tutorials about latest technology",
            potential_views: "High - Tech content consistently performs well",
            target_audience: "Tech enthusiasts, early adopters, professionals",
            content_style: "Educational, hands-on demonstrations"
          },
          {
            id: 2,
            title: "Lifestyle & Productivity Hacks",
            description: "Life optimization tips and productivity techniques",
            potential_views: "Very High - Evergreen content with broad appeal",
            target_audience: "Young professionals, students, entrepreneurs",
            content_style: "Quick tips, before/after, challenge videos"
          },
          {
            id: 3,
            title: "Entertainment & Pop Culture",
            description: "Trending topics, reactions, and cultural commentary",
            potential_views: "Extremely High - Viral potential",
            target_audience: "Gen Z, Millennials, pop culture fans",
            content_style: "Reactions, commentary, trend analysis"
          },
          {
            id: 4,
            title: "Educational Content",
            description: "Informative content that teaches valuable skills",
            potential_views: "High - Strong retention and sharing",
            target_audience: "Learners, students, professionals",
            content_style: "Step-by-step tutorials, explainer videos"
          },
          {
            id: 5,
            title: "Health & Wellness",
            description: "Fitness, mental health, and wellness tips",
            potential_views: "High - Growing market with engaged audience",
            target_audience: "Health-conscious individuals, fitness enthusiasts",
            content_style: "How-to guides, transformation stories"
          }
        ]
      };
      
      return res.json({
        success: true,
        data: fallbackNiches,
        message: 'Using demo niches - Please configure valid Gemini API key for personalized suggestions'
      });
    }
    
    // Check if it's a quota error
    if (error.message.includes('quota') || error.message.includes('429')) {
      console.log('⚠️ Gemini quota exceeded, using fallback niches');
      console.log('💡 To fix this: Get a new API key from https://aistudio.google.com/');
      
      // Use fallback niches when quota is exceeded
      const fallbackNiches = {
        niches: [
          {
            id: 1,
            title: "Tech Reviews & Tutorials",
            description: "In-depth reviews and tutorials about latest technology",
            potential_views: "High - Tech content consistently performs well",
            target_audience: "Tech enthusiasts, early adopters, professionals",
            content_style: "Educational, hands-on demonstrations"
          },
          {
            id: 2,
            title: "Lifestyle & Productivity Hacks",
            description: "Life optimization tips and productivity techniques",
            potential_views: "Very High - Evergreen content with broad appeal",
            target_audience: "Young professionals, students, entrepreneurs",
            content_style: "Quick tips, before/after, challenge videos"
          },
          {
            id: 3,
            title: "Entertainment & Pop Culture",
            description: "Trending topics, reactions, and cultural commentary",
            potential_views: "Extremely High - Viral potential",
            target_audience: "Gen Z, Millennials, pop culture fans",
            content_style: "Reactions, commentary, trend analysis"
          },
          {
            id: 4,
            title: "Educational Content",
            description: "Informative content that teaches valuable skills",
            potential_views: "High - Strong retention and sharing",
            target_audience: "Learners, students, professionals",
            content_style: "Step-by-step tutorials, explainer videos"
          },
          {
            id: 5,
            title: "Health & Wellness",
            description: "Fitness, mental health, and wellness tips",
            potential_views: "High - Growing market with engaged audience",
            target_audience: "Health-conscious individuals, fitness enthusiasts",
            content_style: "How-to guides, transformation stories"
          }
        ]
      };
      
      res.json({
        success: true,
        data: fallbackNiches
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate niche suggestions',
        details: error.message
      });
    }
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
    
    console.log('🤖 Calling Gemini 2.0 Flash for content generation...');
    console.log('🎯 Selected niche:', selectedNiche.title);
    console.log('💡 User idea:', userIdea);
    
    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      throw new Error('Gemini API key not configured');
    }
    
    // Try gemini-2.0-flash first, fallback to gemini-1.5-pro if needed
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    } catch (modelError) {
      console.log('⚠️ gemini-2.0-flash not available, using gemini-1.5-pro');
      model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }
    
    const CONTENT_GENERATION_PROMPT = `Create a complete YouTube video content based on:
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
    
    console.log('📝 Sending content generation request to Gemini...');
    const result = await model.generateContent(CONTENT_GENERATION_PROMPT);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Received content from Gemini');
    console.log('📄 Raw response length:', text.length);
    
    // Try to parse JSON response
    let contentData;
    try {
      contentData = JSON.parse(text);
      console.log('✅ Successfully parsed content JSON from Gemini');
      console.log('📊 Generated content:', {
        title: contentData.title,
        scenesCount: contentData.scenes ? contentData.scenes.length : 0,
        duration: contentData.estimated_duration
      });
    } catch (parseError) {
      console.error('❌ Failed to parse content JSON from Gemini response:', parseError);
      console.log('📄 Raw text that failed to parse:', text);
      
      // If JSON parsing fails, create structured fallback content
      contentData = {
        title: `${selectedNiche.title}: ${userIdea}`,
        description: `Discover amazing insights about ${userIdea} in this engaging ${selectedNiche.title.toLowerCase()} video`,
        tags: ["viral", "trending", "youtube", "content", "engaging"],
        estimated_duration: "60 seconds",
        scenes: [
          {
            scene_number: 1,
            duration: "0-6 seconds",
            speaker_text: "Welcome to an amazing discovery that will change everything you know",
            visual_description: "Eye-catching opening with dynamic text and visuals",
            image_prompt: "Dynamic opening scene with bold text overlay 'AMAZING DISCOVERY' in modern typography, vibrant colors, professional studio lighting, high-tech background with glowing elements, 8k resolution, cinematic composition --ar 9:16"
          },
          {
            scene_number: 2,
            duration: "6-12 seconds",
            speaker_text: "Today we're exploring something incredible that most people don't know about",
            visual_description: "Mysterious and intriguing visuals related to the topic",
            image_prompt: "Mysterious and intriguing scene showing hidden knowledge, professional person pointing at holographic display, futuristic interface, dramatic lighting, high-tech environment, photorealistic quality --ar 9:16"
          },
          {
            scene_number: 3,
            duration: "12-18 seconds",
            speaker_text: "This breakthrough has been changing lives across the world",
            visual_description: "Global impact visualization with world map and connections",
            image_prompt: "World map with glowing connection points, global network visualization, modern infographic style, professional presentation, clean design, high-tech overlay, cinematic lighting --ar 9:16"
          },
          {
            scene_number: 4,
            duration: "18-24 seconds",
            speaker_text: "Scientists and experts have been studying this phenomenon for years",
            visual_description: "Professional research environment with experts working",
            image_prompt: "Modern research laboratory with scientists working, professional equipment, clean white environment, focused researchers, high-tech displays showing data, professional photography --ar 9:16"
          },
          {
            scene_number: 5,
            duration: "24-30 seconds",
            speaker_text: "The results they discovered will absolutely shock you",
            visual_description: "Dramatic reveal with shocking statistics and data",
            image_prompt: "Dramatic data visualization with shocking statistics, bold numbers floating in 3D space, professional infographic design, vibrant colors, modern typography, cinematic presentation --ar 9:16"
          },
          {
            scene_number: 6,
            duration: "30-36 seconds",
            speaker_text: "But here's what makes this even more incredible",
            visual_description: "Building suspense with intriguing visuals",
            image_prompt: "Suspenseful scene with dramatic lighting, professional presenter gesturing, modern studio setup, high-tech background, mysterious atmosphere, cinematic quality --ar 9:16"
          },
          {
            scene_number: 7,
            duration: "36-42 seconds",
            speaker_text: "This technology is now available to everyone",
            visual_description: "Accessibility and availability demonstration",
            image_prompt: "Diverse group of people using technology, modern devices, inclusive representation, professional environment, natural lighting, contemporary setting, high-quality photography --ar 9:16"
          },
          {
            scene_number: 8,
            duration: "42-48 seconds",
            speaker_text: "And the best part is how simple it is to get started",
            visual_description: "Simple step-by-step process visualization",
            image_prompt: "Clean step-by-step infographic, numbered process, minimalist design, professional presentation, easy-to-follow visual guide, modern typography, bright lighting --ar 9:16"
          },
          {
            scene_number: 9,
            duration: "48-54 seconds",
            speaker_text: "Thousands of people are already experiencing amazing results",
            visual_description: "Success stories and positive outcomes",
            image_prompt: "Happy successful people celebrating, positive expressions, diverse group, professional photography, natural lighting, modern environment, authentic emotions --ar 9:16"
          },
          {
            scene_number: 10,
            duration: "54-60 seconds",
            speaker_text: "Don't miss out on this incredible opportunity - start your journey today",
            visual_description: "Strong call-to-action with engaging final message",
            image_prompt: "Powerful call-to-action scene with motivational text 'START TODAY', professional presenter, confident pose, modern studio, dramatic lighting, inspiring atmosphere, high-quality production --ar 9:16"
          }
        ],
        target_audience: selectedNiche.target_audience,
        monetization_potential: "High - Engaging content with strong call-to-action and broad appeal"
      };
      console.log('⚠️ Using fallback content data');
    }
    
    res.json({
      success: true,
      data: contentData
    });
    
  } catch (error) {
    console.error('❌ Error generating content with Gemini:', error);
    
    // Check if it's an API key error
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      console.log('⚠️ API key error - using fallback content');
      console.log('💡 Please check your Gemini API key at https://aistudio.google.com/');
      
      // Use fallback content when API key is invalid
      const fallbackContent = {
        title: `${selectedNiche.title}: ${userIdea}`,
        description: `Discover amazing insights about ${userIdea} in this engaging ${selectedNiche.title.toLowerCase()} video`,
        tags: ["viral", "trending", "youtube", "content", "engaging"],
        estimated_duration: "60 seconds",
        scenes: [
          {
            scene_number: 1,
            duration: "0-6 seconds",
            speaker_text: "Welcome to an amazing discovery that will change everything you know",
            visual_description: "Eye-catching opening with dynamic text and visuals",
            image_prompt: "Dynamic opening scene with bold text overlay 'AMAZING DISCOVERY' in modern typography, vibrant colors, professional studio lighting, high-tech background with glowing elements, 8k resolution, cinematic composition --ar 9:16"
          },
          {
            scene_number: 2,
            duration: "6-12 seconds",
            speaker_text: "Today we're exploring something incredible that most people don't know about",
            visual_description: "Mysterious and intriguing visuals related to the topic",
            image_prompt: "Mysterious and intriguing scene showing hidden knowledge, professional person pointing at holographic display, futuristic interface, dramatic lighting, high-tech environment, photorealistic quality --ar 9:16"
          },
          {
            scene_number: 3,
            duration: "12-18 seconds",
            speaker_text: "This breakthrough has been changing lives across the world",
            visual_description: "Global impact visualization with world map and connections",
            image_prompt: "World map with glowing connection points, global network visualization, modern infographic style, professional presentation, clean design, high-tech overlay, cinematic lighting --ar 9:16"
          },
          {
            scene_number: 4,
            duration: "18-24 seconds",
            speaker_text: "Scientists and experts have been studying this phenomenon for years",
            visual_description: "Professional research environment with experts working",
            image_prompt: "Modern research laboratory with scientists working, professional equipment, clean white environment, focused researchers, high-tech displays showing data, professional photography --ar 9:16"
          },
          {
            scene_number: 5,
            duration: "24-30 seconds",
            speaker_text: "The results they discovered will absolutely shock you",
            visual_description: "Dramatic reveal with shocking statistics and data",
            image_prompt: "Dramatic data visualization with shocking statistics, bold numbers floating in 3D space, professional infographic design, vibrant colors, modern typography, cinematic presentation --ar 9:16"
          },
          {
            scene_number: 6,
            duration: "30-36 seconds",
            speaker_text: "But here's what makes this even more incredible",
            visual_description: "Building suspense with intriguing visuals",
            image_prompt: "Suspenseful scene with dramatic lighting, professional presenter gesturing, modern studio setup, high-tech background, mysterious atmosphere, cinematic quality --ar 9:16"
          },
          {
            scene_number: 7,
            duration: "36-42 seconds",
            speaker_text: "This technology is now available to everyone",
            visual_description: "Accessibility and availability demonstration",
            image_prompt: "Diverse group of people using technology, modern devices, inclusive representation, professional environment, natural lighting, contemporary setting, high-quality photography --ar 9:16"
          },
          {
            scene_number: 8,
            duration: "42-48 seconds",
            speaker_text: "And the best part is how simple it is to get started",
            visual_description: "Simple step-by-step process visualization",
            image_prompt: "Clean step-by-step infographic, numbered process, minimalist design, professional presentation, easy-to-follow visual guide, modern typography, bright lighting --ar 9:16"
          },
          {
            scene_number: 9,
            duration: "48-54 seconds",
            speaker_text: "Thousands of people are already experiencing amazing results",
            visual_description: "Success stories and positive outcomes",
            image_prompt: "Happy successful people celebrating, positive expressions, diverse group, professional photography, natural lighting, modern environment, authentic emotions --ar 9:16"
          },
          {
            scene_number: 10,
            duration: "54-60 seconds",
            speaker_text: "Don't miss out on this incredible opportunity - start your journey today",
            visual_description: "Strong call-to-action with engaging final message",
            image_prompt: "Powerful call-to-action scene with motivational text 'START TODAY', professional presenter, confident pose, modern studio, dramatic lighting, inspiring atmosphere, high-quality production --ar 9:16"
          }
        ],
        target_audience: selectedNiche.target_audience,
        monetization_potential: "High - Engaging content with strong call-to-action and broad appeal"
      };
      
      return res.json({
        success: true,
        data: fallbackContent,
        message: 'Using demo content - Please configure valid Gemini API key for personalized content generation'
      });
    }
    
    // Check if it's a quota error
    if (error.message.includes('quota') || error.message.includes('429')) {
      console.log('⚠️ Gemini quota exceeded, using fallback content');
      console.log('💡 To fix this: Get a new API key from https://aistudio.google.com/');
      
      // Use fallback content when quota is exceeded
      const fallbackContent = {
        title: `${selectedNiche.title}: ${userIdea}`,
        description: `Discover amazing insights about ${userIdea} in this engaging ${selectedNiche.title.toLowerCase()} video`,
        tags: ["viral", "trending", "youtube", "content", "engaging"],
        estimated_duration: "60 seconds",
        scenes: [
          {
            scene_number: 1,
            duration: "0-6 seconds",
            speaker_text: "Welcome to an amazing discovery that will change everything you know",
            visual_description: "Eye-catching opening with dynamic text and visuals",
            image_prompt: "Dynamic opening scene with bold text overlay 'AMAZING DISCOVERY' in modern typography, vibrant colors, professional studio lighting, high-tech background with glowing elements, 8k resolution, cinematic composition --ar 9:16"
          },
          {
            scene_number: 2,
            duration: "6-12 seconds",
            speaker_text: "Today we're exploring something incredible that most people don't know about",
            visual_description: "Mysterious and intriguing visuals related to the topic",
            image_prompt: "Mysterious and intriguing scene showing hidden knowledge, professional person pointing at holographic display, futuristic interface, dramatic lighting, high-tech environment, photorealistic quality --ar 9:16"
          },
          {
            scene_number: 3,
            duration: "12-18 seconds",
            speaker_text: "This breakthrough has been changing lives across the world",
            visual_description: "Global impact visualization with world map and connections",
            image_prompt: "World map with glowing connection points, global network visualization, modern infographic style, professional presentation, clean design, high-tech overlay, cinematic lighting --ar 9:16"
          },
          {
            scene_number: 4,
            duration: "18-24 seconds",
            speaker_text: "Scientists and experts have been studying this phenomenon for years",
            visual_description: "Professional research environment with experts working",
            image_prompt: "Modern research laboratory with scientists working, professional equipment, clean white environment, focused researchers, high-tech displays showing data, professional photography --ar 9:16"
          },
          {
            scene_number: 5,
            duration: "24-30 seconds",
            speaker_text: "The results they discovered will absolutely shock you",
            visual_description: "Dramatic reveal with shocking statistics and data",
            image_prompt: "Dramatic data visualization with shocking statistics, bold numbers floating in 3D space, professional infographic design, vibrant colors, modern typography, cinematic presentation --ar 9:16"
          },
          {
            scene_number: 6,
            duration: "30-36 seconds",
            speaker_text: "But here's what makes this even more incredible",
            visual_description: "Building suspense with intriguing visuals",
            image_prompt: "Suspenseful scene with dramatic lighting, professional presenter gesturing, modern studio setup, high-tech background, mysterious atmosphere, cinematic quality --ar 9:16"
          },
          {
            scene_number: 7,
            duration: "36-42 seconds",
            speaker_text: "This technology is now available to everyone",
            visual_description: "Accessibility and availability demonstration",
            image_prompt: "Diverse group of people using technology, modern devices, inclusive representation, professional environment, natural lighting, contemporary setting, high-quality photography --ar 9:16"
          },
          {
            scene_number: 8,
            duration: "42-48 seconds",
            speaker_text: "And the best part is how simple it is to get started",
            visual_description: "Simple step-by-step process visualization",
            image_prompt: "Clean step-by-step infographic, numbered process, minimalist design, professional presentation, easy-to-follow visual guide, modern typography, bright lighting --ar 9:16"
          },
          {
            scene_number: 9,
            duration: "48-54 seconds",
            speaker_text: "Thousands of people are already experiencing amazing results",
            visual_description: "Success stories and positive outcomes",
            image_prompt: "Happy successful people celebrating, positive expressions, diverse group, professional photography, natural lighting, modern environment, authentic emotions --ar 9:16"
          },
          {
            scene_number: 10,
            duration: "54-60 seconds",
            speaker_text: "Don't miss out on this incredible opportunity - start your journey today",
            visual_description: "Strong call-to-action with engaging final message",
            image_prompt: "Powerful call-to-action scene with motivational text 'START TODAY', professional presenter, confident pose, modern studio, dramatic lighting, inspiring atmosphere, high-quality production --ar 9:16"
          }
        ],
        target_audience: selectedNiche.target_audience,
        monetization_potential: "High - Engaging content with strong call-to-action and broad appeal"
      };
      
      res.json({
        success: true,
        data: fallbackContent
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate content',
        details: error.message
      });
    }
  }
});

// Generate long form script
router.post('/generate-long-form-script', async (req, res) => {
  try {
    const { userIdea, sceneCount = 30 } = req.body;
    
    if (!userIdea || typeof userIdea !== 'string' || userIdea.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User idea is required and must be a non-empty string'
      });
    }
    
    console.log('🤖 Calling Gemini API for long form script generation...');
    console.log('💡 User idea:', userIdea.trim());
    console.log('📊 Scene count:', sceneCount);
    
    const prompt = `Based on the user's idea: "${userIdea.trim()}"

Create a comprehensive, long-form YouTube video script that:
- Has at least ${sceneCount} scenes (minimum 30 scenes)
- Each scene has detailed speaker text with at least 30 words
- Creates engaging, educational, or entertaining content
- Maintains viewer engagement throughout the long duration
- Has strong storytelling and narrative flow
- Is suitable for long-form content consumption

IMPORTANT: Respond with ONLY valid JSON. No markdown formatting, code blocks, or additional text.

Critical Requirements:
1. All speaker_text (narrator voice) must be in ENGLISH and detailed (minimum 30 words per scene)
2. All image_prompt descriptions must be in ENGLISH and extremely detailed for horizontal/landscape images
3. Create exactly ${sceneCount} scenes for the video
4. Each image prompt must be optimized for horizontal/landscape format (16:9 aspect ratio)
5. Content must be engaging and educational throughout the long duration
6. Each scene should build upon the previous one to create a cohesive narrative

Provide the response in this JSON format:
{
  "title": "Comprehensive Long-Form Video Title",
  "description": "Detailed SEO-optimized video description for long-form content",
  "tags": ["longform", "education", "comprehensive", "detailed", "tutorial"],
  "estimated_duration": "${Math.ceil(sceneCount * 4)}-${Math.ceil(sceneCount * 6)} seconds",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-6 seconds",
      "speaker_text": "Detailed English narrator text with at least 30 words that provides comprehensive information and engages the viewer",
      "visual_description": "Description of what should be shown on screen for horizontal format",
      "image_prompt": "Extremely detailed English prompt for horizontal AI image generation (16:9 aspect ratio) that perfectly matches the narrator text and creates engaging visual content"
    }
  ],
  "content_type": "long-form educational/entertainment content",
  "engagement_strategy": "How this long-form content maintains viewer engagement",
  "educational_value": "High/Medium/Low with explanation of learning outcomes"
}

Make sure:
- Content tells a complete, comprehensive story
- Each scene connects to the next naturally with smooth transitions
- Image prompts are optimized for horizontal/landscape format (16:9)
- Content provides substantial value for long-form viewing
- Uses storytelling techniques effectively for extended duration
- All text (speaker_text, descriptions, etc.) is in English for global appeal
- Each scene provides detailed, valuable information`;

    // Try gemini-2.0-flash first, fallback to gemini-1.5-pro if needed
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    } catch (modelError) {
      console.log('⚠️ gemini-2.0-flash not available, using gemini-1.5-pro');
      model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }
    
    console.log('📝 Sending long form prompt to Gemini...');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Received response from Gemini for long form script');
    console.log('📄 Raw response length:', text.length);
    console.log('📄 Raw response preview:', text.substring(0, 200) + '...');
    
    // Try to parse JSON response
    let scriptData;
    try {
      scriptData = JSON.parse(text);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.log('📄 Raw response that failed to parse:', text);
      
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          scriptData = JSON.parse(jsonMatch[0]);
          console.log('✅ Successfully extracted and parsed JSON from response');
        } catch (extractError) {
          console.error('❌ Failed to parse extracted JSON:', extractError);
          throw new Error('Failed to parse JSON response from Gemini');
        }
      } else {
        throw new Error('No JSON found in Gemini response');
      }
    }
    
    console.log('✅ Successfully parsed JSON from Gemini for long form script');
    console.log('📊 Generated long form script:', {
      title: scriptData.title,
      scenesCount: scriptData.scenes ? scriptData.scenes.length : 0,
      estimatedDuration: scriptData.estimated_duration
    });
    
    // Validate the script data
    if (!scriptData.title || !scriptData.scenes || !Array.isArray(scriptData.scenes)) {
      throw new Error('Invalid script data structure from Gemini');
    }
    
    // Ensure we have the minimum number of scenes
    if (scriptData.scenes.length < sceneCount) {
      console.log(`⚠️ Generated ${scriptData.scenes.length} scenes, but requested ${sceneCount}. Using generated scenes.`);
    }
    
    res.json({
      success: true,
      data: scriptData
    });
    
  } catch (error) {
    console.error('❌ Error generating long form script with Gemini:', error);
    
    // Return fallback data if Gemini fails
    const fallbackScript = {
      title: "Long Form AI Technology Deep Dive",
      description: "A comprehensive exploration of artificial intelligence technologies and their impact on our world",
      tags: ["longform", "AI", "technology", "comprehensive", "education"],
      estimated_duration: `${Math.ceil(sceneCount * 4)}-${Math.ceil(sceneCount * 6)} seconds`,
      scenes: Array.from({ length: Math.min(sceneCount, 30) }, (_, i) => ({
        scene_number: i + 1,
        duration: `${i * 6}-${(i + 1) * 6} seconds`,
        speaker_text: `This is scene ${i + 1} of our comprehensive exploration of artificial intelligence. We will dive deep into the fascinating world of AI technology, examining its various applications, benefits, and potential future developments. This detailed analysis will help you understand how AI is transforming industries and creating new opportunities for innovation and growth.`,
        visual_description: `Scene ${i + 1} showing AI technology concepts and applications`,
        image_prompt: `Professional horizontal composition showing AI technology concepts, modern digital interface, clean design, 16:9 aspect ratio, high quality, detailed visualization`
      })),
      content_type: "long-form educational content",
      engagement_strategy: "Comprehensive coverage with detailed explanations",
      educational_value: "High - provides in-depth understanding of AI concepts"
    };
    
    res.json({
      success: true,
      data: fallbackScript,
      fallback: true,
      error: error.message
    });
  }
});

module.exports = router;
