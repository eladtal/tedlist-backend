/**
 * Google Vision API Service Account Test Script
 * 
 * This script tests your Google Vision API using service account credentials
 * instead of an API key.
 * 
 * How to use:
 * 1. Make sure your GOOGLE_APPLICATION_CREDENTIALS is set in your .env file
 *    pointing to your service account JSON file
 * 2. Run: node vision-api-key-test.js
 */

// Import required modules
require('dotenv').config();
const {ImageAnnotatorClient} = require('@google-cloud/vision');

// Check if credentials path is set
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credentialsPath) {
  console.error('❌ ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
  console.log('Please add the path to your service account JSON file in your .env file like this:');
  console.log('GOOGLE_APPLICATION_CREDENTIALS=./path/to/your-service-account.json');
  process.exit(1);
}

console.log(`🔑 Service account credentials path found: ${credentialsPath}`);

// Initialize the Vision API client
let visionClient;
try {
  visionClient = new ImageAnnotatorClient();
  console.log('Vision client initialized successfully');
} catch (error) {
  console.error('❌ ERROR: Failed to initialize Vision client:', error.message);
  console.log('\nMake sure your credentials file exists and is valid JSON');
  process.exit(1);
}

// Use a public image URL instead of a local file
// This is a generic test image from Google's own examples
const testImageUrl = 'https://storage.googleapis.com/cloud-samples-data/vision/label/setagaya.jpeg';

console.log(`📷 Using test image URL: ${testImageUrl}`);

// Function to run the test
async function testVisionApi() {
  try {
    console.log('🔍 Making request to Google Vision API...');
    
    // Request features we want to detect
    const features = [
      { type: 'LABEL_DETECTION', maxResults: 5 },
      { type: 'LANDMARK_DETECTION', maxResults: 5 }
    ];
    
    // Make the API request
    const [result] = await visionClient.annotateImage({
      image: { source: { imageUri: testImageUrl } },
      features: features
    });
    
    console.log('✅ SUCCESS! API responded with results');
    
    // Process and display labels
    console.log('\nLabels detected:');
    if (result.labelAnnotations && result.labelAnnotations.length > 0) {
      result.labelAnnotations.forEach(label => {
        console.log(`  - ${label.description} (${Math.round(label.score * 100)}% confidence)`);
      });
    } else {
      console.log('  No labels detected');
    }
    
    // Process and display landmarks
    console.log('\nLandmarks detected:');
    if (result.landmarkAnnotations && result.landmarkAnnotations.length > 0) {
      result.landmarkAnnotations.forEach(landmark => {
        console.log(`  - ${landmark.description} (${Math.round(landmark.score * 100)}% confidence)`);
      });
    } else {
      console.log('  No landmarks detected');
    }
    
    console.log('\n🎉 Your Google Vision API service account credentials are working correctly!');
    console.log('If your backend is still returning 404s, the issue is with your Render deployment or routing.');
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    
    if (error.message.includes('permission')) {
      console.log('\n⚠️ Service account lacks permission to access the Vision API.');
      console.log('Make sure your service account has the "Cloud Vision API User" role.');
    } else if (error.message.includes('billing')) {
      console.log('\n⚠️ Billing is not enabled for your Google Cloud project.');
      console.log('Please enable billing at: https://console.cloud.google.com/billing/enable');
    } else if (error.message.includes('API not enabled')) {
      console.log('\n⚠️ Vision API is not enabled for your project.');
      console.log('Enable it at: https://console.cloud.google.com/apis/library/vision.googleapis.com');
    }
  }
}

// Run the test
testVisionApi();
