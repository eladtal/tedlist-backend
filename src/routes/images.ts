import express from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// S3 Configuration
const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
const bucketName = process.env.AWS_S3_BUCKET_NAME || '';

// Create S3 client
const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

/**
 * Image proxy endpoint - fetches images from S3 and serves them
 * GET /api/images/:filename
 */
router.get('/:filename', async (req, res) => {
  const filename = req.params.filename;
  
  // Basic validation
  if (!filename) {
    return res.status(400).send('Filename is required');
  }
  
  try {
    console.log(`[ImageProxy] Fetching image from S3: ${filename}`);
    
    // Construct the S3 key (path) - all images are in the uploads folder
    const key = `uploads/${filename}`;
    console.log(`[ImageProxy] Requesting S3 object with key: ${key} from bucket: ${bucketName}`);
    
    // Create the GetObject command
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    
    // Execute the command to get the object
    const s3Response = await s3Client.send(command);
    
    // Set content type header based on the S3 object's content type
    if (s3Response.ContentType) {
      res.setHeader('Content-Type', s3Response.ContentType);
    } else {
      // Default to jpeg if content type is not available
      res.setHeader('Content-Type', 'image/jpeg');
    }
    
    // Set caching headers
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    
    // Stream the image data to the response
    if (s3Response.Body instanceof Readable) {
      s3Response.Body.pipe(res);
    } else {
      // Handle non-streamable response
      res.status(500).send('Error streaming image data');
    }
  } catch (error: any) {
    console.error('[ImageProxy] Error fetching image:', error);
    // More detailed error reporting
    if (error.name === 'NoSuchKey') {
      console.error(`[ImageProxy] The key ${filename} does not exist in the S3 bucket`);
      return res.status(404).send(`Image not found: ${filename}`);
    }
    
    if (error.name === 'AccessDenied') {
      console.error(`[ImageProxy] Access denied to the S3 object: ${filename}`);
      return res.status(403).send('Access denied to image');
    }
    
    res.status(500).send(`Server error: ${error.message || 'Unknown error'}`);
  }
});

export default router;
