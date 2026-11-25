import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import { writeFile } from "node:fs/promises";


// 1. CREATE SERVER 
const server = new McpServer({
    name: "mcp-server",
    version: "1.0.0",
});  

// 3. CREATE AND REGISTER TOOL
server.registerTool("create-user", {
    title: "Create New User",
    description: "Create a new user and store data to database.",
    annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
    },
    inputSchema: {
        name: z.string(),
        email: z.string(),
        password: z.string(),
        age: z.number(),
        address: z.string(),
    },
}, async (params) => {
    try {
        const userId = await createUser(params);
        return {
            content: [
                {
                    type: "text",
                    text: `User create with id ${userId}`
                }
            ]
        }
    } catch(e: any) {
        return {
            isError: true,
            content: [
                {
                    type: "text",
                    text: "Not able to create a user: " + e.message
                }
            ]
        }
    }
})
async function createUser(user: {name: string, email: string, password: string, age: number, address: string}) {
    const users = await import("./database/db.json", {with: {type: "json"}}).then(u => u.default);
    const id = `user_10${users.length + 1}` as string;
    users.push({id, ...user});
    await writeFile("./src/database/db.json", JSON.stringify(users, null, 2));
    return id;
}

// 4. CREATE AND REGISTER RESOURCE
server.registerResource("all-users", "users://all", {
    title: "Get all users",
    description: "Get all users from database.",
    mimeType: "application/json",
}, async (uri) => {
    try {
        const users = await import("./database/db.json", {
          with: { type: "json" },
        }).then((u) => u.default);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(users),
            },
          ],  
        };
    } catch(error: any) {
        return {
            contents: [
                {
                    uri: uri.href,
                    mimeType: "text",
                    text: "Not able to get all users: " + error.message
                } 
            ]
        }
    }
});

// RESOURCE WITH PARAMS
server.registerResource(
  "users-profile",
  new ResourceTemplate("users://{userId}/profile", {list: undefined}),
  {
    title: "Get single user by id",
    description: "Get single user from database by id.",
    mimeType: "application/json",
  },
  async (uri, { userId }) => {
    try {
      const users = await import("./database/db.json", {
        with: { type: "json" },
      }).then((u) => u.default);
      const user = users.find((u: any) => u.id === userId);
      if (!user) {
        throw new Error("User not found");
      }
      return {
        contents: [  
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(user),
          },
        ],
      };
    } catch (error: any) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text",
            text: "Not able to get user: " + error.message,
          },
        ],
      };
    }
  },
);

// 2. CONNECT TO TRANSPORT LAYER
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main();