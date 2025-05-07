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
    
    // Generate item details from analysis results
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
