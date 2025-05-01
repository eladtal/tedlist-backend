import { Response } from 'express';
import { AuthRequest } from '../types/auth';
import { User } from '../models/User';
import { Item } from '../models/Item';
import Deal from '../models/Deal';
import { createNotification } from './notificationController';

export const startTradingSession = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.body;
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Update user's trading session
    await User.findByIdAndUpdate(req.user._id, {
      'tradingSession.activeItemId': itemId,
      'tradingSession.startedAt': new Date()
    });

    res.json({
      success: true,
      message: 'Trading session started',
      itemId
    });
  } catch (error) {
    console.error('Error starting trading session:', error);
    res.status(500).json({ message: 'Error starting trading session', error });
  }
};

export const getAvailableItems = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      console.log('No authenticated user found');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await User.findById(req.user._id);
    console.log('User trading session:', user?.tradingSession);
    
    if (!user?.tradingSession?.activeItemId) {
      console.log('No active trading session found');
      return res.json([]);
    }

    // Log the query parameters
    const queryParams = {
      userId: { $ne: user._id },
      _id: { $nin: user.swipedItems || [] },
      type: 'trade',
      status: 'available'
    };
    console.log('Query parameters:', queryParams);

    // First, let's get ALL items to see what's available
    const allItems = await Item.find();
    console.log('All items in database:', allItems.map(item => ({
      _id: item._id,
      title: item.title,
      userId: item.userId,
      type: item.type,
      status: item.status
    })));

    // Get real items that:
    // 1. Don't belong to the current user
    // 2. Haven't been swiped by the user
    // 3. Are available for trading
    const realItems = await Item.find(queryParams).populate('userId', 'name');
    console.log('Filtered items:', realItems);

    // Transform real items to match the format
    const formattedItems = realItems.map(item => ({
      _id: item._id.toString(),
      title: item.title,
      description: item.description,
      images: item.images,
      condition: item.condition,
      type: item.type,
      status: item.status,
      user: {
        name: (item.userId as any)?.name || 'Anonymous',
        _id: item.userId.toString()
      },
      teddyBonus: item.teddyBonus || Math.floor(Math.random() * 10) + 1
    }));

    console.log('Formatted items being returned:', formattedItems);

    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching available items:', error);
    res.status(500).json({ message: 'Error fetching items', error });
  }
};

export const swipeItem = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, direction } = req.body;
    console.log('Swipe request:', { itemId, direction, userId: req.user?._id });

    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await User.findById(req.user._id);
    console.log('User found:', { userId: user?._id, name: user?.name });

    if (!user?.tradingSession?.activeItemId) {
      return res.status(400).json({ message: 'No active trading session' });
    }

    // Record the swipe
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { swipedItems: itemId }
    });
    console.log('Swipe recorded for user');

    if (direction === 'right') {
      // Get the item and its owner
      const likedItem = await Item.findById(itemId);
      console.log('Liked item found:', { 
        itemId: likedItem?._id, 
        title: likedItem?.title,
        ownerId: likedItem?.userId
      });

      if (!likedItem) {
        return res.status(404).json({ message: 'Item not found' });
      }

      // Get the item owner's details
      const itemOwner = await User.findById(likedItem.userId);
      console.log('Item owner found:', {
        ownerId: itemOwner?._id,
        ownerName: itemOwner?.name
      });

      if (!itemOwner) {
        console.error('Item owner not found');
        return res.status(404).json({ message: 'Item owner not found' });
      }

      try {
        // Create a notification for the item owner
        const notification = await createNotification(
          itemOwner._id.toString(),
          'offer',
          likedItem._id.toString(),
          user._id.toString(),
          `${user.name} is interested in your item "${likedItem.title}"`
        );
        console.log('Notification created:', notification);
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
        // Don't return here, continue with the swipe process
      }

      // Check if the other user has also swiped right on the current user's item
      const otherUser = await User.findOne({
        'tradingSession.activeItemId': itemId,
        swipedItems: user.tradingSession.activeItemId
      });
      console.log('Checking for match:', { 
        otherUserId: otherUser?._id,
        otherUserName: otherUser?.name
      });

      if (otherUser) {
        try {
          // It's a match! Create match notifications for both users
          const [notification1, notification2] = await Promise.all([
            createNotification(
              otherUser._id.toString(),
              'match',
              likedItem._id.toString(),
              user._id.toString(),
              `You have a match with ${user.name} for "${likedItem.title}"`
            ),
            createNotification(
              user._id.toString(),
              'match',
              user.tradingSession.activeItemId.toString(),
              otherUser._id.toString(),
              `You have a match with ${otherUser.name}`
            )
          ]);
          console.log('Match notifications created:', { notification1, notification2 });
        } catch (matchNotifError) {
          console.error('Error creating match notifications:', matchNotifError);
        }

        return res.json({
          success: true,
          isMatch: true,
          matchedUser: otherUser.name,
          matchedItemId: itemId,
          teddyBonus: Math.floor(Math.random() * 10) + 5 // Bonus teddies for a match!
        });
      }
    }

    res.json({
      success: true,
      isMatch: false,
      teddyBonus: 1 // Base teddy reward for swiping
    });
  } catch (error) {
    console.error('Error recording swipe:', error);
    res.status(500).json({ message: 'Error recording swipe', error });
  }
};

