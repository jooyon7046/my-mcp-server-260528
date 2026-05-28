#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerMcpServer } from './mcp/register-server'

const server = new McpServer({
    name: 'MY_MCP_SERVER',
    version: '1.0.0'
})

registerMcpServer(server)

server
    .connect(new StdioServerTransport())
    .then(() => {
        console.error('MCP server started (stdio)')
    })
    .catch((err) => {
        console.error('Failed to start MCP server', err)
        process.exit(1)
    })
