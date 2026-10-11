/** Limits are explicit and shared; secrets and model configuration stay on the server. */
export const DEFAULT_GENERATION_TIMEOUT_MS=350000;
export const DEFAULT_CLIENT_TIMEOUT_MS=370000;
export function timeoutSetting(value:unknown,fallback:number,min=1000,max=900000):number {
  const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?Math.round(n):fallback;
}
