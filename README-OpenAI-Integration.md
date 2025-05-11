# OpenAI Vision Integration for TedList

This guide explains how to set up and use the OpenAI Vision integration for image analysis of items in TedList.

## Setup

### 1. Get an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or log in
3. Navigate to the API keys section
4. Create a new API key
5. Copy the key (you'll only see it once)

### 2. Configure Your Environment

1. In the `server` directory, create a `.env` file if you don't already have one
2. Add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
3. Restart your server

### 3. Test the Integration

Run the test script to verify your setup:

```bash
node openai-vision-test.js
```

If successful, you'll see a detailed analysis of the test image.

## API Usage

### Analyzing an Image

#### Upload an Image File

**Endpoint:** `POST /api/vision/openai/analyze`

**Headers:**
- `Authorization: Bearer YOUR_JWT_TOKEN`

**Body:**
- Form data with an image file in the `image` field

**Response:**
```json
{
  "success": true,
  "message": "Image analyzed successfully with OpenAI",
  "data": {
    "title": "Red Coffee Mug",
    "description": "A ceramic red coffee mug with a white interior, ideal for hot beverages.",
    "category": "Kitchen",
    "condition": "Good",
    "brand": "Acme",
    "estimatedValue": "$10-15",
    "keywords": ["mug", "coffee", "ceramic", "red", "kitchenware"],
    "aiAnalysis": "This image shows a red ceramic coffee mug..."
  }
}
```

#### Analyze by URL

**Endpoint:** `POST /api/vision/openai/analyze-url`

**Headers:**
- `Authorization: Bearer YOUR_JWT_TOKEN`

**Body:**
```json
{
  "imageUrl": "https://example.com/image.jpg"
}
```

**Response:** Same as above

## Testing Routes (No Auth Required)

For development/testing purposes:

- `POST /api/vision/test/openai/analyze` - Test image upload analysis
- `POST /api/vision/test/openai/analyze-url` - Test URL analysis

## Technical Details

- Model used: GPT-4o (with vision capabilities)
- Supports JPEG, PNG, GIF, and WebP formats
- Max image size: 5MB
- Analysis includes: item identification, condition assessment, feature detection, brand detection, and text recognition

## Comparison with Google Vision API

OpenAI's vision integration often provides more detailed, contextual information about items compared to Google Vision API:

| Feature | OpenAI Vision | Google Vision |
|---------|---------------|--------------|
| Text detection | ✅ | ✅ |
| Object recognition | ✅ | ✅ |
| Brand detection | ✅ | ❌ |
| Condition assessment | ✅ | ❌ |
| Value estimation | ✅ | ❌ |
| Natural language description | ✅ | ❌ |
| Multiple objects in scene | ✅ | ✅ | 