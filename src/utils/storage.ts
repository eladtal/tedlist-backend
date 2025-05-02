import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Define the uploads directory path
const uploadsDir = process.env.NODE_ENV === 'production' 
  ? '/uploads'  // Use the Render disk mount path in production
  : path.join(__dirname, '../../uploads'); // Use local path in development

// Ensure uploads directory exists in development
if (process.env.NODE_ENV !== 'production' && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Add 'images-' prefix to maintain consistency with existing paths
    const uniqueSuffix = `images-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Configure file filter
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error('Only image files are allowed!'));
  }
  cb(null, true);
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper function to get the relative path for storing in the database
export const getRelativePath = (filename: string) => `/uploads/${filename}`;

export { upload }; 