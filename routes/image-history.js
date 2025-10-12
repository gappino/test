const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const router = express.Router();

// Get image history endpoint
router.get('/history', async (req, res) => {
  try {
    const directories = [
      { path: path.join(__dirname, '../uploads'), category: 'uploaded', urlPrefix: '/uploads' },
      { path: path.join(__dirname, '../public'), category: 'public', urlPrefix: '' },
      { path: path.join(__dirname, '../generation'), category: 'generated', urlPrefix: '/generation' },
      { path: path.join(__dirname, '../output'), category: 'output', urlPrefix: '/output' },
      { path: path.join(__dirname, '../temp'), category: 'temp', urlPrefix: '/temp' }
    ];
    
    const allImages = [];
    
    // Get image files from all directories
    for (const dir of directories) {
      try {
        await fs.ensureDir(dir.path);
        const images = await getImageFiles(dir.path, dir.category, dir.urlPrefix);
        allImages.push(...images);
      } catch (error) {
        console.error(`Error reading ${dir.path}:`, error);
        // Continue with other directories
      }
    }
    
    // Sort by creation time (newest first)
    allImages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      images: allImages,
      total: allImages.length
    });
    
  } catch (error) {
    console.error('Error getting image history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get image history'
    });
  }
});

// Helper function to get image files from directory
async function getImageFiles(directory, category, urlPrefix = '') {
  try {
    const files = await fs.readdir(directory);
    const imageFiles = [];
    
    for (const file of files) {
      if (file.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        
        // Skip directories
        if (stats.isDirectory()) continue;
        
        // Extract image ID from filename
        const imageId = file.replace(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i, '');
        
        // Create URL based on urlPrefix
        const url = urlPrefix ? `${urlPrefix}/${file}` : `/${file}`;
        
        // Get image dimensions
        const dimensions = await getImageDimensions(filePath);
        
        imageFiles.push({
          id: imageId,
          filename: file,
          category: category,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          size: stats.size,
          url: url,
          dimensions: dimensions,
          format: getImageFormat(file)
        });
      }
    }
    
    return imageFiles;
  } catch (error) {
    console.error(`Error reading ${directory}:`, error);
    return [];
  }
}

// Helper function to get image dimensions
async function getImageDimensions(filePath) {
  try {
    // This is a simplified version - in production you might want to use sharp or jimp
    const stats = await fs.stat(filePath);
    const sizeInKB = stats.size / 1024;
    
    // Rough estimation based on file size
    if (sizeInKB < 100) {
      return { width: 300, height: 200 };
    } else if (sizeInKB < 500) {
      return { width: 600, height: 400 };
    } else if (sizeInKB < 1000) {
      return { width: 1200, height: 800 };
    } else {
      return { width: 1920, height: 1080 };
    }
  } catch (error) {
    return { width: 600, height: 400 }; // Default dimensions
  }
}

// Helper function to get image format
function getImageFormat(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  const formatMap = {
    'jpg': 'JPEG',
    'jpeg': 'JPEG',
    'png': 'PNG',
    'gif': 'GIF',
    'bmp': 'BMP',
    'webp': 'WebP',
    'svg': 'SVG'
  };
  return formatMap[ext] || ext.toUpperCase();
}

// Get single image details
router.get('/details/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const directories = [
      { path: path.join(__dirname, '../uploads'), category: 'uploaded', urlPrefix: '/uploads' },
      { path: path.join(__dirname, '../public'), category: 'public', urlPrefix: '' },
      { path: path.join(__dirname, '../generation'), category: 'generated', urlPrefix: '/generation' },
      { path: path.join(__dirname, '../output'), category: 'output', urlPrefix: '/output' },
      { path: path.join(__dirname, '../temp'), category: 'temp', urlPrefix: '/temp' }
    ];
    
    let imageFile = null;
    
    // Search in all directories
    for (const dir of directories) {
      try {
        const files = await fs.readdir(dir.path);
        for (const file of files) {
          if (file.includes(imageId) && file.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)) {
            const filePath = path.join(dir.path, file);
            const stats = await fs.stat(filePath);
            
            // Skip directories
            if (stats.isDirectory()) continue;
            
            const url = dir.urlPrefix ? `${dir.urlPrefix}/${file}` : `/${file}`;
            const dimensions = await getImageDimensions(filePath);
            
            imageFile = {
              id: imageId,
              filename: file,
              category: dir.category,
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
              size: stats.size,
              url: url,
              dimensions: dimensions,
              format: getImageFormat(file)
            };
            break;
          }
        }
        if (imageFile) break;
      } catch (error) {
        // Directory doesn't exist or can't be read, continue
        continue;
      }
    }
    
    if (!imageFile) {
      return res.status(404).json({
        success: false,
        error: 'Image file not found'
      });
    }
    
    res.json({
      success: true,
      image: imageFile
    });
    
  } catch (error) {
    console.error('Error getting image details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get image details'
    });
  }
});

