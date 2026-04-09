# equalseat MCP Server

TypeScript MCP server connecting Claude (and other MCP clients) to the equalseat.ai knowledge base. Two tools: `ask` (query KB) and `ingest` (add content).

## Tech Stack

- **TypeScript** + **Node 18+**
- **MCP SDK** (`@modelcontextprotocol/sdk`)
- **Zod** (schema validation)
- **tsup** (bundler → single CJS output)
- **Vitest** (testing)

## Essential Commands

```bash
npm run build                     # Bundle with tsup
npm test                          # Run tests
npm run typecheck                 # Type check
```

## Project Structure

| Path              | Purpose                          |
| ----------------- | -------------------------------- |
| `src/index.ts`    | Library exports (createServer, apiRequest) |
| `src/cli.ts`      | CLI entry point (binary)         |
| `src/__tests__/`  | Test files                       |
| `dist/`           | Compiled output (gitignored)     |
| `.github/`        | Dependabot, CI workflows         |

## Rules

- **One ticket, one PR.** Don't combine unrelated work.
- **PR scope is sacred.** Out-of-scope fixes get their own ticket and PR.
- **Never merge PRs.** The developer merges. Always.
- **Follow existing patterns.** Check sibling code before adding new things.
- **Tests before code.** Write the failing test first, then the code to pass it.
- **Stop and ask** when scope is ambiguous, architecture is affected, or the API surface changes.

## CLI

- `npm` not `pnpm` — this is a standalone package, not a monorepo.
- `gh <subcommand> -R EqualSeat/equalseat-mcp-server` — always specify repo.
- Never `git -C`. Run git from the repo root.
- `git fetch origin main` before any comparison against main.

## Board

Work is tracked on the **EqualSeat Development Board** (GitHub Projects #1, org: EqualSeat).

```bash
gh project item-list 1 --owner EqualSeat          # View board
gh issue create -R EqualSeat/equalseat-mcp-server  # Create ticket
```

## Workflow

1. Pick up ticket → branch off `main` → build → PR
2. Open as **draft**. Description includes `Closes #N`.
3. Wait for Copilot review, address feedback.
4. Promote to ready when CI is green.
5. Developer merges.

## Verification

After implementation, always run:

1. `npm run typecheck`
2. `npm test`
3. `npm run build`
