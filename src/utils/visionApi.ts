import { ImageAnnotatorClient } from '@google-cloud/vision';
import dotenv from 'dotenv';

dotenv.config();

// Check for the API key in environment variables
const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
if (!apiKey) {
  console.error('Google Cloud Vision API key not found in environment variables');
}

// Create a client with API key authentication
const visionClient = new ImageAnnotatorClient({
  apiEndpoint: 'vision.googleapis.com',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Path to service account key file
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID, // Optional project ID
});

// Alternative way to initialize with an API key directly if using an API key instead of service account
// Note: For Vision API, a service account is more common

/**
 * Analyze an image using Google Cloud Vision API
 * @param imageBuffer - Raw image buffer data or base64 encoded image
 * @returns Object with analysis results
 */
export const analyzeImage = async (imageBuffer: Buffer | string): Promise<any> => {
  try {
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
    
    console.log('Image analysis completed successfully');
    return result;
  } catch (error) {
    console.error('Error analyzing image with Vision API:', error);
    throw error;
  }
};

/**
 * Generate an item description based on Vision API results
 * @param analysisResults - Results from the Vision API
 * @returns Object with generated item properties
 */
export const generateItemDescription = (analysisResults: any): {
  title: string;
  description: string;
  category: string;
  condition: string;
} => {
  try {
    const labels = analysisResults.labelAnnotations || [];
    const objects = analysisResults.localizedObjectAnnotations || [];
    const imageProperties = analysisResults.imagePropertiesAnnotation;
    const textAnnotations = analysisResults.textAnnotations || [];
    
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
