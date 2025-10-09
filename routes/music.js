const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Serve music files statically
router.use('/files', express.static(path.join(__dirname, '../background_music')));

// Get list of all music files with metadata
router.get('/list', (req, res) => {
    try {
        const musicDir = path.join(__dirname, '../background_music');
        const files = fs.readdirSync(musicDir);
        
        const musicFiles = files
            .filter(file => file.endsWith('.mp3'))
            .map(file => {
                const fileName = path.parse(file).name;
                
                // Extract music type from filename
                let type = 'عمومی';
                let category = 'other';
                
                // Categorize music based on filename keywords
                const lowerFileName = fileName.toLowerCase();
                
                if (lowerFileName.includes('sad') || lowerFileName.includes('emotional') || lowerFileName.includes('piano')) {
                    type = 'غمگین';
                    category = 'sad';
                } else if (lowerFileName.includes('scary') || lowerFileName.includes('horror') || lowerFileName.includes('dark')) {
                    type = 'ترسناک';
                    category = 'scary';
                } else if (lowerFileName.includes('action') || lowerFileName.includes('epic') || lowerFileName.includes('energetic')) {
                    type = 'اکشن';
                    category = 'action';
                } else if (lowerFileName.includes('motivational') || lowerFileName.includes('uplifting') || lowerFileName.includes('upbeat')) {
                    type = 'انگیزشی';
                    category = 'motivational';
                } else if (lowerFileName.includes('calm') || lowerFileName.includes('chill') || lowerFileName.includes('background')) {
                    type = 'آرام';
                    category = 'calm';
                } else if (lowerFileName.includes('hip') || lowerFileName.includes('rap') || lowerFileName.includes('beat')) {
                    type = 'هیپ‌هاپ';
                    category = 'hiphop';
                } else if (lowerFileName.includes('cinematic') || lowerFileName.includes('orchestral') || lowerFileName.includes('dramatic')) {
                    type = 'سینمایی';
                    category = 'cinematic';
                } else if (lowerFileName.includes('cartoon') || lowerFileName.includes('fun')) {
                    type = 'شاد';
                    category = 'happy';
                }
                
                return {
                    id: fileName,
                    filename: file,
                    name: fileName.replace(/-/g, ' ').replace(/\d+/g, '').trim(),
                    type: type,
                    category: category,
                    url: `/api/music/files/${file}`,
                    duration: null // Will be populated by frontend
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
        
        res.json({
            success: true,
            music: musicFiles,
            categories: {
                'همه': 'all',
                'غمگین': 'sad',
                'ترسناک': 'scary',
                'اکشن': 'action',
                'انگیزشی': 'motivational',
                'آرام': 'calm',
                'هیپ‌هاپ': 'hiphop',
                'سینمایی': 'cinematic',
                'شاد': 'happy',
                'عمومی': 'other'
            }
        });
    } catch (error) {
        console.error('Error reading music directory:', error);
        res.status(500).json({
            success: false,
            error: 'خطا در خواندن فایل‌های موزیک'
        });
    }
});

// Get music file info
router.get('/info/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../background_music', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'فایل موزیک یافت نشد'
            });
        }
        
        const stats = fs.statSync(filePath);
        const fileName = path.parse(filename).name;
        
        res.json({
            success: true,
            info: {
                filename: filename,
                name: fileName.replace(/-/g, ' ').replace(/\d+/g, '').trim(),
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime
            }
        });
    } catch (error) {
        console.error('Error getting music info:', error);
        res.status(500).json({
            success: false,
            error: 'خطا در دریافت اطلاعات فایل'
        });
    }
});

module.exports = router;
