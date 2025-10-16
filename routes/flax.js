const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const router = express.Router();

// Ark server configuration
const POLLINATIONS_BASE_URL = 'https://image.pollinations.ai';

// Generate image using Ark server
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    // Prepare query parameters for Pollinations.ai
    const params = new URLSearchParams({
      prompt: prompt,
      width: '1080',
      height: '1920',
      model: 'flux',
      seed: Math.floor(Math.random() * 1000000).toString(),
      nologo: 'true'
    });
    
    // Make request to Ark server
    const pollinationsUrl = `${POLLINATIONS_BASE_URL}/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
    
    // First, make a request to generate the image
    const response = await axios.get(pollinationsUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 120000, // 2 minutes timeout for image generation
      responseType: 'arraybuffer' // Get the image data
    });
    
    // Save image to file
    const imagesDir = path.join(__dirname, '../generation');
    await fs.ensureDir(imagesDir);
    
    const timestamp = Date.now();
    const filename = `image_${timestamp}_${Math.random().toString(36).substr(2, 9)}.png`;
    const imagePath = path.join(imagesDir, filename);
    
    // Save the image data to file
    await fs.writeFile(imagePath, response.data);
    
    // Create URL for the saved image
    const localImageUrl = `/generation/${filename}`;
    
    res.json({
      success: true,
      data: {
        image_url: localImageUrl,
        image_path: imagePath,
        filename: filename,
        prompt: prompt,
        parameters: {
          width: 1080,
          height: 1920,
          model: 'flux',
          seed: params.get('seed')
        }
      }
    });
    
  } catch (error) {
    console.error('Error generating image:', error);
    
    // Handle different types of errors
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: 'Ark server API error',
        details: error.response.statusText
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({
        success: false,
        error: 'Request timeout - image generation took too long'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate image',
        details: error.message
      });
    }
  }
});

// Alternative method using direct URL (simpler approach)
router.post('/generate-image-url', async (req, res) => {
  try {
    const { prompt, width = 1080, height = 1920 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    // Create direct URL for Ark server
    const params = new URLSearchParams({
      prompt: prompt,
      width: width.toString(),
      height: height.toString(),
      model: 'flux',
      seed: Math.floor(Math.random() * 1000000).toString(),
      nologo: 'true'
    });
    
    const imageUrl = `${POLLINATIONS_BASE_URL}/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
    
    // Download and save the image
    try {
      const response = await axios.get(imageUrl, {
        timeout: 120000,
        responseType: 'arraybuffer'
      });
      
      // Save image to file
      const imagesDir = path.join(__dirname, '../generation');
      await fs.ensureDir(imagesDir);
      
      const timestamp = Date.now();
      const filename = `image_${timestamp}_${Math.random().toString(36).substr(2, 9)}.png`;
      const imagePath = path.join(imagesDir, filename);
      
      // Save the image data to file
      await fs.writeFile(imagePath, response.data);
      
      // Create URL for the saved image
      const localImageUrl = `/generation/${filename}`;
      
      res.json({
        success: true,
        data: {
          image_url: localImageUrl,
          image_path: imagePath,
          filename: filename,
          prompt: prompt,
          parameters: {
            width: parseInt(width),
            height: parseInt(height),
            model: 'flux',
            seed: params.get('seed')
          }
        }
      });
      
    } catch (downloadError) {
      console.error('Error downloading image:', downloadError);
      // Fallback to URL only
      res.json({
        success: true,
        data: {
          image_url: imageUrl,
          prompt: prompt,
          parameters: {
            width: parseInt(width),
            height: parseInt(height),
            model: 'flux',
            seed: params.get('seed')
          }
        }
      });
    }
    
  } catch (error) {
    console.error('Error generating image URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate image URL',
      details: error.message
    });
  }
});

