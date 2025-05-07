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
  if (!url) return null;
  
  // Check if it's an S3 URL
  if (url.includes('s3.amazonaws.com')) {
    // Get everything after the bucket name in the URL
    const bucketPattern = new RegExp(`https://${bucketName}.s3.amazonaws.com/(.+)`);
    const match = url.match(bucketPattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // If it's just a relative path (e.g., 'uploads/filename.jpg')
  if (url.startsWith('uploads/')) {
    return url;
  }
  
  // If it's just a filename, add the uploads/ prefix
  if (!url.includes('/')) {
    return `uploads/${url}`;
  }
  
  return null;
};

/**
 * Delete an object from S3
 * @param key The key of the S3 object to delete, or the full S3 URL
 * @returns true if deletion was successful
 */
export const deleteObjectFromS3 = async (key: string): Promise<boolean> => {
  try {
    // If we were passed a full URL, extract just the key
    const s3Key = key.includes('s3.amazonaws.com') ? extractKeyFromUrl(key) : key;
    
    if (!s3Key) {
      console.error('Could not extract valid S3 key from:', key);
      return false;
    }
    
    console.log(`Deleting from S3: bucket=${bucketName}, key=${s3Key}`);
    
    const params = {
      Bucket: bucketName,
      Key: s3Key
    };
    
    await s3Client.send(new DeleteObjectCommand(params));
    console.log('S3 object deleted successfully:', s3Key);
    return true;
  } catch (error) {
    console.error('Error deleting object from S3:', error);
    return false;
  }
};
