import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../index.js';

const TEST_API_KEY = 'sk_test_key';
const TEST_BASE_URL = 'https://test.equalseat.ai';

function mockFetch(response: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
}

async function createTestClient() {
  const server = createServer(TEST_API_KEY, TEST_BASE_URL);
  const client = new Client({ name: 'test-client', version: '0.0.1' });

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return { client, server };
}

describe('equalseat MCP server', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('tool registration', () => {
    it('registers the ask tool', async () => {
      const { client } = await createTestClient();
      const { tools } = await client.listTools();
      const ask = tools.find((t) => t.name === 'ask');

      expect(ask).toBeDefined();
      expect(ask!.inputSchema.properties).toHaveProperty('question');
    });

    it('registers the ingest tool', async () => {
      const { client } = await createTestClient();
      const { tools } = await client.listTools();
      const ingest = tools.find((t) => t.name === 'ingest');

      expect(ingest).toBeDefined();
      expect(ingest!.inputSchema.properties).toHaveProperty('sourceName');
      expect(ingest!.inputSchema.properties).toHaveProperty('sourceType');
      expect(ingest!.inputSchema.properties).toHaveProperty('text');
    });
  });

  describe('ask tool', () => {
    it('sends the question to the API and returns the answer', async () => {
      const fetchMock = mockFetch({
        answer: 'The answer is 42.',
        sources: [],
      });
      globalThis.fetch = fetchMock;

      const { client } = await createTestClient();
      const result = await client.callTool({
        name: 'ask',
        arguments: { question: 'What is the meaning of life?' },
      });

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(`${TEST_BASE_URL}/api/kb/ask`);
      expect(options.headers.Authorization).toBe(`Bearer ${TEST_API_KEY}`);
      expect(JSON.parse(options.body)).toEqual({
        question: 'What is the meaning of life?',
      });

      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toBe('The answer is 42.');
    });

    it('includes sources in the response when present', async () => {
      globalThis.fetch = mockFetch({
        answer: 'Revenue grew 20%.',
        sources: [
          {
            item_id: '1',
            item_summary: 'Q3 revenue report',
            item_type: 'fact',
          },
          {
            item_id: '2',
            item_summary: 'Board meeting notes',
            item_type: 'decision',
          },
        ],
      });

      const { client } = await createTestClient();
      const result = await client.callTool({
        name: 'ask',
        arguments: { question: 'How did revenue perform?' },
      });

      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('Revenue grew 20%.');
      expect(text).toContain('[fact] Q3 revenue report');
      expect(text).toContain('[decision] Board meeting notes');
    });

    it('returns an error when the API fails', async () => {
      globalThis.fetch = mockFetch('Unauthorized', 401);

      const { client } = await createTestClient();
      const result = await client.callTool({
        name: 'ask',
        arguments: { question: 'secret stuff' },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('API error (401)');
    });
  });

  describe('ingest tool', () => {
    it('sends content to the API and returns the source ID', async () => {
      const fetchMock = mockFetch({
        sourceId: 'src_123',
        status: 'pending',
      });
      globalThis.fetch = fetchMock;

      const { client } = await createTestClient();
      const result = await client.callTool({
        name: 'ingest',
        arguments: {
          sourceName: 'Q3 Planning Meeting',
          sourceType: 'meeting',
          text: 'We discussed the roadmap...',
        },
      });

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(`${TEST_BASE_URL}/api/kb/ingest`);
      expect(JSON.parse(options.body)).toEqual({
        sourceName: 'Q3 Planning Meeting',
        sourceType: 'meeting',
        rawText: 'We discussed the roadmap...',
      });

      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('src_123');
      expect(text).toContain('pending');
    });

    it('defaults sourceType to manual', async () => {
      const fetchMock = mockFetch({
        sourceId: 'src_456',
        status: 'pending',
      });
      globalThis.fetch = fetchMock;

      const { client } = await createTestClient();
      await client.callTool({
        name: 'ingest',
        arguments: {
          sourceName: 'Quick note',
          text: 'Remember to update the docs.',
        },
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.sourceType).toBe('manual');
    });

    it('returns an error when the API fails', async () => {
      globalThis.fetch = mockFetch('Server Error', 500);

      const { client } = await createTestClient();
      const result = await client.callTool({
        name: 'ingest',
        arguments: {
          sourceName: 'Test',
          text: 'content',
        },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('API error (500)');
    });
  });
});
