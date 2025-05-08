/**
 * Test Render API Endpoints
 * 
 * This script tests if the Render deployment of your backend is accessible
 * and if the Vision API endpoints are working.
 */

const fetch = require('node-fetch');

// Your Render deployment URL
const RENDER_URL = 'https://tedlist-backend.onrender.com';

// Test endpoints
const endpoints = [
  { method: 'GET', path: '/' },
  { method: 'GET', path: '/api/vision/test' },
  { method: 'GET', path: '/api/test-endpoint' }
];

async function testEndpoint(method, path) {
  try {
    console.log(`Testing ${method} ${RENDER_URL}${path}...`);
    
    const response = await fetch(`${RENDER_URL}${path}`, { method });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
      console.log('✅ Success!');
    } else {
      const text = await response.text();
      console.log('Error response:', text);
      console.log('❌ Failed');
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
  console.log('-------------------------------------------');
}

async function runTests() {
  console.log('\n🔍 TESTING RENDER DEPLOYMENT ENDPOINTS\n');
  console.log(`Base URL: ${RENDER_URL}`);
  console.log('-------------------------------------------');
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint.method, endpoint.path);
  }
  
  console.log('\n🔍 SUMMARY\n');
  console.log('If any of the tests failed with 404 errors, your routes might not be configured correctly');
  console.log('If they failed with connection errors, your Render deployment might be down or sleeping');
  console.log('If they succeeded but your app still gets errors, check your app\'s API configuration');
}

runTests();
