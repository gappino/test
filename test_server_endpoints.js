#!/usr/bin/env node

/**
 * Test server endpoints to verify functionality
 */

const http = require('http');

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(data);
        }
        req.end();
    });
}

async function testEndpoints() {
    console.log('🌐 Testing Server Endpoints...\n');
    
    const baseUrl = 'localhost';
    const port = 3003;
    
    const tests = [
        {
            name: 'Main Page (GET /)',
            options: {
                hostname: baseUrl,
                port: port,
                path: '/',
                method: 'GET'
            }
        },
        {
            name: 'Gemini Script Generation (POST /api/gemini/generate-script)',
            options: {
                hostname: baseUrl,
                port: port,
                path: '/api/gemini/generate-script',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            },
            data: JSON.stringify({})
        },
        {
            name: 'Gemini Image Prompt (POST /api/gemini/generate-image-prompt)',
            options: {
                hostname: baseUrl,
                port: port,
                path: '/api/gemini/generate-image-prompt',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            },
            data: JSON.stringify({
                visual_description: "Modern AI technology interface"
            })
        },
        {
            name: 'Gemini Niches (POST /api/gemini/generate-niches)',
            options: {
                hostname: baseUrl,
                port: port,
                path: '/api/gemini/generate-niches',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            },
            data: JSON.stringify({
                userIdea: "AI technology revolution"
            })
        },
        {
            name: 'Gemini Content (POST /api/gemini/generate-content)',
            options: {
                hostname: baseUrl,
                port: port,
                path: '/api/gemini/generate-content',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            },
            data: JSON.stringify({
                selectedNiche: {
                    title: "Tech Reviews",
                    description: "Technology reviews",
                    target_audience: "tech enthusiasts",
                    content_style: "educational"
                },
                userIdea: "AI technology"
            })
        }
    ];

    for (const test of tests) {
        console.log(`\n📝 Testing: ${test.name}`);
        
        try {
            const response = await makeRequest(test.options, test.data);
            
            console.log(`✅ Status: ${response.statusCode}`);
            console.log(`📄 Response Length: ${response.body.length} characters`);
            
            if (response.body.length > 0) {
                try {
                    const jsonResponse = JSON.parse(response.body);
                    console.log(`📊 JSON Response:`, {
                        success: jsonResponse.success,
                        hasData: !!jsonResponse.data,
                        error: jsonResponse.error || 'none'
                    });
                    
                    if (jsonResponse.data && jsonResponse.data.title) {
                        console.log(`🎬 Generated Title: ${jsonResponse.data.title}`);
                    }
                    if (jsonResponse.data && jsonResponse.data.scenes) {
                        console.log(`🎭 Scenes Count: ${jsonResponse.data.scenes.length}`);
                    }
                } catch (parseError) {
                    console.log(`📄 Raw Response Preview: ${response.body.substring(0, 200)}...`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }
    
    console.log('\n🎉 Endpoint testing completed!');
}

// Run the tests
if (require.main === module) {
    testEndpoints().catch(console.error);
}

module.exports = { testEndpoints };

