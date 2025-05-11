import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;
let openaiApiInitialized = false;

try {
  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    openaiApiInitialized = true;
    console.log('OpenAI client initialized successfully');
  } else {
    console.warn('Warning: OPENAI_API_KEY environment variable is not set');
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

/**
 * Analyze an image using OpenAI Vision API
 * @param imageBuffer - Raw image buffer data or base64 encoded image or image URL
 * @returns Object with analysis results
 */
export const analyzeImageWithOpenAI = async (imageInput: Buffer | string): Promise<any> => {
  try {
    if (!openaiApiInitialized || !openaiClient) {
      throw new Error('OpenAI client not initialized. Please check your API key.');
    }

    console.log('Starting image analysis with OpenAI Vision API');

    let imageContent: string;
    let imageType: 'url' | 'base64';

    // Check if input is a URL
    if (typeof imageInput === 'string' && (imageInput.startsWith('http://') || imageInput.startsWith('https://'))) {
      imageContent = imageInput;
      imageType = 'url';
    } else {
      // Convert Buffer to base64 or use string if already base64
      imageContent = Buffer.isBuffer(imageInput) 
        ? `data:image/jpeg;base64,${imageInput.toString('base64')}` 
        : imageInput;
      imageType = 'base64';
    }

    // Call OpenAI API for image analysis
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing images of items and providing detailed descriptions. Focus on identifying the item, its condition, features, brand if visible, and any text that appears in the image."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image and provide detailed information about the item shown." },
            {
              type: "image_url",
              image_url: {
                url: imageContent,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('No analysis results received from OpenAI API');
    }

    return {
      analysis: response.choices[0].message.content,
      model: response.model,
      usage: response.usage
    };
  } catch (error: any) {
    console.error('Error analyzing image with OpenAI:', error);
    throw new Error(
      `OpenAI Vision API error: ${error.message || 'Unknown error occurred'}`
    );
  }
};

/**
 * Generate structured item details from OpenAI's analysis
 * @param analysisResult - Results from the OpenAI Vision API
 * @returns Object with generated item properties
 */
export const generateItemDetailsFromOpenAI = async (analysisResult: any): Promise<any> => {
  try {
    if (!openaiApiInitialized || !openaiClient) {
      throw new Error('OpenAI client not initialized. Please check your API key.');
    }

    // Extract the analysis text
    const analysisText = analysisResult.analysis;

    // Use a follow-up prompt to structure the information
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at extracting structured information from text descriptions of items."
        },
        {
          role: "user",
          content: `Based on this analysis of an item, extract the following information in JSON format:
          {
            "title": "A concise title for the item",
            "description": "A detailed description of the item (2-3 sentences)",
            "category": "One of: Electronics, Clothing, Furniture, Kitchen, Books, Toys, Sports, Home Decor, or Other",
            "condition": "One of: New, Like New, Good, Fair, Poor",
            "brand": "Brand name if identifiable, otherwise null",
            "estimatedValue": "Estimated value range in USD if possible, otherwise null",
            "keywords": ["array", "of", "relevant", "keywords"]
          }
          
          Analysis text: ${analysisText}`
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('No structured data received from OpenAI API');
    }

    // Parse the JSON response
    const structuredData = JSON.parse(response.choices[0].message.content);

    return {
      ...structuredData,
      aiAnalysis: analysisText // Include the original analysis for reference
    };
  } catch (error) {
    console.error('Error generating structured item details:', error);
    return {
      title: 'Item',
      description: 'No description available',
      category: 'Other',
      condition: 'Good',
      brand: null,
      estimatedValue: null,
      keywords: [],
      aiAnalysis: analysisResult.analysis || 'Analysis not available'
    };
  }
}; 