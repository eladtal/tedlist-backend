import { Request, Response } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthRequest } from '../types/auth';
import { analyzeImageWithOpenAI, generateItemDetailsFromOpenAI } from '../utils/openaiVisionApi';
import fs from 'fs';
import path from 'path';

/**
 * Analyze an image with OpenAI vision and generate item details
 */
export const analyzeItemImageWithOpenAI: RequestHandler = async (req: AuthRequest & { file?: Express.Multer.File }, res: Response) => {
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

    console.log('Starting OpenAI image analysis for file:', req.file.originalname);

    // Analyze the image using OpenAI Vision API
    const imageBuffer = req.file.buffer;
    
    const analysisResults = await analyzeImageWithOpenAI(imageBuffer);
    console.log('OpenAI image analysis completed');
    
    // Generate item details from analysis results
    const itemDetails = await generateItemDetailsFromOpenAI(analysisResults);
    console.log('Generated item details with OpenAI:', itemDetails);
    
    // Return the generated item details
    res.status(200).json({
      success: true,
      message: 'Image analyzed successfully with OpenAI',
      data: itemDetails
    });
  } catch (error) {
    console.error('Error analyzing image with OpenAI:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error analyzing image with OpenAI',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

/**
 * No-auth version of analyzeItemImageWithOpenAI for testing
 */
export const analyzeItemImageWithOpenAITest: RequestHandler = async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file provided' 
      });
    }

    console.log('Starting OpenAI image analysis for file (TEST):', req.file.originalname);

    // Analyze the image using OpenAI Vision API
    const imageBuffer = req.file.buffer;
    
    const analysisResults = await analyzeImageWithOpenAI(imageBuffer);
    console.log('OpenAI image analysis completed (TEST)');
    
    // Generate item details from analysis results
    const itemDetails = await generateItemDetailsFromOpenAI(analysisResults);
    console.log('Generated item details with OpenAI (TEST):', itemDetails);
    
    // Return the generated item details
    res.status(200).json({
      success: true,
      message: 'Image analyzed successfully with OpenAI',
      data: itemDetails
    });
  } catch (error: any) {
    console.error('Error analyzing image with OpenAI (TEST):', error);
    res.status(500).json({ 
      success: false, 
      message: 'Something went wrong!',
      error: error.message || 'Unknown error' 
    });
  }
};

/**
 * Analyze a remote image via URL and generate item description using OpenAI
 */
export const analyzeItemImageByUrlWithOpenAI: RequestHandler = async (req: AuthRequest, res: Response) => {
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
    
    console.log('Starting OpenAI image analysis for URL:', imageUrl);
    
    // Analyze the image using OpenAI Vision API with the image URL
    const analysisResults = await analyzeImageWithOpenAI(imageUrl);
    console.log('OpenAI image URL analysis completed');
    
    // Generate item details from analysis results
    const itemDetails = await generateItemDetailsFromOpenAI(analysisResults);
    console.log('Generated item details from URL image with OpenAI:', itemDetails);
    
    // Return the generated item details
    res.status(200).json({
      success: true,
      message: 'Image analyzed successfully with OpenAI',
      data: {
        ...itemDetails,
        imageUrl
      }
    });
  } catch (error) {
    console.error('Error analyzing image URL with OpenAI:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing image URL with OpenAI',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * No-auth version of analyzeItemImageByUrlWithOpenAI for testing
 */
export const analyzeItemImageByUrlWithOpenAITest: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'No image URL provided' });
    }
    
    console.log('Analyzing image by URL with OpenAI (TEST):', imageUrl);
    
    // Analyze the image using OpenAI Vision API
    const analysisResults = await analyzeImageWithOpenAI(imageUrl);
    console.log('OpenAI image URL analysis completed (TEST)');
    
    // Generate item details from analysis results
    const itemDetails = await generateItemDetailsFromOpenAI(analysisResults);
    console.log('Generated item details from URL with OpenAI (TEST):', itemDetails);
    
    // Return the generated item details
    res.status(200).json({
      success: true,
      message: 'Image analyzed successfully with OpenAI',
      data: {
        ...itemDetails,
        imageUrl
      }
    });
  } catch (error: any) {
    console.error('Error analyzing image URL with OpenAI (TEST):', error);
    res.status(500).json({ 
      success: false, 
      message: 'Something went wrong!',
      error: error.message || 'Unknown error' 
    });
  }
}; 