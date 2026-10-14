import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stitch } from '@google/stitch-sdk';
import { generateStitchScreen, type StitchScreenResult } from './stitch';
import { mapStitchError, StitchProviderError } from './stitchErrors';

export interface StitchCacheEntry extends StitchScreenResult { promptHash: string; createdAt: string }
const defaultDirectory = new URL('../data/stitch-cache/', import.meta.url);

// One service per server process. Serialize misses to avoid duplicate credits,
// lost counter updates, or multiple project creations within that process.
export function createStitchCache(options: {
  directory?: string | URL;
  env?: NodeJS.ProcessEnv;
  sdk?: Pick<typeof stitch, 'project' | 'callTool'>;
  fetch?: typeof fetch;
  now?: () => Date;
  log?: (message: string) => void;
} = {}) {
  const directory = options.directory ?? defaultDirectory;
  const env = options.env ?? process.env;
  const sdk = options.sdk ?? stitch;
  const now = options.now ?? (() => new Date());
  const log = options.log ?? console.info;
  let tail: Promise<unknown> = Promise.resolve();
  const path = (name: string) => typeof directory === 'string' ? join(directory, name) : new URL(name, directory);
  async function read<T>(name: string): Promise<T | undefined> {
    try { return JSON.parse(await readFile(path(name), 'utf8')) as T; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
  }
  async function save(name: string, value: unknown) {
    await mkdir(directory, { recursive: true });
    const temporary = `${name}.${randomUUID()}.tmp`;
    await writeFile(path(temporary), JSON.stringify(value), { mode: 0o600 });
    await rename(path(temporary), path(name));
  }
  async function projectId() {
    if (env.STITCH_PROJECT_ID?.trim()) return env.STITCH_PROJECT_ID.trim();
    const stored = await read<{ projectId: string }>('project.json');
    if (stored?.projectId) return stored.projectId;
    const result = await sdk.callTool<{ projectId?: string; name?: string }>('create_project', { title: 'FRAME screen generation' });
    const id = result.projectId ?? result.name?.replace(/^projects\//, '');
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new StitchProviderError('UNKNOWN_ERROR', false);
    await save('project.json', { projectId: id });
    log(`[Stitch] Created project ${id}. Set STITCH_PROJECT_ID=${id} in .env.`);
    return id;
  }
  async function generate(input: { prompt: string; deviceType: 'MOBILE' }) {
    if (typeof input.prompt !== 'string' || !input.prompt.trim() || input.deviceType !== 'MOBILE') throw new StitchProviderError('VALIDATION_ERROR', false);
    const promptHash = createHash('sha256').update(input.prompt + input.deviceType).digest('hex');
    const cached = await read<StitchCacheEntry>(`${promptHash}.json`);
    if (cached) return { ...cached, cacheHit: true };
    if (!env.STITCH_API_KEY?.trim()) throw new StitchProviderError('AUTH_FAILED', false);
    try {
      const id = await projectId();
      const date = now().toISOString().slice(0, 10);
      const count = (await read<{ count: number }>(`calls-${date}.json`))?.count ?? 0;
      // Count attempted generate calls, including SDK errors. Cache hits cost zero.
      await save(`calls-${date}.json`, { date, count: count + 1 });
      log(`[Stitch] UTC ${date}: ${count + 1} generate calls attempted; quota remaining is unknown.`);
      const result = await generateStitchScreen(input, { projectId: id, sdk, fetch: options.fetch });
      const entry: StitchCacheEntry = { ...result, promptHash, createdAt: now().toISOString() };
      await save(`${promptHash}.json`, entry);
      return { ...entry, cacheHit: false };
    } catch (error) { throw mapStitchError(error); }
  }
  return {
    generate(input: { prompt: string; deviceType: 'MOBILE' }) {
      const operation = tail.then(() => generate(input));
      tail = operation.catch(() => undefined);
      return operation;
    },
  };
}

export const stitchCache = createStitchCache();
