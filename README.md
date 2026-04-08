# @equalseat/mcp-server

MCP server for connecting AI tools to your [equalseat.ai](https://equalseat.ai) knowledge base.

Works with [Claude Code](https://claude.ai/code), [Claude Desktop](https://claude.ai/download), and any MCP-compatible client.

## What it does

equalseat.ai is an organisational brain that captures, structures, and retrieves your team's knowledge. This MCP server gives AI tools direct access to that brain.

**Tools:**

- **ask** - Query your knowledge base. "What's our deployment process?" "What did we decide about pricing?"
- **ingest** - Add knowledge. Decisions, meeting notes, processes, context - anything the brain should know.

## Quick start

### 1. Get an API key

Go to your equalseat.ai team settings and generate an API key.

### 2. Configure Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "equalseat": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@equalseat/mcp-server"],
      "env": {
        "EQUALSEAT_API_KEY": "sk_your_api_key_here"
      }
    }
  }
}
```

### 3. Use it

Claude will automatically discover the tools. You can:

- Ask questions about your business knowledge
- Save decisions and context from conversations
- Reference your team's processes while planning

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `EQUALSEAT_API_KEY` | Yes | | API key from equalseat.ai settings |
| `EQUALSEAT_API_URL` | No | `https://equalseat.ai` | API base URL (for self-hosted or local dev) |

## Examples

Once configured, your AI assistant can:

```
"Ask equalseat what our testing strategy is"
"Save this architecture decision to the brain: we're using Supabase for auth and database"
"What did we decide about the pricing model?"
```

## Development

```bash
# Install
npm install

# Build
npm run build

# Run locally (for testing)
EQUALSEAT_API_KEY=sk_... node build/index.cjs
```

## License

MIT
