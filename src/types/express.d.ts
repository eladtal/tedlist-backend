import { IUser } from '../models/User'
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from 'express';

declare global {
  namespace Express {
    interface Request extends ExpressRequest {
      user?: IUser
    }
    interface Response extends ExpressResponse {}
    interface NextFunction extends ExpressNextFunction {}
  }
}

export { ExpressRequest as Request, ExpressResponse as Response, ExpressNextFunction as NextFunction }; 