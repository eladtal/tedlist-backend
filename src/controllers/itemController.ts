import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { AuthRequest } from '../types/auth';
import { Item } from '../models/Item';
import { RequestHandler } from 'express-serve-static-core';
import multer from 'multer';
import { IUser } from '../types/user';

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
    const items = await Item.find().populate('userId', 'name');
    
    if (!items || items.length === 0) {
      return res.json({
        success: true,
        items: []
      });
    }

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
        _id: item.userId ? item.userId.toString() : 'unknown'
      },
      teddyBonus: item.teddyBonus || Math.floor(Math.random() * 10) + 1
    }));

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

    const files = Array.isArray(req.files) ? req.files : req.files?.images || [];
    const itemData = {
      ...req.body,
      userId: req.user._id,
      images: files.map(file => `/uploads/${file.filename}`)
    };

    const item = new Item(itemData);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ message: 'Error creating item' });
  }
};

// Delete item
export const deleteItem: RequestHandler = async (req: Request, res: Response) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting item' });
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