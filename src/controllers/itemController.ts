import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { AuthRequest } from '../types/auth';
import { Item } from '../models/Item';
import { RequestHandler } from 'express-serve-static-core';
import multer from 'multer';
import { IUser } from '../types/user';
import { getRelativePath } from '../utils/storage';
import { uploadFileToS3, deleteObjectFromS3 } from '../utils/s3Storage';

interface ItemParams extends ParamsDictionary {
  id: string;
}

// Define custom request types
interface CreateItemRequest extends Request {
  user?: IUser;
  files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
}

// Get all items
export const getAllItems: RequestHandler = async (req: Request, res: Response) => {
  try {
    // Populate name and email from the referenced user document
    const items = await Item.find().populate('userId', 'name email');
    
    if (!items || items.length === 0) {
      return res.json({
        success: true,
        items: []
      });
    }

    const formattedItems = items.map(item => {
      // Ensure userId is populated and has the expected fields
      const userObject = item.userId as any; // Cast to any to access populated fields
      return {
        _id: item._id.toString(),
        title: item.title,
        description: item.description,
        images: item.images,
        condition: item.condition,
        type: item.type,
        status: item.status,
        createdAt: item.createdAt,
        // Construct the 'owner' field as expected by the frontend
        owner: userObject ? {
          _id: userObject._id ? userObject._id.toString() : 'unknown',
          name: userObject.name || 'Unknown User',
          email: userObject.email || 'no-email@example.com' // Provide a fallback or handle missing email
        } : {
          _id: 'unknown',
          name: 'Unknown User',
          email: 'no-email@example.com'
        },
        teddyBonus: item.teddyBonus || Math.floor(Math.random() * 10) + 1
      };
    });

    res.json({
      success: true,
      items: formattedItems
    });
  } catch (error) {
    console.error('Error in getAllItems:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching items'
    });
  }
};

// Create new item
export const createItem: RequestHandler = async (req: CreateItemRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if images were provided in the request body
    console.log('Create item request body:', req.body);
    
    // Try to use images from the request body first, fall back to uploaded files if needed
    let imageArray = [];
    
    // If images exist in request body and it's an array, use those
    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      console.log('Using images from request body:', req.body.images);
      imageArray = req.body.images;
    } else {
      // Fall back to files if no images in the body
      const files = Array.isArray(req.files) ? req.files : req.files?.images || [];
      console.log('No images in body, using uploaded files:', files.length);
      imageArray = files.map(file => getRelativePath(file.filename));
    }
    
    console.log('Final image array for MongoDB:', imageArray);
    
    const itemData = {
      ...req.body,
      userId: req.user._id,
      images: imageArray
    };

    const item = new Item(itemData);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ message: 'Error creating item' });
  }
};

