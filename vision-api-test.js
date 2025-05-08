/**
 * Google Vision API Test Script
 * 
 * This script tests your Google Vision API key by making a direct request to the Vision API.
 * It will help diagnose if the issue is with your API key or with your backend integration.
 * 
 * How to use:
 * 1. Make sure your GOOGLE_CLOUD_VISION_API_KEY is set in your .env file
 * 2. Run: node vision-api-test.js
 */

// Import required modules
require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Get API key from environment
const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

if (!apiKey) {
  console.error('❌ ERROR: GOOGLE_CLOUD_VISION_API_KEY is not set in your .env file');
  console.log('Please add your API key to your .env file like this:');
  console.log('GOOGLE_CLOUD_VISION_API_KEY=your_api_key_here');
  process.exit(1);
}

console.log('🔑 API Key found in environment variables');

// Path to a test image (use a small image file)
// You can replace this with any image path on your system
const testImagePath = path.join(__dirname, 'test-image.jpg');

// Check if test image exists
if (!fs.existsSync(testImagePath)) {
  console.error(`❌ ERROR: Test image not found at ${testImagePath}`);
  console.log('Please add a test image or update the script with the correct path');
  process.exit(1);
}

console.log(`📷 Using test image: ${testImagePath}`);

// Read and convert image to base64
const imageBase64 = fs.readFileSync(testImagePath).toString('base64');

// Prepare request body for Vision API
const requestBody = {
  requests: [{
    image: {
      content: imageBase64
    },
    features: [
      { type: 'LABEL_DETECTION', maxResults: 5 },
      { type: 'TEXT_DETECTION', maxResults: 5 },
      { type: 'OBJECT_LOCALIZATION', maxResults: 5 }
    ]
  }]
};

// Prepare request URL with API key
const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

console.log('🔍 Making request to Google Vision API...');

// Make the API request
fetch(visionApiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
})
.then(response => {
  if (!response.ok) {
    throw new Error(`Vision API request failed with status ${response.status} ${response.statusText}`);
  }
  return response.json();
})
.then(data => {
  console.log('✅ SUCCESS! API responded with:');
  console.log('Labels detected:');
  
  if (data.responses && data.responses[0] && data.responses[0].labelAnnotations) {
    data.responses[0].labelAnnotations.forEach(label => {
      console.log(`  - ${label.description} (${Math.round(label.score * 100)}% confidence)`);
    });
  } else {
    console.log('  No labels detected');
  }
  
  console.log('\nObjects detected:');
  if (data.responses && data.responses[0] && data.responses[0].localizedObjectAnnotations) {
    data.responses[0].localizedObjectAnnotations.forEach(object => {
      console.log(`  - ${object.name} (${Math.round(object.score * 100)}% confidence)`);
    });
  } else {
    console.log('  No objects detected');
  }
  
  console.log('\nText detected:');
  if (data.responses && data.responses[0] && data.responses[0].textAnnotations && data.responses[0].textAnnotations[0]) {
    console.log(`  "${data.responses[0].textAnnotations[0].description}"`);
  } else {
    console.log('  No text detected');
  }
  
  console.log('\n🎉 Your Google Vision API key is working correctly!');
  console.log('If your backend is still returning 404s, the issue is with your Render deployment or routing.');
})
.catch(error => {
  console.error('❌ ERROR:', error.message);
  
  if (error.message.includes('401')) {
    console.log('\n⚠️ API Key appears to be invalid or unauthorized.');
    console.log('Please check that your API key is correct and has Vision API access enabled.');
  } else if (error.message.includes('403')) {
    console.log('\n⚠️ API Key is not authorized to access the Vision API.');
    console.log('Make sure Vision API is enabled for your Google Cloud project.');
    console.log('You can enable it at: https://console.cloud.google.com/apis/library/vision.googleapis.com');
  } else if (error.message.includes('429')) {
    console.log('\n⚠️ You have exceeded your quota or rate limit.');
    console.log('Check your usage limits in the Google Cloud Console.');
  }
});
