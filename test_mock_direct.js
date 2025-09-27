#!/usr/bin/env node

/**
 * Direct test of mock API routes
 */

const mockGeminiRoutes = require('./routes/mock-gemini');
const express = require('express');

async function testMockAPI() {
    console.log('🧪 Testing Mock API Directly...\n');
    
    const app = express();
    app.use(express.json());
    app.use('/api/gemini', mockGeminiRoutes);
    
    const server = app.listen(3004, async () => {
        console.log('✅ Mock server started on port 3004');
        
        try {
            // Test generate-script
            console.log('\n📝 Testing /api/gemini/generate-script...');
            const scriptResponse = await fetch('http://localhost:3004/api/gemini/generate-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const scriptData = await scriptResponse.json();
            console.log('✅ Script Response:', {
                success: scriptData.success,
                hasData: !!scriptData.data,
                title: scriptData.data?.title,
                scenesCount: scriptData.data?.scenes?.length
            });
            
            // Test generate-niches
            console.log('\n📝 Testing /api/gemini/generate-niches...');
            const nichesResponse = await fetch('http://localhost:3004/api/gemini/generate-niches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIdea: 'AI technology' })
            });
            const nichesData = await nichesResponse.json();
            console.log('✅ Niches Response:', {
                success: nichesData.success,
                hasData: !!nichesData.data,
                nichesCount: nichesData.data?.niches?.length
            });
            
            // Test generate-content
            console.log('\n📝 Testing /api/gemini/generate-content...');
            const contentResponse = await fetch('http://localhost:3004/api/gemini/generate-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedNiche: { title: 'Tech Reviews', target_audience: 'tech enthusiasts' },
                    userIdea: 'AI technology'
                })
            });
            const contentData = await contentResponse.json();
            console.log('✅ Content Response:', {
                success: contentData.success,
                hasData: !!contentData.data,
                title: contentData.data?.title,
                scenesCount: contentData.data?.scenes?.length
            });
            
            console.log('\n🎉 All Mock API tests passed!');
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
        } finally {
            server.close();
        }
    });
}

// Run the test
if (require.main === module) {
    testMockAPI().catch(console.error);
}

module.exports = { testMockAPI };

