import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// S3 Configuration with enhanced debugging
const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
const bucketName = process.env.AWS_S3_BUCKET_NAME || '';

// Log configuration (without exposing full credentials)
console.log('S3 Configuration:', {
  region,
  accessKeyIdPresent: !!accessKeyId,
  secretAccessKeyPresent: !!secretAccessKey,
  bucketName
});

if (!accessKeyId || !secretAccessKey || !bucketName) {
  console.error('Missing S3 configuration. Please check your environment variables.');
}

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

/**
 * Upload a file to S3
 * @param file The file to upload
 * @returns The URL of the uploaded file
 */
export const uploadFileToS3 = async (file: Express.Multer.File): Promise<string> => {
  if (!file) {
    throw new Error('No file provided');
  }

  try {
    console.log('Starting S3 upload for file:', {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      bufferPresent: !!file.buffer
    });

    // Verify we have necessary configuration
    if (!bucketName) {
      throw new Error('S3 bucket name is not configured. Check AWS_S3_BUCKET_NAME environment variable.');
    }

    // Create a unique file name
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
    const filePath = `uploads/${fileName}`;
    
    console.log(`Uploading to S3: bucket=${bucketName}, key=${filePath}`);
    
    // Set the parameters
    const params = {
      Bucket: bucketName,
      Key: filePath,
      Body: file.buffer,
      ContentType: file.mimetype
      // ACL removed - bucket doesn't allow ACLs
    };
    
    // Upload to S3 with detailed logging
    try {
      const result = await s3Client.send(new PutObjectCommand(params));
      console.log('S3 upload successful:', result);
      
      // Return the URL
      const fileUrl = `https://${bucketName}.s3.amazonaws.com/${filePath}`;
      console.log('Generated S3 URL:', fileUrl);
      return fileUrl;
    } catch (s3Error: any) { // Cast to any for error handling
      console.error('S3 client error details:', s3Error);
      throw new Error(`S3 upload failed: ${s3Error.message || JSON.stringify(s3Error)}`);
    }
  } catch (error) {
    console.error('Error in uploadFileToS3:', error);
    throw error;
  }
};

/**
 * Generate a presigned URL for direct browser/app uploads
 * @param fileName The name of the file 
 * @returns Presigned URL for uploading
 */
export const getPresignedUploadUrl = async (fileName: string): Promise<string> => {
  const fileExtension = path.extname(fileName);
  const uniqueFileName = `uploads/${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: uniqueFileName,
    ContentType: 'application/octet-stream'
    // ACL removed - bucket doesn't allow ACLs
  });
  
  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return signedUrl;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
};

/**
 * Get the public URL for an S3 object
 * @param key The key of the S3 object 
 * @returns Public URL for the object
 */
export const getPublicUrl = (key: string): string => {
  return `https://${bucketName}.s3.amazonaws.com/${key}`;
};

/**
 * Extract the key from a full S3 URL
 * @param url Full S3 URL
 * @returns S3 key
 */
