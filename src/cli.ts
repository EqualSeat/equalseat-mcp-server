import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './index.js';

async function main() {
  const apiKey = process.env.EQUALSEAT_API_KEY;
  const baseUrl = process.env.EQUALSEAT_API_URL ?? 'https://equalseat.ai';

  if (!apiKey) {
    console.error(
      'EQUALSEAT_API_KEY is required. Set it in your environment or Claude Code MCP config.',
    );
    process.exit(1);
  }

  const server = createServer(apiKey, baseUrl);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('MCP server failed to start:', error);
  process.exit(1);
});