export const acceptTrade = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, fromUserId } = req.body;
    console.log('Accept trade request:', { itemId, fromUserId, currentUser: req.user?._id });
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get the items involved in the trade
    const receiverItem = await Item.findById(itemId);
    const sender = await User.findById(fromUserId);
    console.log('Found items and users:', { 
      receiverItem: receiverItem?._id, 
      sender: sender?._id,
      senderActiveItem: sender?.tradingSession?.activeItemId 
    });

    if (!receiverItem || !sender || !sender.tradingSession?.activeItemId) {
      return res.status(404).json({ message: 'Items not found' });
    }
    const senderItem = await Item.findById(sender.tradingSession.activeItemId);
    if (!senderItem) {
      return res.status(404).json({ message: 'Sender item not found' });
    }

    console.log('Creating deal with:', {
      sender: fromUserId,
      receiver: req.user._id,
      senderItems: [senderItem._id],
      receiverItems: [receiverItem._id]
    });

    // Create a new deal
    const deal = new Deal({
      sender: fromUserId,
      receiver: req.user._id,
      senderItems: [senderItem._id],
      receiverItems: [receiverItem._id],
      status: 'accepted',
      teddiesEarned: Math.floor(Math.random() * 10) + 5 // Random bonus between 5-15
    });
    const savedDeal = await deal.save();
    console.log('Created deal:', savedDeal);

    // Update both items' status
    await Item.findByIdAndUpdate(itemId, { status: 'traded' });
    await Item.findByIdAndUpdate(senderItem._id, { status: 'traded' });
    
    // Create a notification for the user who initiated the trade
    await createNotification(
      fromUserId,
      'message',
      itemId,
      req.user._id.toString(),
      'Your trade request has been accepted!'
    );

    res.json({ 
      success: true, 
      message: 'Trade accepted',
      deal: savedDeal
    });
  } catch (error) {
    console.error('Error accepting trade:', error);
    res.status(500).json({ message: 'Error accepting trade' });
  }
};

export const resetSwipes = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log('Resetting swipes for user:', req.user._id);

    // Reset swipedItems array for the user
    await User.findByIdAndUpdate(req.user._id, {
      swipedItems: [],
      'tradingSession.activeItemId': null,
      'tradingSession.startedAt': null
    });

    // Reset all items' status to 'available'
    await Item.updateMany(
      { status: 'traded' },
      { status: 'available' }
    );

    res.json({
      success: true,
      message: 'Swipes and traded items reset successfully'
    });
  } catch (error) {
    console.error('Error resetting swipes:', error);
    res.status(500).json({ message: 'Error resetting swipes', error });
  }
};

export const declineTrade = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, fromUserId } = req.body;
    
    if (!req.user?._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Create a notification for the user who initiated the trade
    await createNotification(
      fromUserId,
      'message',
      itemId,
      req.user._id.toString(),
      'Your trade request has been declined'
    );

    res.json({ success: true, message: 'Trade declined' });
  } catch (error) {
    console.error('Error declining trade:', error);
    res.status(500).json({ message: 'Error declining trade' });
  }
}; 