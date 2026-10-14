import { StitchError } from '@google/stitch-sdk';

const messages = {
  AUTH_FAILED: 'Stitch authentication was rejected. Check STITCH_API_KEY on the server and restart.',
  NOT_FOUND: 'Stitch could not find the project or screen. Check STITCH_PROJECT_ID.',
  PERMISSION_DENIED: 'Stitch access is denied. Check that the server key has access to this project.',
  RATE_LIMITED: 'Stitch rate or credit limit reached. Wait for your quota to reset before retrying.',
  NETWORK_ERROR: 'Could not reach Stitch. Check the server connection and retry.',
  VALIDATION_ERROR: 'Stitch could not accept this request. Check the prompt and MOBILE device type.',
  UNKNOWN_ERROR: 'Stitch returned an unexpected error. Retry later or check the service status.',
} as const;

export class StitchProviderError extends Error {
  constructor(public code: keyof typeof messages, public retryable: boolean) {
    super(messages[code]); this.name = 'StitchProviderError';
  }
}
export function mapStitchError(error: unknown): StitchProviderError {
  if (error instanceof StitchProviderError) return error;
  const code = error instanceof StitchError ? error.code : 'UNKNOWN_ERROR';
  return new StitchProviderError(code, ['RATE_LIMITED', 'NETWORK_ERROR', 'UNKNOWN_ERROR'].includes(code));
}
