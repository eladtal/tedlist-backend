import { Request, Response, NextFunction } from 'express';
import { IUser } from './user';

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface AuthResponse extends Response {}

export interface AuthNextFunction extends NextFunction {} 