// Delete item and its associated S3 images
export const deleteItem: RequestHandler = async (req: Request, res: Response) => {
  console.log(`=== DELETE ITEM REQUEST for ID: ${req.params.id} ===`);
  try {
    // First find the item to get its images
    const item = await Item.findById(req.params.id);
    if (!item) {
      console.log(`Item not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Item not found' });
    }

    console.log(`Found item: ${item._id}, title: ${item.title}`);
    console.log(`Item has ${item.images?.length || 0} images`);
    console.log(`Raw image data:`, JSON.stringify(item.images));

    // Delete the item's images from S3
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      console.log(`Deleting ${item.images.length} images for item ${req.params.id}`);
      
      // Track results of each deletion
      const deletionResults = [];
      
      // Process each image URL and delete from S3
      for (const imageUrl of item.images) {
        if (typeof imageUrl === 'string' && imageUrl.trim().length > 0) {
          try {
            console.log(`Processing image URL: ${imageUrl}`);
            
            // Check if this is a valid URL or path
            if (imageUrl.includes('undefined') || imageUrl === 'null') {
              console.log(`Skipping invalid image URL: ${imageUrl}`);
              deletionResults.push({ url: imageUrl, success: false, reason: 'Invalid URL' });
              continue;
            }
            
            // Try to delete from S3
            const result = await deleteObjectFromS3(imageUrl);
            console.log(`Image deletion result for ${imageUrl}: ${result ? 'Success' : 'Failed'}`);
            deletionResults.push({ url: imageUrl, success: result });
          } catch (err) {
            console.error(`Error deleting image ${imageUrl}:`, err);
            deletionResults.push({ 
              url: imageUrl, 
              success: false, 
              error: err instanceof Error ? err.message : 'Unknown error'
            });
          }
        } else {
          console.log(`Skipping non-string image value: ${imageUrl}`);
        }
      }
      
      // Log summary of deletion operations
      const successCount = deletionResults.filter(r => r.success).length;
      console.log(`S3 deletion summary: ${successCount}/${item.images.length} successful`);
      console.log('Detailed results:', JSON.stringify(deletionResults));
      
    } else {
      console.log(`No images to delete for item ${req.params.id}`);
    }

    // Now delete the item from the database
    await Item.findByIdAndDelete(req.params.id);
    console.log(`Item with ID ${req.params.id} deleted from database`);
    
    res.json({ 
      message: 'Item and associated images deleted successfully',
      itemId: req.params.id
    });
  } catch (error) {
    console.error('Error in deleteItem:', error);
    res.status(500).json({ 
      message: 'Error deleting item', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// Get user's items
export const getUserItems: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const items = await Item.find({ userId: req.user._id }).populate('userId', 'name');
    
    const formattedItems = items.map(item => ({
      _id: item._id.toString(),
      title: item.title,
      description: item.description,
      images: item.images,
      condition: item.condition,
      type: item.type,
      status: item.status,
      createdAt: item.createdAt,
      user: {
        name: item.userId ? (item.userId as any).name : 'Unknown User',
        _id: item.userId.toString()
      },
      teddyBonus: item.teddyBonus || Math.floor(Math.random() * 10) + 1
    }));

    res.json({
      success: true,
      items: formattedItems
    });
  } catch (error) {
    console.error('Error in getUserItems:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching user items'
    });
  }
};

export const getItems: RequestHandler = async (req: Request, res: Response) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items' });
  }
};

export const updateItem: RequestHandler = async (req: Request, res: Response) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error updating item' });
  }
};

// Get available items for swiping (excluding user's own items)
export const getAvailableItems: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Get items excluding the user's own items
    const items = await Item.find({ 
      userId: { $ne: req.user._id },  // Exclude user's own items
      status: 'available'  // Only show available items
    }).populate('userId', 'name');
    
    // Get the base URL from the request
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const formattedItems = items.map(item => {
      // Filter out invalid image paths and normalize the valid ones
      const validImages = (item.images || [])
        .filter(image => typeof image === 'string' && image.length > 0)
        .map(image => {
          // Remove any existing base URL to prevent duplication
          const cleanPath = image.replace(baseUrl, '').replace(/^\/+/, '');
          // Ensure the path starts with /uploads/
          const normalizedPath = cleanPath.startsWith('uploads/') ? `/${cleanPath}` : `/uploads/${cleanPath}`;
          return `${baseUrl}${normalizedPath}`;
        });

      return {
        id: item._id.toString(),
        title: item.title,
        description: item.description,
        images: validImages,
        condition: item.condition,
        type: item.type,
        status: item.status,
        createdAt: item.createdAt,
        userId: item.userId.toString()
      };
    });

    // Filter out items with no valid images
    const itemsWithImages = formattedItems.filter(item => item.images.length > 0);

    console.log('Sending formatted items with images:', 
      itemsWithImages.map(item => ({
        id: item.id,
        images: item.images
      }))
    );

    res.json(itemsWithImages);
  } catch (error) {
    console.error('Error in getAvailableItems:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching available items'
    });
  }
}; 

// Upload image standalone endpoint - now with S3 support
export const uploadImage: RequestHandler = async (req: AuthRequest & { file?: Express.Multer.File }, res: Response) => {
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

    // Upload file to S3 instead of local storage
    const imageUrl = await uploadFileToS3(req.file);
    
    // Return the S3 URL to the uploaded image
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully to S3',
      data: {
        imageUrl
      }
    });
  } catch (error) {
    console.error('Error uploading image to S3:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error uploading image to S3',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};