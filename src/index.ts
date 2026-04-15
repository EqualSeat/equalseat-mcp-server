import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export async function apiRequest(
  baseUrl: string,
  apiKey: string,
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error (${response.status}): ${text}`);
  }

  return response.json();
}

export function createServer(apiKey: string, baseUrl: string): McpServer {
  const server = new McpServer({
    name: 'equalseat',
    version: '0.1.0',
  });

  server.tool(
    'ask',
    "Ask the equalseat.ai knowledge base a question. Returns an answer synthesised from the organisation's knowledge with cited sources.",
    {
      question: z
        .string()
        .describe('The question to ask the knowledge base'),
    },
    async ({ question }) => {
      try {
        const result = (await apiRequest(baseUrl, apiKey, '/api/kb/ask', {
          question,
        })) as {
          answer: string;
          sources: Array<{
            item_id: string;
            item_summary: string;
            item_type: string;
          }>;
        };

        const sourcesText =
          result.sources.length > 0
            ? `\n\nSources:\n${result.sources.map((s) => `- [${s.item_type}] ${s.item_summary}`).join('\n')}`
            : '';

        return {
          content: [
            {
              type: 'text' as const,
              text: result.answer + sourcesText,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'ingest',
    'Add content to the equalseat.ai knowledge base. Content is processed through the extraction pipeline to identify facts, decisions, processes, and questions. Batch related content into a single call using markdown headings to separate sections — do not split related decisions, notes, or discussion across multiple ingest calls.',
    {
      sourceName: z
        .string()
        .describe(
          'Name for this source (e.g. "Q3 Planning Meeting", "Architecture Decision")',
        ),
      sourceType: z
        .enum(['meeting', 'interview', 'document', 'manual'])
        .default('manual')
        .describe('Type of source content'),
      text: z.string().describe('The content to ingest. For batched content, use markdown headings to separate logical sections.'),
      occurredAt: z
        .string()
        .datetime()
        .optional()
        .describe(
          'When this content originated, as an absolute ISO 8601 timestamp (e.g. "2026-04-15T10:00:00Z"). Resolve any relative dates ("yesterday", "last Thursday") to absolute timestamps before calling. Use the current time for freshly-authored content. For sources spanning time, use the originating event (meeting start, document authored date). Strongly recommended — downstream extraction relies on it for temporal context.',
        ),
    },
    async ({ sourceName, sourceType, text, occurredAt }) => {
      try {
        const result = (await apiRequest(baseUrl, apiKey, '/api/kb/ingest', {
          sourceName,
          sourceType,
          rawText: text,
          ...(occurredAt && { occurredAt }),
        })) as {
          sourceId: string;
          status: string;
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: `Source "${sourceName}" created (ID: ${result.sourceId}). Status: ${result.status}. The pipeline will extract knowledge items from this content.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.prompt(
    'onboard',
    'Get oriented with the knowledge base. Discovers what the brain knows, identifies gaps, and suggests what to ingest next.',
    () => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `I've just connected to the equalseat.ai knowledge base. Help me understand what's in the brain and what's missing.

1. Use the "ask" tool to ask: "What topics, domains, and types of knowledge do you currently have? Give me a high-level summary."
2. Based on the answer, identify obvious gaps — things a typical organisation would have documented but that seem missing.
3. Suggest 3-5 specific things I should ingest next, with example source names and types.

Be concrete and actionable.`,
          },
        },
      ],
    }),
  );

  return server;
}

