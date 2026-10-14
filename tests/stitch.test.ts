import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stitch, StitchError } from '@google/stitch-sdk';
import { generateStitchScreen } from '../server/providers/stitch';
import { createStitchCache } from '../server/providers/stitchCache';
import { mapStitchError } from '../server/providers/stitchErrors';

function fixture() {
  let calls = 0, creations = 0, downloads = 0;
  const sdk = {
    project(id: string) {
      assert.equal(id, '123');
      return { async generate(prompt: string, device: string) {
        assert.ok(prompt); assert.equal(device, 'MOBILE'); calls++;
        return { screenId: 'screen-1', async getHtml() { return 'https://example.test/screen.html'; }, async getImage() { return 'https://example.test/screen.png'; } };
      } };
    },
    async callTool(name: string, args: unknown) {
      assert.equal(name, 'create_project'); assert.deepEqual(args, { title: 'FRAME screen generation' }); creations++;
      return { name: 'projects/123' };
    },
  } as unknown as Pick<typeof stitch, 'project' | 'callTool'>;
  const fetcher = (async (url: unknown) => {
    assert.equal(url, 'https://example.test/screen.html'); downloads++;
    return new Response('<html><body>Saved screen</body></html>');
  }) as typeof fetch;
  return { sdk, fetcher, counts: () => ({ calls, creations, downloads }) };
}

test('Stitch adapter downloads HTML from mocked SDK URL', async () => {
  const f = fixture();
  const result = await generateStitchScreen({ prompt: 'Login', deviceType: 'MOBILE' }, { projectId: '123', sdk: f.sdk, fetch: f.fetcher });
  assert.equal(result.savedHtml, '<html><body>Saved screen</body></html>');
  assert.equal(result.screenId, 'screen-1'); assert.equal(result.imageUrl, 'https://example.test/screen.png');
  assert.deepEqual(f.counts(), { calls: 1, creations: 0, downloads: 1 });
});

test('all published StitchError codes map to readable safe messages', () => {
  for (const code of ['AUTH_FAILED', 'NOT_FOUND', 'PERMISSION_DENIED', 'RATE_LIMITED', 'NETWORK_ERROR', 'VALIDATION_ERROR', 'UNKNOWN_ERROR'] as const) {
    const result = mapStitchError(new StitchError({ code, message: 'private-key-do-not-show', recoverable: false }));
    assert.equal(result.code, code); assert.ok(result.message.length > 30);
    assert.ok(!result.message.includes('private-key-do-not-show'));
    assert.equal(result.retryable, ['RATE_LIMITED', 'NETWORK_ERROR', 'UNKNOWN_ERROR'].includes(code));
  }
  assert.equal(mapStitchError(new Error('private-key-do-not-show')).code, 'UNKNOWN_ERROR');
});

test('cache survives restart, concurrent hits avoid SDK calls, project created only once, UTC counts persist', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stitch-test-'));
  const f = fixture(), logs: string[] = [];
  let date = new Date('2026-10-14T23:59:59Z');
  const options = { directory, env: { STITCH_API_KEY: 'mock-secret' }, sdk: f.sdk, fetch: f.fetcher, now: () => date, log: (message: string) => logs.push(message) };
  try {
    const cache = createStitchCache(options), input = { prompt: 'Login', deviceType: 'MOBILE' as const };
    const [first, second] = await Promise.all([cache.generate(input), cache.generate(input)]);
    assert.equal(first.cacheHit, false); assert.equal(second.cacheHit, true);
    const entry = JSON.parse(await readFile(join(directory, first.promptHash + '.json'), 'utf8'));
    assert.deepEqual(Object.keys(entry).sort(), ['promptHash', 'deviceType', 'screenId', 'htmlUrl', 'imageUrl', 'savedHtml', 'createdAt'].sort());
    assert.equal((await createStitchCache(options).generate(input)).savedHtml, first.savedHtml);
    assert.equal((await createStitchCache(options).generate(input)).cacheHit, true);
    assert.deepEqual(f.counts(), { calls: 1, creations: 1, downloads: 1 });
    date = new Date('2026-10-15T00:00:00Z');
    await createStitchCache(options).generate({ ...input, prompt: 'Profile' });
    assert.deepEqual(f.counts(), { calls: 2, creations: 1, downloads: 2 });
    for (const day of ['2026-10-14', '2026-10-15']) assert.deepEqual(JSON.parse(await readFile(join(directory, `calls-${day}.json`), 'utf8')), { date: day, count: 1 });
    assert.ok(logs.some(l => l.includes('STITCH_PROJECT_ID=123'))); assert.ok(!logs.join('').includes('mock-secret'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('download failure maps safely and SDK errors count once without automatic retry', async () => {
  const f = fixture();
  await assert.rejects(generateStitchScreen({ prompt: 'Login', deviceType: 'MOBILE' }, { projectId: '123', sdk: f.sdk, fetch: (async () => new Response('private', { status: 403 })) as typeof fetch }), /Could not reach Stitch/);
  const directory = await mkdtemp(join(tmpdir(), 'stitch-error-test-'));
  try {
    let calls = 0;
    const sdk = { ...f.sdk, project: () => ({ generate: async () => { calls++; throw new StitchError({ code: 'RATE_LIMITED', message: 'private', recoverable: true }); } }) } as unknown as typeof f.sdk;
    const cache = createStitchCache({ directory, env: { STITCH_API_KEY: 'mock', STITCH_PROJECT_ID: '123' }, sdk, now: () => new Date('2026-10-14Z'), log: () => {} });
    await assert.rejects(cache.generate({ prompt: 'Login', deviceType: 'MOBILE' }), /rate or credit limit/);
    assert.equal(calls, 1);
    assert.equal(JSON.parse(await readFile(join(directory, 'calls-2026-10-14.json'), 'utf8')).count, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