// Generate horizontal image using Pollinations.ai
router.post('/generate-horizontal-image-url', async (req, res) => {
  try {
    const { prompt, width = 1920, height = 1080 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    console.log('🖼️ Generating horizontal image with Ark server...');
    console.log('📝 Prompt:', prompt);
    console.log('📐 Dimensions:', `${width}x${height}`);
    
    // Create direct URL for Ark server with horizontal dimensions
    const params = new URLSearchParams({
      prompt: prompt,
      width: width.toString(),
      height: height.toString(),
      model: 'flux',
      seed: Math.floor(Math.random() * 1000000).toString(),
      nologo: 'true'
    });
    
    const imageUrl = `${POLLINATIONS_BASE_URL}/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
    
    console.log('🔗 Generated image URL:', imageUrl);
    
    // Try to download and save the image
    try {
      const response = await axios.get(imageUrl, {
        timeout: 120000,
        responseType: 'arraybuffer'
      });
      
      // Save image to file
      const imagesDir = path.join(__dirname, '../generation');
      await fs.ensureDir(imagesDir);
      
      const timestamp = Date.now();
      const filename = `horizontal_image_${timestamp}_${Math.random().toString(36).substr(2, 9)}.png`;
      const imagePath = path.join(imagesDir, filename);
      
      // Save the image data to file
      await fs.writeFile(imagePath, response.data);
      
      // Create URL for the saved image
      const localImageUrl = `/generation/${filename}`;
      
      console.log('✅ Horizontal image saved successfully:', localImageUrl);
      
      res.json({
        success: true,
        data: {
          image_url: localImageUrl,
          image_path: imagePath,
          filename: filename,
          prompt: prompt,
          parameters: {
            width: parseInt(width),
            height: parseInt(height),
            model: 'flux',
            seed: params.get('seed'),
            orientation: 'horizontal'
          }
        }
      });
      
    } catch (downloadError) {
      console.log('⚠️ Could not download image, returning URL only:', downloadError.message);
      
      // Fallback to URL only
      res.json({
        success: true,
        data: {
          image_url: imageUrl,
          prompt: prompt,
          parameters: {
            width: parseInt(width),
            height: parseInt(height),
            model: 'flux',
            seed: params.get('seed'),
            orientation: 'horizontal'
          }
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error generating horizontal image URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate horizontal image URL',
      details: error.message
    });
  }
});

// Check Ark server status
router.get('/status', async (req, res) => {
  try {
    // Simple health check
    const response = await axios.get(`${POLLINATIONS_BASE_URL}/prompt/test?width=100&height=100`, {
      timeout: 10000
    });
    
    res.json({
      success: true,
      status: 'Ark server is accessible',
      service: 'Ark server'
    });
    
  } catch (error) {
    res.json({
      success: false,
      status: 'Ark server not accessible',
      error: error.message
    });
  }
});

// Test server load by checking models endpoint
router.get('/test-server-load', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Testing Ark server load...');
    
    // Make request to models endpoint with timeout
    const response = await axios.get(`${POLLINATIONS_BASE_URL}/models`, {
      timeout: 15000, // 15 seconds timeout
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ArkPlus-ServerLoadTest/1.0'
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    // Check if response contains models array
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      console.log('✅ Ark server responded with models:', response.data);
      
      let loadStatus;
      if (responseTime < 3000) {
        loadStatus = 'شلوغی متوسط';
      } else if (responseTime < 8000) {
        loadStatus = 'شلوغی زیاد';
      } else {
        loadStatus = 'شلوغی متوسط';
      }
      
      res.json({
        success: true,
        loadStatus: loadStatus,
        responseTime: responseTime,
        models: response.data,
        message: `سرور در حالت ${loadStatus} است. زمان پاسخ: ${responseTime}ms`
      });
      
    } else {
      console.log('⚠️ Ark server responded but no models found');
      res.json({
        success: false,
        loadStatus: 'سرور تحت فشار حداکثری هست',
        responseTime: responseTime,
        error: 'پاسخ غیرمنتظره از سرور',
        message: 'سرور تحت فشار حداکثری هست - پاسخ نامعتبر دریافت شد'
      });
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('❌ Ark server load test failed:', error.message);
    
    let loadStatus = 'سرور تحت فشار حداکثری هست';
    let message = 'سرور تحت فشار حداکثری هست';
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      loadStatus = 'شلوغی زیاد';
      message = 'شلوغی زیاد - سرور خیلی کند پاسخ می‌دهد';
    } else if (error.response) {
      const statusCode = error.response.status;
      if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
        loadStatus = 'سرور تحت فشار حداکثری هست';
        message = 'سرور تحت فشار حداکثری هست - خطای سرور';
      }
    }
    
    res.json({
      success: false,
      loadStatus: loadStatus,
      responseTime: responseTime,
      error: error.message,
      message: message
    });
  }
});

module.exports = router;
