import {z} from 'zod';
const count=z.number().int().nonnegative().nullable();
export const requestCostSchema=z.object({stage:z.string().max(100),model:z.string().max(100),repair:z.boolean(),httpStatus:z.number().int().nullable(),outcome:z.enum(['succeeded','failed','unknown']),latencyMs:z.number().nonnegative(),inputTokens:count,outputTokens:count,thinkingTokens:count,thinkingSource:z.enum(['provider','inferred-zero','unavailable']).optional(),cachedTokens:count,totalTokens:count,usageSource:z.enum(['provider','unavailable']),estimatedInputTokens:count,estimatedUsd:z.number().nonnegative().nullable()});
export const generationCostSchema=z.object({requests:z.array(requestCostSchema).max(40),requestCount:z.number().int().nonnegative(),repairRequestCount:z.number().int().nonnegative(),inputTokens:z.number().int().nonnegative(),outputTokens:z.number().int().nonnegative(),thinkingTokens:z.number().int().nonnegative(),unknownUsageRequests:z.number().int().nonnegative(),estimatedUsd:z.number().nonnegative().nullable(),repairEstimatedUsd:z.number().nonnegative().nullable(),pricing:z.object({model:z.string().max(100),currency:z.literal('USD'),inputPerMillion:z.number().nonnegative().nullable(),outputPerMillion:z.number().nonnegative().nullable(),source:z.string().max(200)})});
export type RequestCost=z.infer<typeof requestCostSchema>;
export type GenerationCost=z.infer<typeof generationCostSchema>;
export function summarizeCost(requests:RequestCost[],pricing:GenerationCost['pricing']):GenerationCost {
  const sum=(key:'inputTokens'|'outputTokens'|'thinkingTokens')=>requests.reduce((n,r)=>n+(r[key]??0),0);
  const price=(rows:RequestCost[])=>rows.some(r=>r.estimatedUsd===null)?null:rows.reduce((n,r)=>n+r.estimatedUsd!,0);
  return {requests,requestCount:requests.length,repairRequestCount:requests.filter(r=>r.repair).length,inputTokens:sum('inputTokens'),outputTokens:sum('outputTokens'),thinkingTokens:sum('thinkingTokens'),unknownUsageRequests:requests.filter(r=>r.usageSource==='unavailable').length,estimatedUsd:price(requests),repairEstimatedUsd:price(requests.filter(r=>r.repair)),pricing};
}
