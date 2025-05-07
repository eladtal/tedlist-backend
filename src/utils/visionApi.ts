import { ImageAnnotatorClient } from '@google-cloud/vision';
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Initialize Vision API client
let visionClient: ImageAnnotatorClient | null = null;
let visionApiInitialized = false;

try {
  if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
    console.warn('Warning: GOOGLE_CLOUD_VISION_API_KEY environment variable is not set');
  } else {
    // Create a client with API key authentication
    visionClient = new ImageAnnotatorClient({
      apiEndpoint: 'vision.googleapis.com',
      credentials: undefined,
      keyFilename: undefined,
      projectId: undefined
    });
    visionApiInitialized = true;
    console.log('Vision API client initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Vision API client:', error);
  // Don't re-throw - we'll handle this gracefully
}

/**
 * Analyze an image using Google Cloud Vision API
 * @param imageBuffer - Raw image buffer data or base64 encoded image
 * @returns Object with analysis results
 */
export const analyzeImage = async (imageBuffer: Buffer | string): Promise<any> => {
  try {
    if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      throw new Error('Vision API key not configured');
    }

    // This is a backup approach in case the Vision client initialization fails
    // We'll directly call the API using fetch with the key parameter
    if (!visionApiInitialized || !visionClient) {
      console.warn('Vision API client not initialized. Attempting direct API call instead.');
      
      // Make a direct API call to Vision API using fetch
      const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
      const visionApiUrl = 'https://vision.googleapis.com/v1/images:annotate';
      
      const requestBody = {
        requests: [{
          image: {
            content: typeof imageBuffer === 'string' ? imageBuffer : imageBuffer.toString('base64')
          },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
            { type: 'IMAGE_PROPERTIES' },
            { type: 'WEB_DETECTION' },
            { type: 'TEXT_DETECTION' }
          ]
        }]
      };
      
      console.log('Making direct API call to Vision API');
      
      // Use node-fetch or another HTTP client in Node.js environment
      // For simplicity, we're just showing the URL construction here
      const fullUrl = `${visionApiUrl}?key=${apiKey}`;
      console.log(`Calling Vision API at: ${visionApiUrl} (with API key)`); 
      
      // Make the actual API call
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Vision API direct call failed:', errorText);
        throw new Error(`Vision API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as { responses: any[] };
      console.log('Direct Vision API call succeeded');
      return data.responses[0];
    }
    
    console.log('Starting image analysis with Google Cloud Vision API');
    
    const [result] = await visionClient.annotateImage({
      image: {
        content: Buffer.isBuffer(imageBuffer) ? imageBuffer.toString('base64') : imageBuffer
      },
      features: [
        { type: 'LABEL_DETECTION' },
        { type: 'OBJECT_LOCALIZATION' },
        { type: 'IMAGE_PROPERTIES' },
        { type: 'TEXT_DETECTION' }
      ],
    });

    if (!result || !result.labelAnnotations) {
      throw new Error('No analysis results received from Vision API');
    }

    return result;
  } catch (error: any) {
    console.error('Error analyzing image:', error);
    throw new Error(
      `Vision API error: ${error.message || 'Unknown error occurred'}`
    );
  }
};

/**
 * Generate an item description based on Vision API results
 * @param analysisResult - Results from the Vision API
 * @returns Object with generated item properties
 */
export const generateItemDescription = (analysisResult: any): any => {
  try {
    // Handle both direct API response and client library response formats
    // Direct API calls return a different structure than the client library
    
    // Extract labels
    const labels = analysisResult.labelAnnotations || analysisResult.labelDetections || [];
    const objects = analysisResult.localizedObjectAnnotations || [];
    const webEntities = analysisResult.webDetection?.webEntities || [];
    const textAnnotations = analysisResult.textAnnotations || [];
    
    // Extract the primary object or label for title
    const mainObject = objects && objects.length > 0 ? objects[0] : null;
    const mainLabel = labels && labels.length > 0 ? labels[0] : null;
    
    // Determine the title from objects or labels
    const title = mainObject?.name || mainLabel?.description || 'Unlabeled Item';
    
    // Generate a description from top labels
    const topLabels = labels
      .slice(0, 3)
      .map((label: any) => label.description)
      .filter((desc: string) => desc.toLowerCase() !== title.toLowerCase());
    
    // Add any detected text that might be relevant
    const detectedText = textAnnotations && textAnnotations.length > 0 
      ? textAnnotations[0].description
      : '';
    
    // Generate a description with available information
    let description = `${title} `;
    if (topLabels.length > 0) {
      description += `with features: ${topLabels.join(', ')}. `;
    }
    
    if (detectedText && detectedText.length < 100) {
      description += `Contains text: "${detectedText}" `;
    }
    
    if (description.length < 20) {
      description = `${title} in good condition.`;
    }
    
    // Try to determine a category based on labels
    let category = 'Other';
    const categoryMap: Record<string, string[]> = {
      'Electronics': ['electronic', 'device', 'gadget', 'computer', 'phone', 'camera', 'television'],
      'Clothing': ['clothing', 'shirt', 'pants', 'dress', 'jacket', 'shoe', 'apparel', 'wear'],
      'Furniture': ['furniture', 'chair', 'table', 'sofa', 'desk', 'bed', 'cabinet'],
      'Kitchen': ['kitchen', 'utensil', 'appliance', 'cookware', 'dish', 'pan', 'pot'],
      'Books': ['book', 'publication', 'reading', 'literature', 'magazine'],
      'Toys': ['toy', 'game', 'play', 'doll', 'figure', 'puzzle'],
      'Sports': ['sport', 'equipment', 'ball', 'racket', 'bike', 'bicycle', 'fitness'],
      'Home Decor': ['decor', 'decoration', 'ornament', 'art', 'picture', 'frame', 'vase'],
    };
    
    // Check all labels against our category map
    for (const label of labels) {
      for (const [cat, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(keyword => 
          label.description.toLowerCase().includes(keyword)
        )) {
          category = cat;
          break;
        }
      }
      if (category !== 'Other') break;
    }
    
    // Estimate condition based on item type and any condition-related keywords
    let condition = 'Good';  // Default condition
    
    // Look for condition-related words in the labels
    const conditionKeywords = {
      'New': ['new', 'brand new', 'unused', 'sealed', 'packaged'],
      'Like New': ['like new', 'barely used', 'mint'],
      'Good': ['good', 'clean', 'working'],
      'Fair': ['fair', 'used', 'worn', 'scratched', 'dented'],
      'Poor': ['poor', 'broken', 'damaged', 'torn', 'stained']
    };
    
    // Combine all text for condition detection
    const allText = [
      ...labels.map((l: any) => l.description),
      ...(detectedText ? [detectedText] : [])
    ].join(' ').toLowerCase();
    
    // Check for condition keywords
    for (const [cond, keywords] of Object.entries(conditionKeywords)) {
      if (keywords.some(keyword => allText.includes(keyword))) {
        condition = cond;
        break;
      }
    }
    
    return {
      title: title.charAt(0).toUpperCase() + title.slice(1), // Capitalize first letter
      description: description.trim(),
      category,
      condition
    };
  } catch (error) {
    console.error('Error generating item description:', error);
    return {
      title: 'Item',
      description: 'No description available',
      category: 'Other',
      condition: 'Good'
    };
  }
};
