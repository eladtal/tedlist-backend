/**
 * Test Local Server Routing
 * 
 * This script tests whether your local server has the Vision API endpoints
 * correctly configured.
 */

const fetch = require('node-fetch');

// Set this to your local server port
const SERVER_PORT = 8000;

// Endpoints to test
const endpoints = [
  { method: 'GET', path: '/' },
  { method: 'GET', path: '/api/vision/test' },
  { method: 'GET', path: '/vision/test' },
  { method: 'GET', path: '/api/auth/validate' }, // A known working endpoint
  { method: 'GET', path: '/api/test-endpoint' }
];

async function testEndpoint(method, path) {
  try {
    console.log(`Testing ${method} http://localhost:${SERVER_PORT}${path}...`);
    
    const response = await fetch(`http://localhost:${SERVER_PORT}${path}`, { method });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    let responseText;
    try {
      const data = await response.json();
      responseText = JSON.stringify(data, null, 2);
    } catch (e) {
      responseText = await response.text();
    }
    
    console.log('Response:', responseText);
    
    if (response.ok) {
      console.log('✅ Success!');
    } else {
      console.log('❌ Failed');
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
  console.log('-------------------------------------------');
}

async function runTests() {
  console.log('\n🔍 TESTING LOCAL SERVER ROUTING\n');
  console.log(`Base URL: http://localhost:${SERVER_PORT}`);
  console.log('-------------------------------------------');
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint.method, endpoint.path);
  }
  
  console.log('\n🔍 SUMMARY\n');
  console.log('If the Vision API endpoints returned "API endpoint not found" but other endpoints worked,');
  console.log('you need to make sure your server is using the latest version of app.ts with the correct route registration.');
  console.log('\nTry:');
  console.log('1. Stopping and restarting your local server');
  console.log('2. Checking for any middleware that might intercept requests before they reach the router');
  console.log('3. Making sure your server is running from the correct directory');
}

runTests();
