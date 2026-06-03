import { z } from 'zod';

export const RotateApiKeySchema = z.object({
  name: z.string().optional()
});

export const RevokeApiKeySchema = z.object({
  id: z.string()
});
