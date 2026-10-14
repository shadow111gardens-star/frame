import { stitch } from '@google/stitch-sdk';
import { mapStitchError, StitchProviderError } from './stitchErrors';

export interface StitchScreenResult {
  deviceType: 'MOBILE'; screenId: string; htmlUrl: string; imageUrl: string; savedHtml: string;
}

// Dependencies are injectable for tests; the SDK is used only by server code.
export async function generateStitchScreen(
  { prompt, deviceType }: { prompt: string; deviceType: 'MOBILE' },
  options: { projectId?: string; sdk?: Pick<typeof stitch, 'project'>; fetch?: typeof fetch } = {},
): Promise<StitchScreenResult> {
  if (!prompt.trim() || deviceType !== 'MOBILE') throw new StitchProviderError('VALIDATION_ERROR', false);
  const projectId = options.projectId ?? process.env.STITCH_PROJECT_ID;
  if (!projectId) throw new StitchProviderError('NOT_FOUND', false);
  try {
    const screen = await (options.sdk ?? stitch).project(projectId).generate(prompt, 'MOBILE');
    const [htmlUrl, imageUrl] = await Promise.all([screen.getHtml(), screen.getImage()]);
    const url = new URL(htmlUrl);
    if (url.protocol !== 'https:') throw new StitchProviderError('VALIDATION_ERROR', false);
    let response: Response;
    try {
      response = await (options.fetch ?? fetch)(url.href, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('HTML download unavailable');
      const savedHtml = await response.text();
      if (!savedHtml.trim()) throw new StitchProviderError('VALIDATION_ERROR', false);
      return { deviceType, screenId: screen.screenId, htmlUrl, imageUrl, savedHtml };
    } catch (error) {
      if (error instanceof StitchProviderError) throw error;
      throw new StitchProviderError('NETWORK_ERROR', true);
    }
  } catch (error) { throw mapStitchError(error); }
}
