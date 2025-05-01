import { Request, Response } from 'express';
import { User } from '../models/User';

const QUESTS = {
  SWIPE_10: {
    id: 'swipe_10',
    title: 'Swipe Master',
    description: 'Swipe on 10 items',
    reward: 50,
    target: 10
  },
  FIRST_TRADE: {
    id: 'first_trade',
    title: 'First Trade',
    description: 'Complete your first trade',
    reward: 500,
    target: 1
  },
  INVITE_FRIEND: {
    id: 'invite_friend',
    title: 'Spread the Word',
    description: 'Invite a friend to Tedlist',
    reward: 200,
    target: 1
  }
};

export const getQuests = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userQuests = user.quests || [];
    const allQuests = Object.values(QUESTS).map(quest => {
      const userQuest = userQuests.find(q => q.id === quest.id);
      return {
        ...quest,
        progress: userQuest?.progress || 0,
        completed: userQuest?.completed || false
      };
    });

    res.json(allQuests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching quests', error });
  }
};

export const updateQuestProgress = async (req: Request, res: Response) => {
  try {
    const { questId, progress } = req.body;
    const user = await User.findById(req.user?._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const quest = QUESTS[questId as keyof typeof QUESTS];
    if (!quest) {
      return res.status(404).json({ message: 'Quest not found' });
    }

    const userQuest = user.quests.find(q => q.id === questId);
    if (userQuest) {
      userQuest.progress = progress;
      if (progress >= quest.target && !userQuest.completed) {
        userQuest.completed = true;
        userQuest.completedAt = new Date();
        user.teddies += quest.reward;
        user.teddyTransactions.push({
          amount: quest.reward,
          description: `Completed quest: ${quest.title}`,
          timestamp: new Date()
        });
      }
    } else {
      user.quests.push({
        id: questId,
        progress,
        completed: progress >= quest.target,
        completedAt: progress >= quest.target ? new Date() : undefined
      });

      if (progress >= quest.target) {
        user.teddies += quest.reward;
        user.teddyTransactions.push({
          amount: quest.reward,
          description: `Completed quest: ${quest.title}`,
          timestamp: new Date()
        });
      }
    }

    await user.save();
    res.json({
      quests: user.quests,
      teddies: user.teddies,
      teddyTransactions: user.teddyTransactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating quest progress', error });
  }
}; 