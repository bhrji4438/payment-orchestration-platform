import { z } from 'zod';

export const CreateGatewayConfigSchema = z.object({
  gatewayProviderId: z.string(),
  displayName: z.string().min(1),
  credentials: z.record(z.string()),
  priority: z.number().int().min(1)
});

export const UpdateGatewayConfigSchema = z.object({
  displayName: z.string().min(1).optional(),
  credentials: z.record(z.string()).optional(),
  priority: z.number().int().min(1).optional(),
  isActive: z.boolean().optional()
});

export const SetPrioritySchema = z.object({
  priority: z.number().int().min(1)
});
