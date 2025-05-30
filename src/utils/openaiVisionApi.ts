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

// Define the analysis result type
interface AnalysisResult {
  analysis: string;
  model: string;
  usage: any;
}

/**
 * Analyze an image using OpenAI Vision API
 * @param imageBuffer - Raw image buffer data or base64 encoded image or image URL
 * @returns Object with analysis results
 */
export const analyzeImageWithOpenAI = async (imageInput: Buffer | string): Promise<AnalysisResult> => {
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
          content: "You are an expert product analyst specializing in brand identification and value assessment. When analyzing images:\n1. PRIORITIZE identifying the brand name - look for logos, text, design patterns, and distinctive features that indicate the manufacturer or brand\n2. Determine the product type, model, and specific variant if possible\n3. Assess the condition, features, materials, and any visible text\n4. Look for indicators of authenticity or counterfeit status\n5. Note any unique selling points or special editions"
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
      analysis: response.choices[0].message.content || 'No analysis available',
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
export const generateItemDetailsFromOpenAI = async (analysisResult: AnalysisResult): Promise<any> => {
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
          content: "You are an expert at extracting structured information from text descriptions of items, with particular expertise in brand identification and market value estimation."
        },
        {
          role: "user",
          content: `Based on this analysis of an item, extract the following information in JSON format:
          {
            "title": "A concise title for the item",
            "description": "A detailed description of the item (2-3 sentences)",
            "category": "One of: Electronics, Clothing, Furniture, Kitchen, Books, Toys, Sports, Home Decor, or Other",
            "condition": "One of: New, Like New, Good, Fair, Poor",
            "brand": "The brand name if identifiable. If uncertain, provide your best guess",
            "brandConfidence": "High, Medium, or Low - how certain you are about the brand identification",
            "model": "Specific model name/number if identifiable",
            "estimatedValue": "A specific price range in USD based on the item's characteristics",
            "valueJustification": "Brief explanation of how you determined the value estimate",
            "keywords": ["array", "of", "relevant", "keywords"]
          }
          
          Important guidelines:
          1. For brand identification: Look for logos, design patterns, signature styles, and manufacturing marks
          2. For value estimation: Consider brand reputation (luxury vs budget), condition, model, age, and current market trends
          3. Be specific with price ranges (e.g., "$50-75" not "moderate value")
          4. For high-end brands (Apple, Samsung, Nike, Louis Vuitton, etc.), be more precise about value based on specific models
          5. Provide justification for your value estimate in the valueJustification field
          
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
    const structuredData = JSON.parse(response.choices[0].message.content || '{}');

    // Add brand detection confidence metrics
    const enhancedData = {
      ...structuredData,
      aiAnalysis: analysisText, // Include the original analysis for reference
      brandDetected: !!structuredData.brand && structuredData.brand !== 'null' && structuredData.brand !== 'unknown',
      valueConfidence: structuredData.valueJustification ? 'high' : 'low'
    };
    
    return enhancedData;
  } catch (error) {
    console.error('Error generating structured item details:', error);
    return {
      title: 'Item',
      description: 'No description available',
      category: 'Other',
      condition: 'Good',
      brand: null,
      brandConfidence: 'Low',
      model: null,
      estimatedValue: null,
      valueJustification: null,
      keywords: [],
      brandDetected: false,
      valueConfidence: 'low',
      aiAnalysis: analysisResult.analysis || 'Analysis not available'
    };
  }
};