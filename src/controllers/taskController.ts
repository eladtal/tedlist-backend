import { Request, Response } from 'express';
import { Task } from '../models/Task';

export const getTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await Task.find({ user: req.user?._id });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const task = new Task({
      ...req.body,
      user: req.user?._id
    });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error creating task' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user?._id },
      req.body,
      { new: true }
    );
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error updating task' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user?._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting task' });
  }
}; 