export const extractKeyFromUrl = (url: string): string | null => {
  if (!url) {
    console.log('extractKeyFromUrl: URL is empty');
    return null;
  }
  
  console.log('extractKeyFromUrl: Processing URL:', url);
  
  // Check if it's an S3 URL (handle both https:// and http:// formats)
  if (url.includes('s3.amazonaws.com')) {
    console.log('extractKeyFromUrl: Detected S3 URL format');
    
    // Different patterns for S3 URLs
    const patterns = [
      // Standard format: https://bucket-name.s3.amazonaws.com/key
      new RegExp(`https?://${bucketName}.s3.amazonaws.com/(.+)`),
      // Alternative format: https://s3.amazonaws.com/bucket-name/key
      new RegExp(`https?://s3.amazonaws.com/${bucketName}/(.+)`),
      // Generic pattern as fallback
      new RegExp('https?://[^/]+/(.+)')
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log(`extractKeyFromUrl: Matched S3 key: ${match[1]}`);
        return match[1];
      }
    }
    
    // If no patterns match but it's definitely an S3 URL
    // Try to extract key from the end of the URL
    const urlParts = url.split('/');
    // Get all parts after the domain
    const possibleKey = urlParts.slice(3).join('/');
    if (possibleKey) {
      console.log(`extractKeyFromUrl: Extracted possible key from URL parts: ${possibleKey}`);
      return possibleKey;
    }
  }
  
  // If it's just a relative path (e.g., 'uploads/filename.jpg')
  if (url.startsWith('uploads/')) {
    console.log(`extractKeyFromUrl: Using relative path as key: ${url}`);
    return url;
  }
  
  // If it contains our API image proxy path
  if (url.includes('/api/images/')) {
    const filename = url.split('/').pop();
    if (filename) {
      const key = `uploads/${filename}`;
      console.log(`extractKeyFromUrl: Extracted key from API proxy path: ${key}`);
      return key;
    }
  }
  
  // If it's just a filename, add the uploads/ prefix
  if (!url.includes('/')) {
    const key = `uploads/${url}`;
    console.log(`extractKeyFromUrl: Added uploads/ prefix to filename: ${key}`);
    return key;
  }
  
  console.log('extractKeyFromUrl: Could not extract key from URL:', url);
  return null;
};

/**
 * Delete an object from S3
 * @param key The key of the S3 object to delete, or the full S3 URL
 * @returns true if deletion was successful
 */
export const deleteObjectFromS3 = async (key: string): Promise<boolean> => {
  try {
    console.log('deleteObjectFromS3: Starting deletion process for:', key);
    
    // Check S3 configuration
    if (!accessKeyId || !secretAccessKey || !bucketName) {
      console.error('deleteObjectFromS3: Missing S3 configuration. Please check environment variables.');
      console.log('Region:', region);
      console.log('Bucket name:', bucketName);
      console.log('Access key present:', !!accessKeyId);
      console.log('Secret key present:', !!secretAccessKey);
      return false;
    }
    
    // Extract the S3 key if given a URL
    let s3Key: string | null;
    
    if (key.includes('s3.amazonaws.com') || key.includes('/api/images/') || key.includes('://')) {
      console.log('deleteObjectFromS3: Parsing URL to extract S3 key');
      s3Key = extractKeyFromUrl(key);
    } else if (key.startsWith('uploads/')) {
      console.log('deleteObjectFromS3: Using key directly as it starts with uploads/');
      s3Key = key;
    } else if (!key.includes('/')) {
      console.log('deleteObjectFromS3: Adding uploads/ prefix to filename');
      s3Key = `uploads/${key}`;
    } else {
      console.log('deleteObjectFromS3: Using key as-is');
      s3Key = key;
    }
    
    if (!s3Key) {
      console.error('deleteObjectFromS3: Could not extract valid S3 key from:', key);
      return false;
    }
    
    console.log(`deleteObjectFromS3: Attempting to delete from S3: bucket=${bucketName}, key=${s3Key}`);
    
    // Ensure no leading slash in the key
    const cleanKey = s3Key.startsWith('/') ? s3Key.substring(1) : s3Key;
    
    const params = {
      Bucket: bucketName,
      Key: cleanKey
    };
    
    console.log('deleteObjectFromS3: Delete parameters:', JSON.stringify(params));
    
    try {
      const result = await s3Client.send(new DeleteObjectCommand(params));
      console.log('deleteObjectFromS3: S3 deletion response:', result);
      console.log('deleteObjectFromS3: S3 object deleted successfully:', cleanKey);
      return true;
    } catch (s3Error: any) {
      console.error('deleteObjectFromS3: S3 client error details:', s3Error);
      console.error('deleteObjectFromS3: Error message:', s3Error.message);
      
      // Check for common errors
      if (s3Error.name === 'NoSuchKey') {
        console.log('deleteObjectFromS3: The specified key does not exist in the bucket');
      } else if (s3Error.name === 'AccessDenied') {
        console.log('deleteObjectFromS3: Access denied - check IAM permissions');
      }
      
      return false;
    }
  } catch (error) {
    console.error('deleteObjectFromS3: Unexpected error:', error);
    return false;
  }
};
