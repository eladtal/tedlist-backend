/**
 * Create a simple test image file for Vision API testing
 */
const fs = require('fs');
const path = require('path');

// Create a simple blank image with text
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');
canvas.width = 300;
canvas.height = 200;

// Draw a white background
context.fillStyle = '#ffffff';
context.fillRect(0, 0, canvas.width, canvas.height);

// Draw a blue rectangle
context.fillStyle = '#3498db';
context.fillRect(50, 50, 200, 100);

// Add some text
context.fillStyle = '#ffffff';
context.font = '20px Arial';
context.fillText('Test Image', 100, 100);

// Convert to base64 and save
const dataURL = canvas.toDataURL('image/jpeg');
const base64Data = dataURL.replace(/^data:image\/jpeg;base64,/, '');

fs.writeFileSync(path.join(__dirname, 'test-image.jpg'), Buffer.from(base64Data, 'base64'));
console.log('Test image created successfully!');