// Delete image endpoint
router.delete('/delete/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const directories = [
      { path: path.join(__dirname, '../uploads'), category: 'uploaded' },
      { path: path.join(__dirname, '../public'), category: 'public' },
      { path: path.join(__dirname, '../generation'), category: 'generated' },
      { path: path.join(__dirname, '../output'), category: 'output' },
      { path: path.join(__dirname, '../temp'), category: 'temp' }
    ];
    
    let deleted = false;
    
    // Try to delete from all directories
    for (const dir of directories) {
      try {
        const files = await fs.readdir(dir.path);
        for (const file of files) {
          if (file.includes(imageId) && file.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)) {
            const filePath = path.join(dir.path, file);
            const stats = await fs.stat(filePath);
            
            // Skip directories
            if (stats.isDirectory()) continue;
            
            await fs.unlink(filePath);
            deleted = true;
            break;
          }
        }
        if (deleted) break;
      } catch (error) {
        // Directory doesn't exist or can't be read, continue
        continue;
      }
    }
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Image file not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Image file deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image file'
    });
  }
});

// Serve image endpoint (for better caching and security)
router.get('/serve/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const directories = [
      { path: path.join(__dirname, '../uploads'), category: 'uploaded' },
      { path: path.join(__dirname, '../public'), category: 'public' },
      { path: path.join(__dirname, '../generation'), category: 'generated' },
      { path: path.join(__dirname, '../output'), category: 'output' },
      { path: path.join(__dirname, '../temp'), category: 'temp' }
    ];
    
    let imagePath = null;
    let contentType = 'image/jpeg';
    
    // Find image file
    for (const dir of directories) {
      try {
        const files = await fs.readdir(dir.path);
        for (const file of files) {
          if (file.includes(imageId) && file.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)) {
            const filePath = path.join(dir.path, file);
            const stats = await fs.stat(filePath);
            
            // Skip directories
            if (stats.isDirectory()) continue;
            
            imagePath = filePath;
            
            // Set content type based on file extension
            const ext = file.toLowerCase().split('.').pop();
            const contentTypes = {
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'png': 'image/png',
              'gif': 'image/gif',
              'bmp': 'image/bmp',
              'webp': 'image/webp',
              'svg': 'image/svg+xml'
            };
            contentType = contentTypes[ext] || 'image/jpeg';
            break;
          }
        }
        if (imagePath) break;
      } catch (error) {
        continue;
      }
    }
    
    if (!imagePath) {
      return res.status(404).json({
        success: false,
        error: 'Image file not found'
      });
    }
    
    // Set appropriate headers for image serving
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Stream the image file
    const imageStream = fs.createReadStream(imagePath);
    imageStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve image'
    });
  }
});

// Delete all images endpoint
router.delete('/delete-all', async (req, res) => {
  try {
    const directories = [
      { path: path.join(__dirname, '../uploads'), category: 'uploaded' },
      { path: path.join(__dirname, '../generation'), category: 'generated' },
      { path: path.join(__dirname, '../output'), category: 'output' },
      { path: path.join(__dirname, '../temp'), category: 'temp' }
    ];
    
    let deletedCount = 0;
    let errorCount = 0;
    
    // Delete all image files from all directories (except public)
    for (const dir of directories) {
      try {
        if (await fs.pathExists(dir.path)) {
          const files = await fs.readdir(dir.path);
          
          for (const file of files) {
            const filePath = path.join(dir.path, file);
            const ext = path.extname(file).toLowerCase();
            
            // Only delete image files
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
              try {
                await fs.remove(filePath);
                deletedCount++;
              } catch (error) {
                console.error(`Error deleting ${filePath}:`, error);
                errorCount++;
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${dir.path}:`, error);
        errorCount++;
      }
    }
    
    res.json({
      success: true,
      message: 'تمام تصاویر با موفقیت حذف شدند',
      deletedCount: deletedCount,
      errorCount: errorCount
    });
    
  } catch (error) {
    console.error('Error deleting all images:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در حذف تصاویر'
    });
  }
});

module.exports = router;
