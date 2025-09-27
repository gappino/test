const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const router = express.Router();

// Pollinations.ai configuration
const POLLINATIONS_BASE_URL = 'https://image.pollinations.ai';

// Generate image using Pollinations.ai
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
    
    // Make request to Pollinations.ai
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
        error: 'Pollinations.ai API error',
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
    
    // Create direct URL for Pollinations.ai
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

// Check Pollinations.ai status
router.get('/status', async (req, res) => {
  try {
    // Simple health check
    const response = await axios.get(`${POLLINATIONS_BASE_URL}/prompt/test?width=100&height=100`, {
      timeout: 10000
    });
    
    res.json({
      success: true,
      status: 'Pollinations.ai is accessible',
      service: 'Pollinations.ai'
    });
    
  } catch (error) {
    res.json({
      success: false,
      status: 'Pollinations.ai not accessible',
      error: error.message
    });
  }
});

module.exports = router;
