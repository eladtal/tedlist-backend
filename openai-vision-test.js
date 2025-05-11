/**
 * OpenAI Vision API Test Script
 * 
 * This script tests your OpenAI Vision API key by making a direct request to the OpenAI API.
 * It will help diagnose if OpenAI integration is working correctly.
 * 
 * How to use:
 * 1. Make sure your OPENAI_API_KEY is set in your .env file
 * 2. Run: node openai-vision-test.js
 */

// Import required modules
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ ERROR: OPENAI_API_KEY is not set in your .env file');
  console.log('Please add your API key to your .env file like this:');
  console.log('OPENAI_API_KEY=your_api_key_here');
  process.exit(1);
}

console.log('🔑 OpenAI API Key found in environment variables');

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

// Initialize OpenAI client
const openai = new OpenAI({ apiKey });

// Read and convert image to base64
const imageBuffer = fs.readFileSync(testImagePath);
const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

console.log('🔍 Making request to OpenAI Vision API...');

// Function to analyze the image
async function analyzeImage() {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing images of items and providing detailed descriptions."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image and provide detailed information about the item shown." },
            {
              type: "image_url",
              image_url: {
                url: base64Image,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    console.log('✅ SUCCESS! API responded with:');
    console.log('\nAnalysis:');
    console.log(response.choices[0].message.content);
    
    console.log('\n🎉 Your OpenAI Vision API key is working correctly!');
    console.log('Usage:', response.usage);
    console.log('Model:', response.model);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    
    if (error.message.includes('401')) {
      console.log('\n⚠️ API Key appears to be invalid or unauthorized.');
      console.log('Please check that your API key is correct.');
    } else if (error.message.includes('429')) {
      console.log('\n⚠️ You have exceeded your quota or rate limit.');
      console.log('Check your usage limits in the OpenAI dashboard.');
    }
  }
}

// Run the analysis
analyzeImage(); 