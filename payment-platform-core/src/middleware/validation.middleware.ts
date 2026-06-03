import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

export function validateBody(schema: z.ZodTypeAny) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }
      res.status(500).json({ error: 'Internal validation error' });
    }
  };
}
