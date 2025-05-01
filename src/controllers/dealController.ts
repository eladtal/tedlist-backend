import { Request, Response } from 'express';
import Deal from '../models/Deal';
import { AuthRequest } from '../types/auth';

// Get deals sent by the user
export const getSentDeals = async (req: AuthRequest, res: Response) => {
  try {
    const deals = await Deal.find({ sender: req.user?._id })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .populate('senderItems')
      .populate('receiverItems')
      .sort({ createdAt: -1 });

    res.json(deals);
  } catch (error) {
    console.error('Error in getSentDeals:', error);
    res.status(500).json({ message: 'Error fetching sent deals' });
  }
};

// Get deals received by the user
export const getReceivedDeals = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Fetching received deals for user:', req.user?._id);
    
    const query = { 
      receiver: req.user?._id,
      status: { $in: ['accepted', 'completed'] }
    };
    console.log('Query:', query);

    const deals = await Deal.find(query)
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .populate('senderItems')
      .populate('receiverItems')
      .sort({ createdAt: -1 });

    console.log('Found deals:', deals.map(deal => ({
      _id: deal._id,
      status: deal.status,
      sender: deal.sender,
      receiver: deal.receiver,
      senderItems: deal.senderItems,
      receiverItems: deal.receiverItems
    })));

    res.json(deals);
  } catch (error) {
    console.error('Error in getReceivedDeals:', error);
    res.status(500).json({ message: 'Error fetching received deals' });
  }
}; 