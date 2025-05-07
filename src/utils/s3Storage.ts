import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const bucketName = process.env.AWS_S3_BUCKET_NAME || '';

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
    // Create a unique file name
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
    
    // Set the parameters
    const params = {
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
      Body: file.buffer,
      ContentType: file.mimetype
      // ACL removed - bucket doesn't allow ACLs
    };
    
    // Upload to S3
    await s3Client.send(new PutObjectCommand(params));
    
    // Return the URL
    return `https://${bucketName}.s3.amazonaws.com/uploads/${fileName}`;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
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
