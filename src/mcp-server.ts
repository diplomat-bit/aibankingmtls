import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

const server = new Server(
  {
    name: "financial-app-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let persistedQueries: Record<string, any> = {};

// Load queries if available
try {
  const queriesFile = fs.readFileSync(path.join(process.cwd(), "src/apollo-queries.json"), "utf-8");
  const data = JSON.parse(queriesFile);
  if (data.operations) {
    data.operations.forEach((op: any) => {
      persistedQueries[op.name] = op;
    });
  }
} catch (e) {
  console.log("No initial queries loaded");
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_graphql_query",
        description: "Execute a persisted GraphQL query by name",
        inputSchema: {
          type: "object",
          properties: {
            queryName: {
              type: "string",
              description: "The name of the query to execute",
            },
            variables: {
              type: "object",
              description: "Variables for the query",
            },
          },
          required: ["queryName"],
        },
      },
      {
        name: "list_available_queries",
        description: "List all available persisted Apollo GraphQL queries",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "upload_persisted_queries",
        description: "Upload a new set of Apollo persisted queries",
        inputSchema: {
          type: "object",
          properties: {
            operations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  type: { type: "string" },
                  body: { type: "string" },
                }
              }
            }
          },
          required: ["operations"],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "list_available_queries") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(Object.keys(persistedQueries), null, 2),
        },
      ],
    };
  }

  if (request.params.name === "execute_graphql_query") {
    const args = request.params.arguments as { queryName: string; variables?: any };
    const query = persistedQueries[args.queryName];
    
    if (!query) {
      return {
        content: [{ type: "text", text: `Query ${args.queryName} not found` }],
        isError: true,
      };
    }

    // Here we would actually execute the query against the backend
    // For now, we mock the response
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            message: `Mock execution of ${args.queryName}`,
            queryBody: query.body.substring(0, 100) + "...",
            variables: args.variables
          }, null, 2),
        },
      ],
    };
  }

  if (request.params.name === "upload_persisted_queries") {
    const args = request.params.arguments as { operations: any[] };
    
    args.operations.forEach((op: any) => {
      if (op.name && op.body) {
        persistedQueries[op.name] = op;
      }
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully uploaded ${args.operations.length} queries. Total available: ${Object.keys(persistedQueries).length}`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

main().catch(console.error);
