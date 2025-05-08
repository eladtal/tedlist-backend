import { Request, Response } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthRequest } from '../types/auth';
import { analyzeImage, generateItemDescription } from '../utils/visionApi';
import fs from 'fs';
import path from 'path';

/**
 * Analyze an image and generate item description
 */
export const analyzeItemImage: RequestHandler = async (req: AuthRequest & { file?: Express.Multer.File }, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file provided' 
      });
    }

    console.log('Starting image analysis for file:', req.file.originalname);

    // Analyze the image using Vision API
    const imageBuffer = req.file.buffer;
    
    const analysisResults = await analyzeImage(imageBuffer);
    console.log('Image analysis completed');
    
    // Generate item details from analysis resultsd
    const itemDetails = generateItemDescription(analysisResults);
    console.log('Generated item details:', itemDetails);
    
    // Return the generated item details
    res.status(200).json({
      success: true,
      message: 'Image analyzed successfully',
      data: {
        ...itemDetails,
        // Include partial analysis data for transparency
        analysis: {
          labels: analysisResults.labelAnnotations?.map((label: any) => ({
            description: label.description,
            score: label.score
          })) || [],
          objects: analysisResults.localizedObjectAnnotations?.map((obj: any) => ({
            name: obj.name,
            score: obj.score
          })) || []
        }
      }
    });
  } catch (error) {
    console.error('Error analyzing image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error analyzing image',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

/**
 * Analyze a remote image via URL and generate item description
 */
/**
 * No-auth version of analyzeItemImage for testing
 */
export const analyzeItemImageTest: RequestHandler = async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file provided' 
      });
    }

    console.log('Starting image analysis for file (TEST):', req.file.originalname);

    // Analyze the image using Vision API
    const imageBuffer = req.file.buffer;
    
    const analysisResults = await analyzeImage(imageBuffer);
    console.log('Image analysis completed (TEST)');
    
    // Generate item details from analysis results
    const itemDetails = generateItemDescription(analysisResults);
    console.log('Generated item details (TEST):', itemDetails);
    
    // Return the generated item details
    res.status(200).json({
      success: true,
      message: 'Image analyzed successfully',
      data: {
        ...itemDetails,
        // Include partial analysis data for transparency
        analysis: {
          labels: analysisResults.labelAnnotations?.map((label: any) => ({
            description: label.description,
            score: label.score
          })) || [],
          objects: analysisResults.localizedObjectAnnotations?.map((obj: any) => ({
            name: obj.name,
            score: obj.score
          })) || []
        }
      }
    });
  } catch (error: any) {
    console.error('Error analyzing image (TEST):', error);
    res.status(500).json({ 
      success: false, 
      message: 'Something went wrong!',
      error: error.message || 'Unknown error' 
    });
  }
};

/**
 * No-auth version of analyzeItemImageByUrl for testing
 */
export const analyzeItemImageByUrlTest: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'No image URL provided' });
    }
    
    console.log('Analyzing image by URL (TEST):', imageUrl);
    
    // Analyze the image using Vision API
    const analysisResults = await analyzeImage(imageUrl);
    console.log('Image URL analysis completed (TEST)');
    
    // Generate item details from analysis results
    const itemDetails = generateItemDescription(analysisResults);
    console.log('Generated item details from URL (TEST):', itemDetails);
    
    // Return the generated item details
    res.status(200).json({
      success: true,
      message: 'Image analyzed successfully',
      data: {
        ...itemDetails,
        // Include partial analysis data for transparency
        analysis: {
          labels: analysisResults.labelAnnotations?.map((label: any) => ({
            description: label.description,
            score: label.score
          })) || [],
          objects: analysisResults.localizedObjectAnnotations?.map((obj: any) => ({
            name: obj.name,
            score: obj.score
          })) || []
        }
      }
    });
  } catch (error: any) {
    console.error('Error analyzing image URL (TEST):', error);
    res.status(500).json({ 
      success: false, 
      message: 'Something went wrong!',
      error: error.message || 'Unknown error' 
    });
  }
};

export const analyzeItemImageByUrl: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'No image URL provided'
      });
    }
    
    console.log('Starting image analysis for URL:', imageUrl);
    
    // Analyze the image using Vision API with the image URL
    const analysisResults = await analyzeImage(imageUrl);
    console.log('Image URL analysis completed');
    
    // Generate item details from analysis results
    const itemDetails = generateItemDescription(analysisResults);
    console.log('Generated item details from URL image:', itemDetails);
    
    // Return the generated item details
    res.status(200).json({
      success: true,
      message: 'Image analyzed successfully',
      data: {
        ...itemDetails,
        imageUrl,
        // Include partial analysis data for transparency
        analysis: {
          labels: analysisResults.labelAnnotations?.map((label: any) => ({
            description: label.description,
            score: label.score
          })) || [],
          objects: analysisResults.localizedObjectAnnotations?.map((obj: any) => ({
            name: obj.name,
            score: obj.score
          })) || []
        }
      }
    });
  } catch (error) {
    console.error('Error analyzing image URL:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing image URL',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
