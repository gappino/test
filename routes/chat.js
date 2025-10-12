const express = require('express');
const router = express.Router();

// Chat with Pollinations AI
router.post('/send-message', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'پیام نمی‌تواند خالی باشد'
            });
        }

        console.log('🤖 Sending message to Pollinations AI...');
        console.log('💬 User message:', message.trim());

        // Prepare the message for Pollinations AI
        const encodedMessage = encodeURIComponent(message.trim());
        const pollinationsUrl = `https://text.pollinations.ai/${encodedMessage}`;

        console.log('🔗 Pollinations URL:', pollinationsUrl);

        // Make request to Pollinations AI
        const response = await fetch(pollinationsUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/plain, */*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 30000 // 30 seconds timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const aiResponse = await response.text();
        
        console.log('✅ Received response from Pollinations AI');
        console.log('📄 AI Response length:', aiResponse.length);
        console.log('📄 AI Response preview:', aiResponse.substring(0, 200) + '...');

        // Clean up the response if needed
        let cleanedResponse = aiResponse.trim();
        
        // Remove any potential HTML tags or unwanted characters
        cleanedResponse = cleanedResponse.replace(/<[^>]*>/g, '').trim();
        
        // If response is empty or too short, provide a fallback
        if (cleanedResponse.length < 3) {
            cleanedResponse = 'متاسفانه نتوانستم پاسخ مناسبی برای شما ارائه دهم. لطفاً سوال خود را به شکل دیگری مطرح کنید.';
        }

        res.json({
            success: true,
            data: {
                userMessage: message.trim(),
                aiResponse: cleanedResponse,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error communicating with Pollinations AI:', error);
        
        // Provide fallback response based on error type
        let fallbackResponse = 'متاسفانه در حال حاضر نمی‌توانم پاسخ شما را پردازش کنم. لطفاً بعداً دوباره تلاش کنید.';
        
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
            fallbackResponse = 'درخواست شما زمان زیادی طول کشید. لطفاً سوال کوتاه‌تری بپرسید یا بعداً دوباره تلاش کنید.';
        } else if (error.message.includes('404')) {
            fallbackResponse = 'سرویس چت در حال حاضر در دسترس نیست. لطفاً بعداً دوباره تلاش کنید.';
        } else if (error.message.includes('429')) {
            fallbackResponse = 'تعداد درخواست‌ها زیاد است. لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.';
        }

        res.json({
            success: true,
            data: {
                userMessage: req.body.message || '',
                aiResponse: fallbackResponse,
                timestamp: new Date().toISOString(),
                isFallback: true
            },
            warning: 'Using fallback response due to service unavailability'
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Chat service is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;




