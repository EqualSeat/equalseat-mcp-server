import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_KEY = process.env.EQUALSEAT_API_KEY;
const BASE_URL = process.env.EQUALSEAT_API_URL ?? 'https://equalseat.ai';

if (!API_KEY) {
  console.error(
    'EQUALSEAT_API_KEY is required. Set it in your environment or Claude Code MCP config.',
  );
  process.exit(1);
}

async function apiRequest(
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error (${response.status}): ${text}`);
  }

  return response.json();
}

async function main() {
  const server = new McpServer({
    name: 'equalseat',
    version: '0.1.0',
  });

  // Tool: ask
  // Ask the knowledge base a question and get an answer with sources.
  server.tool(
    'ask',
    'Ask the equalseat.ai knowledge base a question. Returns an answer synthesised from the organisation\'s knowledge with cited sources.',
    {
      question: z
        .string()
        .describe('The question to ask the knowledge base'),
    },
    async ({ question }) => {
      try {
        const result = (await apiRequest('/api/kb/ask', { question })) as {
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

  // Tool: ingest
  // Add content to the knowledge base for extraction.
  server.tool(
    'ingest',
    'Add content to the equalseat.ai knowledge base. The content will be processed through the extraction pipeline to identify facts, decisions, processes, and questions.',
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
      text: z.string().describe('The content to ingest'),
    },
    async ({ sourceName, sourceType, text }) => {
      try {
        const result = (await apiRequest('/api/kb/ingest', {
          sourceName,
          sourceType,
          rawText: text,
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

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('MCP server failed to start:', error);
  process.exit(1);
});
